@echo off
setlocal EnableExtensions EnableDelayedExpansion
title King Karl -- Import Units
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================
echo  Importar Units (.ssw / .saw)
echo ==========================================
echo.
echo Modo:
echo   1) Both (ssw + saw)
echo   2) Solo SSW (Mechs)
echo   3) Solo SAW (Vehiculos)
echo.
set /p MODE_OPT="Selecciona (1/2/3): "
if "%MODE_OPT%"=="1" set MODE=both
if "%MODE_OPT%"=="2" set MODE=ssw
if "%MODE_OPT%"=="3" set MODE=saw
if "%MODE%"=="" (
  echo Cancelado.
  exit /b 1
)

echo.
set /p SRC="Ruta fuente [Enter = default 'E:\Drive\CBT\SSW_0.7.4\SSW-Master']: "
if "%SRC%"=="" set "SRC=E:\Drive\CBT\SSW_0.7.4\SSW-Master"

echo.
set /p OW="Sobreescribir duplicados? (S/N) [N]: "
if /i "%OW%"=="S" (
  node scripts/import-units.cjs %MODE% "%SRC%" --overwrite
) else (
  node scripts/import-units.cjs %MODE% "%SRC%"
)

set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo [ERROR] Import fallido. Codigo: %RC%
  exit /b %RC%
)

echo.
set /p IDX="Regenerar indices ahora? (S/N) [S]: "
if /i not "%IDX%"=="N" (
  call "%~dp0index.bat"
)

exit /b 0
