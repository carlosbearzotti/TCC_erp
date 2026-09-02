#!/bin/bash
# Script de backup do banco de dados PostgreSQL usando Docker

# Variáveis
CONTAINER_NAME="tcc_erp_db"
DB_USER="postgres"
DB_NAME="tcc_erp"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"

# Garante que o diretório de backups existe
mkdir -p ${BACKUP_DIR}

echo "Iniciando backup do banco de dados ${DB_NAME}..."

# Executa o pg_dump no container
docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} -c > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "Backup realizado com sucesso! Arquivo salvo em: ${BACKUP_FILE}"
    
    # Opcional: Remover backups mais antigos que 7 dias
    # find ${BACKUP_DIR} -type f -name "*.sql" -mtime +7 -delete
else
    echo "Erro ao realizar o backup."
    exit 1
fi
