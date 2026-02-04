@echo off
setlocal

set PORTS=3000 3001 1420

for %%P in (%PORTS%) do (
  for /f "tokens=5" %%A in ('netstat -aon ^| findstr /R /C:":%%P " ^| findstr LISTENING') do (
    echo [kill-ports] Port %%P -> PID %%A
    taskkill /PID %%A /F >nul 2>&1
  )
)

echo [kill-ports] Done.
endlocal

