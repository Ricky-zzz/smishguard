# SmishGuard training

Runs on **Google Colab (free T4)**. Local Python is 3.14 and ML wheels are unreliable
there, so the notebook below is the supported path.

## Pipeline

```
prepare_data.py  →  finetune.py  →  export_onnx.py  →  eval.py  →  upload to HF
```

1. **Get + normalize the data** (easiest path, no accounts):
   ```bash
   python prepare_data.py --ph-preset --bootstrap --out data
   ```
   `--ph-preset` pulls the public PH sets; `--bootstrap` adds English SMS Spam Collection
   for volume. Sources (verified working):
   - `scottleechua/spam-and-marketing-sms` — GitHub raw CSV, **CC-BY-4.0**, PH, 5
     categories, ~2.2k usable text rows (830 spam).
   - `Henit007/henit11`, `Henit007/karannnn` — Hugging Face, PH telco SMS (~3.4k rows,
     includes real OTP/notification text).
   - `ucirvine/sms_spam` — SMS Spam Collection (English, 5.5k) — `--bootstrap`.
   - Kaggle `bwandowando/philippine-spam-sms-messages` (~1.5k) → download CSV → `--csv`.
   - Mendeley "SMS Phishing Dataset" (5,971; ham/spam/smishing) → download → `--csv`.
   Columns are auto-detected; rows with `<REDACTED>` text are skipped.
2. **Fine-tune** (start small; swap backbone only if F1 < 0.95). Use a **PyTorch** backbone,
   not the ONNX-only `Xenova/*` repo:
   ```bash
   python finetune.py --model sentence-transformers/all-MiniLM-L6-v2 --data data --out model
   ```
3. **Export + quantize to int8** (`torch.onnx`, no `optimum-cli`):
   ```bash
   python export_onnx.py --model-dir model --out onnx_out
   ```
4. **Evaluate honestly** and copy the numbers into the top-level README:
   ```bash
   python eval.py --model-dir model --data data/test.csv
   ```
5. **Publish** every file in `onnx_out/` to a public Hugging Face model repo, then set
   `VITE_MODEL_ID=<user>/<repo>` in `.env` and rebuild the PWA.

## Install (Colab)

```bash
pip install "transformers>=4.44" "datasets" "onnx" "onnxruntime" \
    scikit-learn accelerate
```

## Label schema

`ham, scam, impersonation, otp_phish, loan, raffle`. Binary `ham/scam` is the minimum
acceptable model; `prepare_data.py` maps common source labels onto this schema.

## Honesty

Report the real accuracy/F1 from `eval.py`. Fake benchmarks are grounds for
disqualification.
