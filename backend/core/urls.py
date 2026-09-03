from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TurnoViewSet, AuditoriaViewSet, ConfiguracaoViewSet
from .metrics_views import MetricasAnaliticasView

router = DefaultRouter()
router.register('turnos', TurnoViewSet, basename='turno')
router.register('auditoria', AuditoriaViewSet, basename='auditoria')
router.register('configuracoes', ConfiguracaoViewSet, basename='configuracao')

urlpatterns = [
    path('metricas/', MetricasAnaliticasView.as_view(), name='metricas-analiticas'),
    path('', include(router.urls)),
]
