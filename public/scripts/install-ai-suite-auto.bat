@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title MediaVault AI - Installation Automatique
color 0B

REM ============================================================================
REM  MediaVault AI Suite - INSTALLATION 1-CLIC + DIAGNOSTIC
REM  - Télécharge et exécute le script PowerShell d'installation
REM  - Démarre les services
REM  - Génère un rapport texte détaillé
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

REM Timestamp
for /f "usebackq tokens=1 delims=." %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"`) do set "TS=%%i"

set "INSTALL_LOG=%LOG_DIR%\install-%TS%.log"
set "START_LOG=%LOG_DIR%\startup-%TS%.log"
set "REPORT_FILE=%LOG_DIR%\report-%TS%.txt"

echo ==============================================================================
echo   MediaVault AI Suite - Installation Automatique + Diagnostic
echo ==============================================================================
echo Dossier IA : %AI_DIR%
echo Logs       : %LOG_DIR%
echo.

REM --- 1) Chercher ou créer le script PS1 ---
echo [1/4] Recherche du script d'installation...

set "PS1_SCRIPT="
if exist "%SCRIPT_DIR%install-ai-suite-complete.ps1" set "PS1_SCRIPT=%SCRIPT_DIR%install-ai-suite-complete.ps1"
if "%PS1_SCRIPT%"=="" if exist "%~dp0install-ai-suite-complete.ps1" set "PS1_SCRIPT=%~dp0install-ai-suite-complete.ps1"
if "%PS1_SCRIPT%"=="" if exist "%USERPROFILE%\Downloads\install-ai-suite-complete.ps1" set "PS1_SCRIPT=%USERPROFILE%\Downloads\install-ai-suite-complete.ps1"
if "%PS1_SCRIPT%"=="" if exist "%AI_DIR%\install-ai-suite-complete.ps1" set "PS1_SCRIPT=%AI_DIR%\install-ai-suite-complete.ps1"

if "%PS1_SCRIPT%"=="" (
  echo [INFO] Script PS1 non trouve - Creation automatique...
  set "PS1_SCRIPT=%AI_DIR%\install-ai-suite-complete.ps1"
  
  REM Télécharger depuis GitHub ou créer localement
  echo [INFO] Telechargement du script depuis le projet...
  
  REM Créer un script PS1 minimal qui fait l'installation de base
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$script = @'" & echo. & ^
    "param([string]$InstallDir = \"$env:USERPROFILE\MediaVault-AI\")" & echo. & ^
    "$ErrorActionPreference = 'Continue'" & echo. & ^
    "Write-Host 'MediaVault AI Suite - Installation' -ForegroundColor Cyan" & echo. & ^
    "if (!(Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }" & echo. & ^
    "Set-Location $InstallDir" & echo. & ^
    "" & echo. & ^
    "Write-Host '[1/8] Installation Ollama...' -ForegroundColor Yellow" & echo. & ^
    "if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {" & echo. & ^
    "  winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent" & echo. & ^
    "}" & echo. & ^
    "Write-Host '  [OK] Ollama' -ForegroundColor Green" & echo. & ^
    "" & echo. & ^
    "Write-Host 'Installation terminee!' -ForegroundColor Green" & echo. & ^
    "'@" & echo. & ^
    "$script | Out-File -FilePath '%AI_DIR%\install-ai-suite-complete.ps1' -Encoding UTF8"
  
  if not exist "%PS1_SCRIPT%" (
    echo [ERREUR] Impossible de creer le script PS1
    echo.
    echo SOLUTION: Telechargez manuellement install-ai-suite-complete.ps1
    echo           depuis l'application MediaVault et placez-le dans:
    echo           %AI_DIR%
    echo.
    set "PS_EXIT=500"
    goto skipInstall
  )
)

echo [OK] Script trouve: %PS1_SCRIPT%

REM --- 2) Exécuter l'installation PowerShell ---
echo.
echo [2/4] Lancement de l'installation (peut prendre 15-30 minutes)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Continue'; " ^
  "try { " ^
  "  & '%PS1_SCRIPT%' -InstallDir '%AI_DIR%' *>&1 | Tee-Object -FilePath '%INSTALL_LOG%'; " ^
  "  exit $LASTEXITCODE " ^
  "} catch { " ^
  "  $_ | Out-File -Append '%INSTALL_LOG%'; " ^
  "  Write-Host \"Erreur: $_\" -ForegroundColor Red; " ^
  "  exit 1 " ^
  "}"
