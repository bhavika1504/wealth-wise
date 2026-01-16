import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { chatWithAI } from "@/services/aiService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/firebase/firebaseConfig";
import { cn } from "@/lib/utils";
import { getUserTransactions } from "@/services/transactionService";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowRight,
  Bot,
  Calculator,
  Calendar,
  ChevronRight,
  Loader2,
  MessageCircle,
  PiggyBank,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ================== TYPES ================== */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SimulationParams {
  monthlySavings: number;
  oneTimeInvestment: number;
  annualReturn: number;
  years: number;
  inflationRate: number;
  scenario: "conservative" | "moderate" | "aggressive";
}

interface UserFinancials {
  currentSavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  goals: { name: string; target: number; current: number }[];
}

/* ================== PROJECTION LOGIC ================== */
const generateProjection = (
  currentSavings: number,
  params: SimulationParams
) => {
  const data = [];
  let current = currentSavings + params.oneTimeInvestment;
  let improved = currentSavings + params.oneTimeInvestment;

  const improvedSavings = params.monthlySavings * 1.5;
  const monthlyReturn = params.annualReturn / 100 / 12;
  const monthlyInflation = params.inflationRate / 100 / 12;

  for (let year = 0; year <= params.years; year++) {
    const realCurrent = current / Math.pow(1 + params.inflationRate / 100, year);
    const realImproved = improved / Math.pow(1 + params.inflationRate / 100, year);

    data.push({
      year: `Year ${year}`,
      yearNum: year,
      current: Math.round(current),
      improved: Math.round(improved),
      realCurrent: Math.round(realCurrent),
      realImproved: Math.round(realImproved),
    });

    // Compound monthly for more accurate projection
    for (let month = 0; month < 12; month++) {
      current = current * (1 + monthlyReturn) + params.monthlySavings;
      improved = improved * (1 + monthlyReturn) + improvedSavings;
    }
  }

  return data;
};

const getScenarioParams = (scenario: string): Partial<SimulationParams> => {
  switch (scenario) {
    case "conservative":
      return { annualReturn: 6, inflationRate: 5 };
    case "aggressive":
      return { annualReturn: 14, inflationRate: 5 };
    default:
      return { annualReturn: 10, inflationRate: 5 };
  }
};

/* ================== AI CHATBOT LOGIC ================== */

// Check if question is finance-related
const isFinanceRelated = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Greeting keywords - allow these through
  const greetingKeywords = ["hello", "hi", "hey", "good morning", "good evening", "namaste"];
  const isGreeting = greetingKeywords.some(keyword => lowerMessage.includes(keyword));
  if (isGreeting && lowerMessage.length < 30) {
    return true; // Short greetings are allowed
  }
  
  // Finance-specific keywords (NOT generic question words)
  const financeKeywords = [
    // Core finance terms
    "money", "save", "saving", "savings", "invest", "investment", "investing",
    "stock", "stocks", "mutual fund", "mutual funds", "mf", "sip", "fd", 
    "fixed deposit", "bank", "banking", "loan", "loans", "emi", "interest",
    "budget", "budgeting", "expense", "expenses", "spending", "spend",
    "income", "salary", "tax", "taxes", "gst", "itr", "80c", "80d", 
    "nps", "ppf", "epf", "pf", "provident fund",
    
    // Insurance
    "insurance", "lic", "term plan", "health insurance", "life insurance",
    
    // Goals & Planning
    "retirement", "pension", "goal", "goals", "financial goal",
    "wealth", "rich", "debt", "debts", "credit", "credit card", "debit",
    
    // Payments
    "upi", "payment", "bill", "bills", "rent", "mortgage", "emi",
    
    // Assets
    "property", "real estate", "gold", "silver", "crypto", "bitcoin",
    "nifty", "sensex", "share", "shares", "equity", "equities",
    
    // Trading & Market
    "market", "trading", "trade", "broker", "zerodha", "groww", "upstox",
    "portfolio", "return", "returns", "profit", "loss", "roi",
    
    // Economy
    "inflation", "recession", "economy", "gdp", "rbi", "sebi", "reserve bank",
    
    // Investment terms
    "elss", "ltcg", "stcg", "dividend", "capital gain", "nav", "amc",
    "emergency fund", "financial", "finance", "rupee", "rupees", "dollar",
    "currency", "forex",
    
    // App-specific
    "simulation", "projection", "simulator", "calculate", "calculator",
    "wealthwise", "wealth wise"
  ];
  
  // Check if message contains any finance keyword
  const hasFinanceKeyword = financeKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Finance question patterns
  const financePatterns = [
    /how (much|can i|do i|should i|to) (save|invest|spend|budget)/i,
    /what (is|are|should) (my|the|a) (saving|investment|budget|expense|goal|sip|fd|ppf)/i,
    /should i (invest|save|buy|sell)/i,
    /(tell|explain|help).*(saving|invest|money|budget|loan|tax|insurance|retirement)/i,
    /\₹|\brs\.?|\binr\b|\blakh|\bcrore/i,  // Currency mentions
  ];
  
  const matchesPattern = financePatterns.some(pattern => pattern.test(lowerMessage));
  
  return hasFinanceKeyword || matchesPattern;
};

