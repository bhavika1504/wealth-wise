/**
 * Debt Repayment Optimization AI
 * 
 * Generates and compares Avalanche and Snowball debt repayment strategies.
 * Uses conservative financial reasoning to recommend the optimal strategy.
 */

export interface Loan {
  loan_name: string;
  outstanding_balance: number;
  annual_interest_rate: number;
  monthly_emi: number;
}

export interface DebtRepaymentInput {
  loans: Loan[];
  monthly_surplus?: number;
  risk_tolerance?: "low" | "medium" | "high";
}

export interface DebtRepaymentResult {
  avalanche_order: string[];
  snowball_order: string[];
  recommended_strategy: "avalanche" | "snowball";
  reason: string;
  estimated_interest_saved: number;
}

/**
 * Calculate total interest paid for a loan if paid normally
 */
function calculateLoanInterest(
  outstandingBalance: number,
  annualInterestRate: number,
  monthlyEMI: number
): number {
  const monthlyRate = annualInterestRate / 12 / 100;
  let remainingBalance = outstandingBalance;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // 50 years safety limit

  while (remainingBalance > 0.01 && months < maxMonths) {
    const interestComponent = remainingBalance * monthlyRate;
    const principalComponent = monthlyEMI - interestComponent;

    if (principalComponent <= 0) {
      // EMI too small to cover interest
      break;
    }

    totalInterest += interestComponent;
    remainingBalance -= principalComponent;
    months++;
  }

  return Math.round(totalInterest * 100) / 100;
}

/**
 * Calculate total interest for a repayment strategy
 * Simulates month-by-month repayment with proper allocation of payments
 */
function calculateStrategyInterest(
  loans: Loan[],
  repaymentOrder: string[],
  monthlySurplus: number = 0
): number {
  // Create a map for quick lookup
  const loanMap = new Map(loans.map(loan => [loan.loan_name, loan]));
  
  // Track remaining balances
  const balances = new Map(
    loans.map(loan => [loan.loan_name, loan.outstanding_balance])
  );
  
  // Track which loans are paid off
  const paidOffLoans = new Set<string>();
  
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600;

  while (paidOffLoans.size < loans.length && months < maxMonths) {
    // Find the current priority loan (first unpaid loan in repayment order)
    const currentPriorityLoanName = repaymentOrder.find(
      name => !paidOffLoans.has(name)
    );
    
    if (!currentPriorityLoanName) {
      break; // All loans paid off
    }

    // Track available extra payment this month (surplus + freed-up EMIs)
    let availableExtra = monthlySurplus;
    for (const loan of loans) {
      if (paidOffLoans.has(loan.loan_name)) {
        availableExtra += loan.monthly_emi;
      }
    }
    
    // Calculate interest and apply minimum payments for all active loans
    for (const loan of loans) {
      if (paidOffLoans.has(loan.loan_name)) {
        continue;
      }

      const balance = balances.get(loan.loan_name) || 0;
      
      if (balance <= 0.01) {
        paidOffLoans.add(loan.loan_name);
        continue;
      }

      const monthlyRate = loan.annual_interest_rate / 12 / 100;
      const interestComponent = balance * monthlyRate;
      totalInterest += interestComponent;

      // Minimum payment (EMI)
      const principalFromEMI = Math.min(
        loan.monthly_emi - interestComponent,
        balance
      );
      
      let newBalance = balance - principalFromEMI;
      
      // Apply extra payment to priority loan if available
      if (loan.loan_name === currentPriorityLoanName && availableExtra > 0 && newBalance > 0.01) {
        const extraPayment = Math.min(availableExtra, newBalance);
        newBalance -= extraPayment;
        availableExtra -= extraPayment;
      }

      balances.set(loan.loan_name, Math.max(0, newBalance));
      
      if (newBalance <= 0.01) {
        paidOffLoans.add(loan.loan_name);
      }
    }

    months++;
  }

  return Math.round(totalInterest * 100) / 100;
}

/**
 * Generate Avalanche method order (highest interest rate first)
 */
function generateAvalancheOrder(loans: Loan[]): string[] {
  return [...loans]
    .sort((a, b) => {
      // Sort by interest rate (descending), then by balance if rates are equal
      if (b.annual_interest_rate !== a.annual_interest_rate) {
        return b.annual_interest_rate - a.annual_interest_rate;
      }
      return b.outstanding_balance - a.outstanding_balance;
    })
    .map(loan => loan.loan_name);
}

/**
 * Generate Snowball method order (smallest balance first)
 */
function generateSnowballOrder(loans: Loan[]): string[] {
  return [...loans]
    .sort((a, b) => {
      // Sort by balance (ascending), then by interest rate if balances are equal
      if (a.outstanding_balance !== b.outstanding_balance) {
        return a.outstanding_balance - b.outstanding_balance;
      }
      return b.annual_interest_rate - a.annual_interest_rate;
    })
    .map(loan => loan.loan_name);
}

/**
 * Calculate baseline total interest (no optimization)
 */
