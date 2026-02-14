@echo off
title AAGC - Dev
cd /d "%~dp0"

echo ============================================
echo    AAGC - Liberando portas e iniciando
echo ============================================
echo.

REM Liberar portas 3002 (Web) e 3003 (API) para evitar "porta em uso"
echo [1/3] Liberando portas 3002 e 3003...
for %%P in (3002 3003) do (
  for /f "tokens=5" %%A in ('netstat -aon ^| findstr /R /C:":%%P " ^| findstr LISTENING 2^>nul') do (
    echo        Encerrando processo na porta %%P (PID %%A)
    taskkill /PID %%A /F >nul 2>&1
  )
)
echo [OK] Portas liberadas
echo.

REM Remover lock do Next.js (evita "Unable to acquire lock")
echo [2/3] Removendo lock do Next.js (se existir)...
if exist "apps\web\.next\dev\lock" (
  del /q "apps\web\.next\dev\lock"
  echo [OK] Lock removido
) else (
  echo [OK] Nenhum lock encontrado
)
echo.

echo [3/3] Iniciando aplicacao (Web + API + Worker)...
echo.
echo ============================================
echo    Apos subir, acesse:
echo    Site: http://localhost:3002
echo    API:  http://localhost:3003
echo    Login: manager@demo.com / demo123
echo ============================================
echo Pressione Ctrl+C para parar
echo.

pnpm dev

pause
