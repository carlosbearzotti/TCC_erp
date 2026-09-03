"""Views do modulo de pedidos."""

from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import Pedido
from .permissions import is_equipe
from .serializers import PedidoSerializer
from .services import transicionar_status


class PedidoListCreateView(generics.ListCreateAPIView):
    """Lista ou cria pedidos, respeitando a visibilidade por perfil."""

    serializer_class = PedidoSerializer
    queryset = Pedido.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        if not is_equipe(self.request.user):
            queryset = queryset.filter(cliente=self.request.user)
        return queryset

    def perform_create(self, serializer):
        if is_equipe(self.request.user):
            serializer.save()
        else:
            serializer.save(cliente=self.request.user)


class PedidoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Consulta, altera ou exclui um pedido."""

    serializer_class = PedidoSerializer
    queryset = Pedido.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        if not is_equipe(self.request.user):
            queryset = queryset.filter(cliente=self.request.user)
        return queryset

    def perform_update(self, serializer):
        if not is_equipe(self.request.user):
            raise PermissionDenied('Apenas a equipe pode alterar pedidos.')

        novo_status = serializer.validated_data.get('status')
        if novo_status and novo_status != serializer.instance.status:
            transicionar_status(
                serializer.instance,
                novo_status,
                responsavel=self.request.user,
                motivo=serializer.validated_data.get('cancellation_reason'),
            )
        else:
            serializer.save()

    def perform_destroy(self, instance):
        if not is_equipe(self.request.user):
            raise PermissionDenied('Apenas a equipe pode excluir pedidos.')

        if instance.status in ('entregue', 'finalizado'):
            raise ValidationError(
                'Nao e possivel excluir um pedido finalizado/entregue, pois ele ja gerou receita.'
            )
        instance.delete()


class OrderPayView(generics.GenericAPIView):
    """Registra a simulacao de pagamento e finaliza o pedido."""

    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer

    def post(self, request, *args, **kwargs):
        if not is_equipe(request.user):
            raise PermissionDenied('Apenas a equipe pode registrar pagamentos.')

        pedido = self.get_object()
        if pedido.status in ('finalizado', 'cancelado', 'arquivado'):
            raise ValidationError(
                f'Nao e possivel realizar o pagamento de um pedido com status {pedido.get_status_display()}.'
            )

        payment_method = request.data.get('payment_method', pedido.payment_method)
        valor_recebido = request.data.get('valor_recebido', pedido.total)
        troco = request.data.get('troco', 0.00)

        pedido.payment_method = payment_method
        pedido.valor_recebido = valor_recebido
        pedido.troco = troco
        pedido.save(update_fields=['payment_method', 'valor_recebido', 'troco', 'updated_at'])

        # Se ainda estava criado, confirma primeiro para debitar estoque se necessario
        if pedido.status == 'criado':
            transicionar_status(pedido, 'confirmado', responsavel=request.user)

        # Transiciona para finalizado, criando automaticamente a receita financeira
        transicionar_status(pedido, 'finalizado', responsavel=request.user)

        serializer = self.get_serializer(pedido)
        return Response(serializer.data, status=200)


class CloseShiftView(generics.GenericAPIView):
    """Encerra o expediente, arquivando pedidos finalizados e cancelados."""

    def post(self, request, *args, **kwargs):
        if not is_equipe(request.user):
            raise PermissionDenied('Apenas a equipe pode encerrar o expediente.')

        pedidos_para_arquivar = Pedido.objects.filter(status__in=['finalizado', 'cancelado'])
        total_arquivados = pedidos_para_arquivar.count()

        for pedido in pedidos_para_arquivar:
            pedido.status = 'arquivado'
            pedido.save(update_fields=['status', 'updated_at'])

        return Response({
            'arquivados': total_arquivados,
            'message': f'Expediente encerrado com sucesso. {total_arquivados} pedido(s) arquivado(s).'
        }, status=200)


class OrderAddItemView(generics.GenericAPIView):
    """Adiciona um item a uma comanda ou pedido em andamento."""

    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer

    def post(self, request, *args, **kwargs):
        if not is_equipe(request.user):
            raise PermissionDenied('Apenas a equipe pode alterar itens do pedido.')

        pedido = self.get_object()
        if pedido.status in ('finalizado', 'arquivado', 'cancelado'):
            raise ValidationError(
                f'Nao e possivel adicionar itens a um pedido {pedido.get_status_display()}.'
            )

        produto_id = request.data.get('produto')
        quantidade = int(request.data.get('quantidade', 1))

        if not produto_id:
            raise ValidationError({'produto': 'O ID do produto e obrigatorio.'})
        if quantidade <= 0:
            raise ValidationError({'quantidade': 'A quantidade deve ser maior que zero.'})

        from catalog.models import Produto
        from .models import ItemPedido
        from .services import recalcular_total

        try:
            produto = Produto.objects.get(id=produto_id)
        except Produto.DoesNotExist:
            raise ValidationError({'produto': 'Produto nao encontrado.'})

        if not produto.disponibilidade:
            raise ValidationError({'produto': f'Produto indisponivel: {produto.nome}.'})

        # Se ja existe o item no pedido, incrementa a quantidade
        item_existente = pedido.itens.filter(produto=produto).first()
        if item_existente:
            item_existente.quantidade += quantidade
            item_existente.save(update_fields=['quantidade'])
        else:
            ItemPedido.objects.create(
                pedido=pedido,
                produto=produto,
                quantidade=quantidade,
                preco_unitario=produto.preco,
            )

        recalcular_total(pedido)
        serializer = self.get_serializer(pedido)
        return Response(serializer.data, status=200)


class OrderRemoveItemView(generics.GenericAPIView):
    """Remove um item de um pedido em andamento."""

    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer

    def post(self, request, *args, **kwargs):
        if not is_equipe(request.user):
            raise PermissionDenied('Apenas a equipe pode alterar itens do pedido.')

        pedido = self.get_object()
        if pedido.status in ('finalizado', 'arquivado', 'cancelado'):
            raise ValidationError(
                f'Nao e possivel remover itens de um pedido {pedido.get_status_display()}.'
            )

        item_id = request.data.get('item_id')
        if not item_id:
            raise ValidationError({'item_id': 'O ID do item e obrigatorio.'})

        item = pedido.itens.filter(id=item_id).first()
        if not item:
            raise ValidationError({'item_id': 'Item nao encontrado no pedido.'})

        if pedido.itens.count() <= 1:
            raise ValidationError('Um pedido deve ter pelo menos um item. Cancele o pedido se desejar.')

        item.delete()
        from .services import recalcular_total
        recalcular_total(pedido)

        serializer = self.get_serializer(pedido)
        return Response(serializer.data, status=200)