@echo off
echo ========================================
echo Reiniciando API
echo ========================================
echo.

cd apps\api

echo Gerando Prisma Client...
call pnpm prisma generate

echo.
echo Iniciando API em modo dev...
call pnpm dev

pause
