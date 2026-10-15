import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { getLocationFields } from "../utils/coordinates";

// ─── Cache ────────────────────────────────────────────────
let spotsCache = null;

export function clearSpotsCache() {
  spotsCache = null;
}

function normalizeSpotIdentity(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function spotCompleteness(spot) {
  return [
    spot.imageUrl,
    spot.mapsLink,
    spot.lat,
    spot.lng,
    spot.desc,
    spot.hours,
    spot.pasalubong,
  ].filter((value) => value !== undefined && value !== null && value !== "").length;
}

function deduplicateSpots(spots) {
  const unique = new Map();

  for (const spot of spots) {
    const key = [spot.name, spot.municipality]
      .map(normalizeSpotIdentity)
      .join("::");
    const current = unique.get(key);

    // Prefer the most complete copy, especially one with an uploaded image
    // and map/location details. Ties keep the newest record from the input.
    if (!current || spotCompleteness(spot) > spotCompleteness(current)) {
      unique.set(key, spot);
    }
  }

  return [...unique.values()];
}

// ─── Spots ────────────────────────────────────────────────
export async function getAllSpots() {
  if (spotsCache) return spotsCache;
  try {
    const snap = await getDocs(collection(db, "spots"));
    const spots = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((spot) => spot.archived !== true)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
    let reviewRows = [];
    try {
      const reviewSnap = await getDocs(collection(db, "reviews"));
      reviewRows = reviewSnap.docs.map((d) => d.data());
    } catch (reviewError) {
      console.warn("Review aggregates could not be refreshed:", reviewError);
    }
    const aggregates = reviewRows.reduce((result, review) => {
      if (!review.spotId || !Number.isFinite(Number(review.stars))) return result;
      const current = result.get(review.spotId) || { total: 0, count: 0 };
      current.total += Number(review.stars);
      current.count += 1;
      result.set(review.spotId, current);
      return result;
    }, new Map());
    spotsCache = deduplicateSpots(spots).map((spot) => {
      const aggregate = aggregates.get(spot.id);
      return aggregate
        ? { ...spot, rating: Number((aggregate.total / aggregate.count).toFixed(1)), reviews: aggregate.count }
        : { ...spot, rating: 0, reviews: 0 };
    });
    return spotsCache;
  } catch (err) {
    console.error("getAllSpots error:", err);
    return [];
  }
}

export async function getSpotById(id) {
  try {
    const snap = await getDoc(doc(db, "spots", id));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    const all = await getAllSpots();
    return all.find((s) => s.id === id) || null;
  } catch (err) {
    console.error("getSpotById error:", err);
    return null;
  }
}

export async function filterSpots({ search = "", municipality = "All", category = "All" } = {}) {
  const spots = await getAllSpots();
  return spots.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.municipality.toLowerCase().includes(search.toLowerCase());
    const matchMuni   = municipality === "All" || s.municipality === municipality;
    const matchCat    = category    === "All" || s.category    === category;
    return matchSearch && matchMuni && matchCat;
  });
}

export async function getMunicipalities() {
  const spots = await getAllSpots();
  return ["All", ...new Set(spots.map((s) => s.municipality))];
}

export async function getCategories() {
  const spots = await getAllSpots();
  return ["All", ...new Set(spots.map((s) => s.category))];
}

export async function getNearbySpots(currentId, limit = 3) {
  const spots = await getAllSpots();
  return spots.filter((s) => s.id !== currentId).slice(0, limit);
}

// ─── Admin: Add spot ──────────────────────────────────────
export async function addSpot(formData) {
  const feeNum = formData.fee.toLowerCase() === "free"
    ? 0
    : parseInt(formData.fee.replace(/[^0-9]/g, ""), 10) || 0;

  const spot = {
    name:         formData.name.trim(),
    municipality: formData.municipality,
    category:     formData.category,
    fee:          formData.fee.trim(),
    feeNum,
    pasalubong:   formData.pasalubong?.trim() || "",
    hours:        formData.hours?.trim()      || "",
    desc:         formData.desc?.trim()       || "",
    badge:        formData.badge?.trim()      || null,
    bg:           formData.bg                 || "#e8f5ee",
    emoji:        formData.emoji              || "📍",
    imageUrl:     formData.imageUrl           || "",
    ...getLocationFields(formData),
    rating:       0,
    reviews:      0,
    createdAt:    serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "spots"), spot);
  spotsCache = null;
  return { id: ref.id, ...spot };
}

