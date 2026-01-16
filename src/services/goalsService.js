import { auth, db } from "@/firebase/firebaseConfig";
import { addDoc, collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export const createGoal = async (goal) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("createGoal: No user logged in");
    throw new Error("User not logged in");
  }

  console.log("Creating goal for user:", user.uid);

  try {
    const docRef = await addDoc(
      collection(db, "users", user.uid, "goals"),
      {
        ...goal,
        uid: user.uid,
        createdAt: serverTimestamp(),
      }
    );
    console.log("Goal created with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error creating goal:", error);
    throw error;
  }
};

export const getGoals = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error("getGoals: No user logged in");
    throw new Error("User not logged in");
  }

  const snap = await getDocs(
    collection(db, "users", user.uid, "goals")
  );
  return snap.docs.map(d => {
    const data = d.data();
    const metrics = calculateGoalMetrics(data);
    return { id: d.id, ...data, ...metrics };
  });
};

const calculateGoalMetrics = (goal) => {
  const target = Number(goal.target) || 0;
  const current = Number(goal.current) || 0;
  // If we have deadline, parse it
  const deadline = goal.deadline ? new Date(goal.deadline) : new Date();
  const today = new Date();

  // Months remaining
  const monthsRemaining = (deadline.getFullYear() - today.getFullYear()) * 12 + (deadline.getMonth() - today.getMonth());
  const safeMonths = Math.max(monthsRemaining, 1);

  // Monthly Required
  const remainingAmount = Math.max(0, target - current);
  const monthlyRequired = Math.round(remainingAmount / safeMonths);

  // Status & Probability Logic
  // Simple check: If we have 0 months left and not reached target -> At Risk
  if (monthsRemaining <= 0 && current < target) {
    return {
      monthlyRequired,
      status: "at-risk",
      probability: 10,
      color: "hsl(0, 84%, 60%)" // Red
    };
  }

  // If we need > 20% of the TOTAL target per month, it's risky
  const percentNeededPerMonth = target > 0 ? (monthlyRequired / target) * 100 : 0;

  let status = "on-track";
  let probability = 90;
  let color = "hsl(142, 70%, 40%)"; // Green

  if (percentNeededPerMonth > 20) {
    status = "at-risk";
    probability = 30;
    color = "hsl(0, 84%, 60%)"; // Red
  } else if (percentNeededPerMonth > 10) {
    status = "at-risk"; // Moderate risk
    probability = 60;
    color = "hsl(48, 96%, 53%)"; // Yellow/Orange
  }

  // Override if completed
  if (current >= target) {
    status = "ahead";
    probability = 100;
  }

  return { monthlyRequired, status, probability, color };
};

export const updateGoal = async (goalId, data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const goalRef = doc(db, "users", user.uid, "goals", goalId);
  return updateDoc(goalRef, data);
};

export const deleteGoal = async (goalId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const goalRef = doc(db, "users", user.uid, "goals", goalId);
  return deleteDoc(goalRef);
};
