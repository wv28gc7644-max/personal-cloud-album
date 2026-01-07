@echo off
setlocal enableextensions

title MediaVault AI - Etape 04 - Installer Ollama
color 0B
chcp 65001 >nul 2>&1

set "THIS_SCRIPT=%~f0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] Demande admin...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -Verb RunAs -ArgumentList '/k','call ""%THIS_SCRIPT%""'"
  exit /b
)


set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%a"
set "LOG=%LOG_DIR%\step-04-ollama-%TS%.log"

(
  echo [INFO] %date% %time%
  echo [STEP] ollama
) > "%LOG%"

echo.
echo === ETAPE 04 - OLLAMA ===
echo.

where ollama >> "%LOG%" 2>&1
if %errorlevel% equ 0 (
  ollama --version >> "%LOG%" 2>&1
  echo [OK] Ollama deja installe.
  echo [OK] Ollama deja installe.>> "%LOG%"
  echo Log: %LOG%
  pause
  exit /b 0
)

echo [INFO] Installation Ollama via winget...>> "%LOG%"
winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent >> "%LOG%" 2>&1

REM Refresh PATH
for /f "delims=" %%p in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"') do set "PATH=%%p"

where ollama >> "%LOG%" 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] Ollama non disponible apres installation.>> "%LOG%"
  echo [ERREUR] Ollama non disponible.
  echo Log: %LOG%
  pause
  exit /b 1
)

ollama --version >> "%LOG%" 2>&1
echo [OK] Ollama installe.>> "%LOG%"
echo [OK] Ollama installe.

echo.
echo Log: %LOG%
pause
endlocal
