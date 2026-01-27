
# Plan de Correction - Installation Intel Arc

## Diagnostic Final

L'installation a échoué principalement à cause d'un conflit de version Python :

- **Python 3.14** est le défaut dans votre PATH (trop récent, non supporté par IPEX)
- **Python 3.11** est installé mais pas utilisé par défaut
- Les venvs créés utilisent potentiellement la mauvaise version de Python
- `intel-extension-for-pytorch` nécessite Python 3.9-3.12 maximum

---

## Corrections à Apporter

### 1. Forcer Python 3.11 pour la création des venvs

**Fichier** : `public/scripts/install-ai-suite-complete.ps1`

**Modification** : Après la détection de Python 3.11, forcer explicitement son utilisation pour créer les venvs plutôt que de compter sur le PATH système.

```powershell
# Utiliser le chemin absolu vers Python 3.11 pour créer les venvs
& "C:\Users\jimmy\AppData\Local\Programs\Python\Python311\python.exe" -m venv venv
```

### 2. Corriger l'URL IPEX pour Intel Arc GPU

**Fichier** : `public/scripts/install-ai-suite-complete.ps1`

**Modification** : Utiliser l'URL XPU au lieu de CPU pour Intel Arc avec GPU :

```powershell
# Avant (CPU)
--extra-index-url https://pytorch-extension.intel.com/release-whl/stable/cpu/us/

# Après (XPU pour Intel Arc GPU)
--extra-index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us/
```

### 3. Recréer le venv ComfyUI

**Fichier** : `public/scripts/repair-intel-arc.ps1`

**Modification** : Ajouter une section qui recrée le venv ComfyUI s'il est manquant.

### 4. Améliorer le script de démarrage

**Fichier** : `public/scripts/start-ai-services.bat`

**Modifications** :
- Ajouter des messages de debug pour voir pourquoi les services ne démarrent pas
- Vérifier que le venv existe avant de tenter d'activer
- Afficher le chemin exact testé

### 5. Mettre à jour le diagnostic

**Fichier** : `public/scripts/diagnose-services.bat`

**Modifications** :
- Afficher la version de Python utilisée par chaque venv
- Vérifier la compatibilité IPEX
- Tester si le venv utilise Python 3.11 ou 3.14

---

## Fichiers Modifiés

| Fichier | Action |
|---------|--------|
| `public/scripts/install-ai-suite-complete.ps1` | Forcer Python 3.11 + URL XPU |
| `public/scripts/repair-intel-arc.ps1` | Recréer venv ComfyUI + Python 3.11 |
| `public/scripts/start-ai-services.bat` | Debug + vérifications |
| `public/scripts/diagnose-services.bat` | Afficher version Python par venv |

---

## Résultat Attendu

Après ces corrections :
1. Les venvs seront créés avec Python 3.11 (compatible IPEX)
2. IPEX s'installera correctement avec le canal XPU Intel Arc
3. ComfyUI aura son venv recréé
4. Les services démarreront tous correctement
5. Le diagnostic affichera les versions Python utilisées

---

## Instructions Post-Implémentation

1. Télécharger le nouveau `install-ai-suite-complete.ps1` depuis l'onglet Installation
2. Supprimer les anciens venvs (ou lancer `repair-intel-arc.ps1`)
3. Relancer l'installation complète
4. Vérifier avec `diagnose-services.bat`
