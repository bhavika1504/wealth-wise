# Loan Prepayment Impact Simulator

A calculator that simulates the impact of loan prepayment on interest savings and loan tenure reduction.

## Usage

### Basic Usage (Returns JSON String)

```typescript
import { simulateLoanPrepayment } from "@/utils/loanPrepayment";

const input = {
  loanPrincipal: 5000000,        // Original loan amount (INR)
  annualInterestRate: 8.5,       // Annual interest rate (%)
  loanTenureMonths: 240,         // Original loan tenure in months
  monthlyEMI: 43388,             // Monthly EMI amount (INR)
  outstandingPrincipal: 4800000, // Current outstanding principal (INR)
  prepaymentAmount: 500000,      // Prepayment amount (INR)
  prepaymentMonth: 12,           // Month in which prepayment is made
};

const jsonResult = simulateLoanPrepayment(input);
console.log(jsonResult);
```

### Programmatic Usage (Returns Object)

```typescript
import { calculateLoanPrepaymentImpact } from "@/utils/loanPrepayment";

const result = calculateLoanPrepaymentImpact(input);
console.log(result.interest_saved);
console.log(result.tenure_reduction_months);
```

## Output Format

The function returns a JSON string with the following structure:

```json
{
  "interest_before_prepayment": 5413120.00,
  "interest_after_prepayment": 4850000.00,
  "interest_saved": 563120.00,
  "original_tenure_months": 240,
  "new_tenure_months": 215,
  "tenure_reduction_months": 25,
  "summary": "By prepaying ₹500,000 in month 12, you will save ₹563,120 in interest and reduce your loan tenure by 25 months (from 240 months to 215 months)."
}
```

## Assumptions

- EMI remains constant after prepayment
- Loan tenure reduces (not EMI reduction mode)
- Uses standard loan amortization mathematics
- Prepayment is applied at the beginning of the specified month
- All amounts are in INR (Indian Rupees)

## Notes

- If the prepayment amount is very small (< 1% of outstanding principal), a warning is included in the summary
- The calculator is conservative and precise
- Does not provide financial or legal advice
