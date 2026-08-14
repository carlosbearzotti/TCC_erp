# Guia de colaboração

## Fluxo Git

1. Escolha uma issue ainda atribuída ao responsável correto.
2. Atualize sua cópia de `develop`.
3. Crie uma branch no formato `feature/ISSUE-resumo-curto` ou `fix/ISSUE-resumo-curto`.
4. Implemente apenas o escopo da issue, incluindo testes.
5. Dentro de `backend/`, execute `python manage.py check` e `python manage.py test`.
6. Abra um pull request para `develop`, descrevendo o que mudou, como testar e quais issues são fechadas.

`main` recebe apenas versões aprovadas. `develop` concentra a integração do semestre. A criação do repositório remoto no GitHub é uma etapa posterior; esta estrutura já está pronta para receber o remote.

## Registros das tasks

Ao concluir uma task, crie ou atualize um registro Markdown em `docs/records/` com a data no nome. Todo registro novo deve começar com estes metadados:

```markdown
# Título da task

**Data:** dia de mês de ano  
**Status:** Concluída  
**Responsável:** nome do integrante responsável
```

Por padrão, o responsável é **Danilo Augusto**. Só use outro nome quando a equipe atribuir explicitamente a task a outro integrante. O registro deve resumir objetivo, decisões, entregas, verificações e próximos passos.

## Convenções por módulo

Cada app Django deve manter responsabilidades claras:

Todos os apps Django vivem em `backend/`. A futura interface vive somente em `frontend/`; instruções de ambiente e operação vivem em `infrastructure/`.

O app `backend/catalog/` já existe como esqueleto documentado; siga [o guia de CRUD](CATALOG_CRUD_GUIDE.md) antes de adicionar modelos, endpoints ou testes. Os próximos apps aprovados são `inventory`, `orders`, `preparation` e `finance`, mas nenhum deles deve ser criado antes de sua issue. Não use `consumers` como nome de domínio: pedidos pertencem a `orders` e fila/FIFO pertence a `preparation`.

```text
backend/nome_do_modulo/
  models.py        Entidades e regras de persistência
  serializers.py   Entrada e saída da API
  views.py         Endpoints e orquestração
  urls.py          Rotas do módulo
  permissions.py   Regras de acesso específicas, se necessário
  services.py      Regras de negócio reutilizáveis e transações
  admin.py         Configuração do painel administrativo
  tests.py         Testes do módulo
  migrations/      Migrações geradas pelo Django
```

Não coloque regras de negócio extensas em `views.py`; prefira `services.py`. Não edite uma migração já compartilhada: crie uma nova.

Para o frontend, mantenha tela em `frontend/src/screens/`, componente reutilizável em `frontend/src/components/` e integração HTTP em `frontend/src/services/`.

## Endpoints e segurança

- Rotas públicas devem declarar `AllowAny` explicitamente.
- Rotas internas usam JWT e permissões por perfil.
- Não confie apenas no redirecionamento do frontend: o backend valida o perfil em cada endpoint.
- Senhas, tokens e dados de ambiente não entram em commits ou documentação.

## Checklist de pull request

- [ ] Escopo da issue atendido e sem mudanças não relacionadas.
- [ ] Migrações incluídas, se houve alteração de modelo.
- [ ] Testes criados ou atualizados.
- [ ] `python manage.py check` e `python manage.py test` executados.
- [ ] README/docs atualizados se a interface, decisão ou execução mudou.
- [ ] Workflow do GitHub Actions continua apontando para `backend/` quando houver mudança de estrutura.
