import { collection, getDocs, query, where, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeCommuteGuide } from "../utils/commuting";

const records = (snapshot) => snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }));

export async function getCommuteGuides(spotId) {
  const snapshot = await getDocs(query(collection(db, "commuteGuides"), where("spotId", "==", spotId), where("status", "==", "published"), where("verified", "==", true)));
  return records(snapshot).filter((guide) => guide.verified === true).sort((a, b) => a.originLabel.localeCompare(b.originLabel));
}

export async function getAllCommuteGuides() {
  return records(await getDocs(collection(db, "commuteGuides")));
}

export async function saveCommuteGuide(input, publish = false) {
  const data = { ...normalizeCommuteGuide(input, publish), updatedAt: serverTimestamp() };
  if (input.id) {
    await updateDoc(doc(db, "commuteGuides", input.id), data);
    return { ...data, id: input.id };
  }
  const reference = await addDoc(collection(db, "commuteGuides"), { ...data, createdAt: serverTimestamp() });
  return { ...data, id: reference.id };
}

export async function deleteCommuteGuide(id) {
  await deleteDoc(doc(db, "commuteGuides", id));
}

export async function reportCommuteGuide(guideId, userId, message) {
  const text = message.trim();
  if (!userId) throw new Error("Log in to report outdated directions.");
  if (text.length < 10 || text.length > 1000) throw new Error("Describe the issue in 10–1,000 characters.");
  await addDoc(collection(db, "commuteReports"), { guideId, userId, text, status: "open", createdAt: serverTimestamp() });
}

export async function getCommuteReports() {
  return records(await getDocs(query(collection(db, "commuteReports"), where("status", "==", "open"))));
}

export async function resolveCommuteReport(id) {
  await updateDoc(doc(db, "commuteReports", id), { status: "resolved", resolvedAt: serverTimestamp() });
}
