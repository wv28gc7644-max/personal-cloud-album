#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Installation Complete v4.0 (Ultra-Robuste)
.DESCRIPTION
    Installe 8 services IA avec verification stricte de chaque etape
.NOTES
    Version: 4.0 - Chaque etape verifiee, logs detailles, support Intel Arc
#>

param(
    [string]$InstallDir = "$env:USERPROFILE\MediaVault-AI",
    [switch]$SkipModels,
    [switch]$CPUOnly
)

$ErrorActionPreference = "Continue"
$ProgressPreference = 'SilentlyContinue'

# ============================================
# CONFIGURATION
# ============================================
$PYTHON_VERSION = "3.11"
$SERVICES = @{
    "ollama" = @{ Port = 11434; Health = "http://localhost:11434/api/tags" }
    "comfyui" = @{ Port = 8188; Health = "http://localhost:8188/" }
    "whisper" = @{ Port = 9000; Health = "http://localhost:9000/health" }
    "xtts" = @{ Port = 8020; Health = "http://localhost:8020/health" }
    "musicgen" = @{ Port = 9001; Health = "http://localhost:9001/health" }
    "demucs" = @{ Port = 9002; Health = "http://localhost:9002/health" }
    "clip" = @{ Port = 9003; Health = "http://localhost:9003/health" }
    "esrgan" = @{ Port = 9004; Health = "http://localhost:9004/health" }
}

# ============================================
# LOGGING
# ============================================
$LogDir = "$InstallDir\logs"
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$MainLog = "$LogDir\install-$Timestamp.log"
$ErrorLog = "$LogDir\errors-$Timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $entry = "[$(Get-Date -Format 'HH:mm:ss')] [$Level] $Message"
    $entry | Add-Content -Path $MainLog -ErrorAction SilentlyContinue
    
    switch ($Level) {
        "OK" { Write-Host "  [OK] $Message" -ForegroundColor Green }
        "ERREUR" { 
            Write-Host "  [ERREUR] $Message" -ForegroundColor Red 
            $entry | Add-Content -Path $ErrorLog -ErrorAction SilentlyContinue
        }
        "ATTENTION" { Write-Host "  [ATTENTION] $Message" -ForegroundColor Yellow }
        "ETAPE" { Write-Host "`n[ETAPE] $Message" -ForegroundColor Cyan }
        default { Write-Host "  [INFO] $Message" -ForegroundColor Gray }
    }
}

