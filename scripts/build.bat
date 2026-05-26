@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================
echo  Build (Vite)
echo ==========================================
call npm run build
if errorlevel 1 (
  echo [ERROR] Build fallido.
  exit /b 1
)
echo [OK] Build completado.
exit /b 0
