#!/bin/bash
# Install dependencies with proper order for Linux/Mac

echo "Installing backend dependencies..."
echo ""

# Upgrade pip, setuptools, and wheel first
echo "[1/3] Upgrading pip, setuptools, and wheel..."
python3 -m pip install --upgrade pip setuptools wheel

echo ""
echo "[2/3] Installing core dependencies..."
python3 -m pip install fastapi==0.104.1 "uvicorn[standard]==0.24.0" pydantic==2.5.0 python-multipart==0.0.6

echo ""
echo "[3/3] Installing data science libraries..."
python3 -m pip install "numpy>=1.26.0,<2.0.0" "pandas>=2.1.0,<3.0.0" "scikit-learn>=1.3.2,<2.0.0"

echo ""
echo "Installation complete!"
echo ""
echo "To start the server, run:"
echo "  uvicorn main:app --reload --port 8000"
