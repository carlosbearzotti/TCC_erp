# Fundação do projeto — modelo e estrutura colaborativa

**Data:** 13 de agosto de 2026  
**Status:** Concluída
**Responsável:** Danilo Augusto

## Escopo

Consolidar a fundação técnica e documental do ERP de lanchonete e pastelaria para que a equipe possa iniciar as próximas tasks com um projeto organizado, testável e preparado para colaboração.

## Base técnica preservada

- Backend em Django e Django REST Framework;
- cadastro local, login JWT e renovação de token já funcionais;
- painel administrativo do Django disponível;
- SQLite usado somente para desenvolvimento local;
- OIDC/Google Login registrado como melhoria futura, sem substituir a autenticação local;
- nenhuma funcionalidade de catálogo, estoque, pedidos ou frontend foi antecipada nesta etapa.

## Estrutura física definida

```text
backend/                 Django, DRF, CRUD, regras de negócio e testes
  config/                Configurações globais e URLs-raiz
  users/                 Autenticação local, usuários, perfis e permissões
  catalog/               Esqueleto do futuro CRUD de categorias, produtos e cardápio
  inventory/             Futuro: insumos, saldo, alertas e movimentações
  orders/                Futuro: pedidos e itens
  preparation/           Futuro: fila de cozinha, status e FIFO
  finance/               Futuro: registros financeiros
frontend/                Reserva para a futura interface web
infrastructure/          Ambiente, banco, deploy e operação futuros
docs/                    Arquitetura, guias e registros do projeto
.github/workflows/       Automação de qualidade do GitHub Actions
```

O projeto Django, `manage.py` e `requirements.txt` ficam dentro de `backend/`. Os comandos do Django devem ser executados a partir dessa pasta.

## Arquitetura modular aprovada

| Módulo | Responsabilidade | Estado atual |
| --- | --- | --- |
| `users` | Login local, JWT, usuários, perfis e permissões. | Existe. |
| `catalog` | Categorias, produtos, cardápio e futura ficha técnica. | Existe como esqueleto. |
| `inventory` | Insumos, saldo, alerta de estoque baixo e movimentações. | Futuro; não criar antes da issue. |
| `orders` | Pedidos e itens de pedido. | Futuro; não criar antes da issue. |
| `preparation` | Fila de cozinha, status e ordenação FIFO. | Futuro; não criar antes da issue. |
| `finance` | Registros financeiros. | Futuro; não criar antes da issue. |

O nome `consumers` não será usado. Pedidos pertencem a `orders`; a fila FIFO e o preparo pertencem a `preparation`. Essa separação evita acoplamento entre o que é vendido, o que é consumido do estoque, o pedido realizado, a produção na cozinha e os registros financeiros.

A sequência aprovada é: perfis e autorização em `users`; catálogo e inventário em paralelo quando as issues forem assumidas; pedidos em `orders`; preparo e FIFO em `preparation`; e baixa automática, alertas, relatórios e base financeira em `inventory` e `finance`.

## Convenções de implementação

Cada app Django de domínio deve concentrar:

| Arquivo | Responsabilidade |
| --- | --- |
| `models.py` | Entidades e relacionamentos do banco. |
| `serializers.py` | Validação e representação JSON. |
| `views.py` | Endpoints e respostas HTTP. |
| `urls.py` | Rotas do módulo. |
| `services.py` | Regras de negócio reutilizáveis e transações. |
| `permissions.py` | Permissões específicas. |
| `admin.py` | Configuração do Django Admin. |
| `tests.py` | Cenários de sucesso, erro e acesso. |
| `migrations/` | Histórico gerado das alterações de banco. |

CRUD e regras de backend pertencem a `backend/`; telas, componentes e integrações do navegador pertencem a `frontend/`. Novos apps só devem ser criados quando houver uma issue responsável.

## Catálogo: esqueleto pronto, requisitos pendentes

O app `backend/catalog/` foi criado e registrado no Django. O prefixo `/api/catalog/` está conectado, mas sem rotas ou endpoints.

Ele já contém a separação de arquivos para modelos, serializers, views, URLs, serviços, permissões, migrações e testes. Continuam intencionalmente pendentes:

- campos e relacionamentos de Categoria e Produto;
- regras de preço, disponibilidade, imagem, estoque e ficha técnica;
- endpoints de Create, Read, Update e Delete;
- migrações do catálogo;
- permissões específicas e testes do catálogo.

O fluxo didático e o checklist para a implementação futura estão em [Guia do CRUD de catálogo](../CATALOG_CRUD_GUIDE.md).

## Colaboração com Git e GitHub

- O repositório Git local foi inicializado.
- `main` é reservada para versões estáveis; `develop` será a integração do semestre após a equipe conectá-la ao GitHub.
- Ninguém deve desenvolver diretamente em `main`: cada task usa uma branch, como `feature/TCC-02-catalogo`.
- O README contém comandos práticos para status, branch, commit, atualização, `stash`, push e Pull Request.
- O remoto do GitHub ainda não foi criado nem conectado nesta etapa.

## Qualidade e CI

- `.gitignore` protege ambiente virtual, SQLite local, variáveis de ambiente e arquivos de editor;
- `backend/requirements.txt` registra as dependências do backend;
- `.github/workflows/backend-checks.yml` está preparado para, após conectar o GitHub, instalar as dependências e executar `python manage.py check` e `python manage.py test` dentro de `backend/` em pushes e Pull Requests para `develop` e `main`;
- nenhum deploy foi configurado.

## Documentação entregue

- `README.md`: execução, estrutura e guia Git da equipe;
- `backend/README.md`: mapa de trabalho para código Django/DRF;
- `frontend/README.md` e `infrastructure/README.md`: fronteiras das futuras áreas;
- `docs/ARCHITECTURE_AND_BACKLOG.md`: arquitetura, perfis e tarefas sugeridas;
- `docs/CONTRIBUTING.md`: convenções de branch, PR, segurança e testes;
- `docs/CATALOG_CRUD_GUIDE.md`: explicação do fluxo CRUD e dos placeholders atuais.

## Verificação

Foram executados com sucesso, dentro de `backend/`:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Os três testes existentes de autenticação passaram, e não foram detectadas migrações pendentes durante a preparação do esqueleto de catálogo.

## Próximos passos

`inventory`, `orders`, `preparation` e `finance` continuam pendentes de criação por issue; nenhum app futuro, endpoint ou regra de negócio foi criado ao aprovar esses limites.

1. Conectar o repositório remoto no GitHub e publicar a primeira versão.
2. Criar e distribuir as issues do backlog.
3. Implementar perfis e autorização local no app `backend/users/`.
4. Definir campos e critérios de aceite para Categoria e Produto antes do CRUD do catálogo.
5. Iniciar os demais módulos apenas quando suas issues forem assumidas.

## Histórico da consolidação

Este registro substitui os registros de fundação, estrutura, esqueleto de catálogo, guia de CRUD, auditoria de documentação, guia Git e arquitetura modular criados em 13 de agosto de 2026. O conteúdo substantivo desses registros foi consolidado aqui para manter um único registro diário da fundação do projeto.
