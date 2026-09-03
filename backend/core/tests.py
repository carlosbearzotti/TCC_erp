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
