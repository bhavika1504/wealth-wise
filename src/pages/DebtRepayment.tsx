import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { optimizeDebtRepayment } from "@/utils/debtRepaymentOptimizer";
import { Calculator, TrendingUp, ArrowRight } from "lucide-react";
import { useState } from "react";

interface Loan {
  loan_name: string;
  outstanding_balance: string;
  annual_interest_rate: string;
  monthly_emi: string;
}

const DebtRepayment = () => {
  const [loans, setLoans] = useState<Loan[]>([
    { loan_name: "", outstanding_balance: "", annual_interest_rate: "", monthly_emi: "" },
  ]);
  const [monthlySurplus, setMonthlySurplus] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const addLoan = () => {
    setLoans([...loans, { loan_name: "", outstanding_balance: "", annual_interest_rate: "", monthly_emi: "" }]);
  };

  const removeLoan = (index: number) => {
    setLoans(loans.filter((_, i) => i !== index));
  };

  const updateLoan = (index: number, field: keyof Loan, value: string) => {
    const updated = [...loans];
    updated[index] = { ...updated[index], [field]: value };
    setLoans(updated);
  };

  const handleCalculate = () => {
    try {
      setError("");
      const validLoans = loans
        .filter(loan => loan.loan_name && loan.outstanding_balance && loan.annual_interest_rate && loan.monthly_emi)
        .map(loan => ({
          loan_name: loan.loan_name,
          outstanding_balance: parseFloat(loan.outstanding_balance),
          annual_interest_rate: parseFloat(loan.annual_interest_rate),
          monthly_emi: parseFloat(loan.monthly_emi),
        }));

      if (validLoans.length === 0) {
        throw new Error("Please add at least one loan");
      }

      const input = {
        loans: validLoans,
        monthly_surplus: monthlySurplus ? parseFloat(monthlySurplus) : undefined,
        risk_tolerance: riskTolerance,
      };

      const calculationResult = optimizeDebtRepayment(input);
      setResult(calculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid input. Please check all fields.");
      setResult(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold">Debt Repayment Optimizer</h1>
          <p className="text-muted-foreground mt-2">
            Compare Avalanche and Snowball strategies to optimize your debt repayment
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Loan Details
              </CardTitle>
              <CardDescription>
                Add all your active loans to get optimized repayment strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loans.map((loan, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Loan {index + 1}</Label>
                    {loans.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLoan(index)}
                        className="text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`loan_name_${index}`}>Loan Name</Label>
                    <Input
                      id={`loan_name_${index}`}
                      placeholder="e.g., Credit Card, Personal Loan"
                      value={loan.loan_name}
                      onChange={(e) => updateLoan(index, "loan_name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`balance_${index}`}>Outstanding Balance (₹)</Label>
                    <Input
                      id={`balance_${index}`}
                      type="number"
                      placeholder="150000"
                      value={loan.outstanding_balance}
                      onChange={(e) => updateLoan(index, "outstanding_balance", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`rate_${index}`}>Annual Interest Rate (%)</Label>
                    <Input
                      id={`rate_${index}`}
                      type="number"
                      placeholder="24.0"
                      value={loan.annual_interest_rate}
                      onChange={(e) => updateLoan(index, "annual_interest_rate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`emi_${index}`}>Monthly EMI (₹)</Label>
                    <Input
                      id={`emi_${index}`}
                      type="number"
                      placeholder="5000"
                      value={loan.monthly_emi}
                      onChange={(e) => updateLoan(index, "monthly_emi", e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addLoan} className="w-full">
                + Add Another Loan
              </Button>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="monthlySurplus">Monthly Surplus (₹) - Optional</Label>
                <Input
                  id="monthlySurplus"
                  type="number"
                  placeholder="10000"
                  value={monthlySurplus}
                  onChange={(e) => setMonthlySurplus(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                <Select value={riskTolerance} onValueChange={(value: "low" | "medium" | "high") => setRiskTolerance(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Prefer quick wins</SelectItem>
                    <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                    <SelectItem value="high">High - Maximize savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button onClick={handleCalculate} className="w-full">
                Optimize Repayment Strategy
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Optimization Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Interest Saved</p>
                    <p className="text-3xl font-bold text-success">
                      ₹{result.estimated_interest_saved.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-sm font-medium mb-2">Recommended Strategy</p>
                    <p className="text-2xl font-bold text-accent capitalize">
                      {result.recommended_strategy} Method
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Avalanche Order (Highest Interest First)</p>
                      <div className="space-y-2">
                        {result.avalanche_order.map((loan: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded bg-muted">
                            <span className="text-sm font-medium">{index + 1}.</span>
                            <span>{loan}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Snowball Order (Smallest Balance First)</p>
                      <div className="space-y-2">
                        {result.snowball_order.map((loan: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded bg-muted">
                            <span className="text-sm font-medium">{index + 1}.</span>
                            <span>{loan}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card border">
                    <p className="text-sm font-medium mb-2">Why This Strategy?</p>
                    <p className="text-sm text-muted-foreground">{result.reason}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Add your loans and click "Optimize Repayment Strategy" to see results
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DebtRepayment;
