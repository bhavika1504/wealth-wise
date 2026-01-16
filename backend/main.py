"""
FastAPI Backend for Finance Planner
Integrates FinGPT and scikit-learn models
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os

# Add AI models to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AI', 'FinGPT'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AI', 'scikit-learn'))

from routers import fingpt, sklearn_models, ai_insights, market_data, email_alerts

app = FastAPI(
    title="Finance Planner API",
    description="API for financial analysis using FinGPT, scikit-learn, and AI insights",
    version="1.0.0"
)

# CORS configuration
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(fingpt.router, prefix="/api/fingpt", tags=["FinGPT"])
app.include_router(sklearn_models.router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(ai_insights.router, prefix="/api/ai", tags=["AI Insights"])
app.include_router(market_data.router, prefix="/api/market", tags=["Market Data"])
app.include_router(email_alerts.router, prefix="/api/email", tags=["Email Alerts"])


@app.get("/")
async def root():
    return {
        "message": "Finance Planner API",
        "version": "1.0.0",
        "endpoints": {
            "fingpt": "/api/fingpt",
            "ml": "/api/ml"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
