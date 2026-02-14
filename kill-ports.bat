@echo off
setlocal

REM Portas do AAGC: Web=3002, API=3003 (+ 3000/3001 se tiver processo antigo)
set PORTS=3002 3003 3000 3001 1420

for %%P in (%PORTS%) do (
  for /f "tokens=5" %%A in ('netstat -aon ^| findstr /R /C:":%%P " ^| findstr LISTENING') do (
    echo [kill-ports] Port %%P -> PID %%A
    taskkill /PID %%A /F >nul 2>&1
  )
)

echo [kill-ports] Done.
endlocal

