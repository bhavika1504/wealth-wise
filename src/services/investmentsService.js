import { auth, db } from "@/firebase/firebaseConfig";
import { addDoc, collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

export const addInvestment = async (data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  
  return addDoc(
    collection(db, "users", user.uid, "investments"),
    {
      ...data,
      createdAt: new Date(),
    }
  );
};

export const getInvestments = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  
  const snap = await getDocs(
    collection(db, "users", user.uid, "investments")
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateInvestment = async (investmentId, data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  
  const investmentRef = doc(db, "users", user.uid, "investments", investmentId);
  return updateDoc(investmentRef, data);
};

export const deleteInvestment = async (investmentId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  
  const investmentRef = doc(db, "users", user.uid, "investments", investmentId);
  return deleteDoc(investmentRef);
};