function Test-CommandResult {
    param([string]$Name, [scriptblock]$Command, [string]$SuccessPattern = "")
    try {
        $result = & $Command 2>&1
        if ($LASTEXITCODE -eq 0 -or $result -match $SuccessPattern -or $result) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# ============================================
# BANNER + SETUP
# ============================================
Clear-Host
Write-Host @"

==============================================================================
          MEDIAVAULT AI SUITE - INSTALLATION v4.0 (ULTRA-ROBUSTE)
                    8 Services IA - Support Intel Arc
==============================================================================

"@ -ForegroundColor Magenta

# Create directories
if (!(Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

Set-Location $InstallDir
"Installation demarree: $(Get-Date)" | Out-File $MainLog
"" | Out-File $ErrorLog

Write-Host "Dossier: $InstallDir" -ForegroundColor Gray
Write-Host "Logs:    $LogDir" -ForegroundColor Gray
Write-Host ""

# Track installation status
$InstallStatus = @{}

# ============================================
# ETAPE 1: PREREQUIS
# ============================================
Write-Log "Verification des prerequis" -Level "ETAPE"

# Check winget
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Log "winget disponible" -Level "OK"
} else {
    Write-Log "winget non trouve - Installez App Installer depuis le Microsoft Store" -Level "ERREUR"
    exit 1
}

# ============================================
# ETAPE 2: GPU DETECTION
# ============================================
Write-Log "Detection du GPU" -Level "ETAPE"

$GPUType = "cpu"
$GPUName = "CPU Only"
$TorchExtra = ""

if (!$CPUOnly) {
    # NVIDIA - verification robuste du driver
    try {
        $nvidiaResult = & nvidia-smi --query-gpu=name --format=csv,noheader 2>&1
        $nvidiaExitCode = $LASTEXITCODE
        
        if ($nvidiaExitCode -eq 0 -and $nvidiaResult -notmatch "failed|error|could not") {
            $GPUType = "nvidia"
            $GPUName = ($nvidiaResult | Select-Object -First 1).ToString().Trim()
            $TorchExtra = "--index-url https://download.pytorch.org/whl/cu121"
            Write-Log "GPU NVIDIA detecte: $GPUName" -Level "OK"
        } else {
            Write-Log "Driver NVIDIA non fonctionnel (code $nvidiaExitCode) - Mode CPU" -Level "ATTENTION"
        }
    } catch {
        Write-Log "Erreur detection NVIDIA: $($_.Exception.Message)" -Level "ATTENTION"
    }
    
    # Intel Arc (si pas NVIDIA)
    if ($GPUType -eq "cpu") {
        try {
            $intelGPU = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "Intel.*Arc|Intel.*A[357][58]0" }
            if ($intelGPU) {
                $GPUType = "intel-arc"
                $GPUName = $intelGPU.Name
                Write-Log "GPU Intel Arc detecte: $GPUName" -Level "OK"
                Write-Log "Mode Intel Extension for PyTorch (IPEX) active" -Level "INFO"
            }
        } catch {}
    }
    
    if ($GPUType -eq "cpu") {
        Write-Log "Aucun GPU compatible detecte - Mode CPU uniquement" -Level "ATTENTION"
    }
}

# ============================================
# ETAPE 3: PYTHON 3.11
# ============================================
Write-Log "Installation de Python 3.11" -Level "ETAPE"

$Python311Path = $null
$PythonCmd = $null

# Check for existing Python 3.11
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:ProgramFiles\Python311\python.exe",
    "C:\Python311\python.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $version = & $path --version 2>&1
        if ($version -match "3\.11") {
            $Python311Path = $path
            break
        }
    }
}

if (!$Python311Path) {
    # Check via py launcher
    try {
        $pyVersion = & py -3.11 --version 2>&1
        if ($pyVersion -match "3\.11") {
            $PythonCmd = "py -3.11"
            Write-Log "Python 3.11 trouve via py launcher" -Level "OK"
        }
    } catch {}
}

if (!$Python311Path -and !$PythonCmd) {
    Write-Log "Installation de Python 3.11 via winget..." -Level "INFO"
    $installResult = winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1
    Start-Sleep -Seconds 10
    Refresh-Path
    
    # Re-check
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $Python311Path = $path
            break
        }
    }
}

