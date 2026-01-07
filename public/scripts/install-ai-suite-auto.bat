@echo off
setlocal enableextensions

title MediaVault AI - Installation Automatique v4.0
color 0B
chcp 65001 >nul 2>&1

echo.
echo ══════════════════════════════════════════════════════════════════════════════
echo              MEDIAVAULT AI - INSTALLATION AUTOMATIQUE v4.0
echo ══════════════════════════════════════════════════════════════════════════════
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  1) VERIFICATION ADMIN
REM ─────────────────────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Demande des droits administrateur...
    echo        Cliquez OUI dans la fenetre qui va s'ouvrir.
    echo.
    powershell -NoProfile -Command "Start-Process cmd -Verb RunAs -ArgumentList '/k cd /d \"%~dp0\" && \"%~f0\"'"
    exit /b
)

echo [OK] Droits administrateur obtenus.
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  2) CONFIGURATION
REM ─────────────────────────────────────────────────────────────────────────────
set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
set "PS1_SCRIPT=%~dp0install-ai-suite-complete.ps1"

REM Creer les dossiers si necessaires
if not exist "%AI_DIR%" mkdir "%AI_DIR%" 2>nul
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul

REM Timestamp pour les logs
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set "dt=%%a"
set "TS=%dt:~0,8%-%dt:~8,6%"

set "MAIN_LOG=%LOG_DIR%\install-auto-%TS%.log"

echo [INFO] Dossier d'installation : %AI_DIR%
echo [INFO] Logs                   : %LOG_DIR%
echo [INFO] Log principal          : %MAIN_LOG%
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  3) VERIFICATION DU SCRIPT PS1
REM ─────────────────────────────────────────────────────────────────────────────
if not exist "%PS1_SCRIPT%" (
    echo [ERREUR] Script PowerShell introuvable:
    echo          %PS1_SCRIPT%
    echo.
    echo Assurez-vous que install-ai-suite-complete.ps1 est dans le meme dossier.
    echo.
    pause
    exit /b 1
)

echo [OK] Script PowerShell trouve.
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  4) LANCEMENT INSTALLATION
REM ─────────────────────────────────────────────────────────────────────────────
echo ══════════════════════════════════════════════════════════════════════════════
echo                    DEMARRAGE DE L'INSTALLATION
echo ══════════════════════════════════════════════════════════════════════════════
echo.
echo L'installation peut prendre 15-30 minutes selon votre connexion.
echo NE FERMEZ PAS cette fenetre!
echo.

REM Executer le script PowerShell avec logging complet
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { try { & '%PS1_SCRIPT%' -InstallDir '%AI_DIR%' 2>&1 | Tee-Object -FilePath '%MAIN_LOG%'; exit $LASTEXITCODE } catch { $_.Exception.Message | Out-File '%MAIN_LOG%' -Append; Write-Host '[ERREUR] ' + $_.Exception.Message -ForegroundColor Red; exit 1 } }"

set "EXIT_CODE=%errorlevel%"

echo.
echo ══════════════════════════════════════════════════════════════════════════════

if %EXIT_CODE% neq 0 (
    echo                         INSTALLATION ECHOUEE
    echo ══════════════════════════════════════════════════════════════════════════════
    echo.
    echo Code erreur: %EXIT_CODE%
    echo Log complet: %MAIN_LOG%
    echo.
    echo --- Dernieres lignes du log ---
    powershell -NoProfile -Command "if (Test-Path '%MAIN_LOG%') { Get-Content '%MAIN_LOG%' -Tail 25 }"
    echo.
    echo ══════════════════════════════════════════════════════════════════════════════
    echo.
    echo Ouvrir le dossier de logs? [O/N]
    set /p OPEN_LOGS=
    if /I "%OPEN_LOGS%"=="O" start "" "%LOG_DIR%"
) else (
    echo                       INSTALLATION REUSSIE!
    echo ══════════════════════════════════════════════════════════════════════════════
    echo.
    echo Prochaine etape:
    echo   1. Lancez: %AI_DIR%\start-ai-services.bat
    echo   2. Allez dans MediaVault ^> IA Locale ^> Diagnostic
    echo.
    echo Log complet: %MAIN_LOG%
    echo.
)

echo.
echo Appuyez sur une touche pour fermer...
pause >nul
endlocal
exit /b %EXIT_CODE%
