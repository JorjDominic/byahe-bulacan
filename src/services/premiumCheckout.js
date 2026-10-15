import { auth } from "./firebase";

export async function startPremiumCheckout() {
  if (!auth.currentUser) throw new Error("Please sign in before paying.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to start checkout.");
  const url = data?.data?.attributes?.checkout_url;
  if (!url) throw new Error("No checkout URL returned.");
  window.location.assign(url);
}