// ─── Admin: Update spot ───────────────────────────────────
export async function updateSpot(id, data) {
  const feeNum = data.fee?.toLowerCase() === "free"
    ? 0
    : parseInt(data.fee?.replace(/[^0-9]/g, ""), 10) || 0;
  await updateDoc(doc(db, "spots", id), {
    ...data,
    ...getLocationFields(data),
    feeNum,
    updatedAt: serverTimestamp(),
  });
  spotsCache = null;
}

// ─── Admin: Delete spot ───────────────────────────────────
export async function deleteSpot(id) {
  await deleteDoc(doc(db, "spots", id));
  spotsCache = null;
}

// ─── Reviews ──────────────────────────────────────────────
export async function getReviewsForSpot(spotId) {
  try {
    const snap = await getDocs(
      query(collection(db, "reviews"), where("spotId", "==", spotId))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.error("getReviewsForSpot error:", err);
    return [];
  }
}

export async function addReview(spotId, userId, userName, stars, text) {
  const review = {
    spotId, userId,
    user:      userName,
    stars,
    text,
    time:      "Just now",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "reviews"), review);
  spotsCache = null;
  return { id: ref.id, ...review };
}

// ─── Feed Posts ───────────────────────────────────────────
export async function getFeedPosts() {
  try {
    const snap = await getDocs(
      query(collection(db, "posts"), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getFeedPosts error:", err);
    return [];
  }
}

export async function addPost(userId, userName, initials, avatarBg, text, tag, imageUrl = "") {
  const post = {
    userId, initials, avatarBg,
    name:      userName,
    text,
    tag,
    tagColor:  "green",
    hasImg:    !!imageUrl,
    imageUrl,
    likes:     0,
    comments:  0,
    time:      "Just now",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "posts"), post);
  return { id: ref.id, ...post };
}

// ─── Likes ────────────────────────────────────────────────
export async function likePost(postId, userId) {
  const likeId = postId + "_" + userId;
  const likeRef = doc(db, "likes", likeId);
  const postRef = doc(db, "posts", postId);
  return runTransaction(db, async (transaction) => {
    const [likeSnap, postSnap] = await Promise.all([transaction.get(likeRef), transaction.get(postRef)]);
    if (likeSnap.exists()) return false;
    if (!postSnap.exists()) throw new Error("Post not found");
    transaction.set(likeRef, { postId, userId, createdAt: serverTimestamp() });
    transaction.update(postRef, { likes: Math.max(0, Number(postSnap.data().likes) || 0) + 1 });
    return true;
  });
}

export async function unlikePost(postId, userId) {
  const likeId = postId + "_" + userId;
  const likeRef = doc(db, "likes", likeId);
  const postRef = doc(db, "posts", postId);
  return runTransaction(db, async (transaction) => {
    const [likeSnap, postSnap] = await Promise.all([transaction.get(likeRef), transaction.get(postRef)]);
    if (!likeSnap.exists()) return false;
    if (!postSnap.exists()) throw new Error("Post not found");
    transaction.delete(likeRef);
    transaction.update(postRef, { likes: Math.max(0, (Number(postSnap.data().likes) || 0) - 1) });
    return true;
  });
}

export async function getUserLikes(userId) {
  try {
    const snap = await getDocs(
      query(collection(db, "likes"), where("userId", "==", userId))
    );
    return snap.docs.map((d) => d.data().postId);
  } catch (err) {
    console.error("getUserLikes error:", err);
    return [];
  }
}

// ─── Comments ─────────────────────────────────────────────
export async function getCommentsForPost(postId) {
  try {
    const snap = await getDocs(
      query(collection(db, "comments"), where("postId", "==", postId))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return aTime - bTime;
    });
  } catch (err) {
    console.error("getCommentsForPost error:", err);
    return [];
  }
}

