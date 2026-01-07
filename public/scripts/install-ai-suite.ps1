#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Installation PowerShell
.DESCRIPTION
    Script d'installation automatique de tous les outils IA pour MediaVault
.NOTES
    Version: 1.0
    Auteur: MediaVault
#>

param(
    [string]$InstallDir = "$env:USERPROFILE\MediaVault-AI",
    [switch]$SkipModels,
    [switch]$CPUOnly
)

$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# Colors
function Write-Step { param($msg) Write-Host "`n[ETAPE] $msg" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[ATTENTION] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERREUR] $msg" -ForegroundColor Red }

# Banner
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║           MEDIAVAULT AI SUITE - INSTALLATION                 ║
║           Script PowerShell avec gestion avancee             ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Host "Dossier d'installation: $InstallDir" -ForegroundColor Gray
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location $InstallDir

# Log file
$LogFile = "$InstallDir\install.log"
Start-Transcript -Path $LogFile -Append

# ============================================
# CHECK PREREQUISITES
# ============================================
Write-Step "Verification des prerequis"

# Check winget
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Err "winget non trouve. Installez App Installer depuis le Microsoft Store."
    exit 1
}
Write-OK "winget disponible"

# Check GPU
$HasGPU = $false
if (!$CPUOnly) {
    try {
        $nvidia = & nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
        if ($nvidia) {
            Write-OK "GPU NVIDIA detecte: $nvidia"
            $HasGPU = $true
        }
    } catch {
        Write-Warn "Pas de GPU NVIDIA detecte - Installation en mode CPU"
    }
}

# Check disk space (need at least 50GB)
$Drive = (Get-Item $InstallDir).PSDrive
$FreeSpace = [math]::Round((Get-PSDrive $Drive.Name).Free / 1GB, 2)
if ($FreeSpace -lt 50) {
    Write-Warn "Espace disque faible: ${FreeSpace}GB libre (recommande: 50GB+)"
}

# ============================================
# INSTALL PYTHON
# ============================================
Write-Step "Installation de Python 3.11"

