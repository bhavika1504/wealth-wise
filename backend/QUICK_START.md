# Quick Start Guide

## Installation (Windows)

1. **Navigate to backend directory:**
   ```cmd
   cd backend
   ```

2. **Install dependencies:**
   ```cmd
   python -m pip install --upgrade pip setuptools wheel
   python -m pip install -r requirements.txt
   ```
   
   Or use the install script:
   ```cmd
   install_dependencies.bat
   ```

3. **Start the server:**
   ```cmd
   python -m uvicorn main:app --reload --port 8000
   ```
   
   Or use the start script:
   ```cmd
   start_server.bat
   ```

## Installation (Linux/Mac)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   python3 -m pip install --upgrade pip setuptools wheel
   python3 -m pip install -r requirements.txt
   ```
   
   Or use the install script:
   ```bash
   chmod +x install_dependencies.sh
   ./install_dependencies.sh
   ```

3. **Start the server:**
   ```bash
   python3 -m uvicorn main:app --reload --port 8000
   ```

## Verify Installation

Once the server is running, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test the server:
- Health check: http://localhost:8000/health
- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Troubleshooting

### Issue: "Module not found"
**Solution:** Make sure you're in the `backend` directory and all dependencies are installed.

### Issue: "Port already in use"
**Solution:** Change the port:
```cmd
python -m uvicorn main:app --reload --port 8001
```

### Issue: Import errors
**Solution:** Make sure you're running from the `backend` directory:
```cmd
cd backend
python -m uvicorn main:app --reload
```
