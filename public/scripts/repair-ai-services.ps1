# MediaVault AI Suite - Script de Reparation Intelligente
# Version 1.0

param(
    [string]$LogFile = "$env:USERPROFILE\MediaVault-AI\logs\repair.log"
)

$ErrorActionPreference = "Continue"
$AI_DIR = "$env:USERPROFILE\MediaVault-AI"

# Couleurs
function Write-Status { param($msg, $color = "White") Write-Host $msg -ForegroundColor $color }
function Write-Ok { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[X] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[i] $msg" -ForegroundColor Cyan }

# Logger
function Log { param($msg) Add-Content -Path $LogFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $msg" }

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     MEDIAVAULT AI SUITE - REPARATION INTELLIGENTE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Log "=== DEBUT REPARATION ==="

# Services a verifier
$services = @(
    @{ Name = "ComfyUI"; Port = 8188; Dir = "$AI_DIR\ComfyUI"; Endpoint = "/system_stats" },
    @{ Name = "Whisper"; Port = 9000; Dir = "$AI_DIR\whisper-api"; Script = "whisper_server.py"; Endpoint = "/health" },
    @{ Name = "XTTS"; Port = 8020; Dir = "$AI_DIR\xtts-api"; Script = "xtts_server.py"; Endpoint = "/health" },
    @{ Name = "MusicGen"; Port = 9001; Dir = "$AI_DIR\musicgen-api"; Script = "musicgen_server.py"; Endpoint = "/health" },
    @{ Name = "Demucs"; Port = 9002; Dir = "$AI_DIR\demucs-api"; Script = "demucs_server.py"; Endpoint = "/health" },
    @{ Name = "CLIP"; Port = 9003; Dir = "$AI_DIR\clip-api"; Script = "clip_server.py"; Endpoint = "/health" },
    @{ Name = "ESRGAN"; Port = 9004; Dir = "$AI_DIR\esrgan-api"; Script = "esrgan_server.py"; Endpoint = "/health" }
)

$repaired = 0
$failed = 0

foreach ($svc in $services) {
    Write-Host ""
    Write-Status "=== Verification de $($svc.Name) ===" "Yellow"
    Log "Verification: $($svc.Name)"
    
    $issues = @()
    
    # 1. Verifier le dossier
    if (-not (Test-Path $svc.Dir)) {
        $issues += "Dossier manquant: $($svc.Dir)"
        Write-Warn "Dossier manquant"
    } else {
        Write-Ok "Dossier existe"
    }
    
    # 2. Verifier le venv
    $venvPath = Join-Path $svc.Dir "venv"
    if (-not (Test-Path $venvPath)) {
        $issues += "Environnement virtuel manquant"
        Write-Warn "venv manquant"
    } else {
        Write-Ok "venv existe"
    }
    
    # 3. Verifier le script serveur
    if ($svc.Script) {
        $scriptPath = Join-Path $svc.Dir $svc.Script
        if (-not (Test-Path $scriptPath)) {
            $issues += "Script serveur manquant: $($svc.Script)"
            Write-Warn "Script manquant"
        } else {
            Write-Ok "Script existe"
        }
    }
    
    # 4. Tester la connectivite
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($svc.Port)$($svc.Endpoint)" -TimeoutSec 5 -ErrorAction Stop
        Write-Ok "Service en ligne (port $($svc.Port))"
    } catch {
        $issues += "Service hors ligne sur port $($svc.Port)"
        Write-Warn "Service hors ligne"
    }
    
    # Reparer si necessaire
    if ($issues.Count -gt 0) {
        Write-Info "Problemes detectes: $($issues.Count)"
        Log "Problemes: $($issues -join ', ')"
        
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor Yellow
        }
        
        # Tenter la reparation
        Write-Info "Tentative de reparation..."
        
        # Recreer le venv si manquant
        if ($issues -contains "Environnement virtuel manquant" -and (Test-Path $svc.Dir)) {
            Write-Info "Creation du venv..."
            try {
                Push-Location $svc.Dir
                python -m venv venv
                if (Test-Path "venv\Scripts\activate.bat") {
                    Write-Ok "venv cree"
                    
                    # Installer les dependances
                    if (Test-Path "requirements.txt") {
                        Write-Info "Installation des dependances..."
                        & "venv\Scripts\pip.exe" install -r requirements.txt --quiet
                        Write-Ok "Dependances installees"
                    }
                    $repaired++
                }
                Pop-Location
            } catch {
                Write-Err "Echec creation venv: $_"
                $failed++
            }
        }
        
        # Generer le script serveur si manquant
        if ($issues -match "Script serveur manquant" -and (Test-Path $svc.Dir)) {
            Write-Info "Generation du script serveur..."
            $scriptContent = Get-ServerScript -ServiceName $svc.Name -Port $svc.Port
            if ($scriptContent) {
                $scriptPath = Join-Path $svc.Dir $svc.Script
                Set-Content -Path $scriptPath -Value $scriptContent
                Write-Ok "Script genere"
                $repaired++
            }
        }
        
        Log "Reparation tentee pour $($svc.Name)"
    } else {
        Write-Ok "$($svc.Name) fonctionne correctement"
        Log "$($svc.Name) OK"
    }
}

# Fonction pour generer les scripts serveur
function Get-ServerScript {
    param($ServiceName, $Port)
    
    switch ($ServiceName) {
        "Whisper" {
            return @"
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os

app = Flask(__name__)
CORS(app)

model = None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "whisper"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    global model
    if model is None:
        model = whisper.load_model("base")
    
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400
    
    audio_file = request.files['audio']
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
        audio_file.save(tmp.name)
        result = model.transcribe(tmp.name)
        os.unlink(tmp.name)
    
    return jsonify({"text": result["text"]})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=$Port)
"@
        }
        "XTTS" {
            return @"
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "xtts"})

@app.route('/tts_to_audio', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text', '')
    # Placeholder - implement XTTS logic
    return jsonify({"status": "ok", "message": "TTS generation placeholder"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=$Port)
"@
        }
        default { return $null }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                    RAPPORT DE REPARATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services repares: $repaired" -ForegroundColor Green
Write-Host "  Echecs: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Log: $LogFile" -ForegroundColor Gray
Write-Host ""

Log "=== FIN REPARATION - Repares: $repaired, Echecs: $failed ==="

if ($repaired -gt 0) {
    Write-Info "Redemarrez les services avec: start-ai-services.bat"
}
