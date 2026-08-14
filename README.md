# ERP para Lanchonete e Pastelaria

Projeto de TCC para um ERP de lanchonete e pastelaria. A estrutura separa o backend Django/DRF da futura aplicação frontend, documentação e automações de infraestrutura.

## Estado atual

- Cadastro local, login JWT e renovação de token prontos;
- Painel administrativo do Django disponível;
- Esqueleto `backend/catalog/` pronto para a futura implementação de categorias, produtos e cardápio, ainda sem modelos ou endpoints;
- SQLite usado apenas no desenvolvimento local;
- OIDC/Google Login foi decidido como melhoria futura, não como dependência da primeira entrega.

## Como executar o backend localmente

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Para criar uma conta administrativa:

```powershell
cd backend
python manage.py createsuperuser
```

## Git para trabalhar em equipe

O repositório Git local já existe. O repositório remoto no GitHub ainda será conectado; por isso, os comandos de `push`, `pull` e Pull Request só valem depois dessa etapa.

**Regra principal:** ninguém desenvolve diretamente na branch `main`. Cada task deve ter sua própria branch.

### Fluxo local — já funciona agora

Confira o que foi alterado:

```powershell
git status
```

Antes de começar uma task, parta da branch principal:

```powershell
git switch main
```

Crie uma branch usando o ID e o nome curto da task. Exemplo para a task de catálogo:

```powershell
git switch -c feature/TCC-02-catalogo
```

Ao concluir uma parte pequena, veja as mudanças, adicione os arquivos e faça um commit descritivo:

```powershell
git status
git add .
git commit -m "feat(catalog): cria estrutura inicial do catalogo"
```

Use mensagens curtas e objetivas, por exemplo: `feat(users): adiciona perfil de atendente`, `fix(catalog): valida produto sem categoria` ou `docs: atualiza guia de CRUD`.

### Depois que o GitHub estiver conectado

Atualize a `main` local antes de criar uma branch nova:

```powershell
git switch main
git pull origin main
```

Envie sua branch:

```powershell
git push -u origin feature/TCC-02-catalogo
```

No GitHub, abra um **Pull Request** da sua branch para `develop` (ou para a branch definida pela equipe). Descreva a task, como testar e quais arquivos foram alterados. Só faça merge após revisão.

### Se houver mudanças antes de atualizar

O Git não permite `pull` quando há alterações locais que podem conflitar. Primeiro escolha uma destas opções:

1. Se seu trabalho está pronto para registrar, faça `git add .` e `git commit -m "mensagem"`; depois execute `git pull origin main`.
2. Se o trabalho ainda está incompleto, guarde-o temporariamente:

```powershell
git stash
git pull origin main
git stash pop
```

Depois de `git stash pop`, confira `git status` e resolva qualquer conflito antes de continuar.

Mais detalhes sobre branches e revisão estão no [Guia de contribuição](docs/CONTRIBUTING.md).

## Organização

| Local | Responsabilidade |
| --- | --- |
| `backend/` | Tudo que é Django/DRF: CRUD, API, regras de negócio, banco e testes. |
| `backend/config/` | Configuração global, URLs principais e inicialização Django. |
| `backend/users/` | Autenticação local, usuários, perfis e permissões. |
| `backend/catalog/` | Esqueleto do futuro CRUD de categorias, produtos e cardápio. |
| `backend/inventory/` | Futuro módulo de insumos, saldo, alerta de estoque baixo e movimentações. Ainda não existe. |
| `backend/orders/` | Futuro módulo de pedidos e itens de pedido. Ainda não existe. |
| `backend/preparation/` | Futuro módulo da fila de cozinha, status e ordenação FIFO. Ainda não existe. |
| `backend/finance/` | Futuro módulo de registros financeiros. Ainda não existe. |
| `frontend/` | Futura interface web: telas, componentes, rotas, serviços HTTP e estilos. |
| `docs/` | Arquitetura, guia de contribuição e planejamento das issues. |
| `docs/records/` | Registros datados das tasks concluídas. |
| `infrastructure/` | Templates e instruções de ambiente, banco, deploy e observabilidade futuros. |
| `.github/workflows/` | Verificação automática do backend no GitHub. |

Hoje, somente `backend/users/` e `backend/catalog/` existem como apps Django. Os módulos `inventory`, `orders`, `preparation` e `finance` são nomes aprovados para tasks futuras, mas só serão criados quando as respectivas issues começarem. Essa separação evita misturar estoque, pedidos, fila e financeiro. Leia o [Guia do CRUD de catálogo](docs/CATALOG_CRUD_GUIDE.md) antes de começar a implementá-lo e siga o mapa em [Arquitetura e Backlog](docs/ARCHITECTURE_AND_BACKLOG.md).

## Regras rápidas de colaboração

- Não envie `.venv`, `db.sqlite3`, `.env` ou chaves para o Git.
- Uma issue por objetivo pequeno; uma branch por issue.
- Abra pull request para `develop`; `main` fica para versões estáveis.
- Todo endpoint novo deve ter teste cobrindo sucesso e permissão/erro principal.
- Os comandos Django e as dependências do backend são executados dentro de `backend/`.

Detalhes completos: [Guia de contribuição](docs/CONTRIBUTING.md).
