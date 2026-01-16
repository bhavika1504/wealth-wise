/**
 * AI Service with Real AI (Google Gemini) + Local Fallback
 * Provides AI-powered financial insights
 */

import axios from "axios";

const AI_API_BASE = "http://localhost:8000/api/ai";

// Types for insight generation
interface SpendingData {
  category: string;
  amount: number;
  budget?: number;
}

interface GoalData {
  name: string;
  current: number;
  target: number;
  status: string;
  deadline?: string;
}

interface InvestmentData {
  name: string;
  type: string;
  invested: number;
  current: number;
  change: number;
}

interface AIInsightResponse {
  insight: string;
  suggestions?: string[];
  sentiment?: string;
  ai_powered: boolean;
}

// Cache for AI responses to reduce API calls
const insightCache = new Map<string, { insight: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get AI-powered spending insight
 */
export const getAISpendingInsight = async (
  data: SpendingData[],
  monthlyIncome?: number
): Promise<{ insight: string; aiPowered: boolean }> => {
  const cacheKey = `spending-${JSON.stringify(data)}-${monthlyIncome}`;
  const cached = insightCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { insight: cached.insight, aiPowered: true };
  }

  try {
    const response = await axios.post<AIInsightResponse>(`${AI_API_BASE}/insight`, {
      type: "spending",
      spending_data: data,
      monthly_income: monthlyIncome,
    }, { timeout: 10000 });

    if (response.data.insight) {
      insightCache.set(cacheKey, { insight: response.data.insight, timestamp: Date.now() });
      return { insight: response.data.insight, aiPowered: response.data.ai_powered };
    }
  } catch (error) {
    console.log("AI API unavailable, using local insight");
  }

  // Fallback to local
  const localInsight = generateSpendingInsight(data, data.reduce((sum, d) => sum + d.amount, 0));
  return { insight: localInsight, aiPowered: false };
};

/**
 * Get AI-powered goal insight
 */
export const getAIGoalInsight = async (
  goals: GoalData[]
): Promise<{ insight: string; aiPowered: boolean }> => {
  const cacheKey = `goals-${JSON.stringify(goals)}`;
  const cached = insightCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { insight: cached.insight, aiPowered: true };
  }

  try {
    const response = await axios.post<AIInsightResponse>(`${AI_API_BASE}/insight`, {
      type: "goals",
      goals_data: goals,
    }, { timeout: 10000 });

    if (response.data.insight) {
      insightCache.set(cacheKey, { insight: response.data.insight, timestamp: Date.now() });
      return { insight: response.data.insight, aiPowered: response.data.ai_powered };
    }
  } catch (error) {
    console.log("AI API unavailable, using local insight");
  }

  // Fallback to local
  const localInsight = generateGoalInsight(goals);
  return { insight: localInsight, aiPowered: false };
};

/**
 * Get AI-powered investment insight
 */
export const getAIInvestmentInsight = async (
  investments: InvestmentData[]
): Promise<{ insight: string; aiPowered: boolean }> => {
  const cacheKey = `investments-${JSON.stringify(investments)}`;
  const cached = insightCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { insight: cached.insight, aiPowered: true };
  }

  try {
    const response = await axios.post<AIInsightResponse>(`${AI_API_BASE}/insight`, {
      type: "investments",
      investments_data: investments,
    }, { timeout: 10000 });

    if (response.data.insight) {
      insightCache.set(cacheKey, { insight: response.data.insight, timestamp: Date.now() });
      return { insight: response.data.insight, aiPowered: response.data.ai_powered };
    }
  } catch (error) {
    console.log("AI API unavailable, using local insight");
  }

  // Fallback to local
  const localInsight = generateInvestmentInsight(investments);
  return { insight: localInsight, aiPowered: false };
};

/**
 * Chat with AI Financial Advisor
 */
