@echo off
echo ========================================
echo Quick PDF Export
echo ========================================
echo.

cd /d "%~dp0\export-to-pdf"

echo 📄 Exporting PDF...
call npm run export

if errorlevel 1 (
    echo.
    echo ❌ Export failed
    echo.
    echo Make sure servers are running:
    echo   Run launch-resume-system.bat first
    pause
    exit /b 1
)

echo.
echo ✅ PDF exported successfully!
echo 📁 Opening export folder...
start "" "%~dp0\export-to-pdf"
echo.
pause
