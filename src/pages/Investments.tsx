import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Shield, BarChart3,
  Wallet, RefreshCw, AlertTriangle, CheckCircle2, Plus,
  Activity, Clock, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInvestments, updateInvestment } from "@/services/investmentsService";
import { 
  getMarketIndices, 
  updateInvestmentsWithMarketData,
  getMarketStatus,
  formatIndianCurrency,
  checkMarketDataHealth,
  MarketStatus
} from "@/services/marketDataService";
import { AddInvestmentDialog } from "@/components/investments/AddInvestmentDialog";
import { toast } from "sonner";

// Mock history data for chart (since we only have current snapshot)
const mockHistory = [
  { month: "Jan", value: 250000 },
  { month: "Feb", value: 268000 },
  { month: "Mar", value: 255000 },
  { month: "Apr", value: 290000 },
  { month: "May", value: 310000 },
  { month: "Jun", value: 305000 },
  { month: "Jul", value: 340000 },
  { month: "Aug", value: 365000 },
];

const COLORS = [
  "hsl(25, 50%, 35%)",
  "hsl(38, 90%, 50%)",
  "hsl(35, 60%, 45%)",
  "hsl(45, 70%, 55%)",
  "hsl(142, 70%, 40%)",
  "hsl(200, 70%, 50%)"
];

