@echo off
chcp 65001 >nul
title MediaVault AI Suite - 8 Services
color 0A

echo.
echo ==============================================================================
echo          MEDIAVAULT AI SUITE - DEMARRAGE DES 8 SERVICES
echo ==============================================================================
echo.

:: UTILISER CHEMIN ABSOLU - %USERPROFILE%\MediaVault-AI
set "AI_DIR=%USERPROFILE%\MediaVault-AI"
echo Dossier IA: %AI_DIR%

:: Vérifier que le dossier existe
if not exist "%AI_DIR%" (
    echo.
    echo [ERREUR CRITIQUE] Dossier non trouve: %AI_DIR%
    echo Veuillez d'abord executer l'installation avec install-ai-suite-complete.ps1
    echo.
    pause
    exit /b 1
)

set "ERRORS=0"
set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "LOG_FILE=%LOG_DIR%\startup-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log"
echo [%date% %time%] === DEMARRAGE DES SERVICES === > "%LOG_FILE%"
echo AI_DIR=%AI_DIR% >> "%LOG_FILE%"

:: 1. Ollama
echo [1/8] Demarrage de Ollama (LLM)...
echo [%time%] Demarrage Ollama >> "%LOG_FILE%"
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

:: 2. ComfyUI (chemin absolu avec venv)
echo [2/8] Demarrage de ComfyUI (Images)...
set "COMFY_DIR=%AI_DIR%\ComfyUI"
set "COMFY_VENV=%COMFY_DIR%\venv\Scripts\activate.bat"
echo   Test: %COMFY_DIR% >> "%LOG_FILE%"
if exist "%COMFY_DIR%\main.py" (
    if exist "%COMFY_VENV%" (
        echo [%time%] Demarrage ComfyUI >> "%LOG_FILE%"
        start "ComfyUI" /min cmd /c "cd /d "%COMFY_DIR%" && call venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188 2>> "%LOG_DIR%\comfyui.log""
    ) else (
        echo   [ERREUR] ComfyUI venv non trouve: %COMFY_VENV%
        echo [%time%] ERREUR: ComfyUI venv manquant >> "%LOG_FILE%"
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] ComfyUI non installe - dossier introuvable: %COMFY_DIR%
    echo [%time%] ERREUR: ComfyUI non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 3. Whisper (chemin absolu - vérifier server.py)
echo [3/8] Demarrage de Whisper (STT)...
set "WHISPER_DIR=%AI_DIR%\whisper-api"
set "WHISPER_VENV=%WHISPER_DIR%\venv\Scripts\activate.bat"
set "WHISPER_SERVER=%WHISPER_DIR%\server.py"
echo   Test: %WHISPER_DIR% >> "%LOG_FILE%"
if exist "%WHISPER_SERVER%" (
    if exist "%WHISPER_VENV%" (
        echo [%time%] Demarrage Whisper >> "%LOG_FILE%"
        start "Whisper" /min cmd /c "cd /d "%WHISPER_DIR%" && call venv\Scripts\activate.bat && python server.py 2>> "%LOG_DIR%\whisper.log""
    ) else (
        echo   [ERREUR] Whisper venv non trouve
        echo [%time%] ERREUR: Whisper venv manquant >> "%LOG_FILE%"
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] Whisper non installe - server.py introuvable: %WHISPER_SERVER%
    echo [%time%] ERREUR: Whisper non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 4. XTTS (chemin absolu)
echo [4/8] Demarrage de XTTS (TTS)...
set "XTTS_DIR=%AI_DIR%\xtts-api"
set "XTTS_VENV=%XTTS_DIR%\venv\Scripts\activate.bat"
set "XTTS_SERVER=%XTTS_DIR%\server.py"
echo   Test: %XTTS_DIR% >> "%LOG_FILE%"
if exist "%XTTS_SERVER%" (
    if exist "%XTTS_VENV%" (
        echo [%time%] Demarrage XTTS >> "%LOG_FILE%"
        start "XTTS" /min cmd /c "cd /d "%XTTS_DIR%" && call venv\Scripts\activate.bat && python server.py 2>> "%LOG_DIR%\xtts.log""
    ) else (
        echo   [ERREUR] XTTS venv non trouve
        echo [%time%] ERREUR: XTTS venv manquant >> "%LOG_FILE%"
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] XTTS non installe - server.py introuvable: %XTTS_SERVER%
    echo [%time%] ERREUR: XTTS non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 5. MusicGen (chemin absolu)
echo [5/8] Demarrage de MusicGen...
set "MUSICGEN_DIR=%AI_DIR%\musicgen-api"
set "MUSICGEN_VENV=%MUSICGEN_DIR%\venv\Scripts\activate.bat"
set "MUSICGEN_SERVER=%MUSICGEN_DIR%\server.py"
echo   Test: %MUSICGEN_DIR% >> "%LOG_FILE%"
if exist "%MUSICGEN_SERVER%" (
    if exist "%MUSICGEN_VENV%" (
        echo [%time%] Demarrage MusicGen >> "%LOG_FILE%"
        start "MusicGen" /min cmd /c "cd /d "%MUSICGEN_DIR%" && call venv\Scripts\activate.bat && python server.py 2>> "%LOG_DIR%\musicgen.log""
    ) else (
        echo   [ERREUR] MusicGen venv non trouve
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] MusicGen non installe
    echo [%time%] ERREUR: MusicGen non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 6. Demucs (chemin absolu)
echo [6/8] Demarrage de Demucs...
set "DEMUCS_DIR=%AI_DIR%\demucs-api"
set "DEMUCS_VENV=%DEMUCS_DIR%\venv\Scripts\activate.bat"
set "DEMUCS_SERVER=%DEMUCS_DIR%\server.py"
echo   Test: %DEMUCS_DIR% >> "%LOG_FILE%"
if exist "%DEMUCS_SERVER%" (
    if exist "%DEMUCS_VENV%" (
        echo [%time%] Demarrage Demucs >> "%LOG_FILE%"
        start "Demucs" /min cmd /c "cd /d "%DEMUCS_DIR%" && call venv\Scripts\activate.bat && python server.py 2>> "%LOG_DIR%\demucs.log""
    ) else (
        echo   [ERREUR] Demucs venv non trouve
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] Demucs non installe
    echo [%time%] ERREUR: Demucs non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 7. CLIP (chemin absolu)
echo [7/8] Demarrage de CLIP (Analyse)...
set "CLIP_DIR=%AI_DIR%\clip-api"
set "CLIP_VENV=%CLIP_DIR%\venv\Scripts\activate.bat"
set "CLIP_SERVER=%CLIP_DIR%\server.py"
echo   Test: %CLIP_DIR% >> "%LOG_FILE%"
if exist "%CLIP_SERVER%" (
    if exist "%CLIP_VENV%" (
        echo [%time%] Demarrage CLIP >> "%LOG_FILE%"
        start "CLIP" /min cmd /c "cd /d "%CLIP_DIR%" && call venv\Scripts\activate.bat && python server.py 2>> "%LOG_DIR%\clip.log""
    ) else (
        echo   [ERREUR] CLIP venv non trouve
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] CLIP non installe
    echo [%time%] ERREUR: CLIP non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 8. ESRGAN (chemin absolu)
echo [8/8] Demarrage de ESRGAN (Upscale)...
set "ESRGAN_DIR=%AI_DIR%\esrgan-api"
set "ESRGAN_VENV=%ESRGAN_DIR%\venv\Scripts\activate.bat"
set "ESRGAN_SERVER=%ESRGAN_DIR%\server.py"
echo   Test: %ESRGAN_DIR% >> "%LOG_FILE%"
if exist "%ESRGAN_SERVER%" (
    if exist "%ESRGAN_VENV%" (
        echo [%time%] Demarrage ESRGAN >> "%LOG_FILE%"
        start "ESRGAN" /min cmd /c "cd /d "%ESRGAN_DIR%" && call venv\Scripts\activate.bat && python server.py 2>> "%LOG_DIR%\esrgan.log""
    ) else (
        echo   [ERREUR] ESRGAN venv non trouve
        set /a ERRORS+=1
    )
) else (
    echo   [ERREUR] ESRGAN non installe
    echo [%time%] ERREUR: ESRGAN non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)

echo.
echo ==============================================================================
echo                         SERVICES IA EN DEMARRAGE
echo ==============================================================================
echo   1. Ollama (LLM)      : http://localhost:11434
echo   2. ComfyUI (Images)  : http://localhost:8188
echo   3. Whisper (STT)     : http://localhost:9000
echo   4. XTTS (TTS)        : http://localhost:8020
echo   5. MusicGen          : http://localhost:8030
echo   6. Demucs            : http://localhost:8040
echo   7. CLIP (Analyse)    : http://localhost:8060
echo   8. ESRGAN (Upscale)  : http://localhost:8070
echo ==============================================================================
echo   Erreurs de demarrage: %ERRORS%
echo   Logs: %LOG_DIR%
echo   Pour arreter: stop-ai-services.bat
echo ==============================================================================
echo.

:: Wait for services to start
echo Verification des services dans 20 secondes...
echo (Les premiers demarrages peuvent prendre plus de temps pour charger les modeles)
timeout /t 20 /nobreak >nul

echo.
echo ==============================================================================
echo                      VERIFICATION DES SERVICES
echo ==============================================================================
echo.

:: Create verification log
set "VERIFY_LOG=%LOG_DIR%\verification.log"
echo [%date% %time%] === VERIFICATION === > "%VERIFY_LOG%"

:: Check each service
echo Verification de Ollama...
curl -s -o nul -w "%%{http_code}" http://localhost:11434/api/tags > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] Ollama - En ligne
    echo [OK] Ollama >> "%VERIFY_LOG%"
) else (
    echo   [X] Ollama - Hors ligne
    echo [ERREUR] Ollama >> "%VERIFY_LOG%"
)

echo Verification de ComfyUI...
curl -s -o nul -w "%%{http_code}" http://localhost:8188/system_stats > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] ComfyUI - En ligne
    echo [OK] ComfyUI >> "%VERIFY_LOG%"
) else (
    echo   [X] ComfyUI - Hors ligne ^(normal au premier demarrage^)
    echo [ERREUR] ComfyUI >> "%VERIFY_LOG%"
)

echo Verification de Whisper...
curl -s -o nul -w "%%{http_code}" http://localhost:9000/health > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] Whisper - En ligne
    echo [OK] Whisper >> "%VERIFY_LOG%"
) else (
    echo   [X] Whisper - Hors ligne
    echo [ERREUR] Whisper >> "%VERIFY_LOG%"
)

echo Verification de XTTS...
curl -s -o nul -w "%%{http_code}" http://localhost:8020/health > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] XTTS - En ligne
    echo [OK] XTTS >> "%VERIFY_LOG%"
) else (
    echo   [X] XTTS - Hors ligne
    echo [ERREUR] XTTS >> "%VERIFY_LOG%"
)

echo Verification de MusicGen...
curl -s -o nul -w "%%{http_code}" http://localhost:8030/health > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] MusicGen - En ligne
    echo [OK] MusicGen >> "%VERIFY_LOG%"
) else (
    echo   [X] MusicGen - Hors ligne
    echo [ERREUR] MusicGen >> "%VERIFY_LOG%"
)

echo Verification de Demucs...
curl -s -o nul -w "%%{http_code}" http://localhost:8040/health > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] Demucs - En ligne
    echo [OK] Demucs >> "%VERIFY_LOG%"
) else (
    echo   [X] Demucs - Hors ligne
    echo [ERREUR] Demucs >> "%VERIFY_LOG%"
)

echo Verification de CLIP...
curl -s -o nul -w "%%{http_code}" http://localhost:8060/health > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] CLIP - En ligne
    echo [OK] CLIP >> "%VERIFY_LOG%"
) else (
    echo   [X] CLIP - Hors ligne
    echo [ERREUR] CLIP >> "%VERIFY_LOG%"
)

echo Verification de ESRGAN...
curl -s -o nul -w "%%{http_code}" http://localhost:8070/health > "%TEMP%\code.txt" 2>nul
set /p CODE=<"%TEMP%\code.txt"
if "%CODE%"=="200" (
    echo   [OK] ESRGAN - En ligne
    echo [OK] ESRGAN >> "%VERIFY_LOG%"
) else (
    echo   [X] ESRGAN - Hors ligne
    echo [ERREUR] ESRGAN >> "%VERIFY_LOG%"
)

del "%TEMP%\code.txt" 2>nul

echo.
echo ==============================================================================
echo   Log de verification: %VERIFY_LOG%
echo   Les services tournent en arriere-plan.
echo   Note: Certains services mettent du temps a charger les modeles.
echo ==============================================================================
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
