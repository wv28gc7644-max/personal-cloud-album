#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Installation PowerShell v2.0
.DESCRIPTION
    Script d'installation automatique SANS dependance au Microsoft Store
    - Bootstrap automatique de winget si absent
    - Fallback telechargements directs
.NOTES
    Version: 2.0 - Sans Microsoft Store
#>

param(
    [string]$InstallDir = "$env:USERPROFILE\MediaVault-AI",
    [switch]$SkipModels,
    [switch]$CPUOnly
)

$ErrorActionPreference = "Continue"
$ProgressPreference = 'Continue'

# ============================================
# CONFIGURATION
# ============================================
$SCRIPT_VERSION = "2.0"
$PYTHON_VERSION = "3.11.9"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-amd64.exe"
$GIT_URL = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
$OLLAMA_URL = "https://ollama.com/download/OllamaSetup.exe"

# Colors
function Write-Step { param($msg) Write-Host "`n[ETAPE] $msg" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[ATTENTION] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERREUR] $msg" -ForegroundColor Red }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Download-File {
    param([string]$Url, [string]$OutFile, [string]$Description = "fichier")
    Write-Host "  Telechargement de $Description..." -ForegroundColor Gray
    try {
        Start-BitsTransfer -Source $Url -Destination $OutFile -ErrorAction Stop
        return $true
    } catch {
        try {
            (New-Object System.Net.WebClient).DownloadFile($Url, $OutFile)
            return $true
        } catch {
            Write-Err "Echec telechargement: $($_.Exception.Message)"
            return $false
        }
    }
}

# Banner
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║       MEDIAVAULT AI SUITE - INSTALLATION v$SCRIPT_VERSION              ║
║          Installation autonome (sans Microsoft Store)        ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Host "Dossier d'installation: $InstallDir" -ForegroundColor Gray
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# Create directories
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
$DownloadDir = "$InstallDir\downloads"
if (!(Test-Path $DownloadDir)) {
    New-Item -ItemType Directory -Path $DownloadDir -Force | Out-Null
}
Set-Location $InstallDir

# Log file
$LogFile = "$InstallDir\install.log"
Start-Transcript -Path $LogFile -Append

# ============================================
# BOOTSTRAP WINGET (SANS STORE)
# ============================================
Write-Step "Verification/Installation de WinGet"

$WinGetAvailable = $false

if (Get-Command winget -ErrorAction SilentlyContinue) {
    try {
        $ver = winget --version 2>&1
        if ($ver -match "v\d") {
            Write-OK "WinGet disponible: $ver"
            $WinGetAvailable = $true
        }
    } catch {}
}

if (!$WinGetAvailable) {
    Write-Warn "WinGet absent - Tentative d'installation depuis GitHub..."
    
    $vcLibsUrl = "https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx"
    $uiXamlUrl = "https://github.com/nicovon24/Microsoft.UI.Xaml.2.8/raw/main/Microsoft.UI.Xaml.2.8.x64.appx"
    $wingetUrl = "https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle"
    
    $vcLibsPath = "$DownloadDir\VCLibs.appx"
    $uiXamlPath = "$DownloadDir\UIXaml.appx"
    $wingetPath = "$DownloadDir\AppInstaller.msixbundle"
    
    try {
        Download-File -Url $vcLibsUrl -OutFile $vcLibsPath -Description "VCLibs" | Out-Null
        Download-File -Url $uiXamlUrl -OutFile $uiXamlPath -Description "UI.Xaml" | Out-Null
        Download-File -Url $wingetUrl -OutFile $wingetPath -Description "WinGet" | Out-Null
        
        Add-AppxPackage -Path $vcLibsPath -ErrorAction SilentlyContinue
        Add-AppxPackage -Path $uiXamlPath -ErrorAction SilentlyContinue
        Add-AppxPackage -Path $wingetPath -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 3
        Refresh-Path
        
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            Write-OK "WinGet installe avec succes"
            $WinGetAvailable = $true
        }
    } catch {
        Write-Warn "Bootstrap WinGet echoue - Mode fallback actif"
    }
}

if (!$WinGetAvailable) {
    Write-Warn "Mode FALLBACK: telechargements directs"
}

# ============================================
# CHECK PREREQUISITES
# ============================================
Write-Step "Verification des prerequis"

