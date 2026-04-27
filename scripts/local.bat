@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================
echo  Local Dev Server
echo ==========================================

echo Cerrando proceso previo en puerto 5173 (si existe)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
  taskkill /PID %%a /F >nul 2>&1
)

timeout /t 1 >nul
start "Dev Server" cmd /k "cd /d %ROOT% && npm run dev"
echo [OK] Servidor lanzado en nueva ventana.
exit /b 0
