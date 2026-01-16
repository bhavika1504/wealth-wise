import { addTransaction } from "@/services/transactionService";
import { addInvestment } from "@/services/investmentsService";
import { categorizeTransaction } from "@/utils/categorize";
import Papa from "papaparse";
import { forwardRef, useState } from "react";
import { toast } from "sonner";

// Extract investment details from description
const extractInvestmentDetails = (description: string, amount: number): {
  name: string;
  type: string;
  platform: string;
} | null => {
  const text = description.toLowerCase();
  
  // Detect platform
  let platform = "Unknown";
  const platforms = [
    { keywords: ["groww"], name: "Groww" },
    { keywords: ["zerodha", "coin"], name: "Zerodha" },
    { keywords: ["upstox"], name: "Upstox" },
    { keywords: ["kuvera"], name: "Kuvera" },
    { keywords: ["paytm money"], name: "Paytm Money" },
    { keywords: ["et money"], name: "ET Money" },
    { keywords: ["angel one", "angelone"], name: "Angel One" },
    { keywords: ["5paisa"], name: "5Paisa" },
    { keywords: ["hdfc"], name: "HDFC" },
    { keywords: ["icici"], name: "ICICI" },
    { keywords: ["sbi"], name: "SBI" },
    { keywords: ["axis"], name: "Axis" },
    { keywords: ["kotak"], name: "Kotak" },
  ];
  
  for (const p of platforms) {
    if (p.keywords.some(k => text.includes(k))) {
      platform = p.name;
      break;
    }
  }
  
  // Detect investment type
  let type = "Mutual Fund";
  if (text.includes("stock") || text.includes("share") || text.includes("equity") || 
      text.includes("nifty") || text.includes("sensex") || text.includes("etf")) {
    type = "Stocks";
  } else if (text.includes("sip")) {
    type = "SIP";
  } else if (text.includes("fd") || text.includes("fixed deposit")) {
    type = "Fixed Deposit";
  } else if (text.includes("ppf")) {
    type = "PPF";
  } else if (text.includes("nps")) {
    type = "NPS";
  } else if (text.includes("gold")) {
    type = "Gold";
  } else if (text.includes("rd") || text.includes("recurring")) {
    type = "Recurring Deposit";
  } else if (text.includes("elss") || text.includes("tax saver")) {
    type = "ELSS";
  }
  
  // Generate a name
  let name = `${platform} ${type}`;
  
  // Try to extract fund name patterns
  const fundPatterns = [
    /(?:sip|investment|purchase|buy)[\s-]*(?:in|of|for)?[\s-]*([a-z\s]+(?:fund|mf|direct|growth))/i,
    /([a-z\s]+(?:bluechip|midcap|smallcap|flexi|multi|hybrid|balanced|liquid|gilt|nifty|sensex))/i,
  ];
  
  for (const pattern of fundPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      name = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }
  
  return { name, type, platform };
};

interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  category: string;
}

// Common CSV column name mappings
const COLUMN_MAPPINGS = {
  date: ["date", "transaction_date", "txn_date", "trans_date", "value_date", "posting_date", "Date"],
  description: ["description", "narration", "particulars", "details", "remarks", "transaction_description", "desc", "Description"],
  amount: ["amount", "debit", "withdrawal", "transaction_amount", "txn_amount", "value", "Amount"],
  credit: ["credit", "deposit", "credit_amount"],
};

// Find matching column from CSV headers
const findColumn = (headers: string[], possibleNames: string[]): string | null => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const index = normalizedHeaders.indexOf(name.toLowerCase());
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
};

// Parse various date formats
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Try ISO format first (2026-03-01)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try MM/DD/YYYY
  const mmddyyyy = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }
  
  return new Date();
};

// Parse amount (handle negative, currency symbols, commas)
const parseAmount = (amountStr: string | number): number => {
  if (typeof amountStr === "number") return Math.abs(amountStr);
  if (!amountStr) return 0;
  
  // Remove currency symbols and commas
  const cleaned = amountStr
    .replace(/[₹$€£,]/g, "")
    .replace(/\s/g, "")
    .trim();
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
};

interface UploadStatementProps {
  onUploadComplete?: (count: number) => void;
}

