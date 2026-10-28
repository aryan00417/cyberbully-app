
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import CommentItem from "./CommentItem.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function CommentThread({ postId, onCountDelta }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [checking, setChecking] = useState(false);
  const { reportStrike } = useAuth();

  useEffect(() => {
    api.get(`/comments/post/${postId}`).then((res) => setComments(res.data));
  }, [postId]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setChecking(true);

    try {
      const { data } = await api.post(`/comments/post/${postId}`, { text });
      reportStrike(data.strikeInfo);

      setComments((prev) => [...prev, data]);
      onCountDelta?.(1);
      setText("");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="bg-gray-50">
      {comments.map((c) => (
        <CommentItem
          key={c._id}
          comment={c}
          onDeleted={(id) => {
            setComments((prev) => prev.filter((cm) => cm._id !== id));
            onCountDelta?.(-1);
          }}
        />
      ))}

      <form
        onSubmit={submit}
        className="flex items-center gap-2 px-4 py-2 border-t border-gray-100"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reply..."
          maxLength={300}
          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
        />

        <button
          type="submit"
          disabled={checking || !text.trim()}
          className="text-sm text-blue-600 font-medium disabled:opacity-40"
        >
          {checking ? "Checking..." : "Reply"}
        </button>
      </form>
    </div>
  );
}
