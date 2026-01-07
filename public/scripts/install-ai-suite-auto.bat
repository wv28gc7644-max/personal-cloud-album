@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title MediaVault AI - Installation + Diagnostic
color 0B

REM ============================================================================
REM  MediaVault AI Suite - 1 clic
REM  - Lance l'installation PowerShell (install-ai-suite-complete.ps1)
REM  - Démarre les services
REM  - Génère un rapport texte prêt à copier/coller
REM ============================================================================

REM --- Auto-élévation admin ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] Demande des droits administrateur...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
  exit /b
)

set "SCRIPT_DIR=%~dp0"
set "AI_DIR=%USERPROFILE%\MediaVault-AI"
if not exist "%AI_DIR%" mkdir "%AI_DIR%" >nul 2>&1

set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

REM Timestamp YYYYMMDD-HHMMSS (robuste)
for /f "usebackq tokens=1 delims=." %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"`) do set "TS=%%i"

set "INSTALL_LOG=%LOG_DIR%\install-%TS%.log"
set "START_LOG=%LOG_DIR%\startup-%TS%.log"
set "VERIFY_LOG=%LOG_DIR%\verification-%TS%.log"
set "REPORT_FILE=%LOG_DIR%\report-%TS%.txt"

echo ============================================================================== 
echo   MediaVault AI Suite - Installation + Diagnostic
echo ============================================================================== 
echo Dossier IA : %AI_DIR%
echo Logs       : %LOG_DIR%
echo.

REM --- 1) Installation via PowerShell (log via Tee-Object) ---
echo [1/3] Installation des services (PowerShell)...
if not exist "%SCRIPT_DIR%install-ai-suite-complete.ps1" (
  echo [ERREUR] Script introuvable: %SCRIPT_DIR%install-ai-suite-complete.ps1
  echo Copiez ce .bat dans le dossier \public\scripts\ ou téléchargez-le depuis l'application.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%install-ai-suite-complete.ps1' -InstallDir '%AI_DIR%' *>&1 | Tee-Object -FilePath '%INSTALL_LOG%'" 
set "PS_EXIT=%ERRORLEVEL%"

REM --- 2) Démarrage + logs ---
echo.
echo [2/3] Démarrage des services...
if exist "%SCRIPT_DIR%start-ai-services.bat" (
  call "%SCRIPT_DIR%start-ai-services.bat" > "%START_LOG%" 2>&1
) else (
  echo [ERREUR] start-ai-services.bat introuvable: %SCRIPT_DIR%start-ai-services.bat
)

REM --- 3) Vérification + rapport final ---
echo.
echo [3/3] Génération du rapport...

echo ═══════════════════════════════════════════════════════> "%REPORT_FILE%"
echo RAPPORT INSTALLATION + DIAGNOSTIC MEDIAVAULT IA>> "%REPORT_FILE%"
echo Date: %date% %time%>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"
echo INSTALL DIR: %AI_DIR%>> "%REPORT_FILE%"
echo INSTALL LOG: %INSTALL_LOG%>> "%REPORT_FILE%"
echo START LOG  : %START_LOG%>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"
echo EXIT CODE POWERSHELL: %PS_EXIT%>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"

REM Prérequis rapides
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo PREREQUIS>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
where winget >nul 2>&1 && (echo winget: OK>> "%REPORT_FILE%") || (echo winget: MANQUANT>> "%REPORT_FILE%")
where git >nul 2>&1 && (echo git: OK>> "%REPORT_FILE%") || (echo git: MANQUANT>> "%REPORT_FILE%")
where python >nul 2>&1 && (python --version >> "%REPORT_FILE%" 2>&1) || (echo python: MANQUANT>> "%REPORT_FILE%")
where pip >nul 2>&1 && (pip --version >> "%REPORT_FILE%" 2>&1) || (echo pip: MANQUANT>> "%REPORT_FILE%")
where ollama >nul 2>&1 && (ollama --version >> "%REPORT_FILE%" 2>&1) || (echo ollama: MANQUANT>> "%REPORT_FILE%")
echo.>> "%REPORT_FILE%"

REM Détection GPU simple (utile si Intel Arc)
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo GPU (WMI)>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | Format-Table -AutoSize" >> "%REPORT_FILE%" 2>&1
echo.>> "%REPORT_FILE%"

REM Vérification HTTP (sans dépendre d'un CORS côté navigateur)
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo ETAT DES SERVICES (HTTP)>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"

call :CheckUrl "Ollama"  "http://localhost:11434/api/tags" >> "%REPORT_FILE%"
call :CheckUrl "ComfyUI" "http://localhost:8188/system_stats" >> "%REPORT_FILE%"
call :CheckUrl "Whisper" "http://localhost:9000/health" >> "%REPORT_FILE%"
call :CheckUrl "XTTS"    "http://localhost:8020/health" >> "%REPORT_FILE%"
call :CheckUrl "MusicGen" "http://localhost:8030/health" >> "%REPORT_FILE%"
call :CheckUrl "Demucs"  "http://localhost:8040/health" >> "%REPORT_FILE%"
call :CheckUrl "CLIP"    "http://localhost:8060/health" >> "%REPORT_FILE%"
call :CheckUrl "ESRGAN"  "http://localhost:8070/health" >> "%REPORT_FILE%"

echo.>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo NOTES>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo - Si un service est OK en HTTP ici, mais hors-ligne dans l'app, c'est un souci CORS navigateur.>> "%REPORT_FILE%"
echo - Si c'est X ici, c'est qu'il n'est pas démarré / pas installé / bloqué firewall.>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"

echo Rapport créé: %REPORT_FILE%
echo.

choice /C ON /N /M "Ouvrir le rapport dans Notepad ? (O/N)"
if errorlevel 2 goto copyPrompt
start notepad "%REPORT_FILE%"

:copyPrompt
choice /C ON /N /M "Copier le rapport dans le presse-papiers ? (O/N)"
if errorlevel 2 goto end
powershell -NoProfile -Command "Get-Content -Raw '%REPORT_FILE%' | Set-Clipboard" >nul 2>&1
echo OK - Rapport copié.

:end
echo.
echo Terminé.
pause
exit /b 0

:CheckUrl
set "NAME=%~1"
set "URL=%~2"
set "CODE="
for /f "usebackq delims=" %%c in (`powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri '%URL%').StatusCode } catch { 0 }"`) do set "CODE=%%c"
if "%CODE%"=="200" (
  echo ✓ OK   ^| %NAME% ^| %URL%
) else (
  echo ✗ X    ^| %NAME% ^| %URL% ^| HTTP=%CODE%
)
exit /b 0
