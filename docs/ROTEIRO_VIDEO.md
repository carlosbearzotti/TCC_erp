# Roteiro do vídeo: "O que o sistema faz / interações com as camadas"

Disciplina: Sistemas Distribuídos. O foco é o funcionamento do produto e o que há de distribuído nele: componentes separados que se comunicam pela rede, vários clientes ao mesmo tempo, concorrência, consistência e falhas. Escolha de tecnologia e detalhes de código ficam em segundo plano.

Duração sugerida: 15 a 18 minutos. Cada bloco traz o que mostrar na tela e o que falar.

## 0. Preparação antes de gravar

O sistema roda com Docker Desktop na própria máquina (stack de desenvolvimento do `docker-compose.yml`).

```bash
docker compose up -d --build     # sobe db, backend e frontend
docker compose ps                # os 3 containers devem estar "Up"
```

- Sistema: `http://localhost:3000` | API: `http://localhost:8000/api/` | Health check: `http://localhost:8000/api/health/`
- Usuários de demonstração: `admin`/`admin`, e `atendente`, `cozinheiro`, `entregador`, `cliente` (senha igual ao usuário).
- Dados do cardápio: o `load_initial_data` só cria categorias. Cadastre antes de gravar insumos com saldo, produtos e a **ficha técnica** de cada um. Sem ela, a baixa de estoque não aparece.
- **Vários clientes ao mesmo tempo:** abra janelas separadas (ou navegadores/perfis diferentes) logadas como atendente, cozinheiro e entregador. Cada uma guarda a sua própria sessão. Se possível, use também o celular em `http://IP-DO-PC:3000` (o Windows precisa liberar as portas 3000 e 8000 no firewall).
- Abra as telas uma vez antes de gravar. O frontend foi validado só por typecheck e build.
- Para recomeçar limpo: `docker compose down -v` apaga o banco; sem o `-v` os dados ficam.

## 1. O que o sistema faz (2 min)
- **Mostrar:** login e painel.
- **Falar:** o tcc-ERP gerencia uma lanchonete e pastelaria: **o pedido nasce no balcão ou no app do cliente, passa pela cozinha, é entregue e pago, e a cada etapa o estoque e o financeiro são atualizados.** Cada tipo de funcionário usa uma tela própria, ao mesmo tempo, e todos enxergam o mesmo estado.
- Funções: atendimento (balcão, mesa, delivery, cardápio do cliente), cozinha (fila FIFO), entregas com PIN, estoque com ficha técnica, financeiro, rotinas automáticas (RPA).

## 2. Quantas camadas tem e como se distribui (3 min)
**Resposta direta: arquitetura cliente-servidor em 3 camadas lógicas**, cada uma em um processo separado (container), mais o proxy na produção.

| Camada / nó | Onde roda | Papel na distribuição |
|---|---|---|
| Clientes | Navegadores (balcão, cozinha, celular do entregador e do cliente) | Vários, simultâneos, sem estado compartilhado entre si |
| 1. Apresentação | Container `frontend` | Serve as telas; cada tela consulta a API pela rede |
| 2. Aplicação (API + regras) | Container `backend`, com 3 processos `gunicorn` em produção | Recebe as requisições, autentica, valida e aplica as regras de negócio |
| 3. Dados | Container `db` (PostgreSQL) | Única fonte da verdade; guarda o estado compartilhado |
| (produção) Entrada | Container `caddy` | Ponto único de acesso: encaminha `/api/*` ao backend e o resto ao frontend, e cuida do HTTPS |

**Como se comunicam:**
- Cliente para servidor: **HTTP/REST com JSON**.
- Backend para banco: conexão **TCP** com o PostgreSQL.
- Autenticação: **JWT**, sem sessão guardada no servidor. Qualquer processo do backend atende qualquer requisição.

- **Mostrar:** `docker compose ps` (3 containers em desenvolvimento), `docker-compose.prod.yml` (4 em produção) e um diagrama simples com as setas.
- **Falar:** o frontend nunca fala com o banco. Toda regra importante está no backend, e o banco é o único lugar onde o estado é guardado.

