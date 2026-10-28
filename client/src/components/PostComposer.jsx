import { useState, useRef } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const MAX_CHARS = 500;
const MAX_IMAGE_MB = 3;

export default function PostComposer({ onPosted }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();
  const { user, reportStrike } = useAuth();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      showToast(`Image must be under ${MAX_IMAGE_MB}MB`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setPosting(true);
    try {
      const { data } = await api.post("/posts", { text, image });
      reportStrike(data.strikeInfo);
      setText("");
      clearImage();
      onPosted(data);
    } finally {
      setPosting(false);
    }
  }

  const charsLeft = MAX_CHARS - text.length;

  return (
    <form onSubmit={submit} className="flex gap-3 px-4 py-4 border-b border-gray-200">
      <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm">
        {user?.username?.[0]?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          placeholder="What's happening?"
          rows={2}
          className="w-full resize-none outline-none text-lg placeholder-gray-400 leading-snug"
        />

        {image && (
          <div className="relative mt-2 inline-block">
            <img src={image} alt="preview" className="max-h-64 rounded-2xl border border-gray-200" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/70 text-white w-7 h-7 rounded-full text-sm hover:bg-black"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <label className="cursor-pointer text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-full px-3 py-1.5 text-sm font-medium transition">
            Upload picture
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-3">
            {posting && (
              <span className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Running moderation check
              </span>
            )}
            {text.length > 0 && !posting && (
              <span className={`text-xs ${charsLeft < 20 ? "text-red-500" : "text-gray-400"}`}>
                {charsLeft}
              </span>
            )}
            <button
              type="submit"
              disabled={posting || (!text.trim() && !image)}
              className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}