export async function addComment(postId, userId, userName, text) {
  const commentRef = doc(collection(db, "comments"));
  const postRef = doc(db, "posts", postId);
  const comment = {
    postId, userId,
    user:      userName,
    text:      text.trim(),
    createdAt: serverTimestamp(),
  };
  await runTransaction(db, async (transaction) => {
    const postSnap = await transaction.get(postRef);
    if (!postSnap.exists()) throw new Error("Post not found");
    transaction.set(commentRef, comment);
    transaction.update(postRef, { comments: (Number(postSnap.data().comments) || 0) + 1 });
  });
  return { id: commentRef.id, ...comment };
}

export async function deleteComment(commentId, postId) {
  const commentRef = doc(db, "comments", commentId);
  const postRef = doc(db, "posts", postId);
  return runTransaction(db, async (transaction) => {
    const [commentSnap, postSnap] = await Promise.all([transaction.get(commentRef), transaction.get(postRef)]);
    if (!commentSnap.exists()) return false;
    if (!postSnap.exists()) throw new Error("Post not found");
    transaction.delete(commentRef);
    transaction.update(postRef, { comments: Math.max(0, (Number(postSnap.data().comments) || 0) - 1) });
    return true;
  });
}

// ─── Itineraries ──────────────────────────────────────────
function itineraryId(userId, date) {
  return userId + "_" + date;
}

export async function saveItinerary(userId, date, itinerary) {
  const spots = itinerary.spots || [];
  const itin = {
    userId,
    date,
    tripName: itinerary.name || "Bulacan Trip",
    spots,
    checklist: itinerary.checklist || {},
    minGap: itinerary.minGap || 3,
    status: itinerary.status || "planning",
    manualDone: itinerary.manualDone === true,
    totalFee:  spots.reduce((sum, s) => sum + (s.feeNum || 0), 0),
    updatedAt: serverTimestamp(),
  };
  const ref = doc(db, "itineraries", itineraryId(userId, date));
  const existing = await getDoc(ref);
  await setDoc(ref, existing.exists() ? itin : { ...itin, createdAt: serverTimestamp() }, { merge: true });
  return { id: ref.id, ...itin };
}

export async function getUserItineraries(userId) {
  const snap = await getDocs(query(collection(db, "itineraries"), where("userId", "==", userId)));
  return snap.docs.reduce((result, item) => {
    const data = item.data();
    if (!data.date) return result;
    result[data.date] = {
      name: data.tripName || "Bulacan Trip",
      spots: data.spots || [],
      checklist: data.checklist || {},
      minGap: data.minGap || 3,
      status: data.status || "planning",
      manualDone: data.manualDone === true,
      savedId: item.id,
    };
    return result;
  }, {});
}

export async function deleteSavedItinerary(userId, date) {
  await deleteDoc(doc(db, "itineraries", itineraryId(userId, date)));
}

// ─── ADMIN FETCHERS (Users at Reviews) ────────────────────

export async function getAllUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => {
      const data = d.data();
      
      // Formatting date nicely
      let joinedDate = "Unknown";
      if (data.createdAt) {
        try {
          const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          joinedDate = dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } catch (e) {
          joinedDate = "Recent";
        }
      }

      return {
        id: d.id,
        name: data.name || data.nickname || "No Name",
        email: data.email || "No Email",
        role: data.role || "user",
        isAdmin: data.role === "admin",
        joined: joinedDate,
        ...data
      };
    });
  } catch (err) {
    console.error("getAllUsers error:", err);
    return [];
  }
}

export async function getAllReviews() {
  try {
    const snap = await getDocs(collection(db, "reviews"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error fetching all reviews:", err);
    return [];
  }
}
