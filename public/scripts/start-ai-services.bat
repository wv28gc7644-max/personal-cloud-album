@echo off
chcp 65001 >nul
title MediaVault AI Suite - 8 Services
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║          MEDIAVAULT AI SUITE - DEMARRAGE DES 8 SERVICES             ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

:: Detect install directory
set "AI_DIR=%USERPROFILE%\MediaVault-AI"
if not exist "%AI_DIR%" set "AI_DIR=C:\AI"

set "ERRORS=0"
set "LOG_FILE=%AI_DIR%\startup-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log"

echo [%date% %time%] === DEMARRAGE DES SERVICES === >> "%LOG_FILE%"

:: 1. Ollama
echo [1/8] Demarrage de Ollama (LLM)...
echo [%time%] Demarrage Ollama >> "%LOG_FILE%"
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

:: 2. ComfyUI
echo [2/8] Demarrage de ComfyUI (Images)...
if exist "%AI_DIR%\ComfyUI" (
    echo [%time%] Demarrage ComfyUI >> "%LOG_FILE%"
    cd /d "%AI_DIR%\ComfyUI"
    start "ComfyUI" /min cmd /c "call venv\Scripts\activate.bat && python main.py --listen 0.0.0.0 --port 8188 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] ComfyUI non installe
    echo [%time%] ERREUR: ComfyUI non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 3. Whisper
echo [3/8] Demarrage de Whisper (STT)...
if exist "%AI_DIR%\whisper-api" (
    echo [%time%] Demarrage Whisper >> "%LOG_FILE%"
    cd /d "%AI_DIR%\whisper-api"
    start "Whisper" /min cmd /c "call venv\Scripts\activate.bat && python whisper_server.py 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] Whisper non installe
    echo [%time%] ERREUR: Whisper non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 4. XTTS
echo [4/8] Demarrage de XTTS (TTS)...
if exist "%AI_DIR%\xtts-api" (
    echo [%time%] Demarrage XTTS >> "%LOG_FILE%"
    cd /d "%AI_DIR%\xtts-api"
    start "XTTS" /min cmd /c "call venv\Scripts\activate.bat && python xtts_server.py 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] XTTS non installe
    echo [%time%] ERREUR: XTTS non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 5. MusicGen
echo [5/8] Demarrage de MusicGen...
if exist "%AI_DIR%\musicgen-api" (
    echo [%time%] Demarrage MusicGen >> "%LOG_FILE%"
    cd /d "%AI_DIR%\musicgen-api"
    start "MusicGen" /min cmd /c "call venv\Scripts\activate.bat && python musicgen_server.py 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] MusicGen non installe
    echo [%time%] ERREUR: MusicGen non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 6. Demucs
echo [6/8] Demarrage de Demucs...
if exist "%AI_DIR%\demucs-api" (
    echo [%time%] Demarrage Demucs >> "%LOG_FILE%"
    cd /d "%AI_DIR%\demucs-api"
    start "Demucs" /min cmd /c "call venv\Scripts\activate.bat && python demucs_server.py 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] Demucs non installe
    echo [%time%] ERREUR: Demucs non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 7. CLIP
echo [7/8] Demarrage de CLIP (Analyse)...
if exist "%AI_DIR%\clip-api" (
    echo [%time%] Demarrage CLIP >> "%LOG_FILE%"
    cd /d "%AI_DIR%\clip-api"
    start "CLIP" /min cmd /c "call venv\Scripts\activate.bat && python clip_server.py 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] CLIP non installe
    echo [%time%] ERREUR: CLIP non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)
timeout /t 2 /nobreak >nul

:: 8. ESRGAN
echo [8/8] Demarrage de ESRGAN (Upscale)...
if exist "%AI_DIR%\esrgan-api" (
    echo [%time%] Demarrage ESRGAN >> "%LOG_FILE%"
    cd /d "%AI_DIR%\esrgan-api"
    start "ESRGAN" /min cmd /c "call venv\Scripts\activate.bat && python esrgan_server.py 2>> "%LOG_FILE%""
) else (
    echo [ERREUR] ESRGAN non installe
    echo [%time%] ERREUR: ESRGAN non installe >> "%LOG_FILE%"
    set /a ERRORS+=1
)

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                    SERVICES IA DEMARRES                             ║
echo ╠══════════════════════════════════════════════════════════════════════╣
echo ║  1. Ollama (LLM)      : http://localhost:11434                       ║
echo ║  2. ComfyUI (Images)  : http://localhost:8188                        ║
echo ║  3. Whisper (STT)     : http://localhost:9000                        ║
echo ║  4. XTTS (TTS)        : http://localhost:8020                        ║
echo ║  5. MusicGen          : http://localhost:8030                        ║
echo ║  6. Demucs            : http://localhost:8040                        ║
echo ║  7. CLIP (Analyse)    : http://localhost:8060                        ║
echo ║  8. ESRGAN (Upscale)  : http://localhost:8070                        ║
echo ╠══════════════════════════════════════════════════════════════════════╣
echo ║  Erreurs de demarrage: %ERRORS%                                             ║
echo ║  Log: %LOG_FILE%
echo ║  Pour arreter: stop-ai-services.bat                                  ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

:: Wait for services to start
echo Verification des services dans 15 secondes...
timeout /t 15 /nobreak >nul

echo.
echo ═══════════════════════════════════════════════════════════════════════
echo                      VERIFICATION DES SERVICES
echo ═══════════════════════════════════════════════════════════════════════
echo.

:: Create verification log
set "VERIFY_LOG=%AI_DIR%\verification.log"
echo [%date% %time%] === VERIFICATION === > "%VERIFY_LOG%"

:: Check each service with detailed logging
echo Verification de Ollama...
curl -s -o nul -w "%%{http_code}" http://localhost:11434/api/tags > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] Ollama - En ligne
    echo [OK] Ollama - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] Ollama - Hors ligne (code: %CODE%)
    echo [ERREUR] Ollama - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de ComfyUI...
curl -s -o nul -w "%%{http_code}" http://localhost:8188/system_stats > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] ComfyUI - En ligne
    echo [OK] ComfyUI - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] ComfyUI - Hors ligne (code: %CODE%)
    echo [ERREUR] ComfyUI - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de Whisper...
curl -s -o nul -w "%%{http_code}" http://localhost:9000/health > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] Whisper - En ligne
    echo [OK] Whisper - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] Whisper - Hors ligne (code: %CODE%)
    echo [ERREUR] Whisper - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de XTTS...
curl -s -o nul -w "%%{http_code}" http://localhost:8020/health > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] XTTS - En ligne
    echo [OK] XTTS - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] XTTS - Hors ligne (code: %CODE%)
    echo [ERREUR] XTTS - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de MusicGen...
curl -s -o nul -w "%%{http_code}" http://localhost:8030/health > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] MusicGen - En ligne
    echo [OK] MusicGen - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] MusicGen - Hors ligne (code: %CODE%)
    echo [ERREUR] MusicGen - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de Demucs...
