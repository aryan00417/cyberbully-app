import rateLimit from "express-rate-limit";

// Caps how often a single user can trigger a moderation call.
// Protects your OpenRouter credits if someone spams the comment box during the demo.
export const moderationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 comments per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You're commenting too fast. Wait a moment and try again." },
});