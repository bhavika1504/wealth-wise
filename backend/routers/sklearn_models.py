"""
Scikit-learn Router
Provides endpoints for machine learning predictions and analysis
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import sys
import os

router = APIRouter()

# Import scikit-learn modules
try:
    from sklearn.linear_model import LinearRegression
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import StandardScaler
    import pickle
    SKLEARN_AVAILABLE = True
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.pipeline import make_pipeline
except ImportError:
    SKLEARN_AVAILABLE = False


# Request/Response Models
class PredictionRequest(BaseModel):
    features: List[List[float]]
    model_type: Optional[str] = "linear"  # "linear" or "random_forest"


class PredictionResponse(BaseModel):
    predictions: List[float]
    model_type: str
    confidence: Optional[float] = None


class TrainModelRequest(BaseModel):
    X: List[List[float]]  # Features
    y: List[float]  # Target values
    model_type: Optional[str] = "linear"


class TrainModelResponse(BaseModel):
    success: bool
    model_type: str
    score: Optional[float] = None
    message: str


class FinancialDataRequest(BaseModel):
    data: List[Dict[str, Any]]
    prediction_type: str  # "expense", "income", "savings", etc.


class FinancialDataResponse(BaseModel):
    predictions: List[float]
    trends: Dict[str, Any]
    insights: List[str]


class CategorizationRequest(BaseModel):
    description: str
    amount: Optional[float] = None


class CategorizationResponse(BaseModel):
    category: str
    confidence: float
    description: str


class TrainCategorizerRequest(BaseModel):
    data: List[Dict[str, str]]  # List of {"description": "...", "category": "..."}


class TrainCategorizerResponse(BaseModel):
    success: bool
    message: str
    sample_count: int


# Global Categorizer Instance
class ExpenseCategorizer:
    def __init__(self):
        self.pipeline = None
        self.is_trained = False
        
    def train_default(self):
        if not SKLEARN_AVAILABLE:
            return
            
        # Seed data for cold start
        data = [
            ("Uber", "Transport"),
            ("Lyft", "Transport"),
            ("Taxi", "Transport"),
            ("Train", "Transport"),
            ("Bus", "Transport"),
            ("Gas Station", "Transport"),
            
            ("grocery", "Food"),
            ("supermarket", "Food"),
            ("restaurant", "Food"),
            ("coffee", "Food"),
            ("burger", "Food"),
            ("pizza", "Food"),
            ("dinner", "Food"),
            ("lunch", "Food"),
            
            ("netflix", "Entertainment"),
            ("spotify", "Entertainment"),
            ("cinema", "Entertainment"),
            ("movie", "Entertainment"),
            ("game", "Entertainment"),
            
            ("salary", "Income"),
            ("paycheck", "Income"),
            ("deposit", "Income"),
            
            ("rent", "Housing"),
            ("mortgage", "Housing"),
            ("electric", "Utilities"),
            ("water", "Utilities"),
            ("internet", "Utilities"),
            
            ("amazon", "Shopping"),
            ("store", "Shopping"),
            ("clothing", "Shopping"),
            ("shoes", "Shopping"),
            
            ("hospital", "Health"),
            ("doctor", "Health"),
            ("pharmacy", "Health"),
            ("gym", "Health")
        ]
        
        descriptions, categories = zip(*data)
        self.train(list(descriptions), list(categories))

    def train(self, X, y):
        if not SKLEARN_AVAILABLE:
            return
            
        self.pipeline = make_pipeline(CountVectorizer(stop_words='english'), MultinomialNB())
        self.pipeline.fit(X, y)
        self.is_trained = True

    def predict(self, text):
        if not self.is_trained or not self.pipeline:
            return "Uncategorized", 0.0
        
        try:
            category = self.pipeline.predict([text])[0]
            confidence = float(np.max(self.pipeline.predict_proba([text])[0]))
            return category, confidence
        except Exception:
            return "Uncategorized", 0.0

# Initialize and train default
expense_categorizer = ExpenseCategorizer()
if SKLEARN_AVAILABLE:
    try:
        expense_categorizer.train_default()
    except Exception as e:
        print(f"Failed to initialize categorizer: {e}")


@router.post("/predict", response_model=PredictionResponse)
async def make_prediction(request: PredictionRequest):
    """
    Make predictions using scikit-learn models
    """
    if not SKLEARN_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="scikit-learn is not available. Please install scikit-learn."
        )
    
    try:
        # Convert to numpy array
        X = np.array(request.features)
        
        if request.model_type == "linear":
            model = LinearRegression()
        elif request.model_type == "random_forest":
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        else:
            raise HTTPException(status_code=400, detail="Invalid model_type. Use 'linear' or 'random_forest'")
        
        # For demo purposes, we'll create a simple model
        # In production, you'd load a pre-trained model
        # This is a placeholder - you should train/load actual models
        y_dummy = np.random.rand(len(X)) * 1000  # Dummy target for demo
        model.fit(X, y_dummy)
        
        predictions = model.predict(X).tolist()
        
        return PredictionResponse(
            predictions=predictions,
            model_type=request.model_type,
            confidence=0.85  # Placeholder confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making prediction: {str(e)}")


@router.post("/train", response_model=TrainModelResponse)
async def train_model(request: TrainModelRequest):
    """
    Train a machine learning model
    """
    if not SKLEARN_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="scikit-learn is not available. Please install scikit-learn."
        )
    
    try:
        X = np.array(request.X)
        y = np.array(request.y)
        
        if len(X) != len(y):
            raise HTTPException(status_code=400, detail="X and y must have the same length")
        
        if request.model_type == "linear":
            model = LinearRegression()
        elif request.model_type == "random_forest":
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        else:
            raise HTTPException(status_code=400, detail="Invalid model_type. Use 'linear' or 'random_forest'")
        
        model.fit(X, y)
        score = model.score(X, y)
        
        # In production, you'd save the model here
        # with open(f'models/{request.model_type}_model.pkl', 'wb') as f:
        #     pickle.dump(model, f)
        
        return TrainModelResponse(
            success=True,
            model_type=request.model_type,
            score=score,
            message=f"Model trained successfully with R² score of {score:.4f}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")


@router.post("/financial-prediction", response_model=FinancialDataResponse)
async def predict_financial_data(request: FinancialDataRequest):
    """
    Predict financial metrics (expenses, income, savings) based on historical data
    """
    if not SKLEARN_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="scikit-learn is not available. Please install scikit-learn."
        )
    
    try:
        # Extract features from data
        # This is a simplified example - adjust based on your data structure
        features = []
        for item in request.data:
            # Extract numeric features (adjust based on your data structure)
            feature_vector = [
                item.get("amount", 0),
                item.get("month", 0),
                item.get("year", 2024),
            ]
            features.append(feature_vector)
        
        X = np.array(features)
        
        # Use linear regression for prediction
        model = LinearRegression()
        y_dummy = np.array([item.get("amount", 0) for item in request.data])
        model.fit(X, y_dummy)
        
        # Predict next period
        if len(X) > 0:
            last_feature = X[-1].copy()
            last_feature[1] += 1  # Next month
            next_prediction = model.predict([last_feature])[0]
        else:
            next_prediction = 0
        
        # Calculate trends
        amounts = [item.get("amount", 0) for item in request.data]
        if len(amounts) > 1:
            trend = "increasing" if amounts[-1] > amounts[0] else "decreasing"
            avg_change = (amounts[-1] - amounts[0]) / len(amounts) if len(amounts) > 0 else 0
        else:
            trend = "stable"
            avg_change = 0
        
        insights = [
            f"Predicted {request.prediction_type} for next period: ₹{next_prediction:.2f}",
            f"Current trend: {trend}",
            f"Average change: ₹{avg_change:.2f} per period"
        ]
        
        return FinancialDataResponse(
            predictions=[next_prediction],
            trends={
                "direction": trend,
                "average_change": avg_change,
                "current_value": amounts[-1] if amounts else 0
            },
            insights=insights
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting financial data: {str(e)}")


@router.post("/categorize", response_model=CategorizationResponse)
async def categorize_transaction(request: CategorizationRequest):
    """
    Categorize a transaction based on its description
    """
    if not SKLEARN_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="scikit-learn is not available"
        )
    
    if not expense_categorizer.is_trained:
         # Try to train default if not trained
        try:
            expense_categorizer.train_default()
        except:
            raise HTTPException(status_code=500, detail="Model is not trained and default training failed")

    category, confidence = expense_categorizer.predict(request.description)
    
    return CategorizationResponse(
        category=category,
        confidence=confidence,
        description=request.description
    )


@router.post("/train-categorizer", response_model=TrainCategorizerResponse)
async def train_categorizer(request: TrainCategorizerRequest):
    """
    Retrain the categorization model with new data
    """
    if not SKLEARN_AVAILABLE:
         raise HTTPException(
            status_code=501,
            detail="scikit-learn is not available"
        )
        
    try:
        descriptions = [item["description"] for item in request.data]
        categories = [item["category"] for item in request.data]
        
        if not descriptions:
             raise HTTPException(status_code=400, detail="No training data provided")
             
        expense_categorizer.train(descriptions, categories)
        
        return TrainCategorizerResponse(
            success=True,
            message="Model successfully retrained",
            sample_count=len(descriptions)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/models")
async def list_available_models():
    """
    List available scikit-learn models
    """
    return {
        "models": [
            {
                "name": "linear_regression",
                "description": "Linear regression for predictions",
                "endpoint": "/api/ml/predict"
            },
            {
                "name": "random_forest",
                "description": "Random forest for complex predictions",
                "endpoint": "/api/ml/predict"
            },
            {
                "name": "financial_prediction",
                "description": "Financial data prediction",
                "endpoint": "/api/ml/financial-prediction"
            },
            {
                "name": "expense_categorizer",
                "description": "Transaction categorization",
                "endpoint": "/api/ml/categorize"
            }
        ],
        "sklearn_available": SKLEARN_AVAILABLE
    }
