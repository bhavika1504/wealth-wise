import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth, db } from "@/firebase/firebaseConfig";
import { onAuthStateChanged, signOut, updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Mail,
  Calendar,
  Loader2,
  Save,
  Settings as SettingsIcon,
  Smartphone,
  TrendingUp,
  Target,
  AlertTriangle,
  CreditCard,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  name: string;
  email: string;
  photoURL?: string;
  createdAt?: Date;
  lastLogin?: Date;
}

interface NotificationSettings {
  emailNotifications: boolean;
  goalReminders: boolean;
  spendingAlerts: boolean;
  investmentUpdates: boolean;
  weeklyReports: boolean;
  budgetWarnings: boolean;
}

interface Preferences {
  currency: string;
  language: string;
}

const Settings = () => {
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    photoURL: "",
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    name: "",
    email: "",
  });

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    goalReminders: true,
    spendingAlerts: true,
    investmentUpdates: false,
    weeklyReports: true,
    budgetWarnings: true,
  });

  // Preferences
  const [preferences, setPreferences] = useState<Preferences>({
    currency: "INR",
    language: "en",
  });

  // Login details
  const [loginDetails, setLoginDetails] = useState({
    provider: "email",
    lastLogin: "",
    accountCreated: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      // Fetch user data from Firestore
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      const userData = snap.exists() ? snap.data() : {};

      const profileData: UserProfile = {
        name: userData.name || currentUser.displayName || "",
        email: currentUser.email || "",
        photoURL: currentUser.photoURL || "",
        createdAt: userData.createdAt?.toDate?.() || (currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : new Date()),
        lastLogin: currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime) : undefined,
      };

      setProfile(profileData);
      setEditedProfile({
        name: profileData.name,
        email: profileData.email,
      });

      // Load notification settings
      if (userData.notifications) {
        setNotifications(userData.notifications);
      }

      // Load preferences
      if (userData.preferences) {
        setPreferences(userData.preferences);
      }

      // Set login details
      const providerId = currentUser.providerData[0]?.providerId || "email";
      setLoginDetails({
        provider: providerId === "google.com" ? "Google" : "Email & Password",
        lastLogin: currentUser.metadata.lastSignInTime
          ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          : "Unknown",
        accountCreated: currentUser.metadata.creationTime
          ? new Date(currentUser.metadata.creationTime).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          : "Unknown",
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: editedProfile.name,
      });

      // Update Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          name: editedProfile.name,
          email: editedProfile.email,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setProfile((prev) => ({
        ...prev,
        name: editedProfile.name,
        email: editedProfile.email,
      }));

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        notifications: notifications,
        updatedAt: new Date(),
      });

      toast.success("Notification preferences saved!");
    } catch (error: any) {
      console.error("Failed to save notifications:", error);
      toast.error(error.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to log out");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* User Profile Section */}
        <Card className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.photoURL} alt={profile.name} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {getInitials(profile.name || "U")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{profile.name || "User"}</h3>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <Separator />

            {/* Edit Form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={editedProfile.name}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={editedProfile.email}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed for security reasons
                </p>
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="animate-fade-up" style={{ animationDelay: "150ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="ml-6">Appearance</span>
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTheme("system")}
              >
                <Laptop className="h-4 w-4" />
                System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({
                      ...prev,
                      emailNotifications: checked,
                    }))
                  }
                />
              </div>

              {/* Goal Reminders */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Goal Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about your financial goals progress
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.goalReminders}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({
                      ...prev,
                      goalReminders: checked,
                    }))
                  }
                />
              </div>

              {/* Spending Alerts */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Spending Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Alerts when you exceed category budgets
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.spendingAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({
                      ...prev,
                      spendingAlerts: checked,
                    }))
                  }
                />
              </div>

              {/* Investment Updates */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Investment Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Portfolio performance and market updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.investmentUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({
                      ...prev,
                      investmentUpdates: checked,
                    }))
                  }
                />
              </div>

              {/* Weekly Reports */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of your finances
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({
                      ...prev,
                      weeklyReports: checked,
                    }))
                  }
                />
              </div>

              {/* Budget Warnings */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Budget Warnings</p>
                    <p className="text-sm text-muted-foreground">
                      Warnings when approaching budget limits
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.budgetWarnings}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({
                      ...prev,
                      budgetWarnings: checked,
                    }))
                  }
                />
              </div>
            </div>

            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Preferences
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Login & Security */}
        <Card className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Login & Security
            </CardTitle>
            <CardDescription>
              Your account security information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Sign-in Method</p>
                <p className="font-medium mt-1">{loginDetails.provider}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Account Created</p>
                <p className="font-medium mt-1">{loginDetails.accountCreated}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 sm:col-span-2">
                <p className="text-sm text-muted-foreground">Last Login</p>
                <p className="font-medium mt-1">{loginDetails.lastLogin}</p>
              </div>
            </div>

            <Separator />

            {/* Logout Button */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="font-medium text-destructive">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out from your account on this device
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will need to sign in again to access your financial dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>
                      Yes, Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout >
  );
};

export default Settings;
