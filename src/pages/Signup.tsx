import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { toast } from "@/components/ui/use-toast";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/db";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Lock, Mail, Sparkles, User } from "lucide-react";

/* ================= PASSWORD VALIDATION ================= */
const validatePassword = (password: string) => {
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

  return passwordRegex.test(password);
};

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ================= SIGNUP HANDLER ================= */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description:
          "Password must be at least 8 characters long and include letters, numbers, and special characters.",
      });
      return;
    }

    setLoading(true);

    try {
      // 🔐 Create Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 🧾 Save display name in Auth
      await updateProfile(user, { displayName: name });

      // 🗄️ Save user in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Account created 🎉",
        description: "Please login to continue.",
      });

      navigate("/login");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-border shadow-lg animate-fade-up">

        {/* LEFT PANEL */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-primary/90 to-accent/80 p-8 text-primary-foreground">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-4">
              Create Your Account
            </h2>
            <p className="text-sm opacity-90 leading-relaxed">
              Build smarter money habits, track spending, and visualize your
              future — all in one place.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm opacity-90">
            <Sparkles className="h-4 w-4" />
            Designed for modern finance
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-card p-8">
          <div className="mb-6">
            <h3 className="font-serif text-2xl font-bold text-foreground">
              Sign Up
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Start managing your finances today
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name */}
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password (8+ chars, letters, numbers & symbols)"
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
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
