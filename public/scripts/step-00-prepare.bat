@echo off
setlocal enableextensions

title MediaVault AI - Etape 00 - Preparation
color 0B
chcp 65001 >nul 2>&1

REM Fenetre persistante + log unique
set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
if not exist "%AI_DIR%" mkdir "%AI_DIR%" 2>nul
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%a"
set "LOG=%LOG_DIR%\step-00-prepare-%TS%.log"

(
  echo [INFO] %date% %time%
  echo [INFO] AI_DIR=%AI_DIR%
  echo [INFO] LOG=%LOG%
) > "%LOG%"

echo.
echo === ETAPE 00 - PREPARATION ===
echo.
echo Ce script ne fait aucune installation.
echo Il cree juste le dossier et t'indique ou sont les logs.
echo.
echo Logs: %LOG_DIR%
echo.

echo [OK] Pret. >> "%LOG%"

echo.
pause
endlocal