const UploadStatement = forwardRef<HTMLInputElement, UploadStatementProps>(
  ({ onUploadComplete }, ref) => {
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }

      setUploading(true);
      toast.info("Processing your statement...");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (result) => {
          try {
            const headers = result.meta.fields || [];
            
            // Find column mappings
            const dateCol = findColumn(headers, COLUMN_MAPPINGS.date);
            const descCol = findColumn(headers, COLUMN_MAPPINGS.description);
            const amountCol = findColumn(headers, COLUMN_MAPPINGS.amount);
            const creditCol = findColumn(headers, COLUMN_MAPPINGS.credit);

            if (!dateCol && !descCol && !amountCol) {
              toast.error("Could not identify CSV columns. Expected: date, description, amount");
              setUploading(false);
              return;
            }

            const transactions: ParsedTransaction[] = [];
            let skippedRows = 0;

            for (const row of result.data as Record<string, any>[]) {
              // Get values using found columns or fallback to direct property access
              const dateValue = dateCol ? row[dateCol] : row.date || row.Date;
              const descValue = descCol ? row[descCol] : row.description || row.Description || row.narration;
              let amountValue = amountCol ? row[amountCol] : row.amount || row.Amount;
              
              // If there's a credit column, use it if amount is empty/zero
              if (creditCol && row[creditCol] && (!amountValue || parseAmount(amountValue) === 0)) {
                amountValue = row[creditCol];
              }

              // Skip rows with missing essential data
              if (!descValue || (!amountValue && amountValue !== 0)) {
                skippedRows++;
                continue;
              }

              const amount = parseAmount(amountValue);
              if (amount === 0) {
                skippedRows++;
                continue;
              }

              const description = String(descValue).trim();
              const category = categorizeTransaction(description);
              const date = parseDate(String(dateValue));

              transactions.push({
                date,
                description,
                amount,
                category,
              });
            }

            if (transactions.length === 0) {
              toast.error("No valid transactions found in the CSV file");
              setUploading(false);
              return;
            }

            // Add transactions to Firestore
            let successCount = 0;
            let errorCount = 0;
            let investmentCount = 0;

            for (const tx of transactions) {
              try {
                // Save expenses as negative amounts to distinguish from income
                await addTransaction({
                  amount: -Math.abs(tx.amount), // Negative for expenses
                  category: tx.category,
                  description: tx.description,
                  createdAt: tx.date,
                });
                successCount++;

                // If it's an investment, also add to investments collection
                if (tx.category === "Investment") {
                  try {
                    const investmentDetails = extractInvestmentDetails(tx.description, tx.amount);
                    if (investmentDetails) {
                      await addInvestment({
                        name: investmentDetails.name,
                        type: investmentDetails.type,
                        platform: investmentDetails.platform,
                        invested: Math.abs(tx.amount),
                        current: Math.abs(tx.amount), // Will be updated by market data
                        change: 0,
                        units: 0, // Unknown from bank statement
                        purchaseDate: tx.date,
                        description: tx.description,
                        autoImported: true,
                      });
                      investmentCount++;
                    }
                  } catch (invError) {
                    console.error("Failed to add investment:", invError);
                  }
                }
              } catch (error) {
                console.error("Failed to add transaction:", error);
                errorCount++;
              }
            }

            // Show results
            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} transactions!`);
            }
            if (investmentCount > 0) {
              toast.success(`📈 Detected ${investmentCount} investments!`);
            }
            if (errorCount > 0) {
              toast.warning(`${errorCount} transactions failed to import`);
            }
            if (skippedRows > 0) {
              toast.info(`${skippedRows} rows were skipped (missing data)`);
            }

            // Callback and refresh
            onUploadComplete?.(successCount);
            
            // Reset file input
            if (e.target) {
              e.target.value = "";
            }

            // Refresh the page to show new data
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (error) {
            console.error("CSV parsing error:", error);
            toast.error("Failed to parse CSV file. Please check the format.");
          } finally {
            setUploading(false);
          }
        },
        error: (error) => {
          console.error("Papa parse error:", error);
          toast.error("Failed to read the CSV file");
          setUploading(false);
        },
      });
    };

    return (
      <input
        type="file"
        accept=".csv"
        ref={ref}
        hidden
        onChange={handleFileUpload}
        disabled={uploading}
      />
    );
  }
);

UploadStatement.displayName = "UploadStatement";

export default UploadStatement;
