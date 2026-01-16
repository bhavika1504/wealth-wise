/**
 * Test file for loan prepayment calculator
 * Run with: npm test or node
 */

import { calculateLoanPrepaymentImpact } from "../loanPrepayment";

// Example test case
const testInput = {
  loanPrincipal: 5000000, // ₹50 Lakhs
  annualInterestRate: 8.5, // 8.5% per annum
  loanTenureMonths: 240, // 20 years
  monthlyEMI: 43388, // Approximate EMI
  outstandingPrincipal: 4500000, // Current outstanding
  prepaymentAmount: 500000, // ₹5 Lakhs prepayment
  prepaymentMonth: 12, // Prepay in month 12
};

console.log("Testing Loan Prepayment Calculator...\n");
console.log("Input:", JSON.stringify(testInput, null, 2));
console.log("\nCalculating...\n");

try {
  const result = calculateLoanPrepaymentImpact(testInput);
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error:", error);
}
