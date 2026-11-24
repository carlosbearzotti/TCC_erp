"""Testes de "Minha conta": edição dos próprios dados e troca de senha."""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class MinhaContaTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('clara', 'clara@demo.local', 'SenhaForte123')
        self.client.force_authenticate(self.user)

    def test_me_traz_contato_e_endereco(self):
        res = self.client.get('/api/users/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['telefone'], '')
        self.assertEqual(set(res.data['endereco']), {'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'})

    def test_atualiza_dados_e_endereco(self):
        res = self.client.patch('/api/users/me/', {
            'first_name': 'Clara', 'last_name': 'Souza', 'telefone': '(19) 99999-0000',
            'cep': '13184-000', 'logradouro': 'Rua A', 'numero': '10', 'bairro': 'Centro',
            'cidade': 'Hortolândia', 'uf': 'sp',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['first_name'], 'Clara')
        self.assertEqual(res.data['endereco']['uf'], 'SP')
        self.user.refresh_from_db()
        self.assertEqual(self.user.perfil.telefone, '(19) 99999-0000')

    def test_nao_altera_perfil_nem_username(self):
        self.client.patch('/api/users/me/', {'role': 'administrador', 'username': 'outro'}, format='json')
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'clara')
        self.assertEqual(self.user.perfil.role, 'cliente')

    def test_rejeita_email_de_outro_usuario_e_uf_invalida(self):
        User.objects.create_user('outro', 'outro@demo.local', 'SenhaForte123')
        res = self.client.patch('/api/users/me/', {'email': 'OUTRO@demo.local', 'uf': 'SPP'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)
        self.assertIn('uf', res.data)

    def test_troca_senha_exige_senha_atual(self):
        res = self.client.post('/api/users/me/senha/', {'senha_atual': 'errada', 'nova_senha': 'NovaSenha456'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/users/me/senha/', {'senha_atual': 'SenhaForte123', 'nova_senha': 'NovaSenha456'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NovaSenha456'))

    def test_troca_senha_aplica_politica(self):
        res = self.client.post('/api/users/me/senha/', {'senha_atual': 'SenhaForte123', 'nova_senha': '12345678'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_anonimo_nao_edita(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.patch('/api/users/me/', {'first_name': 'X'}, format='json').status_code, 401)
