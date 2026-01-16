import { auth, db } from "@/firebase/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

/**
 * Get transactions for logged-in user
 * @param uid - Optional user ID (uses current user if not provided)
 */
export const getUserTransactions = async (uid?: string) => {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) throw new Error("User not logged in");

  const q = query(
    collection(db, "transactions"),
    where("uid", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Add a transaction for logged-in user
 */
export const addTransaction = async (transaction: {
  amount: number;
  category: string;
  description?: string;
  createdAt?: Date;
}) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  // Use provided date or current timestamp
  const timestamp = transaction.createdAt
    ? Timestamp.fromDate(transaction.createdAt)
    : Timestamp.now();

  const docRef = await addDoc(collection(db, "transactions"), {
    uid: user.uid,
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description || "",
    createdAt: timestamp,
  });

  return docRef.id;
};

/**
 * Delete a transaction by ID
 */
export const deleteTransaction = async (transactionId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  await deleteDoc(doc(db, "transactions", transactionId));
  return transactionId;
};

/**
 * Delete multiple transactions
 */
export const deleteMultipleTransactions = async (transactionIds: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const batch = writeBatch(db);
  
  transactionIds.forEach((id) => {
    const docRef = doc(db, "transactions", id);
    batch.delete(docRef);
  });

  await batch.commit();
  return transactionIds;
};

/**
 * Delete all transactions for the current user
 */
export const deleteAllTransactions = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const transactions = await getUserTransactions(user.uid);
  const batch = writeBatch(db);
  
  transactions.forEach((tx: any) => {
    const docRef = doc(db, "transactions", tx.id);
    batch.delete(docRef);
  });

  await batch.commit();
  return transactions.length;
};
