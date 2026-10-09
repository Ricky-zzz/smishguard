"""Normalize Philippine SMS datasets into train/val/test CSVs.

Quick start (no accounts needed):

    python prepare_data.py --ph-preset --out data

Or mix and match sources:

    python prepare_data.py --url <raw-csv-url> --csv local.csv --hf user/dataset --out data

Sources (verified working):
  - scottleechua/spam-and-marketing-sms (GitHub raw, CC-BY-4.0) — PH, 5 categories
  - Henit007/henit11 and Henit007/karannnn (Hugging Face) — PH telco SMS
  - ucirvine/sms_spam (Hugging Face) — SMS Spam Collection (English, volume)
  - Kaggle: bwandowando/philippine-spam-sms-messages (download CSV, use --csv)

Every source must expose a text-like and a label-like column; they are detected
automatically. Rows whose text is empty or "<REDACTED>" are dropped.
"""

import argparse
import csv
import io
import os
import random
import re
import urllib.request

LABELS = ["ham", "scam", "impersonation", "otp_phish", "loan", "raffle"]

TEXT_KEYS = ["text", "message", "sms", "content", "body", "v2"]
LABEL_KEYS = ["label", "category", "target", "class", "v1", "type"]

LABEL_MAP = {
    "ham": "ham",
    "legit": "ham",
    "legitimate": "ham",
    "notifs": "ham",
    "notif": "ham",
    "gov": "ham",
    "ads": "ham",
    "ad": "ham",
    "otp": "ham",
    "otp_phish": "otp_phish",
    "phishing": "otp_phish",
    "smishing": "scam",
    "smish": "scam",
    "spam": "scam",
    "scam": "scam",
    "fraud": "scam",
    "malicious": "scam",
    "1": "scam",
    "impersonation": "impersonation",
    "loan": "loan",
    "raffle": "raffle",
    "prize": "raffle",
}

# Source `otp` means a genuine OTP/notification message, not phishing. Only a
# message already labeled scam/spam that asks for an OTP/code becomes otp_phish.
OTP_PHISH_RE = re.compile(
    r"(?i)\b(otp|one[\s-]?time|verification code|verify code|auth code|6[\s-]?digit|\bpin\b|\bcode\b)\b"
)

PH_PRESET_URLS = [
    "https://raw.githubusercontent.com/scottleechua/data/main/spam-and-marketing-sms/text-messages.csv",
]
PH_PRESET_HF = ["Henit007/henit11", "Henit007/karannnn"]

# Small hand-curated seed set so classes that are scarce in the public corpus
# (otp_phish) are always present and the demo messages are represented. These
# are authored during the hackathon and disclosed as curated examples.
SEED_ROWS = [
    ("GCash: Na-block ang account mo. I-verify agad: https://gcash-verify.top/otp at ilagay ang 6-digit code na natanggap mo.", "otp_phish"),
    ("BDO: Your account has been locked. Unlock with your OTP: https://bdo-secure.info/login", "otp_phish"),
    ("Maya: incomplete KYC. Send your OTP to unblock: https://maya-verify.site/pin", "otp_phish"),
    ("Congrats! Nanalo ka ng P50,000. I-claim agad sa https://premyo-win.site bago mag-expire ngayong araw.", "scam"),
    ("Your package is held by customs. Pay the PHP 300 release fee: https://dhl-tracking.top", "scam"),
    ("Pautang agad, zero interest, walang collateral. I-message mo na ako ngayon para sa iyong loan.", "scam"),
    ("GCash: You have successfully sent P250.00 to Aling Nena. Ref 9921. New balance P1,240.00.", "ham"),
    ("BPI: Your transaction of PHP 250.00 at SM MAKATI was posted. If this was not you, call 889-10000. Never share your OTP.", "ham"),
    ("Shopee: Your order #12345678 is out for delivery today. Rider: Juan D. Estimated time: 2-5 PM.", "ham"),
    ("Nakuha ko na po yung padala niyo. Salamat po! - Aling Nena", "ham"),
]


def normalize_label(raw):
    return LABEL_MAP.get(str(raw).strip().lower())


def pick(fields, candidates):
    for key in candidates:
        if key in fields:
            return fields[key]
    return None


def records_to_rows(records):
    if not records:
        return []
    fields = {k.lower(): k for k in records[0].keys()}
    text_key = pick(fields, TEXT_KEYS)
    label_key = pick(fields, LABEL_KEYS)
    if not text_key or not label_key:
        raise SystemExit(
            f"Cannot find text/label columns. Columns seen: {list(fields.values())}"
        )
    rows = []
    for rec in records:
        text = str(rec.get(text_key, "") or "").strip()
        if not text or text.upper() in ("<REDACTED>", "REDACTED"):
            continue
        label = normalize_label(rec.get(label_key))
        if label == "scam" and OTP_PHISH_RE.search(text):
            label = "otp_phish"
        if label:
            rows.append((text, label))
    return rows


def rows_from_csv(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return records_to_rows(list(csv.DictReader(fh)))


def rows_from_url(url):
    with urllib.request.urlopen(url) as resp:
        text = resp.read().decode("utf-8", "replace")
    return records_to_rows(list(csv.DictReader(io.StringIO(text))))


def rows_from_hf(name):
    from datasets import load_dataset

    ds = load_dataset(name, split="train")
    return records_to_rows([dict(item) for item in ds])


def bootstrap():
    return rows_from_hf("ucirvine/sms_spam")


def split(rows, seed=42):
    random.Random(seed).shuffle(rows)
    n = len(rows)
    n_test = max(1, int(n * 0.15))
    n_val = max(1, int(n * 0.15))
    return rows[n_test + n_val :], rows[n_test : n_test + n_val], rows[:n_test]


def write_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["text", "label"])
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", action="append", default=[])
    parser.add_argument("--url", action="append", default=[])
    parser.add_argument("--hf", action="append", default=[])
    parser.add_argument("--bootstrap", action="store_true")
    parser.add_argument("--ph-preset", action="store_true")
    parser.add_argument("--out", default="data")
    args = parser.parse_args()

    rows = []
    for path in args.csv:
        rows.extend(rows_from_csv(path))
    for url in args.url:
        rows.extend(rows_from_url(url))
    for name in args.hf:
        rows.extend(rows_from_hf(name))
    if args.bootstrap:
        rows.extend(bootstrap())
    if args.ph_preset:
        for url in PH_PRESET_URLS:
            rows.extend(rows_from_url(url))
        for name in PH_PRESET_HF:
            rows.extend(rows_from_hf(name))

    rows.extend(SEED_ROWS)

    if not rows:
        raise SystemExit(
            "No rows loaded. Use --ph-preset, or pass --url / --csv / --hf / --bootstrap."
        )

    seen = set()
    deduped = []
    for text, label in rows:
        key = (text, label)
        if key in seen:
            continue
        seen.add(key)
        deduped.append((text, label))

    os.makedirs(args.out, exist_ok=True)
    train, val, test = split(deduped)
    write_csv(os.path.join(args.out, "train.csv"), train)
    write_csv(os.path.join(args.out, "val.csv"), val)
    write_csv(os.path.join(args.out, "test.csv"), test)

    counts = {}
    for _, label in deduped:
        counts[label] = counts.get(label, 0) + 1
    print(f"Total {len(deduped)} rows -> train {len(train)}, val {len(val)}, test {len(test)}")
    print("Label counts:", counts)
    for label in LABELS:
        if counts.get(label, 0) < 20:
            print(f"  NOTE: few/no examples for '{label}' ({counts.get(label, 0)})")


if __name__ == "__main__":
    main()
