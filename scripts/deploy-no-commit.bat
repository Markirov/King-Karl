@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================
echo  Deploy SIN commit (gh-pages branch directo)
echo ==========================================
echo.
echo  WARNING: Pages source = GitHub Actions (main branch).
echo  Este metodo publica a rama gh-pages que ya no se usa.
echo  Util solo para hotfix preview rapido sin pasar por Actions.
echo.
set /p CONFIRM="Continuar? (S/N): "
if /i not "%CONFIRM%"=="S" (
  echo Cancelado.
  exit /b 0
)

echo.
echo [1/2] Build...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build fallido. Deploy cancelado.
  exit /b 1
)

echo [2/2] Publicando en gh-pages branch...
call npx gh-pages -d dist --add
if errorlevel 1 (
  echo [ERROR] Fallo al publicar en gh-pages.
  exit /b 1
)

echo [OK] Deploy gh-pages branch completado.
echo Nota: para que se vea en Pages, source del repo debe ser gh-pages branch.
exit /b 0
