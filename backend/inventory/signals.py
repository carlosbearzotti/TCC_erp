from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Movimentacao


@receiver(post_save, sender=Movimentacao)
def update_insumo_quantidade(sender, instance, created, **kwargs):
    """
    Atualiza a quantidade do insumo sempre que uma nova movimentação é criada.
    Movimentações não devem ser editadas ou excluídas por regra de negócio.
    """
    if created:
        insumo = instance.insumo
        if instance.tipo == Movimentacao.Tipo.ENTRADA:
            insumo.quantidade_atual += instance.quantidade
        elif instance.tipo == Movimentacao.Tipo.SAIDA:
            insumo.quantidade_atual -= instance.quantidade
        
        insumo.save(update_fields=['quantidade_atual'])
