"""Serializers for inventory API input and output."""

from rest_framework import serializers

from .models import Insumo, Movimentacao, ReceitaItem


class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = (
            'id',
            'nome',
            'unidade_medida',
            'quantidade_atual',
            'estoque_minimo',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class MovimentacaoSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.CharField(source='responsavel.username', read_only=True)

    class Meta:
        model = Movimentacao
        fields = (
            'id',
            'insumo',
            'tipo',
            'quantidade',
            'motivo',
            'data',
            'responsavel',
            'responsavel_nome',
        )
        read_only_fields = ('id', 'data', 'responsavel')

    def validate(self, attrs):
        tipo = attrs.get('tipo')
        quantidade = attrs.get('quantidade')
        insumo = attrs.get('insumo')

        if tipo == Movimentacao.Tipo.SAIDA:
            if insumo and quantidade and quantidade > insumo.quantidade_atual:
                raise serializers.ValidationError(
                    {"quantidade": "Quantidade de saída não pode ser maior que o saldo disponível."}
                )
        return attrs


class ReceitaItemSerializer(serializers.ModelSerializer):
    insumo_nome = serializers.CharField(source='insumo.nome', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ReceitaItem
        fields = (
            'id',
            'produto',
            'produto_nome',
            'insumo',
            'insumo_nome',
            'quantidade_necessaria',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
