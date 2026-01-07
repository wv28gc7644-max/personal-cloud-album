@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title MediaVault AI - Installation
color 0B

echo.
echo ==============================================================================
echo   MediaVault AI Suite - Installation
echo ==============================================================================
echo.

REM Vérification droits admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Demande des droits administrateur...
    echo [INFO] Une nouvelle fenetre ADMIN va s'ouvrir et RESTERA OUVERTE.
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/k','\"%~f0\"'"
    exit /b
)

echo [OK] Droits administrateur confirmes.
echo.

set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
set "PS1_FILE=%AI_DIR%\installer.ps1"

if not exist "%AI_DIR%" mkdir "%AI_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%i"
set "LOG=%LOG_DIR%\install-%TS%.log"
set "REPORT=%LOG_DIR%\report-%TS%.txt"

echo Dossier: %AI_DIR%
echo Log: %LOG%
echo.

REM ============================================================================
REM  CREER LE SCRIPT POWERSHELL
REM ============================================================================

echo [1/4] Creation du script d'installation...

(
  echo $ErrorActionPreference = 'Continue'
  echo $ProgressPreference = 'SilentlyContinue'
  echo $AI_DIR = '%AI_DIR%'
  echo $LOG = '%LOG%'
  echo.
  echo function Log { param^($m^) Add-Content -Path $LOG -Value "[$(Get-Date -f 'HH:mm:ss')] $m"; Write-Host $m }
  echo function Step { param^([int]$p,[string]$m^) ^
  echo   $barSize = 30; $filled = [Math]::Min($barSize, [Math]::Floor($p * $barSize / 100)); ^
  echo   $bar = ('#' * $filled) + ('-' * ($barSize - $filled)); ^
  echo   Log ("[{0}] {1}% - {2}" -f $bar, $p, $m); ^
  echo }
  echo.
  echo Step 0 'Demarrage de l''installation'
  echo Log '=== INSTALLATION MEDIAVAULT AI ==='
  echo.
  echo Step 5 'Verification / installation de Git'
  echo if ^(!^(Get-Command git -EA SilentlyContinue^)^) {
  echo     Log 'Installation Git...'
  echo     winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent 2^>$null
  echo     $env:Path = [Environment]::GetEnvironmentVariable^('Path','Machine'^) + ';' + [Environment]::GetEnvironmentVariable^('Path','User'^)
  echo }
  echo Log 'Git OK'
  echo.
  echo Step 10 'Verification / installation de Python'
  echo $pyOK = $false
  echo try { $v = python --version 2^>$null; if ^($v^) { $pyOK = $true } } catch {}
  echo if ^(!$pyOK^) {
  echo     Log 'Installation Python 3.11...'
  echo     winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent 2^>$null
  echo     Start-Sleep 5
  echo     $env:Path = [Environment]::GetEnvironmentVariable^('Path','Machine'^) + ';' + [Environment]::GetEnvironmentVariable^('Path','User'^)
  echo }
  echo Log 'Python OK'
  echo.
  echo Step 15 'Verification / installation de Ollama'
  echo if ^(!^(Get-Command ollama -EA SilentlyContinue^)^) {
  echo     Log 'Installation Ollama...'
  echo     winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent 2^>$null
  echo     $env:Path = [Environment]::GetEnvironmentVariable^('Path','Machine'^) + ';' + [Environment]::GetEnvironmentVariable^('Path','User'^)
  echo }
  echo Log 'Ollama OK'
  echo.
  echo Step 20 'Detection GPU'
  echo $GPU = 'cpu'
  echo try { $nv = nvidia-smi 2^>$null; if ^($nv^) { $GPU = 'nvidia' } } catch {}
  echo if ^($GPU -eq 'cpu'^) { 
  echo     $arc = Get-CimInstance Win32_VideoController ^| Where { $_.Name -like '*Arc*' }
  echo     if ^($arc^) { $GPU = 'intel' }
  echo }
  echo Log ("GPU: $GPU")
  echo.
  echo Set-Location $AI_DIR
  echo.
  echo Step 30 'Installation ComfyUI (images/video)'
  echo if ^(!^(Test-Path 'ComfyUI'^)^) {
  echo     Log '[2/8] Installation ComfyUI...'
  echo     git clone https://github.com/comfyanonymous/ComfyUI.git 2^>$null
  echo     Set-Location ComfyUI
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install torch torchvision torchaudio --quiet 2^>$null
  echo     .\venv\Scripts\pip install -r requirements.txt --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'ComfyUI OK'
  echo.
  echo Step 40 'Installation Whisper (STT)'
  echo if ^(!^(Test-Path 'whisper-api'^)^) {
  echo     Log '[3/8] Installation Whisper...'
  echo     New-Item -ItemType Directory whisper-api -Force ^| Out-Null
  echo     Set-Location whisper-api
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install openai-whisper flask flask-cors --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'Whisper OK'
  echo.
  echo Step 55 'Installation XTTS (TTS)'
  echo if ^(!^(Test-Path 'xtts-api'^)^) {
  echo     Log '[4/8] Installation XTTS...'
  echo     New-Item -ItemType Directory xtts-api -Force ^| Out-Null
  echo     Set-Location xtts-api
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install TTS flask flask-cors --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'XTTS OK'
  echo.
  echo Step 70 'Installation MusicGen'
  echo if ^(!^(Test-Path 'musicgen-api'^)^) {
  echo     Log '[5/8] Installation MusicGen...'
  echo     New-Item -ItemType Directory musicgen-api -Force ^| Out-Null
  echo     Set-Location musicgen-api
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install audiocraft flask flask-cors --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'MusicGen OK'
  echo.
  echo Step 80 'Installation Demucs (stems audio)'
  echo if ^(!^(Test-Path 'demucs-api'^)^) {
  echo     Log '[6/8] Installation Demucs...'
  echo     New-Item -ItemType Directory demucs-api -Force ^| Out-Null
  echo     Set-Location demucs-api
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install demucs flask flask-cors --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'Demucs OK'
  echo.
  echo Step 90 'Installation CLIP (analyse image)'
  echo if ^(!^(Test-Path 'clip-api'^)^) {
  echo     Log '[7/8] Installation CLIP...'
  echo     New-Item -ItemType Directory clip-api -Force ^| Out-Null
  echo     Set-Location clip-api
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install clip-interrogator flask flask-cors pillow --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'CLIP OK'
  echo.
  echo Step 95 'Installation ESRGAN (upscale image)'
  echo if ^(!^(Test-Path 'esrgan-api'^)^) {
  echo     Log '[8/8] Installation ESRGAN...'
  echo     New-Item -ItemType Directory esrgan-api -Force ^| Out-Null
  echo     Set-Location esrgan-api
  echo     python -m venv venv 2^>$null
  echo     .\venv\Scripts\pip install realesrgan flask flask-cors pillow opencv-python --quiet 2^>$null
  echo     Set-Location ..
  echo }
  echo Log 'ESRGAN OK'
  echo.
  echo Step 100 'Installation terminee'
  echo Log '=== INSTALLATION TERMINEE ==='
) > "%PS1_FILE%"

echo [OK] Script cree: %PS1_FILE%
echo.

REM ============================================================================
REM  EXECUTER LE SCRIPT POWERSHELL
REM ============================================================================

echo [2/4] Installation des services IA ^(15-30 min^)...
echo       Ne fermez pas cette fenetre!
echo.

echo [INFO] Lancement de PowerShell... (si ca se ferme, le log reste ici: %LOG%)

echo ---------------------------------------------->> "%LOG%"
echo [%date% %time%] START POWERSHELL>> "%LOG%"
echo ---------------------------------------------->> "%LOG%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%" 2>>"%LOG%"
set "PS_EXIT=%ERRORLEVEL%"

echo.
echo [INFO] PowerShell termine. Code retour: %PS_EXIT%
echo [INFO] Log: %LOG%
echo.

if not "%PS_EXIT%"=="0" (
  echo [ERREUR] L'installation a echoue. Regardez les 30 dernieres lignes du log ci-dessus.
  echo.
  powershell -NoProfile -Command "Get-Content -Tail 30 '%LOG%'" 
  echo.
  echo Appuyez sur une touche pour fermer...
  pause >nul
  exit /b %PS_EXIT%
)


REM ============================================================================
REM  DEMARRER LES SERVICES
REM ============================================================================

echo [3/4] Demarrage des services...

where ollama >nul 2>&1 && start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

if exist "%AI_DIR%\ComfyUI\venv\Scripts\python.exe" (
    cd /d "%AI_DIR%\ComfyUI"
    start "ComfyUI" /min cmd /c "venv\Scripts\python main.py --listen 0.0.0.0 --port 8188"
)

echo Attente demarrage ^(15s^)...
timeout /t 15 /nobreak >nul

REM ============================================================================
REM  GENERER LE RAPPORT
REM ============================================================================

echo.
echo [4/4] Generation du rapport...

(
echo ==============================================================================
echo RAPPORT MEDIAVAULT AI - %date% %time%
echo ==============================================================================
echo.
echo DOSSIER: %AI_DIR%
echo EXIT CODE: %PS_EXIT%
echo.
echo === PREREQUIS ===
) > "%REPORT%"

where git >nul 2>&1 && (echo [OK] git>> "%REPORT%") || (echo [X] git>> "%REPORT%")
python --version >> "%REPORT%" 2>&1
ollama --version >> "%REPORT%" 2>&1

(
echo.
echo === GPU ===
) >> "%REPORT%"
powershell -Command "Get-CimInstance Win32_VideoController | Select Name | Format-Table -HideTableHeaders" >> "%REPORT%"

(
echo.
echo === DOSSIERS INSTALLES ===
) >> "%REPORT%"
if exist "%AI_DIR%\ComfyUI" (echo [OK] ComfyUI>> "%REPORT%") else (echo [X] ComfyUI>> "%REPORT%")
if exist "%AI_DIR%\whisper-api" (echo [OK] whisper-api>> "%REPORT%") else (echo [X] whisper-api>> "%REPORT%")
if exist "%AI_DIR%\xtts-api" (echo [OK] xtts-api>> "%REPORT%") else (echo [X] xtts-api>> "%REPORT%")
if exist "%AI_DIR%\musicgen-api" (echo [OK] musicgen-api>> "%REPORT%") else (echo [X] musicgen-api>> "%REPORT%")
if exist "%AI_DIR%\demucs-api" (echo [OK] demucs-api>> "%REPORT%") else (echo [X] demucs-api>> "%REPORT%")
if exist "%AI_DIR%\clip-api" (echo [OK] clip-api>> "%REPORT%") else (echo [X] clip-api>> "%REPORT%")
if exist "%AI_DIR%\esrgan-api" (echo [OK] esrgan-api>> "%REPORT%") else (echo [X] esrgan-api>> "%REPORT%")

(
echo.
echo === SERVICES HTTP ===
) >> "%REPORT%"

for /f %%a in ('powershell -Command "try{(iwr -Uri 'http://localhost:11434/api/tags' -TimeoutSec 3).StatusCode}catch{0}"') do (
    if "%%a"=="200" (echo [OK] Ollama :11434>> "%REPORT%") else (echo [X] Ollama :11434>> "%REPORT%")
)
for /f %%a in ('powershell -Command "try{(iwr -Uri 'http://localhost:8188/system_stats' -TimeoutSec 3).StatusCode}catch{0}"') do (
    if "%%a"=="200" (echo [OK] ComfyUI :8188>> "%REPORT%") else (echo [X] ComfyUI :8188>> "%REPORT%")
)

(
echo.
echo === LOG INSTALLATION ^(20 dernieres lignes^) ===
) >> "%REPORT%"
if exist "%LOG%" (
    powershell -Command "Get-Content -Tail 20 '%LOG%'" >> "%REPORT%"
) else (
    echo [Aucun log]>> "%REPORT%"
)

(
echo.
echo ==============================================================================
echo Pour relancer: %AI_DIR%\start-ai-services.bat
echo ==============================================================================
) >> "%REPORT%"

echo.
echo ==============================================================================
type "%REPORT%"
echo ==============================================================================
echo.
echo Rapport sauvegarde: %REPORT%
echo.

choice /C OC /N /M "Ouvrir le rapport (O) ou Copier dans le presse-papiers (C) ? "
if %ERRORLEVEL%==1 notepad "%REPORT%"
if %ERRORLEVEL%==2 (
    powershell -Command "Get-Content -Raw '%REPORT%' | Set-Clipboard"
    echo [OK] Rapport copie! Collez-le dans MediaVault.
)

echo.
echo Installation terminee. Appuyez sur une touche pour fermer.
pause >nul
