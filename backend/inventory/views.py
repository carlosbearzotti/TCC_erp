"""Inventory API endpoints."""

from rest_framework import mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from .models import Insumo, Movimentacao
from .serializers import InsumoSerializer, MovimentacaoSerializer


class InsumoViewSet(ModelViewSet):
    """Provides authenticated CRUD operations for inventory supplies."""

    queryset = Insumo.objects.all()
    serializer_class = InsumoSerializer
    permission_classes = [IsAuthenticated]


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
        serializer.save(responsavel=self.request.user)
