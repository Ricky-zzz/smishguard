# SmishGuard training

Runs on **Google Colab (free T4)**. Local Python is 3.14 and ML wheels are unreliable
there, so the notebook below is the supported path.

## Pipeline

```
prepare_data.py  →  finetune.py  →  export_onnx.py  →  eval.py  →  upload to HF
```

1. **Get the data.** Easiest path (no accounts):
   ```bash
   python prepare_data.py --ph-preset --out data     # PH sources below
   python prepare_data.py --ph-preset --bootstrap --out data   # + English volume
   ```
   Sources (verified working):
   - `scottleechua/spam-and-marketing-sms` — GitHub raw CSV, **CC-BY-4.0**, PH, 5
     categories, ~2.2k usable text rows (830 spam).
   - `Henit007/henit11`, `Henit007/karannnn` — Hugging Face, PH telco SMS (~3.4k rows,
     includes real OTP/notification text).
   - `ucirvine/sms_spam` — SMS Spam Collection (English, 5.5k) — use `--bootstrap`.
   - Kaggle `bwandowando/philippine-spam-sms-messages` (~1.5k, needs Kaggle login) →
     download the CSV and pass `--csv`.
   - Mendeley "SMS Phishing Dataset" (5,971; ham/spam/smishing) → download → `--csv`.
   All sources just need a text-like and label-like column; they are auto-detected.
   Rows with `<REDACTED>` text are skipped.
2. **Normalize + split:**
   ```bash
   python prepare_data.py --csv ph_spam.csv --csv more.csv --out data
   # or, to smoke-test the pipeline with the public SMS Spam Collection:
   python prepare_data.py --bootstrap --out data
   ```
3. **Fine-tune** (start small; swap backbone only if F1 < 0.95):
   ```bash
   python finetune.py --model Xenova/all-MiniLM-L6-v2 --data data --out model
   ```
4. **Export + quantize to int8:**
   ```bash
   python export_onnx.py --model-dir model --out onnx_out
   ```
5. **Evaluate honestly** and copy the numbers into the top-level README:
   ```bash
   python eval.py --model-dir model --data data/test.csv
   ```
6. **Publish** every file in `onnx_out/` to a public Hugging Face model repo, then set
   `VITE_MODEL_ID=<user>/<repo>` in `.env` and rebuild the PWA.

## Install (Colab)

```bash
pip install "transformers>=4.44" "datasets" "optimum[onnxruntime]" "onnxruntime" \
    scikit-learn accelerate
```

## Label schema

`ham, scam, impersonation, otp_phish, loan, raffle`. Binary `ham/scam` is the minimum
acceptable model; `prepare_data.py` maps common source labels onto this schema.

## Honesty

Report the real accuracy/F1 from `eval.py`. Fake benchmarks are grounds for
disqualification.
