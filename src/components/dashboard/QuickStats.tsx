import { Wallet, TrendingUp, Target, PiggyBank, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getUserTransactions } from "@/services/transactionService";
import { getGoals } from "@/services/goalsService";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  delay?: number;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, change, positive, delay = 0, loading }: StatCardProps) {
  return (
    <div 
      className="card-warm p-6 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {change && !loading && (
          <span className={cn(
            "text-sm font-medium px-2 py-1 rounded-full",
            positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <p className="mt-1 font-serif text-2xl font-semibold text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export function QuickStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpending: 0,
    monthlyIncome: 0,
    savings: 0,
    goalsProgress: 0,
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
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().financialSettings) {
            income = userSnap.data().financialSettings.monthlyIncome || 0;
          }
        } catch (e) {
          console.error("Failed to load user settings:", e);
        }

        // Fetch transactions
        const transactions = await getUserTransactions(user.uid);
        
        // Calculate this month's spending (expenses are negative)
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
          } else if (tx.createdAt instanceof Date) {
            date = tx.createdAt;
          } else if (tx.createdAt) {
            date = new Date(tx.createdAt);
          } else {
            return; // Skip if no valid date
          }
          
          if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
            const amount = Number(tx.amount || 0);
            if (amount < 0 && tx.category !== "Income") {
              // Expense (negative amount)
              monthlySpending += Math.abs(amount);
            } else if (amount > 0 || tx.category === "Income") {
              // Income (positive amount or Income category)
              monthlyIncomeFromTx += Math.abs(amount);
            }
          }
        });

        // Use income from settings, or from transactions if not set
        const effectiveIncome = income > 0 ? income : monthlyIncomeFromTx;

        // Fetch goals
        const goals = await getGoals();
        const totalSaved = goals.reduce((sum: number, g: any) => sum + (g.current || 0), 0);
        const totalTarget = goals.reduce((sum: number, g: any) => sum + (g.target || 0), 0);
        const goalsProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

        // Calculate savings (income - spending)
        const savings = effectiveIncome - monthlySpending;

        setStats({
          totalSpending: monthlySpending,
          monthlyIncome: effectiveIncome,
          savings: savings,
          goalsProgress: goalsProgress,
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const displayStats = [
    { 
      icon: Wallet, 
      label: "This Month's Spending", 
      value: stats.totalSpending > 0 ? `₹${stats.totalSpending.toLocaleString()}` : "₹0", 
      change: stats.totalSpending > 50000 ? "High" : stats.totalSpending > 0 ? "Normal" : undefined,
      positive: stats.totalSpending <= 50000
    },
    { 
      icon: TrendingUp, 
      label: "Monthly Income", 
      value: stats.monthlyIncome > 0 ? `₹${stats.monthlyIncome.toLocaleString()}` : "Not Set",
      change: stats.monthlyIncome === 0 ? "Set in Spending" : undefined,
      positive: true
    },
    { 
      icon: PiggyBank, 
      label: "Estimated Savings", 
      value: stats.monthlyIncome > 0 ? `₹${stats.savings.toLocaleString()}` : "—", 
      change: stats.savings > 0 ? "+Positive" : stats.savings < 0 ? "Negative" : undefined,
      positive: stats.savings >= 0
    },
    { 
      icon: Target, 
      label: "Goals Progress", 
      value: `${stats.goalsProgress}%`, 
      change: stats.goalsProgress >= 50 ? "On Track" : stats.goalsProgress > 0 ? "Behind" : undefined,
      positive: stats.goalsProgress >= 50
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {displayStats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} delay={index * 100} loading={loading} />
      ))}
    </div>
  );
}
