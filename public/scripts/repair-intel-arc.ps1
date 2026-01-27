<#
.SYNOPSIS
    MediaVault AI - Réparation Intel Arc pour ComfyUI et XTTS
.DESCRIPTION
    Ce script répare les services ComfyUI et XTTS pour les GPU Intel Arc
    en installant PyTorch avec support Intel OneAPI/OpenVINO.
.NOTES
    Version: 1.0
    Date: 2026-01-24
#>

param(
    [string]$InstallDir = "$env:USERPROFILE\MediaVault-AI"
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Couleurs
function Write-Step { param($msg) Write-Host "`n[ETAPE] $msg" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "  [ERREUR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor Gray }

# Banner
Clear-Host
Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║        MEDIAVAULT AI - RÉPARATION INTEL ARC                                  ║
║                                                                              ║
║        ComfyUI + XTTS avec support Intel OneAPI/OpenVINO                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Host "Dossier d'installation: $InstallDir" -ForegroundColor White
Write-Host ""

# Vérification du dossier
if (-not (Test-Path $InstallDir)) {
    Write-Err "Dossier $InstallDir introuvable!"
    Write-Host "Lancez d'abord install-ai-suite-complete.ps1" -ForegroundColor Yellow
    pause
    exit 1
}

# Créer dossier logs
$LogDir = Join-Path $InstallDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "repair-intel-arc-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
Start-Transcript -Path $LogFile -Append

Write-Step "Détection du GPU Intel Arc"

# Détecter GPU Intel Arc
$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "Intel.*Arc|Intel.*Graphics" }
if ($gpu) {
    Write-OK "GPU détecté: $($gpu.Name)"
} else {
    Write-Warn "Aucun GPU Intel Arc détecté - le script continuera quand même"
}

# ============================================================================
# DÉTECTION PYTHON 3.11
# ============================================================================
Write-Step "Détection de Python 3.11"

$Python311Path = $null
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:ProgramFiles\Python311\python.exe",
    "C:\Python311\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311-64\python.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        try {
            $version = & $path --version 2>&1
            if ($version -match "3\.11") {
                $Python311Path = $path
                Write-OK "Python 3.11 trouvé: $path"
                break
            }
        } catch {}
    }
}

if (-not $Python311Path) {
    try {
        $pyResult = & py -3.11 --version 2>&1
        if ($LASTEXITCODE -eq 0 -and $pyResult -match "3\.11") {
            $Python311Path = "py311"
            Write-OK "Python 3.11 via py launcher"
        }
    } catch {}
}

if (-not $Python311Path) {
    Write-Err "Python 3.11 non trouvé! IPEX nécessite Python 3.9-3.12"
    Write-Info "Installez Python 3.11 depuis: https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    pause
    exit 1
}

# ============================================================================
# RÉPARATION COMFYUI
# ============================================================================
Write-Step "Réparation de ComfyUI pour Intel Arc"

