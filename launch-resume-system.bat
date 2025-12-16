@echo off

echo ========================================
echo Resume System Launcher - Devon Veller
echo ========================================
echo.
echo Starting all services...
echo.

cd /d "%~dp0"

echo Syncing latest resume.md to React app...
copy resume.lol\source\resume.md export-to-pdf\public\resume.md >nul

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

echo Starting React dev server on http://localhost:3000...
cd export-to-pdf
start "Resume System" cmd /k "npm run dev 2>nul || echo Server stopped"
cd ..
echo.

echo Starting file watcher for auto-sync...
start "Resume File Watcher" /MIN cmd /k "watch-resume.bat"
echo.

echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo Opening resume system in browser...
start http://localhost:3000

echo.
echo ========================================
echo RESUME SYSTEM RUNNING
echo ========================================
echo.
echo Resume Preview ^& Export:  http://localhost:3000
echo.
echo - Live preview with auto-refresh
echo - Export PDF button for automated export
echo - Browser Print option available
echo.
echo Press Ctrl+C to stop server when done.
echo.

:wait_loop
timeout /t 3600 /nobreak >nul
goto wait_loop
