@echo off
echo ========================================
echo AAGC SaaS - Iniciando Sistema
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker Desktop nao esta rodando (Engine indisponivel).
    echo.
    echo 1) Abra o Docker Desktop
    echo 2) Aguarde ficar ^"Running^"
    echo 3) Rode este script novamente
    echo.
    pause
    exit /b 1
)

REM Sobe containers (suporta docker compose ou docker-compose)
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    docker compose up -d
) else (
    docker-compose up -d
)
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao subir containers.
    pause
    exit /b 1
)

REM Aguarda Postgres ficar pronto
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

echo [OK] Docker + Banco prontos
echo.
echo Iniciando todos os servicos...
echo.
echo - API: http://localhost:3001
echo - Web: http://localhost:3000
echo - Docs: http://localhost:3001/api/docs
echo.
echo Login demo:
echo   Email: manager@demo.com
echo   Senha: demo123
echo.
echo Pressione Ctrl+C para parar
echo.

call pnpm dev
