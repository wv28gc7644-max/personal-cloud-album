@echo off
title MediaVault AI Suite Installer
color 0A
chcp 65001 >nul

echo ╔══════════════════════════════════════════════════════════════╗
echo ║           MEDIAVAULT AI SUITE - INSTALLATION                 ║
echo ║           Installation automatique des outils IA             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script necessite les droits administrateur.
    echo Clic droit ^> Executer en tant qu'administrateur
    pause
    exit /b 1
)

:: Set installation directory
set "INSTALL_DIR=%USERPROFILE%\MediaVault-AI"
set "PYTHON_VERSION=3.11.9"

echo [INFO] Dossier d'installation: %INSTALL_DIR%
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

:: ============================================
:: 1. CHECK PREREQUISITES
:: ============================================
echo [1/8] Verification des prerequis...

:: Check for winget
where winget >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] winget non trouve. Installez App Installer depuis le Microsoft Store.
    pause
    exit /b 1
)

:: Check for Git
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Installation de Git...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
)

:: Check NVIDIA GPU
nvidia-smi >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] GPU NVIDIA detecte
    set "HAS_GPU=1"
) else (
    echo [ATTENTION] Pas de GPU NVIDIA detecte - Mode CPU uniquement
    set "HAS_GPU=0"
)

:: ============================================
:: 2. INSTALL PYTHON 3.11
:: ============================================
echo.
echo [2/8] Installation de Python %PYTHON_VERSION%...

python --version 2>&1 | findstr /C:"3.11" >nul
if %errorLevel% neq 0 (
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements
    
    :: Refresh PATH
    set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
)
echo [OK] Python 3.11 pret

:: ============================================
:: 3. INSTALL OLLAMA
:: ============================================
echo.
echo [3/8] Installation de Ollama (LLM local)...

where ollama >nul 2>&1
if %errorLevel% neq 0 (
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements
)

:: Pull default models
echo [INFO] Telechargement des modeles Ollama recommandes...
start /wait ollama pull llama3.2:3b
start /wait ollama pull nomic-embed-text

echo [OK] Ollama installe

:: ============================================
:: 4. INSTALL COMFYUI
:: ============================================
echo.
echo [4/8] Installation de ComfyUI (generation images/videos)...

if not exist "%INSTALL_DIR%\ComfyUI" (
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    
    :: Create venv
    python -m venv venv
    call venv\Scripts\activate.bat
    
    :: Install PyTorch with CUDA
    if "%HAS_GPU%"=="1" (
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    ) else (
        pip install torch torchvision torchaudio
    )
    
    pip install -r requirements.txt
    
    :: Install ComfyUI Manager
    cd custom_nodes
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
    cd ..
    
    call venv\Scripts\deactivate.bat
    cd ..
)
echo [OK] ComfyUI installe

:: ============================================
:: 5. INSTALL WHISPER (Speech-to-Text)
:: ============================================
echo.
echo [5/8] Installation de Whisper (transcription audio)...

if not exist "%INSTALL_DIR%\whisper-api" (
    mkdir whisper-api
    cd whisper-api
    
    python -m venv venv
    call venv\Scripts\activate.bat
    
    pip install openai-whisper flask flask-cors
    if "%HAS_GPU%"=="1" (
        pip install torch --index-url https://download.pytorch.org/whl/cu121
    )
    
    :: Create API server script
    echo from flask import Flask, request, jsonify > whisper_server.py
    echo from flask_cors import CORS >> whisper_server.py
    echo import whisper >> whisper_server.py
    echo import tempfile >> whisper_server.py
    echo import os >> whisper_server.py
    echo. >> whisper_server.py
    echo app = Flask(__name__) >> whisper_server.py
    echo CORS(app) >> whisper_server.py
    echo model = whisper.load_model("base") >> whisper_server.py
    echo. >> whisper_server.py
    echo @app.route("/transcribe", methods=["POST"]) >> whisper_server.py
    echo def transcribe(): >> whisper_server.py
    echo     audio = request.files["audio"] >> whisper_server.py
    echo     with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f: >> whisper_server.py
    echo         audio.save(f.name) >> whisper_server.py
    echo         result = model.transcribe(f.name) >> whisper_server.py
    echo         os.unlink(f.name) >> whisper_server.py
    echo         return jsonify(result) >> whisper_server.py
    echo. >> whisper_server.py
    echo if __name__ == "__main__": >> whisper_server.py
    echo     app.run(host="0.0.0.0", port=9000) >> whisper_server.py
    
    call venv\Scripts\deactivate.bat
    cd ..
)
echo [OK] Whisper installe

:: ============================================
:: 6. INSTALL XTTS (Text-to-Speech)
:: ============================================
echo.
echo [6/8] Installation de XTTS (synthese vocale)...

if not exist "%INSTALL_DIR%\xtts-api" (
    mkdir xtts-api
    cd xtts-api
    
    python -m venv venv
    call venv\Scripts\activate.bat
    
    pip install TTS flask flask-cors
    if "%HAS_GPU%"=="1" (
        pip install torch --index-url https://download.pytorch.org/whl/cu121
    )
    
    call venv\Scripts\deactivate.bat
    cd ..
)
echo [OK] XTTS installe

