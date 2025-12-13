@echo off
echo ========================================
echo Resume PDF Exporter - Devon Veller
echo ========================================
echo.

cd /d "%~dp0"

REM Copy latest resume.md to public folder
echo 📋 Copying latest resume...
copy "..\resume.lol\source\resume.md" "public\resume.md" >nul

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    echo.
    call npm install
    echo.
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build the React app
echo 🔨 Building React app...
echo.
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

REM Start the dev server in background
echo 🌐 Starting dev server...
start /B npm run dev

REM Wait for server to initialize
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Run the PDF export
echo 📄 Exporting PDF...
echo.
call npm run export

if errorlevel 1 (
    echo.
    echo ❌ PDF export failed
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1
    pause
    exit /b 1
)

REM Stop the dev server
echo.
echo 🛑 Stopping dev server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1

echo.
echo ✅ PDF export complete!
echo 📁 Check the export-to-pdf folder for your PDF
echo.

REM Open the export folder
start "" "%~dp0"

echo Press any key to exit...
pause >nul