$ComfyDir = Join-Path $InstallDir "ComfyUI"
if (Test-Path $ComfyDir) {
    Write-Info "Dossier ComfyUI trouvé: $ComfyDir"
    
    $venvPath = Join-Path $ComfyDir "venv"
    $pythonExe = Join-Path $venvPath "Scripts\python.exe"
    $pipExe = Join-Path $venvPath "Scripts\pip.exe"
    
    # CORRECTION: Recréer le venv s'il est manquant ou utilise la mauvaise version Python
    $needRecreate = $false
    
    if (-not (Test-Path $pythonExe)) {
        Write-Warn "venv ComfyUI manquant - recréation..."
        $needRecreate = $true
    } else {
        # Vérifier la version Python du venv existant
        $venvVersion = & $pythonExe --version 2>&1
        Write-Info "Version Python du venv actuel: $venvVersion"
        if ($venvVersion -notmatch "3\.11" -and $venvVersion -notmatch "3\.10" -and $venvVersion -notmatch "3\.9") {
            Write-Warn "venv utilise $venvVersion (incompatible IPEX) - recréation avec Python 3.11..."
            $needRecreate = $true
        }
    }
    
    if ($needRecreate) {
        # Supprimer l'ancien venv
        if (Test-Path $venvPath) {
            Write-Info "Suppression de l'ancien venv..."
            Remove-Item -Path $venvPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Recréer avec Python 3.11
        Write-Info "Création du venv avec Python 3.11..."
        if ($Python311Path -eq "py311") {
            & py -3.11 -m venv $venvPath
        } else {
            & $Python311Path -m venv $venvPath
        }
        
        if (Test-Path $pythonExe) {
            Write-OK "venv ComfyUI recréé avec Python 3.11"
            
            # Installer les dépendances de base
            & $pythonExe -m pip install --upgrade pip
            & $pipExe install torch torchvision torchaudio
            
            # Installer requirements.txt si présent
            $reqFile = Join-Path $ComfyDir "requirements.txt"
            if (Test-Path $reqFile) {
                Write-Info "Installation requirements.txt..."
                & $pipExe install -r $reqFile
            }
        } else {
            Write-Err "Échec création venv ComfyUI"
        }
    }
    
    if (Test-Path $pythonExe) {
        Write-Info "Désinstallation de PyTorch CUDA..."
        & $pipExe uninstall torch torchvision torchaudio -y 2>$null
        
        Write-Info "Installation de PyTorch avec Intel Extension..."
        # PyTorch CPU + Intel Extension for PyTorch (IPEX)
        & $pipExe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
        
        # CORRECTION: Utiliser XPU au lieu de CPU pour Intel Arc GPU
        Write-Info "Installation Intel Extension for PyTorch (IPEX XPU)..."
        $ipexResult = & $pipExe install intel-extension-for-pytorch --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us/ 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "IPEX XPU échoué, essai canal CPU..."
            $ipexResult = & $pipExe install intel-extension-for-pytorch --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/cpu/us/ 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "IPEX non installé - mode CPU standard utilisé"
            } else {
                Write-OK "IPEX (CPU) installé avec succès"
            }
        } else {
            Write-OK "IPEX (XPU) installé avec succès"
        }
        
        # Installer aussi OpenVINO pour certains modèles
        & $pipExe install openvino openvino-dev
        
        Write-OK "ComfyUI réparé avec support Intel"
        
        # Créer script de démarrage optimisé Intel
        $startScript = @"
@echo off
title ComfyUI - Intel Arc
cd /d "$ComfyDir"
call venv\Scripts\activate.bat

REM Configuration Intel Arc
set PYTORCH_ENABLE_MPS_FALLBACK=1
set SYCL_CACHE_PERSISTENT=1

echo.
echo ========================================
echo   ComfyUI - Mode Intel Arc
echo   URL: http://localhost:8188
echo ========================================
echo.

python main.py --force-fp16 --preview-method auto
pause
"@
        $startScript | Out-File -FilePath (Join-Path $ComfyDir "start-comfyui-intel.bat") -Encoding ASCII
        Write-OK "Script de démarrage créé: start-comfyui-intel.bat"
        
    } else {
        Write-Err "Python venv non trouvé dans ComfyUI"
    }
} else {
    Write-Warn "ComfyUI non installé - ignoré"
}

# ============================================================================
# RÉPARATION XTTS
# ============================================================================
Write-Step "Réparation de XTTS pour Intel Arc"

