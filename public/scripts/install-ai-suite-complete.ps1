#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Installation Complete (8 Services)
.DESCRIPTION
    Installe TOUS les services IA pour MediaVault avec validation finale
.NOTES
    Version: 2.0
    Services: Ollama, ComfyUI, Whisper, XTTS, MusicGen, Demucs, CLIP, ESRGAN
#>

param(
    [string]$InstallDir = "$env:USERPROFILE\MediaVault-AI",
    [switch]$SkipModels,
    [switch]$CPUOnly,
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# ============================================
# FONCTIONS UTILITAIRES
# ============================================
function Write-Step { param($msg) Write-Host "`n[ETAPE] $msg" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[ATTENTION] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERREUR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Gray }

function Test-ServiceHealth {
    param([string]$Url, [int]$TimeoutSec = 10)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Banner
Write-Host @"

╔══════════════════════════════════════════════════════════════════════╗
║          MEDIAVAULT AI SUITE - INSTALLATION COMPLETE                 ║
║              8 Services IA avec Support CORS                         ║
╚══════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Host "Dossier d'installation: $InstallDir" -ForegroundColor Gray
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "Mode: $(if($Docker){'Docker'}else{'Native Windows'})" -ForegroundColor Gray

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location $InstallDir

# Log file
$LogFile = "$InstallDir\install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
Start-Transcript -Path $LogFile -Append

# ============================================
# VERIFICATION DES PREREQUIS
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
$GPUInfo = "CPU Only"
if (!$CPUOnly) {
    try {
        $nvidia = & nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
        if ($nvidia) {
            Write-OK "GPU NVIDIA detecte: $nvidia"
            $HasGPU = $true
            $GPUInfo = $nvidia
        }
    } catch {
        # Check Intel Arc
        try {
            $intel = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*Intel*Arc*" }
            if ($intel) {
                Write-OK "GPU Intel Arc detecte: $($intel.Name)"
                $HasGPU = $true
                $GPUInfo = $intel.Name
            }
        } catch {}
    }
    
    if (!$HasGPU) {
        Write-Warn "Pas de GPU compatible detecte - Installation en mode CPU"
    }
}

# Check disk space
$Drive = (Get-Item $InstallDir).PSDrive
$FreeSpace = [math]::Round((Get-PSDrive $Drive.Name).Free / 1GB, 2)
Write-Info "Espace disque libre: ${FreeSpace} GB"
if ($FreeSpace -lt 50) {
    Write-Warn "Espace disque faible (recommande: 50GB+)"
}

# ============================================
# INSTALLATION DES OUTILS DE BASE
# ============================================
Write-Step "Installation de Python 3.11"

$PythonPath = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
if (!(Test-Path $PythonPath)) {
    Write-Host "Telechargement et installation de Python 3.11..."
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent
    Start-Sleep -Seconds 5
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-OK "Python 3.11 pret"

Write-Step "Verification de Git"
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Installation de Git..."
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-OK "Git disponible"

# ============================================
# 1. OLLAMA - LLM
# ============================================
Write-Step "[1/8] Installation de Ollama (LLM)"

if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent
    Start-Sleep -Seconds 3
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

if (!$SkipModels) {
    Write-Host "Telechargement des modeles..."
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    $models = @("llama3.2:3b", "nomic-embed-text")
    foreach ($model in $models) {
        Write-Host "  Telechargement de $model..."
        & ollama pull $model 2>$null
    }
}
Write-OK "Ollama installe"

# ============================================
# 2. COMFYUI - Images/Video
# ============================================
Write-Step "[2/8] Installation de ComfyUI (Images/Video)"

$ComfyUIPath = "$InstallDir\ComfyUI"
if (!(Test-Path $ComfyUIPath)) {
    git clone https://github.com/comfyanonymous/ComfyUI.git
    Set-Location $ComfyUIPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    if ($HasGPU) {
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
    } else {
        pip install torch torchvision torchaudio --quiet
    }
    
    pip install -r requirements.txt --quiet
    
    # Install ComfyUI Manager
    Set-Location custom_nodes
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "ComfyUI installe"

# ============================================
# 3. WHISPER - Speech to Text
# ============================================
Write-Step "[3/8] Installation de Whisper (STT)"

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
    
    # Create server script with full CORS
    @'
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

model = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "service": "whisper", "version": "1.0"})

@app.route("/transcribe", methods=["POST", "OPTIONS"])
def transcribe():
    if request.method == "OPTIONS":
        return "", 200
    global model
    if model is None:
        logger.info("Loading Whisper model...")
        model = whisper.load_model("base")
        logger.info("Model loaded")
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        audio.save(f.name)
        try:
            logger.info(f"Transcribing {f.name}...")
            result = model.transcribe(f.name)
            logger.info("Transcription complete")
            return jsonify(result)
        finally:
            os.unlink(f.name)

if __name__ == "__main__":
    print("=" * 60)
    print("WHISPER API - MediaVault")
    print("=" * 60)
    print("Endpoint: http://localhost:9000")
    print("Health: http://localhost:9000/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=9000, debug=False)
'@ | Out-File -FilePath "whisper_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "Whisper installe"

# ============================================
# 4. XTTS - Text to Speech
# ============================================
Write-Step "[4/8] Installation de XTTS (TTS)"

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
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

tts = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "service": "xtts", "version": "1.0"})

@app.route("/synthesize", methods=["POST", "OPTIONS"])
def synthesize():
    if request.method == "OPTIONS":
        return "", 200
    global tts
    if tts is None:
        logger.info("Loading XTTS model...")
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        logger.info("Model loaded")
    
    data = request.json
    text = data.get("text", "")
    speaker_wav = data.get("speaker_wav")
    language = data.get("language", "fr")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        tts.tts_to_file(text=text, speaker_wav=speaker_wav, language=language, file_path=f.name)
        return send_file(f.name, mimetype="audio/wav")

@app.route("/voices", methods=["GET"])
def voices():
    return jsonify({"voices": ["default"], "languages": ["fr", "en", "es", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko"]})

if __name__ == "__main__":
    print("=" * 60)
    print("XTTS API - MediaVault")
    print("=" * 60)
    print("Endpoint: http://localhost:8020")
    print("Health: http://localhost:8020/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8020, debug=False)
'@ | Out-File -FilePath "xtts_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "XTTS installe"

# ============================================
# 5. MUSICGEN - Music Generation
# ============================================
Write-Step "[5/8] Installation de MusicGen"

$MusicGenPath = "$InstallDir\musicgen-api"
if (!(Test-Path $MusicGenPath)) {
    New-Item -ItemType Directory -Path $MusicGenPath -Force | Out-Null
    Set-Location $MusicGenPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    pip install audiocraft flask flask-cors --quiet
    if ($HasGPU) {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

model = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "service": "musicgen", "version": "1.0"})

@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        return "", 200
    global model
    
    try:
        from audiocraft.models import MusicGen
        if model is None:
            logger.info("Loading MusicGen model...")
            model = MusicGen.get_pretrained("facebook/musicgen-small")
            model.set_generation_params(duration=10)
            logger.info("Model loaded")
        
        data = request.json
        prompt = data.get("prompt", "ambient electronic music")
        duration = data.get("duration", 10)
        
        model.set_generation_params(duration=duration)
        wav = model.generate([prompt])
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            import torchaudio
            torchaudio.save(f.name, wav[0].cpu(), 32000)
            return send_file(f.name, mimetype="audio/wav")
    except Exception as e:
        logger.error(f"Generation error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("MUSICGEN API - MediaVault")
    print("=" * 60)
    print("Endpoint: http://localhost:8030")
    print("Health: http://localhost:8030/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8030, debug=False)
'@ | Out-File -FilePath "musicgen_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "MusicGen installe"

# ============================================
# 6. DEMUCS - Audio Stem Separation
# ============================================
Write-Step "[6/8] Installation de Demucs"

$DemucsPath = "$InstallDir\demucs-api"
if (!(Test-Path $DemucsPath)) {
    New-Item -ItemType Directory -Path $DemucsPath -Force | Out-Null
    Set-Location $DemucsPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    pip install demucs flask flask-cors --quiet
    if ($HasGPU) {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile
import os
import subprocess
import logging
import zipfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "service": "demucs", "version": "1.0"})

@app.route("/separate", methods=["POST", "OPTIONS"])
def separate():
    if request.method == "OPTIONS":
        return "", 200
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    model = request.form.get("model", "htdemucs")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.mp3")
        audio.save(input_path)
        
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir)
        
        logger.info(f"Separating with model {model}...")
        subprocess.run([
            "demucs", "-n", model, "-o", output_dir, input_path
        ], check=True)
        
        # Zip results
        zip_path = os.path.join(tmpdir, "stems.zip")
        with zipfile.ZipFile(zip_path, 'w') as zf:
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    zf.write(filepath, os.path.relpath(filepath, output_dir))
        
        return send_file(zip_path, mimetype="application/zip", as_attachment=True, download_name="stems.zip")

if __name__ == "__main__":
    print("=" * 60)
    print("DEMUCS API - MediaVault")
    print("=" * 60)
    print("Endpoint: http://localhost:8040")
    print("Health: http://localhost:8040/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8040, debug=False)
'@ | Out-File -FilePath "demucs_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "Demucs installe"

# ============================================
# 7. CLIP - Image Analysis
# ============================================
Write-Step "[7/8] Installation de CLIP (Analyse)"

$CLIPPath = "$InstallDir\clip-api"
if (!(Test-Path $CLIPPath)) {
    New-Item -ItemType Directory -Path $CLIPPath -Force | Out-Null
    Set-Location $CLIPPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    pip install clip-interrogator flask flask-cors pillow --quiet
    if ($HasGPU) {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    @'
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

ci = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "service": "clip", "version": "1.0"})

@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    if request.method == "OPTIONS":
        return "", 200
    global ci
    
    try:
        from clip_interrogator import Config, Interrogator
        if ci is None:
            logger.info("Loading CLIP model...")
            config = Config(clip_model_name="ViT-L-14/openai")
            ci = Interrogator(config)
            logger.info("Model loaded")
        
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files["image"]
        image = Image.open(io.BytesIO(image_file.read())).convert("RGB")
        
        mode = request.form.get("mode", "fast")
        
        if mode == "full":
            result = ci.interrogate(image)
        else:
            result = ci.interrogate_fast(image)
        
        return jsonify({"description": result, "mode": mode})
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/embed", methods=["POST", "OPTIONS"])
def embed():
    if request.method == "OPTIONS":
        return "", 200
    global ci
    
    try:
        from clip_interrogator import Config, Interrogator
        if ci is None:
            config = Config(clip_model_name="ViT-L-14/openai")
            ci = Interrogator(config)
        
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files["image"]
        image = Image.open(io.BytesIO(image_file.read())).convert("RGB")
        
        # Get image features
        import torch
        with torch.no_grad():
            image_features = ci.clip_model.encode_image(ci.clip_preprocess(image).unsqueeze(0).to(ci.device))
            image_features /= image_features.norm(dim=-1, keepdim=True)
        
        return jsonify({"embedding": image_features[0].cpu().numpy().tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("CLIP API - MediaVault")
    print("=" * 60)
    print("Endpoint: http://localhost:8060")
    print("Health: http://localhost:8060/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8060, debug=False)
'@ | Out-File -FilePath "clip_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "CLIP installe"

# ============================================
# 8. ESRGAN - Image Upscaling
# ============================================
Write-Step "[8/8] Installation de ESRGAN (Upscale)"

$ESRGANPath = "$InstallDir\esrgan-api"
if (!(Test-Path $ESRGANPath)) {
    New-Item -ItemType Directory -Path $ESRGANPath -Force | Out-Null
    Set-Location $ESRGANPath
    
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    pip install realesrgan flask flask-cors pillow --quiet
    if ($HasGPU) {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import io
import tempfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

upsampler = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "service": "esrgan", "version": "1.0"})

@app.route("/upscale", methods=["POST", "OPTIONS"])
def upscale():
    if request.method == "OPTIONS":
        return "", 200
    global upsampler
    
    try:
        from realesrgan import RealESRGANer
        from basicsr.archs.rrdbnet_arch import RRDBNet
        import numpy as np
        import cv2
        
        if upsampler is None:
            logger.info("Loading ESRGAN model...")
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            upsampler = RealESRGANer(
                scale=4,
                model_path="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
                model=model,
                tile=0,
                tile_pad=10,
                pre_pad=0,
                half=True
            )
            logger.info("Model loaded")
        
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files["image"]
        scale = int(request.form.get("scale", 4))
        
        # Read image
        img = Image.open(io.BytesIO(image_file.read())).convert("RGB")
        img_np = np.array(img)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        
        # Upscale
        logger.info(f"Upscaling image {img.size} x{scale}...")
        output, _ = upsampler.enhance(img_bgr, outscale=scale)
        
        # Convert back
        output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
        output_img = Image.fromarray(output_rgb)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
            output_img.save(f.name, "PNG")
            return send_file(f.name, mimetype="image/png")
    except Exception as e:
        logger.error(f"Upscale error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("ESRGAN API - MediaVault")
    print("=" * 60)
    print("Endpoint: http://localhost:8070")
    print("Health: http://localhost:8070/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8070, debug=False)
'@ | Out-File -FilePath "esrgan_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "ESRGAN installe"

# ============================================
# CREATION DES SCRIPTS DE DEMARRAGE
# ============================================
Write-Step "Creation des scripts de demarrage"

# Start script for ALL 8 services
@"
@echo off
chcp 65001 >nul
title MediaVault AI Suite - 8 Services
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║          MEDIAVAULT AI SUITE - DEMARRAGE DES 8 SERVICES             ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

set "AI_DIR=$InstallDir"
set "ERRORS=0"

:: 1. Ollama
echo [1/8] Demarrage de Ollama (LLM)...
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

:: 2. ComfyUI
echo [2/8] Demarrage de ComfyUI (Images)...
if exist "%AI_DIR%\ComfyUI" (
    cd /d "%AI_DIR%\ComfyUI"
    start "ComfyUI" /min cmd /c "call venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188"
) else (
    echo [ERREUR] ComfyUI non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 3. Whisper
echo [3/8] Demarrage de Whisper (STT)...
if exist "%AI_DIR%\whisper-api" (
    cd /d "%AI_DIR%\whisper-api"
    start "Whisper" /min cmd /c "call venv\Scripts\activate.bat && python whisper_server.py"
) else (
    echo [ERREUR] Whisper non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 4. XTTS
echo [4/8] Demarrage de XTTS (TTS)...
if exist "%AI_DIR%\xtts-api" (
    cd /d "%AI_DIR%\xtts-api"
    start "XTTS" /min cmd /c "call venv\Scripts\activate.bat && python xtts_server.py"
) else (
    echo [ERREUR] XTTS non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 5. MusicGen
echo [5/8] Demarrage de MusicGen...
if exist "%AI_DIR%\musicgen-api" (
    cd /d "%AI_DIR%\musicgen-api"
    start "MusicGen" /min cmd /c "call venv\Scripts\activate.bat && python musicgen_server.py"
) else (
    echo [ERREUR] MusicGen non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 6. Demucs
echo [6/8] Demarrage de Demucs...
if exist "%AI_DIR%\demucs-api" (
    cd /d "%AI_DIR%\demucs-api"
    start "Demucs" /min cmd /c "call venv\Scripts\activate.bat && python demucs_server.py"
) else (
    echo [ERREUR] Demucs non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 7. CLIP
echo [7/8] Demarrage de CLIP (Analyse)...
if exist "%AI_DIR%\clip-api" (
    cd /d "%AI_DIR%\clip-api"
    start "CLIP" /min cmd /c "call venv\Scripts\activate.bat && python clip_server.py"
) else (
    echo [ERREUR] CLIP non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 8. ESRGAN
echo [8/8] Demarrage de ESRGAN (Upscale)...
if exist "%AI_DIR%\esrgan-api" (
    cd /d "%AI_DIR%\esrgan-api"
    start "ESRGAN" /min cmd /c "call venv\Scripts\activate.bat && python esrgan_server.py"
) else (
    echo [ERREUR] ESRGAN non installe
    set /a ERRORS+=1
)

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                    SERVICES IA DEMARRES                             ║
echo ╠══════════════════════════════════════════════════════════════════════╣
echo ║  1. Ollama (LLM)      : http://localhost:11434                       ║
echo ║  2. ComfyUI (Images)  : http://localhost:8188                        ║
echo ║  3. Whisper (STT)     : http://localhost:9000                        ║
echo ║  4. XTTS (TTS)        : http://localhost:8020                        ║
echo ║  5. MusicGen          : http://localhost:8030                        ║
echo ║  6. Demucs            : http://localhost:8040                        ║
echo ║  7. CLIP (Analyse)    : http://localhost:8060                        ║
echo ║  8. ESRGAN (Upscale)  : http://localhost:8070                        ║
echo ╠══════════════════════════════════════════════════════════════════════╣
echo ║  Erreurs: %ERRORS%                                                          ║
echo ║  Pour arreter: stop-ai-services.bat                                  ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

:: Wait and verify services
echo Verification des services dans 10 secondes...
timeout /t 10 /nobreak >nul

echo.
echo ═══ VERIFICATION DES SERVICES ═══
echo.

:: Check each service
curl -s http://localhost:11434/api/tags >nul 2>&1 && echo [OK] Ollama || echo [X] Ollama
curl -s http://localhost:8188/system_stats >nul 2>&1 && echo [OK] ComfyUI || echo [X] ComfyUI
curl -s http://localhost:9000/health >nul 2>&1 && echo [OK] Whisper || echo [X] Whisper
curl -s http://localhost:8020/health >nul 2>&1 && echo [OK] XTTS || echo [X] XTTS
curl -s http://localhost:8030/health >nul 2>&1 && echo [OK] MusicGen || echo [X] MusicGen
curl -s http://localhost:8040/health >nul 2>&1 && echo [OK] Demucs || echo [X] Demucs
curl -s http://localhost:8060/health >nul 2>&1 && echo [OK] CLIP || echo [X] CLIP
curl -s http://localhost:8070/health >nul 2>&1 && echo [OK] ESRGAN || echo [X] ESRGAN

echo.
echo Les services tournent en arriere-plan.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
"@ | Out-File -FilePath "$InstallDir\start-ai-services.bat" -Encoding ASCII

# Stop script
@"
@echo off
chcp 65001 >nul
title MediaVault AI Suite - Arret
color 0C

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║          MEDIAVAULT AI SUITE - ARRET DES SERVICES                   ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

echo Arret des services IA...

:: Kill all Python servers
taskkill /F /IM python.exe 2>nul
echo [OK] Serveurs Python arretes

:: Kill Ollama
taskkill /F /IM ollama.exe 2>nul
echo [OK] Ollama arrete

:: Kill by window title (fallback)
taskkill /F /FI "WINDOWTITLE eq Ollama*" 2>nul
taskkill /F /FI "WINDOWTITLE eq ComfyUI*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Whisper*" 2>nul
taskkill /F /FI "WINDOWTITLE eq XTTS*" 2>nul
taskkill /F /FI "WINDOWTITLE eq MusicGen*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Demucs*" 2>nul
taskkill /F /FI "WINDOWTITLE eq CLIP*" 2>nul
taskkill /F /FI "WINDOWTITLE eq ESRGAN*" 2>nul

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║              TOUS LES SERVICES ONT ETE ARRETES                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
timeout /t 3
"@ | Out-File -FilePath "$InstallDir\stop-ai-services.bat" -Encoding ASCII

Write-OK "Scripts de demarrage crees"

# ============================================
# CREATE UNINSTALL SCRIPT
# ============================================
Write-Step "Creation du script de desinstallation"

@"
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Desinstallation Complete
.DESCRIPTION
    Desinstalle tous les services IA et nettoie les fichiers
#>

param(
    [switch]$KeepModels,
    [switch]$Force
)

`$InstallDir = "$InstallDir"

Write-Host @"

╔══════════════════════════════════════════════════════════════════════╗
║          MEDIAVAULT AI SUITE - DESINSTALLATION COMPLETE             ║
╚══════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Red

if (!`$Force) {
    `$confirm = Read-Host "Voulez-vous vraiment desinstaller MediaVault AI Suite? (oui/non)"
    if (`$confirm -ne "oui") {
        Write-Host "Desinstallation annulee." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`n[1/5] Arret des services..." -ForegroundColor Cyan
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Services arretes" -ForegroundColor Green

Write-Host "`n[2/5] Suppression des dossiers..." -ForegroundColor Cyan
`$folders = @(
    "ComfyUI",
    "whisper-api",
    "xtts-api",
    "musicgen-api",
    "demucs-api",
    "clip-api",
    "esrgan-api",
    "ai-tools"
)

foreach (`$folder in `$folders) {
    `$path = Join-Path `$InstallDir `$folder
    if (Test-Path `$path) {
        Write-Host "  Suppression de `$folder..."
        Remove-Item -Path `$path -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "[OK] Dossiers supprimes" -ForegroundColor Green

Write-Host "`n[3/5] Desinstallation de Ollama..." -ForegroundColor Cyan
if (!`$KeepModels) {
    winget uninstall --id Ollama.Ollama --silent 2>`$null
    `$ollamaPath = "`$env:USERPROFILE\.ollama"
    if (Test-Path `$ollamaPath) {
        Remove-Item -Path `$ollamaPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Ollama desinstalle" -ForegroundColor Green
} else {
    Write-Host "[INFO] Ollama conserve (modeles preserves)" -ForegroundColor Yellow
}

Write-Host "`n[4/5] Suppression des raccourcis..." -ForegroundColor Cyan
`$shortcut = "`$env:USERPROFILE\Desktop\MediaVault AI.lnk"
if (Test-Path `$shortcut) {
    Remove-Item -Path `$shortcut -Force
}
Write-Host "[OK] Raccourcis supprimes" -ForegroundColor Green

Write-Host "`n[5/5] Nettoyage final..." -ForegroundColor Cyan
`$scripts = @("start-ai-services.bat", "stop-ai-services.bat", "config.json")
foreach (`$script in `$scripts) {
    `$path = Join-Path `$InstallDir `$script
    if (Test-Path `$path) {
        Remove-Item -Path `$path -Force -ErrorAction SilentlyContinue
    }
}

# Remove install dir if empty
if ((Get-ChildItem `$InstallDir -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
    Remove-Item -Path `$InstallDir -Force -ErrorAction SilentlyContinue
}
Write-Host "[OK] Nettoyage termine" -ForegroundColor Green

Write-Host @"

╔══════════════════════════════════════════════════════════════════════╗
║              DESINSTALLATION TERMINEE AVEC SUCCES                   ║
╚══════════════════════════════════════════════════════════════════════╝

MediaVault AI Suite a ete completement desinstalle.
Vous pouvez reinstaller a tout moment avec install-ai-suite-complete.ps1

"@ -ForegroundColor Green

Write-Host "Appuyez sur une touche pour fermer..."
`$null = `$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@ | Out-File -FilePath "$InstallDir\uninstall-ai-suite.ps1" -Encoding UTF8

Write-OK "Script de desinstallation cree"

# ============================================
# CREATE CONFIG FILE
# ============================================
Write-Step "Creation du fichier de configuration"

$config = @{
    version = "2.0"
    install_dir = $InstallDir
    gpu_enabled = $HasGPU
    gpu_info = $GPUInfo
    installed_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    services = @{
        ollama = @{ port = 11434; url = "http://localhost:11434"; health = "/api/tags" }
        comfyui = @{ port = 8188; url = "http://localhost:8188"; health = "/system_stats" }
        whisper = @{ port = 9000; url = "http://localhost:9000"; health = "/health" }
        xtts = @{ port = 8020; url = "http://localhost:8020"; health = "/health" }
        musicgen = @{ port = 8030; url = "http://localhost:8030"; health = "/health" }
        demucs = @{ port = 8040; url = "http://localhost:8040"; health = "/health" }
        clip = @{ port = 8060; url = "http://localhost:8060"; health = "/health" }
        esrgan = @{ port = 8070; url = "http://localhost:8070"; health = "/health" }
    }
}

$config | ConvertTo-Json -Depth 10 | Out-File -FilePath "$InstallDir\config.json" -Encoding UTF8

Write-OK "Configuration sauvegardee"

# ============================================
# CREATE DESKTOP SHORTCUT
# ============================================
Write-Step "Creation du raccourci bureau"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MediaVault AI.lnk")
$Shortcut.TargetPath = "$InstallDir\start-ai-services.bat"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Demarrer les 8 services IA MediaVault"
$Shortcut.Save()

Write-OK "Raccourci cree sur le bureau"

# ============================================
# FINAL VALIDATION
# ============================================
Write-Step "Validation finale de l'installation"

Write-Host "`nDemarrage des services pour validation..." -ForegroundColor Yellow
Start-Process -FilePath "$InstallDir\start-ai-services.bat" -WindowStyle Hidden
Start-Sleep -Seconds 15

$services = @(
    @{Name="Ollama"; Url="http://localhost:11434/api/tags"},
    @{Name="ComfyUI"; Url="http://localhost:8188/system_stats"},
    @{Name="Whisper"; Url="http://localhost:9000/health"},
    @{Name="XTTS"; Url="http://localhost:8020/health"},
    @{Name="MusicGen"; Url="http://localhost:8030/health"},
    @{Name="Demucs"; Url="http://localhost:8040/health"},
    @{Name="CLIP"; Url="http://localhost:8060/health"},
    @{Name="ESRGAN"; Url="http://localhost:8070/health"}
)

$onlineCount = 0
$results = @()

foreach ($service in $services) {
    $isOnline = Test-ServiceHealth -Url $service.Url -TimeoutSec 5
    if ($isOnline) {
        Write-Host "  [OK] $($service.Name)" -ForegroundColor Green
        $onlineCount++
        $results += @{Name=$service.Name; Status="OK"}
    } else {
        Write-Host "  [X] $($service.Name) - Non accessible" -ForegroundColor Red
        $results += @{Name=$service.Name; Status="ERREUR"}
    }
}

# Save validation results
$validation = @{
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    online_count = $onlineCount
    total_count = $services.Count
    results = $results
}
$validation | ConvertTo-Json -Depth 10 | Out-File -FilePath "$InstallDir\validation.json" -Encoding UTF8

# ============================================
# COMPLETION
# ============================================
Stop-Transcript

$successRate = [math]::Round(($onlineCount / $services.Count) * 100, 0)

Write-Host @"

╔══════════════════════════════════════════════════════════════════════╗
║              INSTALLATION TERMINEE - VALIDATION: $successRate%                   ║
╚══════════════════════════════════════════════════════════════════════╝

Services installes ($onlineCount/8 en ligne):
  • Ollama (LLM)          : http://localhost:11434
  • ComfyUI (Images)      : http://localhost:8188
  • Whisper (STT)         : http://localhost:9000
  • XTTS (TTS)            : http://localhost:8020
  • MusicGen              : http://localhost:8030
  • Demucs                : http://localhost:8040
  • CLIP (Analyse)        : http://localhost:8060
  • ESRGAN (Upscale)      : http://localhost:8070

Scripts disponibles:
  • Demarrage: $InstallDir\start-ai-services.bat
  • Arret:     $InstallDir\stop-ai-services.bat
  • Desinstallation: $InstallDir\uninstall-ai-suite.ps1

Raccourci bureau: "MediaVault AI"
Log d'installation: $LogFile
Configuration: $InstallDir\config.json

"@ -ForegroundColor $(if($successRate -ge 75){"Green"}elseif($successRate -ge 50){"Yellow"}else{"Red"})

if ($successRate -lt 100) {
    Write-Host "ATTENTION: Certains services n'ont pas demarre correctement." -ForegroundColor Yellow
    Write-Host "Consultez les logs dans $InstallDir pour plus de details." -ForegroundColor Yellow
}

Write-Host "`nAppuyez sur une touche pour terminer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
