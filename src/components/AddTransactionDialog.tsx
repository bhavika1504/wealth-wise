
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { addTransaction } from "@/services/transactionService";
import { categorizeTransaction } from "@/services/mlService";

// Standard categories matches Spending.tsx
const CATEGORIES = [
    "Food & Dining",
    "Rent",
    "Transportation",
    "Shopping",
    "Utilities",
    "Entertainment",
    "Healthcare",
    "Education",
    "Investment",
    "Transfer",
    "Other"
];

interface AddTransactionDialogProps {
    onTransactionAdded?: () => void;
}

export function AddTransactionDialog({ onTransactionAdded }: AddTransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [predicting, setPredicting] = useState(false);

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCategoryChange = (value: string) => {
        setFormData((prev) => ({ ...prev, category: value }));
    };

    const predictCategory = async () => {
        if (!formData.description) return;

        setPredicting(true);
        try {
            const result = await categorizeTransaction(formData.description);

            // Match backend category to our list if possible
            // (The backend assumes capital case, e.g. "Food", "Transport")
            // We map it to our standardized list
            let predicted = result.category;

            // Simple mapping logic (adjust as needed based on backend vs frontend mismatch)
            if (predicted === "Food") predicted = "Food & Dining";
            if (predicted === "Transport") predicted = "Transportation";
            if (predicted === "Health") predicted = "Healthcare";
            if (!CATEGORIES.includes(predicted)) {
                // Try to find partial match
                const match = CATEGORIES.find(c => c.toLowerCase().includes(predicted.toLowerCase()) || predicted.toLowerCase().includes(c.toLowerCase()));
                if (match) predicted = match;
            }

            if (CATEGORIES.includes(predicted)) {
                setFormData((prev) => ({ ...prev, category: predicted }));
                toast.success(`Category auto-detected: ${predicted}`);
            } else {
                toast.info(`Suggested category: ${predicted}`);
            }
        } catch (error) {
            console.error("Prediction failed", error);
        } finally {
            setPredicting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description || !formData.amount || !formData.category) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            await addTransaction({
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                createdAt: new Date(formData.date),
            });

            toast.success("Transaction added successfully");
            setOpen(false);
            setFormData({
                description: "",
                amount: "",
                category: "",
                date: new Date().toISOString().split("T")[0],
            });
            onTransactionAdded?.();

            // Reload page to reflect changes (temporary fix until state management is improved)
            setTimeout(() => window.location.reload(), 500);

        } catch (error) {
            console.error("Failed to add transaction", error);
            toast.error("Failed to add transaction");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                        Enter transaction details. Categories can be auto-detected.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <div className="relative">
                            <Input
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                onBlur={predictCategory}
                                placeholder="e.g. Starbucks, Uber, Rent"
                            />
                            {predicting && (
                                <div className="absolute right-3 top-2.5">
                                    <Wand2 className="h-4 w-4 animate-pulse text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={handleInputChange}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={handleCategoryChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Transaction
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
