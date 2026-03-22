import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBXbCVVpPIuw54xGQJmJQY9pQFh0ilkXys",
  authDomain: "hanipon-pay.firebaseapp.com",
  projectId: "hanipon-pay",
  storageBucket: "hanipon-pay.firebasestorage.app",
  messagingSenderId: "800982403872",
  appId: "1:800982403872:web:dd39fd9d6db45ca13ae545",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
