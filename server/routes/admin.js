import express from "express";
import User from "../models/User.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

const safe = (u) => ({
  _id: u._id,
  username: u.username,
  email: u.email,
  role: u.role,
  strikes: u.strikes,
  banned: u.banned,
  bannedAt: u.bannedAt,
});

router.get("/users", async (req, res) => {
  const users = await User.find().sort({ strikes: -1, createdAt: -1 });
  res.json(users.map(safe));
});

router.post("/users/:id/ban", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") return res.status(400).json({ message: "Admins can't be banned" });

  user.banned = true;
  user.bannedAt = new Date();
  await user.save();
  res.json(safe(user));
});

// unbanning also resets the strike count
router.post("/users/:id/unban", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.banned = false;
  user.bannedAt = null;
  user.strikes = 0;
  await user.save();
  res.json(safe(user));
});

export default router;