@echo off
setlocal enableextensions enabledelayedexpansion

title MediaVault AI - Etape 05 - Installation Complete
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
set "PS1_SRC=%~dp0install-ai-suite-complete.ps1"
set "PS1_DST=%AI_DIR%\install-ai-suite-complete.ps1"

echo.
echo === ETAPE 05 - INSTALLATION COMPLETE ===
echo.

:: Creer les dossiers
if not exist "%AI_DIR%" mkdir "%AI_DIR%" 2>nul
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul

:: Verifier que le script source existe
if not exist "%PS1_SRC%" (
  echo [ERREUR] install-ai-suite-complete.ps1 introuvable: %PS1_SRC%
  pause
  exit /b 1
)

:: Copier le PS1 dans un chemin SANS accents (evite Telechargements)
:: SAUF si source = cible (deja au bon endroit)
if /i "%PS1_SRC%"=="%PS1_DST%" (
  echo [INFO] Script deja dans %AI_DIR%, copie non necessaire.
) else (
  echo [INFO] Copie du script dans %AI_DIR%...
  
  :: Utiliser PowerShell Copy-Item (plus fiable avec chemins OneDrive/accents)
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -LiteralPath '%PS1_SRC%' -Destination '%PS1_DST%' -Force" 1>nul 2>"%LOG_DIR%\step-05-copy-error.txt"
  if !errorlevel! neq 0 (
    echo [ERREUR] Impossible de copier le script.
    echo Details: %LOG_DIR%\step-05-copy-error.txt
    echo Source : %PS1_SRC%
    echo Cible  : %PS1_DST%
    pause
    exit /b 1
  )
  echo [OK] Script copie.
)

:: Generer timestamp pour le log
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%a"
set "LOG=%LOG_DIR%\step-05-complete-%TS%.log"

echo [INFO] Log: %LOG%
echo.
echo ============================================================
echo   L'installation peut prendre 15-45 minutes selon le reseau
echo   Les paquets Python (torch, whisper...) sont volumineux
echo   La progression s'affiche EN TEMPS REEL ci-dessous
echo ============================================================
echo.

:: Executer depuis le chemin sur (sans accents) - SANS redirection pour voir le progres
cd /d "%AI_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_DST%" -InstallDir "%AI_DIR%" 2>&1 | powershell -NoProfile -Command "$input | Tee-Object -FilePath '%LOG%' -Append"
set "RC=%errorlevel%"

echo.
echo ============================================================
if not "%RC%"=="0" (
  echo [ERREUR] Etape 05 echouee (code=%RC%).
  echo.
  echo Log complet: %LOG%
  echo.
  echo Pour diagnostiquer, ouvre PowerShell et tape:
  echo   Get-Content "%LOG%" -Tail 50
  echo.
) else (
  echo [OK] INSTALLATION TERMINEE AVEC SUCCES!
  echo.
  echo Prochaine etape: Lance les services avec:
  echo   %AI_DIR%\start-ai-services.bat
  echo.
  echo Log complet: %LOG%
)

echo ============================================================
echo Appuie sur une touche pour fermer...
pause >nul
endlocal
