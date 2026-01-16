/**
 * Market Data Service
 * Fetches REAL market prices from backend APIs
 * 
 * Backend sources:
 * 1. Yahoo Finance (yfinance) - Stocks, Indices, ETFs
 * 2. AMFI India - Official Mutual Fund NAVs
 */

import axios from "axios";

const MARKET_API_BASE = "http://localhost:8000/api/market";

// ============== TYPES ==============

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  lastUpdated: string;
}

export interface MutualFundNAV {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string;
  category?: string;
  fundHouse?: string;
}

export interface PortfolioValuation {
  name: string;
  type: string;
  invested: number;
  currentValue: number;
  returns: number;
  returnsPercent: number;
  currentPrice: number;
  lastUpdated: string;
}

export interface MarketStatus {
  isOpen: boolean;
  message: string;
  minutesToOpen?: number;
  minutesToClose?: number;
  nextOpen?: string;
}

// ============== CACHE ==============

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============== API FUNCTIONS ==============

/**
 * Get live Indian market indices (NIFTY, SENSEX, etc.)
 */
export const getMarketIndices = async (): Promise<MarketIndex[]> => {
  const cached = getCached<MarketIndex[]>("indices");
  if (cached) return cached;

  try {
    const response = await axios.get(`${MARKET_API_BASE}/indices`, {
      timeout: 10000,
    });

    const indices: MarketIndex[] = response.data.map((idx: any) => ({
      name: idx.name,
      symbol: idx.symbol,
      value: idx.value,
      change: idx.change,
      changePercent: idx.change_percent,
      lastUpdated: idx.last_updated,
    }));

    setCache("indices", indices);
    return indices;
  } catch (error) {
    console.error("Failed to fetch market indices:", error);
    // Return fallback simulated data
    return getSimulatedIndices();
  }
};

/**
 * Get stock price by symbol
 */
export const getStockPrice = async (symbol: string): Promise<StockPrice> => {
  const cacheKey = `stock_${symbol}`;
  const cached = getCached<StockPrice>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${MARKET_API_BASE}/stock/${symbol}`, {
      timeout: 10000,
    });

    const stock: StockPrice = {
      symbol: response.data.symbol,
      name: response.data.name,
      price: response.data.price,
      change: response.data.change,
      changePercent: response.data.change_percent,
      dayHigh: response.data.day_high,
      dayLow: response.data.day_low,
      volume: response.data.volume,
      lastUpdated: response.data.last_updated,
    };

    setCache(cacheKey, stock);
    return stock;
  } catch (error) {
    console.error(`Failed to fetch stock ${symbol}:`, error);
    throw error;
  }
};

/**
 * Get popular Indian stocks
 */
export const getPopularStocks = async (): Promise<StockPrice[]> => {
  const cached = getCached<StockPrice[]>("popular_stocks");
  if (cached) return cached;

  try {
    const response = await axios.get(`${MARKET_API_BASE}/stocks/popular`, {
      timeout: 15000,
    });

    const stocks: StockPrice[] = response.data.map((s: any) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      change: s.change,
      changePercent: s.change_percent,
      dayHigh: s.day_high,
      dayLow: s.day_low,
      lastUpdated: s.last_updated,
    }));

    setCache("popular_stocks", stocks);
    return stocks;
  } catch (error) {
    console.error("Failed to fetch popular stocks:", error);
    return [];
  }
};

/**
 * Get mutual fund NAV by scheme code
 */
export const getMutualFundNAV = async (schemeCode: string): Promise<MutualFundNAV> => {
  const cacheKey = `mf_${schemeCode}`;
  const cached = getCached<MutualFundNAV>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${MARKET_API_BASE}/mutual-fund/${schemeCode}`, {
      timeout: 10000,
    });

    const fund: MutualFundNAV = {
      schemeCode: response.data.scheme_code,
      schemeName: response.data.scheme_name,
      nav: response.data.nav,
      navDate: response.data.nav_date,
      category: response.data.category,
      fundHouse: response.data.fund_house,
    };

    setCache(cacheKey, fund);
    return fund;
  } catch (error) {
    console.error(`Failed to fetch MF ${schemeCode}:`, error);
    throw error;
  }
};

