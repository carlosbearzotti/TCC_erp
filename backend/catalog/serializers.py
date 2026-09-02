"""Serializers for catalog API input and output."""

from decimal import Decimal

from rest_framework import serializers

from .models import Categoria, Produto


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = (
            'id',
            'nome',
            'descricao',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Produto
        fields = (
            'id',
            'nome',
            'descricao',
            'preco',
            'categoria',
            'categoria_nome',
            'disponibilidade',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'categoria_nome', 'created_at', 'updated_at')
        extra_kwargs = {
            'preco': {'min_value': Decimal('0.01')},
        }

    def validate_categoria(self, categoria):
        if not categoria.status:
            raise serializers.ValidationError(
                'Não é possível cadastrar ou alterar um produto em uma categoria inativa.'
            )
        return categoria