// Generate local response for financial questions
const generateLocalFinancialResponse = (
  message: string,
  params: SimulationParams,
  financials: UserFinancials,
  projectionData: any[]
): string => {
  const lowerMessage = message.toLowerCase();
  const finalYear = projectionData[projectionData.length - 1];
  const difference = finalYear?.improved - finalYear?.current || 0;

  // Greeting responses
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return `Hello! 👋 I'm your AI Financial Advisor powered by Google Gemini. I can help you understand your simulation results, suggest ways to improve your savings, and answer financial planning questions. What would you like to know?`;
  }

  // Simulation results
  if (lowerMessage.includes("result") || lowerMessage.includes("projection") || lowerMessage.includes("future")) {
    return `Based on your current simulation:\n\n📊 **Current Path**: In ${params.years} years, you'll have approximately ₹${finalYear?.current?.toLocaleString() || 0}\n\n🚀 **Improved Path** (+50% savings): You could have ₹${finalYear?.improved?.toLocaleString() || 0}\n\n💰 **Extra Wealth**: ₹${difference.toLocaleString()} more by saving just ₹${Math.round(params.monthlySavings * 0.5).toLocaleString()} extra per month!\n\nWould you like tips on how to increase your savings?`;
  }

  // Savings advice
  if (lowerMessage.includes("save") || lowerMessage.includes("saving") || lowerMessage.includes("increase")) {
    const tips = [
      `💡 **Automate Your Savings**: Set up auto-transfer of ₹${Math.round(params.monthlySavings * 0.2).toLocaleString()} right after salary day.`,
      `🍽️ **Reduce Dining Out**: Cooking at home 3 more times a week can save ₹3,000-5,000/month.`,
      `📱 **Review Subscriptions**: Audit monthly subscriptions - you might be paying for services you don't use.`,
      `🛒 **24-Hour Rule**: Wait 24 hours before non-essential purchases over ₹1,000.`,
      `☕ **Small Cuts Add Up**: Reducing daily coffee expenses by ₹100 = ₹3,000/month!`,
    ];
    return `Here are some proven ways to boost your savings:\n\n${tips.join("\n\n")}\n\nEven a 10% increase in monthly savings (₹${Math.round(params.monthlySavings * 0.1).toLocaleString()}) can make a significant difference over ${params.years} years!`;
  }

  // Investment advice
  if (lowerMessage.includes("invest") || lowerMessage.includes("return") || lowerMessage.includes("grow")) {
    const scenarioAdvice = {
      conservative: "Your conservative approach (6% returns) is safe but may not beat inflation significantly. Consider adding some moderate-risk assets.",
      moderate: "Your moderate approach (10% returns) balances growth and safety well. A mix of index funds and fixed deposits is ideal.",
      aggressive: "Your aggressive approach (14% returns) has high growth potential but comes with volatility. Ensure you have an emergency fund first.",
    };
    return `📈 **Investment Insights**:\n\n${scenarioAdvice[params.scenario]}\n\n**Tips for better returns:**\n- Start with index funds (Nifty 50, Sensex) for beginners\n- SIP investing removes timing risk\n- Review and rebalance portfolio annually\n- Don't panic during market corrections\n\nYour current expected return: ${params.annualReturn}% annually`;
  }

  // Goals
  if (lowerMessage.includes("goal") || lowerMessage.includes("target") || lowerMessage.includes("achieve")) {
    if (financials.goals.length === 0) {
      return `I don't see any goals set up yet. Setting clear financial goals helps you stay motivated!\n\n**Popular goals to consider:**\n🏠 House down payment\n🚗 Car purchase\n✈️ Dream vacation\n👶 Child's education\n🎓 Emergency fund\n\nGo to the Goals page to add your first goal!`;
    }
    const goalsSummary = financials.goals
      .map(g => `- **${g.name}**: ₹${g.current.toLocaleString()} / ₹${g.target.toLocaleString()} (${Math.round((g.current / g.target) * 100)}%)`)
      .join("\n");
    return `Here's your goals progress:\n\n${goalsSummary}\n\nWith your current savings rate, you can accelerate these goals. Want me to suggest a savings allocation strategy?`;
  }

  // Inflation
  if (lowerMessage.includes("inflation") || lowerMessage.includes("real value") || lowerMessage.includes("purchasing")) {
    return `📉 **Inflation Impact** (at ${params.inflationRate}% annually):\n\nIn ${params.years} years:\n- **Nominal Value**: ₹${finalYear?.current?.toLocaleString() || 0}\n- **Real Value** (today's rupees): ₹${finalYear?.realCurrent?.toLocaleString() || 0}\n\nThis means your money will have ${Math.round((finalYear?.realCurrent / finalYear?.current) * 100)}% of today's purchasing power.\n\n**Beat inflation by:**\n- Investing in equity (historically 12-15% returns)\n- Real estate\n- Gold (hedge against inflation)\n- Avoid keeping too much in savings accounts (3-4% interest)`;
  }

  // Retirement
  if (lowerMessage.includes("retire") || lowerMessage.includes("retirement")) {
    const monthlyExpenseAtRetirement = financials.monthlyExpenses * Math.pow(1 + params.inflationRate / 100, params.years);
    const corpusNeeded = monthlyExpenseAtRetirement * 12 * 25;
    return `🏖️ **Retirement Planning**:\n\nBased on your current expenses (₹${financials.monthlyExpenses.toLocaleString()}/month):\n\n- **Expenses at retirement** (${params.years} years, ${params.inflationRate}% inflation): ₹${Math.round(monthlyExpenseAtRetirement).toLocaleString()}/month\n- **Corpus needed** (25x rule): ₹${Math.round(corpusNeeded).toLocaleString()}\n- **Your projected savings**: ₹${finalYear?.current?.toLocaleString() || 0}\n\n${finalYear?.current >= corpusNeeded ? "✅ You're on track for retirement!" : "⚠️ You may need to increase savings or extend timeline."}\n\nWant me to calculate the ideal monthly savings for your retirement goal?`;
  }

  // Emergency fund
  if (lowerMessage.includes("emergency") || lowerMessage.includes("rainy day")) {
    const emergencyFundNeeded = financials.monthlyExpenses * 6;
    return `🆘 **Emergency Fund Guide**:\n\n**Recommended**: 3-6 months of expenses\n**Your target**: ₹${emergencyFundNeeded.toLocaleString()} (6 months)\n\n**Where to keep it:**\n- Savings account (instant access)\n- Liquid mutual funds (1-2 day access, better returns)\n- Fixed deposits with premature withdrawal\n\n**Build it first** before aggressive investing. It's your financial safety net!`;
  }

  // What if scenarios
  if (lowerMessage.includes("what if") || lowerMessage.includes("if i")) {
    return `Great question! Here are some "what if" scenarios you can explore:\n\n1. **Increase savings by 20%**: Adjust the slider above\n2. **Change investment strategy**: Switch between Conservative/Moderate/Aggressive\n3. **Add one-time investment**: Use the one-time investment field\n4. **Extend timeline**: See how 5 more years of compounding helps\n\nTry adjusting the controls above and watch the projection update in real-time!`;
  }

  // SIP
  if (lowerMessage.includes("sip") || lowerMessage.includes("systematic")) {
    return `📈 **SIP (Systematic Investment Plan)**:\n\nSIP is one of the best ways to build wealth:\n\n**Benefits:**\n- Rupee cost averaging (buy more when markets are low)\n- Disciplined investing\n- Power of compounding\n- Start with as little as ₹500/month\n\n**Your SIP potential:**\n- Current: ₹${params.monthlySavings.toLocaleString()}/month\n- At ${params.annualReturn}% for ${params.years} years\n- **Result**: ₹${finalYear?.current?.toLocaleString() || 0}\n\nStart a SIP in index funds or diversified equity funds for long-term wealth creation!`;
  }

  // Default financial response
  return `Based on your simulation, you're projecting ₹${finalYear?.current?.toLocaleString() || 0} in ${params.years} years. That's a great start! Would you like suggestions on how to improve this?\n\nI can help with:\n💰 Savings tips\n📈 Investment strategies\n🎯 Goal planning\n🏖️ Retirement planning`;
};

