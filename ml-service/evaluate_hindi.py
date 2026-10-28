import sys

import numpy as np
import torch
from datasets import load_dataset
from sklearn.metrics import precision_score, recall_score
from sklearn.model_selection import train_test_split
from transformers import AutoModelForSequenceClassification, AutoTokenizer

sys.stdout.reconfigure(encoding="utf-8")

MODEL_DIR = "./model_hinglish"

# Same cleaning and split as train_hinglish.py, so this is the same validation set
raw = load_dataset("manueltonneau/india-hate-speech-superset")
df = raw[list(raw.keys())[0]].to_pandas()
df = df.dropna(subset=["text", "labels"])
df["labels"] = df["labels"].astype(int)
df = df[df["labels"].isin([0, 1])]
df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
_, val_df = train_test_split(df, test_size=0.15, stratify=df["labels"], random_state=42)

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.eval()

texts = val_df["text"].tolist()
y_true = val_df["labels"].to_numpy()
hate_probs = []

with torch.no_grad():
    for i in range(0, len(texts), 32):
        batch = tokenizer(
            texts[i : i + 32],
            truncation=True,
            max_length=128,
            padding=True,
            return_tensors="pt",
        )
        probs = torch.softmax(model(**batch).logits, dim=1)[:, 1]
        hate_probs.extend(probs.tolist())

hate_probs = np.array(hate_probs)

print("threshold | flagged | precision | recall")
for t in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
    pred = (hate_probs >= t).astype(int)
    if pred.sum() == 0:
        print(f"{t:.1f}       | 0       | n/a       | 0.00")
        continue
    p = precision_score(y_true, pred)
    r = recall_score(y_true, pred)
    print(f"{t:.1f}       | {pred.sum():<7} | {p:.2f}      | {r:.2f}")