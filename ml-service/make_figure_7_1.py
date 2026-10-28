import glob
import json
import os
import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import confusion_matrix
from transformers import AutoTokenizer, AutoModelForSequenceClassification

DATA_PATH = "data/cyberbullying_tweets.csv"
MODEL_DIR = "./model"
CKPT_DIR = "./checkpoints"
BATCH_SIZE = 32

state_files = glob.glob(os.path.join(CKPT_DIR, "checkpoint-*", "trainer_state.json"))
state_files.sort(key=lambda p: int(p.split("checkpoint-")[-1].split(os.sep)[0]))
with open(state_files[-1]) as f:
    log = json.load(f)["log_history"]

train_pts = [(e["epoch"], e["loss"]) for e in log if "loss" in e]
eval_pts = [(e["epoch"], e["eval_loss"]) for e in log if "eval_loss" in e]

df = pd.read_csv(DATA_PATH)
df = df.rename(columns={"tweet_text": "text", "cyberbullying_type": "label"})
df = df.dropna(subset=["text", "label"])
le = LabelEncoder()
df["label_id"] = le.fit_transform(df["label"])
_, val_df = train_test_split(df, test_size=0.15, stratify=df["label_id"], random_state=42)
val_df = val_df.reset_index(drop=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
tok = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR).to(device)
model.eval()

texts = val_df["text"].tolist()
y_true = val_df["label_id"].to_numpy()
preds = []
with torch.no_grad():
    for i in range(0, len(texts), BATCH_SIZE):
        enc = tok(texts[i:i + BATCH_SIZE], padding=True, truncation=True,
                  max_length=128, return_tensors="pt").to(device)
        preds.extend(model(**enc).logits.argmax(-1).cpu().tolist())
        if (i // BATCH_SIZE) % 20 == 0:
            print(f"{i}/{len(texts)}")

cm = confusion_matrix(y_true, np.array(preds))
cm_norm = cm / cm.sum(axis=1, keepdims=True)
names = list(le.classes_)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))

ax1.plot(*zip(*train_pts), label="Training loss", alpha=0.8)
ax1.plot(*zip(*eval_pts), marker="o", linewidth=2, label="Validation loss")
ax1.set_xlabel("Epoch")
ax1.set_ylabel("Loss")
ax1.set_title("(a) Training and validation loss")
ax1.legend()
ax1.grid(alpha=0.3)

im = ax2.imshow(cm_norm, cmap="Blues", vmin=0, vmax=1)
ax2.set_xticks(range(len(names)))
ax2.set_yticks(range(len(names)))
ax2.set_xticklabels(names, rotation=45, ha="right")
ax2.set_yticklabels(names)
ax2.set_xlabel("Predicted")
ax2.set_ylabel("True")
ax2.set_title("(b) Confusion matrix (row-normalised)")
for i in range(len(names)):
    for j in range(len(names)):
        ax2.text(j, i, f"{cm_norm[i, j]:.2f}", ha="center", va="center",
                 color="white" if cm_norm[i, j] > 0.5 else "black", fontsize=9)
fig.colorbar(im, ax=ax2, fraction=0.046)

plt.tight_layout()
plt.savefig("figure_7_1.png", dpi=200)
print("Saved figure_7_1.png")