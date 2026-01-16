/**
 * Machine Learning Service
 * Handles communication with FastAPI backend for scikit-learn models
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface PredictionRequest {
  features: number[][];
  model_type?: "linear" | "random_forest";
}

export interface PredictionResponse {
  predictions: number[];
  model_type: string;
  confidence?: number;
}

export interface TrainModelRequest {
  X: number[][];
  y: number[];
  model_type?: "linear" | "random_forest";
}

export interface TrainModelResponse {
  success: boolean;
  model_type: string;
  score?: number;
  message: string;
}

export interface FinancialDataRequest {
  data: Array<Record<string, any>>;
  prediction_type: "expense" | "income" | "savings";
}

export interface FinancialDataResponse {
  predictions: number[];
  trends: {
    direction: string;
    average_change: number;
    current_value: number;
  };
  insights: string[];
}

export interface CategorizationResponse {
  category: string;
  confidence: number;
  description: string;
}

/**
 * Categorize a transaction using ML (with local fallback)
 */
export const categorizeTransaction = async (
  description: string,
  amount?: number
): Promise<CategorizationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ml/categorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, amount }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("ML categorization failed, using local fallback:", error);
    // Local fallback using keyword matching
    return localCategorize(description);
  }
};

/**
 * Local fallback categorization using keywords
 */
const localCategorize = (description: string): CategorizationResponse => {
  const desc = description.toLowerCase();
  
  const categories: Record<string, string[]> = {
    "Food & Dining": ["swiggy", "zomato", "food", "restaurant", "cafe", "pizza", "burger", "dominos", "mcdonalds", "kfc", "subway", "starbucks", "haldirams", "barbeque"],
    "Shopping": ["amazon", "flipkart", "myntra", "shopping", "mall", "lifestyle", "croma", "decathlon", "reliance digital"],
    "Transportation": ["uber", "ola", "rapido", "petrol", "fuel", "metro", "cab", "auto", "indian oil", "hp", "bpcl", "shell"],
    "Entertainment": ["netflix", "spotify", "movie", "pvr", "inox", "bookmyshow", "concert", "disney", "hotstar", "youtube", "amazon prime", "zee5"],
    "Utilities": ["electricity", "water", "gas", "bill", "recharge", "jio", "airtel", "vi", "bsnl", "broadband", "dth", "tata play", "maintenance"],
    "Groceries": ["grocery", "bigbasket", "dmart", "more", "spar", "nature basket", "zepto", "heritage", "nilgiris", "spencer", "star bazaar", "reliance fresh"],
    "Healthcare": ["hospital", "doctor", "medicine", "pharmacy", "medical", "health", "clinic"],
    "Education": ["course", "udemy", "coursera", "book", "education", "school", "college", "tuition"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return { category, confidence: 0.8, description };
    }
  }

  return { category: "Other", confidence: 0.5, description };
};

/**
 * Make predictions using ML models
 */
export const makePrediction = async (
  request: PredictionRequest
): Promise<PredictionResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ml/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to make prediction:", error);
    throw error;
  }
};

/**
 * Train a machine learning model
 */
export const trainModel = async (
  request: TrainModelRequest
): Promise<TrainModelResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to train model:", error);
    throw error;
  }
};

/**
 * Predict financial data (expenses, income, savings)
 */
export const predictFinancialData = async (
  request: FinancialDataRequest
): Promise<FinancialDataResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ml/financial-prediction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to predict financial data:", error);
    throw error;
  }
};

/**
 * List available ML models
 */
export const listMLModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ml/models`);

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to list models:", error);
    throw error;
  }
};
