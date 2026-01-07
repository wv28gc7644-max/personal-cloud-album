#Requires -RunAsAdministrator
<#
.SYNOPSIS
    MediaVault AI Suite - Desinstallation Complete
.DESCRIPTION
    Desinstalle tous les services IA et nettoie les fichiers
.PARAMETER KeepModels
    Conserver les modeles Ollama telecharges
.PARAMETER Force
    Desinstaller sans confirmation
#>

param(
    [switch]$KeepModels,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

# Detect install directory
$InstallDirs = @(
    "$env:USERPROFILE\MediaVault-AI",
    "C:\AI",
    "C:\MediaVault-AI"
)

$InstallDir = $null
foreach ($dir in $InstallDirs) {
    if (Test-Path $dir) {
        $InstallDir = $dir
        break
    }
}

Write-Host @"

╔══════════════════════════════════════════════════════════════════════╗
║          MEDIAVAULT AI SUITE - DESINSTALLATION COMPLETE             ║
╚══════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Red

if ($null -eq $InstallDir) {
    Write-Host "Aucune installation MediaVault AI detectee." -ForegroundColor Yellow
    Write-Host "Dossiers verifies:"
    foreach ($dir in $InstallDirs) {
        Write-Host "  - $dir" -ForegroundColor Gray
    }
    exit 0
}

Write-Host "Installation detectee: $InstallDir" -ForegroundColor Cyan

if (!$Force) {
    Write-Host ""
    $confirm = Read-Host "Voulez-vous vraiment desinstaller MediaVault AI Suite? (oui/non)"
    if ($confirm -ne "oui") {
        Write-Host "`nDesinstallation annulee." -ForegroundColor Yellow
        exit 0
    }
}

# Log file
$LogFile = "$InstallDir\uninstall-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
Start-Transcript -Path $LogFile -Append

Write-Host "`n[1/6] Arret des services en cours..." -ForegroundColor Cyan

# Stop Python processes
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Serveurs Python arretes ($($pythonProcesses.Count) processus)" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Aucun serveur Python actif" -ForegroundColor Gray
}

# Stop Ollama
$ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($ollamaProcess) {
    Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Ollama arrete" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Ollama non actif" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

Write-Host "`n[2/6] Suppression des dossiers d'installation..." -ForegroundColor Cyan

$folders = @(
    "ComfyUI",
    "whisper-api",
    "xtts-api",
    "musicgen-api",
    "demucs-api",
    "clip-api",
    "esrgan-api",
    "ai-tools"
)

$deletedCount = 0
foreach ($folder in $folders) {
    $path = Join-Path $InstallDir $folder
    if (Test-Path $path) {
        Write-Host "  Suppression de $folder..."
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "    [OK] $folder supprime" -ForegroundColor Green
            $deletedCount++
        } catch {
            Write-Host "    [ERREUR] Impossible de supprimer $folder : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  [INFO] $folder non present" -ForegroundColor Gray
    }
}
Write-Host "  Total: $deletedCount dossiers supprimes" -ForegroundColor Cyan

Write-Host "`n[3/6] Desinstallation de Ollama..." -ForegroundColor Cyan

if (!$KeepModels) {
    # Uninstall via winget
    try {
        $result = winget uninstall --id Ollama.Ollama --silent 2>&1
        Write-Host "  [OK] Ollama desinstalle via winget" -ForegroundColor Green
    } catch {
        Write-Host "  [ATTENTION] winget desinstallation echouee: $_" -ForegroundColor Yellow
    }
    
    # Remove Ollama data
    $ollamaDataPath = "$env:USERPROFILE\.ollama"
    if (Test-Path $ollamaDataPath) {
        Write-Host "  Suppression des donnees Ollama (~/.ollama)..."
        try {
            Remove-Item -Path $ollamaDataPath -Recurse -Force -ErrorAction Stop
            Write-Host "  [OK] Donnees Ollama supprimees" -ForegroundColor Green
        } catch {
            Write-Host "  [ATTENTION] Certains fichiers n'ont pu etre supprimes: $_" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  [INFO] Ollama et modeles conserves (option -KeepModels)" -ForegroundColor Yellow
}

Write-Host "`n[4/6] Suppression des raccourcis..." -ForegroundColor Cyan

$shortcuts = @(
    "$env:USERPROFILE\Desktop\MediaVault AI.lnk",
    "$env:USERPROFILE\Desktop\Start AI Services.lnk",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\MediaVault AI.lnk"
)

foreach ($shortcut in $shortcuts) {
    if (Test-Path $shortcut) {
        Remove-Item -Path $shortcut -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Raccourci supprime: $(Split-Path $shortcut -Leaf)" -ForegroundColor Green
    }
}

Write-Host "`n[5/6] Suppression des fichiers de configuration..." -ForegroundColor Cyan

$configFiles = @(
    "start-ai-services.bat",
    "stop-ai-services.bat",
    "config.json",
    "validation.json",
    "install.log"
)

foreach ($file in $configFiles) {
    $path = Join-Path $InstallDir $file
    if (Test-Path $path) {
        Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] $file supprime" -ForegroundColor Green
    }
}

# Remove log files
$logFiles = Get-ChildItem -Path $InstallDir -Filter "*.log" -ErrorAction SilentlyContinue
foreach ($log in $logFiles) {
    if ($log.FullName -ne $LogFile) {
        Remove-Item -Path $log.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[6/6] Nettoyage final..." -ForegroundColor Cyan

# Check if install dir is empty
$remainingItems = Get-ChildItem $InstallDir -Force -ErrorAction SilentlyContinue | Where-Object { $_.FullName -ne $LogFile }
if ($remainingItems.Count -eq 0) {
    Write-Host "  Suppression du dossier d'installation..."
    Stop-Transcript
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Dossier $InstallDir supprime" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Dossier non vide, conservation de $InstallDir" -ForegroundColor Yellow
    Write-Host "  Fichiers restants:" -ForegroundColor Gray
    $remainingItems | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
    Stop-Transcript
}

# Final summary
Write-Host @"

╔══════════════════════════════════════════════════════════════════════╗
║              DESINSTALLATION TERMINEE AVEC SUCCES                   ║
╚══════════════════════════════════════════════════════════════════════╝

Resume:
  • Services arretes et supprimes
  • Dossiers d'installation nettoyes
  $(if(!$KeepModels){"• Ollama et modeles supprimes"}else{"• Ollama conserve (modeles preserves)"})
  • Raccourcis supprimes

Pour reinstaller:
  1. Telecharger install-ai-suite-complete.ps1
  2. Executer en tant qu'administrateur
  
Ou utiliser Docker:
  docker-compose up -d

"@ -ForegroundColor Green

Write-Host "Appuyez sur une touche pour fermer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
