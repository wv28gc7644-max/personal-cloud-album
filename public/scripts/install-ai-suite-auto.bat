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

REM Chercher le script PS1 dans plusieurs emplacements
set "PS1_SCRIPT="
if exist "%SCRIPT_DIR%install-ai-suite-complete.ps1" set "PS1_SCRIPT=%SCRIPT_DIR%install-ai-suite-complete.ps1"
if exist "%~dp0install-ai-suite-complete.ps1" set "PS1_SCRIPT=%~dp0install-ai-suite-complete.ps1"
if exist "%USERPROFILE%\Downloads\install-ai-suite-complete.ps1" set "PS1_SCRIPT=%USERPROFILE%\Downloads\install-ai-suite-complete.ps1"
if exist "%AI_DIR%\install-ai-suite-complete.ps1" set "PS1_SCRIPT=%AI_DIR%\install-ai-suite-complete.ps1"

if "%PS1_SCRIPT%"=="" (
  echo [ERREUR] Script introuvable: install-ai-suite-complete.ps1
  echo.
  echo Emplacements vérifiés:
  echo   - %SCRIPT_DIR%
  echo   - %~dp0
  echo   - %USERPROFILE%\Downloads
  echo   - %AI_DIR%
  echo.
  echo SOLUTION: Téléchargez install-ai-suite-complete.ps1 depuis l'application
  echo           et placez-le dans le même dossier que ce fichier .bat
  echo.
  echo [ERREUR] Script PS1 introuvable > "%INSTALL_LOG%"
  set "PS_EXIT=404"
  goto skipInstall
)

echo Script trouvé: %PS1_SCRIPT%
echo Lancement de l'installation... (peut prendre 15-30 minutes)
echo.

REM Exécuter avec capture d'erreur complète
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Continue'; try { & '%PS1_SCRIPT%' -InstallDir '%AI_DIR%' *>&1 | Tee-Object -FilePath '%INSTALL_LOG%'; exit $LASTEXITCODE } catch { $_ | Out-File -Append '%INSTALL_LOG%'; exit 1 }"
set "PS_EXIT=%ERRORLEVEL%"

echo.
echo Installation terminée avec code: %PS_EXIT%

:skipInstall

REM --- 2) Démarrage + logs ---
echo.
echo [2/3] Démarrage des services...

REM Chercher start-ai-services.bat
set "START_SCRIPT="
if exist "%SCRIPT_DIR%start-ai-services.bat" set "START_SCRIPT=%SCRIPT_DIR%start-ai-services.bat"
if exist "%AI_DIR%\start-ai-services.bat" set "START_SCRIPT=%AI_DIR%\start-ai-services.bat"
if exist "%USERPROFILE%\Downloads\start-ai-services.bat" set "START_SCRIPT=%USERPROFILE%\Downloads\start-ai-services.bat"

if "%START_SCRIPT%"=="" (
  echo [WARN] start-ai-services.bat introuvable - services non démarrés
  echo [WARN] start-ai-services.bat introuvable > "%START_LOG%"
) else (
  echo Démarrage via: %START_SCRIPT%
  call "%START_SCRIPT%" > "%START_LOG%" 2>&1
  echo Services démarrés.
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

REM Vérification des dossiers installés
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo DOSSIERS INSTALLATION>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
if exist "%AI_DIR%\ComfyUI" (echo ✓ ComfyUI installé>> "%REPORT_FILE%") else (echo ✗ ComfyUI NON installé>> "%REPORT_FILE%")
if exist "%AI_DIR%\whisper-api" (echo ✓ Whisper installé>> "%REPORT_FILE%") else (echo ✗ Whisper NON installé>> "%REPORT_FILE%")
if exist "%AI_DIR%\xtts-api" (echo ✓ XTTS installé>> "%REPORT_FILE%") else (echo ✗ XTTS NON installé>> "%REPORT_FILE%")
if exist "%AI_DIR%\musicgen-api" (echo ✓ MusicGen installé>> "%REPORT_FILE%") else (echo ✗ MusicGen NON installé>> "%REPORT_FILE%")
if exist "%AI_DIR%\demucs-api" (echo ✓ Demucs installé>> "%REPORT_FILE%") else (echo ✗ Demucs NON installé>> "%REPORT_FILE%")
if exist "%AI_DIR%\clip-api" (echo ✓ CLIP installé>> "%REPORT_FILE%") else (echo ✗ CLIP NON installé>> "%REPORT_FILE%")
if exist "%AI_DIR%\esrgan-api" (echo ✓ ESRGAN installé>> "%REPORT_FILE%") else (echo ✗ ESRGAN NON installé>> "%REPORT_FILE%")
echo.>> "%REPORT_FILE%"

REM Extrait du log d'installation (dernières 50 lignes)
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo EXTRAIT LOG INSTALLATION (50 dernières lignes)>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
if exist "%INSTALL_LOG%" (
  powershell -NoProfile -Command "Get-Content -Tail 50 '%INSTALL_LOG%'" >> "%REPORT_FILE%" 2>&1
) else (
  echo [Aucun log d'installation trouvé]>> "%REPORT_FILE%"
)
echo.>> "%REPORT_FILE%"

echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo NOTES>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo - EXIT CODE 404 = script PS1 introuvable (téléchargez-le)>> "%REPORT_FILE%"
echo - EXIT CODE 0 = installation réussie>> "%REPORT_FILE%"
echo - EXIT CODE autre = erreur pendant l'installation (voir log ci-dessus)>> "%REPORT_FILE%"
echo - Si un service est OK en HTTP mais hors-ligne dans l'app = souci CORS navigateur>> "%REPORT_FILE%"
echo - Si c'est X en HTTP = pas démarré / pas installé / bloqué firewall>> "%REPORT_FILE%"
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
