from django.contrib.auth import get_user_model
from rest_framework import generics, viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .serializers import MeSerializer, RegisterSerializer, FuncionarioSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Creates an account for an ERP user."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveAPIView):
    """Returns the authenticated user and its access profile."""

    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class FuncionarioViewSet(viewsets.ModelViewSet):
    """CRUD administrativo de funcionários da equipe com controle de acesso."""

    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.select_related('perfil').all().order_by('id')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(perfil__role=role)
        return qs


class DisponibilidadeView(APIView):
    """Controla o status de disponibilidade (Online/Offline) do entregador logado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        perfil = getattr(request.user, 'perfil', None)
        return Response({
            'is_online': perfil.is_online if perfil else False,
            'role': perfil.role if perfil else 'cliente',
        })

    def post(self, request):
        perfil = getattr(request.user, 'perfil', None)
        if not perfil:
            return Response({'detail': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        raw_status = request.data.get('is_online')
        if raw_status is None:
            is_online_val = not perfil.is_online
        elif isinstance(raw_status, str):
            is_online_val = raw_status.lower() in ('true', '1')
        else:
            is_online_val = bool(raw_status)

        # Regra de negócio: Para ficar online, o entregador deve possuir turno em aberto
        if is_online_val and perfil.role == 'entregador':
            from core.models import Turno
            tem_turno_aberto = Turno.objects.filter(user=request.user, fim__isnull=True).exists()
            if not tem_turno_aberto:
                return Response(
                    {'detail': 'Você precisa iniciar seu turno (bater ponto) antes de ficar disponível.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        perfil.is_online = is_online_val
        perfil.save(update_fields=['is_online'])

        return Response({
            'is_online': perfil.is_online,
            'message': 'Status de disponibilidade atualizado com sucesso.',
        })
