from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from .models import Turno, Auditoria, Configuracao
from .serializers import TurnoSerializer, AuditoriaSerializer, ConfiguracaoSerializer
from .services import iniciar_turno, encerrar_turno, confirmar_acerto_caixa
from users.permissions import IsFuncionario, IsAdministrador, tem_permissao
from users.models import Perfil


class TurnoViewSet(viewsets.ModelViewSet):
    """
    CRUD completo e ações de check-in / checkout de turnos de trabalho.
    """

    queryset = Turno.objects.all().select_related('user')
    serializer_class = TurnoSerializer
    permission_classes = [IsFuncionario]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        data = self.request.query_params.get('data')
        abertos = self.request.query_params.get('abertos')

        if user_id:
            qs = qs.filter(user_id=user_id)
        if data:
            qs = qs.filter(inicio__date=data)
        if abertos == 'true':
            qs = qs.filter(fim__isnull=True)
        return qs

    @action(detail=False, methods=['post'], url_path='checkin')
    def checkin(self, request):
        """Inicia o turno de trabalho do usuário logado."""
        turno = iniciar_turno(request.user)
        return Response(TurnoSerializer(turno).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='checkout')
    def checkout(self, request):
        """Encerra o turno ativo do usuário logado."""
        try:
            turno = encerrar_turno(request.user)
            return Response(TurnoSerializer(turno).data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='ativo')
    def ativo(self, request):
        """Retorna o turno ativo do usuário logado, se houver."""
        turno = Turno.objects.filter(user=request.user, fim__isnull=True).first()
        if not turno:
            return Response({'ativo': False, 'turno': None})
        return Response({'ativo': True, 'turno': TurnoSerializer(turno).data})

    @action(detail=True, methods=['post'], url_path='confirmar-acerto')
    def confirmar_acerto(self, request, pk=None):
        """Gerente confirma o acerto de caixa de um turno encerrado."""
        if not tem_permissao(request.user, 'FECHAR_CAIXA'):
            raise PermissionDenied('Você não possui permissão para confirmar acerto de caixa.')
        try:
            turno = confirmar_acerto_caixa(pk, request.user)
            return Response(TurnoSerializer(turno).data, status=status.HTTP_200_OK)
        except Turno.DoesNotExist:
            return Response({'detail': 'Turno não encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """Consulta de logs e trilha de auditoria do sistema."""

    queryset = Auditoria.objects.select_related('user').all()
    serializer_class = AuditoriaSerializer
    permission_classes = [IsAdministrador]

    def get_queryset(self):
        qs = super().get_queryset()
        acao = self.request.query_params.get('acao')
        entidade = self.request.query_params.get('entidade')
        user_id = self.request.query_params.get('user_id')

        if acao:
            qs = qs.filter(acao=acao)
        if entidade:
            qs = qs.filter(entidade=entidade)
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs


class ConfiguracaoViewSet(viewsets.ModelViewSet):
    """Consulta e alteração de parâmetros globais do sistema."""

    queryset = Configuracao.objects.all()
    serializer_class = ConfiguracaoSerializer
    permission_classes = [IsAdministrador]
    http_method_names = ['get', 'patch', 'head', 'options']