# Check GPU
$HasGPU = $false
if (!$CPUOnly) {
    try {
        $nvidia = & nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
        if ($nvidia -and $LASTEXITCODE -eq 0) {
            Write-OK "GPU NVIDIA detecte: $nvidia"
            $HasGPU = $true
        }
    } catch {
        Write-Warn "Pas de GPU NVIDIA - Mode CPU"
    }
}

# Check disk space
$Drive = (Get-Item $InstallDir).PSDrive
$FreeSpace = [math]::Round((Get-PSDrive $Drive.Name).Free / 1GB, 2)
if ($FreeSpace -lt 50) {
    Write-Warn "Espace disque faible: ${FreeSpace}GB (recommande: 50GB+)"
}

# ============================================
# INSTALL PYTHON
# ============================================
Write-Step "Installation de Python 3.11"

$PythonPath = $null
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:ProgramFiles\Python311\python.exe",
    "C:\Python311\python.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $PythonPath = $path
        break
    }
}

if (!$PythonPath) {
    if ($WinGetAvailable) {
        Write-Host "Installation via winget..."
        winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-Null
        Start-Sleep -Seconds 10
        Refresh-Path
    }
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $PythonPath = $path
            break
        }
    }
    
    if (!$PythonPath) {
        Write-Host "Telechargement direct de Python..."
        $pythonInstaller = "$DownloadDir\python-installer.exe"
        
        if (Download-File -Url $PYTHON_URL -OutFile $pythonInstaller -Description "Python $PYTHON_VERSION") {
            $proc = Start-Process -FilePath $pythonInstaller -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1" -Wait -PassThru
            Start-Sleep -Seconds 5
            Refresh-Path
            
            foreach ($path in $possiblePaths) {
                if (Test-Path $path) {
                    $PythonPath = $path
                    break
                }
            }
        }
    }
}

if ($PythonPath) {
    Write-OK "Python 3.11: $PythonPath"
} else {
    Write-Err "Python 3.11 non disponible"
    Write-Host ""
    Write-Host "Telechargez manuellement: $PYTHON_URL" -ForegroundColor Yellow
    exit 1
}

# ============================================
# INSTALL GIT
# ============================================
Write-Step "Verification de Git"

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    if ($WinGetAvailable) {
        Write-Host "Installation via winget..."
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-Null
        Start-Sleep -Seconds 5
        Refresh-Path
    }
    
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "Telechargement direct de Git..."
        $gitInstaller = "$DownloadDir\git-installer.exe"
        
        if (Download-File -Url $GIT_URL -OutFile $gitInstaller -Description "Git") {
            Start-Process -FilePath $gitInstaller -ArgumentList "/VERYSILENT /NORESTART" -Wait
            Start-Sleep -Seconds 5
            Refresh-Path
        }
    }
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-OK "Git disponible"
} else {
    Write-Warn "Git non disponible"
}

# ============================================
# INSTALL OLLAMA
# ============================================
Write-Step "Installation de Ollama"

if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    if ($WinGetAvailable) {
        Write-Host "Installation via winget..."
        winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-Null
        Start-Sleep -Seconds 5
        Refresh-Path
    }
    
    if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
        Write-Host "Telechargement direct de Ollama..."
        $ollamaInstaller = "$DownloadDir\OllamaSetup.exe"
        
        if (Download-File -Url $OLLAMA_URL -OutFile $ollamaInstaller -Description "Ollama") {
            Start-Process -FilePath $ollamaInstaller -ArgumentList "/S" -Wait
            Start-Sleep -Seconds 5
            Refresh-Path
        }
    }
}

if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-OK "Ollama installe"
    
    if (!$SkipModels) {
        Write-Host "Demarrage Ollama et telechargement des modeles..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 5
        
        foreach ($model in @("llama3.2:3b", "nomic-embed-text")) {
            Write-Host "  Telechargement de $model..."
            & ollama pull $model 2>&1 | Out-Null
        }
    }
} else {
    Write-Warn "Ollama non disponible"
}

# ============================================
# INSTALL COMFYUI
# ============================================
Write-Step "Installation de ComfyUI"

