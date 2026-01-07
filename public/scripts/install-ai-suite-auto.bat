@echo off
title MediaVault AI - Installation
color 0B
chcp 65001 >nul 2>&1

echo.
echo ══════════════════════════════════════════════════════════════════════════════
echo                    MEDIAVAULT AI - INSTALLATION
echo ══════════════════════════════════════════════════════════════════════════════
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM  VERIFICATION DES DROITS ADMIN
REM ═══════════════════════════════════════════════════════════════════════════════

echo [ETAPE 1] Verification des droits administrateur...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Cette fenetre n'a pas les droits administrateur.
    echo [!] Une NOUVELLE FENETRE va s'ouvrir avec les droits.
    echo [!] Cliquez OUI quand Windows demande l'autorisation.
    echo.
    pause
    
    REM Relance avec droits admin - utilise cmd /k pour garder la fenetre ouverte
    powershell -Command "Start-Process cmd -Verb RunAs -ArgumentList '/k cd /d \"%~dp0\" && \"%~f0\"'"
    exit /b
)

echo [OK] Droits administrateur confirmes.
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM  CONFIGURATION
REM ═══════════════════════════════════════════════════════════════════════════════

echo [ETAPE 2] Configuration des chemins...

set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"

echo     Dossier IA: %AI_DIR%
echo     Dossier logs: %LOG_DIR%

if not exist "%AI_DIR%" (
    echo     Creation du dossier IA...
    mkdir "%AI_DIR%"
    if errorlevel 1 (
        echo [ERREUR] Impossible de creer %AI_DIR%
        pause
        exit /b 1
    )
)

if not exist "%LOG_DIR%" (
    echo     Creation du dossier logs...
    mkdir "%LOG_DIR%"
)

echo [OK] Dossiers prets.
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM  VERIFICATION DES PREREQUIS
REM ═══════════════════════════════════════════════════════════════════════════════

echo [ETAPE 3] Verification des prerequis...
echo.

echo     Verification de winget...
where winget >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] winget n'est pas installe!
    echo          Installez "App Installer" depuis le Microsoft Store.
    pause
    exit /b 1
)
echo     [OK] winget trouve.

echo     Verification de git...
where git >nul 2>&1
if errorlevel 1 (
    echo     [!] Git non trouve, installation...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    echo     [OK] Git installe.
) else (
    echo     [OK] git trouve.
)

echo     Verification de python...
where python >nul 2>&1
if errorlevel 1 (
    echo     [!] Python non trouve, installation de Python 3.11...
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements
    echo     [OK] Python installe.
    echo     [!] IMPORTANT: Fermez cette fenetre et relancez le script pour que Python soit detecte.
    pause
    exit /b 0
) else (
    python --version
    echo     [OK] Python trouve.
)

echo     Verification de ollama...
where ollama >nul 2>&1
if errorlevel 1 (
    echo     [!] Ollama non trouve, installation...
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements
    echo     [OK] Ollama installe.
) else (
    echo     [OK] Ollama trouve.
)

echo.
echo [OK] Tous les prerequis sont installes.
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM  DETECTION GPU
REM ═══════════════════════════════════════════════════════════════════════════════

echo [ETAPE 4] Detection du GPU...

set "GPU_TYPE=cpu"

nvidia-smi >nul 2>&1
if not errorlevel 1 (
    set "GPU_TYPE=nvidia"
    echo     [OK] GPU NVIDIA detecte - acceleration CUDA activee.
    goto gpu_done
)

powershell -Command "if (Get-CimInstance Win32_VideoController | Where-Object {$_.Name -like '*Arc*'}) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    set "GPU_TYPE=intel"
    echo     [OK] GPU Intel Arc detecte.
    goto gpu_done
)

echo     [INFO] Aucun GPU compatible detecte, mode CPU utilise.

:gpu_done
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM  INSTALLATION DES SERVICES IA
REM ═══════════════════════════════════════════════════════════════════════════════

echo ══════════════════════════════════════════════════════════════════════════════
echo                    INSTALLATION DES 8 SERVICES IA
echo ══════════════════════════════════════════════════════════════════════════════
echo.
echo [INFO] Cette etape peut prendre 15-30 minutes.
echo [INFO] NE FERMEZ PAS cette fenetre!
echo.

cd /d "%AI_DIR%"

REM --- 1. ComfyUI ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [1/8] ComfyUI - Generation d'images et videos                    [0%%]      │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\ComfyUI" (
    echo     [SKIP] ComfyUI deja installe.
) else (
    echo     Clonage de ComfyUI...
    git clone https://github.com/comfyanonymous/ComfyUI.git
    if errorlevel 1 (
        echo     [ERREUR] Echec du clonage ComfyUI
    ) else (
        cd ComfyUI
        echo     Creation de l'environnement virtuel...
        python -m venv venv
        echo     Installation de PyTorch (peut prendre plusieurs minutes)...
        call venv\Scripts\activate.bat
        pip install torch torchvision torchaudio --quiet
        echo     Installation des dependances ComfyUI...
        pip install -r requirements.txt --quiet
        call venv\Scripts\deactivate.bat
        cd ..
        echo     [OK] ComfyUI installe.
    )
)
echo.

