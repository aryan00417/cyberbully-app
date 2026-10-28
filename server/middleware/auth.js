import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { BAN_MESSAGE } from "../services/strikes.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token provided" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(payload.userId).select("role banned");
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    if (user.banned) return res.status(403).json({ banned: true, message: BAN_MESSAGE });

    req.userId = user._id.toString();
    req.userRole = user.role;
    next();
  } catch (err) {
    res.status(500).json({ message: "Auth check failed" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== "admin") return res.status(403).json({ message: "Admins only" });
  next();
}