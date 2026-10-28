import express from "express";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store");

  const [totalComments, totalPosts, flaggedComments, flaggedPosts] = await Promise.all([
    Comment.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments({ flagged: true }),
    Post.countDocuments({ flagged: true }),
  ]);

  const byCategoryPipeline = [
    { $match: { flagged: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ];
  const [commentCats, postCats] = await Promise.all([
    Comment.aggregate(byCategoryPipeline),
    Post.aggregate(byCategoryPipeline),
  ]);

  const merged = {};
  for (const row of [...commentCats, ...postCats]) {
    merged[row._id] = (merged[row._id] || 0) + row.count;
  }
  const byCategory = Object.entries(merged).map(([category, count]) => ({ category, count }));

  const [recentComments, recentPosts] = await Promise.all([
    Comment.find({ flagged: true }).populate("author", "username").sort({ createdAt: -1 }).limit(10),
    Post.find({ flagged: true }).populate("author", "username").sort({ createdAt: -1 }).limit(10),
  ]);

  const toRow = (item, kind) => ({
    _id: item._id,
    kind,
    text: item.text || "(image post)",
    author: item.author?.username,
    category: item.category,
    confidence: item.confidence,
    createdAt: item.createdAt,
  });

  const recentFlagged = [
    ...recentComments.map((c) => toRow(c, "comment")),
    ...recentPosts.map((p) => toRow(p, "post")),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 15);

  const total = totalComments + totalPosts;
  const flaggedTotal = flaggedComments + flaggedPosts;

  res.json({
    total,
    totalPosts,
    totalComments,
    flaggedTotal,
    flaggedPosts,
    flaggedComments,
    flaggedPercent: total ? Math.round((flaggedTotal / total) * 100) : 0,
    byCategory,
    recentFlagged,
  });
});
// Safe numbers for every logged-in user (the full dashboard stays admin-only)
router.get("/public", requireAuth, async (req, res) => {
  res.set("Cache-Control", "no-store");

  const [totalComments, totalPosts, flaggedComments, flaggedPosts] = await Promise.all([
    Comment.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments({ flagged: true }),
    Post.countDocuments({ flagged: true }),
  ]);

  const pipeline = [{ $match: { flagged: true } }, { $group: { _id: "$category", count: { $sum: 1 } } }];
  const [postCats, commentCats] = await Promise.all([
    Post.aggregate(pipeline),
    Comment.aggregate(pipeline),
  ]);
  const merged = {};
  for (const row of [...postCats, ...commentCats]) {
    merged[row._id] = (merged[row._id] || 0) + row.count;
  }
  const byCategory = Object.entries(merged)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const total = totalPosts + totalComments;
  const flagged = flaggedPosts + flaggedComments;

  res.json({
    total,
    flagged,
    flaggedPercent: total ? Math.round((flagged / total) * 100) : 0,
    byCategory,
  });
});
export default router;