## 3. Interações entre as camadas: acompanhar um pedido (6 min)
Deixe quatro janelas visíveis: atendente, cozinha, entregador e `docker compose logs -f backend`. Faça o fluxo e mostre a atualização chegando nas outras telas.

1. **Atendente cria o pedido** em `/orders`: o navegador manda `POST /api/orders/` com o token. Nos logs aparece a requisição chegando ao backend.
2. **Confirmar o pedido:** o backend valida a transição de estado, verifica o estoque dos insumos e **baixa o estoque** pela ficha técnica, tudo em **uma única transação**. Mostre o saldo do insumo antes e depois.
3. **Cozinha** (`/cozinha`): o pedido aparece sozinho, sem recarregar a página, porque a tela consulta a API a cada 4 segundos. Mude para em preparo e pronto.
4. **Entregador** (`/entregador`): a loja atribui o entregador, que vê a entrega aparecer (consulta a cada 5 s) e confirma com o PIN do cliente.
5. **Pagamento:** o pedido vira finalizado, e o financeiro gera a receita e a auditoria **automaticamente**.
6. **Fechar expediente:** arquiva os pedidos concluídos de uma vez.

- **Falar:** os clientes não conversam entre si. A sincronização acontece porque todos leem e escrevem no mesmo estado central (o banco), por meio da API, e as telas atualizam por consulta periódica (*polling*).

## 4. Conceitos de sistemas distribuídos no sistema (4 min)
Para cada conceito, mostre a evidência.

| Conceito | Como aparece no sistema | O que mostrar |
|---|---|---|
| Comunicação | REST/JSON sobre HTTP entre cliente, frontend e backend | Uma requisição nos logs e no navegador (aba Rede) |
| Estado sem sessão (*stateless*) | Login com JWT: nenhum processo guarda a sessão, então qualquer um dos 3 `gunicorn` atende qualquer requisição | O cabeçalho `Authorization` na aba Rede |
| Concorrência e consistência | A baixa de estoque e a fila FIFO da cozinha usam **bloqueio de linha** (`select_for_update`) dentro de transação; o banco impede saldo negativo | O trecho em `orders/services.py` |
| Estado compartilhado entre processos | Os contadores do limite de tentativas ficam em tabela do banco, não na memória de cada processo | `CACHES` em `config/settings.py` |
| Tolerância a falhas | `healthcheck` do banco e da API, o backend só inicia depois do banco ficar saudável, e `restart: unless-stopped` reinicia containers que caem; os dados ficam em volumes | A demonstração de falha abaixo |
| Escalabilidade | O número de processos da API é configurável (`GUNICORN_WORKERS`); o fim das consultas N+1 reduziu a carga no banco (de 802 para cerca de 6 consultas ao listar 200 pedidos) | `docker-compose.prod.yml` |
| Transparência | O usuário usa um único endereço; não sabe quantos processos existem por trás | Que o cliente só conhece o `localhost:3000` |

**Demonstração de falha (ensaie antes):**
```bash
docker compose stop backend      # a tela mostra erro de conexão
docker compose start backend     # a tela volta a atualizar sozinha
```
Falar: o cliente não perde dados, porque o estado está no banco e não no processo que caiu.

**Limitações para citar com honestidade** (é assunto da matéria):
- Há uma única instância de cada componente, então o banco e o proxy são pontos únicos de falha. Não há réplica do banco nem balanceamento entre várias máquinas.
- A sincronização é por *polling* (alguns segundos de atraso), e não por notificação em tempo real (WebSocket).

## 5. Fechamento (1 min)
- Resumo: um produto de 3 camadas distribuídas em processos separados, que se comunicam por HTTP e TCP; vários clientes simultâneos compartilham o estado pelo banco; a consistência é garantida por transações e bloqueios; e o sistema se recupera de falhas reiniciando os componentes.
- Se couber: a mesma stack, com `docker-compose.prod.yml` e o Caddy, é a que vai para a VM da implantação (`infrastructure/README.md`).

## Dicas de gravação
- Faça um ensaio completo antes: pedido do balcão ao pagamento e a demonstração de falha.
- Grave as telas e o terminal lado a lado; mostre o código só nos trechos citados na seção 4.
- Se algo travar, `docker compose logs backend` mostra o motivo; `docker compose restart backend` costuma resolver.
