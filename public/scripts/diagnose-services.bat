@echo off
setlocal enableextensions
chcp 65001 >nul

title MediaVault AI - Diagnostic Rapide Services
color 0A

echo.
echo ==============================================================================
echo          MEDIAVAULT AI - DIAGNOSTIC RAPIDE DES SERVICES
echo ==============================================================================
echo.

:: Chemin absolu - USERPROFILE\MediaVault-AI
set "AI_DIR=%USERPROFILE%\MediaVault-AI"
echo Dossier IA: %AI_DIR%
echo.

set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
  set "D1=%%a" & set "D2=%%b" & set "D3=%%c"
)
set "TS=%D3%%D2%%D1%-%time:~0,2%%time:~3,2%%time:~6,2%"
set "TS=%TS: =0%"
set "LOG=%LOG_DIR%\diagnostic-%TS%.log"

echo MediaVault AI Diagnostic - %date% %time% > "%LOG%"
echo AI_DIR=%AI_DIR% >> "%LOG%"
echo. >> "%LOG%"

:: ============================================================================
:: SECTION 1: VERIFICATION DES DOSSIERS
:: ============================================================================
echo [1/4] Verification des dossiers d'installation...
echo.
echo === STRUCTURE DES DOSSIERS === >> "%LOG%"

if exist "%AI_DIR%" (
    echo   [OK] Dossier principal: %AI_DIR%
    echo [OK] Dossier principal: %AI_DIR% >> "%LOG%"
) else (
    echo   [X] Dossier principal MANQUANT: %AI_DIR%
    echo [ERREUR] Dossier principal MANQUANT >> "%LOG%"
    echo.
    echo Le dossier d'installation n'existe pas.
    echo Veuillez d'abord executer install-ai-suite-complete.ps1
    pause
    exit /b 1
)

set "SERVICES=ComfyUI whisper-api xtts-api musicgen-api demucs-api clip-api esrgan-api"
set "OK_COUNT=0"
set "FAIL_COUNT=0"

for %%S in (%SERVICES%) do (
    if exist "%AI_DIR%\%%S" (
        if exist "%AI_DIR%\%%S\venv\Scripts\python.exe" (
            echo   [OK] %%S - dossier + venv OK
            echo [OK] %%S - venv present >> "%LOG%"
            
            :: NOUVEAU: Afficher la version Python du venv
            for /f "tokens=*" %%V in ('"%AI_DIR%\%%S\venv\Scripts\python.exe" --version 2^>^&1') do (
                echo        Python: %%V
                echo     Python version: %%V >> "%LOG%"
                
                :: Vérifier compatibilité IPEX (Python 3.9-3.12)
                echo %%V | findstr /C:"3.14" /C:"3.13" >nul
                if not errorlevel 1 (
                    echo        [ATTENTION] Version Python incompatible avec IPEX!
                    echo     [ATTENTION] %%V incompatible IPEX >> "%LOG%"
                )
            )
            set /a OK_COUNT+=1
        ) else (
            echo   [!] %%S - dossier OK, venv MANQUANT
            echo [ATTENTION] %%S - venv manquant >> "%LOG%"
            set /a FAIL_COUNT+=1
        )
    ) else (
        echo   [X] %%S - dossier MANQUANT
        echo [ERREUR] %%S - non installe >> "%LOG%"
        set /a FAIL_COUNT+=1
    )
)

echo.
echo Dossiers: %OK_COUNT% OK, %FAIL_COUNT% problemes
echo.

:: ============================================================================
:: SECTION 2: VERIFICATION DES FICHIERS server.py
:: ============================================================================
echo [2/4] Verification des fichiers server.py...
echo.
echo === FICHIERS SERVER.PY === >> "%LOG%"

set "SERVER_OK=0"
set "SERVER_FAIL=0"

:: ComfyUI utilise main.py
if exist "%AI_DIR%\ComfyUI\main.py" (
    echo   [OK] ComfyUI - main.py present
    echo [OK] ComfyUI - main.py >> "%LOG%"
    set /a SERVER_OK+=1
) else (
    echo   [X] ComfyUI - main.py MANQUANT
    echo [ERREUR] ComfyUI - main.py manquant >> "%LOG%"
    set /a SERVER_FAIL+=1
)

:: Les autres services utilisent server.py
for %%S in (whisper-api xtts-api musicgen-api demucs-api clip-api esrgan-api) do (
    if exist "%AI_DIR%\%%S\server.py" (
        echo   [OK] %%S - server.py present
        echo [OK] %%S - server.py >> "%LOG%"
        set /a SERVER_OK+=1
    ) else (
        echo   [X] %%S - server.py MANQUANT
        echo [ERREUR] %%S - server.py manquant >> "%LOG%"
        set /a SERVER_FAIL+=1
    )
)

echo.
echo Fichiers server: %SERVER_OK% OK, %SERVER_FAIL% problemes
echo.

:: ============================================================================
:: SECTION 3: TEST DES PORTS (SERVICES EN LIGNE?)
:: ============================================================================
echo [3/4] Test des ports (services en ligne?)...
echo.
echo === HEALTHCHECKS === >> "%LOG%"

