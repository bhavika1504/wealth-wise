import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { toast } from "@/components/ui/use-toast";
import { auth, googleProvider } from "@/firebase/auth";
import { db } from "@/firebase/db";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Lock, Mail, TrendingUp } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 🔐 EMAIL + PASSWORD LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: "Welcome back 👋",
        description: "Logged in successfully.",
      });

      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔵 GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      // Create user doc on first login
      if (!snap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          createdAt: new Date(),
        });
      }

      toast({
        title: "Welcome 👋",
        description: "Logged in with Google",
      });

      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Google login failed",
        description: err.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-border shadow-lg animate-fade-up">

        {/* LEFT PANEL */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-primary/90 to-accent/80 p-8 text-primary-foreground">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-4">
              Wealth Wise
            </h2>
            <p className="text-sm opacity-90 leading-relaxed">
              Track spending, plan goals, and simulate your future — all in one
              intelligent finance dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm opacity-90">
            <TrendingUp className="h-4 w-4" />
            Smarter money decisions, every day
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-card p-8">
          <div className="mb-6">
            <h3 className="font-serif text-2xl font-bold text-foreground">
              Sign In
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Continue to your finance dashboard
            </p>
          </div>

          {/* GOOGLE BUTTON */}
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>

          <div className="text-center text-sm text-muted-foreground mb-4">
            or
          </div>

          {/* EMAIL LOGIN */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Don’t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
