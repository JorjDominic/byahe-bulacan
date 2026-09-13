import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import {
  getFeedPosts,
  addPost,
  likePost,
  unlikePost,
  getUserLikes,
  getCommentsForPost,
  addComment,
  deleteComment,
} from "../services/spotService";

// 1. Import Lucide SVGs para pantay-pantay ang design
import { 
  Camera, Image as ImageIcon, Send, X, Heart, MessageCircle, Share2, 
  TrendingUp, CalendarDays, Users, MapPin
} from "lucide-react";

const TRENDING = [
  "Biak-na-Bato Park",
  "Barasoain Church",
  "Malolos Cathedral",
  "St. John the Baptist",
  "Obando Festival",
];

const EVENTS = [
  { title: "Bocaue Pagoda Festival",  date: "July 2026 · Bocaue"        },
  { title: "Singkaban Festival",      date: "September 2026 · Malolos"  },
  { title: "Obando Fertility Rites",  date: "May 17-19 · Obando"        },
  { title: "Pista ng Biak-na-Bato",   date: "November 2026 · San Miguel" },
];

const MUNICIPALITIES = [
  "Bulacan","Malolos","San Miguel","Balagtas","Plaridel",
  "Angat","Bocaue","Meycauayan","Calumpit","Baliuag",
  "Guiguinto","Bulakan","Obando","Pandi","Marilao",
];

