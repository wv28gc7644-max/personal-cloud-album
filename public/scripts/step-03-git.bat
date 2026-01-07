@echo off
setlocal enableextensions

title MediaVault AI - Etape 03 - Installer Git
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
set "LOG=%LOG_DIR%\step-03-git-%TS%.log"

(
  echo [INFO] %date% %time%
  echo [STEP] git
) > "%LOG%"

echo.
echo === ETAPE 03 - GIT ===
echo.

where git >> "%LOG%" 2>&1
if %errorlevel% equ 0 (
  git --version >> "%LOG%" 2>&1
  echo [OK] Git deja installe.
  echo [OK] Git deja installe.>> "%LOG%"
  echo Log: %LOG%
  pause
  exit /b 0
)

echo [INFO] Installation Git via winget...>> "%LOG%"
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent >> "%LOG%" 2>&1

REM Refresh PATH
for /f "delims=" %%p in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"') do set "PATH=%%p"

where git >> "%LOG%" 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] Git non disponible apres installation.>> "%LOG%"
  echo [ERREUR] Git non disponible.
  echo Log: %LOG%
  pause
  exit /b 1
)

git --version >> "%LOG%" 2>&1
echo [OK] Git installe.>> "%LOG%"
echo [OK] Git installe.

echo.
echo Log: %LOG%
pause
endlocal
