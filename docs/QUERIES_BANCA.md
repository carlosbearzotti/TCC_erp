# Consultas para a apresentação (pgweb, aba Query)

Painel: `https://pllanchonete.tailc962e7.ts.net/db/` (usuário `banca`). Somente leitura.
Ordem sugerida: rodar a 1 antes do fluxo ao vivo e repetir 1, 3, 4, 5 e 6 depois que o entregador finalizar.

## 1. Pedidos: o ciclo de vida de cada um
```sql
SELECT p.id, p.numero_comanda AS comanda, p.tipo_atendimento AS tipo, p.status,
       p.total, u.username AS cliente, e.username AS entregador,
       to_char(p.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS criado
FROM orders_pedido p
LEFT JOIN auth_user u ON u.id = p.cliente_id
LEFT JOIN auth_user e ON e.id = p.entregador_id
ORDER BY p.id DESC;
```

## 2. Itens do pedido mais recente (relação pedido, item e produto)
```sql
SELECT p.id AS pedido, pr.nome AS produto, i.quantidade, i.preco_unitario,
       i.quantidade * i.preco_unitario AS subtotal
FROM orders_itempedido i
JOIN orders_pedido p ON p.id = i.pedido_id
JOIN catalog_produto pr ON pr.id = i.produto_id
WHERE p.id = (SELECT max(id) FROM orders_pedido);
```

## 3. Estoque: saldo atual e itens críticos
```sql
SELECT nome, quantidade_atual AS saldo, estoque_minimo AS minimo, unidade_medida AS un,
       CASE WHEN quantidade_atual < estoque_minimo THEN 'CRÍTICO' ELSE 'ok' END AS situacao
FROM inventory_insumo
ORDER BY (quantidade_atual < estoque_minimo) DESC, nome;
```

## 4. Baixas de estoque geradas pelos pedidos (ficha técnica em ação)
```sql
SELECT to_char(m.data AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
       i.nome AS insumo, m.tipo, m.quantidade, m.motivo
FROM inventory_movimentacao m
JOIN inventory_insumo i ON i.id = m.insumo_id
ORDER BY m.id DESC
LIMIT 20;
```

## 5. Financeiro: receitas geradas pelos pedidos pagos
```sql
SELECT l.id, l.type AS tipo, l.value AS valor, l.payment_method AS pagamento,
       l.pedido_id AS pedido, l.description AS descricao, l.date AS data
FROM finance_lancamento l
ORDER BY l.id DESC;
```

## 6. Auditoria: quem fez o quê
```sql
SELECT to_char(a.data AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI:SS') AS quando,
       u.username AS usuario, a.acao, a.entidade, a.entidade_id
FROM rh_auditoria a
LEFT JOIN auth_user u ON u.id = a.user_id
ORDER BY a.id DESC
LIMIT 20;
```

## 7. Ficha técnica: o que cada produto consome
```sql
SELECT pr.nome AS produto, pr.preco, i.nome AS insumo,
       r.quantidade_necessaria AS qtd, i.unidade_medida AS un
FROM inventory_receitaitem r
JOIN catalog_produto pr ON pr.id = r.produto_id
JOIN inventory_insumo i ON i.id = r.insumo_id
ORDER BY pr.nome, i.nome;
```

## 8. Usuários e perfis (controle de acesso por papel)
```sql
SELECT u.username, u.first_name AS nome, p.role AS perfil, p.is_online AS online
FROM auth_user u
LEFT JOIN users_perfil p ON p.user_id = u.id
ORDER BY p.role, u.username;
```

## 9. Entrega: PIN, tentativas e comprovante
```sql
SELECT p.id, p.status, e.username AS entregador, p.tentativas_pin,
       (p.comprovante_entrega_url IS NOT NULL) AS tem_comprovante,
       p.motivo_falha_entrega
FROM orders_pedido p
LEFT JOIN auth_user e ON e.id = p.entregador_id
WHERE p.tipo_atendimento = 'delivery'
ORDER BY p.id DESC;
```

## 10. Resumo do dia (indicadores)
```sql
SELECT count(*) AS pedidos,
       count(*) FILTER (WHERE status IN ('finalizado', 'entregue')) AS concluidos,
       count(*) FILTER (WHERE status = 'cancelado') AS cancelados,
       coalesce(sum(total) FILTER (WHERE status IN ('finalizado', 'entregue')), 0) AS faturamento,
       round(avg(total), 2) AS ticket_medio
FROM orders_pedido;
```

## 11. Integridade: quantas regras o banco garante
```sql
SELECT CASE contype WHEN 'p' THEN 'Chave primária' WHEN 'f' THEN 'Chave estrangeira'
                    WHEN 'u' THEN 'Unicidade' WHEN 'c' THEN 'Verificação (CHECK)' END AS tipo,
       count(*) AS quantidade
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
GROUP BY contype ORDER BY quantidade DESC;
```

## 12. Integridade: as regras de negócio no banco (unicidade e CHECK)
```sql
SELECT conrelid::regclass AS tabela, pg_get_constraintdef(oid) AS regra
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace AND contype IN ('u', 'c')
  AND conrelid::regclass::text !~ '^(auth_|django_|token_)'
ORDER BY contype, tabela;
```
