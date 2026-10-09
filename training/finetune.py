"""Fine-tune a small encoder for SmishGuard SMS classification.

    python finetune.py --model Xenova/all-MiniLM-L6-v2 --data data --out model

For Taglish robustness, try --model jcblaise/roberta-tagalog-base instead.
"""

import argparse
import csv
import os

import numpy as np
from datasets import Dataset
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)


def load_split(path):
    rows = {"text": [], "label": []}
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            rows["text"].append(row["text"])
            rows["label"].append(row["label"])
    return Dataset.from_dict(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Xenova/all-MiniLM-L6-v2")
    parser.add_argument("--data", default="data")
    parser.add_argument("--out", default="model")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--lr", type=float, default=3e-5)
    parser.add_argument("--batch", type=int, default=32)
    args = parser.parse_args()

    train_ds = load_split(os.path.join(args.data, "train.csv"))
    val_ds = load_split(os.path.join(args.data, "val.csv"))
    labels = sorted(set(train_ds["label"]) | set(val_ds["label"]))
    label2id = {l: i for i, l in enumerate(labels)}
    id2label = {i: l for l, i in label2id.items()}

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model,
        num_labels=len(labels),
        id2label=id2label,
        label2id=label2id,
    )

    tokenized = train_ds.map(
        lambda b: tokenizer(b["text"], truncation=True, max_length=128),
        batched=True,
    ).map(lambda b: {"labels": [label2id[l] for l in b["label"]]}, batched=True)
    val_tok = val_ds.map(
        lambda b: tokenizer(b["text"], truncation=True, max_length=128),
        batched=True,
    ).map(lambda b: {"labels": [label2id[l] for l in b["label"]]}, batched=True)

    def metrics(pred):
        preds = np.argmax(pred.predictions, axis=-1)
        return {
            "accuracy": accuracy_score(pred.label_ids, preds),
            "f1": f1_score(pred.label_ids, preds, average="macro"),
        }

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=os.path.join(args.out, "runs"),
            per_device_train_batch_size=args.batch,
            per_device_eval_batch_size=args.batch,
            num_train_epochs=args.epochs,
            learning_rate=args.lr,
            eval_strategy="epoch",
            save_strategy="no",
            logging_steps=50,
            load_best_model_at_end=False,
        ),
        train_dataset=tokenized,
        eval_dataset=val_tok,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=metrics,
    )

    trainer.train()
    print("Validation:", trainer.evaluate())

    model.save_pretrained(args.out)
    tokenizer.save_pretrained(args.out)
    print(f"Saved fine-tuned model to {args.out}")


if __name__ == "__main__":
    main()