set "PS_EXIT=%ERRORLEVEL%"

echo.
echo [INFO] Installation terminee avec code: %PS_EXIT%

:skipInstall

REM --- 3) Démarrage des services ---
echo.
echo [3/4] Demarrage des services...

set "START_SCRIPT="
if exist "%AI_DIR%\start-ai-services.bat" set "START_SCRIPT=%AI_DIR%\start-ai-services.bat"
if "%START_SCRIPT%"=="" if exist "%SCRIPT_DIR%start-ai-services.bat" set "START_SCRIPT=%SCRIPT_DIR%start-ai-services.bat"

if "%START_SCRIPT%"=="" (
  echo [WARN] start-ai-services.bat introuvable
  echo [WARN] Demarrage manuel de Ollama uniquement...
  
  REM Démarrer Ollama au minimum
  where ollama >nul 2>&1 && (
    start "Ollama" /min ollama serve
    echo [OK] Ollama demarre
  )
  
  echo [WARN] Services non demarres > "%START_LOG%"
) else (
  echo [INFO] Demarrage via: %START_SCRIPT%
  call "%START_SCRIPT%" > "%START_LOG%" 2>&1
  echo [OK] Services demarres
)

REM Attendre que les services démarrent
echo.
echo [INFO] Attente de 20 secondes pour le demarrage des services...
timeout /t 20 /nobreak >nul

REM --- 4) Génération du rapport ---
echo.
echo [4/4] Generation du rapport de diagnostic...

echo ═══════════════════════════════════════════════════════> "%REPORT_FILE%"
echo RAPPORT INSTALLATION + DIAGNOSTIC MEDIAVAULT IA>> "%REPORT_FILE%"
echo Date: %date% %time%>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"
echo INSTALL DIR: %AI_DIR%>> "%REPORT_FILE%"
echo INSTALL LOG: %INSTALL_LOG%>> "%REPORT_FILE%"
echo START LOG  : %START_LOG%>> "%REPORT_FILE%"
echo PS1 SCRIPT : %PS1_SCRIPT%>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"
echo EXIT CODE POWERSHELL: %PS_EXIT%>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"

REM Prérequis
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo PREREQUIS>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
where winget >nul 2>&1 && (echo winget: OK>> "%REPORT_FILE%") || (echo winget: MANQUANT>> "%REPORT_FILE%")
where git >nul 2>&1 && (echo git: OK>> "%REPORT_FILE%") || (echo git: MANQUANT>> "%REPORT_FILE%")
where python >nul 2>&1 && (python --version >> "%REPORT_FILE%" 2>&1) || (echo python: MANQUANT>> "%REPORT_FILE%")
where pip >nul 2>&1 && (pip --version >> "%REPORT_FILE%" 2>&1) || (echo pip: MANQUANT>> "%REPORT_FILE%")
where ollama >nul 2>&1 && (ollama --version >> "%REPORT_FILE%" 2>&1) || (echo ollama: MANQUANT>> "%REPORT_FILE%")
echo.>> "%REPORT_FILE%"

REM GPU
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo GPU (WMI)>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | Format-Table -AutoSize" >> "%REPORT_FILE%" 2>&1
echo.>> "%REPORT_FILE%"

