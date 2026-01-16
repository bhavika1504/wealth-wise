/**
 * Example usage of Loan Prepayment Calculator
 * 
 * This file demonstrates how to use the loan prepayment simulator
 */

import { calculateLoanPrepaymentImpact, simulateLoanPrepayment } from "./loanPrepayment";

// Example 1: Home Loan Prepayment
const homeLoanExample = {
  loanPrincipal: 5000000, // ₹50 Lakhs
  annualInterestRate: 8.5, // 8.5% per annum
  loanTenureMonths: 240, // 20 years (240 months)
  monthlyEMI: 43388, // Monthly EMI
  outstandingPrincipal: 4800000, // Current outstanding balance
  prepaymentAmount: 500000, // ₹5 Lakhs prepayment
  prepaymentMonth: 12, // Prepay in month 12
};

console.log("Example 1: Home Loan Prepayment");
console.log("=================================");
const result1 = simulateLoanPrepayment(homeLoanExample);
console.log(result1);

// Example 2: Car Loan Prepayment (Smaller amount)
const carLoanExample = {
  loanPrincipal: 800000, // ₹8 Lakhs
  annualInterestRate: 10.5, // 10.5% per annum
  loanTenureMonths: 60, // 5 years (60 months)
  monthlyEMI: 17200, // Monthly EMI
  outstandingPrincipal: 700000, // Current outstanding balance
  prepaymentAmount: 100000, // ₹1 Lakh prepayment
  prepaymentMonth: 6, // Prepay in month 6
};

console.log("\n\nExample 2: Car Loan Prepayment");
console.log("=================================");
const result2 = simulateLoanPrepayment(carLoanExample);
console.log(result2);

// Example 3: Using the function that returns object (for programmatic use)
const resultObject = calculateLoanPrepaymentImpact(carLoanExample);
console.log("\n\nExample 3: Programmatic Usage");
console.log("==============================");
console.log("Interest Saved:", resultObject.interest_saved);
console.log("Tenure Reduction:", resultObject.tenure_reduction_months, "months");