interface Investment {
  id: string;
  name: string;
  type: string;
  invested: number;
  current: number;
  change: number;
  platform?: string;
  purchaseDate?: Date;
  autoImported?: boolean;
  symbol?: string;      // Stock symbol (e.g., RELIANCE.NS)
  schemeCode?: string;  // AMFI scheme code for mutual funds
}

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-warm">
        <p className="text-primary font-semibold">₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const Investments = () => {
  const [holdings, setHoldings] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("Analyzing your portfolio...");
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, message: "Loading..." });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculations
  const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
  const currentValue = holdings.reduce((sum, h) => sum + h.current, 0);
  const totalReturns = currentValue - totalInvested;
  const returnsPercent = totalInvested ? ((totalReturns / totalInvested) * 100).toFixed(1) : "0.0";

  // Calculate Asset Allocation
  const assetAllocation = holdings.reduce((acc: any[], curr) => {
    const existing = acc.find(a => a.name === curr.type);
    if (existing) {
      existing.value += curr.current;
    } else {
      acc.push({ name: curr.type, value: curr.current });
    }
    return acc;
  }, []).map((item, index) => ({
    ...item,
    // Calculate percentage based on total current value
    percent: currentValue ? Math.round((item.value / currentValue) * 100) : 0,
    color: COLORS[index % COLORS.length]
  }));

  // Load market indices
  const loadMarketData = useCallback(async () => {
    try {
      const [indices, status] = await Promise.all([
        getMarketIndices(),
        getMarketStatus()
      ]);
      setMarketIndices(indices);
      setMarketStatus(status);
    } catch (error) {
      console.error("Failed to load market data:", error);
    }
  }, []);

  // Load investments and update with market data
  const loadInvestments = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await getInvestments();
      const mapped: Investment[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        invested: d.invested || 0,
        current: d.current || d.invested || 0,
        change: d.change || 0,
        platform: d.platform,
        purchaseDate: d.purchaseDate?.toDate?.() || d.purchaseDate,
        autoImported: d.autoImported,
        symbol: d.symbol,           // Stock symbol for real-time prices
        schemeCode: d.schemeCode,   // AMFI code for MF NAV
      }));

      // Update with live market data from Yahoo Finance & AMFI
      if (mapped.length > 0) {
        const marketUpdates = await updateInvestmentsWithMarketData(
          mapped.map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            invested: m.invested,
            purchaseDate: m.purchaseDate,
            symbol: m.symbol,
            schemeCode: m.schemeCode,
          }))
        );

        // Merge market data into holdings
        const updatedHoldings = mapped.map(h => {
          const update = marketUpdates.find(u => u.id === h.id);
          if (update) {
            return {
              ...h,
              current: update.current,
              change: update.changePercent,
            };
          }
          return h;
        });

        setHoldings(updatedHoldings);

        // Update Firebase with new values (optional - for persistence)
        for (const update of marketUpdates) {
          try {
            await updateInvestment(update.id, {
              current: update.current,
              change: update.changePercent,
            });
          } catch (e) {
            // Silently fail - Firebase update is optional
          }
        }
      } else {
        setHoldings(mapped);
      }

      setLastUpdated(new Date());
      
      if (showRefreshToast) {
        toast.success("Portfolio updated with latest prices!");
      }
    } catch (error) {
      console.error("Failed to load investments", error);
      toast.error("Could not load investments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh prices
  const handleRefresh = () => {
    loadInvestments(true);
    loadMarketData();
  };

  useEffect(() => {
    loadInvestments();
    loadMarketData();
    
    // Auto-refresh market data every 30 seconds during market hours
    const interval = setInterval(() => {
      loadMarketData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadMarketData]);

  useEffect(() => {
    if (holdings.length > 0) {
      // Try AI-powered insight first, fallback to local
      import("@/services/aiService").then(async (service) => {
        const investmentData = holdings.map(h => ({
          name: h.name,
          type: h.type,
          invested: h.invested,
          current: h.current,
          change: h.change,
        }));
        
        try {
          const { insight, aiPowered } = await service.getAIInvestmentInsight(investmentData);
          setAiInsight(aiPowered ? `🤖 ${insight}` : insight);
        } catch {
          // Fallback to local
          const insight = service.generateInvestmentInsight(investmentData);
          setAiInsight(insight);
        }
      });
    } else if (!loading) {
      setAiInsight("Start tracking your investments to get portfolio analysis and recommendations!");
    }
  }, [holdings, loading]);

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Investment Analyzer
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={marketStatus.isOpen ? "default" : "secondary"} className="gap-1">
              <Activity className="h-3 w-3" />
              {marketStatus.message}
            </Badge>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Prices
          </Button>
          <AddInvestmentDialog onInvestmentAdded={() => loadInvestments()} />
        </div>
      </div>

      {/* Market Indices Ticker */}
      {marketIndices.length > 0 && (
        <div className="mb-6 overflow-hidden animate-fade-up">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {marketIndices.map((index) => (
              <div 
                key={index.name}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-muted/50 border"
              >
                <p className="text-xs text-muted-foreground">{index.name}</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{index.value.toLocaleString()}</span>
                  <span className={cn(
                    "text-xs flex items-center gap-0.5",
                    index.changePercent >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {index.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {index.changePercent >= 0 ? "+" : ""}{index.changePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <Wallet className="h-5 w-5 text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Total Invested</p>
          <p className="font-serif text-2xl font-bold text-foreground mt-1">
            ₹{totalInvested.toLocaleString()}
          </p>
        </div>

        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
          <TrendingUp className="h-5 w-5 text-success mb-3" />
          <p className="text-muted-foreground text-sm">Current Value</p>
          <p className="font-serif text-2xl font-bold text-foreground mt-1">
            ₹{currentValue.toLocaleString()}
          </p>
        </div>

        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <BarChart3 className="h-5 w-5 text-accent mb-3" />
          <p className="text-muted-foreground text-sm">Total Returns</p>
          <p className={cn(
            "font-serif text-2xl font-bold mt-1",
            totalReturns >= 0 ? "text-success" : "text-destructive"
          )}>
            {totalReturns >= 0 ? "+" : ""}
            ₹{Math.abs(totalReturns).toLocaleString()} ({returnsPercent}%)
          </p>
        </div>

        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
          <Shield className="h-5 w-5 text-warning mb-3" />
          <p className="text-muted-foreground text-sm">Risk Level</p>
          <p className="font-serif text-2xl font-bold text-warning mt-1">Moderate</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Portfolio Growth */}
        <div className="lg:col-span-2 card-warm p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <h3 className="font-serif text-xl font-semibold text-foreground mb-6">
            Portfolio Growth (Estimated)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHistory}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
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
        </div>

        {/* Asset Allocation */}
        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "350ms" }}>
          <h3 className="font-serif text-xl font-semibold text-foreground mb-6">
            Asset Allocation
          </h3>
          {assetAllocation.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {assetAllocation.map((asset) => (
                  <div key={asset.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: asset.color }}
                      />
                      <span className="text-sm text-muted-foreground">{asset.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{asset.percent}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No assets to display
            </div>
          )}
        </div>
      </div>

      {/* Holdings & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <div className="lg:col-span-2 card-warm p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
          <h3 className="font-serif text-xl font-semibold text-foreground mb-6">
            Holdings
          </h3>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : holdings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No investments found</p>
                <p className="text-sm mt-1">Add investments manually or upload a bank statement</p>
              </div>
            ) : (
              holdings.map((holding) => {
                const returns = holding.current - holding.invested;
                const returnsPercent = holding.invested > 0 
                  ? ((returns / holding.invested) * 100).toFixed(1) 
                  : "0.0";
                
                return (
                  <div
                    key={holding.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{holding.name}</p>
                        {holding.autoImported && (
                          <Badge variant="outline" className="text-xs shrink-0">Auto</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{holding.type}</Badge>
                        {holding.platform && (
                          <span className="text-xs text-muted-foreground">{holding.platform}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invested: ₹{holding.invested.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-foreground">
                        ₹{holding.current.toLocaleString()}
                      </p>
                      <p className={cn(
                        "text-sm font-medium flex items-center gap-1 justify-end",
                        returns >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {returns >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {returns >= 0 ? "+" : ""}₹{Math.abs(returns).toLocaleString()}
                        <span className="text-xs">({returnsPercent}%)</span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "450ms" }}>
          <h3 className="font-serif text-xl font-semibold text-foreground mb-6">
            AI Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Portfolio Analysis</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {aiInsight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Investments;
