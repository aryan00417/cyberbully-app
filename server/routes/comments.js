import express from "express";
import Comment from "../models/Comment.js";
import { requireAuth } from "../middleware/auth.js";
import { moderateContent } from "../services/moderation.js";
import { moderationLimiter } from "../middleware/rateLimiter.js";
import { applyStrike } from "../services/strikes.js";

const router = express.Router();

// Get comments for a post
router.get("/post/:postId", async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate("author", "username")
    .sort({ createdAt: 1 });
  res.json(comments);
});

// Create a comment: moderation runs first, with recent thread context
router.post("/post/:postId", requireAuth, moderationLimiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "text is required" });

    const recent = await Comment.find({ post: req.params.postId })
      .populate("author", "username")
      .sort({ createdAt: -1 })
      .limit(5);
    const context = recent
      .reverse()
      .map((c) => `@${c.author?.username}: ${c.text}`)
      .join("\n");

    const { flagged, category, confidence } = await moderateContent({
      text: text.trim(),
      context,
    });

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.userId,
      text: text.trim(),
      flagged,
      category,
      confidence,
    });

    const strikeInfo = await applyStrike(req.userId, { flagged, category, confidence });
    const populated = await comment.populate("author", "username");
    res.status(201).json({ ...populated.toObject(), strikeInfo });
  } catch (err) {
    res.status(500).json({ message: "Could not create comment", error: err.message });
  }
});

// Delete a comment (author or admin)
router.delete("/:id", requireAuth, async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });
  if (comment.author.toString() !== req.userId && req.userRole !== "admin") {
    return res.status(403).json({ message: "You can only delete your own comments" });
  }
  await comment.deleteOne();
  res.json({ message: "Comment deleted" });
});

export default router;