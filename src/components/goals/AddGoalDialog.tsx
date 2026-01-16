
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createGoal } from "@/services/goalsService";
import { toast } from "sonner";

export function AddGoalDialog({ onGoalAdded }: { onGoalAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        target: "",
        current: "",
        deadline: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createGoal({
                name: formData.name,
                target: Number(formData.target),
                current: Number(formData.current),
                deadline: formData.deadline,
                monthlyRequired: 0, // Calculate this or backend logic
                probability: 50, // Default or calc
                status: "on-track",
                color: "hsl(142, 70%, 40%)", // Default color
                createdAt: new Date()
            });

            toast.success("Goal added successfully");
            setOpen(false);
            setFormData({ name: "", target: "", current: "", deadline: "" });
            onGoalAdded();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add goal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="warm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Goal
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Goal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Goal Name</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. New Car"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target">Target Amount (₹)</Label>
                            <Input
                                id="target"
                                type="number"
                                required
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                placeholder="500000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current">Current Saved (₹)</Label>
                            <Input
                                id="current"
                                type="number"
                                required
                                value={formData.current}
                                onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                                placeholder="50000"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deadline">Target Date</Label>
                        <Input
                            id="deadline"
                            type="date"
                            required
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Adding..." : "Create Goal"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
