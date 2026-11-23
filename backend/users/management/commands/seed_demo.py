"""Carga de dados de demonstração (cardápio, estoque, equipe e pedidos de exemplo).

Uso:
    python manage.py seed_demo            # cria o que faltar, sem apagar nada
    python manage.py seed_demo --reset    # apaga pedidos, financeiro, estoque e auditoria antes

Os usuários de demonstração recebem a senha definida em DEMO_PASSWORD (padrão: demo1234).
Não use em um estabelecimento real: o objetivo é apresentar o sistema com dados simulados.
"""

import os
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files import File
from django.utils.text import slugify
from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Categoria, Produto
from core.models import Auditoria, Turno
from finance.models import Lancamento
from inventory.models import Insumo, Movimentacao, ReceitaItem
from orders.models import EnderecoPedido, ItemPedido, Pedido
from orders.services import recalcular_total, transicionar_status
from preparation.models import Preparo
from users.models import Perfil

User = get_user_model()

# Fotos opcionais dos produtos, nomeadas pelo slug do produto (ex.: x-burger.jpeg)
IMAGENS_DIR = Path(settings.BASE_DIR) / 'demo_imagens'

# (nome, unidade, saldo, minimo)
INSUMOS = [
    ('Pão de hambúrguer', 'UN', 60, 15),
    ('Hambúrguer bovino 120 g', 'UN', 50, 15),
    ('Queijo prato (fatia)', 'UN', 80, 20),
    ('Presunto (fatia)', 'UN', 60, 15),
    ('Alface (folha)', 'UN', 40, 10),
    ('Tomate (rodela)', 'UN', 50, 10),
    ('Massa de pastel', 'UN', 80, 20),
    ('Carne moída temperada', 'KG', 4, 1),
    ('Queijo muçarela ralado', 'KG', 3, 1),
    ('Frango desfiado', 'KG', 2, 1),
    ('Palmito picado', 'KG', 0.8, 1),  # abaixo do mínimo: aparece como estoque crítico
    ('Batata congelada', 'KG', 8, 2),
    ('Refrigerante lata 350 ml', 'UN', 48, 12),
    ('Suco natural 300 ml', 'UN', 20, 6),
]

# (nome, categoria, preço, descrição, [(insumo, quantidade por unidade)])
PRODUTOS = [
    ('X-Burger', 'Lanches', '18.00', 'Pão, hambúrguer 120 g e queijo prato.',
     [('Pão de hambúrguer', 1), ('Hambúrguer bovino 120 g', 1), ('Queijo prato (fatia)', 1)]),
    ('X-Salada', 'Lanches', '21.00', 'Pão, hambúrguer 120 g, queijo, alface e tomate.',
     [('Pão de hambúrguer', 1), ('Hambúrguer bovino 120 g', 1), ('Queijo prato (fatia)', 1),
      ('Alface (folha)', 2), ('Tomate (rodela)', 2)]),
    ('Misto Quente', 'Lanches', '12.00', 'Pão, presunto e queijo na chapa.',
     [('Pão de hambúrguer', 1), ('Presunto (fatia)', 2), ('Queijo prato (fatia)', 2)]),
    ('Pastel de Carne', 'Pasteis', '9.00', 'Carne moída temperada.',
     [('Massa de pastel', 1), ('Carne moída temperada', '0.080')]),
    ('Pastel de Queijo', 'Pasteis', '9.00', 'Muçarela derretida.',
     [('Massa de pastel', 1), ('Queijo muçarela ralado', '0.070')]),
    ('Pastel de Frango', 'Pasteis', '10.00', 'Frango desfiado temperado.',
     [('Massa de pastel', 1), ('Frango desfiado', '0.080')]),
    ('Pastel de Palmito', 'Pasteis', '11.00', 'Palmito com muçarela.',
     [('Massa de pastel', 1), ('Palmito picado', '0.070'), ('Queijo muçarela ralado', '0.030')]),
    ('Batata Frita (porção)', 'Porções', '16.00', 'Porção de 300 g.',
     [('Batata congelada', '0.300')]),
    ('Refrigerante Lata', 'Bebidas', '6.00', 'Lata de 350 ml.',
     [('Refrigerante lata 350 ml', 1)]),
    ('Suco Natural', 'Bebidas', '8.00', 'Laranja, 300 ml.',
     [('Suco natural 300 ml', 1)]),
]

EQUIPE = [
    ('atendente', 'atendente', 'Ana', 'Atendente'),
    ('cozinheiro', 'cozinheiro', 'Caio', 'Cozinheiro'),
    ('entregador', 'entregador', 'Edu', 'Entregador'),
    ('cliente', 'cliente', 'Clara', 'Cliente'),
]


