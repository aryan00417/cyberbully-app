import json
import os
import re

import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ENGLISH_DIR = "./model"
HINDI_DIR = "./model_hinglish"

# English model: dataset labels -> our category scheme
CATEGORY_ALIAS = {
    "not_cyberbullying": "none",
    "other_cyberbullying": "harassment_other",
    "age": "age",
    "ethnicity": "ethnicity",
    "gender": "gender",
    "religion": "religion",
}

# Common Hindi words written in English letters. Words that are also normal
# English ("main", "log", "mat", "use") are left out so English isn't misrouted.
HINGLISH_WORDS = {
    "hai", "hain", "nahi", "nahin", "kya", "kyun", "kyu", "kaise", "kaun", "kab", "kahan",
    "tum", "tumhe", "tumko", "tumhara", "tumhari", "tumse", "tera", "tere", "teri",
    "mera", "mere", "meri", "mujhe", "mujhko", "mujhse", "humko", "aap", "aapko",
    "hoga", "hogi", "raha", "rahi", "rahe", "wala", "wali", "wale", "abhi", "bahut",
    "bohot", "bhot", "lekin", "aur", "bhi", "toh", "karo", "karna", "karunga",
    "karenge", "dunga", "denge", "maar", "marunga", "mardunga", "maarunga", "jaan",
    "bhai", "yaar", "chalo", "jao", "aaj", "ghar", "kuch", "isko", "usko", "woh",
    "wo", "tha", "thi",
}


def load_bundle(model_dir):
    """Returns (tokenizer, model, label_map), or None if the folder can't be loaded."""
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_dir)
        model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        model.eval()
        with open(os.path.join(model_dir, "label_map.json")) as f:
            label_map = json.load(f)
        print(f"Loaded model from {model_dir}")
        return tokenizer, model, label_map
    except Exception as err:
        print(f"Could not load {model_dir}: {err}")
        return None


english_bundle = load_bundle(ENGLISH_DIR)
hindi_bundle = load_bundle(HINDI_DIR)


def detect_language(text):
    """
    "hindi"    -> Devanagari script, goes to the MuRIL model
    "hinglish" -> Hindi in English letters, no local model, goes to the LLM
    "english"  -> everything else, goes to DistilBERT
    """
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return "english"

    devanagari = sum(1 for ch in letters if "\u0900" <= ch <= "\u097f")
    if devanagari / len(letters) >= 0.3:
        return "hindi"

    words = re.findall(r"[a-z]+", text.lower())
    hits = sum(1 for w in words if w in HINGLISH_WORDS)
    if hits >= 2 or (hits == 1 and len(words) <= 2):
        return "hinglish"

    return "english"


def run_model(bundle, text):
    tokenizer, model, label_map = bundle
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
    with torch.no_grad():
        probs = torch.softmax(model(**inputs).logits, dim=1)[0]
    pred_id = int(torch.argmax(probs).item())
    return label_map[str(pred_id)], float(probs[pred_id].item())


def make_result(flagged, category, confidence, language, model):
    return {
        "flagged": flagged,
        "category": category,
        "confidence": round(confidence, 3),
        "language": language,
        "model": model,
    }


app = FastAPI()


class PredictRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"english_model": english_bundle is not None, "hindi_model": hindi_bundle is not None}


@app.post("/predict")
def predict(req: PredictRequest):
    language = detect_language(req.text)

    # Romanized Hinglish: neither local model was trained on it, so we give
    # "no opinion" and the Node server sends it to OpenRouter.
    if language == "hinglish":
        return make_result(False, "none", 0.0, "hinglish", "none")

    if language == "hindi":
        if hindi_bundle is None:
            return make_result(False, "none", 0.0, "hindi", "none")
        label, confidence = run_model(hindi_bundle, req.text)
        flagged = label == "hate"
        # the Hindi dataset is hate / not hate only, so no finer category
        category = "harassment_other" if flagged else "none"
        return make_result(flagged, category, confidence, "hindi", "muril")

    if english_bundle is None:
        return make_result(False, "none", 0.0, "english", "none")
    label, confidence = run_model(english_bundle, req.text)
    category = CATEGORY_ALIAS.get(label, "harassment_other")
    return make_result(category != "none", category, confidence, "english", "distilbert")