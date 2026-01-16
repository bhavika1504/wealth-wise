// Category keywords for automatic transaction categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Dining": [
    "swiggy", "zomato", "restaurant", "cafe", "coffee", "pizza", "burger",
    "food", "dining", "eat", "meal", "lunch", "dinner", "breakfast",
    "dominos", "mcdonalds", "kfc", "starbucks", "subway", "biryani",
    "hotel", "dhaba", "canteen", "mess", "tiffin", "grocery", "groceries",
    "bigbasket", "blinkit", "zepto", "instamart", "dmart", "more", "reliance fresh"
  ],
  "Transportation": [
    "uber", "ola", "rapido", "auto", "cab", "taxi", "metro", "bus",
    "train", "railway", "irctc", "petrol", "diesel", "fuel", "parking",
    "toll", "fastag", "transport", "travel", "flight", "airline",
    "indigo", "spicejet", "vistara", "makemytrip", "redbus", "goibibo"
  ],
  "Entertainment": [
    "netflix", "prime", "hotstar", "spotify", "youtube", "disney",
    "movie", "cinema", "pvr", "inox", "game", "gaming", "playstation",
    "xbox", "steam", "theatre", "concert", "show", "event", "ticket",
    "bookmyshow", "paytm insider", "zee5", "sonyliv", "jiocinema"
  ],
  "Shopping": [
    "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
    "shopping", "mall", "store", "mart", "retail", "purchase",
    "clothes", "fashion", "electronics", "appliance", "furniture",
    "decor", "lifestyle", "watch", "jewelry", "gift", "online"
  ],
  "Utilities": [
    "electricity", "water", "gas", "bill", "utility", "recharge",
    "mobile", "phone", "internet", "wifi", "broadband", "dth",
    "tata sky", "airtel", "jio", "vi", "bsnl", "postpaid", "prepaid",
    "maintenance", "society", "association"
  ],
  "Healthcare": [
    "hospital", "clinic", "doctor", "medical", "medicine", "pharmacy",
    "apollo", "medplus", "netmeds", "pharmeasy", "1mg", "health",
    "diagnostic", "lab", "test", "scan", "insurance", "mediclaim"
  ],
  "Education": [
    "school", "college", "university", "course", "class", "tuition",
    "book", "stationery", "udemy", "coursera", "unacademy", "byju",
    "education", "learn", "training", "workshop", "seminar", "exam", "fees"
  ],
  "Rent": [
    "rent", "lease", "housing", "accommodation", "pg", "hostel",
    "apartment", "flat", "house rent", "room rent"
  ],
  "Investment": [
    "mutual fund", "mf", "sip", "stock", "share", "trading", "zerodha",
    "groww", "upstox", "investment", "fd", "fixed deposit", "rd",
    "nps", "ppf", "gold", "bond", "demat", "kuvera", "coin", "smallcase",
    "hdfc mf", "icici prudential", "sbi mf", "axis mf", "kotak mf",
    "nippon", "aditya birla", "dsp", "uti mf", "tata mf", "franklin",
    "mirae", "parag parikh", "quant", "motilal", "edelweiss",
    "nifty", "sensex", "etf", "index fund", "equity", "debt fund",
    "liquid fund", "elss", "tax saver", "bluechip", "midcap", "smallcap",
    "flexi cap", "multi cap", "hybrid", "balanced", "gilt",
    "angel one", "5paisa", "iifl", "paytm money", "et money",
    "dividend", "nav", "folio", "units allotted", "units purchased"
  ],
  "Transfer": [
    "transfer", "upi", "neft", "imps", "rtgs", "sent to", "paid to",
    "received from", "self transfer", "own account"
  ],
};

/**
 * Categorize a transaction based on its description
 * @param description - Transaction description/narration
 * @returns Category name
 */
export const categorizeTransaction = (description: string): string => {
  if (!description) return "Other";
  
  const text = description.toLowerCase().trim();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return "Other";
};

// Alias for backward compatibility
export const detectCategory = categorizeTransaction;

/**
 * Get all available categories
 */
export const getCategories = (): string[] => {
  return [...Object.keys(CATEGORY_KEYWORDS), "Other"];
};

/**
 * Get category color
 */
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    "Food & Dining": "hsl(25, 50%, 35%)",
    "Transportation": "hsl(35, 60%, 45%)",
    "Entertainment": "hsl(45, 70%, 55%)",
    "Shopping": "hsl(30, 40%, 55%)",
    "Utilities": "hsl(20, 35%, 40%)",
    "Healthcare": "hsl(340, 60%, 50%)",
    "Education": "hsl(200, 60%, 45%)",
    "Rent": "hsl(38, 90%, 50%)",
    "Investment": "hsl(142, 70%, 40%)",
    "Transfer": "hsl(210, 50%, 50%)",
    "Other": "hsl(0, 0%, 50%)",
  };
  
  return colors[category] || colors["Other"];
};

/**
 * Get category icon name (for lucide-react)
 */
export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    "Food & Dining": "Coffee",
    "Transportation": "Car",
    "Entertainment": "Film",
    "Shopping": "ShoppingBag",
    "Utilities": "Zap",
    "Healthcare": "Heart",
    "Education": "GraduationCap",
    "Rent": "Home",
    "Investment": "TrendingUp",
    "Transfer": "ArrowRightLeft",
    "Other": "MoreHorizontal",
  };
  
  return icons[category] || icons["Other"];
};