class Command(BaseCommand):
    help = 'Carrega dados de demonstração: cardápio com ficha técnica, estoque, equipe e pedidos de exemplo.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Apaga pedidos, preparo, financeiro, movimentações, turnos e auditoria antes de carregar.',
        )

    def handle(self, *args, **options):
        senha = os.environ.get('DEMO_PASSWORD', 'demo1234')
        with transaction.atomic():
            if options['reset']:
                self._reset()
            usuarios = self._equipe(senha)
            produtos = self._cardapio()
            if not Pedido.objects.exists():
                self._pedidos(usuarios, produtos)
        self.stdout.write(self.style.SUCCESS(
            f'Demonstração pronta. Usuários: {", ".join(u for u, *_ in EQUIPE)} (senha: {senha}).'
        ))

    def _reset(self):
        # Ordem: dependentes primeiro. Usuários, permissões e configurações são mantidos.
        Lancamento.objects.all().delete()
        Preparo.objects.all().delete()
        Pedido.objects.all().delete()
        Movimentacao.objects.all().delete()
        ReceitaItem.objects.all().delete()
        Produto.objects.all().delete()
        Insumo.objects.all().delete()
        Turno.objects.all().delete()
        Auditoria.objects.all().delete()
        self.stdout.write('Dados operacionais apagados.')

    def _equipe(self, senha):
        usuarios = {}
        for username, role, nome, sobrenome in EQUIPE:
            user, criado = User.objects.get_or_create(
                username=username,
                defaults={'email': f'{username}@demo.local', 'first_name': nome, 'last_name': sobrenome},
            )
            if criado:
                user.set_password(senha)
                user.save()
            perfil, _ = Perfil.objects.get_or_create(user=user)
            perfil.role = role
            perfil.is_online = role == 'entregador'
            perfil.save()
            usuarios[role] = user
        usuarios['admin'] = User.objects.filter(is_superuser=True).order_by('id').first() or usuarios['atendente']
        return usuarios

    def _cardapio(self):
        insumos = {}
        for nome, unidade, saldo, minimo in INSUMOS:
            # get_or_create: rodar de novo sem --reset não reabastece o que os pedidos já consumiram
            insumo, _ = Insumo.objects.get_or_create(
                nome=nome,
                defaults={
                    'unidade_medida': unidade,
                    'quantidade_atual': Decimal(str(saldo)),
                    'estoque_minimo': Decimal(str(minimo)),
                },
            )
            insumos[nome] = insumo

        produtos = {}
        for nome, categoria, preco, descricao, receita in PRODUTOS:
            cat, _ = Categoria.objects.get_or_create(nome=categoria)
            produto, _ = Produto.objects.update_or_create(
                nome=nome,
                defaults={'categoria': cat, 'preco': Decimal(preco), 'descricao': descricao, 'disponibilidade': True},
            )
            self._foto(produto)
            for insumo_nome, qtd in receita:
                ReceitaItem.objects.update_or_create(
                    produto=produto,
                    insumo=insumos[insumo_nome],
                    defaults={'quantidade_necessaria': Decimal(str(qtd))},
                )
            produtos[nome] = produto
        return produtos

    def _foto(self, produto):
        """Anexa a foto de backend/demo_imagens/<slug>.* se existir e o produto ainda não tiver imagem."""
        if produto.imagem:
            return
        slug = slugify(produto.nome.split('(')[0])
        for arquivo in sorted(IMAGENS_DIR.glob(f'{slug}.*')):
            with arquivo.open('rb') as f:
                produto.imagem.save(arquivo.name, File(f), save=True)
            return

    def _novo_pedido(self, cliente, tipo, itens, comanda, pagamento='dinheiro', endereco=None):
        pedido = Pedido.objects.create(
            cliente=cliente,
            tipo_atendimento=tipo,
            numero_comanda=comanda,
            numero_mesa={'balcao': 'Balcão', 'delivery': 'Delivery', 'retirada': 'Retirada'}.get(tipo, '3'),
            payment_method=pagamento,
            codigo_pin_entrega='2468' if tipo == 'delivery' else None,
        )
        for produto, qtd in itens:
            ItemPedido.objects.create(pedido=pedido, produto=produto, quantidade=qtd, preco_unitario=produto.preco)
        if endereco:
            EnderecoPedido.objects.create(pedido=pedido, **endereco)
        recalcular_total(pedido)
        pedido.refresh_from_db()
        return pedido

    def _pagar(self, pedido, responsavel, valor=None):
        pedido.valor_recebido = valor if valor is not None else pedido.total
        pedido.troco = pedido.valor_recebido - pedido.total
        pedido.save(update_fields=['valor_recebido', 'troco', 'updated_at'])
        transicionar_status(pedido, 'finalizado', responsavel=responsavel)

    def _pedidos(self, u, p):
        endereco = {
            'cep': '13184-000', 'logradouro': 'Rua das Palmeiras', 'numero': '120',
            'bairro': 'Jardim Amanda', 'cidade': 'Hortolândia', 'uf': 'SP',
        }
        atendente, admin = u['atendente'], u['admin']

        # 1. Balcão já pago (gera receita no financeiro e baixa de estoque)
        pago = self._novo_pedido(atendente, 'balcao', [(p['X-Salada'], 1), (p['Refrigerante Lata'], 1)], '1001')
        transicionar_status(pago, 'confirmado', responsavel=atendente)
        self._pagar(pago, atendente, Decimal('30.00'))

        # 2. Mesa na cozinha (em preparo)
        mesa = self._novo_pedido(atendente, 'mesa', [(p['Pastel de Carne'], 2), (p['Suco Natural'], 2)], '1002', 'pix')
        transicionar_status(mesa, 'confirmado', responsavel=atendente)
        transicionar_status(mesa, 'em_preparo', responsavel=u['cozinheiro'])

        # 3. Delivery pronto, com entregador atribuído (PIN 2468)
        entrega = self._novo_pedido(u['cliente'], 'delivery', [(p['X-Burger'], 2), (p['Batata Frita (porção)'], 1)],
                                    '1003', 'cartao_credito', endereco)
        transicionar_status(entrega, 'confirmado', responsavel=admin)
        transicionar_status(entrega, 'em_preparo', responsavel=u['cozinheiro'])
        transicionar_status(entrega, 'pronto', responsavel=u['cozinheiro'])
        entrega.entregador = u['entregador']
        entrega.save(update_fields=['entregador', 'updated_at'])

        # 4. Pedido do app do cliente aguardando ser aceito na gestão
        self._novo_pedido(u['cliente'], 'retirada', [(p['Pastel de Queijo'], 1), (p['Pastel de Frango'], 1)], '1004', 'pix')

        self.stdout.write('Pedidos de exemplo criados (pago, em preparo, delivery pronto e aguardando aceite).')
