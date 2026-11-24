# TCC ERP - Lanchonete e Pastelaria

Sistema ERP desenvolvido para o Trabalho de Conclusão de Curso (TCC).
Aplicações para gestão de catálogo, estoque, financeiro, pedidos e preparo.

## Tecnologias
- **Backend:** Python, Django, Django REST Framework, PostgreSQL
- **Frontend:** Next.js, React, TailwindCSS
- **Infraestrutura:** Docker, Docker Compose

## Instalação e Execução com Docker (Recomendado)

A maneira mais fácil de rodar o projeto é utilizando o Docker e o Docker Compose.

1. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Na raiz do projeto, suba os containers (banco, backend e frontend). As migrações, as permissões e os usuários de demonstração são aplicados automaticamente na partida:
   ```bash
   docker compose up -d --build
   ```
3. Carregue o cardápio, o estoque e os pedidos de exemplo:
   ```bash
   docker compose exec backend python manage.py seed_demo
   ```

A API estará disponível em: `http://localhost:8000/api/`
O Frontend estará disponível em: `http://localhost:3000/`

## Demonstração

O comando `seed_demo` cria 10 produtos com ficha técnica, 15 insumos (um deles abaixo do mínimo), os usuários de cada perfil e 4 pedidos em estados diferentes: um pago, um em preparo, um delivery pronto com entregador (PIN `2468`) e um pedido do app aguardando ser aceito.

| Perfil | Usuário | Tela inicial |
|---|---|---|
| Administrador | `admin` (senha `admin` no ambiente de desenvolvimento) | Painel |
| Atendente | `atendente` | PDV (`/orders`) e gestão (`/gestao`) |
| Cozinheiro | `cozinheiro` | Cozinha (`/cozinha`) |
| Entregador | `entregador` | Entregas (`/entregador`) |
| Cliente | `cliente` | Cardápio (`/cliente`) |

- Usuários criados pelo `seed_demo` recebem a senha `demo1234` (ou o valor de `DEMO_PASSWORD`). No ambiente de desenvolvimento, os usuários já existentes mantêm a senha igual ao nome de usuário.
- Para voltar ao cenário inicial antes de uma apresentação: `docker compose exec backend python manage.py seed_demo --reset`. **Atenção:** apaga pedidos, financeiro, estoque, turnos e auditoria (usuários, permissões e configurações são mantidos).
- Em produção (`docker-compose.prod.yml`) o comando funciona igual: `docker compose -f docker-compose.prod.yml exec backend python manage.py seed_demo`.

## Comandos Úteis (Docker)

- Parar a aplicação: `docker compose down`
- Ver os logs do backend: `docker compose logs -f backend`
- Criar um superusuário manualmente: `docker compose exec backend python manage.py createsuperuser`
- Acessar o shell do Django: `docker compose exec backend python manage.py shell`

## Executando o Backend Manualmente (Sem Docker)

1. Crie um ambiente virtual: `python -m venv .venv`
2. Ative o ambiente: `.venv\Scripts\activate` (Windows) ou `source .venv/bin/activate` (Linux/Mac)
3. Instale as dependências: `pip install -r backend/requirements.txt`
4. Crie o arquivo `backend/.env` com a URL do banco (`DATABASE_URL=sqlite:///db.sqlite3` para rodar sem Postgres local).
5. Execute as migrações: `python manage.py migrate`
6. Rode o servidor: `python manage.py runserver`

## Estrutura do Banco de Dados
A documentação e o Diagrama Entidade-Relacionamento estão disponíveis em `docs/der.md`.
