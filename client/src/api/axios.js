import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthContext registers a handler here. Any request that comes back
// "banned" (login, or a banned user's old token) triggers the ban screen.
let onBanned = null;
export function registerBannedHandler(handler) {
  onBanned = handler;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403 && err.response?.data?.banned && onBanned) {
      onBanned(err.response.data.message);
    }
    return Promise.reject(err);
  }
);

export default api;