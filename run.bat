@echo off
echo Starting Pet Adoption System...
echo.

cd /d %~dp0

start cmd /k python app.py

timeout /t 3 >nul

start http://127.0.0.1:5000/static/index.html

exit
