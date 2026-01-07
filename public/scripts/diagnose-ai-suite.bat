@echo off
setlocal enableextensions

title MediaVault AI - Diagnostic (One-Click)
color 0A
chcp 65001 >nul 2>&1

set "DEFAULT_AI_DIR=%USERPROFILE%\MediaVault-AI"
set "ALT_AI_DIR=C:\MediaVault-AI"
set "AI_DIR=%DEFAULT_AI_DIR%"
if exist "%ALT_AI_DIR%" set "AI_DIR=%ALT_AI_DIR%"
if exist "%DEFAULT_AI_DIR%" set "AI_DIR=%DEFAULT_AI_DIR%"
set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
  set "D1=%%a" & set "D2=%%b" & set "D3=%%c"
)
set "TS=%D3%%D2%%D1%-%time:~0,2%%time:~3,2%%time:~6,2%"
set "TS=%TS: =0%"
set "LOG=%LOG_DIR%\diagnostic-%TS%.log"

echo MediaVault AI Diagnostic - %date% %time% > "%LOG%"
echo AI_DIR=%AI_DIR%>> "%LOG%"
echo LOG_DIR=%LOG_DIR%>> "%LOG%"
echo.>> "%LOG%"

echo [1/6] Outils...
(
  echo === OUTILS ===
  where winget && echo [OK] winget || echo [X] winget
  where git && echo [OK] git || echo [X] git
  where python && python --version || echo [X] python
  where pip && pip --version || echo [X] pip
  where ollama && echo [OK] ollama || echo [X] ollama
  where curl && echo [OK] curl || echo [X] curl
) >> "%LOG%" 2>&1

echo [2/6] GPU...
(
  echo === GPU ===
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
) >> "%LOG%" 2>&1

powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | Format-Table -AutoSize" >> "%LOG%" 2>&1

echo [3/6] Dossiers...
(
  echo === DOSSIERS ===
  dir "%AI_DIR%" /a
) >> "%LOG%" 2>&1

echo [4/6] Ports (services en ligne?)...
(
  echo === HEALTHCHECKS ===
  echo Ollama: && curl -s -o nul -w "%%{http_code}" http://localhost:11434/api/tags && echo.
  echo ComfyUI: && curl -s -o nul -w "%%{http_code}" http://localhost:8188/system_stats && echo.
  echo Whisper: && curl -s -o nul -w "%%{http_code}" http://localhost:9000/health && echo.
  echo XTTS: && curl -s -o nul -w "%%{http_code}" http://localhost:8020/health && echo.
  echo MusicGen: && curl -s -o nul -w "%%{http_code}" http://localhost:9001/health && echo.
  echo Demucs: && curl -s -o nul -w "%%{http_code}" http://localhost:9002/health && echo.
  echo CLIP: && curl -s -o nul -w "%%{http_code}" http://localhost:9003/health && echo.
  echo ESRGAN: && curl -s -o nul -w "%%{http_code}" http://localhost:9004/health && echo.
) >> "%LOG%" 2>&1

echo [5/6] Processus...
(
  echo === PROCESSUS ===
  tasklist | findstr /i "ollama python"
) >> "%LOG%" 2>&1

echo [6/6] Termine.
echo.
echo Diagnostic enregistre:
echo   %LOG%
echo.
echo J'ouvre le dossier de logs...
start "" "%LOG_DIR%"
pause
endlocal
