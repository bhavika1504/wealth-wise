/**
 * Loan Prepayment Service
 * 
 * Service layer for loan prepayment calculations
 */

import {
  calculateLoanPrepaymentImpact,
  LoanPrepaymentInput,
  LoanPrepaymentResult,
  simulateLoanPrepayment,
} from "@/utils/loanPrepayment";

/**
 * Calculate loan prepayment impact and return JSON result
 * This is the main service function
 */
export function calculatePrepaymentImpact(
  input: LoanPrepaymentInput
): string {
  return simulateLoanPrepayment(input);
}

/**
 * Calculate loan prepayment impact and return result object
 */
export function getPrepaymentImpact(
  input: LoanPrepaymentInput
): LoanPrepaymentResult {
  return calculateLoanPrepaymentImpact(input);
}
