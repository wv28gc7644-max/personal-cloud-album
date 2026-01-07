@echo off
setlocal enableextensions

title MediaVault AI - Desinstallation (One-Click)
color 0C
chcp 65001 >nul 2>&1

echo.
echo ══════════════════════════════════════════════════════════════════════════════
echo                 MEDIAVAULT AI - DESINSTALLATION (1-CLIC)
echo ══════════════════════════════════════════════════════════════════════════════
echo.

REM Admin
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Demande des droits administrateur...
  powershell -NoProfile -Command "Start-Process cmd -Verb RunAs -ArgumentList '/k cd /d \"%~dp0\" ^&^& \"%~f0\"'"
  exit /b
)

set "PS1=%~dp0uninstall-ai-suite.ps1"
if not exist "%PS1%" (
  echo [ERREUR] Fichier introuvable: %PS1%
  pause
  exit /b 1
)

echo Conserver les modeles Ollama? (O/N)
set /p KEEP=

set "ARGS="
if /I "%KEEP%"=="O" set "ARGS=-KeepModels"

echo.
echo Lancement de la desinstallation...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%PS1%' %ARGS% *>&1; exit $LASTEXITCODE"
set "RC=%errorlevel%"

echo.
if not "%RC%"=="0" (
  echo [ATTENTION] Desinstallation terminee avec code=%RC%.
  echo Regardez le log affiche par le script.
  pause
  exit /b %RC%
)

echo [OK] Desinstallation terminee.
pause
endlocal
