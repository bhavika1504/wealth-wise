/**
 * Example usage of Debt Repayment Optimizer
 * 
 * This file demonstrates how to use the debt repayment optimization AI
 */

import { optimizeDebtRepayment, optimizeDebtRepaymentJSON } from "./debtRepaymentOptimizer";

// Example 1: Multiple loans with different interest rates
const example1 = {
  loans: [
    {
      loan_name: "Credit Card",
      outstanding_balance: 150000,
      annual_interest_rate: 24.0, // 24% APR
      monthly_emi: 5000,
    },
    {
      loan_name: "Personal Loan",
      outstanding_balance: 500000,
      annual_interest_rate: 12.5, // 12.5% APR
      monthly_emi: 15000,
    },
    {
      loan_name: "Home Loan",
      outstanding_balance: 3000000,
      annual_interest_rate: 8.5, // 8.5% APR
      monthly_emi: 35000,
    },
  ],
  monthly_surplus: 10000,
  risk_tolerance: "medium" as const,
};

console.log("Example 1: Multiple Loans");
console.log("=========================");
const result1 = optimizeDebtRepaymentJSON(example1);
console.log(result1);

// Example 2: Low risk tolerance (prefers quick wins)
const example2 = {
  loans: [
    {
      loan_name: "Small Personal Loan",
      outstanding_balance: 50000,
      annual_interest_rate: 15.0,
      monthly_emi: 3000,
    },
    {
      loan_name: "Credit Card Debt",
      outstanding_balance: 200000,
      annual_interest_rate: 22.0,
      monthly_emi: 8000,
    },
    {
      loan_name: "Car Loan",
      outstanding_balance: 800000,
      annual_interest_rate: 9.5,
      monthly_emi: 20000,
    },
  ],
  monthly_surplus: 5000,
  risk_tolerance: "low" as const,
};

console.log("\n\nExample 2: Low Risk Tolerance");
console.log("=============================");
const result2 = optimizeDebtRepaymentJSON(example2);
console.log(result2);

// Example 3: Using the function that returns object (for programmatic use)
const resultObject = optimizeDebtRepayment(example1);
console.log("\n\nExample 3: Programmatic Usage");
console.log("=============================");
console.log("Recommended Strategy:", resultObject.recommended_strategy);
console.log("Interest Saved:", resultObject.estimated_interest_saved);
console.log("Reason:", resultObject.reason);
