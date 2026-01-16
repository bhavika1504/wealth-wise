"""
Real Market Data Router
Fetches live prices from Yahoo Finance & AMFI NAV

APIs Used:
1. Yahoo Finance (via yfinance) - Stocks, Indices, ETFs
2. AMFI India NAV - Official Mutual Fund NAVs (free, no API key)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
from functools import lru_cache
import time

router = APIRouter()

# Try to import yfinance
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    print("⚠️ yfinance not installed. Run: pip install yfinance")

# Try to import requests/httpx for AMFI
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("⚠️ httpx not installed. Run: pip install httpx")


# ============== MODELS ==============

class MarketIndex(BaseModel):
    name: str
    symbol: str
    value: float
    change: float
    change_percent: float
    last_updated: str


class StockPrice(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    volume: Optional[int] = None
    last_updated: str


class MutualFundNAV(BaseModel):
    scheme_code: str
    scheme_name: str
    nav: float
    nav_date: str
    category: Optional[str] = None
    fund_house: Optional[str] = None


class PortfolioItem(BaseModel):
    name: str
    type: str  # "stock", "mutual_fund", "index", "etf"
    symbol: Optional[str] = None
    scheme_code: Optional[str] = None
    invested: float
    units: Optional[float] = None
    purchase_date: Optional[str] = None


class PortfolioValuation(BaseModel):
    name: str
    type: str
    invested: float
    current_value: float
    returns: float
    returns_percent: float
    current_price: float
    last_updated: str


# ============== CACHE ==============

# Simple in-memory cache
_cache: Dict[str, Any] = {}
_cache_timestamps: Dict[str, float] = {}

def get_cached(key: str, ttl_seconds: int = 60) -> Optional[Any]:
    """Get cached value if not expired"""
    if key in _cache and key in _cache_timestamps:
        if time.time() - _cache_timestamps[key] < ttl_seconds:
            return _cache[key]
    return None

def set_cache(key: str, value: Any):
    """Set cache value"""
    _cache[key] = value
    _cache_timestamps[key] = time.time()


# ============== INDIAN INDICES ==============

# Yahoo Finance symbols for Indian indices
INDIAN_INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "NIFTY Bank": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "NIFTY Midcap 100": "NIFTY_MID_SELECT.NS",
    "NIFTY Next 50": "^NSMIDCP",
}

# Popular Indian stocks
POPULAR_STOCKS = {
    "Reliance": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "HDFC Bank": "HDFCBANK.NS",
    "Infosys": "INFY.NS",
    "ICICI Bank": "ICICIBANK.NS",
    "Bharti Airtel": "BHARTIARTL.NS",
    "SBI": "SBIN.NS",
    "ITC": "ITC.NS",
    "Kotak Bank": "KOTAKBANK.NS",
    "HUL": "HINDUNILVR.NS",
    "Bajaj Finance": "BAJFINANCE.NS",
    "Asian Paints": "ASIANPAINT.NS",
    "Maruti": "MARUTI.NS",
    "Titan": "TITAN.NS",
    "Wipro": "WIPRO.NS",
    "Tech Mahindra": "TECHM.NS",
    "HDFC Life": "HDFCLIFE.NS",
    "Tata Steel": "TATASTEEL.NS",
    "Tata Motors": "TATAMOTORS.NS",
    "Adani Ports": "ADANIPORTS.NS",
}


# ============== AMFI MUTUAL FUND DATA ==============

# AMFI NAV URL (with proper redirect handling)
AMFI_NAV_URL = "https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?frmdt=01-Jan-2026"
AMFI_NAV_ALL_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

# Popular mutual fund scheme codes (AMFI codes)
POPULAR_MF_SCHEMES = {
    # Large Cap
    "HDFC Top 100 Fund - Direct Growth": "118989",
    "ICICI Pru Bluechip Fund - Direct Growth": "120586",
    "SBI Bluechip Fund - Direct Growth": "119598",
    "Axis Bluechip Fund - Direct Growth": "120503",
    "Mirae Asset Large Cap Fund - Direct Growth": "118834",
    
    # Flexi Cap
    "Parag Parikh Flexi Cap Fund - Direct Growth": "122639",
    "HDFC Flexi Cap Fund - Direct Growth": "118955",
    "Kotak Flexi Cap Fund - Direct Growth": "120166",
    "UTI Flexi Cap Fund - Direct Growth": "120716",
    
    # Mid Cap
    "Kotak Emerging Equity Fund - Direct Growth": "120175",
    "HDFC Mid Cap Opportunities - Direct Growth": "118953",
    "Axis Midcap Fund - Direct Growth": "120505",
    
    # Small Cap
    "Nippon Small Cap Fund - Direct Growth": "118778",
    "SBI Small Cap Fund - Direct Growth": "125497",
    "Axis Small Cap Fund - Direct Growth": "125354",
    
    # Index Funds
    "UTI Nifty 50 Index Fund - Direct Growth": "120716",
    "HDFC Index Nifty 50 - Direct Growth": "118989",
    "Nippon India Nifty 50 BeES": "112271",
    
    # ELSS
    "Axis Long Term Equity Fund - Direct Growth": "120507",
    "Mirae Asset Tax Saver - Direct Growth": "125307",
    "Quant Tax Plan - Direct Growth": "120823",
    
    # Debt
    "HDFC Short Term Debt - Direct Growth": "118949",
    "ICICI Pru Liquid Fund - Direct Growth": "120584",
}

# Cache for AMFI data (refresh every 30 minutes)
_amfi_cache: Dict[str, MutualFundNAV] = {}
_amfi_last_fetch: float = 0


async def fetch_amfi_nav_data() -> Dict[str, MutualFundNAV]:
    """Fetch all NAV data from AMFI"""
    global _amfi_cache, _amfi_last_fetch
    
    # Return cached if fresh (30 min TTL)
    if _amfi_cache and (time.time() - _amfi_last_fetch) < 1800:
        return _amfi_cache
    
    if not HTTPX_AVAILABLE:
        return {}
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(AMFI_NAV_ALL_URL)
            response.raise_for_status()
            
            data = response.text
            lines = data.strip().split('\n')
            
            current_fund_house = ""
            current_category = ""
            nav_dict = {}
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Fund house header (no semicolons)
                if ';' not in line and line:
                    current_fund_house = line
                    continue
                
                parts = line.split(';')
                
                # Category line (starts with scheme category)
                if len(parts) == 1:
                    current_category = parts[0]
                    continue
                
                # NAV line: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvest;Scheme Name;NAV;Date
                if len(parts) >= 6:
                    try:
                        scheme_code = parts[0].strip()
                        scheme_name = parts[3].strip()
                        nav_str = parts[4].strip()
                        nav_date = parts[5].strip()
                        
                        if nav_str and nav_str != 'N.A.':
                            nav = float(nav_str)
                            nav_dict[scheme_code] = MutualFundNAV(
                                scheme_code=scheme_code,
                                scheme_name=scheme_name,
                                nav=nav,
                                nav_date=nav_date,
                                category=current_category,
                                fund_house=current_fund_house
                            )
                    except (ValueError, IndexError):
                        continue
            
            _amfi_cache = nav_dict
            _amfi_last_fetch = time.time()
            print(f"✅ Fetched {len(nav_dict)} mutual fund NAVs from AMFI")
            return nav_dict
            
    except Exception as e:
        print(f"❌ Error fetching AMFI data: {e}")
        return _amfi_cache  # Return stale cache on error


# ============== ENDPOINTS ==============

@router.get("/indices", response_model=List[MarketIndex])
async def get_market_indices():
    """Get live Indian market indices"""
    
    # Check cache first
    cached = get_cached("indices", ttl_seconds=60)
    if cached:
        return cached
    
    if not YFINANCE_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="yfinance not installed. Run: pip install yfinance"
        )
    
    indices = []
    
    for name, symbol in INDIAN_INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            
            current = info.last_price
            previous = info.previous_close
            change = current - previous
            change_percent = (change / previous) * 100 if previous else 0
            
            indices.append(MarketIndex(
                name=name,
                symbol=symbol,
                value=round(current, 2),
                change=round(change, 2),
                change_percent=round(change_percent, 2),
                last_updated=datetime.now().isoformat()
            ))
        except Exception as e:
            print(f"Error fetching {name}: {e}")
            # Return default on error
            indices.append(MarketIndex(
                name=name,
                symbol=symbol,
                value=0,
                change=0,
                change_percent=0,
                last_updated=datetime.now().isoformat()
            ))
    
    set_cache("indices", indices)
    return indices


@router.get("/stock/{symbol}", response_model=StockPrice)
async def get_stock_price(symbol: str):
    """Get live stock price by NSE symbol"""
    
    if not YFINANCE_AVAILABLE:
        raise HTTPException(status_code=503, detail="yfinance not installed")
    
    # Add .NS suffix if not present
    if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        symbol = f"{symbol}.NS"
    
    cache_key = f"stock_{symbol}"
    cached = get_cached(cache_key, ttl_seconds=60)
    if cached:
        return cached
    
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        
        current = info.last_price
        previous = info.previous_close
        change = current - previous
        change_percent = (change / previous) * 100 if previous else 0
        
        result = StockPrice(
            symbol=symbol,
            name=symbol.replace('.NS', '').replace('.BO', ''),
            price=round(current, 2),
            change=round(change, 2),
            change_percent=round(change_percent, 2),
            day_high=round(info.day_high, 2) if info.day_high else None,
            day_low=round(info.day_low, 2) if info.day_low else None,
            volume=info.last_volume,
            last_updated=datetime.now().isoformat()
        )
        
        set_cache(cache_key, result)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stock not found: {e}")


@router.get("/stocks/popular", response_model=List[StockPrice])
async def get_popular_stocks():
    """Get prices of popular Indian stocks"""
    
    cached = get_cached("popular_stocks", ttl_seconds=60)
    if cached:
        return cached
    
    if not YFINANCE_AVAILABLE:
        raise HTTPException(status_code=503, detail="yfinance not installed")
    
    stocks = []
    symbols = list(POPULAR_STOCKS.values())
    
    try:
        # Batch fetch for efficiency
        tickers = yf.Tickers(' '.join(symbols))
        
        for name, symbol in POPULAR_STOCKS.items():
            try:
                info = tickers.tickers[symbol].fast_info
                current = info.last_price
                previous = info.previous_close
                change = current - previous
                change_percent = (change / previous) * 100 if previous else 0
                
                stocks.append(StockPrice(
                    symbol=symbol,
                    name=name,
                    price=round(current, 2),
                    change=round(change, 2),
                    change_percent=round(change_percent, 2),
                    day_high=round(info.day_high, 2) if info.day_high else None,
                    day_low=round(info.day_low, 2) if info.day_low else None,
                    last_updated=datetime.now().isoformat()
                ))
            except Exception as e:
                print(f"Error fetching {name}: {e}")
    except Exception as e:
        print(f"Batch fetch error: {e}")
    
    set_cache("popular_stocks", stocks)
    return stocks


@router.get("/mutual-fund/{scheme_code}", response_model=MutualFundNAV)
async def get_mutual_fund_nav(scheme_code: str):
    """Get NAV for a specific mutual fund by AMFI scheme code"""
    
    nav_data = await fetch_amfi_nav_data()
    
    if scheme_code in nav_data:
        return nav_data[scheme_code]
    
    raise HTTPException(status_code=404, detail=f"Scheme code {scheme_code} not found")


@router.get("/mutual-funds/search", response_model=List[MutualFundNAV])
async def search_mutual_funds(
    query: str = Query(..., min_length=3, description="Search term"),
    limit: int = Query(20, ge=1, le=100)
):
    """Search mutual funds by name"""
    
    nav_data = await fetch_amfi_nav_data()
    
    query_lower = query.lower()
    results = []
    
    for scheme_code, fund in nav_data.items():
        if query_lower in fund.scheme_name.lower():
            results.append(fund)
            if len(results) >= limit:
                break
    
    return results


@router.get("/mutual-funds/popular", response_model=List[MutualFundNAV])
async def get_popular_mutual_funds():
    """Get NAVs of popular mutual funds"""
    
    cached = get_cached("popular_mf", ttl_seconds=300)  # 5 min cache
    if cached:
        return cached
    
    nav_data = await fetch_amfi_nav_data()
    
    results = []
    for name, scheme_code in POPULAR_MF_SCHEMES.items():
        if scheme_code in nav_data:
            results.append(nav_data[scheme_code])
    
    set_cache("popular_mf", results)
    return results


@router.post("/portfolio/valuate", response_model=List[PortfolioValuation])
async def valuate_portfolio(portfolio: List[PortfolioItem]):
    """Calculate current value of portfolio items"""
    
    if not YFINANCE_AVAILABLE:
        raise HTTPException(status_code=503, detail="yfinance not installed")
    
    nav_data = await fetch_amfi_nav_data()
    valuations = []
    
    for item in portfolio:
        try:
            current_price = 0.0
            current_value = 0.0
            
            if item.type == "mutual_fund" and item.scheme_code:
                # Get from AMFI
                if item.scheme_code in nav_data:
                    current_price = nav_data[item.scheme_code].nav
                    if item.units:
                        current_value = current_price * item.units
                    else:
                        # Estimate units from invested amount (rough approximation)
                        current_value = item.invested * 1.1  # Assume 10% return
                        
            elif item.type in ["stock", "etf"] and item.symbol:
                # Get from Yahoo Finance
                symbol = item.symbol
                if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
                    symbol = f"{symbol}.NS"
                
                ticker = yf.Ticker(symbol)
                current_price = ticker.fast_info.last_price
                
                if item.units:
                    current_value = current_price * item.units
                else:
                    current_value = item.invested * 1.1  # Estimate
                    
            elif item.type == "index":
                # For index funds, use simulated return
                current_value = item.invested * 1.12  # Assume 12% return
                current_price = current_value
                
            else:
                # Default: assume moderate return
                current_value = item.invested * 1.08
                current_price = current_value
            
            returns = current_value - item.invested
            returns_percent = (returns / item.invested) * 100 if item.invested > 0 else 0
            
            valuations.append(PortfolioValuation(
                name=item.name,
                type=item.type,
                invested=item.invested,
                current_value=round(current_value, 2),
                returns=round(returns, 2),
                returns_percent=round(returns_percent, 2),
                current_price=round(current_price, 2),
                last_updated=datetime.now().isoformat()
            ))
            
        except Exception as e:
            print(f"Error valuating {item.name}: {e}")
            # Return with no change on error
            valuations.append(PortfolioValuation(
                name=item.name,
                type=item.type,
                invested=item.invested,
                current_value=item.invested,
                returns=0,
                returns_percent=0,
                current_price=0,
                last_updated=datetime.now().isoformat()
            ))
    
    return valuations


@router.get("/market-status")
async def get_market_status():
    """Get current market status (open/closed)"""
    now = datetime.now()
    day = now.weekday()  # 0=Monday, 6=Sunday
    hour = now.hour
    minute = now.minute
    current_time = hour * 60 + minute
    
    # NSE market hours: 9:15 AM to 3:30 PM IST, Monday to Friday
    market_open = 9 * 60 + 15  # 9:15 AM
    market_close = 15 * 60 + 30  # 3:30 PM
    
    if day >= 5:  # Saturday or Sunday
        return {
            "is_open": False,
            "message": "Market closed (Weekend)",
            "next_open": "Monday 9:15 AM IST"
        }
    
    if current_time < market_open:
        return {
            "is_open": False,
            "message": f"Market opens at 9:15 AM IST",
            "minutes_to_open": market_open - current_time
        }
    
    if current_time > market_close:
        return {
            "is_open": False,
            "message": "Market closed for today",
            "next_open": "Tomorrow 9:15 AM IST" if day < 4 else "Monday 9:15 AM IST"
        }
    
    return {
        "is_open": True,
        "message": "Market is open",
        "minutes_to_close": market_close - current_time
    }


@router.get("/health")
async def health_check():
    """Check market data service health"""
    return {
        "yfinance_available": YFINANCE_AVAILABLE,
        "httpx_available": HTTPX_AVAILABLE,
        "amfi_cache_size": len(_amfi_cache),
        "amfi_last_fetch": datetime.fromtimestamp(_amfi_last_fetch).isoformat() if _amfi_last_fetch else None,
        "status": "ready" if YFINANCE_AVAILABLE and HTTPX_AVAILABLE else "degraded"
    }
