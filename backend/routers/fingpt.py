"""
FinGPT Router
Provides endpoints for financial sentiment analysis and forecasting
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os

router = APIRouter()


# Request/Response Models
class SentimentAnalysisRequest(BaseModel):
    text: str
    model: Optional[str] = "default"


class SentimentAnalysisResponse(BaseModel):
    sentiment: str
    confidence: float
    analysis: str


class ForecastRequest(BaseModel):
    ticker: str
    n_weeks: Optional[int] = 1
    use_basics: Optional[bool] = True


class ForecastResponse(BaseModel):
    prediction: str
    analysis: str
    positive_developments: List[str]
    potential_concerns: List[str]


class FinancialAdviceRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None


class FinancialAdviceResponse(BaseModel):
    advice: str
    reasoning: Optional[str] = None


@router.post("/sentiment", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """
    Analyze financial sentiment from text
    """
    try:
        # Import FinGPT sentiment analysis module
        # This is a simplified version - you may need to adjust based on your FinGPT setup
        from fingpt.FinGPT_Sentiment_Analysis_v3 import analyze_sentiment as fingpt_analyze
        
        result = fingpt_analyze(request.text)
        
        return SentimentAnalysisResponse(
            sentiment=result.get("sentiment", "neutral"),
            confidence=result.get("confidence", 0.5),
            analysis=result.get("analysis", "")
        )
    except ImportError:
        # Fallback to rule-based sentiment analysis
        return await _fallback_sentiment_analysis(request.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")


async def _fallback_sentiment_analysis(text: str):
    """
    Fallback sentiment analysis using simple keyword matching
    """
    positive_keywords = ["profit", "growth", "gain", "increase", "positive", "bullish", "strong", "up"]
    negative_keywords = ["loss", "decline", "decrease", "negative", "bearish", "weak", "down", "risk"]
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_keywords if word in text_lower)
    negative_count = sum(1 for word in negative_keywords if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "positive"
        confidence = min(0.9, 0.5 + (positive_count - negative_count) * 0.1)
    elif negative_count > positive_count:
        sentiment = "negative"
        confidence = min(0.9, 0.5 + (negative_count - positive_count) * 0.1)
    else:
        sentiment = "neutral"
        confidence = 0.5
    
    return SentimentAnalysisResponse(
        sentiment=sentiment,
        confidence=confidence,
        analysis=f"Based on keyword analysis: {positive_count} positive indicators, {negative_count} negative indicators."
    )


@router.post("/forecast", response_model=ForecastResponse)
async def forecast_stock(request: ForecastRequest):
    """
    Forecast stock price movement using FinGPT Forecaster
    """
    try:
        # Import FinGPT forecaster module
        from fingpt.FinGPT_Forecaster import predict as fingpt_predict
        
        info, answer = fingpt_predict(
            request.ticker,
            None,  # date - will use current date
            request.n_weeks,
            request.use_basics
        )
        
        # Parse the response to extract structured data
        positive_devs = []
        concerns = []
        prediction = ""
        analysis = ""
        
        if "[Positive Developments]:" in answer:
            parts = answer.split("[Positive Developments]:")
            if len(parts) > 1:
                pos_section = parts[1].split("[Potential Concerns]:")[0] if "[Potential Concerns]:" in parts[1] else parts[1]
                positive_devs = [line.strip() for line in pos_section.split("\n") if line.strip() and line.strip()[0].isdigit()]
        
        if "[Potential Concerns]:" in answer:
            parts = answer.split("[Potential Concerns]:")
            if len(parts) > 1:
                concern_section = parts[1].split("[Prediction & Analysis]")[0] if "[Prediction & Analysis]" in parts[1] else parts[1]
                concerns = [line.strip() for line in concern_section.split("\n") if line.strip() and line.strip()[0].isdigit()]
        
        if "[Prediction & Analysis]" in answer:
            pred_section = answer.split("[Prediction & Analysis]")[1]
            if "Prediction:" in pred_section:
                prediction = pred_section.split("Prediction:")[1].split("Analysis:")[0].strip()
            if "Analysis:" in pred_section:
                analysis = pred_section.split("Analysis:")[1].strip()
        
        return ForecastResponse(
            prediction=prediction or answer[:200],
            analysis=analysis or answer,
            positive_developments=positive_devs,
            potential_concerns=concerns
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="FinGPT Forecaster module not available. Please ensure FinGPT is properly configured."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error forecasting: {str(e)}")


@router.post("/advice", response_model=FinancialAdviceResponse)
async def get_financial_advice(request: FinancialAdviceRequest):
    """
    Get financial advice using FinGPT
    """
    try:
        # This would use FinGPT's general financial advice capabilities
        # For now, we'll provide a structured response
        context_str = ""
        if request.context:
            context_str = f"Context: {', '.join([f'{k}: {v}' for k, v in request.context.items()])}\n\n"
        
        prompt = f"{context_str}User Query: {request.query}\n\nProvide financial advice:"
        
        # In a real implementation, this would call FinGPT
        advice = f"Based on your query: {request.query}, here is some general financial advice. For personalized advice, please consult with a financial advisor."
        reasoning = "This is a placeholder response. In production, this would use FinGPT to generate personalized financial advice."
        
        return FinancialAdviceResponse(
            advice=advice,
            reasoning=reasoning
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating advice: {str(e)}")


@router.get("/models")
async def list_available_models():
    """
    List available FinGPT models
    """
    return {
        "models": [
            {
                "name": "sentiment-analysis",
                "description": "Financial sentiment analysis",
                "endpoint": "/api/fingpt/sentiment"
            },
            {
                "name": "forecaster",
                "description": "Stock price forecasting",
                "endpoint": "/api/fingpt/forecast"
            },
            {
                "name": "financial-advice",
                "description": "General financial advice",
                "endpoint": "/api/fingpt/advice"
            }
        ]
    }
