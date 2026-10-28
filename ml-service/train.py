import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
import json
import os

DATA_PATH = "data/cyberbullying_tweets.csv"
MODEL_NAME = "distilbert-base-uncased"
OUTPUT_DIR = "./model"

df = pd.read_csv(DATA_PATH)
df = df.rename(columns={"tweet_text": "text", "cyberbullying_type": "label"})
df = df.dropna(subset=["text", "label"])
# df = df.sample(20000, random_state=42).reset_index(drop=True)

label_encoder = LabelEncoder()
df["label_id"] = label_encoder.fit_transform(df["label"])
num_labels = len(label_encoder.classes_)

train_df, val_df = train_test_split(df, test_size=0.15, stratify=df["label_id"], random_state=42)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=128)

train_ds = Dataset.from_pandas(train_df[["text", "label_id"]].rename(columns={"label_id": "labels"}))
val_ds = Dataset.from_pandas(val_df[["text", "label_id"]].rename(columns={"label_id": "labels"}))
train_ds = train_ds.map(tokenize, batched=True)
val_ds = val_ds.map(tokenize, batched=True)

model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=num_labels)

args = TrainingArguments(
    output_dir="./checkpoints",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    load_best_model_at_end=True,
    logging_steps=50,
)

trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds)
trainer.train()

os.makedirs(OUTPUT_DIR, exist_ok=True)
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

with open(os.path.join(OUTPUT_DIR, "label_map.json"), "w") as f:
    json.dump({str(i): label for i, label in enumerate(label_encoder.classes_)}, f)

print("Training done. Model saved to", OUTPUT_DIR)