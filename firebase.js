// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDKHdJ_-oWSjZG4msyTcMeqd1diasxurg",
  authDomain: "eafc-4fe94.firebaseapp.com",
  projectId: "eafc-4fe94",
  storageBucket: "eafc-4fe94.firebasestorage.app",
  messagingSenderId: "581192747721",
  appId: "1:581192747721:web:b0cf3d34fa331c4d2a1b18"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);