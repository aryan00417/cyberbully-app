import os
import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, f1_score
from transformers import AutoTokenizer, AutoModelForSequenceClassification

DATA_PATH = "data/cyberbullying_tweets.csv"
MODEL_DIR = "./model"
BATCH_SIZE = 32

df = pd.read_csv(DATA_PATH)
df = df.rename(columns={"tweet_text": "text", "cyberbullying_type": "label"})
df = df.dropna(subset=["text", "label"])

label_encoder = LabelEncoder()
df["label_id"] = label_encoder.fit_transform(df["label"])

_, val_df = train_test_split(
    df, test_size=0.15, stratify=df["label_id"], random_state=42
)
val_df = val_df.reset_index(drop=True)
print("Validation samples:", len(val_df))

device = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR).to(device)
model.eval()

texts = val_df["text"].tolist()
y_true = val_df["label_id"].to_numpy()
preds = []

with torch.no_grad():
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        enc = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=128,
            return_tensors="pt",
        ).to(device)
        logits = model(**enc).logits
        preds.extend(logits.argmax(dim=-1).cpu().tolist())
        if (i // BATCH_SIZE) % 20 == 0:
            print(f"{i}/{len(texts)}")

y_pred = np.array(preds)
names = list(label_encoder.classes_)

print()
print(classification_report(y_true, y_pred, target_names=names, digits=3))
print("Overall accuracy:", round(accuracy_score(y_true, y_pred), 3))
print("Macro F1:", round(f1_score(y_true, y_pred, average="macro"), 3))