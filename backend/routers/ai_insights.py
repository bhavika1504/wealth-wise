"""
AI Insights Router - Real AI-powered financial advice using Google Gemini
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json

router = APIRouter()

# Try to import Google Generative AI (Gemini)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Google Generative AI not installed. Run: pip install google-generativeai")

# Initialize Gemini client
model = None
if GEMINI_AVAILABLE:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')  # Fast and free!
        print(" Gemini AI initialized successfully")
    else:
        print("Warning: GEMINI_API_KEY or GOOGLE_API_KEY not set in environment")


# Request/Response Models
class SpendingData(BaseModel):
    category: str
    amount: float
    budget: Optional[float] = None


class GoalData(BaseModel):
    name: str
    current: float
    target: float
    deadline: Optional[str] = None
    status: Optional[str] = None


class InvestmentData(BaseModel):
    name: str
    type: str
    invested: float
    current: float
    change: float


class InsightRequest(BaseModel):
    type: str  # "spending", "goals", "investments", "general", "chat"
    spending_data: Optional[List[SpendingData]] = None
    goals_data: Optional[List[GoalData]] = None
    investments_data: Optional[List[InvestmentData]] = None
    monthly_income: Optional[float] = None
    monthly_savings: Optional[float] = None
    user_message: Optional[str] = None


class InsightResponse(BaseModel):
    insight: str
    suggestions: Optional[List[str]] = None
    sentiment: Optional[str] = None  # "positive", "warning", "critical"
    ai_powered: bool


# System prompts for different contexts
SYSTEM_PROMPTS = {
    "spending": """You are a friendly and knowledgeable Indian financial advisor AI. Analyze the user's spending data and provide personalized, actionable advice.

Rules:
- Use Indian Rupee (₹) format
- Be conversational but professional
- Reference specific categories and amounts from the data
- Provide 1-2 specific, actionable tips
- Keep response under 100 words
- Use emojis sparingly for emphasis
- Consider Indian context (festivals, lifestyle, common expenses)""",

    "goals": """You are an encouraging Indian financial coach AI. Analyze the user's financial goals and provide motivating, practical advice.

Rules:
- Use Indian Rupee (₹) format
- Be supportive and motivating
- Reference specific goals by name
- Suggest concrete next steps
- Keep response under 100 words
- Consider Indian financial products (PPF, NPS, FD, MF SIPs)""",

    "investments": """You are an experienced Indian investment advisor AI. Analyze the user's portfolio and provide insights on performance and diversification.

Rules:
- Use Indian Rupee (₹) format
- Reference specific investments and their performance
- Comment on diversification and risk
- Suggest improvements without being pushy
- Keep response under 100 words
- Reference Indian market context (NIFTY, SENSEX, etc.)
- Mention relevant regulations (SEBI) if appropriate""",

    "chat": """You are WealthWise AI, a friendly Indian financial advisor chatbot. Help users ONLY with financial queries.

CRITICAL RULES:
1. You ONLY answer questions related to:
   - Personal finance (savings, budgeting, expenses)
   - Investments (stocks, mutual funds, SIP, FD, PPF, NPS, gold)
   - Loans, EMI, debt management
   - Tax planning (80C, 80D, ITR, GST)
   - Insurance (life, health, term)
   - Retirement planning
   - Financial goals
   - Indian economy, RBI, SEBI policies

2. For ANY off-topic questions (celebrities, sports, politics, entertainment, science, history, general knowledge, etc.):
   - Politely decline and redirect to finance topics
   - Example: "I'm your Financial Advisor AI, so I focus on money matters! I can help with savings, investments, tax planning, and more. What financial topic would you like to explore?"