$XttsDir = Join-Path $InstallDir "xtts-api"
if (Test-Path $XttsDir) {
    Write-Info "Dossier XTTS trouvé: $XttsDir"
    
    $venvPath = Join-Path $XttsDir "venv"
    $pythonExe = Join-Path $venvPath "Scripts\python.exe"
    $pipExe = Join-Path $venvPath "Scripts\pip.exe"
    
    # Vérifier si le venv existe et utilise la bonne version Python
    if (Test-Path $pythonExe) {
        $venvVersion = & $pythonExe --version 2>&1
        Write-Info "Version Python du venv XTTS: $venvVersion"
    }
    
    if (Test-Path $pythonExe) {
        Write-Info "Désinstallation de PyTorch CUDA..."
        & $pipExe uninstall torch torchvision torchaudio -y 2>$null
        
        Write-Info "Installation de PyTorch CPU + Intel Extension..."
        & $pipExe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
        
        # CORRECTION: Utiliser XPU au lieu de CPU pour Intel Arc GPU
        Write-Info "Installation Intel Extension for PyTorch (IPEX XPU)..."
        $ipexResult = & $pipExe install intel-extension-for-pytorch --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us/ 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "IPEX XPU échoué, essai canal CPU..."
            $ipexResult = & $pipExe install intel-extension-for-pytorch --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/cpu/us/ 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "IPEX non installé - mode CPU standard utilisé"
            } else {
                Write-OK "IPEX (CPU) installé avec succès"
            }
        } else {
            Write-OK "IPEX (XPU) installé avec succès"
        }
        
        Write-OK "XTTS réparé avec support Intel"
        
        # Mettre à jour le serveur XTTS pour forcer CPU
        $serverPy = Join-Path $XttsDir "server.py"
        if (Test-Path $serverPy) {
            $content = Get-Content $serverPy -Raw
            
            # Ajouter configuration Intel au début si pas déjà présente
            if ($content -notmatch "INTEL_ARC_MODE") {
                $intelConfig = @"
# === INTEL ARC MODE ===
import os
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
os.environ['CUDA_VISIBLE_DEVICES'] = ''  # Désactiver CUDA
INTEL_ARC_MODE = True

"@
                $content = $intelConfig + $content
                
                # Remplacer .cuda() par .cpu() si présent
                $content = $content -replace '\.cuda\(\)', '.cpu()'
                $content = $content -replace 'device\s*=\s*["\']cuda["\']', 'device = "cpu"'
                $content = $content -replace "device\s*=\s*'cuda'", "device = 'cpu'"
                
                Set-Content -Path $serverPy -Value $content -Encoding UTF8
                Write-OK "server.py modifié pour Intel Arc"
            } else {
                Write-Info "server.py déjà configuré pour Intel Arc"
            }
        }
        
        # Créer script de démarrage optimisé Intel
        $startScript = @"
@echo off
title XTTS API - Intel Arc
cd /d "$XttsDir"
call venv\Scripts\activate.bat

REM Configuration Intel Arc - Forcer CPU
set CUDA_VISIBLE_DEVICES=
set PYTORCH_ENABLE_MPS_FALLBACK=1

echo.
echo ========================================
echo   XTTS API - Mode Intel Arc (CPU)
echo   URL: http://localhost:8020
echo ========================================
echo.

python server.py
pause
"@
        $startScript | Out-File -FilePath (Join-Path $XttsDir "start-xtts-intel.bat") -Encoding ASCII
        Write-OK "Script de démarrage créé: start-xtts-intel.bat"
        
    } else {
        Write-Err "Python venv non trouvé dans XTTS"
    }
} else {
    Write-Warn "XTTS non installé - ignoré"
}

# ============================================================================
# MISE À JOUR DU SCRIPT DE DÉMARRAGE GLOBAL
# ============================================================================
Write-Step "Mise à jour du script de démarrage global"

$startAllScript = @"
@echo off
title MediaVault AI Services - Intel Arc Mode
color 0A
chcp 65001 >nul 2>&1

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║   MEDIAVAULT AI SERVICES - MODE INTEL ARC                        ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

set "AI_DIR=$InstallDir"
set "CUDA_VISIBLE_DEVICES="
set "PYTORCH_ENABLE_MPS_FALLBACK=1"

echo [1/8] Ollama...
start /min "" ollama serve

echo [2/8] ComfyUI (Intel Arc)...
if exist "%AI_DIR%\ComfyUI\start-comfyui-intel.bat" (
    start /min "" cmd /c "%AI_DIR%\ComfyUI\start-comfyui-intel.bat"
) else (
    echo   [!] Script Intel non trouve, utilisation du script standard
    if exist "%AI_DIR%\ComfyUI\venv\Scripts\python.exe" (
        start /min "" cmd /c "cd /d %AI_DIR%\ComfyUI && call venv\Scripts\activate && python main.py --force-fp16"
    )
)

echo [3/8] Whisper...
if exist "%AI_DIR%\whisper-api\venv\Scripts\python.exe" (
    start /min "" cmd /c "cd /d %AI_DIR%\whisper-api && call venv\Scripts\activate && python server.py"
)

