@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================
echo  Rebuild Mech/Vehicle Indexes (Enriched)
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta disponible en PATH.
  pause
  exit /b 1
)

if not exist "scripts\build-mech-data.cjs" (
  echo [ERROR] No se encontro scripts\build-mech-data.cjs
  pause
  exit /b 1
)

node "scripts\build-mech-data.cjs"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo [ERROR] Fallo al reconstruir indices. Codigo: %RC%
  pause
  exit /b %RC%
)

echo [OK] Indices enriquecidos regenerados.
exit /b 0
