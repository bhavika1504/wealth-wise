import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { predictFinancialData } from "@/services/mlService";
import { getUserTransactions } from "@/services/transactionService";
import { auth, db } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { TrendingUp, Loader2, Sparkles, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const MLPredictions = () => {
  const [predictionType, setPredictionType] = useState<"expense" | "income" | "savings">("expense");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [monthlyIncomeSetting, setMonthlyIncomeSetting] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDataLoading(false);
        return;
      }

      try {
        setDataLoading(true);
        
        // Fetch user's monthly income setting from Firebase
        let storedIncome = 0;
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().financialSettings?.monthlyIncome) {
            storedIncome = userSnap.data().financialSettings.monthlyIncome;
            setMonthlyIncomeSetting(storedIncome);
          }
        } catch (e) {
          console.error("Failed to fetch income setting:", e);
        }

        const transactions = await getUserTransactions(user.uid);
        
        // Process transactions by month - only track expenses
        const monthlyExpenses: Record<string, number> = {};
        
        transactions.forEach((tx: any) => {
          // Handle both createdAt (Firestore Timestamp) and date fields
          let date: Date;
          if (tx.createdAt?.seconds) {
            date = new Date(tx.createdAt.seconds * 1000);
          } else if (tx.createdAt) {
            date = new Date(tx.createdAt);
          } else if (tx.date?.seconds) {
            date = new Date(tx.date.seconds * 1000);
          } else if (tx.date) {
            date = new Date(tx.date);
          } else {
            return; // Skip if no valid date
          }
          
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const amount = Number(tx.amount || 0);
          
          // Only track expenses (negative amounts)
          if (amount < 0 && tx.category !== "Income") {
            monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + Math.abs(amount);
          }
        });

        // Calculate the requested data type
        let monthlyData: Record<string, number> = {};
        
        if (predictionType === "expense") {
          // Expenses from transactions
          monthlyData = monthlyExpenses;
        } else if (predictionType === "income") {
          // Income is the stored monthly income (same for all months)
          // Create entries for months that have expense data
          Object.keys(monthlyExpenses).forEach(month => {
            monthlyData[month] = storedIncome;
          });
        } else if (predictionType === "savings") {
          // Savings = Stored Monthly Income - Expenses for each month
          Object.keys(monthlyExpenses).forEach(month => {
            const expense = monthlyExpenses[month] || 0;
            monthlyData[month] = storedIncome - expense; // Can be negative if overspent
          });
        }

        // Convert to array format for API
        const dataArray = Object.entries(monthlyData)
          .sort()
          .slice(-6) // Last 6 months
          .map(([key, amount]) => {
            const [year, month] = key.split('-');
            return {
              amount,
              month: parseInt(month),
              year: parseInt(year),
            };
          });

        setHistoricalData(dataArray);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setDataLoading(false);
      }
    });

    return () => unsubscribe();
  }, [predictionType]);

  const handlePredict = async () => {
    if (historicalData.length < 2) {
      toast.error("Need at least 2 months of data to make predictions");
      return;
    }

    try {
      setLoading(true);
      const response = await predictFinancialData({
        data: historicalData,
        prediction_type: predictionType,
      });
      setResult(response);
      toast.success("Prediction generated successfully!");
    } catch (error) {
      console.error("Failed to predict:", error);
      toast.error("Failed to generate prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = historicalData.map((item, index) => ({
    month: `Month ${index + 1}`,
    value: item.amount,
  }));

  if (result) {
    chartData.push({
      month: "Next Period",
      value: result.predictions[0],
    });
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold">ML Financial Predictions</h1>
          <p className="text-muted-foreground mt-2">
            Use machine learning to predict your future expenses, income, or savings
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Settings</CardTitle>
              <CardDescription>
                Select prediction type and generate forecast
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="predictionType">Prediction Type</Label>
                <Select
                  value={predictionType}
                  onValueChange={(value: "expense" | "income" | "savings") =>
                    setPredictionType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expenses</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Monthly Income Info */}
              <div className={`p-4 rounded-lg border ${monthlyIncomeSetting > 0 ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4" />
                  <p className="text-sm font-medium">Monthly Income Setting</p>
                </div>
                {monthlyIncomeSetting > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ₹{monthlyIncomeSetting.toLocaleString()} / month
                  </p>
                ) : (
                  <p className="text-sm text-warning">
                    Not set! Go to Spending page → Set Income
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-2">Historical Data</p>
                <p className="text-sm text-muted-foreground">
                  {dataLoading 
                    ? "Loading..."
                    : historicalData.length > 0
                      ? `${historicalData.length} months of expense data available`
                      : "No data available. Please upload transactions."}
                </p>
              </div>

              {/* Warning for income/savings prediction without income setting */}
              {(predictionType === "income" || predictionType === "savings") && monthlyIncomeSetting === 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">
                    ⚠️ Please set your monthly income in Spending page first to predict {predictionType}.
                  </p>
                </div>
              )}

              <Button
                onClick={handlePredict}
                disabled={
                  loading || 
                  historicalData.length < 2 || 
                  ((predictionType === "income" || predictionType === "savings") && monthlyIncomeSetting === 0)
                }
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Prediction...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Prediction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Results</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  <div className={`p-4 rounded-lg border ${
                    predictionType === "savings" && result.predictions[0] < 0 
                      ? "bg-destructive/10 border-destructive/20" 
                      : "bg-success/10 border-success/20"
                  }`}>
                    <p className="text-sm font-medium mb-1">Predicted {predictionType}</p>
                    <p className={`text-3xl font-bold ${
                      predictionType === "savings" && result.predictions[0] < 0 
                        ? "text-destructive" 
                        : "text-success"
                    }`}>
                      {result.predictions[0] < 0 ? "-" : ""}₹{Math.abs(result.predictions[0])?.toLocaleString() || "N/A"}
                    </p>
                    {predictionType === "savings" && result.predictions[0] < 0 && (
                      <p className="text-xs text-destructive mt-1">⚠️ Projected to overspend</p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-card border">
                    <p className="text-sm font-medium mb-3">Trend Analysis</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Direction</span>
                        <span className="text-sm font-semibold capitalize">
                          {result.trends.direction}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Average Change</span>
                        <span className="text-sm font-semibold">
                          ₹{result.trends.average_change.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Value</span>
                        <span className="text-sm font-semibold">
                          ₹{result.trends.current_value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {result.insights && result.insights.length > 0 && (
                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm font-medium mb-2">Insights</p>
                      <ul className="space-y-1">
                        {result.insights.map((insight: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            • {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {chartData.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v) => `₹${v / 1000}k`} />
                          <Tooltip
                            formatter={(value: number) => `₹${value.toLocaleString()}`}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Historical"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {historicalData.length < 2
                    ? "Need at least 2 months of data to generate predictions"
                    : "Click 'Generate Prediction' to see results"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MLPredictions;
