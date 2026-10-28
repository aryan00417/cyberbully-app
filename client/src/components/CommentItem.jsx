import { useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORY_LABEL = {
  religion: "religion",
  age: "age",
  gender: "gender",
  ethnicity: "ethnicity",
  harassment_other: "harassment",
  none: "none",
};

export default function CommentItem({ comment, onDeleted }) {
  const [reveal, setReveal] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const { user } = useAuth();

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    await api.delete(`/comments/${comment._id}`);
    setDeleted(true);
    onDeleted?.(comment._id);
  }

  if (deleted) return null;

  const isOwner = user?.id === comment.author?._id || user?.role === "admin";

  return (
    <div className="py-2 px-4 border-t border-gray-100 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold">@{comment.author?.username}</span>
        {comment.flagged && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            ⚠️ Flagged: possible {CATEGORY_LABEL[comment.category] || "harassment"} (
            {Math.round((comment.confidence || 0) * 100)}%)
          </span>
        )}
        {isOwner && (
          <button
            onClick={handleDelete}
            className="ml-auto text-xs text-gray-400 hover:text-red-600 transition"
          >
            Delete
          </button>
        )}
      </div>

      {comment.flagged && !reveal ? (
        <div>
          <p className="text-gray-400 blur-[3px] select-none">{comment.text}</p>
          <button
            onClick={() => setReveal(true)}
            className="text-blue-600 text-xs mt-1 hover:underline"
          >
            Show anyway
          </button>
        </div>
      ) : (
        <p className="text-gray-800">{comment.text}</p>
      )}
    </div>
  );
}