curl -s -o nul -w "%%{http_code}" http://localhost:8040/health > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] Demucs - En ligne
    echo [OK] Demucs - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] Demucs - Hors ligne (code: %CODE%)
    echo [ERREUR] Demucs - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de CLIP...
curl -s -o nul -w "%%{http_code}" http://localhost:8060/health > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] CLIP - En ligne
    echo [OK] CLIP - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] CLIP - Hors ligne (code: %CODE%)
    echo [ERREUR] CLIP - %CODE% >> "%VERIFY_LOG%"
)

echo Verification de ESRGAN...
curl -s -o nul -w "%%{http_code}" http://localhost:8070/health > temp_code.txt 2>nul
set /p CODE=<temp_code.txt
if "%CODE%"=="200" (
    echo [OK] ESRGAN - En ligne
    echo [OK] ESRGAN - 200 >> "%VERIFY_LOG%"
) else (
    echo [X] ESRGAN - Hors ligne (code: %CODE%)
    echo [ERREUR] ESRGAN - %CODE% >> "%VERIFY_LOG%"
)

del temp_code.txt 2>nul

echo.
echo ═══════════════════════════════════════════════════════════════════════
echo Log de verification: %VERIFY_LOG%
echo Les services tournent en arriere-plan.
echo ═══════════════════════════════════════════════════════════════════════
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
