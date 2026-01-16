@echo off
REM Start FastAPI backend server for Windows


cd /d "%~dp0"
echo Starting Finance Planner Backend API...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Start server
echo Starting server on http://localhost:8000
uvicorn main:app --reload --host 0.0.0.0 --port 8000
