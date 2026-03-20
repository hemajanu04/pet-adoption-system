@echo off
title Pet Adoption System
color 0A
echo ============================================
echo        PET ADOPTION SYSTEM LAUNCHER
echo ============================================
echo.

:: Set working directory to the folder where this .bat file lives
cd /d "%~dp0"

:: Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python and add it to PATH.
    pause
    exit /b 1
)

:: Check if app.py exists
if not exist "app.py" (
    echo [ERROR] app.py not found in: %~dp0
    echo Make sure this .bat file is in the same folder as app.py
    pause
    exit /b 1
)

:: Install requirements if requirements.txt exists
if exist "requirements.txt" (
    echo Installing/checking dependencies...
    pip install -r requirements.txt --quiet
    echo Done.
    echo.
)

:: Start Flask app in a new window
echo Starting Flask server...
start "Flask - Pet Adoption" cmd /k "cd /d "%~dp0" && python app.py"

:: Wait for Flask to fully start
echo Waiting for server to be ready...
timeout /t 5 >nul

:: Try to open browser (retry once if needed)
echo Opening browser...
start "" "http://127.0.0.1:5000/static/index.html"

echo.
echo ============================================
echo  Server is running at:
echo  http://127.0.0.1:5000/static/index.html
echo  Close the Flask window to stop the server.
echo ============================================
pause