@echo off
echo Starting Resume Preview Server...
echo.
cd /d "%~dp0"
start /B python -m http.server 8000
echo Waiting for server to initialize...
timeout /t 2 /nobreak >nul
echo Opening browser...
start http://localhost:8000/preview.html
echo.
echo Server is running at: http://localhost:8000/preview.html
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000 >nul 2>&1