:: Test Ollama
echo   Test Ollama (11434)...
curl -s -o nul -w "%%{http_code}" http://localhost:11434/api/tags > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] Ollama - En ligne ^(port 11434^)
    echo [OK] Ollama 11434 >> "%LOG%"
) else (
    echo   [X] Ollama - Hors ligne
    echo [HORS LIGNE] Ollama >> "%LOG%"
)

:: Test ComfyUI
echo   Test ComfyUI (8188)...
curl -s -o nul -w "%%{http_code}" http://localhost:8188/system_stats > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] ComfyUI - En ligne ^(port 8188^)
    echo [OK] ComfyUI 8188 >> "%LOG%"
) else (
    echo   [X] ComfyUI - Hors ligne
    echo [HORS LIGNE] ComfyUI >> "%LOG%"
)

:: Test Whisper
echo   Test Whisper (9000)...
curl -s -o nul -w "%%{http_code}" http://localhost:9000/health > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] Whisper - En ligne ^(port 9000^)
    echo [OK] Whisper 9000 >> "%LOG%"
) else (
    echo   [X] Whisper - Hors ligne
    echo [HORS LIGNE] Whisper >> "%LOG%"
)

:: Test XTTS
echo   Test XTTS (8020)...
curl -s -o nul -w "%%{http_code}" http://localhost:8020/health > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] XTTS - En ligne ^(port 8020^)
    echo [OK] XTTS 8020 >> "%LOG%"
) else (
    echo   [X] XTTS - Hors ligne
    echo [HORS LIGNE] XTTS >> "%LOG%"
)

:: Test MusicGen
echo   Test MusicGen (8030)...
curl -s -o nul -w "%%{http_code}" http://localhost:8030/health > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] MusicGen - En ligne ^(port 8030^)
    echo [OK] MusicGen 8030 >> "%LOG%"
) else (
    echo   [X] MusicGen - Hors ligne
    echo [HORS LIGNE] MusicGen >> "%LOG%"
)

:: Test Demucs
echo   Test Demucs (8040)...
curl -s -o nul -w "%%{http_code}" http://localhost:8040/health > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] Demucs - En ligne ^(port 8040^)
    echo [OK] Demucs 8040 >> "%LOG%"
) else (
    echo   [X] Demucs - Hors ligne
    echo [HORS LIGNE] Demucs >> "%LOG%"
)

:: Test CLIP
echo   Test CLIP (8060)...
curl -s -o nul -w "%%{http_code}" http://localhost:8060/health > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] CLIP - En ligne ^(port 8060^)
    echo [OK] CLIP 8060 >> "%LOG%"
) else (
    echo   [X] CLIP - Hors ligne
    echo [HORS LIGNE] CLIP >> "%LOG%"
)

:: Test ESRGAN
echo   Test ESRGAN (8070)...
curl -s -o nul -w "%%{http_code}" http://localhost:8070/health > "%TEMP%\port_check.txt" 2>nul
set /p CODE=<"%TEMP%\port_check.txt"
if "%CODE%"=="200" (
    echo   [OK] ESRGAN - En ligne ^(port 8070^)
    echo [OK] ESRGAN 8070 >> "%LOG%"
) else (
    echo   [X] ESRGAN - Hors ligne
    echo [HORS LIGNE] ESRGAN >> "%LOG%"
)

del "%TEMP%\port_check.txt" 2>nul

:: ============================================================================
:: SECTION 4: INFOS SYSTEME
:: ============================================================================
echo.
echo [4/4] Informations systeme...
echo.
echo === SYSTEME === >> "%LOG%"

:: Python - Afficher toutes les versions disponibles
echo   Python dans PATH:
python --version 2>nul || echo   [X] Python non trouve dans PATH
python --version >> "%LOG%" 2>&1

echo   Python 3.11 (requis pour IPEX):
py -3.11 --version 2>nul || echo   [!] Python 3.11 non disponible via py launcher
py -3.11 --version >> "%LOG%" 2>&1

:: Vérifier les chemins Python explicites
echo   Chemins Python detectes:
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    echo     [OK] Python311: %LOCALAPPDATA%\Programs\Python\Python311\python.exe
    echo [OK] Python311 trouve >> "%LOG%"
) else (
    echo     [X] Python311 non trouve dans AppData
    echo [MANQUANT] Python311 AppData >> "%LOG%"
)
if exist "C:\Python311\python.exe" (
    echo     [OK] Python311: C:\Python311\python.exe
)

:: Ollama
echo   Ollama:
ollama --version 2>nul || echo   [X] Ollama non trouve dans PATH
ollama --version >> "%LOG%" 2>&1

:: GPU
echo   GPU:
nvidia-smi --query-gpu=name --format=csv,noheader 2>nul || echo   [!] NVIDIA non detecte (Intel Arc ou CPU?)
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader >> "%LOG%" 2>&1

echo.
echo ==============================================================================
echo                         DIAGNOSTIC TERMINE
echo ==============================================================================
echo.
echo   Rapport sauvegarde: %LOG%
echo.
echo   Si des services sont manquants, relancez l'installation:
echo   - install-ai-suite-complete.ps1 (PowerShell)
echo.
echo   Si les services sont installes mais hors ligne:
echo   - start-ai-services.bat
echo.
echo ==============================================================================
echo.

:: Ouvrir le dossier logs
start "" "%LOG_DIR%"

pause
endlocal
