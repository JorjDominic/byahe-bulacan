import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { db, functions } from "./firebase";

export async function startPremiumCheckout() {
  const createCheckout = httpsCallable(functions, "createPremiumCheckout");
  const response = await createCheckout();
  const checkoutUrl = response.data?.checkoutUrl;
  if (!checkoutUrl) throw new Error("No checkout URL returned.");
  return checkoutUrl;
}

export function waitForPremiumAccess(userId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    let unsubscribe = () => {};
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      callback(value);
    };
    timeout = setTimeout(() => finish(resolve, false), timeoutMs);
    unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (snapshot) => {
        if (snapshot.data()?.isPremium === true) finish(resolve, true);
      },
      (error) => finish(reject, error)
    );
    if (settled) unsubscribe();
  });
}
