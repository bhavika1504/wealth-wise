import { Target, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getGoals } from "@/services/goalsService";
import { Link } from "react-router-dom";

interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
  deadline: string;
  color: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  "ahead": "bg-success",
  "on-track": "bg-primary",
  "at-risk": "bg-warning",
};

export function GoalsProgress() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const data = await getGoals();
        const mapped: Goal[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          current: d.current || 0,
          target: d.target || 1,
          deadline: d.deadline || "No deadline",
          color: d.color || "hsl(142, 70%, 40%)",
          status: d.status || "on-track",
        }));
        setGoals(mapped.slice(0, 4)); // Show top 4 goals
      } catch (error) {
        console.error("Failed to load goals:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, []);

  if (loading) {
    return (
      <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-xl font-semibold text-foreground">
            Goals Progress
          </h3>
          <Link to="/goals" className="text-primary text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-xl font-semibold text-foreground">
          Goals Progress
        </h3>
        <Link to="/goals" className="text-primary text-sm font-medium hover:underline">
          View All
        </Link>
      </div>

      {goals.length > 0 ? (
        <div className="space-y-6">
          {goals.map((goal) => {
            const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const statusColor = STATUS_COLORS[goal.status] || STATUS_COLORS["on-track"];
            
            return (
              <div key={goal.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      statusColor + "/10"
                    )}>
                      <Target className={cn("h-5 w-5", statusColor.replace("bg-", "text-"))} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">Due {goal.deadline}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{percentage}%</span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹{goal.current.toLocaleString()}</span>
                    <span>₹{goal.target.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Target className="h-12 w-12 mb-3 opacity-30" />
          <p>No goals yet</p>
          <Link to="/goals" className="text-primary text-sm mt-2 hover:underline">
            Create your first goal
          </Link>
        </div>
      )}
    </div>
  );
}