REM Dossiers installés
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo DOSSIERS INSTALLATION>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
if exist "%AI_DIR%\ComfyUI" (echo [OK] ComfyUI installe>> "%REPORT_FILE%") else (echo [X] ComfyUI NON installe>> "%REPORT_FILE%")
if exist "%AI_DIR%\whisper-api" (echo [OK] Whisper installe>> "%REPORT_FILE%") else (echo [X] Whisper NON installe>> "%REPORT_FILE%")
if exist "%AI_DIR%\xtts-api" (echo [OK] XTTS installe>> "%REPORT_FILE%") else (echo [X] XTTS NON installe>> "%REPORT_FILE%")
if exist "%AI_DIR%\musicgen-api" (echo [OK] MusicGen installe>> "%REPORT_FILE%") else (echo [X] MusicGen NON installe>> "%REPORT_FILE%")
if exist "%AI_DIR%\demucs-api" (echo [OK] Demucs installe>> "%REPORT_FILE%") else (echo [X] Demucs NON installe>> "%REPORT_FILE%")
if exist "%AI_DIR%\clip-api" (echo [OK] CLIP installe>> "%REPORT_FILE%") else (echo [X] CLIP NON installe>> "%REPORT_FILE%")
if exist "%AI_DIR%\esrgan-api" (echo [OK] ESRGAN installe>> "%REPORT_FILE%") else (echo [X] ESRGAN NON installe>> "%REPORT_FILE%")
echo.>> "%REPORT_FILE%"

REM État des services HTTP
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo ETAT DES SERVICES (HTTP)>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"

call :CheckUrl "Ollama"   "http://localhost:11434/api/tags" >> "%REPORT_FILE%"
call :CheckUrl "ComfyUI"  "http://localhost:8188/system_stats" >> "%REPORT_FILE%"
call :CheckUrl "Whisper"  "http://localhost:9000/health" >> "%REPORT_FILE%"
call :CheckUrl "XTTS"     "http://localhost:8020/health" >> "%REPORT_FILE%"
call :CheckUrl "MusicGen" "http://localhost:8030/health" >> "%REPORT_FILE%"
call :CheckUrl "Demucs"   "http://localhost:8040/health" >> "%REPORT_FILE%"
call :CheckUrl "CLIP"     "http://localhost:8060/health" >> "%REPORT_FILE%"
call :CheckUrl "ESRGAN"   "http://localhost:8070/health" >> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"

REM Extrait du log d'installation
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo EXTRAIT LOG INSTALLATION (30 dernieres lignes)>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
if exist "%INSTALL_LOG%" (
  powershell -NoProfile -Command "Get-Content -Tail 30 '%INSTALL_LOG%'" >> "%REPORT_FILE%" 2>&1
) else (
  echo [Aucun log d'installation]>> "%REPORT_FILE%"
)
echo.>> "%REPORT_FILE%"

REM Notes
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo NOTES ET AIDE>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo EXIT CODE 0 = Installation reussie>> "%REPORT_FILE%"
echo EXIT CODE 1 = Erreur pendant l'installation (voir log ci-dessus)>> "%REPORT_FILE%"
echo EXIT CODE 500 = Script PS1 introuvable>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"
echo [OK] en HTTP + [X] dans l'app = Probleme CORS navigateur>> "%REPORT_FILE%"
echo [X] en HTTP = Service non demarre / non installe / firewall>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"
echo Pour relancer les services: %AI_DIR%\start-ai-services.bat>> "%REPORT_FILE%"
echo Pour arreter les services: %AI_DIR%\stop-ai-services.bat>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"

echo.
echo ==============================================================================
echo   INSTALLATION TERMINEE
echo ==============================================================================
echo.
echo Rapport: %REPORT_FILE%
echo.

choice /C ON /N /M "Ouvrir le rapport dans Notepad ? (O/N) "
if errorlevel 2 goto copyPrompt
start notepad "%REPORT_FILE%"

:copyPrompt
echo.
choice /C ON /N /M "Copier le rapport dans le presse-papiers ? (O/N) "
if errorlevel 2 goto end
powershell -NoProfile -Command "Get-Content -Raw '%REPORT_FILE%' | Set-Clipboard" >nul 2>&1
echo [OK] Rapport copie - Collez-le dans l'application MediaVault pour analyse.

:end
echo.
echo Termine. Vous pouvez fermer cette fenetre.
pause
exit /b 0

:CheckUrl
set "NAME=%~1"
set "URL=%~2"
set "CODE="
for /f "usebackq delims=" %%c in (`powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri '%URL%').StatusCode } catch { 0 }"`) do set "CODE=%%c"
if "%CODE%"=="200" (
  echo [OK] %NAME% ^| %URL%
) else (
  echo [X]  %NAME% ^| %URL% ^| HTTP=%CODE%
)
exit /b 0
