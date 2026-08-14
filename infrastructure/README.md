# Infrastructure — ambientes e operação

Esta pasta será usada para arquivos que descrevam ou automatizem infraestrutura, sem misturar esses itens com a lógica do ERP.

Exemplos futuros:

- configuração de ambiente e variáveis de exemplo;
- scripts de backup e banco de dados;
- Docker ou compose, se a equipe decidir adotar;
- instruções de deploy;
- monitoramento e logs.

O fluxo de CI já está em `.github/workflows/backend-checks.yml`, pois GitHub Actions reconhece essa localização automaticamente. Nenhum deploy foi configurado nesta etapa.

O workflow instala `backend/requirements.txt` e executa `python manage.py check` e `python manage.py test` com `backend/` como diretório de trabalho.
