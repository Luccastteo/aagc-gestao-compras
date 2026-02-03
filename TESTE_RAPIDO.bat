@echo off
echo ========================================
echo TESTE RAPIDO - Reiniciar API
echo ========================================
echo.

cd apps\api

echo [1/3] Gerando Prisma Client...
call pnpm prisma generate

echo.
echo [2/3] Instalando dependencias...
call pnpm install

echo.
echo [3/3] Iniciando API...
call pnpm dev

pause
