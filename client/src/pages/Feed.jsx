import { useCallback, useEffect, useState } from "react";
import api from "../api/axios.js";
import PostComposer from "../components/PostComposer.jsx";
import PostCard from "../components/PostCard.jsx";
import RightRail from "../components/RightRail.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = [
  { id: "all", label: "Latest" },
  { id: "flagged", label: "Flagged" },
  { id: "media", label: "Photos" },
];

const EMPTY_TEXT = {
  all: "No posts yet. Be the first.",
  flagged: "Nothing flagged. The community is behaving.",
  media: "No photo posts yet.",
};

function PostSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-gray-100 animate-pulse flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 bg-gray-200 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const loadPage = useCallback(async (pageNum, activeFilter) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/posts?page=${pageNum}&limit=10&filter=${activeFilter}`);
      setPosts((prev) => (pageNum === 1 ? data.posts : [...prev, ...data.posts]));
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      // the feed just stays as it was
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1, filter);
  }, [filter, loadPage]);

  function handlePosted(p) {
    setRefreshKey((k) => k + 1);
    const belongsHere =
      filter === "all" || (filter === "flagged" && p.flagged) || (filter === "media" && p.image);
    if (belongsHere) setPosts((prev) => [{ ...p, commentCount: 0 }, ...prev]);
  }

  return (
    <div className="max-w-5xl mx-auto lg:px-4 lg:py-4 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
      <main className="bg-white lg:border border-gray-200 lg:rounded-2xl overflow-hidden shadow-sm">
        {user && <PostComposer onPosted={handlePosted} />}

        <div className="flex border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPosts([]);
                setFilter(t.id);
              }}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                filter === t.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && posts.length === 0 && (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
          />
        ))}

        {!loading && posts.length === 0 && (
          <p className="text-center text-gray-400 py-12">{EMPTY_TEXT[filter]}</p>
        )}

        {hasMore && (
          <div className="py-4 text-center">
            <button
              onClick={() => loadPage(page + 1, filter)}
              disabled={loading}
              className="text-sm text-blue-600 font-medium disabled:opacity-40"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </main>

      <aside className="hidden lg:block sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto space-y-4 pr-1">
        <RightRail refreshKey={refreshKey} />
      </aside>
    </div>
  );
}