export default function FeedPage() {
  const { userName, userId, navigate } = useApp();

  const [posts,      setPosts]      = useState([]);
  const [newPost,    setNewPost]    = useState("");
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [loading,    setLoading]    = useState(true);
  const [posting,    setPosting]    = useState(false);
  const [tag,        setTag]        = useState("Bulacan");
  const [uploadImg,  setUploadImg]  = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading,  setUploading]  = useState(false);
  const fileInputRef                = useRef(null);

  const firstName = userName ? userName.split(" ")[0] : "Traveler";
  const initials  = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "JD";
  const avatarColors = ["#1a5c3c","#b8760a","#533ab7","#c0392b","#2980b9","#16a085","#8e44ad","#d35400"];
  const avatarBg     = avatarColors[userId?.charCodeAt(0) % avatarColors.length] || "#1a5c3c";

  // ─── Load posts + user likes ──────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getFeedPosts(),
      userId ? getUserLikes(userId) : Promise.resolve([]),
    ]).then(([postsData, userLikedIds]) => {
      setPosts(postsData);
      setLikedPosts(new Set(userLikedIds));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  // ─── Image pick ───────────────────────────────────────
  const handleImagePick = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploadImg(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setUploadImg(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Upload to Cloudinary ─────────────────────────────
  const uploadToCloudinary = async (file) => {
    const CLOUD  = process.env.REACT_APP_CLOUDINARY_CLOUD;
    const PRESET = process.env.REACT_APP_CLOUDINARY_PRESET;
    const fd     = new FormData();
    fd.append("file",          file);
    fd.append("upload_preset", PRESET);
    const res  = await fetch(
      "https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload",
      { method: "POST", body: fd }
    );
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  // ─── Submit post ──────────────────────────────────────
  const handlePost = async () => {
    if (!newPost.trim() || posting || !userId) return;
    setPosting(true);
    try {
      let imageUrl = "";
      if (uploadImg) {
        setUploading(true);
        imageUrl = await uploadToCloudinary(uploadImg);
        setUploading(false);
      }
      const created = await addPost(
        userId, userName || "Traveler", initials,
        avatarBg, newPost.trim(), tag, imageUrl
      );
      setPosts((prev) => [created, ...prev]);
      setNewPost("");
      handleRemoveImage();
    } catch (err) {
      console.error("Post error:", err);
      alert("Failed to post. Please try again.");
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  // ─── Like / Unlike ────────────────────────────────────
  const handleLike = async (post) => {
    if (!userId) {
      alert("Please log in to like posts!");
      return;
    }

    const alreadyLiked = likedPosts.has(post.id);

    setLikedPosts((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(post.id) : next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, likes: Math.max(0, (p.likes || 0) + (alreadyLiked ? -1 : 1)) }
        : p
    ));

    try {
      alreadyLiked
        ? await unlikePost(post.id, userId)
        : await likePost(post.id, userId);
    } catch (err) {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        alreadyLiked ? next.add(post.id) : next.delete(post.id);
        return next;
      });
      setPosts((prev) => prev.map((p) =>
        p.id === post.id
          ? { ...p, likes: Math.max(0, (p.likes || 0) + (alreadyLiked ? 1 : -1)) }
          : p
      ));
    }
  };

  // ─── Share ────────────────────────────────────────────
  const handleShare = (post) => {
    const text = post.name + " on BiyaheBulacan: " + post.text.slice(0, 100);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert("✅ Copied to clipboard!"))
        .catch(() => alert("Share: " + text));
    } else {
      alert("Share: " + text);
    }
  };

  // ─── Format time ──────────────────────────────────────
  const formatTime = (post) => {
    if (post.createdAt?.toDate) {
      const d    = post.createdAt.toDate();
      const diff = Date.now() - d.getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days  = Math.floor(diff / 86400000);
      if (mins  <  1) return "Just now";
      if (mins  < 60) return mins  + "m ago";
      if (hours < 24) return hours + "h ago";
      return days + "d ago";
    }
    return post.time || "Just now";
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "3rem" }}>
      <div style={{
        background: "var(--bg-secondary, #ffffff)",
        borderBottom: "1px solid var(--border, #e5e7eb)",
        padding: "2rem 0",
        transition: "all 0.3s ease"
      }}>
        <div className="container">
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: "1.6rem", margin: 0, color: "var(--text-main)" }}>
            Community Travel Feed
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginTop: "0.2rem", marginBottom: 0 }}>
            Stories and tips from fellow Bulacan explorers
          </p>
        </div>
      </div>

      <div className="feed-layout container" style={{ paddingTop: "2rem" }}>
        <div>

          {/* ── Composer ──────────────────────────────────── */}
          {userId ? (
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <Avatar initials={initials} bg={avatarBg} size="sm" />
                <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 500 }}>
                  {"Share your Bulacan story, " + firstName + "..."}
                </span>
              </div>
              <textarea
                placeholder="Kumusta ang byahe? Share your experience, tips, or discoveries from Bulacan!"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                disabled={posting}
                style={{ width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem", background: "var(--bg-main)", color: "var(--text-main)", minHeight: 100, resize: "vertical", boxSizing: "border-box", marginBottom: "1rem", outline: "none" }}
              />
              {previewUrl && (
                <div style={{ position: "relative", marginBottom: "1rem" }}>
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                  />
                  <button
                    onClick={handleRemoveImage}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "rgba(0,0,0,0.6)", border: "none",
                      borderRadius: "50%", width: 30, height: 30,
                      color: "#fff", cursor: "pointer", fontSize: "0.85rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  ><X size={16}/></button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={posting}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(26, 115, 232, 0.1)", color: "#3b82f6", border: "none", padding: "8px 12px", borderRadius: 20, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
                  >
                    <ImageIcon size={16} />
                    {uploadImg ? "Change Photo" : "Add Photo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImagePick(e.target.files[0])}
                  />
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 20, fontSize: "0.85rem", background: "var(--bg-main)", color: "var(--text-main)", cursor: "pointer", outline: "none" }}
                  >
                    {MUNICIPALITIES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <button
                  className="btn btn-pri btn-sm"
                  onClick={handlePost}
                  disabled={!newPost.trim() || posting}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Send size={16} /> {uploading ? "Uploading..." : posting ? "Posting..." : "Post Story"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: "2rem 1.5rem", background: "var(--bg-secondary)",
              borderRadius: 12, border: "1px solid var(--border)",
              textAlign: "center", marginBottom: "1.5rem",
            }}>
              <Camera size={40} color="var(--muted)" style={{ marginBottom: "0.5rem" }} />
              <div style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-main)", fontSize: "1.1rem" }}>
                Share your Bulacan adventure
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
                Log in to post stories, photos, and tips with the community.
              </div>
              <button className="btn btn-pri btn-sm" onClick={() => navigate("login")}>
                Log In to Post
              </button>
            </div>
          )}

          {/* ── Posts ─────────────────────────────────────── */}
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontWeight: 500 }}>
              Loading community stories...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}>
              No posts yet — be the first to share your Bulacan story!
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
                userName={userName}
                isLiked={likedPosts.has(post.id)}
                onLike={() => handleLike(post)}
                onShare={() => handleShare(post)}
                formatTime={formatTime}
              />
            ))
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────── */}
        <div>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUp size={16} color="var(--pri)" /> Trending Destinations
            </h4>
            {TRENDING.map((name, i) => (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }} key={name}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--muted)", width: 20 }}>#{i + 1}</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 500 }}>{name}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <CalendarDays size={16} color="#f59e0b" /> Upcoming in Bulacan
            </h4>
            {EVENTS.map((e) => (
              <div style={{ marginBottom: "0.75rem" }} key={e.title}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>{e.title}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{e.date}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem" }}>
            <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={16} color="#3b82f6" /> Community Stats
            </h4>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Total Posts</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>{posts.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Active Explorers</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                {new Set(posts.map((p) => p.userId).filter(Boolean)).size || 1}
              </span>
            </div>
            {!userId && (
              <button
                className="btn btn-pri btn-sm"
                style={{ width: "100%", marginTop: "1rem" }}
                onClick={() => navigate("login")}
              >
                Join Community
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────
function PostCard({ post, userId, userName, isLiked, onLike, onShare, formatTime }) {
  const [showComments,  setShowComments]  = useState(false);
  const [comments,      setComments]      = useState([]);
  const [commentText,   setCommentText]   = useState("");
  const [loadingCmts,   setLoadingCmts]   = useState(false);
  const [submittingCmt, setSubmittingCmt] = useState(false);

  const handleToggleComments = async () => {
    setShowComments((prev) => !prev);
    if (!showComments && comments.length === 0) {
      setLoadingCmts(true);
      try {
        const data = await getCommentsForPost(post.id);
        setComments(data);
      } catch (err) {
        console.error("getComments error:", err);
      } finally {
        setLoadingCmts(false);
      }
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || submittingCmt || !userId) return;
    setSubmittingCmt(true);
    try {
      const newComment = await addComment(
        post.id, userId, userName || "Traveler", commentText.trim()
      );
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      console.error("addComment error:", err);
      alert("Failed to post comment. Please try again.");
    } finally {
      setSubmittingCmt(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(commentId, post.id);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("deleteComment error:", err);
    }
  };

  const formatCmtTime = (c) => {
    if (c.createdAt?.toDate) {
      const diff  = Date.now() - c.createdAt.toDate().getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      if (mins  <  1) return "Just now";
      if (mins  < 60) return mins  + "m ago";
      if (hours < 24) return hours + "h ago";
      return Math.floor(diff / 86400000) + "d ago";
    }
    return "Just now";
  };

  const userInitials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "JD";

  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.5rem" }}>
      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <Avatar initials={post.initials || "??"} bg={post.avatarBg} size="sm" />
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>{post.name}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{formatTime(post)}</div>
        </div>
        <span
          style={{ marginLeft: "auto", background: "rgba(46, 204, 113, 0.15)", color: "var(--pri)", padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
        >
          <MapPin size={12} /> {post.tag}
        </span>
      </div>

      {/* ── Text ────────────────────────────────────────── */}
      <div style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: 1.5, marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
        {post.text}
      </div>

      {/* ── Image ───────────────────────────────────────── */}
      {post.imageUrl && (
        <div style={{ marginBottom: "1rem" }}>
          <img
            src={post.imageUrl}
            alt="post"
            style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
          />
        </div>
      )}
      {!post.imageUrl && post.hasImg && (
        <div style={{ background: post.imgBg, height: 200, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", marginBottom: "1rem" }}>
          {post.imgEmoji}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
        {/* Like */}
        <button
          onClick={onLike}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: isLiked ? "#ef4444" : "var(--muted)", padding: "8px 4px", transition: "color 0.2s" }}
          title={isLiked ? "Unlike" : "Like"}
        >
          <Heart size={18} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "currentColor"} />
          {post.likes || 0} {(post.likes || 0) === 1 ? "like" : "likes"}
        </button>

        {/* Comment */}
        <button
          onClick={handleToggleComments}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: showComments ? "var(--pri)" : "var(--muted)", padding: "8px 4px", transition: "color 0.2s" }}
        >
          <MessageCircle size={18} />
          {post.comments || 0} {(post.comments || 0) === 1 ? "comment" : "comments"}
        </button>

        {/* Share */}
        <button 
          onClick={onShare}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "var(--muted)", padding: "8px 4px", marginLeft: "auto" }}
        >
          <Share2 size={18} />
          Share
        </button>
      </div>

      {/* ── Comments ────────────────────────────────────── */}
      {showComments && (
        <div style={{ marginTop: "0.75rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>

          {/* Comment input */}
          {userId ? (
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center" }}>
              <Avatar initials={userInitials} size="sm" />
              <div style={{ flex: 1, display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  disabled={submittingCmt}
                  style={{
                    flex:         1,
                    padding:      "10px 14px",
                    border:       "1px solid var(--border)",
                    borderRadius: 20,
                    fontSize:     "0.85rem",
                    background:   "var(--bg-main)",
                    color:        "var(--text-main)",
                    outline:      "none",
                  }}
                />
                <button
                  className="btn btn-pri btn-sm"
                  onClick={handleComment}
                  disabled={!commentText.trim() || submittingCmt}
                  style={{ borderRadius: 20, padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Send size={14} /> {submittingCmt ? "..." : "Post"}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem", textAlign: "center", background: "var(--bg-main)", padding: "10px", borderRadius: 8, border: "1px solid var(--border)" }}>
              Log in to join the conversation.
            </p>
          )}

          {/* Comments list */}
          {loadingCmts ? (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center" }}>Loading comments...</p>
          ) : comments.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center" }}>
              No comments yet. Be the first!
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "flex-start" }}>
                <Avatar
                  initials={c.user ? c.user.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "??"}
                  size="sm"
                />
                <div style={{ flex: 1, background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>{c.user}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {formatCmtTime(c)}
                      </span>
                      {c.userId === userId && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex", alignItems: "center" }}
                          title="Delete comment"
                        ><X size={14} /></button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.4 }}>{c.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}