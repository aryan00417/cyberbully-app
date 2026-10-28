import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { BAN_MESSAGE, MAX_STRIKES } from "../services/strikes.js";

const router = express.Router();

function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    strikes: user.strikes,
    maxStrikes: MAX_STRIKES,
  };
}

function signToken(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ $or: [{ email: cleanEmail }, { username }] });
    if (existing) return res.status(409).json({ message: "Username or email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const role = adminEmails().includes(cleanEmail) ? "admin" : "user";
    const user = await User.create({ username, email: cleanEmail, passwordHash, role });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // promote existing accounts whose email is in ADMIN_EMAILS
    if (adminEmails().includes(user.email) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    // checked after the password so ban status isn't revealed to strangers
    if (user.banned) return res.status(403).json({ banned: true, message: BAN_MESSAGE });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// fresh role and strike count, used when the app loads
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ user: publicUser(user) });
});

export default router;