$ComfyUIPath = "$InstallDir\ComfyUI"
if (!(Test-Path $ComfyUIPath) -and (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Clonage de ComfyUI..."
    git clone https://github.com/comfyanonymous/ComfyUI.git 2>&1 | Out-Null
    
    if (Test-Path "$ComfyUIPath\main.py") {
        Set-Location $ComfyUIPath
        
        Write-Host "Creation de l'environnement virtuel..."
        & $PythonPath -m venv venv
        
        $pipExe = "$ComfyUIPath\venv\Scripts\pip.exe"
        
        Write-Host "Installation des dependances..."
        if ($HasGPU) {
            & $pipExe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet 2>&1 | Out-Null
        } else {
            & $pipExe install torch torchvision torchaudio --quiet 2>&1 | Out-Null
        }
        
        & $pipExe install -r requirements.txt --quiet 2>&1 | Out-Null
        
        Write-Host "Installation de ComfyUI Manager..."
        Set-Location custom_nodes
        git clone https://github.com/ltdrdata/ComfyUI-Manager.git 2>&1 | Out-Null
        
        Set-Location $InstallDir
        Write-OK "ComfyUI installe"
    }
} elseif (Test-Path "$ComfyUIPath\main.py") {
    Write-OK "ComfyUI deja installe"
}

# ============================================
# INSTALL WHISPER
# ============================================
Write-Step "Installation de Whisper API"

$WhisperPath = "$InstallDir\whisper-api"
if (!(Test-Path $WhisperPath)) {
    New-Item -ItemType Directory -Path $WhisperPath -Force | Out-Null
    Set-Location $WhisperPath
    
    & $PythonPath -m venv venv
    $pipExe = "$WhisperPath\venv\Scripts\pip.exe"
    
    & $pipExe install openai-whisper flask flask-cors --quiet 2>&1 | Out-Null
    if ($HasGPU) {
        & $pipExe install torch --index-url https://download.pytorch.org/whl/cu121 --quiet 2>&1 | Out-Null
    }
    
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
    
    Set-Location $InstallDir
    Write-OK "Whisper installe"
}

# ============================================
# INSTALL XTTS
# ============================================
Write-Step "Installation de XTTS (Text-to-Speech)"

$XTTSPath = "$InstallDir\xtts-api"
if (!(Test-Path $XTTSPath)) {
    New-Item -ItemType Directory -Path $XTTSPath -Force | Out-Null
    Set-Location $XTTSPath
    
    & $PythonPath -m venv venv
    $pipExe = "$XTTSPath\venv\Scripts\pip.exe"
    
    & $pipExe install TTS flask flask-cors --quiet 2>&1 | Out-Null
    if ($HasGPU) {
        & $pipExe install torch --index-url https://download.pytorch.org/whl/cu121 --quiet 2>&1 | Out-Null
    }
    
    @'
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile

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
    language = data.get("language", "fr")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        tts.tts_to_file(text=text, language=language, file_path=f.name)
        return send_file(f.name, mimetype="audio/wav")

if __name__ == "__main__":
    print("XTTS API running on http://localhost:8020")
    app.run(host="0.0.0.0", port=8020)
'@ | Out-File -FilePath "xtts_server.py" -Encoding UTF8
    
    Set-Location $InstallDir
    Write-OK "XTTS installe"
}

# ============================================
# CREATE STARTUP SCRIPTS
# ============================================
Write-Step "Creation des scripts de demarrage"

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
if exist "venv\Scripts\python.exe" (
    start "ComfyUI" /min cmd /c "venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188"
)
timeout /t 2 /nobreak >nul

:: Start Whisper
echo [3/3] Demarrage de Whisper API...
cd /d "$InstallDir\whisper-api"
if exist "venv\Scripts\python.exe" (
    start "Whisper" /min cmd /c "venv\Scripts\activate.bat && python whisper_server.py"
)

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
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MediaVault AI.lnk")
    $Shortcut.TargetPath = "$InstallDir\start-ai-services.bat"
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "Demarrer les services IA MediaVault"
    $Shortcut.Save()
} catch {}

Write-OK "Scripts de demarrage crees"

# ============================================
# CREATE CONFIG FILE
# ============================================
Write-Step "Creation du fichier de configuration"

$config = @{
    version = $SCRIPT_VERSION
    install_dir = $InstallDir
    gpu_enabled = $HasGPU
    winget_available = $WinGetAvailable
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

Mode WinGet: $(if ($WinGetAvailable) { 'Disponible' } else { 'Fallback (telechargements directs)' })

Raccourcis:
  • Bureau: "MediaVault AI"
  • Scripts: $InstallDir\start-ai-services.bat
             $InstallDir\stop-ai-services.bat

Log d'installation: $LogFile

Pour demarrer: Double-cliquez sur "MediaVault AI" sur le bureau

"@ -ForegroundColor Green

Write-Host "Appuyez sur une touche pour terminer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
