#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Installation Complete (8 Services)
.DESCRIPTION
    Installe TOUS les services IA pour MediaVault avec support Intel Arc et NVIDIA
.NOTES
    Version: 3.0
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
function Write-OK { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [ATTENTION] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "  [ERREUR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  [INFO] $msg" -ForegroundColor Gray }

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

==============================================================================
          MEDIAVAULT AI SUITE - INSTALLATION COMPLETE v3.0
              8 Services IA avec Support CORS et GPU
==============================================================================

"@ -ForegroundColor Magenta

Write-Host "Dossier d'installation: $InstallDir" -ForegroundColor Gray
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

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

# Check GPU - Enhanced detection
$HasGPU = $false
$GPUType = "cpu"
$GPUInfo = "CPU Only"
$TorchIndex = "https://download.pytorch.org/whl/cpu"

if (!$CPUOnly) {
    # Check NVIDIA first
    try {
        $nvidia = & nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
        if ($nvidia) {
            Write-OK "GPU NVIDIA detecte: $nvidia"
            $HasGPU = $true
            $GPUType = "nvidia"
            $GPUInfo = $nvidia
            $TorchIndex = "https://download.pytorch.org/whl/cu121"
        }
    } catch {}
    
    # Check Intel Arc if no NVIDIA
    if (!$HasGPU) {
        try {
            $intel = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*Intel*Arc*" -or $_.Name -like "*Intel*A7*" -or $_.Name -like "*Intel*A5*" }
            if ($intel) {
                Write-OK "GPU Intel Arc detecte: $($intel.Name)"
                $HasGPU = $true
                $GPUType = "intel-arc"
                $GPUInfo = $intel.Name
                # Intel Arc uses CPU PyTorch with Intel Extension
                $TorchIndex = "https://download.pytorch.org/whl/cpu"
                Write-Info "Utilisation de Intel Extension for PyTorch (IPEX)"
            }
        } catch {}
    }
    
    # Check AMD
    if (!$HasGPU) {
        try {
            $amd = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*AMD*" -or $_.Name -like "*Radeon*" }
            if ($amd) {
                Write-Warn "GPU AMD detecte: $($amd.Name) - Support limite, mode CPU utilise"
                $GPUType = "amd"
                $GPUInfo = $amd.Name
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
if ($FreeSpace -lt 30) {
    Write-Warn "Espace disque faible! Recommande: 50GB+ pour tous les modeles"
}

# ============================================
# INSTALLATION DES OUTILS DE BASE
# ============================================
Write-Step "Installation de Python 3.11"

$PythonInstalled = $false
try {
    $pythonVersion = & python --version 2>$null
    if ($pythonVersion -like "*3.11*" -or $pythonVersion -like "*3.10*" -or $pythonVersion -like "*3.12*") {
        Write-OK "Python deja installe: $pythonVersion"
        $PythonInstalled = $true
    }
} catch {}

if (!$PythonInstalled) {
    Write-Host "Installation de Python 3.11..."
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent
    Start-Sleep -Seconds 5
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-OK "Python 3.11 installe"
}

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

$OllamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue
if (!$OllamaInstalled) {
    Write-Host "Installation de Ollama..."
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent
    Start-Sleep -Seconds 3
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

if (!$SkipModels) {
    Write-Host "Telechargement des modeles Ollama..."
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    $models = @("llama3.2:3b", "nomic-embed-text")
    foreach ($model in $models) {
        Write-Info "Telechargement de $model..."
        try {
            & ollama pull $model 2>$null
        } catch {
            Write-Warn "Impossible de telecharger $model"
        }
    }
}
Write-OK "Ollama installe"

# ============================================
# 2. COMFYUI - Images/Video
# ============================================
Write-Step "[2/8] Installation de ComfyUI (Images/Video)"

$ComfyUIPath = "$InstallDir\ComfyUI"
if (!(Test-Path $ComfyUIPath)) {
    Write-Host "Clonage de ComfyUI..."
    git clone https://github.com/comfyanonymous/ComfyUI.git 2>$null
    Set-Location $ComfyUIPath
    
    Write-Host "Creation de l'environnement virtuel..."
    & python -m venv venv
    & .\venv\Scripts\Activate.ps1
    
    Write-Host "Installation des dependances PyTorch..."
    if ($GPUType -eq "nvidia") {
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
    } elseif ($GPUType -eq "intel-arc") {
        pip install torch torchvision torchaudio --quiet
        pip install intel-extension-for-pytorch --quiet
    } else {
        pip install torch torchvision torchaudio --quiet
    }
    
    Write-Host "Installation des requirements ComfyUI..."
    pip install -r requirements.txt --quiet
    
    # Install ComfyUI Manager
    Set-Location custom_nodes
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git 2>$null
    
    deactivate
    Set-Location $InstallDir
    Write-OK "ComfyUI installe"
} else {
    Write-Info "ComfyUI deja installe"
}

# ============================================
# HELPER: Create Flask Server with CORS
# ============================================
function New-FlaskServer {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [int]$Port,
        [string]$ServerCode
    )
    
    Write-Step "Installation de $ServiceName"
    
    $ServiceDir = "$InstallDir\$ServicePath"
    if (!(Test-Path $ServiceDir)) {
        New-Item -ItemType Directory -Path $ServiceDir -Force | Out-Null
        Set-Location $ServiceDir
        
        Write-Host "Creation de l'environnement virtuel..."
        & python -m venv venv
        & .\venv\Scripts\Activate.ps1
        
        Write-Host "Installation des dependances..."
        pip install flask flask-cors --quiet
        
        if ($GPUType -eq "nvidia") {
            pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
        } elseif ($GPUType -eq "intel-arc") {
            pip install torch --quiet
            pip install intel-extension-for-pytorch --quiet
        } else {
            pip install torch --quiet
        }
        
        # Write server file
        $ServerCode | Out-File -FilePath "${ServicePath}_server.py".Replace("-api", "") -Encoding UTF8
        
        deactivate
        Set-Location $InstallDir
        Write-OK "$ServiceName installe"
    } else {
        Write-Info "$ServiceName deja installe"
    }
}

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
    if ($GPUType -eq "nvidia") {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
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
CORS(app, resources={r"/*": {"origins": "*"}})

model = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
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
            result = model.transcribe(f.name)
            return jsonify(result)
        finally:
            os.unlink(f.name)

if __name__ == "__main__":
    print("=" * 60)
    print("WHISPER API - MediaVault")
    print("Port: 9000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=9000, debug=False, threaded=True)
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
    if ($GPUType -eq "nvidia") {
        pip install torch --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

tts = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
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
    language = data.get("language", "fr")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        tts.tts_to_file(text=text, language=language, file_path=f.name)
        return send_file(f.name, mimetype="audio/wav")

@app.route("/voices", methods=["GET"])
def voices():
    return jsonify({"voices": ["default"], "languages": ["fr", "en", "es", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko"]})

if __name__ == "__main__":
    print("=" * 60)
    print("XTTS API - MediaVault")
    print("Port: 8020")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8020, debug=False, threaded=True)
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
    if ($GPUType -eq "nvidia") {
        pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
    }
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

model = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    return jsonify({"status": "ok", "service": "musicgen", "version": "1.0"})

@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        return "", 200
    global model
    
    try:
        from audiocraft.models import MusicGen
        import torchaudio
        
        if model is None:
            logger.info("Loading MusicGen model...")
            model = MusicGen.get_pretrained("facebook/musicgen-small")
            model.set_generation_params(duration=10)
            logger.info("Model loaded")
        
        data = request.json
        prompt = data.get("prompt", "ambient electronic music")
        duration = min(data.get("duration", 10), 30)
        
        model.set_generation_params(duration=duration)
        wav = model.generate([prompt])
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            torchaudio.save(f.name, wav[0].cpu(), 32000)
            return send_file(f.name, mimetype="audio/wav")
    except Exception as e:
        logger.error(f"Generation error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("MUSICGEN API - MediaVault")
    print("Port: 8030")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8030, debug=False, threaded=True)
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
    if ($GPUType -eq "nvidia") {
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
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
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
        subprocess.run(["demucs", "-n", model, "-o", output_dir, input_path], check=True)
        
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
    print("Port: 8040")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8040, debug=False, threaded=True)
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
    if ($GPUType -eq "nvidia") {
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
CORS(app, resources={r"/*": {"origins": "*"}})

ci = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
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
        result = ci.interrogate_fast(image) if mode == "fast" else ci.interrogate(image)
        
        return jsonify({"description": result, "mode": mode})
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("CLIP API - MediaVault")
    print("Port: 8060")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8060, debug=False, threaded=True)
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
    
    pip install realesrgan flask flask-cors pillow opencv-python --quiet
    if ($GPUType -eq "nvidia") {
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
CORS(app, resources={r"/*": {"origins": "*"}})

upsampler = None

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
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
                model=model, tile=0, tile_pad=10, pre_pad=0, half=True
            )
            logger.info("Model loaded")
        
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files["image"]
        scale = min(int(request.form.get("scale", 4)), 8)
        
        img = Image.open(io.BytesIO(image_file.read())).convert("RGB")
        img_np = np.array(img)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        
        logger.info(f"Upscaling image {img.size} x{scale}...")
        output, _ = upsampler.enhance(img_bgr, outscale=scale)
        
        output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
        output_img = Image.fromarray(output_rgb)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
            output_img.save(f.name, "PNG")
            return send_file(f.name, mimetype="image/png")
    except Exception as e:
        logger.error(f"Upscale error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("ESRGAN API - MediaVault")
    print("Port: 8070")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8070, debug=False, threaded=True)
'@ | Out-File -FilePath "esrgan_server.py" -Encoding UTF8
    
    deactivate
    Set-Location $InstallDir
}
Write-OK "ESRGAN installe"

# ============================================
# CREATION DES SCRIPTS DE DEMARRAGE
# ============================================
Write-Step "Creation des scripts de demarrage"

# Start script
@"
@echo off
chcp 65001 >nul
title MediaVault AI Suite - 8 Services
color 0A

echo.
echo ==============================================================================
echo          MEDIAVAULT AI SUITE - DEMARRAGE DES 8 SERVICES
echo ==============================================================================
echo.

set "AI_DIR=$InstallDir"
set "ERRORS=0"
set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%date% %time%] Demarrage des services... > "%LOG_DIR%\startup.log"

echo [1/8] Demarrage de Ollama...
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

echo [2/8] Demarrage de ComfyUI...
if exist "%AI_DIR%\ComfyUI" (
    cd /d "%AI_DIR%\ComfyUI"
    start "ComfyUI" /min cmd /c "call venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188 2>> "%LOG_DIR%\comfyui.log""
) else (
    echo [ERREUR] ComfyUI non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

echo [3/8] Demarrage de Whisper...
if exist "%AI_DIR%\whisper-api\whisper_server.py" (
    cd /d "%AI_DIR%\whisper-api"
    start "Whisper" /min cmd /c "call venv\Scripts\activate.bat && python whisper_server.py 2>> "%LOG_DIR%\whisper.log""
) else (
    echo [ERREUR] Whisper non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

echo [4/8] Demarrage de XTTS...
if exist "%AI_DIR%\xtts-api\xtts_server.py" (
    cd /d "%AI_DIR%\xtts-api"
    start "XTTS" /min cmd /c "call venv\Scripts\activate.bat && python xtts_server.py 2>> "%LOG_DIR%\xtts.log""
) else (
    echo [ERREUR] XTTS non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

echo [5/8] Demarrage de MusicGen...
if exist "%AI_DIR%\musicgen-api\musicgen_server.py" (
    cd /d "%AI_DIR%\musicgen-api"
    start "MusicGen" /min cmd /c "call venv\Scripts\activate.bat && python musicgen_server.py 2>> "%LOG_DIR%\musicgen.log""
) else (
    echo [ERREUR] MusicGen non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

echo [6/8] Demarrage de Demucs...
if exist "%AI_DIR%\demucs-api\demucs_server.py" (
    cd /d "%AI_DIR%\demucs-api"
    start "Demucs" /min cmd /c "call venv\Scripts\activate.bat && python demucs_server.py 2>> "%LOG_DIR%\demucs.log""
) else (
    echo [ERREUR] Demucs non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

echo [7/8] Demarrage de CLIP...
if exist "%AI_DIR%\clip-api\clip_server.py" (
    cd /d "%AI_DIR%\clip-api"
    start "CLIP" /min cmd /c "call venv\Scripts\activate.bat && python clip_server.py 2>> "%LOG_DIR%\clip.log""
) else (
    echo [ERREUR] CLIP non installe
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

echo [8/8] Demarrage de ESRGAN...
if exist "%AI_DIR%\esrgan-api\esrgan_server.py" (
    cd /d "%AI_DIR%\esrgan-api"
    start "ESRGAN" /min cmd /c "call venv\Scripts\activate.bat && python esrgan_server.py 2>> "%LOG_DIR%\esrgan.log""
) else (
    echo [ERREUR] ESRGAN non installe
    set /a ERRORS+=1
)

echo.
echo ==============================================================================
echo                         SERVICES IA DEMARRES
echo ==============================================================================
echo   1. Ollama       : http://localhost:11434
echo   2. ComfyUI      : http://localhost:8188
echo   3. Whisper      : http://localhost:9000
echo   4. XTTS         : http://localhost:8020
echo   5. MusicGen     : http://localhost:8030
echo   6. Demucs       : http://localhost:8040
echo   7. CLIP         : http://localhost:8060
echo   8. ESRGAN       : http://localhost:8070
echo ==============================================================================
echo   Erreurs: %ERRORS%  ^|  Logs: %LOG_DIR%
echo ==============================================================================
echo.

echo Verification des services dans 15 secondes...
timeout /t 15 /nobreak >nul

echo.
echo Verification des services...
curl -s http://localhost:11434/api/tags >nul 2>&1 && echo [OK] Ollama || echo [X] Ollama
curl -s http://localhost:8188/system_stats >nul 2>&1 && echo [OK] ComfyUI || echo [X] ComfyUI
curl -s http://localhost:9000/health >nul 2>&1 && echo [OK] Whisper || echo [X] Whisper
curl -s http://localhost:8020/health >nul 2>&1 && echo [OK] XTTS || echo [X] XTTS
curl -s http://localhost:8030/health >nul 2>&1 && echo [OK] MusicGen || echo [X] MusicGen
curl -s http://localhost:8040/health >nul 2>&1 && echo [OK] Demucs || echo [X] Demucs
curl -s http://localhost:8060/health >nul 2>&1 && echo [OK] CLIP || echo [X] CLIP
curl -s http://localhost:8070/health >nul 2>&1 && echo [OK] ESRGAN || echo [X] ESRGAN

echo.
pause
"@ | Out-File -FilePath "start-ai-services.bat" -Encoding ASCII

# Stop script
@"
@echo off
chcp 65001 >nul
title MediaVault AI - Arret des services
color 0C

echo.
echo ==============================================================================
echo          MEDIAVAULT AI SUITE - ARRET DES SERVICES
echo ==============================================================================
echo.

echo Arret des serveurs Python...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Whisper*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq XTTS*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq MusicGen*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Demucs*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq CLIP*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq ESRGAN*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq ComfyUI*" 2>nul

echo Arret de Ollama...
taskkill /F /IM ollama.exe 2>nul

echo.
echo [OK] Tous les services IA ont ete arretes.
echo.
pause
"@ | Out-File -FilePath "stop-ai-services.bat" -Encoding ASCII

Write-OK "Scripts de demarrage crees"

# ============================================
# CREATION DU SCRIPT DE DESINSTALLATION
# ============================================
Write-Step "Creation du script de desinstallation"

@'
#Requires -RunAsAdministrator
param([switch]$KeepModels)

$InstallDir = "$env:USERPROFILE\MediaVault-AI"

Write-Host "`n==============================================================================`n" -ForegroundColor Red
Write-Host "          MEDIAVAULT AI SUITE - DESINSTALLATION`n" -ForegroundColor Red
Write-Host "==============================================================================" -ForegroundColor Red

$confirm = Read-Host "`nVoulez-vous vraiment desinstaller tous les services IA? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Annule."
    exit
}

Write-Host "`n[1/4] Arret des services..." -ForegroundColor Yellow
taskkill /F /IM ollama.exe 2>$null
taskkill /F /IM python.exe 2>$null
Write-Host "  [OK] Services arretes" -ForegroundColor Green

Write-Host "[2/4] Desinstallation de Ollama..." -ForegroundColor Yellow
winget uninstall --id Ollama.Ollama -e --silent 2>$null
if (!$KeepModels) {
    $ollamaData = "$env:USERPROFILE\.ollama"
    if (Test-Path $ollamaData) {
        Remove-Item -Path $ollamaData -Recurse -Force
        Write-Host "  [OK] Modeles Ollama supprimes" -ForegroundColor Green
    }
}
Write-Host "  [OK] Ollama desinstalle" -ForegroundColor Green

Write-Host "[3/4] Suppression des dossiers..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
    Write-Host "  [OK] Dossier supprime: $InstallDir" -ForegroundColor Green
}

Write-Host "[4/4] Nettoyage..." -ForegroundColor Yellow
$shortcut = "$env:USERPROFILE\Desktop\MediaVault AI.lnk"
if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "  [OK] Raccourci supprime" -ForegroundColor Green
}

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "  DESINSTALLATION TERMINEE!" -ForegroundColor Green
Write-Host "==============================================================================`n" -ForegroundColor Green

Read-Host "Appuyez sur Entree pour fermer"
'@ | Out-File -FilePath "uninstall-ai-suite.ps1" -Encoding UTF8

Write-OK "Script de desinstallation cree"

# ============================================
# CREATION DU RACCOURCI BUREAU
# ============================================
Write-Step "Creation du raccourci bureau"

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MediaVault AI.lnk")
    $Shortcut.TargetPath = "$InstallDir\start-ai-services.bat"
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "Demarrer les services IA MediaVault"
    $Shortcut.Save()
    Write-OK "Raccourci cree sur le bureau"
} catch {
    Write-Warn "Impossible de creer le raccourci bureau"
}

# ============================================
# FICHIER DE CONFIGURATION
# ============================================
Write-Step "Creation du fichier de configuration"

$config = @{
    version = "3.0"
    installDate = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    installDir = $InstallDir
    gpu = @{
        type = $GPUType
        info = $GPUInfo
        hasGPU = $HasGPU
    }
    services = @{
        ollama = @{ port = 11434; installed = $true }
        comfyui = @{ port = 8188; installed = (Test-Path "$InstallDir\ComfyUI") }
        whisper = @{ port = 9000; installed = (Test-Path "$InstallDir\whisper-api") }
        xtts = @{ port = 8020; installed = (Test-Path "$InstallDir\xtts-api") }
        musicgen = @{ port = 8030; installed = (Test-Path "$InstallDir\musicgen-api") }
        demucs = @{ port = 8040; installed = (Test-Path "$InstallDir\demucs-api") }
        clip = @{ port = 8060; installed = (Test-Path "$InstallDir\clip-api") }
        esrgan = @{ port = 8070; installed = (Test-Path "$InstallDir\esrgan-api") }
    }
}

$config | ConvertTo-Json -Depth 10 | Out-File -FilePath "$InstallDir\config.json" -Encoding UTF8
Write-OK "Configuration sauvegardee"

# ============================================
# RESUME FINAL
# ============================================
Stop-Transcript

Write-Host @"

==============================================================================
          INSTALLATION TERMINEE!
==============================================================================

  Dossier d'installation: $InstallDir
  GPU detecte: $GPUInfo ($GPUType)
  
  Services installes:
    [✓] Ollama (LLM)       - Port 11434
    [✓] ComfyUI (Images)   - Port 8188
    [✓] Whisper (STT)      - Port 9000
    [✓] XTTS (TTS)         - Port 8020
    [✓] MusicGen           - Port 8030
    [✓] Demucs             - Port 8040
    [✓] CLIP (Analyse)     - Port 8060
    [✓] ESRGAN (Upscale)   - Port 8070

  Pour demarrer les services:
    1. Double-cliquez sur 'MediaVault AI' sur le bureau
    OU
    2. Executez: $InstallDir\start-ai-services.bat

  Log d'installation: $LogFile

==============================================================================

"@ -ForegroundColor Green

Read-Host "Appuyez sur Entree pour terminer"
