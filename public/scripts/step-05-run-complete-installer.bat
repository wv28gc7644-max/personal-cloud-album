@echo off
setlocal enableextensions

title MediaVault AI - Etape 05 - Lancer install-ai-suite-complete.ps1
color 0B
chcp 65001 >nul 2>&1

set "THIS_SCRIPT=%~f0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] Demande admin...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -Verb RunAs -ArgumentList '/k','call ""%THIS_SCRIPT%""'"
  exit /b
)


set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
set "PS1=%~dp0install-ai-suite-complete.ps1"

if not exist "%AI_DIR%" mkdir "%AI_DIR%" 2>nul
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul

for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%a"
set "LOG=%LOG_DIR%\step-05-complete-%TS%.log"

if not exist "%PS1%" (
  echo [ERREUR] install-ai-suite-complete.ps1 introuvable: %PS1%
  echo [ERREUR] install-ai-suite-complete.ps1 introuvable.> "%LOG%"
  pause
  exit /b 1
)

echo.
echo === ETAPE 05 - INSTALLATION COMPLETE (PowerShell) ===
echo.
echo Le log complet sera dans:
echo   %LOG%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "& { & '%PS1%' -InstallDir '%AI_DIR%' 2>&1 | Tee-Object -FilePath '%LOG%'; exit $LASTEXITCODE }"
set "RC=%errorlevel%"

echo.
if not "%RC%"=="0" (
  echo [ERREUR] Etape 05 echouee (code=%RC%).
  echo Ouvre le log: %LOG%
  pause
  exit /b %RC%
)

echo [OK] Etape 05 terminee.
echo Log: %LOG%
pause
endlocal
