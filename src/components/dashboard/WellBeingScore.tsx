import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getUserTransactions } from "@/services/transactionService";
import { getGoals } from "@/services/goalsService";
import { getInvestments } from "@/services/investmentsService";

export function WellBeingScore() {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [breakdown, setBreakdown] = useState({
    savingsScore: 0,
    goalsScore: 0,
    investmentScore: 0,
    budgetScore: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's financial settings from Firebase
        let income = 0;
        let totalBudget = 0;
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            if (userSnap.data().financialSettings) {
              income = userSnap.data().financialSettings.monthlyIncome || 0;
            }
            // Calculate total budget from category budgets
            if (userSnap.data().categoryBudgets) {
              totalBudget = Object.values(userSnap.data().categoryBudgets as Record<string, number>)
                .reduce((sum: number, val: number) => sum + val, 0);
            }
          }
        } catch (e) {
          console.error("Failed to load user settings:", e);
        }

        // Fetch all data
        const [transactions, goals, investments] = await Promise.all([
          getUserTransactions(user.uid),
          getGoals(),
          getInvestments(),
        ]);

        // Calculate monthly spending (only expenses - negative amounts)
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        let monthlySpending = 0;
        let monthlyIncomeFromTx = 0;
        transactions.forEach((tx: any) => {
          let date: Date;
          if (tx.createdAt?.toDate) {
            date = tx.createdAt.toDate();
          } else if (tx.createdAt?.seconds) {
            date = new Date(tx.createdAt.seconds * 1000);
          } else if (tx.createdAt) {
            date = new Date(tx.createdAt);
          } else {
            return;
          }
          
          if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
            const amount = Number(tx.amount || 0);
            if (amount < 0 && tx.category !== "Income") {
              // Expense
              monthlySpending += Math.abs(amount);
            } else if (amount > 0 || tx.category === "Income") {
              // Income
              monthlyIncomeFromTx += Math.abs(amount);
            }
          }
        });

        // Use income from settings, or from transactions
        const effectiveIncome = income > 0 ? income : monthlyIncomeFromTx;

        // Calculate scores (each out of 25)
        
        // Savings Score (25 points) - Based on savings rate
        const savingsRate = effectiveIncome > 0 ? ((effectiveIncome - monthlySpending) / effectiveIncome) * 100 : 0;
        const savingsScore = effectiveIncome > 0 ? Math.min(25, Math.max(0, savingsRate * 1.25)) : 0; // 20% savings = 25 points
        
        // Goals Score (25 points) - Based on goal progress
        const totalSaved = goals.reduce((sum: number, g: any) => sum + (g.current || 0), 0);
        const totalTarget = goals.reduce((sum: number, g: any) => sum + (g.target || 0), 0);
        const goalsProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
        const goalsScore = goals.length > 0 ? Math.min(25, goalsProgress * 0.25) : 0;
        
        // Investment Score (25 points) - Based on diversification and returns
        const totalInvested = investments.reduce((sum: number, i: any) => sum + (i.invested || 0), 0);
        const currentValue = investments.reduce((sum: number, i: any) => sum + (i.current || 0), 0);
        const investmentReturn = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
        const assetTypes = [...new Set(investments.map((i: any) => i.type))].length;
        const diversificationBonus = Math.min(10, assetTypes * 3);
        const returnBonus = Math.min(15, Math.max(0, investmentReturn));
        const investmentScore = investments.length > 0 ? diversificationBonus + returnBonus : 0;
        
        // Budget Score (25 points) - Based on staying within budget
        const effectiveBudget = totalBudget > 0 ? totalBudget : effectiveIncome * 0.8; // Default to 80% of income
        const budgetUsed = effectiveBudget > 0 ? (monthlySpending / effectiveBudget) * 100 : 100;
        const budgetScore = effectiveBudget > 0 
          ? (budgetUsed <= 100 ? Math.max(0, 25 - Math.max(0, budgetUsed - 80) * 1.25) : 0)
          : 0;

        const totalScore = Math.round(savingsScore + goalsScore + investmentScore + budgetScore);
        
        setBreakdown({
          savingsScore: Math.round(savingsScore),
          goalsScore: Math.round(goalsScore),
          investmentScore: Math.round(investmentScore),
          budgetScore: Math.round(budgetScore),
        });
        
        setScore(Math.min(100, Math.max(0, totalScore)));
      } catch (error) {
        console.error("Failed to calculate score:", error);
        setScore(50); // Default fallback
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Animate score display
  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      let current = 0;
      const increment = score / 50;
      const interval = setInterval(() => {
        current += increment;
        if (current >= score) {
          setDisplayScore(score);
          clearInterval(interval);
        } else {
          setDisplayScore(Math.floor(current));
        }
      }, 20);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, loading]);

  const getScoreColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  if (loading) {
    return (
      <div className="card-warm p-8 animate-fade-up mb-8">
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
          Financial Well-Being Score
        </h2>
        <div className="flex items-center justify-center h-52">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-warm p-8 animate-fade-up mb-8">
      <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
        Financial Well-Being Score
      </h2>
      
      <div className="flex items-center justify-center gap-12 flex-wrap">
        {/* Score Ring */}
        <div className="relative">
          <svg className="w-52 h-52 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="104"
              cy="104"
              r="90"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="104"
              cy="104"
              r="90"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: "stroke-dashoffset 1s ease-out",
              }}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Score Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-serif text-5xl font-bold", getScoreColor())}>
              {displayScore}
            </span>
            <span className="text-muted-foreground text-sm mt-1">out of 100</span>
          </div>
        </div>

        {/* Score Details */}
        <div className="space-y-4">
          <div>
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              score >= 80 ? "bg-success/10 text-success" :
              score >= 60 ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            )}>
              {getScoreLabel()}
            </span>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Savings</span>
              <span className="font-medium">{breakdown.savingsScore}/25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goals Progress</span>
              <span className="font-medium">{breakdown.goalsScore}/25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Investments</span>
              <span className="font-medium">{breakdown.investmentScore}/25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget Control</span>
              <span className="font-medium">{breakdown.budgetScore}/25</span>
            </div>
          </div>

          <p className="text-muted-foreground text-sm max-w-xs">
            Score based on savings rate, goal progress, investment health, and budget control.
          </p>
        </div>
      </div>
    </div>
  );
}