// Off-topic response
const getOffTopicResponse = (question: string): string => {
  const lowerQuestion = question.toLowerCase();
  
  // Detect specific off-topic categories for personalized responses
  const celebrityKeywords = ["virat", "kohli", "dhoni", "sachin", "shahrukh", "salman", "actor", "actress", "cricketer", "player", "celebrity", "bollywood", "hollywood"];
  const politicsKeywords = ["modi", "rahul", "politics", "election", "bjp", "congress", "minister", "government", "parliament"];
  const generalKnowledge = ["capital", "country", "president", "history", "geography", "science", "physics", "chemistry", "biology"];
  const entertainment = ["movie", "song", "music", "game", "netflix", "series", "tv show"];
  
  const isCelebrity = celebrityKeywords.some(k => lowerQuestion.includes(k));
  const isPolitics = politicsKeywords.some(k => lowerQuestion.includes(k));
  const isGK = generalKnowledge.some(k => lowerQuestion.includes(k));
  const isEntertainment = entertainment.some(k => lowerQuestion.includes(k));
  
  if (isCelebrity) {
    return "🏏 While I appreciate the interest in celebrities, I'm your **Financial Advisor AI**! I specialize in money matters, not entertainment news.\n\n💰 I can help you with:\n• How to invest like the pros\n• Building wealth for your goals\n• Tax-saving strategies\n• SIP and mutual fund advice\n\nWhat financial question can I help with?";
  }
  
  if (isPolitics) {
    return "🗳️ I steer clear of politics! I'm your **Financial Advisor AI**, focused on helping you grow your wealth.\n\n📈 Ask me about:\n• Investment strategies\n• Tax planning (80C, 80D deductions)\n• Building an emergency fund\n• Retirement planning\n\nHow can I help with your finances?";
  }
  
  if (isGK || isEntertainment) {
    return "📚 That's a great general knowledge question, but I'm specialized in **personal finance**!\n\n🎯 I can help you with:\n• Savings and budgeting\n• Stock market basics\n• Mutual funds & SIP\n• Loan and EMI planning\n\nWhat would you like to know about your money?";
  }
  
  // Default off-topic responses
  const responses = [
    "🙏 I appreciate the question, but I'm your **Financial Advisor AI** - I specialize in money matters like savings, investments, budgeting, and financial planning.\n\nTry asking me about:\n💰 How to save more money\n📈 Investment strategies (SIP, mutual funds)\n🎯 Your financial goals\n🏖️ Retirement planning\n📊 Your simulation results\n\nHow can I help with your finances today?",
    
    "😊 That's an interesting question, but I'm designed to help with **personal finance and investments**.\n\nI can assist you with:\n• Analyzing your savings projection\n• Explaining investment options\n• Planning for retirement\n• Building an emergency fund\n• Understanding inflation impact\n\nWhat financial topic would you like to explore?",
    
    "🤖 I'm WealthWise AI - your personal **Financial Advisor**! While I'd love to chat about everything, I'm most helpful with money-related questions.\n\nAsk me things like:\n• \"How can I increase my savings?\"\n• \"What's the best investment strategy?\"\n• \"How much do I need for retirement?\"\n• \"Explain SIP investing\"\n\nLet's talk about your financial future! 💸"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

/* ================== CUSTOM TOOLTIP ================== */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-warm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-sm">
          {p.name}: ₹{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

/* ================== QUICK SUGGESTIONS ================== */
const quickSuggestions = [
  "What will my savings look like in the future?",
  "How can I save more money?",
  "Tell me about SIP investing",
  "How much do I need for retirement?",
  "What's a good emergency fund?",
  "How does inflation affect my savings?",
];

/* ================== MAIN COMPONENT ================== */
const Simulator = () => {
  // Simulation parameters
  const [params, setParams] = useState<SimulationParams>({
    monthlySavings: 15000,
    oneTimeInvestment: 0,
    annualReturn: 10,
    years: 10,
    inflationRate: 5,
    scenario: "moderate",
  });

  // User data
  const [financials, setFinancials] = useState<UserFinancials>({
    currentSavings: 0,
    monthlyIncome: 50000,
    monthlyExpenses: 35000,
    goals: [],
  });

  // UI state
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState("simulator");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI Financial Advisor. I can help you understand your simulation, suggest savings strategies, and answer financial questions. Try asking me something!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* -------- FETCH USER DATA -------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        // Fetch transactions
        const txns = await getUserTransactions(user.uid);
        const netSavings = txns.reduce(
          (sum: number, tx: any) => sum + Number(tx.amount || 0),
          0
        );

        // Fetch goals
        const goalsRef = collection(db, "users", user.uid, "goals");
        const goalsSnap = await getDocs(goalsRef);
        const goals = goalsSnap.docs.map(doc => ({
          name: doc.data().name || "Goal",
          target: doc.data().target || 0,
          current: doc.data().current || 0,
        }));

        // Calculate monthly expenses from transactions
        const now = new Date();
        const thisMonth = txns.filter((tx: any) => {
          const date = tx.createdAt?.seconds
            ? new Date(tx.createdAt.seconds * 1000)
            : new Date(tx.createdAt);
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear() &&
            tx.amount < 0
          );
        });
        const monthlyExpenses = Math.abs(
          thisMonth.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
        );

        setFinancials({
          currentSavings: Math.max(netSavings, 0),
          monthlyIncome: 50000, // Could be fetched from settings
          monthlyExpenses: monthlyExpenses || 35000,
          goals,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    });

    return () => unsub();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update params when scenario changes
  const handleScenarioChange = (scenario: string) => {
    const scenarioParams = getScenarioParams(scenario);
    setParams(prev => ({
      ...prev,
      scenario: scenario as SimulationParams["scenario"],
      ...scenarioParams,
    }));
  };

  // Generate projection data
  const projectionData = generateProjection(financials.currentSavings, params);
  const finalYear = projectionData[projectionData.length - 1];
  const currentFuture = finalYear?.current || 0;
  const improvedFuture = finalYear?.improved || 0;
  const difference = improvedFuture - currentFuture;

  // Handle simulation animation
  const handleSimulate = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 800);
  };

  // Handle chat message send
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    try {
      let response: string;
      
      // Check if question is finance-related
      if (!isFinanceRelated(currentInput)) {
        // Off-topic question - politely redirect
        response = getOffTopicResponse(currentInput);
      } else {
        // Try Gemini API first for finance questions
        try {
          const { response: aiResponse, aiPowered } = await chatWithAI(
            currentInput,
            {
              spending: [], // Could pass actual data here
              goals: financials.goals.map(g => ({
                name: g.name,
                current: g.current,
                target: g.target,
                status: "on-track",
              })),
              monthlyIncome: financials.monthlyIncome,
            }
          );
          
          if (aiPowered && aiResponse) {
            response = `🤖 ${aiResponse}`;
          } else {
            // Fallback to local response
            response = generateLocalFinancialResponse(
              currentInput,
              params,
              financials,
              projectionData
            );
          }
        } catch (error) {
          // API failed, use local response
          response = generateLocalFinancialResponse(
            currentInput,
            params,
            financials,
            projectionData
          );
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle quick suggestion click
  const handleQuickSuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  // Milestone data for bar chart
  const milestoneData = [
    { name: "1 Year", current: projectionData[1]?.current || 0, improved: projectionData[1]?.improved || 0 },
    { name: "5 Years", current: projectionData[5]?.current || 0, improved: projectionData[5]?.improved || 0 },
    { name: "10 Years", current: projectionData[10]?.current || 0, improved: projectionData[10]?.improved || 0 },
  ].filter(m => m.current > 0);

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-accent" />
            Future You Simulator
          </h1>
          <p className="text-muted-foreground mt-2">
            See how small decisions today shape your financial future
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="soft"
            onClick={() => {
              setParams({
                monthlySavings: 15000,
                oneTimeInvestment: 0,
                annualReturn: 10,
                years: 10,
                inflationRate: 5,
                scenario: "moderate",
              });
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="warm" onClick={handleSimulate}>
            <Play className="h-4 w-4 mr-2" />
            Simulate
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulator
          </TabsTrigger>
          <TabsTrigger value="advisor" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Advisor
          </TabsTrigger>
        </TabsList>

        {/* Simulator Tab */}
        <TabsContent value="simulator" className="space-y-6 mt-6">
          {/* Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Simulation Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Column - Sliders */}
                <div className="space-y-6">
                  {/* Scenario Selector */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Investment Strategy</Label>
                    <Select
                      value={params.scenario}
                      onValueChange={handleScenarioChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">🛡️ Conservative (6% returns)</SelectItem>
                        <SelectItem value="moderate">⚖️ Moderate (10% returns)</SelectItem>
                        <SelectItem value="aggressive">🚀 Aggressive (14% returns)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Monthly Savings */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-sm font-medium">Monthly Savings</Label>
                      <span className="font-serif text-lg font-bold text-primary">
                        ₹{params.monthlySavings.toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={[params.monthlySavings]}
                      onValueChange={(v) => setParams(p => ({ ...p, monthlySavings: v[0] }))}
                      min={1000}
                      max={100000}
                      step={1000}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>₹1,000</span>
                      <span>₹1,00,000</span>
                    </div>
                  </div>

                  {/* Time Horizon */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-sm font-medium">Time Horizon</Label>
                      <span className="font-serif text-lg font-bold text-primary">
                        {params.years} Years
                      </span>
                    </div>
                    <Slider
                      value={[params.years]}
                      onValueChange={(v) => setParams(p => ({ ...p, years: v[0] }))}
                      min={1}
                      max={30}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 Year</span>
                      <span>30 Years</span>
                    </div>
                  </div>

                  {/* One-time Investment */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">One-time Investment (optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={params.oneTimeInvestment || ""}
                        onChange={(e) => setParams(p => ({ ...p, oneTimeInvestment: Number(e.target.value) || 0 }))}
                        className="pl-7"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Your Current Savings</p>
                    <p className="font-serif text-2xl font-bold">
                      ₹{financials.currentSavings.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Current Path</p>
                      <p className="font-serif text-lg font-bold">
                        ₹{params.monthlySavings.toLocaleString()}/mo
                      </p>
                    </div>
                    <ArrowRight className="text-muted-foreground" />
                    <div className="flex-1 p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-success mb-1">Improved Path</p>
                      <p className="font-serif text-lg font-bold text-success">
                        ₹{Math.round(params.monthlySavings * 1.5).toLocaleString()}/mo
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Annual Return</p>
                      <p className="font-semibold">{params.annualReturn}%</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Inflation Rate</p>
                      <p className="font-semibold">{params.inflationRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {params.years}-Year Wealth Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("h-80", isAnimating && "opacity-50 transition-opacity")}>
                <ResponsiveContainer>
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="improvedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="current"
                      name="Current Path"
                      stroke="hsl(var(--muted-foreground))"
                      fill="url(#currentGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="improved"
                      name="Improved Path (+50%)"
                      stroke="hsl(var(--success))"
                      fill="url(#improvedGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">In {params.years} Years</p>
                <p className="font-serif text-xl font-bold mt-1">
                  ₹{currentFuture.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-success" />
                <p className="text-xs text-muted-foreground">Extra Wealth</p>
                <p className="font-serif text-xl font-bold mt-1 text-success">
                  +₹{difference.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Wallet className="h-6 w-6 mx-auto mb-2 text-accent" />
                <p className="text-xs text-muted-foreground">Real Value (Today's ₹)</p>
                <p className="font-serif text-xl font-bold mt-1">
                  ₹{finalYear?.realCurrent?.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <PiggyBank className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Total Contributed</p>
                <p className="font-serif text-xl font-bold mt-1">
                  ₹{(params.monthlySavings * params.years * 12 + params.oneTimeInvestment).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Milestones */}
          {milestoneData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Wealth Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={milestoneData}>
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="current" name="Current Path" fill="hsl(var(--muted-foreground))" radius={4} />
                      <Bar dataKey="improved" name="Improved Path" fill="hsl(var(--success))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Advisor Tab */}
        <TabsContent value="advisor" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat Panel */}
            <Card className="lg:col-span-2">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  AI Financial Advisor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <ScrollArea className="h-[500px] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" && "flex-row-reverse"
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                            message.role === "assistant"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {message.role === "assistant" ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3",
                            message.role === "assistant"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick Suggestions */}
                <div className="border-t p-3">
                  <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickSuggestions.slice(0, 3).map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleQuickSuggestion(suggestion)}
                      >
                        {suggestion}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask me anything about your finances..."
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isTyping}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar - Context */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Your Financial Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Savings</span>
                    <span className="font-medium">₹{financials.currentSavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Savings</span>
                    <span className="font-medium">₹{params.monthlySavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Projected ({params.years}yr)</span>
                    <span className="font-medium text-primary">₹{currentFuture.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Goals</span>
                    <span className="font-medium">{financials.goals.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    Try Asking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickSuggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-auto py-2 px-3"
                      onClick={() => {
                        handleQuickSuggestion(suggestion);
                        setActiveTab("advisor");
                      }}
                    >
                      <ChevronRight className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="text-left">{suggestion}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Simulator;
