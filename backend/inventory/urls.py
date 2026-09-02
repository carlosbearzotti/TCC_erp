"""Inventory API routes."""

from rest_framework.routers import DefaultRouter

from .views import InsumoViewSet, MovimentacaoViewSet

router = DefaultRouter()
router.register('insumos', InsumoViewSet, basename='insumo')
router.register('movimentacoes', MovimentacaoViewSet, basename='movimentacao')

urlpatterns = router.urls
