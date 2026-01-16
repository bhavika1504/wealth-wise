import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  AlertTriangle, Target, Sparkles, TrendingDown,
  PiggyBank, Bell, Check, X, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { getAlerts, markAsRead as markAsReadService, deleteAlert as deleteService, generateSmartAlerts, Alert } from "@/services/alertsService";
import { toast } from "sonner";
import { EmailSettings } from "@/components/alerts/EmailSettings";

const ICON_MAP = {
  warning: AlertTriangle,
  success: Target,
  info: Sparkles,
  danger: TrendingDown,
};

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "warning" | "success">("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Generate new alerts based on current data
        await generateSmartAlerts(user.uid);

        // 2. Fetch all alerts
        refreshAlerts(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const refreshAlerts = async (uid: string) => {
    setLoading(true);
    const data = await getAlerts(uid);
    setAlerts(data);
    setLoading(false);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    if (filter === "unread") return !alert.read;
    return alert.type === filter;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = async (id: string) => {
    // Optimistic update
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
    await markAsReadService(id);
  };

  const markAllAsRead = async () => {
    // Optimistic
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
    // In real app, we'd have a batch update service function
    alerts.forEach(a => {
      if (!a.read) markAsReadService(a.id);
    });
  };

  const dismissAlert = async (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
    await deleteService(id);
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Alerts & Notifications
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay informed about your financial health
          </p>
        </div>
        <div className="flex gap-2">
          <EmailSettings />
          <Button variant="outline" onClick={async () => {
            const user = auth.currentUser;
            if (user) {
              toast.info("Generating alerts...");
              try {
                await generateSmartAlerts(user.uid);
                toast.success("Alerts updated!");

                try {
                  const fetched = await getAlerts(user.uid);
                  toast.info(`Fetched ${fetched.length} alerts.`);
                  if (fetched.length === 0) {
                    toast.warning("Fetch returned 0. Check Console for Index URL?");
                  } else {
                    window.location.reload();
                  }
                } catch (fetchErr: any) {
                  toast.error("Fetch Error: " + fetchErr.message);
                  // If it's an index error, the message usually contains a link.
                  if (fetchErr.message.includes("index")) {
                    prompt("Copy this Index URL:", fetchErr.message);
                  }
                }

              } catch (e: any) {
                toast.error("Gen Error: " + e.message);
              }
            }
          }}>
            Debug Alerts
          </Button>
          {unreadCount > 0 && (
            <Button variant="soft" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "warning", label: "Warnings" },
          { key: "success", label: "Achievements" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              filter === f.key
                ? "bg-primary text-primary-foreground shadow-warm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card-warm p-4 animate-fade-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
            </div>
          </div>
        </div>
        <div className="card-warm p-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-2xl font-bold text-warning">
                {alerts.filter((a) => a.type === "warning").length}
              </p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </div>
        </div>
        <div className="card-warm p-4 animate-fade-up" style={{ animationDelay: "250ms" }}>
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold text-success">
                {alerts.filter((a) => a.type === "success").length}
              </p>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </div>
          </div>
        </div>
        <div className="card-warm p-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {alerts.filter((a) => a.type === "info").length}
              </p>
              <p className="text-sm text-muted-foreground">AI Insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No alerts to show</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => {
            const Icon = ICON_MAP[alert.type] || Bell;
            return (
              <div
                key={alert.id}
                className={cn(
                  "card-warm p-5 animate-fade-up transition-all duration-200",
                  !alert.read && "ring-2 ring-primary/20"
                )}
                style={{ animationDelay: `${350 + index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      alert.type === "warning" && "bg-warning/10",
                      alert.type === "success" && "bg-success/10",
                      alert.type === "info" && "bg-primary/10",
                      alert.type === "danger" && "bg-destructive/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        alert.type === "warning" && "text-warning",
                        alert.type === "success" && "text-success",
                        alert.type === "info" && "text-primary",
                        alert.type === "danger" && "text-destructive"
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-foreground">{alert.title}</h3>
                        <p className="text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                      {!alert.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                      <div className="flex gap-2">
                        {!alert.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                            className="text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Mark read
                          </Button>
                        )}
                        {alert.actionable && alert.actionLink && (
                          <Button
                            variant="soft"
                            size="sm"
                            className="text-xs"
                            onClick={() => navigate(alert.actionLink!)}
                          >
                            Take Action
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MainLayout>
  );
};

export default Alerts;
