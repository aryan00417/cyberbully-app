import { useState } from "react";
import api from "../api/axios.js";
import CommentThread from "./CommentThread.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORY_LABEL = {
  religion: "religion",
  age: "age",
  gender: "gender",
  ethnicity: "ethnicity",
  harassment_other: "harassment",
  none: "none",
};

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-fuchsia-600",
];

const gradientFor = (name = "") =>
  GRADIENTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % GRADIENTS.length];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PostCard({ post, onDeleted }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [liked, setLiked] = useState(Boolean(user && post.likes?.includes(user.id)));
  const [reveal, setReveal] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  async function toggleLike() {
    if (!user) return;
    const { data } = await api.post(`/posts/${post._id}/like`);
    setLikes(data.likes);
    setLiked(data.liked);
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    await api.delete(`/posts/${post._id}`);
    setDeleted(true);
    onDeleted?.(post._id);
  }

  if (deleted) return null;

  const canDelete = user && (user.id === post.author?._id || user.role === "admin");
  const hidden = post.flagged && !reveal;

  return (
    <article
      className={`border-b border-gray-100 border-l-4 transition-colors hover:bg-gray-50/70 ${
        post.flagged ? "border-l-amber-400 bg-amber-50/30" : "border-l-transparent"
      }`}
    >
      <div className="flex gap-3 px-4 py-3">
        <div
          className={`w-10 h-10 shrink-0 rounded-full bg-gradient-to-br ${gradientFor(
            post.author?.username
          )} flex items-center justify-center text-sm font-bold text-white shadow-sm`}
        >
          {post.author?.username?.[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">@{post.author?.username}</span>
            <span className="text-xs text-gray-400 shrink-0">{timeAgo(post.createdAt)}</span>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="ml-auto text-xs text-gray-400 hover:text-red-600 transition"
              >
                Delete
              </button>
            )}
          </div>

          {post.flagged && (
            <span className="inline-block text-xs font-medium bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full my-1.5">
              ⚠️ Flagged: possible {CATEGORY_LABEL[post.category] || "harassment"} (
              {Math.round((post.confidence || 0) * 100)}%)
            </span>
          )}

          {hidden ? (
            <div className="mt-1">
              {post.text && (
                <p className="text-gray-400 blur-[3px] select-none whitespace-pre-wrap">{post.text}</p>
              )}
              {post.image && (
                <img src={post.image} alt="" className="mt-2 rounded-2xl max-h-80 w-full object-cover blur-md" />
              )}
              <button
                onClick={() => setReveal(true)}
                className="text-blue-600 text-xs mt-2 font-medium hover:underline"
              >
                Show anyway
              </button>
            </div>
          ) : (
            <div className="mt-1">
              {post.text && (
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed break-words">{post.text}</p>
              )}
              {post.image && (
                <img
                  src={post.image}
                  alt="post attachment"
                  className="mt-2 rounded-2xl max-h-96 w-full object-cover border border-gray-200"
                />
              )}
            </div>
          )}

          <div className="flex gap-6 mt-3 text-sm text-gray-500">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 transition ${
                liked ? "text-rose-600" : "hover:text-rose-600"
              }`}
            >
              <span className="text-base leading-none">{liked ? "♥" : "♡"}</span> {likes}
            </button>
            <button
              onClick={() => setShowComments((s) => !s)}
              className="hover:text-blue-600 transition"
            >
              {showComments ? "Hide replies" : "Replies"}
              {commentCount > 0 && ` · ${commentCount}`}
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <CommentThread
          postId={post._id}
          onCountDelta={(d) => setCommentCount((c) => Math.max(0, c + d))}
        />
      )}
    </article>
  );
}