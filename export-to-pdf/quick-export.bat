@echo off
echo ========================================
echo Quick PDF Export - Devon Veller
echo ========================================
echo.

cd /d "%~dp0"

REM Copy latest resume.md to public folder
echo 📋 Copying latest resume...
copy "..\source\resume.md" "public\resume.md" >nul

echo 🌐 Starting dev server...
start /B npm run dev

echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

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

echo.
echo 🛑 Stopping dev server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1

echo.
echo ✅ PDF export complete!
echo.
start "" "%~dp0"

echo Press any key to exit...
pause >nul
