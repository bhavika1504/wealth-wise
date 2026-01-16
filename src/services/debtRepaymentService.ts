/**
 * Debt Repayment Optimization Service
 * 
 * Service layer for debt repayment optimization calculations
 */

import {
  DebtRepaymentInput,
  DebtRepaymentResult,
  optimizeDebtRepayment,
  optimizeDebtRepaymentJSON,
} from "@/utils/debtRepaymentOptimizer";

/**
 * Optimize debt repayment and return JSON result
 * This is the main service function
 */
export function optimizeDebtRepaymentStrategy(
  input: DebtRepaymentInput
): string {
  return optimizeDebtRepaymentJSON(input);
}

/**
 * Optimize debt repayment and return result object
 */
export function getDebtRepaymentStrategy(
  input: DebtRepaymentInput
): DebtRepaymentResult {
  return optimizeDebtRepayment(input);
}
