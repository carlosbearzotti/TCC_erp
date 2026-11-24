<#
.SYNOPSIS
  Plano B da apresentação: sobe o sistema completo neste computador (localhost), igual ao servidor da banca.

.DESCRIPTION
  Usa a stack de produção (Caddy + Next.js + Django + PostgreSQL + pgweb) em http://localhost:<Porta>.
  Na primeira execução: gera o .env com senhas novas, monta as imagens, carrega a demonstração
  (cardápio, estoque, equipe e pedidos de exemplo) e aplica as fotos e a logo do kit, se existirem.
  Nas próximas: só religa o que já existe, sem apagar dados.

  Requisitos: Docker Desktop instalado e o repositório clonado.
  Kit opcional (fotos e logo, fora do git): pasta "plano-b" na raiz do repositório com
    plano-b\demo_imagens\*.jpg|jpeg|png|webp   (nome = produto, ex.: x-burger.jpeg)
    plano-b\logo.png

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\plano-b.ps1
  powershell -ExecutionPolicy Bypass -File scripts\plano-b.ps1 -Porta 9000
  powershell -ExecutionPolicy Bypass -File scripts\plano-b.ps1 -Parar
#>
param(
    [int]$Porta = 8080,
    [string]$Kit = "",
    [switch]$Parar
)

$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz
if (-not $Kit) { $Kit = Join-Path $Raiz "plano-b" }

$Projeto = "tcc-erp-planob"
$Compose = @("compose", "-p", $Projeto, "-f", "docker-compose.prod.yml", "-f", "docker-compose.pgweb.yml")

function Write-Passo($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Write-Ok($texto) { Write-Host "    OK: $texto" -ForegroundColor Green }
function Write-Aviso($texto) { Write-Host "    AVISO: $texto" -ForegroundColor Yellow }

function Invoke-Docker {
    & docker @args
    if ($LASTEXITCODE -ne 0) { throw "Falhou: docker $($args -join ' ')" }
}

function New-Segredo([int]$bytes = 24) {
    $buffer = New-Object byte[] $bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return ([Convert]::ToBase64String($buffer)).Replace("+", "-").Replace("/", "_").TrimEnd("=")
}

function Read-Env {
    $valores = @{}
    foreach ($linha in Get-Content ".env") {
        if ($linha -match '^\s*([A-Z_]+)=(.*)$') { $valores[$Matches[1]] = $Matches[2].Trim() }
    }
    return $valores
}

# ---------------------------------------------------------------- Docker
Write-Passo "Verificando o Docker"
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $exe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $exe)) { throw "Docker Desktop não encontrado. Instale em https://www.docker.com/products/docker-desktop" }
    Write-Host "    Abrindo o Docker Desktop (pode levar 1 a 2 minutos)..."
    Start-Process $exe
    $limite = (Get-Date).AddMinutes(4)
    do {
        Start-Sleep -Seconds 5
        & docker info *> $null
    } until ($LASTEXITCODE -eq 0 -or (Get-Date) -gt $limite)
    if ($LASTEXITCODE -ne 0) { throw "O Docker não iniciou. Abra o Docker Desktop manualmente e rode o script de novo." }
}
Write-Ok "Docker rodando"

if ($Parar) {
    Write-Passo "Parando o plano B (os dados ficam guardados)"
    Invoke-Docker @Compose stop
    Write-Ok "Parado. Para religar, rode o script de novo sem -Parar."
    return
}

# ---------------------------------------------------------------- .env
Write-Passo "Configuração (.env)"
if (Test-Path ".env") {
    Write-Ok ".env já existe, mantido como está"
} else {
    $conteudo = @"
SECRET_KEY=$(New-Segredo 48)
POSTGRES_PASSWORD=$(New-Segredo 24)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(New-Segredo 9)
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:$Porta,http://127.0.0.1:$Porta
SITE_ADDRESS=:80
TLS_DIRECTIVE=
USE_HTTPS=False
HTTP_PORT=$Porta
HTTPS_PORT=$($Porta + 363)
DEMO_PASSWORD=demo1234
PGWEB_DB_PASSWORD=$(New-Segredo 18)
PGWEB_LOGIN_USER=banca
PGWEB_LOGIN_PASSWORD=$(New-Segredo 9)
"@
    # UTF-8 sem BOM: o docker compose não lê a primeira chave se houver BOM
    [IO.File]::WriteAllText((Join-Path $Raiz ".env"), $conteudo, (New-Object Text.UTF8Encoding $false))
    Write-Ok ".env criado com senhas novas (veja ADMIN_PASSWORD e PGWEB_LOGIN_PASSWORD no arquivo)"
}
$envs = Read-Env
$Porta = [int]$envs["HTTP_PORT"]

