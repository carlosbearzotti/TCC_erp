from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Turno, Auditoria, Configuracao

User = get_user_model()


class CoreModuleTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser('admin_test', 'admin@test.com', 'pass123')
        self.funcionario = User.objects.create_user('atendente_test', 'atendente@test.com', 'pass123')
        self.funcionario.perfil.role = 'atendente'
        self.funcionario.perfil.save()

        self.entregador = User.objects.create_user('entregador_test', 'entregador@test.com', 'pass123')
        self.entregador.perfil.role = 'entregador'
        self.entregador.perfil.save()

    def test_checkin_checkout_turno(self):
        self.client.force_authenticate(user=self.funcionario)

        # Checkin
        res_in = self.client.post('/api/core/turnos/checkin/')
        self.assertEqual(res_in.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Turno.objects.filter(user=self.funcionario, fim__isnull=True).exists())

        # Check ativo
        res_ativo = self.client.get('/api/core/turnos/ativo/')
        self.assertEqual(res_ativo.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ativo.data['ativo'])

        # Checkout
        res_out = self.client.post('/api/core/turnos/checkout/')
        self.assertEqual(res_out.status_code, status.HTTP_200_OK)
        self.assertFalse(Turno.objects.filter(user=self.funcionario, fim__isnull=True).exists())

        # Auditoria gerada
        self.assertTrue(Auditoria.objects.filter(user=self.funcionario, acao='INICIOU_TURNO').exists())
        self.assertTrue(Auditoria.objects.filter(user=self.funcionario, acao='ENCERROU_TURNO').exists())

    def test_disponibilidade_entregador_requer_turno(self):
        self.client.force_authenticate(user=self.entregador)

        # Sem turno aberto, não pode ficar online
        res_fail = self.client.post('/api/users/disponibilidade/', {'is_online': True})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Inicia turno
        self.client.post('/api/core/turnos/checkin/')

        # Agora consegue ficar online
        res_ok = self.client.post('/api/users/disponibilidade/', {'is_online': True})
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ok.data['is_online'])

    def test_configuracao_default_values(self):
        self.client.force_authenticate(user=self.admin_user)
        meta = Configuracao.objects.get(chave='META_FATURAMENTO_MENSAL')
        self.assertEqual(meta.valor, '10000.00')

        limite = Configuracao.objects.get(chave='LIMITE_PEDIDOS_ENTREGADOR')
        self.assertEqual(limite.valor, '4')


class RpaExecuteTests(APITestCase):
    URL = '/api/core/rpa/execute/'

    def setUp(self):
        self.admin = User.objects.create_superuser('admin_rpa', 'a@rpa.com', 'pass123')
        self.atendente = User.objects.create_user('atend_rpa', 'b@rpa.com', 'pass123')
        self.atendente.perfil.role = 'atendente'
        self.atendente.perfil.save()

    def test_requer_administrador(self):
        self.client.force_authenticate(user=self.atendente)
        res = self.client.post(self.URL, {'task_id': 'rpa-01'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_task_invalida(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(self.URL, {'task_id': 'xxx'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rpa01_cria_preparo_faltante(self):
        from orders.models import Pedido
        from preparation.models import Preparo
        pedido = Pedido.objects.create(status='confirmado')
        Preparo.objects.filter(pedido=pedido).delete()
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(self.URL, {'task_id': 'rpa-01'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['alertas'], 1)
        self.assertTrue(Preparo.objects.filter(pedido=pedido, status='pendente').exists())
        self.assertTrue(Auditoria.objects.filter(acao='RPA_SINCRONIZACAO_PEDIDOS').exists())

    def test_rpa02_identifica_estoque_critico(self):
        from inventory.models import Insumo
        Insumo.objects.create(nome='Farinha', unidade_medida='KG', quantidade_atual=1, estoque_minimo=5)
        Insumo.objects.create(nome='Queijo', unidade_medida='KG', quantidade_atual=10, estoque_minimo=5)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(self.URL, {'task_id': 'rpa-02'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['itens_auditados'], 2)
        self.assertEqual(res.data['insumos_criticos'], ['Farinha'])
        self.assertIn('Farinha', Auditoria.objects.get(acao='RPA_ALERTA_ESTOQUE').detalhes)

    def test_rpa03_concilia_caixa(self):
        from django.utils import timezone
        from finance.models import FinanceCategory, Lancamento
        cat = FinanceCategory.objects.create(name='Vendas RPA', type='receita')
        Lancamento.objects.create(type='receita', value=Decimal('50.00'), description='x',
                                  date=timezone.localdate(), payment_method='dinheiro', category=cat)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(self.URL, {'task_id': 'rpa-03'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['receitas'], '50.00')
        self.assertEqual(res.data['divergencia_dinheiro'], '50.00')
        self.assertTrue(Auditoria.objects.filter(acao='RPA_CONCILIACAO_CAIXA').exists())


class EstabelecimentoTests(APITestCase):
    URL = '/api/core/estabelecimento/'

    def setUp(self):
        self.admin = User.objects.create_superuser('adm_nome', 'n@x.com', 'pass12345')
        self.atend = User.objects.create_user('atend_nome', 'a@x.com', 'pass12345')
        self.atend.perfil.role = 'atendente'
        self.atend.perfil.save()

    def test_leitura_publica_com_nome_padrao(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['nome'], 'PL Lanchonete & Pastelaria')

    def test_admin_altera_nome_e_gera_auditoria(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(self.URL, {'nome': 'Cantina do Zé'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.URL).data['nome'], 'Cantina do Zé')
        self.assertTrue(Auditoria.objects.filter(acao='ALTEROU_NOME_ESTABELECIMENTO').exists())

    def test_nao_admin_nao_altera_e_nome_invalido(self):
        self.client.force_authenticate(user=self.atend)
        self.assertEqual(self.client.patch(self.URL, {'nome': 'X Y'}, format='json').status_code, 403)
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.patch(self.URL, {'nome': ' '}, format='json').status_code, 400)
