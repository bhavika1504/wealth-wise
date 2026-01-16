
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Target, Car, Plane, Home, GraduationCap,
  Plus, Calendar, CheckCircle2, Clock, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getGoals } from "@/services/goalsService";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { toast } from "sonner";

interface Goal {
  id: string;
  name: string;
  icon?: React.ElementType; // Icon might come from meta or handle undefined
  current: number;
  target: number;
  deadline: string;
  monthlyRequired: number;
  probability: number;
  color: string;
  status: "on-track" | "at-risk" | "ahead";
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("Analyzing your goals...");

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await getGoals();
      // Map firestore data to Goal interface with defaults if missing
      const mappedGoals: Goal[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        icon: Target, // Default icon or logic to map name to icon
        current: d.current,
        target: d.target,
        deadline: d.deadline,
        monthlyRequired: d.monthlyRequired || 0,
        probability: d.probability || 50,
        color: d.color || "hsl(142, 70%, 40%)",
        status: d.status || "on-track",
      }));
      setGoals(mappedGoals);
    } catch (error) {
      console.error("Failed to load goals", error);
      toast.error("Could not load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      // Try AI-powered insight first, fallback to local
      import("@/services/aiService").then(async (service) => {
        const goalData = goals.map(g => ({
          name: g.name,
          current: g.current,
          target: g.target,
          status: g.status,
          deadline: g.deadline,
        }));
        
        try {
          const { insight, aiPowered } = await service.getAIGoalInsight(goalData);
          setAiInsight(aiPowered ? `🤖 ${insight}` : insight);
        } catch {
          // Fallback to local
          const insight = service.generateGoalInsight(goalData);
          setAiInsight(insight);
        }
      });
    } else if (!loading) {
      setAiInsight("Add your first financial goal to get personalized recommendations!");
    }
  }, [goals, loading]);

  const totalSaved = goals.reduce((sum, goal) => sum + goal.current, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Goal Planner
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your financial goals and get AI-powered recommendations
          </p>
        </div>
        <AddGoalDialog onGoalAdded={loadGoals} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <p className="text-muted-foreground text-sm">Total Saved</p>
          <p className="font-serif text-3xl font-bold text-foreground mt-2">
            ₹{totalSaved.toLocaleString()}
          </p>
          <Progress value={totalTarget ? Math.min(100, (totalSaved / totalTarget) * 100) : 0} className="mt-3" />
          <p className="text-muted-foreground text-xs mt-2">
            {totalTarget ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0}% of ₹{totalTarget.toLocaleString()}
          </p>
        </div>

        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
          <p className="text-muted-foreground text-sm">Active Goals</p>
          <p className="font-serif text-3xl font-bold text-foreground mt-2">
            {goals.length}
          </p>
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3 w-3" /> {goals.filter(g => g.status === 'on-track' || g.status === 'ahead').length} on track
            </span>
            <span className="flex items-center gap-1 text-xs text-warning">
              <Clock className="h-3 w-3" /> {goals.filter(g => g.status === 'at-risk').length} at risk
            </span>
          </div>
        </div>

        <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">AI Suggestion</p>
              <p className="text-sm text-muted-foreground mt-1">
                {aiInsight}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          No goals found. Start by adding one!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal, index) => {
            const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const Icon = goal.icon || Target;

            return (
              <div
                key={goal.id}
                className="card-warm p-6 animate-fade-up cursor-pointer hover:shadow-warm transition-all duration-300"
                style={{ animationDelay: `${250 + index * 50} ms` }}
                onClick={() => setSelectedGoal(goal)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${goal.color} 20` }}
                    >
                      <Icon
                        className="h-7 w-7"
                        style={{ color: goal.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-foreground">
                        {goal.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{goal.deadline}</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    goal.status === "ahead" && "bg-success/10 text-success",
                    goal.status === "on-track" && "bg-primary/10 text-primary",
                    goal.status === "at-risk" && "bg-warning/10 text-warning"
                  )}>
                    {goal.status === "ahead" ? "Ahead" : goal.status === "on-track" ? "On Track" : "At Risk"}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-foreground">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>₹{goal.current.toLocaleString()}</span>
                      <span>₹{goal.target.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Required</p>
                      <p className="font-semibold text-foreground">
                        ₹{goal.monthlyRequired.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Success Probability</p>
                      <p className={cn(
                        "font-semibold",
                        goal.probability >= 80 ? "text-success" :
                          goal.probability >= 60 ? "text-warning" : "text-destructive"
                      )}>
                        {goal.probability}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
};

export default Goals;