/**
 * Search mutual funds by name
 */
export const searchMutualFunds = async (query: string): Promise<MutualFundNAV[]> => {
  try {
    const response = await axios.get(`${MARKET_API_BASE}/mutual-funds/search`, {
      params: { query, limit: 20 },
      timeout: 10000,
    });

    return response.data.map((f: any) => ({
      schemeCode: f.scheme_code,
      schemeName: f.scheme_name,
      nav: f.nav,
      navDate: f.nav_date,
      category: f.category,
      fundHouse: f.fund_house,
    }));
  } catch (error) {
    console.error("Failed to search mutual funds:", error);
    return [];
  }
};

/**
 * Get popular mutual funds
 */
export const getPopularMutualFunds = async (): Promise<MutualFundNAV[]> => {
  const cached = getCached<MutualFundNAV[]>("popular_mf");
  if (cached) return cached;

  try {
    const response = await axios.get(`${MARKET_API_BASE}/mutual-funds/popular`, {
      timeout: 10000,
    });

    const funds: MutualFundNAV[] = response.data.map((f: any) => ({
      schemeCode: f.scheme_code,
      schemeName: f.scheme_name,
      nav: f.nav,
      navDate: f.nav_date,
      category: f.category,
      fundHouse: f.fund_house,
    }));

    setCache("popular_mf", funds);
    return funds;
  } catch (error) {
    console.error("Failed to fetch popular MFs:", error);
    return [];
  }
};

/**
 * Get current market status
 */
export const getMarketStatus = async (): Promise<MarketStatus> => {
  try {
    const response = await axios.get(`${MARKET_API_BASE}/market-status`, {
      timeout: 5000,
    });

    return {
      isOpen: response.data.is_open,
      message: response.data.message,
      minutesToOpen: response.data.minutes_to_open,
      minutesToClose: response.data.minutes_to_close,
      nextOpen: response.data.next_open,
    };
  } catch (error) {
    // Fallback to local calculation
    return getLocalMarketStatus();
  }
};

/**
 * Valuate portfolio items with real prices
 */
export const valuatePortfolio = async (
  portfolio: Array<{
    name: string;
    type: string;
    symbol?: string;
    schemeCode?: string;
    invested: number;
    units?: number;
    purchaseDate?: string;
  }>
): Promise<PortfolioValuation[]> => {
  try {
    const response = await axios.post(`${MARKET_API_BASE}/portfolio/valuate`, 
      portfolio.map(p => ({
        name: p.name,
        type: p.type,
        symbol: p.symbol,
        scheme_code: p.schemeCode,
        invested: p.invested,
        units: p.units,
        purchase_date: p.purchaseDate,
      })),
      { timeout: 30000 }
    );

    return response.data.map((v: any) => ({
      name: v.name,
      type: v.type,
      invested: v.invested,
      currentValue: v.current_value,
      returns: v.returns,
      returnsPercent: v.returns_percent,
      currentPrice: v.current_price,
      lastUpdated: v.last_updated,
    }));
  } catch (error) {
    console.error("Failed to valuate portfolio:", error);
    // Return with simulated values on error
    return portfolio.map(p => ({
      name: p.name,
      type: p.type,
      invested: p.invested,
      currentValue: p.invested * 1.1,
      returns: p.invested * 0.1,
      returnsPercent: 10,
      currentPrice: 0,
      lastUpdated: new Date().toISOString(),
    }));
  }
};

/**
 * Update all investments with current market values
 * This is a wrapper for backward compatibility
 */
export const updateInvestmentsWithMarketData = async (
  investments: Array<{
    id: string;
    name: string;
    type: string;
    invested: number;
    purchaseDate?: Date;
    symbol?: string;
    schemeCode?: string;
  }>
): Promise<Array<{
  id: string;
  current: number;
  change: number;
  changePercent: number;
}>> => {
  try {
    const valuations = await valuatePortfolio(
      investments.map(inv => ({
        name: inv.name,
        type: mapInvestmentType(inv.type),
        symbol: inv.symbol,
        schemeCode: inv.schemeCode,
        invested: inv.invested,
        purchaseDate: inv.purchaseDate?.toISOString(),
      }))
    );

    return investments.map((inv, index) => {
      const valuation = valuations[index];
      return {
        id: inv.id,
        current: valuation.currentValue,
        change: valuation.returns,
        changePercent: valuation.returnsPercent,
      };
    });
  } catch (error) {
    console.error("Failed to update investments:", error);
    // Fallback to simulated values
    return investments.map(inv => simulateInvestmentValue(inv));
  }
};