$PythonPath = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
if (!(Test-Path $PythonPath)) {
    Write-Host "Telechargement et installation de Python 3.11..."
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent
    
    # Wait for installation
    Start-Sleep -Seconds 5
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-OK "Python 3.11 pret"

# ============================================
# INSTALL GIT
# ============================================
Write-Step "Verification de Git"

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Installation de Git..."
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-OK "Git disponible"

# ============================================
# INSTALL OLLAMA
# ============================================
Write-Step "Installation de Ollama"

if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Installation de Ollama..."
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent
    
    Start-Sleep -Seconds 3
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

if (!$SkipModels) {
    Write-Host "Telechargement des modeles recommandes..."
    
    # Start Ollama service
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    # Pull models
    $models = @("llama3.2:3b", "nomic-embed-text")
    foreach ($model in $models) {
        Write-Host "  Telechargement de $model..."
        & ollama pull $model
    }
}
Write-OK "Ollama installe"

# ============================================
# INSTALL COMFYUI
# ============================================
Write-Step "Installation de ComfyUI"

$ComfyUIPath = "$InstallDir\ComfyUI"
if (!(Test-Path $ComfyUIPath)) {
    Write-Host "Clonage de ComfyUI..."
    git clone https://github.com/comfyanonymous/ComfyUI.git
    
    Set-Location $ComfyUIPath
    
    Write-Host "Creation de l'environnement virtuel..."
    & python -m venv venv
    
    Write-Host "Installation des dependances..."
    & .\venv\Scripts\Activate.ps1
    
    if ($HasGPU) {
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
    } else {
        pip install torch torchvision torchaudio --quiet
    }
    
    pip install -r requirements.txt --quiet
    
    # Install ComfyUI Manager
    Write-Host "Installation de ComfyUI Manager..."
    Set-Location custom_nodes
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "ComfyUI installe"

# ============================================
# INSTALL WHISPER
# ============================================
Write-Step "Installation de Whisper API"

$WhisperPath = "$InstallDir\whisper-api"
if (!(Test-Path $WhisperPath)) {
    New-Item -ItemType Directory -Path $WhisperPath -Force | Out-Null
    Set-Location $WhisperPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    pip install openai-whisper flask flask-cors --quiet
    if ($HasGPU) {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    # Create server script
    @'
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os

app = Flask(__name__)
CORS(app)

model = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "whisper"})

@app.route("/transcribe", methods=["POST"])
def transcribe():
    global model
    if model is None:
        model = whisper.load_model("base")
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        audio.save(f.name)
        try:
            result = model.transcribe(f.name)
            return jsonify(result)
        finally:
            os.unlink(f.name)

if __name__ == "__main__":
    print("Whisper API running on http://localhost:9000")
    app.run(host="0.0.0.0", port=9000)
'@ | Out-File -FilePath "whisper_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "Whisper installe"

# ============================================
# INSTALL XTTS
# ============================================
Write-Step "Installation de XTTS (Text-to-Speech)"

$XTTSPath = "$InstallDir\xtts-api"
if (!(Test-Path $XTTSPath)) {
    New-Item -ItemType Directory -Path $XTTSPath -Force | Out-Null
    Set-Location $XTTSPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    pip install TTS flask flask-cors --quiet
    if ($HasGPU) {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    # Create server script
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile
import os

app = Flask(__name__)
CORS(app)

tts = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "xtts"})

@app.route("/synthesize", methods=["POST"])
def synthesize():
    global tts
    if tts is None:
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    
    data = request.json
    text = data.get("text", "")
    speaker_wav = data.get("speaker_wav")
    language = data.get("language", "fr")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        tts.tts_to_file(text=text, speaker_wav=speaker_wav, language=language, file_path=f.name)
        return send_file(f.name, mimetype="audio/wav")

if __name__ == "__main__":
    print("XTTS API running on http://localhost:8020")
    app.run(host="0.0.0.0", port=8020)
'@ | Out-File -FilePath "xtts_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "XTTS installe"

# ============================================
# INSTALL AI TOOLS
# ============================================
Write-Step "Installation des outils IA supplementaires"

$AIToolsPath = "$InstallDir\ai-tools"
if (!(Test-Path $AIToolsPath)) {
    New-Item -ItemType Directory -Path $AIToolsPath -Force | Out-Null
    Set-Location $AIToolsPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    $packages = @(
        "audiocraft",      # MusicGen
        "demucs",          # Stem separation
        "insightface",     # Face recognition
        "clip-interrogator", # Image analysis
        "realesrgan",      # Upscaling
        "rembg",           # Background removal
        "flask",
        "flask-cors"
    )
    
    foreach ($pkg in $packages) {
        Write-Host "  Installation de $pkg..."
        pip install $pkg --quiet 2>$null
    }
    
    if ($HasGPU) {
        pip install onnxruntime-gpu --quiet
    } else {
        pip install onnxruntime --quiet
    }
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "Outils IA installes"

# ============================================
# CREATE STARTUP SCRIPTS
# ============================================
Write-Step "Creation des scripts de demarrage"

# Start script
@"
@echo off
title MediaVault AI Services
echo Demarrage des services IA MediaVault...
echo.

:: Start Ollama
echo [1/3] Demarrage de Ollama...
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

:: Start ComfyUI
echo [2/3] Demarrage de ComfyUI...
cd /d "$InstallDir\ComfyUI"
start "ComfyUI" /min cmd /c "venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188"
timeout /t 2 /nobreak >nul

:: Start Whisper
echo [3/3] Demarrage de Whisper API...
cd /d "$InstallDir\whisper-api"
start "Whisper" /min cmd /c "venv\Scripts\activate.bat && python whisper_server.py"

echo.
echo ═══════════════════════════════════════════════════════════
echo   Services IA demarres avec succes!
echo ═══════════════════════════════════════════════════════════
echo.
echo   Ollama  : http://localhost:11434
echo   ComfyUI : http://localhost:8188
echo   Whisper : http://localhost:9000
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
"@ | Out-File -FilePath "$InstallDir\start-ai-services.bat" -Encoding ASCII

# Stop script
@"
@echo off
echo Arret des services IA MediaVault...
taskkill /F /IM ollama.exe 2>nul
taskkill /F /FI "WINDOWTITLE eq ComfyUI*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Whisper*" 2>nul
taskkill /F /FI "WINDOWTITLE eq XTTS*" 2>nul
echo Services arretes.
timeout /t 2
"@ | Out-File -FilePath "$InstallDir\stop-ai-services.bat" -Encoding ASCII

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MediaVault AI.lnk")
$Shortcut.TargetPath = "$InstallDir\start-ai-services.bat"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Demarrer les services IA MediaVault"
$Shortcut.Save()

Write-OK "Scripts de demarrage crees"

# ============================================
# CREATE CONFIG FILE
# ============================================
Write-Step "Creation du fichier de configuration"

$config = @{
    install_dir = $InstallDir
    gpu_enabled = $HasGPU
    installed_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    services = @{
        ollama = @{ port = 11434; url = "http://localhost:11434" }
        comfyui = @{ port = 8188; url = "http://localhost:8188" }
        whisper = @{ port = 9000; url = "http://localhost:9000" }
        xtts = @{ port = 8020; url = "http://localhost:8020" }
    }
}

$config | ConvertTo-Json -Depth 10 | Out-File -FilePath "$InstallDir\config.json" -Encoding UTF8

Write-OK "Configuration sauvegardee"

# ============================================
# COMPLETE
# ============================================
Stop-Transcript

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║              INSTALLATION TERMINEE AVEC SUCCES!              ║
╚══════════════════════════════════════════════════════════════╝

Services installes:
  • Ollama (LLM)         : http://localhost:11434
  • ComfyUI (Images)     : http://localhost:8188
  • Whisper (Audio)      : http://localhost:9000
  • XTTS (Voix)          : http://localhost:8020

Raccourcis:
  • Bureau: "MediaVault AI"
  • Scripts: $InstallDir\start-ai-services.bat
             $InstallDir\stop-ai-services.bat

Log d'installation: $LogFile

Pour demarrer: Double-cliquez sur "MediaVault AI" sur le bureau

"@ -ForegroundColor Green

Write-Host "Appuyez sur une touche pour terminer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
