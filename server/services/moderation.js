/**
 * Moderation orchestrator.
.
 *  - "custom": local models first (serve.py picks DistilBERT for English,
 *    MuRIL for Hindi)
 *
 * Routes only ever call moderateContent(), so nothing else changes.
 */

import { moderateViaOpenRouter } from "./moderationOpenRouter.js";
import { moderateViaCustomModel } from "./moderationCustomModel.js";

// How confident a local model must be before its "flagged" result is trusted.
// The Hindi model is weaker (hate F1 about 0.42 on validation), so it needs more.
const THRESHOLDS = {
  english: 0.6,
  hindi: 0.85,
};

/**
 * text: string
 * image: optional base64 data URL (posts only, local models ignore it)
 * context: optional string, recent comments in the same thread
 * Returns { flagged, category, confidence, source, local? }
 */
export async function moderateContent({ text, image, context } = {}) {
  const provider = process.env.MODERATION_PROVIDER || "openrouter";

  if (provider === "custom") {
    if (image) {
      const result = await moderateViaOpenRouter({ text, image, context });
      return { ...result, source: "openrouter" };
    }

    // serve.py detects the language and returns it with the verdict
    const local = await moderateViaCustomModel({ text });
    const threshold = THRESHOLDS[local.language] ?? THRESHOLDS.english;

    // Trust a local model only when it confidently flags something.
    // Clean verdicts, low confidence, romanized Hinglish and model errors
   
    const trustworthyPositive = local.flagged && local.confidence >= threshold;

    if (!trustworthyPositive) {
      console.log(`Local result not trusted (language: ${local.language}), confirming with OpenRouter`);
      const result = await moderateViaOpenRouter({ text, image, context });
      return { ...result, source: "openrouter", local };
    }

    return { ...local, source: "custom-model", local };
  }

  const result = await moderateViaOpenRouter({ text, image, context });
  return { ...result, source: "openrouter" };
}

// kept so nothing breaks if any old code still imports moderateText
export async function moderateText(text, context) {
  return moderateContent({ text, context });
}