3. General formatting rules:
   - Use Indian Rupee (₹) format
   - Be conversational and helpful
   - Keep responses under 150 words
   - Consider Indian context (tax laws, investment options)
   - If asked about specific stocks, mention this is not investment advice"""
}


def format_spending_context(data: List[SpendingData], income: float = None) -> str:
    """Format spending data for AI context"""
    total = sum(d.amount for d in data)
    
    context = f"User's Monthly Spending (Total: ₹{total:,.0f}):\n"
    for d in data:
        budget_info = f" (Budget: ₹{d.budget:,.0f})" if d.budget else ""
        over_budget = " ⚠️ OVER BUDGET" if d.budget and d.amount > d.budget else ""
        context += f"- {d.category}: ₹{d.amount:,.0f}{budget_info}{over_budget}\n"
    
    if income:
        savings = income - total
        savings_rate = (savings / income) * 100 if income > 0 else 0
        context += f"\nMonthly Income: ₹{income:,.0f}"
        context += f"\nEstimated Savings: ₹{savings:,.0f} ({savings_rate:.0f}%)"
    
    return context


def format_goals_context(data: List[GoalData]) -> str:
    """Format goals data for AI context"""
    context = "User's Financial Goals:\n"
    for g in data:
        progress = (g.current / g.target) * 100 if g.target > 0 else 0
        status = g.status or ("on-track" if progress >= 50 else "at-risk")
        context += f"- {g.name}: ₹{g.current:,.0f} / ₹{g.target:,.0f} ({progress:.0f}%) - {status}"
        if g.deadline:
            context += f" - Due: {g.deadline}"
        context += "\n"
    return context


def format_investments_context(data: List[InvestmentData]) -> str:
    """Format investment data for AI context"""
    total_invested = sum(d.invested for d in data)
    total_current = sum(d.current for d in data)
    total_return = total_current - total_invested
    return_pct = (total_return / total_invested) * 100 if total_invested > 0 else 0
    
    context = f"User's Investment Portfolio (Invested: ₹{total_invested:,.0f}, Current: ₹{total_current:,.0f}, Returns: {return_pct:+.1f}%):\n"
    
    # Group by type
    by_type = {}
    for d in data:
        if d.type not in by_type:
            by_type[d.type] = []
        by_type[d.type].append(d)
    
    for inv_type, investments in by_type.items():
        context += f"\n{inv_type}:\n"
        for inv in investments:
            context += f"  - {inv.name}: ₹{inv.current:,.0f} ({inv.change:+.1f}%)\n"
    
    return context


def get_local_insight(request: InsightRequest) -> str:
    """Generate local insight when OpenAI is unavailable"""
    if request.type == "spending" and request.spending_data:
        total = sum(d.amount for d in request.spending_data)
        top = max(request.spending_data, key=lambda x: x.amount)
        return f"Your highest spending is {top.category} at ₹{top.amount:,.0f}. Total monthly spending is ₹{total:,.0f}. Consider reviewing your budget allocations."
    
    elif request.type == "goals" and request.goals_data:
        total_progress = sum(g.current for g in request.goals_data)
        total_target = sum(g.target for g in request.goals_data)
        pct = (total_progress / total_target) * 100 if total_target > 0 else 0
        return f"You're {pct:.0f}% towards your financial goals. Keep saving consistently to reach your targets!"
    
    elif request.type == "investments" and request.investments_data:
        total = sum(d.current for d in request.investments_data)
        types = len(set(d.type for d in request.investments_data))
        return f"Your portfolio is worth ₹{total:,.0f} across {types} asset types. Diversification helps manage risk."
    
    return "Track your finances regularly to build better money habits!"


@router.post("/insight", response_model=InsightResponse)
async def generate_insight(request: InsightRequest):
    """
    Generate AI-powered financial insight based on user data
    """
    # Check if Gemini is available
    if not GEMINI_AVAILABLE or not model:
        return InsightResponse(
            insight=get_local_insight(request),
            suggestions=[],
            sentiment="neutral",
            ai_powered=False
        )
    
    try:
        # Build context based on request type
        context = ""
        system_prompt = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["chat"])
        
        if request.spending_data:
            context += format_spending_context(request.spending_data, request.monthly_income)
        
        if request.goals_data:
            context += "\n" + format_goals_context(request.goals_data)
        
        if request.investments_data:
            context += "\n" + format_investments_context(request.investments_data)
        
        # Build user message
        if request.user_message:
            user_message = f"{context}\n\nUser's question: {request.user_message}"
        else:
            user_message = f"{context}\n\nProvide a personalized insight based on this data."
        
        # Build full prompt for Gemini
        full_prompt = f"""{system_prompt}

{user_message}"""
        
        # Call Gemini
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=200,
                temperature=0.7
            )
        )
        
        insight = response.text.strip()
        
        # Determine sentiment based on content
        sentiment = "positive"
        if "⚠️" in insight or "warning" in insight.lower() or "risk" in insight.lower():
            sentiment = "warning"
        if "critical" in insight.lower() or "urgent" in insight.lower():
            sentiment = "critical"
        
        return InsightResponse(
            insight=insight,
            suggestions=[],
            sentiment=sentiment,
            ai_powered=True
        )
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback to local insight
        return InsightResponse(
            insight=get_local_insight(request),
            suggestions=[],
            sentiment="neutral",
            ai_powered=False
        )


@router.post("/chat")
async def chat_with_ai(request: InsightRequest):
    """
    Chat with AI financial advisor
    """
    if not request.user_message:
        raise HTTPException(status_code=400, detail="user_message is required")
    
    request.type = "chat"
    return await generate_insight(request)


@router.get("/health")
async def ai_health_check():
    """Check if AI service is available"""
    return {
        "gemini_installed": GEMINI_AVAILABLE,
        "api_key_configured": model is not None,
        "model": "gemini-1.5-flash" if model else None,
        "status": "ready" if model else "limited (local fallback only)"
    }
