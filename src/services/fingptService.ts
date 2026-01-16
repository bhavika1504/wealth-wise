/**
 * FinGPT Service
 * Handles communication with FastAPI backend for FinGPT models
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface SentimentAnalysisRequest {
  text: string;
  model?: string;
}

export interface SentimentAnalysisResponse {
  sentiment: string;
  confidence: number;
  analysis: string;
}

export interface ForecastRequest {
  ticker: string;
  n_weeks?: number;
  use_basics?: boolean;
}

export interface ForecastResponse {
  prediction: string;
  analysis: string;
  positive_developments: string[];
  potential_concerns: string[];
}

export interface FinancialAdviceRequest {
  query: string;
  context?: Record<string, any>;
}

export interface FinancialAdviceResponse {
  advice: string;
  reasoning?: string;
}

/**
 * Analyze financial sentiment from text
 */
export const analyzeSentiment = async (
  request: SentimentAnalysisRequest
): Promise<SentimentAnalysisResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fingpt/sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to analyze sentiment:", error);
    throw error;
  }
};

/**
 * Forecast stock price movement
 */
export const forecastStock = async (
  request: ForecastRequest
): Promise<ForecastResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fingpt/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to forecast stock:", error);
    throw error;
  }
};

/**
 * Get financial advice
 */
export const getFinancialAdvice = async (
  request: FinancialAdviceRequest
): Promise<FinancialAdviceResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fingpt/advice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get financial advice:", error);
    throw error;
  }
};

/**
 * List available FinGPT models
 */
export const listFinGPTModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fingpt/models`);

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to list models:", error);
    throw error;
  }
};
