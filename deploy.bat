@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Warthogs Fleet -- Deploy

:: Ir al proyecto
cd /d "E:\Drive\CBT\MechWarrior RPG"

:: Pedir mensaje de commit (sin default, porque la version se añade automaticamente)
for /f "delims=" %%i in ('powershell -NoProfile -Command ^
  "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('Describe la actualizacion:', 'Warthogs Fleet Deploy', '')"') do set COMMIT_MSG=%%i

if "%COMMIT_MSG%"=="" (
    echo Cancelado.
    pause
    exit /b
)

:: [0/3] Bumpear version en src/version.ts
echo.
echo [0/3] Incrementando version...
for /f "delims=" %%v in ('node bump-version.cjs') do set NEW_VERSION=%%v

if "!NEW_VERSION!"=="" (
    echo [ERROR] No se pudo leer/incrementar la version.
    echo         Comprueba que existe src\version.ts y que bump-version.cjs esta en la raiz del proyecto.
    pause
    exit /b
)

set "FULL_COMMIT=!COMMIT_MSG! (v!NEW_VERSION!)"

echo [OK] Nueva version: v!NEW_VERSION!
echo.
echo ------------------------------------------
echo  Commit: !FULL_COMMIT!
echo ------------------------------------------
echo.

:: [1/3] Git push (incluye el bump de version.ts)
echo [1/3] Subiendo a GitHub...
git add -A
git commit -m "!FULL_COMMIT!"
git push

if errorlevel 1 (
    echo [ERROR] El push ha fallado.
    pause
    exit /b
)
echo [OK] Push completado.
echo.

:: [2/3] GitHub Pages deploy
echo [2/3] Desplegando en GitHub Pages...
call npm run deploy

if errorlevel 1 (
    echo [ERROR] El deploy ha fallado.
    pause
    exit /b
)
echo [OK] Deploy completado.
echo.

:: [3/3] Servidor local — preguntar al usuario
echo [3/3] Servidor local
set /p LAUNCH="¿Quieres lanzar el servidor local de desarrollo? (S/N): "

if /i "!LAUNCH!"=="S" (
    :: Matar proceso en puerto 5173 si existe
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
        echo Cerrando servidor anterior en puerto 5173 PID %%a...
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 >nul
    start "Dev Server" cmd /k "cd /d E:\Drive\CBT\MechWarrior^ RPG && npx vite"
    echo [OK] Servidor lanzado en nueva ventana.
) else (
    echo Servidor local no lanzado.
)

echo.
echo ------------------------------------------
echo  Todo listo. Version desplegada: v!NEW_VERSION!
echo ------------------------------------------
timeout /t 4 >nul
endlocal
