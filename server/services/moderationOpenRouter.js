/**
 * Moderation via OpenRouter (LLM API).
 * Handles text, optional image, and optional thread context.
 */

const VALID_CATEGORIES = ["religion", "age", "gender", "ethnicity", "harassment_other", "none"];

const SYSTEM_PROMPT = `You are a content moderation classifier for a social media post or comment.
You may be given the text itself, an image attached to it, and recent context from the same
conversation thread (earlier comments on the same post). Use the context: a reply can be harassment
even if it reads as harmless on its own — e.g. agreeing with or escalating a threat made earlier in
the thread ("I'll do the same") counts as flagged, in the same category as the comment it responds to.
If an image is included, judge whether the image itself is threatening, humiliating, or targets someone —
not just whether the caption is.

Respond with ONLY a JSON object, no prose, no markdown fences, in this exact shape:
{"flagged": boolean, "category": "religion" | "age" | "gender" | "ethnicity" | "harassment_other" | "none", "confidence": number}`;

export async function moderateViaOpenRouter({ text, image, context }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = image
    ? process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-001"
    : process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";

  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not set — skipping moderation, defaulting to not flagged.");
    return { flagged: false, category: "none", confidence: 0 };
  }

  const contextBlock = context ? `Recent thread context:\n${context}\n\n` : "";
  const userContent = [{ type: "text", text: `${contextBlock}New content: ${text || "(no caption)"}` }];
  if (image) userContent.push({ type: "image_url", image_url: { url: image } });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error:", response.status, await response.text());
      return { flagged: false, category: "none", confidence: 0 };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Could not parse moderation response:", raw);
      return { flagged: false, category: "none", confidence: 0 };
    }

    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "none";
    const flagged = Boolean(parsed.flagged);
    const confidence =
      typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0;

    return { flagged, category: flagged ? category : "none", confidence };
  } catch (err) {
    console.error("OpenRouter moderation call failed:", err.message);
    return { flagged: false, category: "none", confidence: 0 };
  }
}