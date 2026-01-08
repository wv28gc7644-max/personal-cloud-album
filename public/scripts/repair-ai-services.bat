@echo off
chcp 65001 >nul
title MediaVault AI Suite - Reparation Intelligente
color 0E

echo.
echo ==============================================================================
echo          MEDIAVAULT AI SUITE - REPARATION INTELLIGENTE
echo ==============================================================================
echo.
echo Ce script va diagnostiquer et reparer les services IA defaillants.
echo.

:: Demander elevation admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Elevation des privileges requise...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
set "REPAIR_LOG=%LOG_DIR%\repair-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%date% %time%] === DEBUT REPARATION === > "%REPAIR_LOG%"
echo.

:: Lancer le script PowerShell de reparation
echo [INFO] Lancement du script de reparation PowerShell...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0repair-ai-services.ps1" -LogFile "%REPAIR_LOG%"

echo.
echo ==============================================================================
echo   Reparation terminee. Log: %REPAIR_LOG%
echo ==============================================================================
echo.
pause
