# Correções da avaliação de qualidade (APS)

Este documento explica o que foi corrigido no tcc-ERP a partir dos defeitos encontrados na avaliação de qualidade (ISO/IEC 25010). Os IDs (D-01 a D-19) e as melhorias (M-01 a M-13) seguem o relatório da APS.

## Resumo

| Item | Antes | Depois |
|---|---|---|
| Suíte completa | 194 aprovados, 15 reprovados (de 209) | 208 aprovados (de 209) |
| Testes da APS (36) | 15 reprovados | todos aprovados |
| `pip-audit` (backend) | 19 vulnerabilidades | nenhuma |
| `npm audit` (frontend) | 23 alertas (2 críticos) | 0 |
| Listagem de 200 pedidos | 802 consultas SQL | constante, em torno de 6 |

O único erro restante é o teste `LogoAparaMargemTests`: um bloqueio de arquivo do Windows ao limpar uma pasta temporária. Ele já falhava antes de qualquer mudança e não está ligado às correções.

Como os testes foram escritos descrevendo o comportamento **esperado**, um teste que falhava indicava um defeito. Depois das correções, os mesmos testes servem de regressão.

## Controle de acesso

| Defeito | Causa | Correção |
|---|---|---|
| D-01 Entregadores visíveis a qualquer usuário autenticado | A view não declarava classe de permissão | `EntregadoresDisponiveisView` exige `PodeOperarPedidos` (só a equipe) |
| D-02 Entregador listava e apagava turnos de outros | `TurnoViewSet` era um CRUD completo liberado a todo funcionário | Só aceita GET e POST. Quem não tem a permissão `FECHAR_CAIXA` vê apenas os próprios turnos |
| D-03 Cliente definia o entregador ao criar o pedido | O serializer aceitava o campo `entregador` | Na criação pelo cliente, a view força `entregador=None` e zera `valor_recebido` e `troco` |
| D-07 Perfil "superadmin" concedido pelo nome de usuário | `MeSerializer.get_role` comparava o username | Regra removida: o perfil vem somente do banco |

## Autenticação

- **D-05 e D-06 (senhas):** os validadores de `AUTH_PASSWORD_VALIDATORS` estavam configurados, mas nenhum serializer os chamava. O cadastro agora executa `validate_password`. Funcionário criado sem senha deixou de receber `12345678` e recebe uma senha aleatória (`secrets.token_urlsafe`), que o administrador precisa redefinir.
- **D-04 (PIN de entrega):** o PIN de 4 dígitos usava `random` e não tinha limite de tentativas, o que permitia testar as 9.000 combinações. Agora:
  - é gerado com `secrets`;
  - é comparado em tempo constante (`hmac.compare_digest`);
  - cada erro incrementa o campo `tentativas_pin` do pedido (migração `orders/0008`). Na 5ª tentativa errada, a confirmação por PIN é bloqueada. Depois disso, só foto ou assinatura confirmam a entrega.

## Integridade do estoque (D-12)

A verificação do saldo dos insumos acontecia fora da transação e sem bloqueio. Dois atendentes confirmando pedidos ao mesmo tempo liam o mesmo saldo e ambos passavam, podendo deixar o estoque negativo.

- `verificar_estoque` agora roda **dentro** da transação de `transicionar_status` e bloqueia as linhas dos insumos com `select_for_update()`. A segunda confirmação espera a primeira terminar e lê o saldo já descontado.
- O banco ganhou a restrição `insumo_saldo_nao_negativo` (migração `inventory/0005`). A migração falha se já existirem insumos com saldo negativo.
- O cálculo de insumos, que estava copiado em três funções, passou a ser a função única `calcular_insumos`.

## Robustez (D-08 a D-10)

Quatro entradas inválidas (texto em campo numérico, IDs não numéricos e data malformada) geravam erro 500, porque as views convertiam `request.data` manualmente.

- Um helper (`inteiro_positivo`) responde 400 com a mensagem do campo.
- Um tratador central de exceções (`config/exceptions.py`, registrado em `REST_FRAMEWORK`) converte `ValueError`, `TypeError` e `ValidationError` do Django em HTTP 400 e registra o erro no log. Ele também cobre casos não previstos, como o filtro de data dos turnos.

## Auditoria (D-11)

