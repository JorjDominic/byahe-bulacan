// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAj6GwQBL0HzMps7uggUiv-fcaAQZG3K80",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "byahe-bulacan-v2.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID || "byahe-bulacan-v2",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "byahe-bulacan-v2.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "714053217402",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID || "1:714053217402:web:affa3028131b9b7ebb5fc3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
