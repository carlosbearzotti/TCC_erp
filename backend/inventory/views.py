"""Inventory API endpoints."""

from rest_framework import mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from .models import Insumo, Movimentacao, ReceitaItem
from .serializers import InsumoSerializer, MovimentacaoSerializer, ReceitaItemSerializer

from django.db.models import F
from rest_framework.decorators import action
from rest_framework.response import Response


class InsumoViewSet(ModelViewSet):
    """Provides authenticated CRUD operations for inventory supplies."""

    queryset = Insumo.objects.all()
    serializer_class = InsumoSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def alertas(self, request):
        """Retorna insumos cuja quantidade atual é menor ou igual ao estoque mínimo."""
        qs = self.get_queryset().filter(quantidade_atual__lte=F('estoque_minimo'))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class MovimentacaoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    """
    Registry of inventory movements.
    Creation only; updates and deletions are forbidden by business rules.
    """

    queryset = Movimentacao.objects.all()
    serializer_class = MovimentacaoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        mov = serializer.save(responsavel=self.request.user)
        try:
            from core.services import registrar_auditoria
            registrar_auditoria(
                user=self.request.user,
                acao='EDITOU_ESTOQUE',
                entidade='inventory_insumo',
                entidade_id=mov.insumo_id,
                detalhes=f'Movimentação de estoque: {mov.tipo} de {mov.quantidade} ({mov.motivo}) para o insumo {mov.insumo.nome}'
            )
        except Exception:
            pass


class ReceitaItemViewSet(ModelViewSet):
    """
    CRUD para itens da ficha tecnica (receita).
    Permite visualizar, adicionar, atualizar ou remover ingredientes da receita.
    """

    queryset = ReceitaItem.objects.all()
    serializer_class = ReceitaItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        produto_id = self.request.query_params.get('produto')
        if produto_id:
            qs = qs.filter(produto_id=produto_id)
        return qs
