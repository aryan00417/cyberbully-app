import sys
from datasets import load_dataset

sys.stdout.reconfigure(encoding="utf-8")

raw = load_dataset("manueltonneau/india-hate-speech-superset")
print(raw)
df = raw[list(raw.keys())[0]].to_pandas()

print(df.columns.tolist())
print(df["labels"].value_counts())
print(df["dataset"].value_counts())

has_devanagari = df["text"].astype(str).str.contains(r"[\u0900-\u097F]")
print("Share with Devanagari script:", round(has_devanagari.mean(), 3))

print(df[["text", "labels"]].sample(8, random_state=1).to_string())