import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { requireAuth } from "../middleware/auth.js";
import { moderateContent } from "../services/moderation.js";
import { applyStrike } from "../services/strikes.js";

const router = express.Router();

// Get feed (newest first), paginated, with optional filter
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.filter === "flagged") filter.flagged = true;
  if (req.query.filter === "media") filter.image = { $ne: null };

  const [posts, total] = await Promise.all([
    Post.find(filter).populate("author", "username").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments(filter),
  ]);

  const counts = await Comment.aggregate([
    { $match: { post: { $in: posts.map((p) => p._id) } } },
    { $group: { _id: "$post", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

  res.json({
    posts: posts.map((p) => ({ ...p.toObject(), commentCount: countMap[p._id.toString()] || 0 })),
    hasMore: skip + posts.length < total,
    page,
  });
});

// Create a post
router.post("/", requireAuth, async (req, res) => {
  try {
    const { text, image } = req.body;
    if ((!text || !text.trim()) && !image) {
      return res.status(400).json({ message: "Post needs text or an image" });
    }

    const { flagged, category, confidence } = await moderateContent({
      text: text?.trim(),
      image,
    });

    const post = await Post.create({
      author: req.userId,
      text: text?.trim() || "",
      image: image || null,
      flagged,
      category,
      confidence,
    });

    const strikeInfo = await applyStrike(req.userId, { flagged, category, confidence });
    const populated = await post.populate("author", "username");
    res.status(201).json({ ...populated.toObject(), strikeInfo });
  } catch (err) {
    res.status(500).json({ message: "Could not create post", error: err.message });
  }
});

// Delete a post (author or admin)
router.delete("/:id", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.author.toString() !== req.userId && req.userRole !== "admin") {
    return res.status(403).json({ message: "You can only delete your own posts" });
  }
  await post.deleteOne();
  await Comment.deleteMany({ post: post._id });
  res.json({ message: "Post deleted" });
});

// Like / unlike a post
router.post("/:id/like", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const already = post.likes.some((id) => id.toString() === req.userId);
  if (already) {
    post.likes = post.likes.filter((id) => id.toString() !== req.userId);
  } else {
    post.likes.push(req.userId);
  }
  await post.save();
  res.json({ likes: post.likes.length, liked: !already });
});

export default router;