"""Honest evaluation of the fine-tuned model on a held-out CSV.

    python eval.py --model-dir model --data data/test.csv

Prints accuracy, macro-F1, and a confusion matrix. Report these numbers in the
README. Never inflate them (fake benchmarks = disqualification).
"""

import argparse
import csv
import os

import numpy as np
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, classification_report, f1_score
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default="model")
    parser.add_argument("--data", default="data/test.csv")
    args = parser.parse_args()

    if not os.path.isfile(os.path.join(args.model_dir, "config.json")):
        raise SystemExit(
            f"No trained model at '{args.model_dir}'. Run finetune.py first."
        )

    texts, gold = [], []
    with open(args.data, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            texts.append(row["text"])
            gold.append(row["label"])

    tok = AutoTokenizer.from_pretrained(args.model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(args.model_dir)
    clf = pipeline("text-classification", model=model, tokenizer=tok, top_k=None)

    preds = []
    for out in clf(texts, truncation=True, max_length=128, batch_size=32):
        best = max(out, key=lambda d: d["score"])
        preds.append(best["label"])

    accuracy = accuracy_score(gold, preds)
    f1 = f1_score(gold, preds, average="macro")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Macro-F1: {f1:.4f}")
    print()
    print(classification_report(gold, preds, zero_division=0))

    labels = sorted(set(gold) | set(preds))
    ConfusionMatrixDisplay.from_predictions(
        gold, preds, labels=labels, display_labels=labels
    )
    print("Confusion matrix (labels:", labels, ")")
    cm = np.zeros((len(labels), len(labels)), dtype=int)
    idx = {l: i for i, l in enumerate(labels)}
    for g, p in zip(gold, preds):
        cm[idx[g], idx[p]] += 1
    print(cm)


if __name__ == "__main__":
    main()
