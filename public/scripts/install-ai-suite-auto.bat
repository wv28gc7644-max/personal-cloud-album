@echo off
setlocal enableextensions

title MediaVault AI - Installation (One-Click)
color 0B
chcp 65001 >nul 2>&1

echo.
echo ══════════════════════════════════════════════════════════════════════════════
echo                 MEDIAVAULT AI - INSTALLATION (MODE ROBUSTE)
	echo ══════════════════════════════════════════════════════════════════════════════
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  1) DROITS ADMIN
REM ─────────────────────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [0%%] Demande des droits administrateur...
  echo Une nouvelle fenetre va s'ouvrir. Cliquez OUI.
  echo.
  powershell -NoProfile -Command "Start-Process cmd -Verb RunAs -ArgumentList '/k cd /d \"%~dp0\" ^&^& \"%~f0\"'"
  exit /b
)

echo [5%%] Admin OK.

REM ─────────────────────────────────────────────────────────────────────────────
REM  2) CHEMINS + LOGS
REM ─────────────────────────────────────────────────────────────────────────────
set "DEFAULT_AI_DIR=%USERPROFILE%\MediaVault-AI"
set "ALT_AI_DIR=C:\MediaVault-AI"

REM Si l'utilisateur a deja une install ailleurs, on la privilegie
set "AI_DIR=%DEFAULT_AI_DIR%"
if exist "%ALT_AI_DIR%" set "AI_DIR=%ALT_AI_DIR%"
if exist "%DEFAULT_AI_DIR%" set "AI_DIR=%DEFAULT_AI_DIR%"

set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
  set "D1=%%a" & set "D2=%%b" & set "D3=%%c"
)
set "TS=%D3%%D2%%D1%-%time:~0,2%%time:~3,2%%time:~6,2%"
set "TS=%TS: =0%"

set "BOOT_LOG=%LOG_DIR%\bootstrap-install-%TS%.log"
set "PS1=%~dp0install-ai-suite-complete.ps1"

echo [10%%] Dossier IA : %AI_DIR%
echo [10%%] Logs       : %LOG_DIR%
echo [10%%] Log (bootstrap) : %BOOT_LOG%
echo.

if not exist "%PS1%" (
  echo [ERREUR] Fichier introuvable: %PS1%
  echo Copiez/retéléchargez le script au même endroit que ce .bat.
  echo.
  pause
  exit /b 1
)

REM ─────────────────────────────────────────────────────────────────────────────
REM  3) LANCEMENT INSTALLATEUR POWERSHELL (LOG + RETOUR ERREUR)
REM ─────────────────────────────────────────────────────────────────────────────
echo [15%%] Lancement de l'installateur principal...
echo.
echo (Astuce: si ça "plante", le log est deja enregistre dans %BOOT_LOG%)
echo.

REM On affiche dans la console ET on écrit dans le log (Tee-Object)
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%PS1%' -InstallDir '%AI_DIR%' *>&1 | Tee-Object -FilePath '%BOOT_LOG%'; exit $LASTEXITCODE"
set "RC=%errorlevel%"

echo.
if not "%RC%"=="0" (
  echo [ERREUR] Installation terminee avec erreur (code=%RC%).
  echo Log bootstrap: %BOOT_LOG%
  echo.
  echo Dernieres lignes du log:
  echo ------------------------------------------------------------------------------
  powershell -NoProfile -Command "Get-Content -Path '%BOOT_LOG%' -Tail 40"
  echo ------------------------------------------------------------------------------
  echo.
  echo Ouvrir le dossier de logs? (O/N)
  set /p OPENLOGS=
  if /I "%OPENLOGS%"=="O" start "" "%LOG_DIR%"
  echo.
  pause
  exit /b %RC%
)

echo [100%%] Installation terminee.
echo Logs: %LOG_DIR%
echo.
echo Prochaine etape: lancer "start-ai-services.bat" puis aller dans IA Locale ^> Diagnostic.
echo.
pause
endlocal

