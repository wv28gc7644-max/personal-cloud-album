@echo off
setlocal enableextensions

title MediaVault AI - Etape 01 - Prerequis (winget)
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
set "LOG=%LOG_DIR%\step-01-prereqs-%TS%.log"

(
  echo [INFO] %date% %time%
  echo [STEP] prereqs
) > "%LOG%"

echo.
echo === ETAPE 01 - PREREQUIS ===
echo.

echo [CHECK] winget...
echo [CHECK] winget... >> "%LOG%"
where winget >> "%LOG%" 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] winget introuvable. Installe "App Installer" depuis Microsoft Store.>> "%LOG%"
  echo [ERREUR] winget introuvable.
  echo Log: %LOG%
  pause
  exit /b 1
)

echo [OK] winget disponible.>> "%LOG%"
echo [OK] winget disponible.

echo.
echo Log: %LOG%
pause
endlocal
