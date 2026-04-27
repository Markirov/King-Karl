@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================
echo  Rebuild Mech/Vehicle Indexes
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta disponible en PATH.
  pause
  exit /b 1
)

if not exist "scripts\rebuild-indexes.cjs" (
  echo [ERROR] No se encontro scripts\rebuild-indexes.cjs
  pause
  exit /b 1
)

node "scripts\rebuild-indexes.cjs"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo [ERROR] Fallo al reconstruir indices. Codigo: %RC%
  pause
  exit /b %RC%
)

echo [OK] Indices regenerados correctamente.
exit /b 0
