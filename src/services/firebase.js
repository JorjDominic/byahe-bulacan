// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyAj6GwQBL0HzMps7uggUiv-fcaAQZG3K80",
  authDomain:        "byahe-bulacan-v2.firebaseapp.com",
  projectId:         "byahe-bulacan-v2",
  storageBucket:     "byahe-bulacan-v2.firebasestorage.app",
  messagingSenderId: "714053217402",
  appId:             "1:714053217402:web:affa3028131b9b7ebb5fc3",
  measurementId:     "G-JD9D5TBCF7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
