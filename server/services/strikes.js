import User from "../models/User.js";

export const MAX_STRIKES = 3;
const MIN_CONFIDENCE_FOR_STRIKE = 0.6;

export const BAN_MESSAGE =
  "Your account has been banned for repeated harassment. If you think this is a mistake, contact an administrator.";

/**
 * Called after every moderated post or comment.
 * A strike is added only when the content was flagged with enough confidence,
 * which limits bans caused by uncertain flags. Admins are exempt so you can't
 * lock yourself out while testing. At MAX_STRIKES the account is banned.
 * Returns strike info for the client, or null when nothing happened.
 */
export async function applyStrike(userId, { flagged, category, confidence }) {
  if (!flagged || confidence < MIN_CONFIDENCE_FOR_STRIKE) return null;

  const existing = await User.findById(userId).select("role");
  if (!existing || existing.role === "admin") return null;

  const user = await User.findByIdAndUpdate(userId, { $inc: { strikes: 1 } }, { new: true });

  if (user.strikes >= MAX_STRIKES) {
    user.banned = true;
    user.bannedAt = new Date();
    await user.save();
  }

  return {
    strikes: user.strikes,
    maxStrikes: MAX_STRIKES,
    banned: user.banned,
    category,
    message: user.banned ? BAN_MESSAGE : undefined,
  };
}