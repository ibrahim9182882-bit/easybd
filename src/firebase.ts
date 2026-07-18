import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA2BcOm-poCVIo6ILNPHjqCIvtvsWGWbTo",
  authDomain: "easybd-2fc02.firebaseapp.com",
  databaseURL: "https://easybd-2fc02-default-rtdb.firebaseio.com",
  projectId: "easybd-2fc02",
  storageBucket: "easybd-2fc02.firebasestorage.app",
  messagingSenderId: "271672181586",
  appId: "1:271672181586:web:1012e20303628d0737b08b",
  measurementId: "G-T1QKPE5NZ4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const appId = "easybd-2fc02";
