@echo off
echo ============================================
echo    AAGC SaaS - Iniciar Desenvolvimento
echo ============================================
echo.

REM Verificar se Docker está rodando
echo [1/6] Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker não está rodando!
    echo Por favor, inicie o Docker Desktop e tente novamente.
    pause
    exit /b 1
)
echo [OK] Docker está rodando

REM Verificar se pnpm está instalado
echo.
echo [2/6] Verificando pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] pnpm não está instalado!
    echo Instalando pnpm globalmente...
    npm install -g pnpm@8.15.0
)
echo [OK] pnpm instalado

REM Iniciar containers (Postgres e Redis)
echo.
echo [3/6] Iniciando Postgres e Redis...
docker-compose up -d postgres redis
if errorlevel 1 (
    echo [ERRO] Falha ao iniciar containers
    pause
    exit /b 1
)
echo [OK] Containers iniciados

REM Aguardar Postgres estar pronto
echo.
echo [4/6] Aguardando Postgres inicializar (10s)...
timeout /t 10 /nobreak >nul
echo [OK] Postgres pronto

REM Verificar se precisa rodar migrations
echo.
echo [5/6] Verificando banco de dados...
cd apps\api
if not exist "node_modules" (
    echo Instalando dependências da API...
    pnpm install
)

echo Rodando migrations...
pnpm prisma migrate deploy
if errorlevel 1 (
    echo [AVISO] Migrations falharam, tentando com migrate dev...
    pnpm prisma migrate dev --skip-generate
)

echo Gerando Prisma Client...
pnpm prisma generate

REM Verificar se precisa fazer seed
echo.
set /p SEED="Deseja popular o banco com dados demo? (S/N): "
if /i "%SEED%"=="S" (
    echo Populando banco de dados...
    pnpm prisma db seed
)

cd ..\..

REM Iniciar aplicação
echo.
echo [6/6] Iniciando aplicação...
echo.
echo ============================================
echo    Serviços disponíveis:
echo ============================================
echo    Frontend: http://localhost:3000
echo    API:      http://localhost:3001
echo    Docs:     http://localhost:3001/api/docs
echo ============================================
echo.
echo Pressione Ctrl+C para parar
echo.

pnpm dev
