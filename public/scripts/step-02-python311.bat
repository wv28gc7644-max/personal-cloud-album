@echo off
setlocal enableextensions

title MediaVault AI - Etape 02 - Installer Python 3.11
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
set "LOG=%LOG_DIR%\step-02-python311-%TS%.log"

(
  echo [INFO] %date% %time%
  echo [STEP] python311
) > "%LOG%"

echo.
echo === ETAPE 02 - PYTHON 3.11 ===
echo.

echo [INFO] Verification py -3.11...>> "%LOG%"
py -3.11 --version >> "%LOG%" 2>&1
if %errorlevel% equ 0 (
  echo [OK] Python 3.11 deja dispo via py.>> "%LOG%"
  echo [OK] Python 3.11 deja dispo.
  echo Log: %LOG%
  pause
  exit /b 0
)

echo [INFO] Installation Python 3.11 via winget...>> "%LOG%"
winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent >> "%LOG%" 2>&1

REM Refresh PATH for current session
for /f "delims=" %%p in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"') do set "PATH=%%p"

py -3.11 --version >> "%LOG%" 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] Python 3.11 pas disponible apres installation.>> "%LOG%"
  echo [ERREUR] Python 3.11 non disponible.
  echo Log: %LOG%
  pause
  exit /b 1
)

echo [OK] Python 3.11 installe.>> "%LOG%"
echo [OK] Python 3.11 installe.

echo.
echo Log: %LOG%
pause
endlocal
