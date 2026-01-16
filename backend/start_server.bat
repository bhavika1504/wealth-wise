@echo off
REM Start FastAPI server

cd /d %~dp0

echo Starting Finance Planner Backend API...
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
