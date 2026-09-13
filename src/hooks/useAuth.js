import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { useApp } from "../context/AppContext";

export function useAuth() {
  const { login, logout: contextLogout } = useApp();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) return snap.data();
    } catch (err) {
      console.error("fetchUserProfile error:", err);
    }
    return { name: "Traveler", role: "user", avatarUrl: "", isPremium: false };
  };

  const signIn = async (email, password) => {
    setError("");
    setLoading(true);
    try {
      const result  = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserProfile(result.user.uid);
      login(
        profile.role      || "user",
        profile.name      || "Traveler",
        result.user.uid,
        profile.avatarUrl || "",
        profile.isPremium || false // Pass premium status
      );
      return true;
    } catch (err) {
      setError(getFriendlyError(err.code));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name, email, password, password2) => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return false;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Default to free user (isPremium: false)
      await setDoc(doc(db, "users", result.user.uid), {
        name:      name.trim(),
        role:      "user",
        email:     email.trim().toLowerCase(),
        avatarUrl: "",
        nickname:  name.trim().split(" ")[0],
        isPremium: false, // New users start free
        createdAt: new Date().toISOString(),
      });
      
      login("user", name.trim(), result.user.uid, "", false);
      return true;
    } catch (err) {
      setError(getFriendlyError(err.code));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    contextLogout();
  };

  const initAuthListener = (onReady) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        login(
          profile.role      || "user",
          profile.name      || "Traveler",
          user.uid,
          profile.avatarUrl || "",
          profile.isPremium || false // Pass premium status
        );
      }
      onReady?.();
    });
  };

  return { signIn, signUp, signOutUser, initAuthListener, error, setError, loading };
}

function getFriendlyError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/email-already-in-use":
      return "This email is already registered. Please log in instead.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
}