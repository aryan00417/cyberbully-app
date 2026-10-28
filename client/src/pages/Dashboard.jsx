import { useCallback, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../api/axios.js";

const CATEGORY_LABEL = {
  religion: "religion",
  age: "age",
  gender: "gender",
  ethnicity: "ethnicity",
  harassment_other: "harassment",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    const [s, u] = await Promise.all([api.get("/stats"), api.get("/admin/users")]);
    setStats(s.data);
    setUsers(u.data);
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    load().catch(() => {});
    const timer = setInterval(() => load().catch(() => {}), 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function toggleBan(u) {
    await api.post(`/admin/users/${u._id}/${u.banned ? "unban" : "ban"}`);
    load().catch(() => {});
  }

  if (!stats) return <p className="text-center text-gray-400 py-12">Loading...</p>;

  const chartData = stats.byCategory.map((c) => ({
    category: CATEGORY_LABEL[c.category] || c.category,
    count: c.count,
  }));
  const bannedCount = users.filter((u) => u.banned).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Moderation dashboard</h1>
          <p className="text-xs text-gray-400">
            Updated {updatedAt?.toLocaleTimeString()} (refreshes every 10 seconds)
          </p>
        </div>
        <button
          onClick={() => load().catch(() => {})}
          className="text-sm border border-gray-300 rounded-full px-4 py-1.5 hover:bg-gray-50 transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Posts and comments checked" value={stats.total} />
        <Stat label="Flagged" value={stats.flaggedTotal} />
        <Stat label="Flagged %" value={`${stats.flaggedPercent}%`} />
        <Stat label="Banned users" value={bannedCount} />
      </div>

      <h2 className="font-semibold mb-2">
        Flags by category ({stats.flaggedPosts} posts, {stats.flaggedComments} comments)
      </h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 mb-8">Nothing flagged yet.</p>
      ) : (
        <div className="h-64 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="font-semibold mb-2">Recently flagged</h2>
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 mb-8">
        {stats.recentFlagged.map((c) => (
          <div key={`${c.kind}-${c._id}`} className="px-3 py-2 text-sm">
            <span className="font-medium">@{c.author}</span>{" "}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.kind}</span>{" "}
            <span className="text-xs text-amber-700">
              {CATEGORY_LABEL[c.category] || c.category} ({Math.round((c.confidence || 0) * 100)}%)
            </span>
            <p className="text-gray-700 truncate">{c.text}</p>
          </div>
        ))}
        {stats.recentFlagged.length === 0 && (
          <p className="px-3 py-4 text-gray-400 text-sm">No flagged content yet.</p>
        )}
      </div>

      <h2 className="font-semibold mb-2">Users</h2>
      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Strikes</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-3 py-2">
                  <div className="font-medium">@{u.username}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.strikes}</td>
                <td className="px-3 py-2">
                  {u.banned ? (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">banned</span>
                  ) : (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {u.role !== "admin" && (
                    <button
                      onClick={() => toggleBan(u)}
                      className="text-xs border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-50 transition"
                    >
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-xl px-3 py-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}