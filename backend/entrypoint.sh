#!/bin/sh
set -e

echo "==> [Entrypoint] Aguardando o banco de dados PostgreSQL..."
while ! python -c "
import psycopg2, os
from urllib.parse import urlparse
url = urlparse(os.environ.get('DATABASE_URL', 'postgres://postgres:postgres@db:5432/tcc_erp'))
conn = psycopg2.connect(
    dbname=url.path[1:],
    user=url.username,
    password=url.password,
    host=url.hostname,
    port=url.port or 5432
)
conn.close()
" 2>/dev/null; do
    echo "==> PostgreSQL ainda não está pronto, aguardando 1s..."
    sleep 1
done

echo "==> [Entrypoint] PostgreSQL pronto e conectado!"

echo "==> [Entrypoint] 1. Aplicando Migrations..."
python manage.py migrate --noinput

echo "==> [Entrypoint] 2. Aplicando Seed de Permissões (RBAC)..."
python manage.py seed_permissions

echo "==> [Entrypoint] 3. Aplicando Seed de Usuários e Perfis..."
python seed_users.py

echo "==> [Entrypoint] Inicialização concluída com sucesso! Iniciando comando principal..."
exec "$@"
