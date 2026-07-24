import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "qa-forms-7a68b",
  appId: "1:431691107469:web:85ce6bf3d6486e27f726c4",
  storageBucket: "qa-forms-7a68b.firebasestorage.app",
  apiKey: "AIzaSyBEHknMGjPfXxham9x77yC5J2FlnW-EYS8",
  authDomain: "qa-forms-7a68b.firebaseapp.com",
  messagingSenderId: "431691107469",
  measurementId: "G-409Y6TPDWD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
