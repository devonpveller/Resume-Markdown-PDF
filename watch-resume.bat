@echo off
echo Watching for resume.md changes...
echo.

:watch_loop
timeout /t 2 /nobreak >nul

REM Check if source file is newer than public file
for %%A in (resume.lol\source\resume.md) do set SourceTime=%%~tA
for %%A in (export-to-pdf\public\resume.md) do set PublicTime=%%~tA

if not "%SourceTime%"=="%PublicTime%" (
    echo [%time%] Change detected - syncing resume.md...
    copy resume.lol\source\resume.md export-to-pdf\public\resume.md >nul
    echo Synced!
)

goto watch_loop