:: ============================================
:: 7. INSTALL ADDITIONAL AI TOOLS
:: ============================================
echo.
echo [7/8] Installation des outils IA supplementaires...

if not exist "%INSTALL_DIR%\ai-tools" (
    mkdir ai-tools
    cd ai-tools
    
    python -m venv venv
    call venv\Scripts\activate.bat
    
    :: Install all AI packages
    pip install audiocraft       :: MusicGen
    pip install demucs           :: Stem separation
    pip install insightface      :: Face recognition
    pip install clip-interrogator :: Image analysis
    pip install realesrgan       :: Image upscaling
    pip install rembg            :: Background removal
    
    if "%HAS_GPU%"=="1" (
        pip install onnxruntime-gpu
    ) else (
        pip install onnxruntime
    )
    
    call venv\Scripts\deactivate.bat
    cd ..
)
echo [OK] Outils IA installes

:: ============================================
:: 8. CREATE STARTUP SCRIPTS
:: ============================================
echo.
echo [8/8] Creation des scripts de demarrage...

:: Create start script
echo @echo off > "%INSTALL_DIR%\start-ai-services.bat"
echo title MediaVault AI Services >> "%INSTALL_DIR%\start-ai-services.bat"
echo echo Demarrage des services IA... >> "%INSTALL_DIR%\start-ai-services.bat"
echo. >> "%INSTALL_DIR%\start-ai-services.bat"
echo :: Start Ollama >> "%INSTALL_DIR%\start-ai-services.bat"
echo start "Ollama" ollama serve >> "%INSTALL_DIR%\start-ai-services.bat"
echo timeout /t 3 >> "%INSTALL_DIR%\start-ai-services.bat"
echo. >> "%INSTALL_DIR%\start-ai-services.bat"
echo :: Start ComfyUI >> "%INSTALL_DIR%\start-ai-services.bat"
echo cd /d "%INSTALL_DIR%\ComfyUI" >> "%INSTALL_DIR%\start-ai-services.bat"
echo start "ComfyUI" cmd /c "venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188" >> "%INSTALL_DIR%\start-ai-services.bat"
echo. >> "%INSTALL_DIR%\start-ai-services.bat"
echo :: Start Whisper API >> "%INSTALL_DIR%\start-ai-services.bat"
echo cd /d "%INSTALL_DIR%\whisper-api" >> "%INSTALL_DIR%\start-ai-services.bat"
echo start "Whisper" cmd /c "venv\Scripts\activate.bat && python whisper_server.py" >> "%INSTALL_DIR%\start-ai-services.bat"
echo. >> "%INSTALL_DIR%\start-ai-services.bat"
echo echo Tous les services sont demarres! >> "%INSTALL_DIR%\start-ai-services.bat"
echo echo - Ollama: http://localhost:11434 >> "%INSTALL_DIR%\start-ai-services.bat"
echo echo - ComfyUI: http://localhost:8188 >> "%INSTALL_DIR%\start-ai-services.bat"
echo echo - Whisper: http://localhost:9000 >> "%INSTALL_DIR%\start-ai-services.bat"

:: Create stop script
echo @echo off > "%INSTALL_DIR%\stop-ai-services.bat"
echo echo Arret des services IA... >> "%INSTALL_DIR%\stop-ai-services.bat"
echo taskkill /F /IM ollama.exe 2^>nul >> "%INSTALL_DIR%\stop-ai-services.bat"
echo taskkill /F /FI "WINDOWTITLE eq ComfyUI*" 2^>nul >> "%INSTALL_DIR%\stop-ai-services.bat"
echo taskkill /F /FI "WINDOWTITLE eq Whisper*" 2^>nul >> "%INSTALL_DIR%\stop-ai-services.bat"
echo echo Services arretes. >> "%INSTALL_DIR%\stop-ai-services.bat"

:: Create desktop shortcuts
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\shortcut.vbs"
echo sLinkFile = "%USERPROFILE%\Desktop\MediaVault AI.lnk" >> "%TEMP%\shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\shortcut.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\start-ai-services.bat" >> "%TEMP%\shortcut.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\shortcut.vbs"
echo oLink.Description = "Demarrer les services IA MediaVault" >> "%TEMP%\shortcut.vbs"
echo oLink.Save >> "%TEMP%\shortcut.vbs"
cscript //nologo "%TEMP%\shortcut.vbs"
del "%TEMP%\shortcut.vbs"

echo [OK] Scripts de demarrage crees

:: ============================================
:: INSTALLATION COMPLETE
:: ============================================
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              INSTALLATION TERMINEE AVEC SUCCES!              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Services installes:
echo   - Ollama (LLM)         : http://localhost:11434
echo   - ComfyUI (Images)     : http://localhost:8188
echo   - Whisper (Audio)      : http://localhost:9000
echo.
echo Raccourcis crees:
echo   - Bureau: "MediaVault AI"
echo   - Scripts: %INSTALL_DIR%\start-ai-services.bat
echo              %INSTALL_DIR%\stop-ai-services.bat
echo.
echo Pour demarrer: Double-cliquez sur "MediaVault AI" sur le bureau
echo.
pause
