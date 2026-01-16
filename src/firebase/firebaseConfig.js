import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvbeBJ2UV5X6OuDh26qNwinA6uY1p56dM",
  authDomain: "wealthwise-af0e4.firebaseapp.com",
  projectId: "wealthwise-af0e4",
  storageBucket: "wealthwise-af0e4.firebasestorage.app",
  messagingSenderId: "948463508452",
  appId: "1:948463508452:web:6e9f8e4e63a735db3185f1",
  measurementId: "G-BVQ2ZZ8TLS",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);
