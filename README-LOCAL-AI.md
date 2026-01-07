# MediaVault AI Suite - Guide d'installation

## Prérequis matériel

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| RAM | 16 GB | 32 GB |
| GPU | GTX 1660 (6GB) | RTX 3080+ (10GB+) |
| Stockage | 100 GB SSD | 500 GB NVMe |
| CPU | Intel i5 / Ryzen 5 | Intel i7 / Ryzen 7 |

## Installation rapide (Windows)

### Option 1: Script automatique
```powershell
# Télécharger et exécuter (PowerShell Admin)
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install-ai-suite.ps1
```

### Option 2: Docker Compose
```bash
docker-compose up -d
```

## Services installés

| Service | Port | Description |
|---------|------|-------------|
| Ollama | 11434 | LLM local (Llama, Mistral) |
| ComfyUI | 8188 | Génération images/vidéos |
| Whisper | 9000 | Transcription audio |
| XTTS | 8020 | Synthèse vocale |
| MusicGen | 8030 | Génération musique |
| Demucs | 8040 | Séparation de pistes |
| CLIP | 8060 | Analyse d'images |
| ESRGAN | 8070 | Upscaling images |

## Démarrage

```bash
# Windows
start-ai-services.bat

# Docker
docker-compose up -d
```

## Troubleshooting

**Port déjà utilisé**: Changez le port dans `config.json`  
**GPU non détecté**: Installez les drivers NVIDIA + CUDA Toolkit 12.1  
**Mémoire insuffisante**: Réduisez la taille des modèles dans les paramètres

## Support

Consultez les logs: `%USERPROFILE%\MediaVault-AI\install.log`