export const chatWithAI = async (
  message: string,
  context?: {
    spending?: SpendingData[];
    goals?: GoalData[];
    investments?: InvestmentData[];
    monthlyIncome?: number;
  }
): Promise<{ response: string; aiPowered: boolean }> => {
  try {
    const response = await axios.post<AIInsightResponse>(`${AI_API_BASE}/chat`, {
      type: "chat",
      user_message: message,
      spending_data: context?.spending,
      goals_data: context?.goals,
      investments_data: context?.investments,
      monthly_income: context?.monthlyIncome,
    }, { timeout: 15000 });

    if (response.data.insight) {
      return { response: response.data.insight, aiPowered: response.data.ai_powered };
    }
  } catch (error) {
    console.log("AI chat unavailable, using local response");
  }

  // Fallback to local chat logic
  const localResponse = await getAIAdvice(message);
  return { response: localResponse, aiPowered: false };
};

/**
 * Check AI service health (Gemini)
 */
export const checkAIHealth = async (): Promise<{
  available: boolean;
  aiPowered: boolean;
  message: string;
  model?: string;
}> => {
  try {
    const response = await axios.get(`${AI_API_BASE}/health`, { timeout: 5000 });
    return {
      available: true,
      aiPowered: response.data.api_key_configured,
      message: response.data.status,
      model: response.data.model || "gemini-1.5-flash",
    };
  } catch {
    return {
      available: false,
      aiPowered: false,
      message: "AI service unavailable - using local insights",
    };
  }
};

/**
 * Generate spending insights locally
 */
export const generateSpendingInsight = (data: SpendingData[], totalSpending: number): string => {
  if (!data || data.length === 0) {
    return "Upload your bank statement to get personalized spending insights.";
  }

  const insights: string[] = [];
  const sortedBySpending = [...data].sort((a, b) => b.amount - a.amount);
  const topCategory = sortedBySpending[0];

  // Top spending category
  if (topCategory) {
    const percentage = ((topCategory.amount / totalSpending) * 100).toFixed(0);
    insights.push(`Your highest expense is ${topCategory.category} at ₹${topCategory.amount.toLocaleString()} (${percentage}% of total spending).`);
  }

  // Budget overruns
  const overBudget = data.filter(c => c.budget && c.amount > c.budget);
  if (overBudget.length > 0) {
    const worst = overBudget.sort((a, b) => (b.amount - (b.budget || 0)) - (a.amount - (a.budget || 0)))[0];
    const overBy = worst.amount - (worst.budget || 0);
    insights.push(`⚠️ ${worst.category} exceeded budget by ₹${overBy.toLocaleString()}. Consider cutting back here.`);
  }

  // Savings tips by category
  const food = data.find(c => c.category.toLowerCase().includes("food") || c.category.toLowerCase().includes("dining"));
  if (food && food.amount > 10000) {
    insights.push(`You spent ₹${food.amount.toLocaleString()} on Food & Dining. Cooking at home 2-3 times more per week could save you ₹3,000-5,000.`);
  }

  const entertainment = data.find(c => c.category.toLowerCase().includes("entertainment"));
  if (entertainment && entertainment.amount > 5000) {
    insights.push(`Entertainment spending is ₹${entertainment.amount.toLocaleString()}. Look for free events or streaming bundles to reduce costs.`);
  }

  const shopping = data.find(c => c.category.toLowerCase().includes("shopping"));
  if (shopping && shopping.amount > 10000) {
    insights.push(`Shopping expenses are ₹${shopping.amount.toLocaleString()}. Try the 24-hour rule before non-essential purchases.`);
  }

  // Return a random insight for variety
  return insights.length > 0 
    ? insights[Math.floor(Math.random() * insights.length)]
    : "Your spending patterns look balanced. Keep tracking to maintain healthy financial habits!";
};

/**
 * Generate goal insights locally
 */
