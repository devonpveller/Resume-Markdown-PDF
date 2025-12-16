@echo off

echo ========================================
echo Resume System Launcher - Devon Veller
echo ========================================
echo.
echo Starting all services...
echo.

cd /d "%~dp0"

if not exist export-to-pdf\node_modules (
    echo Installing dependencies...
    cd export-to-pdf
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
    cd ..
    echo.
)

if not exist export-to-pdf\dist (
    echo Building React app...
    cd export-to-pdf
    copy ..\resume.lol\source\resume.md public\resume.md >nul
    call npm run build
    if errorlevel 1 (
        echo Build failed
        pause
        exit /b 1
    )
    cd ..
    echo.
)

echo Starting preview server on http://localhost:8000...
cd resume.lol
start "Resume Preview Server" cmd /k "python -m http.server 8000 2>nul || echo Server stopped"
cd ..
timeout /t 2 /nobreak >nul

echo Starting React export server on http://localhost:3000...
cd export-to-pdf
start "React Export Server" cmd /k "npm run dev 2>nul || echo Server stopped"
cd ..
echo.

echo Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo Opening preview in browser...
start http://localhost:8000/preview.html
timeout /t 1 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo ALL SYSTEMS RUNNING
echo ========================================
echo.
echo Preview Server:  http://localhost:8000/preview.html
echo Export App:      http://localhost:3000
echo.
echo Press Ctrl+C to stop servers when done.
echo.

:wait_loop
timeout /t 3600 /nobreak >nul
goto wait_loop
