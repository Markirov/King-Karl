@echo off
setlocal EnableExtensions EnableDelayedExpansion
title King Karl -- Deploy
set "ROOT=%~dp0.."
cd /d "%ROOT%"

rem ──────────────────────────────────────────────────────────
rem  Deploy via GitHub Actions workflow (push a main → Actions
rem  construye y publica a Pages automáticamente).
rem  No usa `npm run deploy` (gh-pages package) ya que la
rem  fuente de Pages = GitHub Actions workflow.
rem ──────────────────────────────────────────────────────────

rem 1) Verificar branch = main
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%b
if /i not "!CURRENT_BRANCH!"=="main" (
  echo [ERROR] Estas en branch '!CURRENT_BRANCH!', no en 'main'.
  echo Cambia a main antes de deploy:  git checkout main
  exit /b 1
)

rem 2) Verificar working tree limpio o solo cambios staged/unstaged
git diff --quiet --exit-code 2>nul
set "UNSTAGED=%ERRORLEVEL%"
git diff --cached --quiet --exit-code 2>nul
set "STAGED=%ERRORLEVEL%"

rem 3) Pedir mensaje commit
for /f "delims=" %%i in ('powershell -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('Describe la actualizacion:', 'King Karl Deploy', '')"') do set COMMIT_MSG=%%i
if "!COMMIT_MSG!"=="" (
  echo Cancelado.
  exit /b 1
)

rem 4) Bump version
echo.
echo [1/3] Incrementando version...
for /f "delims=" %%v in ('node bump-version.cjs') do set NEW_VERSION=%%v
if "!NEW_VERSION!"=="" (
  echo [ERROR] No se pudo incrementar version.
  exit /b 1
)
set "FULL_COMMIT=!COMMIT_MSG! (v!NEW_VERSION!)"
echo Nueva version: v!NEW_VERSION!

rem 5) Commit + push a main
echo.
echo [2/3] Git commit + push origin main...
git add -A
git commit -m "!FULL_COMMIT!"
if errorlevel 1 (
  echo [WARN] git commit fallo o no habia cambios.
)
git push origin main
if errorlevel 1 (
  echo [ERROR] Fallo git push origin main.
  exit /b 1
)

rem 6) Avisar de que Actions hace el resto
echo.
echo [3/3] Push completado.
echo.
echo  GitHub Actions workflow esta construyendo y publicando.
echo  Status: https://github.com/Markirov/King-Karl/actions
echo  Pages:  https://markirov.github.io/King-Karl/
echo  Tiempo estimado: ~2 minutos.
echo.

rem 7) Opcional local
set /p LAUNCH="Lanzar servidor local? (S/N): "
if /i "!LAUNCH!"=="S" (
  call "%~dp0local.bat"
)

echo [OK] Deploy v!NEW_VERSION! disparado.
exit /b 0
