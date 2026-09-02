from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Insumo(models.Model):
    """A raw material used by the restaurant operation."""

    class UnidadeMedida(models.TextChoices):
        KG = 'KG', 'Quilograma'
        G = 'G', 'Grama'
        L = 'L', 'Litro'
        ML = 'ML', 'Mililitro'
        UN = 'UN', 'Unidade'

    nome = models.CharField(max_length=255, unique=True)
    unidade_medida = models.CharField(max_length=2, choices=UnidadeMedida.choices)
    quantidade_atual = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0'))],
    )
    estoque_minimo = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0'))],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'insumo'
        verbose_name_plural = 'insumos'

    def __str__(self):
        return self.nome


class Movimentacao(models.Model):
    """Registry of inventory movements (entry/exit)."""

    class Tipo(models.TextChoices):
        ENTRADA = 'ENTRADA', 'Entrada'
        SAIDA = 'SAIDA', 'Saída'

    class Motivo(models.TextChoices):
        COMPRA = 'COMPRA', 'Compra'
        BAIXA = 'BAIXA', 'Baixa por Pedido'
        PERDA = 'PERDA', 'Perda'
        DEVOLUCAO = 'DEVOLUCAO', 'Devolução'
        AJUSTE = 'AJUSTE', 'Ajuste'

    insumo = models.ForeignKey(
        Insumo,
        on_delete=models.PROTECT,
        related_name='movimentacoes',
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
    )
    motivo = models.CharField(max_length=20, choices=Motivo.choices)
    data = models.DateTimeField(auto_now_add=True)
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='movimentacoes',
    )

    class Meta:
        ordering = ['-data']
        verbose_name = 'movimentação'
        verbose_name_plural = 'movimentações'

    def __str__(self):
        return f'{self.tipo} de {self.quantidade} {self.insumo.get_unidade_medida_display()} - {self.insumo.nome}'
