# Disclosures & technical stack - SmishGuard

This is the complete, evidence-based disclosure for the AppBuildersPH Hackathon 2026
submission (theme: **Local AI**). Every item below is verifiable in this repository.
Nothing runs through a cloud AI API at runtime.

---

## 1. Product in one line

A **Progressive Web App (PWA)** that detects Philippine SMS smishing on-device: paste or
share a suspicious text, and a fine-tuned transformer running in the browser returns a
verdict, a Taglish explanation, and a local "corrections" memory. Zero network calls after
the first load.

## 2. AI models

| Item | Detail | Where in repo |
|---|---|---|
| **Backbone (pretrained, open)** | `sentence-transformers/all-MiniLM-L6-v2` (multilingual, ~22.7M params, BERT architecture). Used only as the starting point. | `training/finetune.py` |
| **Our trained artifact** | A sequence-classification head fine-tuned end-to-end on Philippine SMS data (see §5). `id2label: {0: ham, 1: otp_phish, 2: scam}`. | `training/finetune.py`, HF `Irumachi/smishguard-minilm-v2` |
| **Deployed/inference format** | int8 dynamic-quantized ONNX (`model_quantized.onnx`, ~23 MB) + fp32 `model.onnx`. Exported with the new `torch.export`-based ONNX exporter (opset 18, eager attention), verified by a torch-vs-ONNX parity gate. | `training/export_onnx.py` |
| **Model hosting** | Public Hugging Face repo `Irumachi/smishguard-minilm-v2`. | `src/config.ts`, README |
| **Honest metrics** | 748-message held-out test: **accuracy 0.9719, weighted-F1 0.97, macro-F1 0.8905** (macro dragged down by the 5-example `otp_phish` class). Full confusion matrix in README. | `README.md` |
| **Scam-detection engine in-app** | A deterministic rules/safety-net layer on top of the model: suspicious-link detection, OTP/brand/urgency/loan/raffle markers, escalation + neutral guard. | `src/signals.ts`, `src/policy/verdictEngine.ts` |

## 3. Frameworks & languages

| Layer | Framework / library | Evidence |
|---|---|---|
| Web app | **React 18** + **TypeScript 5** (Vite 6 build) | `package.json` |
| Local ML runtime | **Transformers.js v3** (`@huggingface/transformers`) + **ONNX Runtime Web** (WASM, `dtype: q8`) inside a **Web Worker** | `src/worker/inference.worker.ts` |
| PWA | **vite-plugin-pwa** (Workbox): manifest, service worker, offline caching, Web Share Target | `vite.config.ts` |
| Inference abstraction | `Detector` / `Explainer` / `Storage` / `NetworkProbe` interfaces + `VerdictEngine` | `src/detector/*`, `src/explainer/*`, `src/storage/*`, `src/proof/*`, `src/policy/*` |
| Lint / typecheck | eslint + typescript-eslint, `tsc --noEmit` | `package.json` |

## 4. Training stack

| Item | Detail |
|---|---|
| Training runtime | **Google Colab** (T4 GPU); Python 3.13. Local Python is 3.14 and was not used for training. |
| Libraries | `transformers` (Trainer), `datasets`, `torch`, `onnx`, `onnxscript`, `onnxruntime`, `scikit-learn`, `accelerate` |
| Export | `torch.onnx.export` (new `torch.export` exporter, `dynamo=True`, opset 18, eager attention) → `onnxruntime.quantization.quantize_dynamic` (int8) |
| Checkpoint selection | Best epoch by validation **F1** (not final epoch) via `load_best_model_at_end`. |
| Reproducibility | `training/smishguard_fixed.ipynb` runs data → finetune → export (parity-gated) → eval → upload in one pass. |

## 5. Data

| Source | Type | License/notes |
|---|---|---|
| `scottleechua/spam-and-marketing-sms` (`text-messages.csv`) | ~8.9k PH SMS, 5 categories | **CC-BY-4.0**; streamed from GitHub in `prepare_data.py` |
| `Henit007/henit11`, `Henit007/karannnn` | PH telco SMS (GoTyme, BDO, GOMO…) | Public HF datasets; unsigned personal uploads - provenance noted |
| `ucirvine/sms_spam` | SMS Spam Collection, 5.5k (English, volume) | Public UCI/HF dataset |
| **Hand-curated seed set (ours)** | 10 labeled examples authored during the hackathon, representing scarce classes + demo messages (`SEED_ROWS`) | Authored by the team, disclosed |

Label mapping, dedup, redaction-filtering, and the `otp`→`ham` correction are in
`training/prepare_data.py`. Test split is a deterministic 15% hold-out (seed 42), untouched
by training.

## 6. APIs & cloud services

- **Runtime: none.** The app makes **zero network calls** after the first load (proof panel
  live counter; service-worker caching). No cloud AI, no backend, no analytics, no
  third-party runtime API.
- **First-load-only:** downloads the ~23 MB model once from the Hugging Face CDN
  (`huggingface.co` / `cdn-lfs.huggingface.co`, cached by the service worker `CacheFirst`).
- **Browser APIs used (local):** Web Workers (inference), IndexedDB (history + corrections),
  Service Worker / Cache API (offline), Clipboard API (paste quick-use), Web Share Target
  (Android share-into-app), `beforeinstallprompt`/`appinstalled` (PWA install).

## 7. AI development tools (required disclosure)

- **opencode** (AI coding assistant) - used for scaffolding, implementation, debugging, and
  documentation throughout the build.
- **Google Colab** - used as the GPU training environment.
- **AI-assisted development is allowed** by the hackathon rules; the above is disclosed per
  the rules. All product decisions and the final code are owned by the team.

## 8. Existing code & assets

- **Open models** used solely as starting points: `sentence-transformers/all-MiniLM-L6-v2`.
- **Open datasets**: listed in §5.
- **Open-source libraries**: listed in §3-§4.
- **Everything else was produced during the hackathon**: the application code, the
  fine-tuned weights, the exported ONNX, the PWA config, the inference/explainer rules, the
  UI, the app icons, and the documentation. No pre-existing application code was reused.
- **AI-generated assets:** app icons were generated during the hackathon (shield graphic).

## 9. How to verify

- Repo (public): `https://github.com/Ricky-zzz/smishguard`
- Model: `https://huggingface.co/Irumachi/smishguard-minilm-v2`
- Recreate inference: `npm install && npm run dev` - the app pulls the public model on first
  load and runs fully offline after that.
- Recreate training + eval: `training/smishguard_fixed.ipynb` (Colab, T4), reproduces data →
  finetune → parity-checked export → eval.
- Runtime checks: proof-panel **network-calls counter**, per-inference latency, airplane-mode
  test.