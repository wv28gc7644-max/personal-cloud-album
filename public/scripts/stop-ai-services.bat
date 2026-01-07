@echo off
chcp 65001 >nul
title MediaVault - Arrêt des services IA
color 0C

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         MediaVault - Arrêt des services IA                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/4] Arrêt de Ollama...
taskkill /IM "ollama.exe" /F >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       Ollama arrêté
) else (
    echo       Ollama n'était pas en cours d'exécution
)

echo [2/4] Arrêt de ComfyUI...
:: Trouver et arrêter le processus Python de ComfyUI
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%main.py%%8188%%'" get processid 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /PID %%i /F >nul 2>&1
)
echo       ComfyUI arrêté

echo [3/4] Arrêt de Whisper...
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%whisper_server%%'" get processid 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /PID %%i /F >nul 2>&1
)
echo       Whisper arrêté

echo [4/4] Arrêt de XTTS...
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%xtts_server%%'" get processid 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /PID %%i /F >nul 2>&1
)
echo       XTTS arrêté

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           Tous les services IA ont été arrêtés               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
timeout /t 3
