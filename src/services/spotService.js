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
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Cache ────────────────────────────────────────────────
let spotsCache = null;

export function clearSpotsCache() {
  spotsCache = null;
}

// ─── Spots ────────────────────────────────────────────────
export async function getAllSpots() {
  if (spotsCache) return spotsCache;
  try {
    const snap = await getDocs(
      query(collection(db, "spots"), orderBy("createdAt", "desc"))
    );
    spotsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    lat:          parseFloat(formData.lat)    || 14.8433,
    lng:          parseFloat(formData.lng)    || 120.8114,
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
      query(collection(db, "reviews"), orderBy("createdAt", "desc"))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.spotId === spotId);
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
  await setDoc(doc(db, "likes", likeId), {
    postId,
    userId,
    createdAt: serverTimestamp(),
  });
  // Increment likes count on post
  await updateDoc(doc(db, "posts", postId), {
    likes: (await getDoc(doc(db, "posts", postId))).data()?.likes + 1 || 1,
  });
}

export async function unlikePost(postId, userId) {
  const likeId = postId + "_" + userId;
  await deleteDoc(doc(db, "likes", likeId));
  // Decrement likes count on post
  const postSnap = await getDoc(doc(db, "posts", postId));
  const current  = postSnap.data()?.likes || 0;
  await updateDoc(doc(db, "posts", postId), {
    likes: Math.max(0, current - 1),
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
      query(collection(db, "comments"), orderBy("createdAt", "asc"))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.postId === postId);
  } catch (err) {
    console.error("getCommentsForPost error:", err);
    return [];
  }
}

export async function addComment(postId, userId, userName, text) {
  const comment = {
    postId, userId,
    user:      userName,
    text:      text.trim(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "comments"), comment);
  // Increment comments count on post
  const postSnap = await getDoc(doc(db, "posts", postId));
  const current  = postSnap.data()?.comments || 0;
  await updateDoc(doc(db, "posts", postId), {
    comments: current + 1,
  });
  return { id: ref.id, ...comment };
}

export async function deleteComment(commentId, postId) {
  await deleteDoc(doc(db, "comments", commentId));
  const postSnap = await getDoc(doc(db, "posts", postId));
  const current  = postSnap.data()?.comments || 0;
  await updateDoc(doc(db, "posts", postId), {
    comments: Math.max(0, current - 1),
  });
}

// ─── Itineraries ──────────────────────────────────────────
export async function saveItinerary(userId, tripName, spots) {
  const itin = {
    userId,
    tripName,
    spots,
    totalFee:  spots.reduce((sum, s) => sum + (s.feeNum || 0), 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "itineraries"), itin);
  return { id: ref.id, ...itin };
}

export async function getUserItinerary(userId) {
  try {
    const snap = await getDocs(collection(db, "itineraries"));
    const itins = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((i) => i.userId === userId);
    return itins[0] || null;
  } catch (err) {
    console.error("getUserItinerary error:", err);
    return null;
  }
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