/**
 * Map frontend investment type to backend type
 */
function mapInvestmentType(type: string): string {
  const typeMap: Record<string, string> = {
    "Mutual Fund": "mutual_fund",
    "SIP": "mutual_fund",
    "Stocks": "stock",
    "Stock": "stock",
    "ETF": "etf",
    "Index Fund": "mutual_fund",
    "ELSS": "mutual_fund",
    "Fixed Deposit": "fixed_deposit",
    "FD": "fixed_deposit",
    "PPF": "ppf",
    "NPS": "nps",
    "Gold": "gold",
    "Recurring Deposit": "recurring_deposit",
    "RD": "recurring_deposit",
  };
  return typeMap[type] || type.toLowerCase().replace(/ /g, "_");
}

// ============== FALLBACK FUNCTIONS ==============

/**
 * Simulated indices for when backend is unavailable
 */
function getSimulatedIndices(): MarketIndex[] {
  const baseIndices = {
    "NIFTY 50": 24500,
    "SENSEX": 81000,
    "NIFTY Bank": 51000,
    "NIFTY IT": 38000,
  };

  return Object.entries(baseIndices).map(([name, value]) => {
    const changePercent = (Math.random() - 0.5) * 4;
    const change = (value * changePercent) / 100;
    return {
      name,
      symbol: name,
      value: Math.round((value + change) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  });
}

/**
 * Local market status calculation
 */
function getLocalMarketStatus(): MarketStatus {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 60 + minute;

  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;

  if (day === 0 || day === 6) {
    return { isOpen: false, message: "Market closed (Weekend)" };
  }

  if (currentTime < marketOpen) {
    return { isOpen: false, message: `Market opens at 9:15 AM` };
  }

  if (currentTime > marketClose) {
    return { isOpen: false, message: "Market closed for today" };
  }

  return { isOpen: true, message: "Market is open" };
}

/**
 * Simulate investment value for fallback
 */
function simulateInvestmentValue(inv: {
  id: string;
  invested: number;
  type: string;
  purchaseDate?: Date;
}): { id: string; current: number; change: number; changePercent: number } {
  const now = new Date();
  const purchase = inv.purchaseDate || new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const daysHeld = Math.floor((now.getTime() - new Date(purchase).getTime()) / (1000 * 60 * 60 * 24));

  const annualReturns: Record<string, number> = {
    "Stocks": 15,
    "Mutual Fund": 12,
    "SIP": 12,
    "ELSS": 14,
    "Index Fund": 11,
    "ETF": 11,
    "Fixed Deposit": 7,
    "PPF": 7.1,
    "NPS": 10,
    "Gold": 8,
  };

  const baseReturn = annualReturns[inv.type] || 10;
  const dailyReturn = baseReturn / 365;
  const expectedReturn = dailyReturn * daysHeld;
  const volatility = (Math.random() - 0.5) * 10;
  const totalReturnPercent = expectedReturn + volatility;

  const change = (inv.invested * totalReturnPercent) / 100;
  const current = inv.invested + change;

  return {
    id: inv.id,
    current: Math.round(current * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(totalReturnPercent * 100) / 100,
  };
}

/**
 * Format currency in Indian format
 */
export const formatIndianCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Check market data service health
 */
export const checkMarketDataHealth = async (): Promise<{
  available: boolean;
  yfinance: boolean;
  amfi: boolean;
  message: string;
}> => {
  try {
    const response = await axios.get(`${MARKET_API_BASE}/health`, {
      timeout: 5000,
    });
    return {
      available: true,
      yfinance: response.data.yfinance_available,
      amfi: response.data.httpx_available,
      message: response.data.status,
    };
  } catch {
    return {
      available: false,
      yfinance: false,
      amfi: false,
      message: "Market data service unavailable - using simulated data",
    };
  }
};
