import { auth, db } from "@/firebase/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

import { GoalsProgress } from "@/components/dashboard/GoalsProgress";
import { InvestmentSummary } from "@/components/dashboard/InvestmentSummary";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { WellBeingScore } from "@/components/dashboard/WellBeingScore";
import { MainLayout } from "@/components/layout/MainLayout";

const Index = () => {
  const [name, setName] = useState("User");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      // 1️⃣ Firestore name
      if (snap.exists() && snap.data().name) {
        setName(snap.data().name);
        return;
      }

      // 2️⃣ Auth displayName fallback
      if (user.displayName) {
        setName(user.displayName);

        // Auto-heal old accounts
        await setDoc(
          userRef,
          {
            name: user.displayName,
            email: user.email,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        return;
      }

      // 3️⃣ Default
      setName("User");
    });

    return () => unsubscribe();
  }, [navigate]);

  // 🔴 LOGOUT HANDLER
  const handleLogout = async () => {
    try {
      await signOut(auth);

      toast({
        title: "Logged out 👋",
        description: "See you again soon!",
      });

      navigate("/login");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: err.message,
      });
    }
  };
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 24) return "Good Evening";
  };

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            {getGreeting()}, <span className="gradient-text">{name}</span>
          </h1>

          <p className="text-muted-foreground mt-2">
            Here's your financial overview for today
          </p>
        </div>

        {/* LOGOUT BUTTON */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="h-9"
        >
          Logout
        </Button>
      </div>

      <QuickStats />
      <WellBeingScore />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SpendingChart />
        <GoalsProgress />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvestmentSummary />
        <RecentAlerts />
      </div>
    </MainLayout>
  );
};

export default Index;
