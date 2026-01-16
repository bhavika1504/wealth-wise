# Finance Planner Backend API

FastAPI backend for integrating FinGPT and scikit-learn models.

## Setup

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Set environment variables (if needed):
```bash
export HF_TOKEN=your_huggingface_token
export FINNHUB_API_KEY=your_finnhub_key
```

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

### FinGPT Endpoints

- `POST /api/fingpt/sentiment` - Analyze financial sentiment
- `POST /api/fingpt/forecast` - Forecast stock prices
- `POST /api/fingpt/advice` - Get financial advice
- `GET /api/fingpt/models` - List available models

### Machine Learning Endpoints

- `POST /api/ml/predict` - Make predictions
- `POST /api/ml/train` - Train a model
- `POST /api/ml/financial-prediction` - Predict financial data
- `GET /api/ml/models` - List available models

## Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
