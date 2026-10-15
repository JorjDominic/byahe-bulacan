import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { useApp } from "../context/AppContext";

export function useAuth() {
  const { login, logout: contextLogout } = useApp();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists()
      ? { status: "found", profile: snap.data() }
      : { status: "missing", profile: null };
  };

  const signIn = async (email, password) => {
    setError("");
    setLoading(true);
    try {
      const result  = await signInWithEmailAndPassword(auth, email, password);
      const profileResult = await fetchUserProfile(result.user.uid);
      let profile = profileResult.profile;

      // Repair older accounts that were created in Authentication while the
      // expired Firestore rules prevented their profile document from saving.
      if (profileResult.status === "missing") {
        profile = {
          name: result.user.displayName || "Traveler",
          role: "user",
          email: result.user.email || email.trim().toLowerCase(),
          avatarUrl: "",
          nickname: result.user.displayName || "Traveler",
          isPremium: false,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", result.user.uid), profile);
      }
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
        createdAt: serverTimestamp(),
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
    let isInitialCheck = true;
    return onAuthStateChanged(auth, async (user) => {
      let initializationError = null;
      try {
        if (user) {
          const result = await fetchUserProfile(user.uid);
          if (result.status === "missing") {
            throw Object.assign(new Error("Your account profile is missing. Sign out and sign in again to repair it."), { code: "profile-missing" });
          }
          const profile = result.profile;
          login(
            profile.role      || "user",
            profile.name      || "Traveler",
            user.uid,
            profile.avatarUrl || "",
            profile.isPremium || false
          );
        }
      } catch (err) {
        initializationError = err;
        console.error("Profile restoration error:", err);
        setError(getFriendlyError(err.code));
      } finally {
        if (isInitialCheck) {
          isInitialCheck = false;
          onReady?.(initializationError);
        }
      }
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
    case "permission-denied":
      return "Your profile could not be loaded because Firebase denied access. Please contact support.";
    case "profile-missing":
      return "Your account profile is missing. Sign out and sign in again to repair it.";
    case "unavailable":
      return "Firebase is temporarily unavailable. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
