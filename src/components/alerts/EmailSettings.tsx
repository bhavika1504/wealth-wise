import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Bell, AlertTriangle, CheckCircle2, Info, Loader2, Send } from "lucide-react";
import { auth } from "@/firebase/firebaseConfig";
import {
  getEmailPreferences,
  saveEmailPreferences,
  testEmailNotification,
  checkEmailHealth,
  EmailPreferences,
} from "@/services/alertsService";
import { toast } from "sonner";

export function EmailSettings() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailServiceStatus, setEmailServiceStatus] = useState<{
    configured: boolean;
    status: string;
    message: string;
  } | null>(null);

  const [preferences, setPreferences] = useState<EmailPreferences>({
    enabled: false,
    types: ["warning", "danger"],
    frequency: "instant",
  });

  useEffect(() => {
    if (open && auth.currentUser) {
      loadPreferences();
      setUserEmail(auth.currentUser.email);
      checkEmailStatus();
    }
  }, [open]);

  const loadPreferences = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const prefs = await getEmailPreferences(auth.currentUser.uid);
      setPreferences(prefs);
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEmailStatus = async () => {
    const status = await checkEmailHealth();
    setEmailServiceStatus(status);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    setSaving(true);
    try {
      await saveEmailPreferences(auth.currentUser.uid, preferences);
      toast.success("Email preferences saved!");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!userEmail) {
      toast.error("No email address found");
      return;
    }

    setTestingSend(true);
    try {
      const success = await testEmailNotification(userEmail);
      if (success) {
        toast.success(`Test email sent to ${userEmail}`);
      } else {
        toast.error("Failed to send test email");
      }
    } catch (error) {
      toast.error("Email service unavailable");
    } finally {
      setTestingSend(false);
    }
  };

  const toggleAlertType = (type: "warning" | "success" | "info" | "danger") => {
    setPreferences((prev) => {
      const types = prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type];
      return { ...prev, types };
    });
  };

  const alertTypes = [
    {
      type: "warning" as const,
      label: "Spending Alerts",
      description: "When you exceed budget limits",
      icon: AlertTriangle,
      color: "text-yellow-500",
    },
    {
      type: "danger" as const,
      label: "Critical Alerts",
      description: "Portfolio drops, urgent issues",
      icon: AlertTriangle,
      color: "text-red-500",
    },
    {
      type: "success" as const,
      label: "Achievement Alerts",
      description: "Goal completions, milestones",
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      type: "info" as const,
      label: "Info & Tips",
      description: "Financial insights and recommendations",
      icon: Info,
      color: "text-blue-500",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Email Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email Service Status */}
            {emailServiceStatus && !emailServiceStatus.configured && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">⚠️ Email Setup Required</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {emailServiceStatus.message}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  Add to backend/.env:<br />
                  <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GMAIL_USER=your@gmail.com</code><br />
                  <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx</code>
                </p>
              </div>
            )}

            {emailServiceStatus?.configured && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">✅ Email Service Ready</p>
              </div>
            )}

            {/* User Email Display */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Notifications will be sent to:</p>
              <p className="font-medium">{userEmail || "No email found"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                (Your Google login email)
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via email
                </p>
              </div>
              <Switch
                checked={preferences.enabled}
                onCheckedChange={(enabled) =>
                  setPreferences((prev) => ({ ...prev, enabled }))
                }
              />
            </div>

            {preferences.enabled && (
              <>
                {/* Alert Types */}
                <div className="space-y-3">
                  <Label>Alert Types</Label>
                  <div className="space-y-2">
                    {alertTypes.map((alertType) => (
                      <div
                        key={alertType.type}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                          preferences.types.includes(alertType.type)
                            ? "bg-primary/5 border-primary/20"
                            : "bg-muted/30 border-border"
                        }`}
                        onClick={() => toggleAlertType(alertType.type)}
                      >
                        <div className="flex items-center gap-3">
                          <alertType.icon
                            className={`h-4 w-4 ${alertType.color}`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {alertType.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {alertType.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.types.includes(alertType.type)}
                          onCheckedChange={() => toggleAlertType(alertType.type)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Notification Frequency</Label>
                  <Select
                    value={preferences.frequency}
                    onValueChange={(value: "instant" | "daily" | "weekly") =>
                      setPreferences((prev) => ({ ...prev, frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Instant (Recommended)
                        </div>
                      </SelectItem>
                      <SelectItem value="daily">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Daily Digest
                        </div>
                      </SelectItem>
                      <SelectItem value="weekly">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Weekly Summary
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Email */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleTestEmail}
                    disabled={testingSend || !userEmail}
                  >
                    {testingSend ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Test Email
                  </Button>
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