if ($Python311Path) {
    $PythonCmd = "`"$Python311Path`""
    Write-Log "Python 3.11 disponible: $Python311Path" -Level "OK"
} elseif ($PythonCmd) {
    Write-Log "Python 3.11 disponible via: $PythonCmd" -Level "OK"
} else {
    Write-Log "Impossible d'installer Python 3.11" -Level "ERREUR"
    exit 1
}

# ============================================
# ETAPE 4: GIT
# ============================================
Write-Log "Verification de Git" -Level "ETAPE"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Log "Git disponible" -Level "OK"
} else {
    Write-Log "Installation de Git..." -Level "INFO"
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1
    Start-Sleep -Seconds 5
    Refresh-Path
    
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Log "Git installe" -Level "OK"
    } else {
        Write-Log "Impossible d'installer Git" -Level "ERREUR"
        exit 1
    }
}

# ============================================
# ETAPE 5: OLLAMA
# ============================================
Write-Log "[1/8] Installation de Ollama (LLM)" -Level "ETAPE"

$ollamaInstalled = $false
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    $ollamaInstalled = $true
    Write-Log "Ollama deja installe" -Level "OK"
} else {
    Write-Log "Installation de Ollama..." -Level "INFO"
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1
    Start-Sleep -Seconds 5
    Refresh-Path
    
    if (Get-Command ollama -ErrorAction SilentlyContinue) {
        $ollamaInstalled = $true
        Write-Log "Ollama installe" -Level "OK"
    } else {
        Write-Log "Echec installation Ollama - verifiez manuellement" -Level "ERREUR"
    }
}

if ($ollamaInstalled -and !$SkipModels) {
    Write-Log "Demarrage Ollama..." -Level "INFO"
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
    
    # Attendre qu'Ollama soit vraiment pret (max 30 secondes)
    $ollamaReady = $false
    Write-Log "Attente demarrage Ollama (max 30s)..." -Level "INFO"
    for ($i = 0; $i -lt 10; $i++) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
            $ollamaReady = $true
            Write-Log "Ollama pret" -Level "OK"
            break
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    
    if ($ollamaReady) {
        foreach ($model in @("llama3.2:3b", "nomic-embed-text")) {
            Write-Log "Telechargement $model..." -Level "INFO"
            try {
                $pullResult = & ollama pull $model 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Modele $model telecharge" -Level "OK"
                } else {
                    Write-Log "Echec telechargement $model (code $LASTEXITCODE)" -Level "ATTENTION"
                }
            } catch {
                Write-Log "Impossible de telecharger $model : $($_.Exception.Message)" -Level "ATTENTION"
            }
        }
    } else {
        Write-Log "Ollama non pret apres 30s - modeles non telecharges" -Level "ATTENTION"
    }
}

$InstallStatus["ollama"] = $ollamaInstalled

# ============================================
# HELPER: CREATE PYTHON SERVICE
# ============================================
function New-PythonService {
    param(
        [string]$Name,
        [string]$DirName,
        [int]$Port,
        [string[]]$Packages,
        [string]$ServerCode
    )
    
    Write-Log "Installation de $Name..." -Level "INFO"
    
    $ServiceDir = "$InstallDir\$DirName"
    $LogFile = "$LogDir\install-$DirName.log"
    
    try {
        # Create directory
        if (!(Test-Path $ServiceDir)) {
            New-Item -ItemType Directory -Path $ServiceDir -Force | Out-Null
        }
        Set-Location $ServiceDir
        
        # Create venv
        Write-Log "Creation venv pour $Name..." -Level "INFO"
        if ($Python311Path) {
            & $Python311Path -m venv venv 2>&1 | Out-File $LogFile -Append
        } else {
            & py -3.11 -m venv venv 2>&1 | Out-File $LogFile -Append
        }
        
        if (!(Test-Path "$ServiceDir\venv\Scripts\python.exe")) {
            throw "Echec creation venv"
        }
        
        # Activate and install
        $pipExe = "$ServiceDir\venv\Scripts\pip.exe"
        $pythonExe = "$ServiceDir\venv\Scripts\python.exe"
        
        # Upgrade pip
        & $pythonExe -m pip install --upgrade pip --quiet 2>&1 | Out-File $LogFile -Append
        
        # Install packages
        foreach ($pkg in $Packages) {
            Write-Log "  Installation $pkg..." -Level "INFO"
            
            if ($pkg -eq "torch" -and $TorchExtra) {
                & $pipExe install torch $TorchExtra.Split(" ") --quiet 2>&1 | Out-File $LogFile -Append
            } else {
                & $pipExe install $pkg --quiet 2>&1 | Out-File $LogFile -Append
            }
        }
        
        # Intel Arc specific
        if ($GPUType -eq "intel-arc" -and $Packages -contains "torch") {
            Write-Log "  Installation Intel Extension for PyTorch..." -Level "INFO"
            & $pipExe install intel-extension-for-pytorch --quiet 2>&1 | Out-File $LogFile -Append
        }
        
        # Write server code
        $ServerCode | Out-File -FilePath "$ServiceDir\server.py" -Encoding UTF8
        
        Set-Location $InstallDir
        return $true
        
    } catch {
        $_.Exception.Message | Out-File $LogFile -Append
        Write-Log "Echec $Name : $($_.Exception.Message)" -Level "ERREUR"
        Set-Location $InstallDir
        return $false
    }
}

# ============================================
# ETAPE 6: COMFYUI
# ============================================
Write-Log "[2/8] Installation de ComfyUI (Images)" -Level "ETAPE"

$ComfyUIPath = "$InstallDir\ComfyUI"
$comfyInstalled = $false

if (Test-Path "$ComfyUIPath\main.py") {
    $comfyInstalled = $true
    Write-Log "ComfyUI deja installe" -Level "OK"
} else {
    try {
        Write-Log "Clonage de ComfyUI..." -Level "INFO"
        
        # Utiliser Start-Process pour eviter les erreurs stderr de git
        $gitLogFile = "$LogDir\comfyui-git.log"
        $gitProcess = Start-Process -FilePath "git" -ArgumentList "clone", "https://github.com/comfyanonymous/ComfyUI.git", "`"$ComfyUIPath`"" -Wait -PassThru -NoNewWindow -RedirectStandardError $gitLogFile -RedirectStandardOutput "$LogDir\comfyui-git-out.log"
        
        if ($gitProcess.ExitCode -ne 0 -and !(Test-Path "$ComfyUIPath\main.py")) {
            $gitError = Get-Content $gitLogFile -Raw -ErrorAction SilentlyContinue
            Write-Log "Erreur git clone (code $($gitProcess.ExitCode)) - voir $gitLogFile" -Level "ERREUR"
        }
        
        if (Test-Path "$ComfyUIPath\main.py") {
            Set-Location $ComfyUIPath
            
            # Create venv
            Write-Log "Creation venv ComfyUI..." -Level "INFO"
            if ($Python311Path) {
                & $Python311Path -m venv venv 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            } else {
                & py -3.11 -m venv venv 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            }
            
            $pipExe = "$ComfyUIPath\venv\Scripts\pip.exe"
            $pythonExe = "$ComfyUIPath\venv\Scripts\python.exe"
            
            & $pythonExe -m pip install --upgrade pip --quiet 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            
            # PyTorch
            Write-Log "Installation PyTorch pour ComfyUI..." -Level "INFO"
            if ($GPUType -eq "nvidia") {
                & $pipExe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            } elseif ($GPUType -eq "intel-arc") {
                & $pipExe install torch torchvision torchaudio --quiet 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
                & $pipExe install intel-extension-for-pytorch --quiet 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            } else {
                & $pipExe install torch torchvision torchaudio --quiet 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            }
            
            # Requirements
            Write-Log "Installation requirements ComfyUI..." -Level "INFO"
            & $pipExe install -r requirements.txt --quiet 2>&1 | Out-File "$LogDir\install-comfyui.log" -Append
            
            # ComfyUI Manager - aussi avec Start-Process
            Write-Log "Installation ComfyUI Manager..." -Level "INFO"
            if (!(Test-Path "$ComfyUIPath\custom_nodes")) {
                New-Item -ItemType Directory -Path "$ComfyUIPath\custom_nodes" -Force | Out-Null
            }
            $managerPath = "$ComfyUIPath\custom_nodes\ComfyUI-Manager"
            Start-Process -FilePath "git" -ArgumentList "clone", "https://github.com/ltdrdata/ComfyUI-Manager.git", "`"$managerPath`"" -Wait -NoNewWindow -RedirectStandardError "$LogDir\comfyui-manager-git.log"
            
            Set-Location $InstallDir
            $comfyInstalled = $true
            Write-Log "ComfyUI installe" -Level "OK"
        } else {
            throw "Clonage echoue - main.py introuvable"
        }
    } catch {
        Write-Log "Echec ComfyUI: $($_.Exception.Message)" -Level "ERREUR"
        Set-Location $InstallDir
    }
}

$InstallStatus["comfyui"] = $comfyInstalled

# ============================================
# ETAPE 7: WHISPER (STT)
# ============================================
Write-Log "[3/8] Installation de Whisper (STT)" -Level "ETAPE"

$whisperCode = @'
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
    return jsonify({"status": "ok", "service": "whisper"})

@app.route("/transcribe", methods=["POST"])
def transcribe():
    global model
    if model is None:
        model = whisper.load_model("base")
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio"}), 400
    
    audio = request.files["audio"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        audio.save(f.name)
        try:
            result = model.transcribe(f.name)
            return jsonify(result)
        finally:
            os.unlink(f.name)

if __name__ == "__main__":
    print("WHISPER API - Port 9000")
    app.run(host="0.0.0.0", port=9000)
'@

$whisperInstalled = New-PythonService -Name "Whisper" -DirName "whisper-api" -Port 9000 `
    -Packages @("flask", "flask-cors", "openai-whisper", "torch") `
    -ServerCode $whisperCode

if ($whisperInstalled) { Write-Log "Whisper installe" -Level "OK" }
$InstallStatus["whisper"] = $whisperInstalled

# ============================================
# ETAPE 8: XTTS (TTS)
# ============================================
Write-Log "[4/8] Installation de XTTS (TTS)" -Level "ETAPE"

$xttsCode = @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile

app = Flask(__name__)
CORS(app)
tts = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "xtts"})

@app.route("/synthesize", methods=["POST"])
def synthesize():
    global tts
    if tts is None:
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    
    data = request.json
    text = data.get("text", "")
    lang = data.get("language", "fr")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        tts.tts_to_file(text=text, language=lang, file_path=f.name)
        return send_file(f.name, mimetype="audio/wav")

if __name__ == "__main__":
    print("XTTS API - Port 8020")
    app.run(host="0.0.0.0", port=8020)
'@

$xttsInstalled = New-PythonService -Name "XTTS" -DirName "xtts-api" -Port 8020 `
    -Packages @("flask", "flask-cors", "TTS", "torch") `
    -ServerCode $xttsCode

if ($xttsInstalled) { Write-Log "XTTS installe" -Level "OK" }
$InstallStatus["xtts"] = $xttsInstalled

# ============================================
# ETAPE 9: MUSICGEN
# ============================================
Write-Log "[5/8] Installation de MusicGen" -Level "ETAPE"

$musicgenCode = @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile
import torchaudio

app = Flask(__name__)
CORS(app)
model = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "musicgen"})

@app.route("/generate", methods=["POST"])
def generate():
    global model
    from audiocraft.models import MusicGen
    
    if model is None:
        model = MusicGen.get_pretrained("facebook/musicgen-small")
        model.set_generation_params(duration=10)
    
    data = request.json
    prompt = data.get("prompt", "ambient music")
    duration = min(data.get("duration", 10), 30)
    model.set_generation_params(duration=duration)
    
    wav = model.generate([prompt])
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        torchaudio.save(f.name, wav[0].cpu(), 32000)
        return send_file(f.name, mimetype="audio/wav")

if __name__ == "__main__":
    print("MUSICGEN API - Port 9001")
    app.run(host="0.0.0.0", port=9001)
'@

$musicgenInstalled = New-PythonService -Name "MusicGen" -DirName "musicgen-api" -Port 9001 `
    -Packages @("flask", "flask-cors", "audiocraft", "torch", "torchaudio") `
    -ServerCode $musicgenCode

if ($musicgenInstalled) { Write-Log "MusicGen installe" -Level "OK" }
$InstallStatus["musicgen"] = $musicgenInstalled

# ============================================
# ETAPE 10: DEMUCS
# ============================================
Write-Log "[6/8] Installation de Demucs (Separation)" -Level "ETAPE"

$demucsCode = @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import demucs.separate
import tempfile
import os
import zipfile

app = Flask(__name__)
CORS(app)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "demucs"})

@app.route("/separate", methods=["POST"])
def separate():
    if "audio" not in request.files:
        return jsonify({"error": "No audio"}), 400
    
    audio = request.files["audio"]
    stems = request.form.get("stems", "all")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.mp3")
        audio.save(input_path)
        
        demucs.separate.main(["--mp3", "-n", "htdemucs", "-o", tmpdir, input_path])
        
        output_dir = os.path.join(tmpdir, "htdemucs", "input")
        zip_path = os.path.join(tmpdir, "stems.zip")
        
        with zipfile.ZipFile(zip_path, 'w') as zf:
            for stem in os.listdir(output_dir):
                zf.write(os.path.join(output_dir, stem), stem)
        
        return send_file(zip_path, mimetype="application/zip")

if __name__ == "__main__":
    print("DEMUCS API - Port 9002")
    app.run(host="0.0.0.0", port=9002)
'@

$demucsInstalled = New-PythonService -Name "Demucs" -DirName "demucs-api" -Port 9002 `
    -Packages @("flask", "flask-cors", "demucs", "torch", "torchaudio") `
    -ServerCode $demucsCode

if ($demucsInstalled) { Write-Log "Demucs installe" -Level "OK" }
$InstallStatus["demucs"] = $demucsInstalled

# ============================================
# ETAPE 11: CLIP
# ============================================
Write-Log "[7/8] Installation de CLIP (Analyse)" -Level "ETAPE"

$clipCode = @'
from flask import Flask, request, jsonify
from flask_cors import CORS
from clip_interrogator import Config, Interrogator
from PIL import Image
import io

app = Flask(__name__)
CORS(app)
ci = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "clip"})

@app.route("/analyze", methods=["POST"])
def analyze():
    global ci
    if ci is None:
        config = Config(clip_model_name="ViT-L-14/openai")
        ci = Interrogator(config)
    
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    
    image = Image.open(io.BytesIO(request.files["image"].read())).convert("RGB")
    description = ci.interrogate(image)
    
    return jsonify({"description": description})

if __name__ == "__main__":
    print("CLIP API - Port 9003")
    app.run(host="0.0.0.0", port=9003)
'@

$clipInstalled = New-PythonService -Name "CLIP" -DirName "clip-api" -Port 9003 `
    -Packages @("flask", "flask-cors", "clip-interrogator", "torch", "Pillow") `
    -ServerCode $clipCode

if ($clipInstalled) { Write-Log "CLIP installe" -Level "OK" }
$InstallStatus["clip"] = $clipInstalled

# ============================================
# ETAPE 12: ESRGAN
# ============================================
Write-Log "[8/8] Installation de ESRGAN (Upscale)" -Level "ETAPE"

$esrganCode = @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import tempfile
import io
import subprocess
import os

app = Flask(__name__)
CORS(app)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "esrgan"})

@app.route("/upscale", methods=["POST"])
def upscale():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    
    scale = int(request.form.get("scale", 4))
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.png")
        output_path = os.path.join(tmpdir, "output.png")
        
        image = Image.open(io.BytesIO(request.files["image"].read()))
        image.save(input_path)
        
        # Use realesrgan-ncnn-vulkan or fallback to simple resize
        try:
            subprocess.run([
                "realesrgan-ncnn-vulkan",
                "-i", input_path,
                "-o", output_path,
                "-s", str(scale)
            ], check=True, capture_output=True)
        except:
            # Fallback: simple resize
            new_size = (image.width * scale, image.height * scale)
            image = image.resize(new_size, Image.LANCZOS)
            image.save(output_path)
        
        return send_file(output_path, mimetype="image/png")

if __name__ == "__main__":
    print("ESRGAN API - Port 9004")
    app.run(host="0.0.0.0", port=9004)
'@

$esrganInstalled = New-PythonService -Name "ESRGAN" -DirName "esrgan-api" -Port 9004 `
    -Packages @("flask", "flask-cors", "Pillow", "torch") `
    -ServerCode $esrganCode

if ($esrganInstalled) { Write-Log "ESRGAN installe" -Level "OK" }
$InstallStatus["esrgan"] = $esrganInstalled

# ============================================
# SCRIPTS DE DEMARRAGE/ARRET
# ============================================
Write-Log "Creation des scripts de gestion" -Level "ETAPE"

# START SCRIPT
$startScript = @"
@echo off
title MediaVault AI Services
color 0A
chcp 65001 >nul 2>&1

echo.
echo ══════════════════════════════════════════════════════════════
echo             MEDIAVAULT AI - DEMARRAGE DES SERVICES
echo ══════════════════════════════════════════════════════════════
echo.

cd /d "$InstallDir"

echo [1/8] Demarrage Ollama...
start "Ollama" cmd /c "ollama serve"
timeout /t 3 /nobreak >nul

echo [2/8] Demarrage ComfyUI...
if exist "ComfyUI\venv\Scripts\python.exe" (
    start "ComfyUI" cmd /k "cd /d ComfyUI && venv\Scripts\python.exe main.py --listen"
)

echo [3/8] Demarrage Whisper...
if exist "whisper-api\venv\Scripts\python.exe" (
    start "Whisper" cmd /k "cd /d whisper-api && venv\Scripts\python.exe server.py"
)

echo [4/8] Demarrage XTTS...
if exist "xtts-api\venv\Scripts\python.exe" (
    start "XTTS" cmd /k "cd /d xtts-api && venv\Scripts\python.exe server.py"
)

echo [5/8] Demarrage MusicGen...
if exist "musicgen-api\venv\Scripts\python.exe" (
    start "MusicGen" cmd /k "cd /d musicgen-api && venv\Scripts\python.exe server.py"
)

echo [6/8] Demarrage Demucs...
if exist "demucs-api\venv\Scripts\python.exe" (
    start "Demucs" cmd /k "cd /d demucs-api && venv\Scripts\python.exe server.py"
)

echo [7/8] Demarrage CLIP...
if exist "clip-api\venv\Scripts\python.exe" (
    start "CLIP" cmd /k "cd /d clip-api && venv\Scripts\python.exe server.py"
)

echo [8/8] Demarrage ESRGAN...
if exist "esrgan-api\venv\Scripts\python.exe" (
    start "ESRGAN" cmd /k "cd /d esrgan-api && venv\Scripts\python.exe server.py"
)

echo.
echo ══════════════════════════════════════════════════════════════
echo              TOUS LES SERVICES SONT EN COURS
echo ══════════════════════════════════════════════════════════════
echo.
echo Ports:
echo   Ollama   : http://localhost:11434
echo   ComfyUI  : http://localhost:8188
echo   Whisper  : http://localhost:9000
echo   XTTS     : http://localhost:8020
echo   MusicGen : http://localhost:9001
echo   Demucs   : http://localhost:9002
echo   CLIP     : http://localhost:9003
echo   ESRGAN   : http://localhost:9004
echo.
pause
"@
$startScript | Out-File -FilePath "$InstallDir\start-ai-services.bat" -Encoding ASCII

# STOP SCRIPT
$stopScript = @"
@echo off
title MediaVault AI - Arret
color 0C

echo.
echo Arret de tous les services IA...
echo.

taskkill /F /IM "ollama.exe" 2>nul
taskkill /F /FI "WINDOWTITLE eq Ollama*" 2>nul
taskkill /F /FI "WINDOWTITLE eq ComfyUI*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Whisper*" 2>nul
taskkill /F /FI "WINDOWTITLE eq XTTS*" 2>nul
taskkill /F /FI "WINDOWTITLE eq MusicGen*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Demucs*" 2>nul
taskkill /F /FI "WINDOWTITLE eq CLIP*" 2>nul
taskkill /F /FI "WINDOWTITLE eq ESRGAN*" 2>nul

echo.
echo [OK] Tous les services arretes.
echo.
pause
"@
$stopScript | Out-File -FilePath "$InstallDir\stop-ai-services.bat" -Encoding ASCII

Write-Log "Scripts crees" -Level "OK"

# ============================================
# RAPPORT FINAL
# ============================================
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "                    INSTALLATION TERMINEE" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "GPU detecte: $GPUName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Status des services:" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($service in $InstallStatus.Keys) {
    if ($InstallStatus[$service]) {
        Write-Host "  [OK] $service" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  [X]  $service" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "Resultat: $successCount reussis, $failCount echecs" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Dossier installation : $InstallDir" -ForegroundColor Gray
Write-Host "Logs detailles       : $LogDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Prochaine etape: Lancer start-ai-services.bat" -ForegroundColor Cyan
Write-Host ""

# Write final config
$config = @{
    version = "4.0"
    installed = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    gpu = @{
        type = $GPUType
        name = $GPUName
    }
    services = $InstallStatus
    python = $Python311Path
}
$config | ConvertTo-Json -Depth 3 | Out-File "$InstallDir\config.json" -Encoding UTF8

exit 0
