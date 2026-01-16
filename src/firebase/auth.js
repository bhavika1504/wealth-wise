import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

// ⚠️ make sure this path is correct
import { app } from "./firebaseConfig";


export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();


// 🔐 Google sign-in
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// 🚪 Logout
export const logout = async () => {
  await signOut(auth);
};

// 👀 Auth state listener
export const monitorAuthState = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user ?? null);
  });
};
