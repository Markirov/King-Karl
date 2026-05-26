@echo off
setlocal EnableExtensions EnableDelayedExpansion
title King Karl -- Launcher
set "ROOT=%~dp0"
cd /d "%ROOT%"

:menu
cls
echo ==========================================
echo  KING KARL - TASK LAUNCHER
echo ==========================================
echo.
echo Elige una secuencia (varias opciones y orden libre)
echo Ejemplo: 2 4 5
echo.
echo   1^) Local dev server
echo   2^) Rebuild indexes
echo   3^) Deploy ^(con commit/push^)
echo   4^) Build
echo   5^) Deploy sin commit ^(siempre build^)
echo   0^) Salir
echo.
set /p RUNSEQ="Secuencia: "
if "%RUNSEQ%"=="" goto menu
if "%RUNSEQ%"=="0" exit /b 0

echo.
echo Ejecutando: %RUNSEQ%
echo.
for %%A in (%RUNSEQ%) do (
  call :runOption %%A
  if errorlevel 1 (
    echo.
    echo [ERROR] Secuencia detenida en opcion %%A.
    echo.
    pause
    goto menu
  )
)

echo.
echo [OK] Secuencia completada.
echo.
pause
goto menu

:runOption
set "OPT=%~1"
if "%OPT%"=="1" (
  echo --- [1] Local ---
  call "%ROOT%scripts\local.bat"
  exit /b %ERRORLEVEL%
)
if "%OPT%"=="2" (
  echo --- [2] Index ---
  call "%ROOT%scripts\index.bat"
  exit /b %ERRORLEVEL%
)
if "%OPT%"=="3" (
  echo --- [3] Deploy con commit ---
  call "%ROOT%scripts\deploy.bat"
  exit /b %ERRORLEVEL%
)
if "%OPT%"=="4" (
  echo --- [4] Build ---
  call "%ROOT%scripts\build.bat"
  exit /b %ERRORLEVEL%
)
if "%OPT%"=="5" (
  echo --- [5] Deploy sin commit ---
  call "%ROOT%scripts\deploy-no-commit.bat"
  exit /b %ERRORLEVEL%
)

echo [ERROR] Opcion no valida: %OPT%
exit /b 1
