import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateLoanPrepaymentImpact } from "@/utils/loanPrepayment";
import { Calculator, TrendingDown } from "lucide-react";
import { useState } from "react";

const LoanPrepayment = () => {
  const [formData, setFormData] = useState({
    loanPrincipal: "",
    annualInterestRate: "",
    loanTenureMonths: "",
    monthlyEMI: "",
    outstandingPrincipal: "",
    prepaymentAmount: "",
    prepaymentMonth: "",
  });

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCalculate = () => {
    try {
      setError("");
      const input = {
        loanPrincipal: parseFloat(formData.loanPrincipal),
        annualInterestRate: parseFloat(formData.annualInterestRate),
        loanTenureMonths: parseInt(formData.loanTenureMonths),
        monthlyEMI: parseFloat(formData.monthlyEMI),
        outstandingPrincipal: parseFloat(formData.outstandingPrincipal),
        prepaymentAmount: parseFloat(formData.prepaymentAmount),
        prepaymentMonth: parseInt(formData.prepaymentMonth),
      };

      const calculationResult = calculateLoanPrepaymentImpact(input);
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
          <h1 className="font-serif text-3xl font-bold">Loan Prepayment Calculator</h1>
          <p className="text-muted-foreground mt-2">
            Calculate the impact of prepayment on your loan interest and tenure
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
                Enter your loan information to calculate prepayment impact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loanPrincipal">Loan Principal (₹)</Label>
                <Input
                  id="loanPrincipal"
                  name="loanPrincipal"
                  type="number"
                  placeholder="5000000"
                  value={formData.loanPrincipal}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annualInterestRate">Annual Interest Rate (%)</Label>
                <Input
                  id="annualInterestRate"
                  name="annualInterestRate"
                  type="number"
                  placeholder="8.5"
                  value={formData.annualInterestRate}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanTenureMonths">Loan Tenure (Months)</Label>
                <Input
                  id="loanTenureMonths"
                  name="loanTenureMonths"
                  type="number"
                  placeholder="240"
                  value={formData.loanTenureMonths}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyEMI">Monthly EMI (₹)</Label>
                <Input
                  id="monthlyEMI"
                  name="monthlyEMI"
                  type="number"
                  placeholder="43388"
                  value={formData.monthlyEMI}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outstandingPrincipal">Outstanding Principal (₹)</Label>
                <Input
                  id="outstandingPrincipal"
                  name="outstandingPrincipal"
                  type="number"
                  placeholder="4800000"
                  value={formData.outstandingPrincipal}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepaymentAmount">Prepayment Amount (₹)</Label>
                <Input
                  id="prepaymentAmount"
                  name="prepaymentAmount"
                  type="number"
                  placeholder="500000"
                  value={formData.prepaymentAmount}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepaymentMonth">Prepayment Month</Label>
                <Input
                  id="prepaymentMonth"
                  name="prepaymentMonth"
                  type="number"
                  placeholder="12"
                  value={formData.prepaymentMonth}
                  onChange={handleChange}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button onClick={handleCalculate} className="w-full">
                Calculate Impact
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Prepayment Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Interest Before</p>
                      <p className="text-2xl font-bold">₹{result.interest_before_prepayment.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Interest After</p>
                      <p className="text-2xl font-bold">₹{result.interest_after_prepayment.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm text-muted-foreground mb-1">Interest Saved</p>
                    <p className="text-3xl font-bold text-success">
                      ₹{result.interest_saved.toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Original Tenure</p>
                      <p className="text-xl font-bold">{result.original_tenure_months} months</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">New Tenure</p>
                      <p className="text-xl font-bold">{result.new_tenure_months} months</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-sm text-muted-foreground mb-1">Tenure Reduction</p>
                    <p className="text-2xl font-bold text-accent">
                      {result.tenure_reduction_months} months
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-card border">
                    <p className="text-sm font-medium mb-2">Summary</p>
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Enter loan details and click "Calculate Impact" to see results
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default LoanPrepayment;
