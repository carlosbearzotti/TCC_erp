from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from .models import Categoria, Produto
from .serializers import CategoriaSerializer, ProdutoSerializer


class CategoriaViewSet(ModelViewSet):
    """Provides CRUD operations for catalog categories."""

    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [AllowAny]


class ProdutoViewSet(ModelViewSet):
    """Provides CRUD operations for products."""

    queryset = Produto.objects.select_related('categoria').all()
    serializer_class = ProdutoSerializer
    permission_classes = [AllowAny]