function calculateBaselineInterest(loans: Loan[]): number {
  return loans.reduce((total, loan) => {
    return total + calculateLoanInterest(
      loan.outstanding_balance,
      loan.annual_interest_rate,
      loan.monthly_emi
    );
  }, 0);
}

/**
 * Main function to optimize debt repayment
 */
export function optimizeDebtRepayment(
  input: DebtRepaymentInput
): DebtRepaymentResult {
  const { loans, monthly_surplus = 0, risk_tolerance = "medium" } = input;

  // Validate inputs
  if (!loans || loans.length === 0) {
    throw new Error("At least one loan is required");
  }

  if (loans.some(loan => 
    !loan.loan_name || 
    loan.outstanding_balance <= 0 || 
    loan.annual_interest_rate < 0 || 
    loan.monthly_emi <= 0
  )) {
    throw new Error("Invalid loan data");
  }

  // Generate repayment orders
  const avalancheOrder = generateAvalancheOrder(loans);
  const snowballOrder = generateSnowballOrder(loans);

  // Calculate total interest for each strategy
  const avalancheInterest = calculateStrategyInterest(
    loans,
    avalancheOrder,
    monthly_surplus
  );
  
  const snowballInterest = calculateStrategyInterest(
    loans,
    snowballOrder,
    monthly_surplus
  );

  const baselineInterest = calculateBaselineInterest(loans);

  // Determine which strategy saves more interest
  const avalancheSavings = baselineInterest - avalancheInterest;
  const snowballSavings = baselineInterest - snowballInterest;
  const interestDifference = Math.abs(avalancheInterest - snowballInterest);

  // Decision logic
  let recommendedStrategy: "avalanche" | "snowball";
  let reason: string;

  // If interest difference is significant (>5% of smaller interest), prioritize savings
  const significantDifference = interestDifference > Math.min(avalancheInterest, snowballInterest) * 0.05;

  if (avalancheInterest < snowballInterest && significantDifference) {
    // Avalanche saves more interest
    recommendedStrategy = "avalanche";
    
    if (risk_tolerance === "low") {
      reason = `Avalanche method saves ₹${Math.round(interestDifference).toLocaleString()} more in interest by prioritizing high-interest loans. This is the mathematically optimal approach and aligns with conservative financial principles.`;
    } else if (risk_tolerance === "high") {
      reason = `Avalanche method saves ₹${Math.round(interestDifference).toLocaleString()} more in interest. While it may take longer to see the first loan paid off, the long-term savings make it the better financial choice.`;
    } else {
      reason = `Avalanche method saves ₹${Math.round(interestDifference).toLocaleString()} more in interest by targeting loans with the highest interest rates first. This approach minimizes total interest paid over time.`;
    }
  } else if (snowballInterest < avalancheInterest && significantDifference) {
    // Snowball saves more (rare, but possible with certain loan structures)
    recommendedStrategy = "snowball";
    reason = `Snowball method saves ₹${Math.round(interestDifference).toLocaleString()} more in interest. By paying off smaller balances first, you free up cash flow faster, which can be strategically advantageous.`;
  } else {
    // Interest difference is minimal, consider behavioral factors
    if (risk_tolerance === "low") {
      // Low risk tolerance prefers quick wins (snowball)
      recommendedStrategy = "snowball";
      reason = `Both strategies have similar interest costs (difference: ₹${Math.round(interestDifference).toLocaleString()}). Snowball method is recommended for low risk tolerance as it provides quicker psychological wins by eliminating smaller debts first, improving cash flow and reducing stress.`;
    } else if (risk_tolerance === "high") {
      // High risk tolerance can handle delayed gratification (avalanche)
      recommendedStrategy = "avalanche";
      reason = `Both strategies have similar interest costs (difference: ₹${Math.round(interestDifference).toLocaleString()}). Avalanche method is recommended as it mathematically minimizes interest, and with high risk tolerance, you can benefit from the optimal financial outcome.`;
    } else {
      // Medium risk tolerance: prefer avalanche if it saves even a little
      if (avalancheInterest <= snowballInterest) {
        recommendedStrategy = "avalanche";
        reason = `Avalanche method saves ₹${Math.round(interestDifference).toLocaleString()} in interest. While the difference is modest, prioritizing high-interest loans is the financially sound approach.`;
      } else {
        recommendedStrategy = "snowball";
        reason = `Snowball method provides faster debt elimination and improved cash flow. The interest difference is minimal (₹${Math.round(interestDifference).toLocaleString()}), making the psychological benefits of quick wins valuable.`;
      }
    }
  }

  // Calculate estimated interest saved vs baseline
  const estimatedInterestSaved = recommendedStrategy === "avalanche"
    ? avalancheSavings
    : snowballSavings;

  return {
    avalanche_order: avalancheOrder,
    snowball_order: snowballOrder,
    recommended_strategy: recommendedStrategy,
    reason,
    estimated_interest_saved: Math.round(estimatedInterestSaved * 100) / 100,
  };
}

/**
 * Service function that returns JSON output
 * This is the main entry point for the optimizer
 */
export function optimizeDebtRepaymentJSON(input: DebtRepaymentInput): string {
  try {
    const result = optimizeDebtRepayment(input);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
