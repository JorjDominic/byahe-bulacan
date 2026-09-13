// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyC81N-AlZ8eESZY95BNswMRo5DOE8LbLE0",
  authDomain:        "biyahe-bulacan.firebaseapp.com",
  projectId:         "biyahe-bulacan",
  storageBucket:     "biyahe-bulacan.firebasestorage.app",
  messagingSenderId: "819028360986",
  appId:             "1:819028360986:web:07016e10ed8f4e430c36a3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);