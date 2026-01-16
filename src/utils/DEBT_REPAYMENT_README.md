# Debt Repayment Optimization AI

An AI-powered calculator that generates and compares Avalanche and Snowball debt repayment strategies to help you pay off multiple loans optimally.

## Usage

### Basic Usage (Returns JSON String)

```typescript
import { optimizeDebtRepaymentJSON } from "@/utils/debtRepaymentOptimizer";

const input = {
  loans: [
    {
      loan_name: "Credit Card",
      outstanding_balance: 150000,
      annual_interest_rate: 24.0,
      monthly_emi: 5000,
    },
    {
      loan_name: "Personal Loan",
      outstanding_balance: 500000,
      annual_interest_rate: 12.5,
      monthly_emi: 15000,
    },
    {
      loan_name: "Home Loan",
      outstanding_balance: 3000000,
      annual_interest_rate: 8.5,
      monthly_emi: 35000,
    },
  ],
  monthly_surplus: 10000, // Optional: extra money available monthly
  risk_tolerance: "medium", // Optional: "low" | "medium" | "high"
};

const jsonResult = optimizeDebtRepaymentJSON(input);
console.log(jsonResult);
```

### Programmatic Usage (Returns Object)

```typescript
import { optimizeDebtRepayment } from "@/utils/debtRepaymentOptimizer";

const result = optimizeDebtRepayment(input);
console.log(result.recommended_strategy);
console.log(result.estimated_interest_saved);
console.log(result.reason);
```

## Output Format

The function returns a JSON string with the following structure:

```json
{
  "avalanche_order": ["Credit Card", "Personal Loan", "Home Loan"],
  "snowball_order": ["Credit Card", "Personal Loan", "Home Loan"],
  "recommended_strategy": "avalanche",
  "reason": "Avalanche method saves ₹125,000 more in interest by prioritizing high-interest loans. This is the mathematically optimal approach and aligns with conservative financial principles.",
  "estimated_interest_saved": 250000
}
```

## Strategies Explained

### Avalanche Method
- **Priority**: Pay off loans with highest interest rates first
- **Benefit**: Minimizes total interest paid over time
- **Best for**: Financially disciplined individuals who want maximum savings

### Snowball Method
- **Priority**: Pay off loans with smallest balances first
- **Benefit**: Provides psychological wins and faster cash flow improvement
- **Best for**: People who need motivation and quick wins to stay on track

## Risk Tolerance Impact

- **Low Risk Tolerance**: Prefers Snowball method for quicker wins and reduced stress
- **Medium Risk Tolerance**: Balances interest savings with behavioral factors
- **High Risk Tolerance**: Prefers Avalanche method for optimal financial outcome

## Assumptions

- Minimum EMI payments are made on all loans each month
- Extra payments (surplus + freed-up EMIs from paid-off loans) go to the priority loan
- Uses standard loan amortization mathematics
- All amounts are in INR (Indian Rupees)
- Conservative financial reasoning applied

## Notes

- The AI compares both strategies and recommends the optimal one based on:
  - Total interest savings
  - User's risk tolerance
  - Behavioral feasibility
- Does not provide financial or legal advice
- Explanations are simple and actionable
