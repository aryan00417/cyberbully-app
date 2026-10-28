import json
import os
import sys

import numpy as np
from datasets import Dataset, load_dataset
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
    set_seed,
)

sys.stdout.reconfigure(encoding="utf-8")
set_seed(42)

DATASET_NAME = "manueltonneau/india-hate-speech-superset"
MODEL_NAME = "google/muril-base-cased"
OUTPUT_DIR = "./model_hinglish"
# Temporary checkpoints go outside OneDrive so it doesn't sync several GB
CHECKPOINT_DIR = "C:/hf_checkpoints/hinglish"

# 1. Load and clean the data (uses the Hugging Face login from earlier)
raw = load_dataset(DATASET_NAME)
df = raw[list(raw.keys())[0]].to_pandas()

df = df.dropna(subset=["text", "labels"])
df["labels"] = df["labels"].astype(int)
df = df[df["labels"].isin([0, 1])]
df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
print("Rows:", len(df))
print(df["labels"].value_counts())

train_df, val_df = train_test_split(
    df, test_size=0.15, stratify=df["labels"], random_state=42
)

# 2. Tokenize (padding happens per batch, which is faster than always padding to 128)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)


def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, max_length=128)


train_ds = Dataset.from_pandas(train_df[["text", "labels"]], preserve_index=False).map(
    tokenize, batched=True
)
val_ds = Dataset.from_pandas(val_df[["text", "labels"]], preserve_index=False).map(
    tokenize, batched=True
)

# 3. Model: MuRIL with a fresh 2-class head (not_hate / hate)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds),
    }


args = TrainingArguments(
    output_dir=CHECKPOINT_DIR,
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    num_train_epochs=3,
    weight_decay=0.01,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    greater_is_better=True,
    save_total_limit=1,
    logging_steps=50,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
)

trainer.train()

# 4. Final report on the validation set (screenshot this for your review)
pred = trainer.predict(val_ds)
y_pred = np.argmax(pred.predictions, axis=-1)
print(classification_report(pred.label_ids, y_pred, target_names=["not_hate", "hate"]))

# 5. Save the model, tokenizer and label map
os.makedirs(OUTPUT_DIR, exist_ok=True)
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
with open(os.path.join(OUTPUT_DIR, "label_map.json"), "w") as f:
    json.dump({"0": "not_hate", "1": "hate"}, f)

print("Training done. Model saved to", OUTPUT_DIR)