echo [4/8] XTTS (Intel Arc)...
if exist "%AI_DIR%\xtts-api\start-xtts-intel.bat" (
    start /min "" cmd /c "%AI_DIR%\xtts-api\start-xtts-intel.bat"
) else (
    echo   [!] Script Intel non trouve, utilisation du script standard
    if exist "%AI_DIR%\xtts-api\venv\Scripts\python.exe" (
        start /min "" cmd /c "cd /d %AI_DIR%\xtts-api && call venv\Scripts\activate && set CUDA_VISIBLE_DEVICES= && python server.py"
    )
)

echo [5/8] MusicGen...
if exist "%AI_DIR%\musicgen-api\venv\Scripts\python.exe" (
    start /min "" cmd /c "cd /d %AI_DIR%\musicgen-api && call venv\Scripts\activate && python server.py"
)

echo [6/8] Demucs...
if exist "%AI_DIR%\demucs-api\venv\Scripts\python.exe" (
    start /min "" cmd /c "cd /d %AI_DIR%\demucs-api && call venv\Scripts\activate && python server.py"
)

echo [7/8] CLIP...
if exist "%AI_DIR%\clip-api\venv\Scripts\python.exe" (
    start /min "" cmd /c "cd /d %AI_DIR%\clip-api && call venv\Scripts\activate && python server.py"
)

echo [8/8] ESRGAN...
if exist "%AI_DIR%\esrgan-api\venv\Scripts\python.exe" (
    start /min "" cmd /c "cd /d %AI_DIR%\esrgan-api && call venv\Scripts\activate && python server.py"
)

echo.
echo ════════════════════════════════════════════════════════════════════
echo   Tous les services ont ete lances en mode Intel Arc
echo ════════════════════════════════════════════════════════════════════
echo.
echo   Services disponibles:
echo     - Ollama (LLM):      http://localhost:11434
echo     - ComfyUI (Images):  http://localhost:8188
echo     - Whisper (STT):     http://localhost:9000
echo     - XTTS (TTS):        http://localhost:8020
echo     - MusicGen:          http://localhost:9001
echo     - Demucs:            http://localhost:9002
echo     - CLIP:              http://localhost:9003
echo     - ESRGAN:            http://localhost:9004
echo.
echo   Attendez 30-60 secondes pour que tous les services demarrent.
echo   Appuyez sur une touche pour fermer cette fenetre...
echo.
pause >nul
"@

$startAllPath = Join-Path $InstallDir "start-ai-services-intel.bat"
$startAllScript | Out-File -FilePath $startAllPath -Encoding ASCII
Write-OK "Script global créé: start-ai-services-intel.bat"

# Copier aussi dans le dossier racine pour faciliter l'accès
Copy-Item $startAllPath -Destination (Join-Path $InstallDir "Demarrer IA (Intel Arc).bat") -Force

# ============================================================================
# RÉSUMÉ
# ============================================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                        RÉPARATION TERMINÉE                                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Scripts créés:" -ForegroundColor White
Write-Host "    • $InstallDir\start-ai-services-intel.bat" -ForegroundColor Cyan
Write-Host "    • $InstallDir\Demarrer IA (Intel Arc).bat" -ForegroundColor Cyan
if (Test-Path (Join-Path $ComfyDir "start-comfyui-intel.bat")) {
    Write-Host "    • $ComfyDir\start-comfyui-intel.bat" -ForegroundColor Cyan
}
if (Test-Path (Join-Path $XttsDir "start-xtts-intel.bat")) {
    Write-Host "    • $XttsDir\start-xtts-intel.bat" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Prochaines étapes:" -ForegroundColor Yellow
Write-Host "    1. Fermez toutes les fenêtres de services IA en cours" -ForegroundColor White
Write-Host "    2. Lancez: Demarrer IA (Intel Arc).bat" -ForegroundColor White
Write-Host "    3. Attendez 60 secondes puis testez dans MediaVault" -ForegroundColor White
Write-Host ""
Write-Host "  Log: $LogFile" -ForegroundColor Gray
Write-Host ""

Stop-Transcript

Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
