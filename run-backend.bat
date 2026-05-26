@echo off
title Django Backend Server
cd /d "%~dp0backend"
echo ===================================================
echo   Demarrage du Serveur Django (Prediction AVC)
echo   Utilisation de l'environnement virtuel (.venv)
echo ===================================================
echo.

if not exist .venv (
    echo [ERREUR] L'environnement virtuel (.venv) n'existe pas dans le dossier backend.
    echo Veuillez executer l'installation prealable.
    pause
    exit /b
)

echo Validation de la base de donnees et des paquets...
.venv\Scripts\python.exe -c "import django, joblib, sklearn; print('Packages requis presents : OK')"

if %errorlevel% neq 0 (
    echo [ERREUR] Des modules requis sont manquants dans .venv.
    echo Tentative d'installation automatique depuis requirements.txt...
    .venv\Scripts\python.exe -m pip install -r requirements.txt
)

echo.
echo Demarrage du serveur de developpement Django sur http://127.0.0.1:8000/
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo.
.venv\Scripts\python.exe manage.py runserver
pause