export const generateGoalInsight = (goals: GoalData[]): string => {
  if (!goals || goals.length === 0) {
    return "Add your first financial goal to get personalized recommendations!";
  }

  const insights: string[] = [];
  const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  // Check at-risk goals
  const atRiskGoals = goals.filter(g => g.status === "at-risk");
  if (atRiskGoals.length > 0) {
    const goal = atRiskGoals[0];
    const remaining = goal.target - goal.current;
    insights.push(`⚠️ "${goal.name}" needs attention. You need ₹${remaining.toLocaleString()} more to reach your target. Consider automating monthly contributions.`);
  }

  // Best performing goal
  const sortedByProgress = goals
    .map(g => ({ ...g, progress: g.target > 0 ? (g.current / g.target) * 100 : 0 }))
    .sort((a, b) => b.progress - a.progress);
  
  if (sortedByProgress[0] && sortedByProgress[0].progress >= 70) {
    insights.push(`🎉 Great progress on "${sortedByProgress[0].name}"! You're ${sortedByProgress[0].progress.toFixed(0)}% there. Keep the momentum going!`);
  }

  // Overall advice
  if (overallProgress < 30) {
    insights.push(`You've saved ${overallProgress.toFixed(0)}% of your total goals. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`);
  } else if (overallProgress >= 70) {
    insights.push(`Excellent! You're ${overallProgress.toFixed(0)}% towards your goals. Consider increasing targets or adding new financial milestones.`);
  }

  // Multiple goals advice
  if (goals.length >= 3) {
    insights.push(`You have ${goals.length} active goals. Focus on completing one at a time for better motivation, starting with the closest to completion.`);
  }

  return insights.length > 0
    ? insights[Math.floor(Math.random() * insights.length)]
    : "You're making steady progress on your goals. Consistency is key to financial success!";
};

/**
 * Generate investment insights locally
 */
export const generateInvestmentInsight = (investments: InvestmentData[]): string => {
  if (!investments || investments.length === 0) {
    return "Start tracking your investments to get portfolio analysis and recommendations!";
  }

  const insights: string[] = [];
  const totalInvested = investments.reduce((sum, i) => sum + i.invested, 0);
  const currentValue = investments.reduce((sum, i) => sum + i.current, 0);
  const totalReturns = currentValue - totalInvested;
  const returnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Overall performance
  if (returnsPercent > 10) {
    insights.push(`🎉 Your portfolio is up ${returnsPercent.toFixed(1)}%! Consider rebalancing if any asset class has grown beyond your target allocation.`);
  } else if (returnsPercent < 0) {
    insights.push(`Your portfolio is down ${Math.abs(returnsPercent).toFixed(1)}%. Stay calm and avoid panic selling. Market corrections are normal.`);
  } else {
    insights.push(`Your portfolio has returned ${returnsPercent.toFixed(1)}%. Consider if this aligns with your risk tolerance and timeline.`);
  }

  // Diversification check
  const assetTypes = [...new Set(investments.map(i => i.type))];
  if (assetTypes.length < 3) {
    insights.push(`You have investments in ${assetTypes.length} asset type(s). Consider diversifying across stocks, bonds, and mutual funds for better risk management.`);
  } else {
    insights.push(`Good diversification! You're invested across ${assetTypes.length} asset types. Review allocation quarterly to maintain balance.`);
  }

  // Top performer
  const topPerformer = [...investments].sort((a, b) => b.change - a.change)[0];
  if (topPerformer && topPerformer.change > 5) {
    insights.push(`${topPerformer.name} is your best performer at +${topPerformer.change}%. Don't let winners become too large a portion of your portfolio.`);
  }

  // Underperformer
  const underperformer = [...investments].sort((a, b) => a.change - b.change)[0];
  if (underperformer && underperformer.change < -5) {
    insights.push(`${underperformer.name} is down ${Math.abs(underperformer.change)}%. Review if the fundamentals have changed or if it's a buying opportunity.`);
  }

  return insights.length > 0
    ? insights[Math.floor(Math.random() * insights.length)]
    : "Your investment portfolio is tracking well. Remember to review and rebalance periodically.";
};

