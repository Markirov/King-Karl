@echo off
setlocal EnableExtensions EnableDelayedExpansion
title King Karl -- Deploy

set "ROOT=%~dp0.."
cd /d "%ROOT%"

for /f "delims=" %%i in ('powershell -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox(''Describe la actualizacion:'', ''King Karl Deploy'', '''')"') do set COMMIT_MSG=%%i
if "%COMMIT_MSG%"=="" (
  echo Cancelado.
  exit /b 1
)

echo.
echo [0/3] Incrementando version...
for /f "delims=" %%v in ('node bump-version.cjs') do set NEW_VERSION=%%v
if "!NEW_VERSION!"=="" (
  echo [ERROR] No se pudo incrementar version.
  exit /b 1
)

set "FULL_COMMIT=!COMMIT_MSG! (v!NEW_VERSION!)"

echo [1/3] Git push...
git add -A
git commit -m "!FULL_COMMIT!"
git push -u origin HEAD
if errorlevel 1 (
  echo [ERROR] Fallo git push.
  exit /b 1
)

echo [2/3] GitHub Pages deploy...
call npm run deploy
if errorlevel 1 (
  echo [ERROR] Fallo deploy.
  exit /b 1
)

echo [3/3] Opcional servidor local
set /p LAUNCH="Lanzar servidor local? (S/N): "
if /i "!LAUNCH!"=="S" (
  call "%~dp0local.bat"
)

echo [OK] Deploy finalizado v!NEW_VERSION!
exit /b 0
