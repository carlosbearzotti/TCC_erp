from django.urls import path

from .views import (
    CloseShiftView,
    OrderAddItemView,
    OrderPayView,
    OrderRemoveItemView,
    PedidoDetailView,
    PedidoListCreateView,
)

app_name = 'orders'

urlpatterns = [
    path('', PedidoListCreateView.as_view(), name='pedido_list_create'),
    path('<int:pk>/', PedidoDetailView.as_view(), name='pedido_detail'),
    path('<int:pk>/pay/', OrderPayView.as_view(), name='pedido_pay'),
    path('<int:pk>/add-item/', OrderAddItemView.as_view(), name='pedido_add_item'),
    path('<int:pk>/remove-item/', OrderRemoveItemView.as_view(), name='pedido_remove_item'),
    path('close-shift/', CloseShiftView.as_view(), name='orders_close_shift'),
]