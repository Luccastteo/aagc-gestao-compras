@echo off
echo ========================================
echo AAGC SaaS - Instalacao Automatica
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale Node.js 20+ de https://nodejs.org
    pause
    exit /b 1
)

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao encontrado!
    echo Por favor, instale Docker Desktop de https://docker.com
    pause
    exit /b 1
)

echo [1/6] Instalando pnpm...
call npm install -g pnpm@8.15.1
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar pnpm.
    pause
    exit /b 1
)

echo.
echo [2/6] Instalando dependencias...
call pnpm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)

echo.
echo [3/6] Iniciando Docker (PostgreSQL + Redis)...
REM Verifica se o Docker Engine esta rodando (Docker Desktop aberto)
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker instalado, mas o Engine nao esta rodando.
    echo.
    echo Abra o Docker Desktop e aguarde ficar ^"Running^".
    echo Se aparecer erro de WSL 2, habilite WSL2 e reinicie o PC.
    echo.
    pause
    exit /b 1
)

REM Sobe containers (suporta docker compose ou docker-compose)
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    call docker compose up -d
) else (
    call docker-compose up -d
)
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao subir containers com Docker Compose.
    echo Verifique se o Docker Desktop esta rodando.
    pause
    exit /b 1
)

echo.
echo [4/6] Aguardando PostgreSQL ficar pronto...
set /a RETRIES=60
:WAIT_PG
docker exec aagc-postgres pg_isready -U aagc >nul 2>&1
if %errorlevel% equ 0 goto PG_OK
set /a RETRIES-=1
if %RETRIES% leq 0 goto PG_FAIL
timeout /t 2 /nobreak >nul
goto WAIT_PG

:PG_FAIL
echo [ERRO] PostgreSQL nao ficou pronto a tempo.
echo Rode: docker ps  (precisa mostrar aagc-postgres como healthy)
pause
exit /b 1

:PG_OK

echo.
echo [5/6] Configurando banco de dados...
cd apps\api
call pnpm prisma generate
if %errorlevel% neq 0 (
    echo [ERRO] Prisma generate falhou.
    pause
    exit /b 1
)
call pnpm prisma migrate deploy
if %errorlevel% neq 0 (
    echo [ERRO] Prisma migrate deploy falhou. Banco nao esta acessivel.
    pause
    exit /b 1
)
call pnpm prisma db seed
if %errorlevel% neq 0 (
    echo [ERRO] Seed falhou.
    pause
    exit /b 1
)
cd ..\..

echo.
echo [6/6] Pronto!
echo.
echo ========================================
echo Instalacao concluida com sucesso!
echo ========================================
echo.
echo Para iniciar o sistema, execute:
echo   start-all.bat
echo.
echo Ou manualmente:
echo   pnpm dev
echo.
pause
