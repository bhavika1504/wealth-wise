import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Shield, BarChart3, Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { getInvestments } from "@/services/investmentsService";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Investment {
  id: string;
  name: string;
  type: string;
  invested: number;
  current: number;
  change: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-warm">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-primary font-semibold">₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export function InvestmentSummary() {
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);

  useEffect(() => {
    const loadInvestments = async () => {
      try {
        const data = await getInvestments();
        const mapped: Investment[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          invested: d.invested || 0,
          current: d.current || 0,
          change: d.change || 0,
        }));
        setInvestments(mapped);

        // Generate mock growth data based on current value
        if (mapped.length > 0) {
          const currentValue = mapped.reduce((sum, i) => sum + i.current, 0);
          const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
          const growthData = months.map((month, index) => ({
            month,
            value: Math.round(currentValue * (0.85 + (index * 0.02) + Math.random() * 0.03)),
          }));
          growthData[growthData.length - 1].value = currentValue; // Last month = current
          setPortfolioData(growthData);
        }
      } catch (error) {
        console.error("Failed to load investments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvestments();
  }, []);

  const totalInvested = investments.reduce((sum, i) => sum + i.invested, 0);
  const currentValue = investments.reduce((sum, i) => sum + i.current, 0);
  const returns = currentValue - totalInvested;
  const returnsPercent = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(1) : "0.0";
  const assetTypes = [...new Set(investments.map(i => i.type))].length;

  const getDiversityLabel = () => {
    if (assetTypes >= 4) return "Excellent";
    if (assetTypes >= 3) return "Good";
    if (assetTypes >= 2) return "Fair";
    return "Low";
  };

  const getRiskLevel = () => {
    // Simple risk assessment based on returns volatility
    const avgChange = investments.length > 0 
      ? investments.reduce((sum, i) => sum + Math.abs(i.change), 0) / investments.length 
      : 0;
    if (avgChange > 15) return "High";
    if (avgChange > 5) return "Moderate";
    return "Low";
  };

  if (loading) {
    return (
      <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-xl font-semibold text-foreground">
            Investment Portfolio
          </h3>
          <Link to="/investments" className="text-primary text-sm font-medium hover:underline">
            Details
          </Link>
        </div>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "500ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-xl font-semibold text-foreground">
          Investment Portfolio
        </h3>
        <Link to="/investments" className="text-primary text-sm font-medium hover:underline">
          Details
        </Link>
      </div>

      {investments.length > 0 ? (
        <>
          {/* Portfolio Chart */}
          <div className="h-40 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#portfolioGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp className={cn(
                "h-5 w-5 mx-auto mb-2",
                returns >= 0 ? "text-success" : "text-destructive"
              )} />
              <p className="text-xs text-muted-foreground">Returns</p>
              <p className={cn(
                "font-semibold",
                returns >= 0 ? "text-success" : "text-destructive"
              )}>
                {returns >= 0 ? "+" : ""}{returnsPercent}%
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <p className="font-semibold text-foreground">{getRiskLevel()}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <BarChart3 className="h-5 w-5 mx-auto text-accent mb-2" />
              <p className="text-xs text-muted-foreground">Diversity</p>
              <p className="font-semibold text-foreground">{getDiversityLabel()}</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Portfolio Value</span>
              <span className="font-serif text-xl font-semibold text-foreground">
                ₹{currentValue.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Wallet className="h-12 w-12 mb-3 opacity-30" />
          <p>No investments tracked</p>
          <Link to="/investments" className="text-primary text-sm mt-2 hover:underline">
            Add your first investment
          </Link>
        </div>
      )}
    </div>
  );
}
