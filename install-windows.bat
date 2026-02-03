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
call npm install -g pnpm@8.15.0

echo.
echo [2/6] Instalando dependencias...
call pnpm install

echo.
echo [3/6] Iniciando Docker (PostgreSQL + Redis)...
call docker-compose up -d

echo.
echo [4/6] Aguardando PostgreSQL ficar pronto...
timeout /t 15 /nobreak

echo.
echo [5/6] Configurando banco de dados...
cd apps\api
call pnpm prisma generate
call pnpm prisma migrate deploy
call pnpm prisma db seed
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
