FROM python:3.12-slim

# Impede o Python de gerar arquivos .pyc
ENV PYTHONDONTWRITEBYTECODE 1
# Exibe a saída padrão (stdout/stderr) sem buffer
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalação de dependências do SO (necessárias para build do psycopg2, etc)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependências Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação
COPY . /app/

# Expõe a porta que o Django usará (gunicorn ou runserver)
EXPOSE 8000

# O comando padrão para iniciar a aplicação usando runserver (em prod usaríamos gunicorn)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
