import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl text-gray-900">
          <span className="text-2xl">⚡</span> Pulse
          <span className="hidden sm:inline text-xs font-medium text-gray-400 ml-1">
            safer conversations
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          {user?.role === "admin" && (
            <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium transition">
              Dashboard
            </Link>
          )}

          {user && user.role !== "admin" && user.strikes > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
              ⚠️ {user.strikes}/{user.maxStrikes || 3} warnings
            </span>
          )}

          {user ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:inline font-medium text-gray-700">@{user.username}</span>
                {user.role === "admin" && (
                  <span className="text-[10px] font-bold bg-gray-900 text-white px-1.5 py-0.5 rounded">
                    ADMIN
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-gray-600 hover:text-red-600 transition"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-semibold hover:bg-blue-700 transition shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}