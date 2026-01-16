import { useEffect, useState } from "react";
import { AlertTriangle, TrendingDown, Target, Sparkles, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAlerts, Alert } from "@/services/alertsService";
import { auth } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const ICON_MAP = {
  warning: AlertTriangle,
  success: Target,
  info: Sparkles,
  danger: TrendingDown,
};

export function RecentAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const data = await getAlerts(user.uid);
        // Sort: Unread first, then by creation time (index)
        const sorted = data.sort((a, b) => (Number(b.read) - Number(a.read)));
        setAlerts(sorted.slice(0, 3));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="card-warm p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-xl font-semibold text-foreground">
          Recent Alerts
        </h3>
        <a href="/alerts" className="text-primary text-sm font-medium hover:underline">
          View All
        </a>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center">
            All caught up! No new alerts.
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = ICON_MAP[alert.type] || Bell;
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-soft",
                  alert.type === "warning" && "bg-warning/5 border-warning/20",
                  alert.type === "success" && "bg-success/5 border-success/20",
                  alert.type === "info" && "bg-primary/5 border-primary/20",
                  alert.type === "danger" && "bg-destructive/10 border-destructive/20"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  alert.type === "warning" && "bg-warning/10",
                  alert.type === "success" && "bg-success/10",
                  alert.type === "info" && "bg-primary/10",
                  alert.type === "danger" && "bg-destructive/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    alert.type === "warning" && "text-warning",
                    alert.type === "success" && "text-success",
                    alert.type === "info" && "text-primary",
                    alert.type === "danger" && "text-destructive"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground line-clamp-1">{alert.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{alert.time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
