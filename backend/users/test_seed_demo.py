"""Testes do comando seed_demo (carga de dados de demonstração)."""

from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from catalog.models import Produto
from finance.models import Lancamento
from inventory.models import Insumo
from orders.models import Pedido

User = get_user_model()


class SeedDemoTests(TestCase):
    def setUp(self):
        User.objects.create_superuser('admin', 'admin@demo.local', 'admin-teste-123')

    def test_cria_cardapio_equipe_e_pedidos(self):
        call_command('seed_demo', stdout=StringIO())

        self.assertEqual(Produto.objects.count(), 10)
        for username in ('atendente', 'cozinheiro', 'entregador', 'cliente'):
            user = User.objects.get(username=username)
            self.assertEqual(user.perfil.role, username)
            self.assertTrue(user.check_password('demo1234'))

        status = set(Pedido.objects.values_list('status', flat=True))
        self.assertEqual(status, {'finalizado', 'em_preparo', 'pronto', 'criado'})
        # O pedido pago gera receita e os confirmados baixam estoque pela ficha técnica
        self.assertEqual(Lancamento.objects.count(), 1)
        self.assertEqual(Insumo.objects.get(nome='Pão de hambúrguer').quantidade_atual, Decimal('57'))

    def test_reset_recria_sem_duplicar(self):
        call_command('seed_demo', stdout=StringIO())
        call_command('seed_demo', '--reset', stdout=StringIO())

        self.assertEqual(Produto.objects.count(), 10)
        self.assertEqual(Pedido.objects.count(), 4)
        self.assertEqual(User.objects.filter(username='atendente').count(), 1)

    def test_sem_reset_nao_duplica_pedidos(self):
        call_command('seed_demo', stdout=StringIO())
        call_command('seed_demo', stdout=StringIO())

        self.assertEqual(Pedido.objects.count(), 4)
