import { auth, db } from "@/firebase/firebaseConfig";
import {
    collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, Timestamp, orderBy, getDoc, setDoc
} from "firebase/firestore";
import { getUserTransactions } from "./transactionService";
import { getGoals } from "./goalsService";
import { getInvestments } from "./investmentsService";
import axios from "axios";

export interface Alert {
    id: string;
    type: "warning" | "success" | "info" | "danger";
    title: string;
    message: string;
    time: string;
    createdAt: number; // Unix timestamp
    read: boolean;
    actionable: boolean;
    actionLink?: string;
    emailSent?: boolean;
}

export interface EmailPreferences {
    enabled: boolean;
    types: ("warning" | "success" | "info" | "danger")[];
    frequency: "instant" | "daily" | "weekly";
}

const LOCAL_STORAGE_KEY = "wealthwise_alerts";
const EMAIL_API_BASE = "http://localhost:8000/api/email";

// ============== LOCAL STORAGE (for backward compatibility) ==============

const getLocalAlerts = (): Alert[] => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalAlerts = (alerts: Alert[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alerts));
};

// ============== FIRESTORE OPERATIONS ==============

export const getAlerts = async (userId: string): Promise<Alert[]> => {
    try {
        // Try Firestore first
        const alertsRef = collection(db, "users", userId, "alerts");
        const snapshot = await getDocs(query(alertsRef, orderBy("createdAt", "desc")));
        
        if (!snapshot.empty) {
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Alert));
        }
    } catch (error) {
        console.log("Firestore alerts not available, using local storage");
    }
    
    // Fallback to local storage
    const alerts = getLocalAlerts();
    return alerts.sort((a, b) => b.createdAt - a.createdAt);
};

export const addAlertToFirestore = async (userId: string, alert: Omit<Alert, "id">): Promise<string> => {
    try {
        const alertsRef = collection(db, "users", userId, "alerts");
        const docRef = await addDoc(alertsRef, {
            ...alert,
            createdAt: Date.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Failed to add alert to Firestore:", error);
        throw error;
    }
};

export const markAsRead = async (alertId: string) => {
    const user = auth.currentUser;
    
    if (user) {
        try {
            const alertRef = doc(db, "users", user.uid, "alerts", alertId);
            await updateDoc(alertRef, { read: true });
            return;
        } catch (error) {
            console.log("Firestore update failed, using local storage");
        }
    }
    
    // Fallback to local storage
    const alerts = getLocalAlerts();
    const updated = alerts.map(a => a.id === alertId ? { ...a, read: true } : a);
    saveLocalAlerts(updated);
};

export const deleteAlert = async (alertId: string) => {
    const user = auth.currentUser;
    
    if (user) {
        try {
            const alertRef = doc(db, "users", user.uid, "alerts", alertId);
            await deleteDoc(alertRef);
            return;
        } catch (error) {
            console.log("Firestore delete failed, using local storage");
        }
    }
    
    // Fallback to local storage
    const alerts = getLocalAlerts();
    const updated = alerts.filter(a => a.id !== alertId);
    saveLocalAlerts(updated);
};

// ============== EMAIL PREFERENCES ==============

export const getEmailPreferences = async (userId: string): Promise<EmailPreferences> => {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().emailPreferences) {
            return userDoc.data().emailPreferences as EmailPreferences;
        }
    } catch (error) {
        console.error("Failed to get email preferences:", error);
    }
    
    // Default preferences
    return {
        enabled: false,
        types: ["warning", "danger"],
        frequency: "instant",
    };
};

export const saveEmailPreferences = async (userId: string, preferences: EmailPreferences): Promise<void> => {
    try {
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { emailPreferences: preferences }, { merge: true });
    } catch (error) {
        console.error("Failed to save email preferences:", error);
        throw error;
    }
};

// ============== SEND EMAIL ALERT ==============

export const sendEmailAlert = async (
    userId: string,
    alert: Omit<Alert, "id">,
    email: string,
    userName?: string
): Promise<boolean> => {
    try {
        const response = await axios.post(`${EMAIL_API_BASE}/send`, {
            email,
            alert: {
                type: alert.type,
                title: alert.title,
                message: alert.message,
                actionLink: alert.actionLink,
            },
            userName,
        });
        
        return response.data.success;
    } catch (error) {
        console.error("Failed to send email alert:", error);
        return false;
    }
};

export const testEmailNotification = async (email: string): Promise<boolean> => {
    try {
        const response = await axios.post(`${EMAIL_API_BASE}/test`, {
            email,
        });
        
        return response.data.success;
    } catch (error) {
        console.error("Failed to send test email:", error);
        return false;
    }
};

export const checkEmailHealth = async (): Promise<{ configured: boolean; status: string; message: string }> => {
    try {
        const response = await axios.get(`${EMAIL_API_BASE}/health`);
        return response.data;
    } catch (error) {
        return {
            configured: false,
            status: "error",
            message: "Email service unavailable",
        };
    }
};