# ---------------------------------------------------------------- Kit (fotos e logo)
Write-Passo "Kit de fotos e logo"
$fotosKit = Join-Path $Kit "demo_imagens"
if (Test-Path $fotosKit) {
    New-Item -ItemType Directory -Force "backend\demo_imagens" | Out-Null
    Copy-Item (Join-Path $fotosKit "*") "backend\demo_imagens" -Force
    Write-Ok "$((Get-ChildItem $fotosKit -File).Count) fotos copiadas para backend\demo_imagens"
} else {
    Write-Aviso "pasta $fotosKit não encontrada: produtos ficam sem foto (dá para enviar pelo Catálogo)"
}

# Painel do banco: rota /db protegida por senha no Caddy
New-Item -ItemType Directory -Force "infrastructure\caddy-extra" | Out-Null
$snippet = "infrastructure\caddy-extra\pgweb.caddy"
if (-not (Test-Path $snippet)) {
    $hash = (& docker run --rm caddy:2-alpine caddy hash-password --plaintext $envs["PGWEB_LOGIN_PASSWORD"]).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $hash) { throw "Não foi possível gerar a senha do painel do banco." }
    $caddy = @"
@pgweb path /db /db/*
handle @pgweb {
	basic_auth {
		$($envs["PGWEB_LOGIN_USER"]) $hash
	}
	reverse_proxy pgweb:8081
}
"@
    [IO.File]::WriteAllText((Join-Path $Raiz $snippet), $caddy, (New-Object Text.UTF8Encoding $false))
    Write-Ok "acesso ao painel do banco configurado"
}

# ---------------------------------------------------------------- Subida
Write-Passo "Montando e subindo os containers (a primeira vez leva de 5 a 10 minutos)"
Invoke-Docker @Compose up -d --build

Write-Passo "Aguardando a API responder"
$url = "http://localhost:$Porta"
$limite = (Get-Date).AddMinutes(5)
$pronto = $false
do {
    Start-Sleep -Seconds 5
    try { $pronto = (Invoke-WebRequest "$url/api/health/" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } catch { }
} until ($pronto -or (Get-Date) -gt $limite)
if (-not $pronto) { throw "A API não respondeu em $url/api/health/. Veja: docker $($Compose -join ' ') logs backend" }
Write-Ok "API no ar"

# ---------------------------------------------------------------- Banco: usuário somente leitura do pgweb
Write-Passo "Usuário somente leitura do painel do banco"
$senhaLeitura = $envs["PGWEB_DB_PASSWORD"]
$banco = if ($envs["POSTGRES_DB"]) { $envs["POSTGRES_DB"] } else { "tcc_erp" }
$sql = @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='leitura') THEN
    CREATE ROLE leitura LOGIN PASSWORD '$senhaLeitura';
  ELSE
    ALTER ROLE leitura LOGIN PASSWORD '$senhaLeitura';
  END IF;
END `$`$;
ALTER ROLE leitura SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE $banco TO leitura;
GRANT USAGE ON SCHEMA public TO leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO leitura;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO leitura;
"@
$sql | & docker @Compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) { throw "Falha ao criar o usuário de leitura do banco." }
Invoke-Docker @Compose restart pgweb
Write-Ok "pgweb conectado em modo leitura"

# ---------------------------------------------------------------- Demonstração
Write-Passo "Carregando a demonstração (sem apagar o que já existir)"
Invoke-Docker @Compose exec -T backend python manage.py seed_demo

$logo = Join-Path $Kit "logo.png"
if (Test-Path $logo) {
    $container = (& docker @Compose ps -q backend).Trim()
    Invoke-Docker cp $logo "${container}:/tmp/logo-kit.png"
    $py = @"
from django.core.files import File
from core.branding import salvar_logo
with open('/tmp/logo-kit.png', 'rb') as f:
    salvar_logo(File(f, name='logo.png'))
print('logo aplicada')
"@
    $py | & docker @Compose exec -T backend python manage.py shell
    if ($LASTEXITCODE -ne 0) { Write-Aviso "não foi possível aplicar a logo; envie pela tela de Configurações" } else { Write-Ok "logo aplicada" }
} else {
    Write-Aviso "logo.png não encontrada no kit: envie pela tela de Configurações"
}

# ---------------------------------------------------------------- Resumo
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " PLANO B NO AR: $url" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " Cliente ........ $url/cliente   (cliente / demo1234)"
Write-Host " Atendente ...... $url/gestao    (atendente / demo1234)"
Write-Host " Cozinha ........ $url/cozinha   (cozinheiro / demo1234)"
Write-Host " Entregador ..... $url/entregador (entregador / demo1234)"
Write-Host " Admin .......... $url/          (admin / ADMIN_PASSWORD do .env)"
Write-Host " Banco (pgweb) .. $url/db/       ($($envs["PGWEB_LOGIN_USER"]) / PGWEB_LOGIN_PASSWORD do .env)"
Write-Host " Delivery pronto com PIN 2468 já está na tela do entregador."
Write-Host " Parar sem perder dados: powershell -ExecutionPolicy Bypass -File scripts\plano-b.ps1 -Parar"
Start-Process "$url/login"
