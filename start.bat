@echo off
REM Caliper — one-click dev start. Backend on :8000, frontend on :5173.
start "caliper-api" cmd /k "cd /d %~dp0 && python -m uvicorn api.main:app --port 8000"
start "caliper-web" cmd /k "cd /d %~dp0web && npm run dev"
timeout /t 4 >nul
start http://localhost:5173