Quatro blocos `except: pass` (em `orders/services.py`, `inventory/views.py` e `users/views.py`) engoliam falhas de auditoria. Agora registram `logger.exception`. A operação principal continua sem quebrar, mas a falha deixa rastro.

## Desempenho (D-13 e D-14)

- **Listagem de pedidos:** fazia 4 consultas por pedido (padrão N+1). `select_related('cliente', 'entregador', 'endereco', 'cancelled_by')` e `prefetch_related('itens__produto')` tornaram o número de consultas constante.
- **Entregadores disponíveis:** uma contagem por entregador virou um único `annotate(Count(..., filter=...))`.
- **Fechamento de expediente:** salvava pedido por pedido (103 consultas para 100 pedidos) e agora usa um único `UPDATE`.

## Dependências (D-18)

- **Backend:** Django 6.1.1, DRF 3.18.2 e PyJWT 2.15.0.
- **Frontend:** Next.js 16 e remoção do pacote `shadcn`, que não tinha `components.json` nem importações no código e trazia os alertas restantes. O Next 16 reescreveu o `tsconfig.json` automaticamente e avisa que a convenção `middleware` está obsoleta em favor de `proxy`.
- O `npm audit fix --force` rebaixaria o `shadcn` para a versão 1.0, por isso o pacote foi removido em vez de aceito.

## Integração contínua e configuração (M-12 e D-19)

- O workflow `.github/workflows/backend-checks.yml` agora roda os testes com cobertura mínima de 80% (a medida atual é 85%), o Bandit (severidade média ou alta) e o `pip-audit`.
- O `.github/dependabot.yml` agenda atualizações semanais do backend (pip) e do frontend (npm).
- Com `USE_HTTPS=True`, o Django envia HSTS por padrão (1 ano).
- O Caddy passou a enviar `X-Frame-Options DENY`, `Permissions-Policy` e `Strict-Transport-Security`. O HSTS é ignorado pelo navegador em HTTP puro.
- O padrão de `USE_HTTPS` continua `False`, porque o projeto suporta homologação em HTTP puro (`SITE_ADDRESS=:80`). Mudar o padrão deixaria quem sobe com ele sem conseguir logar, por causa dos cookies `Secure`. O `.env.prod.example` avisa que produção deve usar HTTPS.

## O que não foi corrigido

| Item | Motivo |
|---|---|
| D-15 Tokens JWT em `localStorage` | Exige mudar backend e frontend para cookie HttpOnly (M-10) |
| D-16 `transicionar_status` com complexidade 23 | Refatoração estrutural adiada (M-11) |
| D-17 Comanda sem verificação de colisão | Passou a usar `secrets`, mas o número ainda pode repetir |
| D-19 HTTPS desativado por padrão | Mantido pelo motivo acima |
| Content-Security-Policy no Caddy | Não foi adicionada: sem teste no navegador, pode quebrar os scripts do Next |

## Como reproduzir a verificação

```bash
# Testes do backend (em backend/, com DEBUG=True)
python manage.py test

# Somente a suíte da APS
python manage.py test aps_qualidade

# Segurança e dependências
bandit -r . -x ./aps_qualidade,./migrations -ll
pip-audit -r requirements.txt

# Frontend (em frontend/)
npm audit
npm run typecheck
npm run build
```

A suíte da APS (`backend/aps_qualidade/`) permanece no projeto como teste de regressão. Os resultados gerados por `rodar_aps.ps1` ficam em `backend/aps_qualidade/resultados/`, que é ignorada pelo git.

## Commits

| Commit | Conteúdo |
|---|---|
| `b3aade2` | Suíte da APS e ajuste do `.gitignore` |
| `a213e23` | Django, DRF e PyJWT atualizados |
| `c8baebe` | Controle de acesso, senhas e PIN (M-01 a M-05) |
| `04a7f56` | Bloqueio de estoque e auditoria (M-07 e M-08) |
| `0926006` | Validação de entrada, tratador de exceções e fim do N+1 (M-06 e M-09) |
| `815b191` | Atualização do frontend, Next.js 15.5.29 |
| `c71ebee` | Next.js 16 e remoção do `shadcn` |
| `bd55b1e` | CI, Dependabot, HSTS e cabeçalhos do Caddy |
