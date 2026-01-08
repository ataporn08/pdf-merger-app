@echo off
title PDF Folder Merger Launcher
echo.
echo ==========================================
echo    PDF Folder Merger is Starting...
echo ==========================================
echo.

:: Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo [1/3] Installing dependencies (first time only)...
    cmd /c npm install
) else (
    echo [1/3] Dependencies already installed.
)

echo [2/3] Starting the application server...
:: Start the dev server in the background and wait a bit
start /b cmd /c npm run dev

:: Wait for server to start
timeout /t 3 /nobreak > nul

echo [3/3] Opening your browser...
:: Open the default browser to the app URL
:: Note: Vite might use a different port if 5173 is busy, 
:: but usually it follows this pattern.
start http://localhost:5173

echo.
echo ==========================================
echo    Application is now running!
echo    You can minimize this window.
echo    To stop, just close this window.
echo ==========================================
echo.
pause