/**
 * Generate dashboard summary insight
 */
export const generateDashboardInsight = (
  totalSpending: number,
  totalSavings: number,
  goalsProgress: number,
  investmentReturns: number
): string => {
  const insights: string[] = [];
  const savingsRate = totalSpending > 0 ? (totalSavings / (totalSpending + totalSavings)) * 100 : 0;

  if (savingsRate >= 20) {
    insights.push(`Great job! Your savings rate is ${savingsRate.toFixed(0)}%, above the recommended 20%. Keep it up!`);
  } else if (savingsRate > 0) {
    insights.push(`Your savings rate is ${savingsRate.toFixed(0)}%. Aim for 20% by reducing discretionary spending.`);
  }

  if (goalsProgress >= 70) {
    insights.push(`You're ${goalsProgress.toFixed(0)}% towards your financial goals. Excellent discipline!`);
  }

  if (investmentReturns > 8) {
    insights.push(`Your investments are returning ${investmentReturns.toFixed(1)}%, beating average market returns.`);
  }

  return insights.length > 0
    ? insights[0]
    : "Keep tracking your finances for personalized insights!";
};

/**
 * Main AI advice function - tries API first, falls back to local
 */
export const getAIAdvice = async (message: string): Promise<string> => {
  // Parse the message to determine type and extract data
  const lowerMessage = message.toLowerCase();
  
  // Try to extract context and generate local insight
  if (lowerMessage.includes("spending") || lowerMessage.includes("expense")) {
    // Parse spending data from message
    const amountMatches = message.match(/₹[\d,]+/g) || [];
    if (amountMatches.length > 0) {
      const amounts = amountMatches.map(m => parseInt(m.replace(/[₹,]/g, "")));
      const total = amounts.reduce((a, b) => a + b, 0);
      
      // Generate insight based on patterns
      if (total > 50000) {
        return `Your total spending of ₹${total.toLocaleString()} is significant. Review your largest expense categories and identify one area to reduce by 10-15%.`;
      }
      return `Based on your spending of ₹${total.toLocaleString()}, focus on maintaining a budget and tracking where every rupee goes.`;
    }
  }

  if (lowerMessage.includes("goal") || lowerMessage.includes("target")) {
    const atRisk = message.includes("at-risk") || message.includes("at risk");
    if (atRisk) {
      return "Some goals are at risk. Set up automatic transfers right after payday to ensure consistent savings towards your goals.";
    }
    return "Stay committed to your goals! Small, consistent contributions compound significantly over time.";
  }

  if (lowerMessage.includes("investment") || lowerMessage.includes("portfolio")) {
    const hasReturns = message.match(/Returns?:?\s*([\d.]+)%/i);
    if (hasReturns) {
      const returns = parseFloat(hasReturns[1]);
      if (returns > 10) {
        return `Strong portfolio returns of ${returns}%! Consider taking some profits and rebalancing to your target allocation.`;
      } else if (returns < 0) {
        return `Portfolio is down ${Math.abs(returns)}%. Stay the course if fundamentals are sound. Time in market beats timing the market.`;
      }
      return `Returns of ${returns}% are decent. Review if they align with your goals and risk tolerance.`;
    }
    return "Diversification is key. Spread investments across asset classes to manage risk effectively.";
  }

  // Default financial advice
  const defaultInsights = [
    "Pay yourself first - automate savings before spending on anything else.",
    "Build an emergency fund covering 3-6 months of expenses before aggressive investing.",
    "Review subscriptions monthly - small recurring charges add up significantly over a year.",
    "Use the 50/30/20 budgeting rule: 50% needs, 30% wants, 20% savings and debt repayment.",
    "Track every expense for a month to identify spending leaks you didn't know existed.",
  ];

  return defaultInsights[Math.floor(Math.random() * defaultInsights.length)];
};
