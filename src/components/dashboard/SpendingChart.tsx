import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { Loader2, PieChart as PieChartIcon } from "lucide-react";
import { auth } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { getUserTransactions } from "@/services/transactionService";
import { getCategoryColor } from "@/utils/categorize";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "hsl(25, 50%, 35%)",
  "Rent": "hsl(38, 90%, 50%)",
  "Transportation": "hsl(35, 60%, 45%)",
  "Shopping": "hsl(30, 40%, 55%)",
  "Utilities": "hsl(20, 35%, 40%)",
  "Entertainment": "hsl(45, 70%, 55%)",
  "Healthcare": "hsl(340, 60%, 50%)",
  "Education": "hsl(200, 60%, 45%)",
  "Investment": "hsl(142, 70%, 40%)",
  "Transfer": "hsl(210, 50%, 50%)",
  "Other": "hsl(0, 0%, 50%)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-warm">
        <p className="font-medium text-foreground">{payload[0].name}</p>
        <p className="text-primary font-semibold">₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export function SpendingChart() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CategoryData[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const transactions = await getUserTransactions(user.uid);
        
        // Get current month transactions
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const categoryMap: Record<string, number> = {};
        
        transactions.forEach((tx: any) => {
          // Skip income entries (positive amounts or Income category)
          if (tx.amount > 0 || tx.category === "Income") return;
          
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
          
          // Only include this month's transactions
          if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
            const category = tx.category || "Other";
            const amount = Math.abs(Number(tx.amount || 0));
            categoryMap[category] = (categoryMap[category] || 0) + amount;
          }
        });

        const chartData: CategoryData[] = Object.entries(categoryMap)
          .map(([name, value]) => ({
            name,
            value,
            color: CATEGORY_COLORS[name] || getCategoryColor(name),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6); // Top 6 categories

        setData(chartData);
      } catch (error) {
        console.error("Failed to load spending data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-xl font-semibold text-foreground">
            Spending Breakdown
          </h3>
          <span className="text-muted-foreground text-sm">This Month</span>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-xl font-semibold text-foreground">
          Spending Breakdown
        </h3>
        <span className="text-muted-foreground text-sm">This Month</span>
      </div>

      {data.length > 0 ? (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-center">
            <p className="text-muted-foreground text-sm">Total Spending</p>
            <p className="font-serif text-2xl font-semibold text-foreground">
              ₹{total.toLocaleString()}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {data.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
          <PieChartIcon className="h-12 w-12 mb-3 opacity-30" />
          <p>No spending data this month</p>
          <p className="text-sm">Upload a statement to see your breakdown</p>
        </div>
      )}
    </div>
  );
}
