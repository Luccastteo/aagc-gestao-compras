@echo off
echo ========================================
echo AAGC SaaS - Iniciando Sistema
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Docker nao esta rodando!
    echo Iniciando Docker containers...
    docker-compose up -d
    timeout /t 5 /nobreak
)

echo [OK] Docker rodando
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
