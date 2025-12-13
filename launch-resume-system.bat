@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Resume System Launcher - Devon Veller
echo ========================================
echo.
echo Starting all services...
echo.

cd /d "%~dp0"

REM Check if export-to-pdf dependencies are installed
if not exist "export-to-pdf\node_modules\" (
    echo 📦 Installing export dependencies (first time only)...
    cd export-to-pdf
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    cd ..
    echo.
)

REM Build React app if not already built
if not exist "export-to-pdf\dist\" (
    echo 🔨 Building React export app (first time only)...
    cd export-to-pdf
    
    REM Copy latest resume.md
    copy "..\resume.lol\source\resume.md" "public\resume.md" >nul
    
    call npm run build
    if errorlevel 1 (
        echo ❌ Build failed
        pause
        exit /b 1
    )
    cd ..
    echo.
)

REM Start preview server (existing preview.html)
echo 🌐 Starting preview server on http://localhost:8000...
cd resume.lol
start "Resume Preview Server" cmd /k "python -m http.server 8000 2>nul || echo Server stopped"
cd ..
timeout /t 2 /nobreak >nul

REM Start React export dev server
echo 🚀 Starting React export server on http://localhost:3000...
cd export-to-pdf
start "React Export Server" cmd /k "npm run dev 2>nul || echo Server stopped"
cd ..
echo.

REM Wait for servers to fully initialize
echo ⏳ Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

REM Open both in browser
echo 🌍 Opening preview in browser...
start http://localhost:8000/preview.html
timeout /t 1 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo ✅ ALL SYSTEMS RUNNING
echo ========================================
echo.
echo 📋 Preview Server:  http://localhost:8000/preview.html
echo 🔧 Export App:      http://localhost:3000
echo.
echo What would you like to do?
echo.
echo   1. Export PDF now
echo   2. Rebuild React app
echo   3. Keep servers running (manual work)
echo   4. Stop all servers and exit
echo.

:menu
choice /C 1234 /N /M "Select an option (1-4): "

if errorlevel 4 goto cleanup
if errorlevel 3 goto keep_running
if errorlevel 2 goto rebuild
if errorlevel 1 goto export_pdf

:export_pdf
echo.
echo 📄 Exporting PDF...
cd export-to-pdf

REM Copy latest resume.md
copy "..\resume.lol\source\resume.md" "public\resume.md" >nul

call npm run export
if errorlevel 1 (
    echo ❌ Export failed
    cd ..
    goto menu
)
cd ..
echo.
echo ✅ PDF exported successfully!
echo 📁 Opening export folder...
start "" "export-to-pdf"
echo.
goto menu

:rebuild
echo.
echo 🔨 Rebuilding React app...
cd export-to-pdf
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    cd ..
    goto menu
)
cd ..
echo.
echo ✅ Rebuild complete!
echo.
goto menu

:keep_running
echo.
echo ========================================
echo Servers will continue running...
echo ========================================
echo.
echo 📋 Preview: http://localhost:8000/preview.html
echo 🔧 Export:  http://localhost:3000
echo.
echo Make your changes, then:
echo   - Press Enter to return to menu
echo   - Or close this window to stop servers
echo.
pause
goto menu

:cleanup
echo.
echo 🛑 Stopping all servers...

REM Kill both servers by window title
taskkill /FI "WINDOWTITLE eq Resume Preview Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq React Export Server*" /T /F >nul 2>&1

REM Fallback: kill by process name if window title doesn't work
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1

echo ✅ All servers stopped
echo.
echo Goodbye!
timeout /t 2 /nobreak >nul
exit /b 0
