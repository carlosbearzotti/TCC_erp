from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from .models import Turno, Auditoria, Configuracao


def registrar_auditoria(user, acao: str, entidade: str, entidade_id: int, detalhes: str = None) -> Auditoria:
    """Registra uma ação de auditoria para rastreabilidade de eventos críticos."""
    if not user or not user.is_authenticated:
        return None
    return Auditoria.objects.create(
        user=user,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        detalhes=detalhes or '',
    )


@transaction.atomic
def iniciar_turno(user) -> Turno:
    """Inicia um turno de trabalho para o usuário logado."""
    turno_aberto = Turno.objects.filter(user=user, fim__isnull=True).first()
    if turno_aberto:
        return turno_aberto

    novo_turno = Turno.objects.create(user=user)

    # Se for entregador, coloca disponível
    if hasattr(user, 'perfil') and user.perfil.role == 'entregador':
        user.perfil.is_online = True
        user.perfil.save(update_fields=['is_online'])

    registrar_auditoria(
        user=user,
        acao='INICIOU_TURNO',
        entidade='rh_turno',
        entidade_id=novo_turno.id,
        detalhes=f'Turno iniciado às {novo_turno.inicio:%H:%M:%S}'
    )
    return novo_turno


@transaction.atomic
def encerrar_turno(user) -> Turno:
    """Encerra o turno de trabalho ativo do usuário."""
    turno_aberto = Turno.objects.filter(user=user, fim__isnull=True).first()
    if not turno_aberto:
        raise ValueError('Nenhum turno em aberto encontrado para este usuário.')

    agora = timezone.now()
    turno_aberto.fim = agora

    # Para entregadores: calcular o valor total de pedidos entregues recebidos em dinheiro
    if hasattr(user, 'perfil') and user.perfil.role == 'entregador':
        from orders.models import Pedido
        pedidos_dinheiro = Pedido.objects.filter(
            entregador=user,
            status='entregue',
            payment_method='dinheiro',
            created_at__gte=turno_aberto.inicio,
            created_at__lte=agora,
        )
        total_dinheiro = sum((p.total for p in pedidos_dinheiro), Decimal('0.00'))
        turno_aberto.saldo_dinheiro = total_dinheiro
        user.perfil.is_online = False
        user.perfil.save(update_fields=['is_online'])

    turno_aberto.save()

    registrar_auditoria(
        user=user,
        acao='ENCERROU_TURNO',
        entidade='rh_turno',
        entidade_id=turno_aberto.id,
        detalhes=f'Turno encerrado. Saldo dinheiro: R$ {turno_aberto.saldo_dinheiro:.2f}'
    )
    return turno_aberto


@transaction.atomic
def confirmar_acerto_caixa(turno_id: int, gerente_user) -> Turno:
    """Confirma o acerto de contas em dinheiro do turno de um entregador."""
    turno = Turno.objects.get(id=turno_id)
    turno.acerto_confirmado = True
    turno.save(update_fields=['acerto_confirmado'])

    registrar_auditoria(
        user=gerente_user,
        acao='CONFIRMOU_ACERTO_CAIXA',
        entidade='rh_turno',
        entidade_id=turno.id,
        detalhes=f'Gerente {gerente_user.username} confirmou acerto de R$ {turno.saldo_dinheiro:.2f} do funcionário {turno.user.username}'
    )
    return turno


def obter_configuracao(chave: str, valor_padrao: str = '') -> str:
    """Busca valor de configuração do sistema ou cria se não existir."""
    cfg, _ = Configuracao.objects.get_or_create(
        chave=chave,
        defaults={'valor': valor_padrao}
    )
    return cfg.valor
