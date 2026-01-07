@echo off
chcp 65001 >nul
title MediaVault - Démarrage des services IA
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       MediaVault - Démarrage des services IA                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set "AI_FOLDER=C:\AI"

:: Vérifier si le dossier AI existe
if not exist "%AI_FOLDER%" (
    echo [ERREUR] Dossier %AI_FOLDER% introuvable
    echo Lancez d'abord install-ai-suite.bat ou install-ai-suite.ps1
    pause
    exit /b 1
)

echo [1/4] Démarrage de Ollama...
start "Ollama" /min cmd /c "ollama serve"
timeout /t 2 /nobreak >nul

echo [2/4] Démarrage de ComfyUI...
if exist "%AI_FOLDER%\ComfyUI" (
    cd /d "%AI_FOLDER%\ComfyUI"
    if exist "venv\Scripts\activate.bat" (
        start "ComfyUI" /min cmd /c "call venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188"
    ) else (
        start "ComfyUI" /min cmd /c "python main.py --listen 0.0.0.0 --port 8188"
    )
) else (
    echo [INFO] ComfyUI non installé, ignoré
)
timeout /t 2 /nobreak >nul

echo [3/4] Démarrage de Whisper API...
if exist "%AI_FOLDER%\whisper" (
    cd /d "%AI_FOLDER%\whisper"
    start "Whisper" /min cmd /c "call venv\Scripts\activate.bat && python whisper_server.py"
) else (
    echo [INFO] Whisper non installé, ignoré
)
timeout /t 2 /nobreak >nul

echo [4/4] Démarrage de XTTS...
if exist "%AI_FOLDER%\xtts" (
    cd /d "%AI_FOLDER%\xtts"
    start "XTTS" /min cmd /c "call venv\Scripts\activate.bat && python xtts_server.py"
) else (
    echo [INFO] XTTS non installé, ignoré
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              Services IA démarrés !                          ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Ollama:    http://localhost:11434                           ║
echo ║  ComfyUI:   http://localhost:8188                            ║
echo ║  Whisper:   http://localhost:9000                            ║
echo ║  XTTS:      http://localhost:8020                            ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Pour arrêter: lancez stop-ai-services.bat                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Les services tournent en arrière-plan.
echo Vous pouvez fermer cette fenêtre.
echo.
timeout /t 5
