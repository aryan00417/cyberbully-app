import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { registerBannedHandler } from "../api/axios.js";

const AuthContext = createContext(null);

const DEFAULT_BAN_MESSAGE = "Your account has been banned for repeated harassment.";

function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [warning, setWarning] = useState(null);
  const [banMessage, setBanMessage] = useState(null);

  const saveUser = useCallback((u) => {
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const handleBanned = useCallback(
    (message) => {
      clearSession();
      setWarning(null);
      setBanMessage(message || DEFAULT_BAN_MESSAGE);
    },
    [clearSession]
  );

  useEffect(() => {
    registerBannedHandler(handleBanned);
  }, [handleBanned]);

  // refresh role and strike count from the server when the app loads
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api
      .get("/auth/me")
      .then((res) => saveUser(res.data.user))
      .catch((err) => {
        if (err.response?.status === 401) clearSession();
      });
  }, [saveUser, clearSession]);

  async function login(email, password) {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      saveUser(data.user);
      return {};
    } catch (err) {
      // the interceptor already opened the ban screen
      if (err.response?.data?.banned) return { banned: true };
      throw err;
    }
  }

  async function signup(username, email, password) {
    const { data } = await api.post("/auth/signup", { username, email, password });
    localStorage.setItem("token", data.token);
    saveUser(data.user);
  }

  function logout() {
    clearSession();
  }

  // call with data.strikeInfo after creating a post or comment
  function reportStrike(info) {
    if (!info) return;
    if (user) saveUser({ ...user, strikes: info.strikes });
    if (info.banned) handleBanned(info.message);
    else setWarning(info);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        reportStrike,
        warning,
        dismissWarning: () => setWarning(null),
        banMessage,
        dismissBan: () => setBanMessage(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}