export const generateSmartAlerts = async (userId: string) => {
    try {
        // 1. Fetch Data
        const transactions = await getUserTransactions(userId).catch(() => []);
        const goals = await getGoals().catch(() => []);
        const investments = await getInvestments().catch(() => []);

        // Get existing alerts (from Firestore or local)
        const existingAlerts = await getAlerts(userId);
        const localAlerts = getLocalAlerts();
        const alertsToAdd: Partial<Alert>[] = [];

        // 0. Welcome Alert
        if (existingAlerts.length === 0 && localAlerts.length === 0) {
            alertsToAdd.push({
                type: "info",
                title: "Welcome to WealthWise! 👋",
                message: "This is your Alerts center. Important financial updates and insights will appear here. Enable email notifications in settings to stay informed!",
                actionable: true,
                actionLink: "/dashboard",
            });
        }

        // 2. Spending Logic (Warning) - expenses are negative amounts
        const totalSpending = (transactions as any[])
            .filter((t: any) => t.amount < 0) // Only expenses (negative)
            .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount || 0)), 0);

        if (totalSpending > 50000) { // Example threshold
            alertsToAdd.push({
                type: "warning",
                title: "High Spending Alert",
                message: `You've spent ₹${totalSpending.toLocaleString()} this month. Keep an eye on your budget!`,
                actionable: true,
                actionLink: "/spending"
            });
        }

        // Low spending (good news!)
        if (totalSpending > 0 && totalSpending < 20000) {
            alertsToAdd.push({
                type: "success",
                title: "Great Savings Month!",
                message: `Your spending this month is only ₹${totalSpending.toLocaleString()}. Keep up the good work!`,
                actionable: false,
            });
        }

        // 3. Goal Logic
        const completedGoals = goals.filter((g: any) => g.current >= g.target);
        if (completedGoals.length > 0) {
            alertsToAdd.push({
                type: "success",
                title: "🎉 Goal Achieved!",
                message: `Congrats! You've reached your goal: ${completedGoals[0].name}.`,
                actionable: true,
                actionLink: "/goals"
            });
        }

        // At-risk goals
        const atRiskGoals = goals.filter((g: any) => {
            const progress = g.target > 0 ? (g.current / g.target) * 100 : 0;
            return progress < 30 && g.status === "at-risk";
        });
        if (atRiskGoals.length > 0) {
            alertsToAdd.push({
                type: "warning",
                title: "Goal Needs Attention",
                message: `"${atRiskGoals[0].name}" is behind schedule. Consider increasing monthly contributions.`,
                actionable: true,
                actionLink: "/goals"
            });
        }

        // 4. Investment Logic
        const negativeInvestments = investments.filter((i: any) => i.change < -5);
        if (negativeInvestments.length > 0) {
            alertsToAdd.push({
                type: "danger",
                title: "📉 Portfolio Drop Alert",
                message: `${negativeInvestments[0].name} is down by ${Math.abs(negativeInvestments[0].change).toFixed(1)}%. Review your portfolio.`,
                actionable: true,
                actionLink: "/investments"
            });
        }

        // Positive investment performance
        const positiveInvestments = investments.filter((i: any) => i.change > 10);
        if (positiveInvestments.length > 0) {
            alertsToAdd.push({
                type: "success",
                title: "📈 Investment Performing Well",
                message: `${positiveInvestments[0].name} is up ${positiveInvestments[0].change.toFixed(1)}%! Consider rebalancing if needed.`,
                actionable: true,
                actionLink: "/investments"
            });
        }

        // Check email preferences
        let emailPrefs: EmailPreferences | null = null;
        let userEmail: string | null = null;
        
        try {
            emailPrefs = await getEmailPreferences(userId);
            userEmail = auth.currentUser?.email || null;
        } catch {
            // Email not available
        }

        let hasNew = false;
        for (const alert of alertsToAdd) {
            // Duplicate Check - check both existing and local
            const allAlerts = [...existingAlerts, ...localAlerts];
            const isDuplicate = allAlerts.some(a => a.title === alert.title && !a.read);
            
            if (!isDuplicate) {
                const newAlert: Alert = {
                    id: Math.random().toString(36).substring(7),
                    ...alert as any,
                    read: false,
                    createdAt: Date.now(),
                    time: "Just now",
                    emailSent: false,
                };
                
                // Try to save to Firestore (will trigger email via Cloud Function)
                try {
                    const firestoreId = await addAlertToFirestore(userId, newAlert);
                    newAlert.id = firestoreId;
                } catch {
                    // Firestore failed, save locally
                    localAlerts.push(newAlert);
                }
                
                // Manual email send if Firestore trigger didn't work and email is enabled
                if (emailPrefs?.enabled && userEmail && emailPrefs.types.includes(alert.type as any)) {
                    try {
                        await sendEmailAlert(userId, newAlert, userEmail);
                        newAlert.emailSent = true;
                    } catch {
                        console.log("Email send failed");
                    }
                }
                
                hasNew = true;
            }
        }

        if (hasNew) {
            saveLocalAlerts(localAlerts);
        }

    } catch (error) {
        console.error("Error generating smart alerts:", error);
    }
};
