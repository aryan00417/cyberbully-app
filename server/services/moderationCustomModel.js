/**
 * Moderation via our own fine-tuned DistilBERT model,
 * served locally through the FastAPI server (ml-service/serve.py).
 * Text only — no image or thread-context support.
 */

export async function moderateViaCustomModel({ text }) {
  const url = process.env.CUSTOM_MODEL_URL || "http://localhost:8001/predict";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || "" }),
    });
    if (!response.ok) {
      console.error("Custom model error:", response.status, await response.text());
      return { flagged: false, category: "none", confidence: 0 };
    }
    return await response.json();
  } catch (err) {
    
    return { flagged: false, category: "none", confidence: 0 };
  }
}