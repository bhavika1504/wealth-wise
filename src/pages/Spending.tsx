import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import UploadStatement from "@/components/UploadStatement";
import { auth } from "@/firebase/firebaseConfig";
import { db } from "@/firebase/db";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/utils/categorize";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ArrowUpRight,
  Car,
  Coffee,
  Film,
  GraduationCap,
  Heart,
  Home,
  Info,
  Loader2,
  MoreHorizontal,
  PiggyBank,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  X,
  Zap,
  ArrowRightLeft,
} from "lucide-react";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getUserTransactions,
  deleteTransaction,
  deleteAllTransactions,
  addTransaction,
} from "@/services/transactionService";
import { categorizeTransaction } from "@/services/mlService";

/* ---------------- CATEGORY META ---------------- */

const CATEGORY_META: Record<string, any> = {
  "Food & Dining": { icon: Coffee, color: "hsl(25, 50%, 35%)", budget: 15000 },
  "Rent": { icon: Home, color: "hsl(38, 90%, 50%)", budget: 25000 },
  "Transportation": { icon: Car, color: "hsl(35, 60%, 45%)", budget: 10000 },
  "Shopping": { icon: ShoppingBag, color: "hsl(30, 40%, 55%)", budget: 12000 },
  "Utilities": { icon: Zap, color: "hsl(20, 35%, 40%)", budget: 6000 },
  "Entertainment": { icon: Film, color: "hsl(45, 70%, 55%)", budget: 5000 },
  "Healthcare": { icon: Heart, color: "hsl(340, 60%, 50%)", budget: 5000 },
  "Education": { icon: GraduationCap, color: "hsl(200, 60%, 45%)", budget: 10000 },
  "Investment": { icon: TrendingUp, color: "hsl(142, 70%, 40%)", budget: 0 },
  "Transfer": { icon: ArrowRightLeft, color: "hsl(210, 50%, 50%)", budget: 0 },
  "Income": { icon: Wallet, color: "hsl(142, 70%, 45%)", budget: 0 },
  "Savings": { icon: PiggyBank, color: "hsl(200, 70%, 50%)", budget: 0 },
  "Other": { icon: MoreHorizontal, color: "hsl(0, 0%, 50%)", budget: 5000 },
};

/* ---------------- INTERFACES ---------------- */

interface CategoryData {
  name: string;
  value: number;
  budget: number;
  color: string;
  count: number;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: any;
}

interface FinancialSettings {
  monthlyIncome: number;
  monthlySavingsGoal: number;
}

/* ---------------- CUSTOM TOOLTIP ---------------- */

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-warm">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-primary font-semibold">
          ₹{Number(payload[0].value).toLocaleString()}
        </p>
        {data.count && (
          <p className="text-xs text-muted-foreground">{data.count} transactions</p>
        )}
      </div>
    );
  }
  return null;
};

const LineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-warm">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-primary font-semibold">
          ₹{Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

/* ---------------- AI INSIGHT GENERATOR ---------------- */

const generateLocalInsight = (
  categoryData: CategoryData[],
  totalSpending: number,
  totalBudget: number,
  income: number,
  savingsGoal: number
): string => {
  if (categoryData.length === 0) {
    return "Upload your bank statement to get personalized spending insights.";
  }

  const insights: string[] = [];
  const actualSavings = income - totalSpending;
  const savingsRate = income > 0 ? (actualSavings / income) * 100 : 0;

  // Savings analysis
  if (income > 0) {
    if (actualSavings >= savingsGoal && savingsGoal > 0) {
      insights.push(`🎉 Great! You're saving ₹${actualSavings.toLocaleString()} this month, exceeding your goal of ₹${savingsGoal.toLocaleString()}.`);
    } else if (actualSavings > 0 && savingsGoal > 0) {
      const shortfall = savingsGoal - actualSavings;
      insights.push(`You're ₹${shortfall.toLocaleString()} short of your savings goal. Review discretionary spending to close the gap.`);
    } else if (actualSavings < 0) {
      insights.push(`⚠️ You're overspending by ₹${Math.abs(actualSavings).toLocaleString()}. Immediate action needed to balance your budget.`);
    }

    if (savingsRate >= 20) {
      insights.push(`Excellent savings rate of ${savingsRate.toFixed(0)}%! You're building wealth consistently.`);
    } else if (savingsRate > 0 && savingsRate < 10) {
      insights.push(`Your savings rate is ${savingsRate.toFixed(0)}%. Aim for at least 20% to build a strong financial foundation.`);
    }
  }

  // Find highest spending category
  const sortedBySpending = [...categoryData].sort((a, b) => b.value - a.value);
  const topCategory = sortedBySpending[0];

  if (topCategory) {
    const percentage = ((topCategory.value / totalSpending) * 100).toFixed(0);
    insights.push(`${topCategory.name} is your highest expense at ₹${topCategory.value.toLocaleString()} (${percentage}% of total).`);
  }

  // Check budget overruns
  const overBudgetCategories = categoryData.filter(
    (c) => c.budget > 0 && c.value > c.budget
  );

  if (overBudgetCategories.length > 0) {
    const cat = overBudgetCategories[0];
    const overBy = cat.value - cat.budget;
    insights.push(`⚠️ ${cat.name} is over budget by ₹${overBy.toLocaleString()}. Consider reducing spending here.`);
  }

  // Overall budget status
  if (totalBudget > 0) {
    const budgetPercent = (totalSpending / totalBudget) * 100;
    if (budgetPercent > 90) {
      insights.push(`You've used ${budgetPercent.toFixed(0)}% of your total budget. Time to slow down!`);
    } else if (budgetPercent < 50) {
      insights.push(`Great job! You've only used ${budgetPercent.toFixed(0)}% of your budget. Keep it up!`);
    }
  }

  return insights.length > 0
    ? insights[Math.floor(Math.random() * insights.length)]
    : "Your spending looks balanced. Keep tracking to maintain good habits!";
};

/* ---------------- COMPONENT ---------------- */

const Spending = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("Loading insights...");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Financial settings
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({
    monthlyIncome: 0,
    monthlySavingsGoal: 0,
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [tempIncome, setTempIncome] = useState("");
  const [tempSavingsGoal, setTempSavingsGoal] = useState("");

  // Add transaction dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    category: "Income",
    type: "income" as "income" | "expense",
  });

  // Category budgets (user-defined)
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [tempBudgets, setTempBudgets] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get budget for a category (user-defined or default)
  const getBudget = (category: string): number => {
    if (categoryBudgets[category] !== undefined) {
      return categoryBudgets[category];
    }
    return CATEGORY_META[category]?.budget || 0;
  };

  // Load financial settings
  const loadFinancialSettings = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        if (snap.data().financialSettings) {
          setFinancialSettings(snap.data().financialSettings);
        }
        if (snap.data().categoryBudgets) {
          setCategoryBudgets(snap.data().categoryBudgets);
        }
      }
    } catch (error) {
      console.error("Failed to load financial settings:", error);
    }
  };

  // Save category budgets
  const saveCategoryBudgets = async () => {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      const budgetsToSave: Record<string, number> = {};
      
      Object.entries(tempBudgets).forEach(([category, value]) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
          budgetsToSave[category] = numValue;
        }
      });

      await setDoc(userRef, { categoryBudgets: budgetsToSave }, { merge: true });
      setCategoryBudgets(budgetsToSave);
      setBudgetDialogOpen(false);
      toast.success("Category budgets saved!");

      // Refresh data to update display
      if (userId) {
        const transactions = await getUserTransactions(userId);
        processTransactions(transactions);
      }
    } catch (error) {
      console.error("Failed to save budgets:", error);
      toast.error("Failed to save budgets");
    }
  };

  // Open budget dialog with current values
  const openBudgetDialog = () => {
    const currentBudgets: Record<string, string> = {};
    const categories = ["Food & Dining", "Rent", "Transportation", "Shopping", "Utilities", "Entertainment", "Healthcare", "Education", "Other"];
    
    categories.forEach(cat => {
      currentBudgets[cat] = (categoryBudgets[cat] ?? CATEGORY_META[cat]?.budget ?? 0).toString();
    });
    
    setTempBudgets(currentBudgets);
    setBudgetDialogOpen(true);
  };

  // Save financial settings
  const saveFinancialSettings = async () => {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      const newSettings = {
        monthlyIncome: parseFloat(tempIncome) || 0,
        monthlySavingsGoal: parseFloat(tempSavingsGoal) || 0,
      };

      await setDoc(userRef, { financialSettings: newSettings }, { merge: true });
      setFinancialSettings(newSettings);
      setSettingsDialogOpen(false);
      toast.success("Financial settings saved!");

      // Refresh data to update insights
      window.location.reload();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      setDeleting(transactionId);
      await deleteTransaction(transactionId);
      setRecentTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));
      toast.success("Transaction deleted");

      // Refresh data
      if (userId) {
        const transactions = await getUserTransactions(userId);
        processTransactions(transactions);
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast.error("Failed to delete transaction");
    } finally {
      setDeleting(null);
    }
  };

  // Handle delete all transactions
  const handleDeleteAllTransactions = async () => {
    try {
      setLoading(true);
      const count = await deleteAllTransactions();
      toast.success(`Deleted ${count} transactions`);
      setRecentTransactions([]);
      setCategoryData([]);
      setMonthlyTrend([]);
      setAiInsight("Upload your bank statement to get personalized spending insights.");
    } catch (error) {
      console.error("Failed to delete all transactions:", error);
      toast.error("Failed to delete transactions");
    } finally {
      setLoading(false);
    }
  };


  // ML Category Prediction
  const predictCategory = async (description: string) => {
    if (!description || newTransaction.type === "income") return;

    try {
      const result = await categorizeTransaction(description);
      const predicted = result.category;

      // Simple mapping check - assuming backend returns valid keys or close enough
      // In a real app, we might need a fuzzy matcher or strict mapping
      if (CATEGORY_META[predicted] || predicted === "Other") {
        setNewTransaction(prev => ({ ...prev, category: predicted }));
        toast.success(`Category auto-detected: ${predicted}`);
      }
    } catch (error) {
      console.error("ML prediction failed:", error);
      // Fail silently, user can select manually
    }
  };

  // Handle add income/expense
  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const amount = parseFloat(newTransaction.amount);
      await addTransaction({
        description: newTransaction.description,
        amount: newTransaction.type === "income" ? amount : -amount,
        category: newTransaction.type === "income" ? "Income" : newTransaction.category,
        createdAt: new Date(),
      });

      toast.success(`${newTransaction.type === "income" ? "Income" : "Expense"} added successfully`);
      setAddDialogOpen(false);
      setNewTransaction({ description: "", amount: "", category: "Income", type: "income" });

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  // Helper to parse transaction date
  const getTransactionDate = (tx: any): Date | null => {
    if (!tx.createdAt) return null;
    
    if (tx.createdAt.toDate) {
      return tx.createdAt.toDate();
    } else if (tx.createdAt instanceof Date) {
      return tx.createdAt;
    } else if (tx.createdAt.seconds) {
      return new Date(tx.createdAt.seconds * 1000);
    } else {
      return new Date(tx.createdAt);
    }
  };

  // Helper to check if transaction is in current month
  const isCurrentMonth = (tx: any): boolean => {
    const date = getTransactionDate(tx);
    if (!date) return false;
    
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  // Process transactions
  const processTransactions = (transactions: any[]) => {
    // Filter transactions for current month only (for budget comparison)
    const currentMonthTransactions = transactions.filter(isCurrentMonth);

    // Store recent transactions (excluding income for display) - show all, not just current month
    setRecentTransactions(
      transactions
        .filter((tx: any) => tx.category !== "Income")
        .slice(0, 10)
        .map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          category: tx.category || "Other",
          description: tx.description || "No description",
          createdAt: tx.createdAt,
        }))
    );

    /* ---------- CATEGORY AGGREGATION (current month expenses only) ---------- */
    const categoryMap: Record<string, CategoryData> = {};

    currentMonthTransactions.forEach((tx: any) => {
      // Skip income entries for spending analysis
      if (tx.category === "Income" || tx.amount > 0) return;
      const category = tx.category || "Other";
      const amount = Math.abs(Number(tx.amount || 0));

      if (!categoryMap[category]) {
        const meta = CATEGORY_META[category] || CATEGORY_META["Other"];
        categoryMap[category] = {
          name: category,
          value: 0,
          budget: getBudget(category),
          color: meta.color || getCategoryColor(category),
          count: 0,
        };
      }

      categoryMap[category].value += amount;
      categoryMap[category].count += 1;
    });

    const processedCategories = Object.values(categoryMap).sort(
      (a, b) => b.value - a.value
    );
    setCategoryData(processedCategories);

    /* ---------- MONTHLY TREND ---------- */
    const monthMap: Record<string, number> = {};

    transactions.forEach((tx: any) => {
      if (!tx.createdAt || tx.category === "Income") return;

      let date: Date;
      if (tx.createdAt.toDate) {
        date = tx.createdAt.toDate();
      } else if (tx.createdAt instanceof Date) {
        date = tx.createdAt;
      } else {
        date = new Date(tx.createdAt);
      }

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = 0;
      }
      monthMap[monthKey] += Math.abs(Number(tx.amount || 0));
    });

    // Sort by date and format for chart
    const sortedMonths = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleString("en-US", { month: "short" }),
          spending: value,
        };
      });

    setMonthlyTrend(sortedMonths);

    /* ---- GENERATE INSIGHT ---- */
    const totalSpending = processedCategories.reduce((sum, c) => sum + c.value, 0);
    const totalBudget = processedCategories.reduce((sum, c) => sum + c.budget, 0);

    if (processedCategories.length > 0) {
      setLoadingInsight(true);
      
      // Try AI-powered insight first
      import("@/services/aiService").then(async (service) => {
        try {
          const spendingData = processedCategories.map(c => ({
            category: c.name,
            amount: c.value,
            budget: c.budget,
          }));
          
          const { insight, aiPowered } = await service.getAISpendingInsight(
            spendingData,
            financialSettings.monthlyIncome
          );
          setAiInsight(aiPowered ? `🤖 ${insight}` : insight);
        } catch {
          // Fallback to local
          const localInsight = generateLocalInsight(
            processedCategories,
            totalSpending,
            totalBudget,
            financialSettings.monthlyIncome,
            financialSettings.monthlySavingsGoal
          );
          setAiInsight(localInsight);
        }
        setLoadingInsight(false);
      });
    } else {
      setAiInsight("Upload your bank statement to get personalized spending insights.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCategoryData([]);
        setMonthlyTrend([]);
        setRecentTransactions([]);
        setLoading(false);
        return;
      }

      setUserId(user.uid);

      try {
        setLoading(true);

        // Load financial settings
        await loadFinancialSettings(user.uid);

        // Load transactions
        const transactions = await getUserTransactions(user.uid);
        processTransactions(transactions);
      } catch (error) {
        console.error("Failed to load transactions:", error);
        setAiInsight("Failed to load data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Recalculate insight when settings change
  useEffect(() => {
    if (categoryData.length > 0) {
      const totalSpending = categoryData.reduce((sum, c) => sum + c.value, 0);
      const totalBudget = categoryData.reduce((sum, c) => sum + c.budget, 0);
      
      // Try AI-powered insight first
      import("@/services/aiService").then(async (service) => {
        try {
          const spendingData = categoryData.map(c => ({
            category: c.name,
            amount: c.value,
            budget: c.budget,
          }));
          
          const { insight, aiPowered } = await service.getAISpendingInsight(
            spendingData,
            financialSettings.monthlyIncome
          );
          setAiInsight(aiPowered ? `🤖 ${insight}` : insight);
        } catch {
          // Fallback to local
          const localInsight = generateLocalInsight(
            categoryData,
            totalSpending,
            totalBudget,
            financialSettings.monthlyIncome,
            financialSettings.monthlySavingsGoal
          );
          setAiInsight(localInsight);
        }
      });
    }
  }, [financialSettings, categoryData]);

  const totalSpending = categoryData.reduce((sum, c) => sum + c.value, 0);
  const totalBudget = categoryData.reduce((sum, c) => sum + c.budget, 0);
  const budgetPercentage = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0; // Actual percentage for display
  const budgetProgressValue = Math.min(budgetPercentage, 100); // Capped at 100% for Progress bar
  const actualSavings = financialSettings.monthlyIncome - totalSpending; // Can be negative
  const savingsProgress = financialSettings.monthlySavingsGoal > 0
    ? Math.min(100, Math.max(0, (Math.max(0, actualSavings) / financialSettings.monthlySavingsGoal) * 100))
    : 0;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Spending Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Track income, expenses, and savings in one place
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Income/Expense Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Income or Expense</DialogTitle>
                <DialogDescription>
                  Manually add an income or expense entry
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Button
                    variant={newTransaction.type === "income" ? "default" : "outline"}
                    onClick={() => setNewTransaction(prev => ({ ...prev, type: "income", category: "Income" }))}
                    className="flex-1"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Income
                  </Button>
                  <Button
                    variant={newTransaction.type === "expense" ? "default" : "outline"}
                    onClick={() => setNewTransaction(prev => ({ ...prev, type: "expense", category: "Shopping" }))}
                    className="flex-1"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Expense
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder={newTransaction.type === "income" ? "e.g., Salary, Freelance" : "e.g., Grocery shopping"}
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                    onBlur={() => predictCategory(newTransaction.description)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                {newTransaction.type === "expense" && (
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Food & Dining", "Shopping", "Transportation", "Entertainment", "Utilities", "Other"].map((cat) => (
                        <Button
                          key={cat}
                          variant={newTransaction.category === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNewTransaction(prev => ({ ...prev, category: cat }))}
                          className="text-xs"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction}>
                  Add {newTransaction.type === "income" ? "Income" : "Expense"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Financial Settings Dialog */}
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setTempIncome(financialSettings.monthlyIncome.toString());
                  setTempSavingsGoal(financialSettings.monthlySavingsGoal.toString());
                }}
              >
                <Wallet className="h-4 w-4" />
                Set Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Financial Settings</DialogTitle>
                <DialogDescription>
                  Set your monthly income and savings goal for better insights
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="income">Monthly Income (₹)</Label>
                  <Input
                    id="income"
                    type="number"
                    placeholder="85000"
                    value={tempIncome}
                    onChange={(e) => setTempIncome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="savings">Monthly Savings Goal (₹)</Label>
                  <Input
                    id="savings"
                    type="number"
                    placeholder="20000"
                    value={tempSavingsGoal}
                    onChange={(e) => setTempSavingsGoal(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveFinancialSettings}>Save Settings</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Set Category Budgets Dialog */}
          <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={openBudgetDialog}
              >
                <PiggyBank className="h-4 w-4" />
                Set Budgets
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Category Budgets</DialogTitle>
                <DialogDescription>
                  Set monthly budget limits for each spending category
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {["Food & Dining", "Rent", "Transportation", "Shopping", "Utilities", "Entertainment", "Healthcare", "Education", "Other"].map((category) => {
                  const meta = CATEGORY_META[category];
                  const Icon = meta?.icon || MoreHorizontal;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg shrink-0"
                        style={{ backgroundColor: `${meta?.color || "#888"}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: meta?.color || "#888" }} />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`budget-${category}`} className="text-sm font-medium">
                          {category}
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            id={`budget-${category}`}
                            type="number"
                            placeholder="0"
                            className="pl-7"
                            value={tempBudgets[category] || ""}
                            onChange={(e) => setTempBudgets(prev => ({ ...prev, [category]: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCategoryBudgets}>Save Budgets</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-1">
            <Button
              variant="default"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Statement
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold mb-1">CSV Format Required:</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Your CSV should have these columns:
                </p>
                <code className="text-xs bg-muted p-1 rounded block">
                  date,description,amount
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Example row:<br />
                  2025-01-05,Swiggy Food,450
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {recentTransactions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Transactions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your transaction records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllTransactions}>
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <UploadStatement ref={fileInputRef} />
      </div>

      {/* Income & Savings Summary */}
      {financialSettings.monthlyIncome > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-fade-up">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Wallet className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Income</p>
                  <p className="font-semibold">₹{financialSettings.monthlyIncome.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <ShoppingBag className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month's Expenses</p>
                  <p className="font-semibold">₹{totalSpending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", actualSavings >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                  <PiggyBank className={cn("h-5 w-5", actualSavings >= 0 ? "text-success" : "text-destructive")} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month's Savings</p>
                  <p className={cn("font-semibold", actualSavings >= 0 ? "text-success" : "text-destructive")}>
                    {actualSavings >= 0 ? "+" : ""}₹{actualSavings.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Savings Goal Progress</p>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(Math.max(savingsProgress, 0), 100)} className="h-2 flex-1" />
                    <span className="text-xs font-medium">{savingsProgress.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex gap-2 mb-8 animate-fade-up" style={{ animationDelay: "50ms" }}>
        {["week", "month", "quarter", "year"].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
              selectedPeriod === period
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">This Month's Spending</p>
            <p className="font-serif text-3xl font-bold mt-2">
              ₹{totalSpending.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {categoryData.length > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">
                    {categoryData.length} categories • {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No data this month</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-up" style={{ animationDelay: "150ms" }}>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Monthly Budget Status</p>
            {totalBudget > 0 ? (
              budgetPercentage > 100 ? (
                <>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-serif text-3xl font-bold text-destructive">
                      Over
                    </span>
                    <span className="text-lg font-semibold text-destructive">
                      by ₹{(totalSpending - totalBudget).toLocaleString()}
                    </span>
                  </div>
                  <Progress value={100} className="mt-3 bg-destructive/20" />
                  <p className="text-xs text-destructive mt-2">
                    ⚠️ Budget ₹{totalBudget.toLocaleString()} → Spent ₹{totalSpending.toLocaleString()} ({Math.round(budgetPercentage)}%)
                  </p>
                </>
              ) : (
                <>
                  <p className="font-serif text-3xl font-bold mt-2 text-success">
                    {Math.round(budgetPercentage)}%
                  </p>
                  <Progress value={budgetProgressValue} className="mt-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    ₹{totalSpending.toLocaleString()} of ₹{totalBudget.toLocaleString()} budget
                  </p>
                </>
              )
            ) : (
              <>
                <p className="font-serif text-3xl font-bold mt-2">—</p>
                <Progress value={0} className="mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  Set budgets in categories to track progress
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className={cn("h-4 w-4 text-accent", loadingInsight && "animate-pulse")} />
              <p className="text-muted-foreground text-sm">AI Insight</p>
            </div>
            <p className="text-sm leading-relaxed">{aiInsight}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart */}
        <Card className="animate-fade-up" style={{ animationDelay: "250ms" }}>
          <CardHeader>
            <CardTitle className="font-serif">Spending by Category (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {categoryData.slice(0, 6).map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs font-medium ml-auto">
                        {((cat.value / totalSpending) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
                <p>No spending data available</p>
                <p className="text-sm">Upload a statement to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="font-serif">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <RechartsTooltip content={<LineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
                <p>No trend data available</p>
                <p className="text-sm">Need more transactions to show trends</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="animate-fade-up" style={{ animationDelay: "350ms" }}>
          <CardHeader>
            <CardTitle className="font-serif">Category Breakdown (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="space-y-4">
                {categoryData.map((cat) => {
                  const Icon = CATEGORY_META[cat.name]?.icon || MoreHorizontal;
                  const isOverBudget = cat.budget > 0 && cat.value > cat.budget;
                  const budgetUsed = cat.budget > 0 ? (cat.value / cat.budget) * 100 : 0;
                  const overAmount = cat.value - cat.budget;
                  const spendingPercent = totalSpending > 0 ? (cat.value / totalSpending) * 100 : 0;

                  return (
                    <div key={cat.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${cat.color}20` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: cat.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cat.count} transactions • {spendingPercent.toFixed(0)}% of total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{cat.value.toLocaleString()}</p>
                          {cat.budget > 0 && (
                            <p
                              className={cn(
                                "text-xs",
                                isOverBudget ? "text-destructive" : "text-success"
                              )}
                            >
                              {isOverBudget
                                ? `₹${cat.budget.toLocaleString()} → ₹${cat.value.toLocaleString()}`
                                : `₹${(cat.budget - cat.value).toLocaleString()} left of ₹${cat.budget.toLocaleString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {cat.budget > 0 && (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(budgetUsed, 100)}
                            className={cn("h-1.5 flex-1", isOverBudget && "bg-destructive/20")}
                          />
                          <span className={cn(
                            "text-xs font-medium w-12 text-right",
                            isOverBudget ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {budgetUsed > 100 ? "100%+" : `${budgetUsed.toFixed(0)}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No categories to display
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="animate-fade-up" style={{ animationDelay: "400ms" }}>
          <CardHeader>
            <CardTitle className="font-serif">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((tx) => {
                  const meta = CATEGORY_META[tx.category] || CATEGORY_META["Other"];
                  const Icon = meta.icon || MoreHorizontal;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg shrink-0"
                          style={{ backgroundColor: `${meta.color}20` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: meta.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {tx.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(tx.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm shrink-0">
                          ₹{Math.abs(tx.amount).toLocaleString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          disabled={deleting === tx.id}
                        >
                          {deleting === tx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Upload a statement or add entries manually</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Spending;
