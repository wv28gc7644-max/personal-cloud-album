@echo off
title MediaVault - Demarrage
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         MediaVault - Demarrage           ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Verifier Node.js
echo [1/4] Verification de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe!
    echo Telecharger depuis: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo       Node.js %NODE_VERSION% detecte

:: Aller au dossier du projet
echo.
echo [2/4] Navigation vers le projet...
cd /d "%~dp0..\.."
echo       Dossier: %CD%

:: Verifier si le serveur est deja en cours
echo.
echo [3/4] Verification du serveur...
netstat -ano | findstr :3001 >nul 2>nul
if %errorlevel% equ 0 (
    echo       Serveur deja en cours sur le port 3001
) else (
    echo       Demarrage du serveur local...
    start /min cmd /c "node server.cjs"
    timeout /t 2 /nobreak >nul
)

:: Ouvrir le navigateur
echo.
echo [4/4] Ouverture du navigateur...
timeout /t 1 /nobreak >nul
start http://localhost:3001

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║    MediaVault est pret !                 ║
echo  ║                                          ║
echo  ║    Interface: http://localhost:8080      ║
echo  ║    Serveur:   http://localhost:3001      ║
echo  ║                                          ║
echo  ║    Appuyez sur une touche pour fermer    ║
echo  ╚══════════════════════════════════════════╝
echo.
pause >nul
