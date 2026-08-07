@echo off
REM ─── One-shot launcher for FYP demo ────────────────────────────
REM Starts the presentation (port 5173) and the dashboard (port 5174)
REM in two separate terminal windows, then opens both in your default browser.

set ROOT=%~dp0

echo Starting Presentation on http://localhost:5173 ...
start "FYP Presentation" cmd /k "cd /d %ROOT%presentation && npm run dev"

echo Starting Dashboard on http://localhost:5174 ...
start "FYP Dashboard" cmd /k "cd /d %ROOT%dashboard-react && npm run dev"

REM Give Vite a moment to boot before opening browser tabs
timeout /t 6 /nobreak >nul

start "" "http://localhost:5173"
start "" "http://localhost:5174"

echo.
echo Both servers are running in separate windows.
echo Close those windows (or Ctrl+C in them) to stop the servers.
pause
