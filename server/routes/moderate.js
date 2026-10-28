import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { moderateContent } from "../services/moderation.js";
import { moderationLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Dry run: nothing is saved and no strike is added
router.post("/preview", requireAuth, moderationLimiter, async (req, res) => {
  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "text is required" });
  if (text.length > 300) return res.status(400).json({ message: "Keep it under 300 characters" });

  const started = Date.now();
  const result = await moderateContent({ text });
  res.json({ ...result, ms: Date.now() - started });
});

export default router;