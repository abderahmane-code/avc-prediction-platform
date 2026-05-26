@echo off
title Next.js Frontend Server
cd /d "%~dp0frontend"
echo ===================================================
echo   Demarrage de l'application Next.js (Prediction AVC)
echo ===================================================
echo.

if not exist node_modules (
    echo [INFO] node_modules non trouve. Installation des dependances npm...
    call npm install
)

echo.
echo Demarrage du serveur de developpement Next.js sur http://localhost:3000
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo.
call npm run dev
pause