REM --- 2. Whisper ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [2/8] Whisper - Transcription audio                              [15%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\whisper-api" (
    echo     [SKIP] Whisper deja installe.
) else (
    mkdir whisper-api
    cd whisper-api
    echo     Creation de l'environnement virtuel...
    python -m venv venv
    echo     Installation des dependances...
    call venv\Scripts\activate.bat
    pip install openai-whisper flask flask-cors --quiet
    call venv\Scripts\deactivate.bat
    cd ..
    echo     [OK] Whisper installe.
)
echo.

REM --- 3. XTTS ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [3/8] XTTS - Synthese vocale                                     [30%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\xtts-api" (
    echo     [SKIP] XTTS deja installe.
) else (
    mkdir xtts-api
    cd xtts-api
    echo     Creation de l'environnement virtuel...
    python -m venv venv
    echo     Installation des dependances (peut prendre plusieurs minutes)...
    call venv\Scripts\activate.bat
    pip install TTS flask flask-cors --quiet
    call venv\Scripts\deactivate.bat
    cd ..
    echo     [OK] XTTS installe.
)
echo.

REM --- 4. MusicGen ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [4/8] MusicGen - Generation de musique                           [45%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\musicgen-api" (
    echo     [SKIP] MusicGen deja installe.
) else (
    mkdir musicgen-api
    cd musicgen-api
    echo     Creation de l'environnement virtuel...
    python -m venv venv
    echo     Installation des dependances (peut prendre plusieurs minutes)...
    call venv\Scripts\activate.bat
    pip install audiocraft flask flask-cors --quiet
    call venv\Scripts\deactivate.bat
    cd ..
    echo     [OK] MusicGen installe.
)
echo.

REM --- 5. Demucs ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [5/8] Demucs - Separation audio                                  [55%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\demucs-api" (
    echo     [SKIP] Demucs deja installe.
) else (
    mkdir demucs-api
    cd demucs-api
    echo     Creation de l'environnement virtuel...
    python -m venv venv
    echo     Installation des dependances...
    call venv\Scripts\activate.bat
    pip install demucs flask flask-cors --quiet
    call venv\Scripts\deactivate.bat
    cd ..
    echo     [OK] Demucs installe.
)
echo.

REM --- 6. CLIP ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [6/8] CLIP - Analyse d'images                                    [70%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\clip-api" (
    echo     [SKIP] CLIP deja installe.
) else (
    mkdir clip-api
    cd clip-api
    echo     Creation de l'environnement virtuel...
    python -m venv venv
    echo     Installation des dependances...
    call venv\Scripts\activate.bat
    pip install clip-interrogator flask flask-cors pillow --quiet
    call venv\Scripts\deactivate.bat
    cd ..
    echo     [OK] CLIP installe.
)
echo.

REM --- 7. ESRGAN ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [7/8] ESRGAN - Upscaling d'images                                [85%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

if exist "%AI_DIR%\esrgan-api" (
    echo     [SKIP] ESRGAN deja installe.
) else (
    mkdir esrgan-api
    cd esrgan-api
    echo     Creation de l'environnement virtuel...
    python -m venv venv
    echo     Installation des dependances...
    call venv\Scripts\activate.bat
    pip install realesrgan flask flask-cors pillow opencv-python --quiet
    call venv\Scripts\deactivate.bat
    cd ..
    echo     [OK] ESRGAN installe.
)
echo.

REM --- 8. Demarrage Ollama ---
echo ┌─────────────────────────────────────────────────────────────────────────────┐
echo │ [8/8] Demarrage de Ollama                                        [95%%]     │
echo └─────────────────────────────────────────────────────────────────────────────┘

echo     Demarrage de Ollama en arriere-plan...
start "Ollama" /min ollama serve
echo     [OK] Ollama demarre.
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM  RESULTAT FINAL
REM ═══════════════════════════════════════════════════════════════════════════════

echo ══════════════════════════════════════════════════════════════════════════════
echo                         INSTALLATION TERMINEE!                    [100%%]
echo ══════════════════════════════════════════════════════════════════════════════
echo.
echo   Dossiers installes:
echo.

if exist "%AI_DIR%\ComfyUI" (echo     [OK] ComfyUI) else (echo     [X] ComfyUI)
if exist "%AI_DIR%\whisper-api" (echo     [OK] Whisper) else (echo     [X] Whisper)
if exist "%AI_DIR%\xtts-api" (echo     [OK] XTTS) else (echo     [X] XTTS)
if exist "%AI_DIR%\musicgen-api" (echo     [OK] MusicGen) else (echo     [X] MusicGen)
if exist "%AI_DIR%\demucs-api" (echo     [OK] Demucs) else (echo     [X] Demucs)
if exist "%AI_DIR%\clip-api" (echo     [OK] CLIP) else (echo     [X] CLIP)
if exist "%AI_DIR%\esrgan-api" (echo     [OK] ESRGAN) else (echo     [X] ESRGAN)

echo.
echo   GPU detecte: %GPU_TYPE%
echo   Dossier IA: %AI_DIR%
echo.
echo ══════════════════════════════════════════════════════════════════════════════
echo.
echo   Prochaines etapes:
echo   1. Relancez l'application MediaVault
echo   2. Allez dans Parametres ^> IA Locale ^> Diagnostic
echo   3. Verifiez que les services sont en ligne
echo.
echo ══════════════════════════════════════════════════════════════════════════════
echo.

pause
