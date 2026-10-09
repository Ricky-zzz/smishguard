# SmishGuard

An on-device detector for **Philippine SMS smishing** (scam / phishing texts). Paste a
suspicious message and a small transformer — running entirely in your browser — returns a
verdict and a Taglish explanation. After the first load the app makes **zero network
calls**; it works in airplane mode.

Built for **AppBuildersPH Hackathon 2026** (theme: *Local AI*).

## Why local?

SMS is where your OTPs, GCash/Maya alerts, and bank messages live. Sending a suspicious
text to the cloud to "check if it's a scam" means uploading the exact secrets the scammer
wants to a third party. SmishGuard runs the model on your device, so the message and the
verdict never leave the phone, it works with no connectivity, and checking costs nothing.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Without a trained model the app runs a **rules-only demo detector** (fully functional, for
UI + proof-panel testing). To use the real model, train it and set `VITE_MODEL_ID`:

```bash
cp .env.example .env
# VITE_MODEL_ID=your-username/smishguard-minilm
npm run build
```

## How it works

- **Detection** — a fine-tuned small encoder exported to int8 ONNX, run by
  [Transformers.js](https://github.com/huggingface/transformers.js) inside a Web Worker on
  the **WASM** backend (`dtype: q8`). Model: [`Irumachi/smishguard-minilm`](https://huggingface.co/Irumachi/smishguard-minilm).
- **Explanation** — deterministic rules/signals (unknown URL, OTP request, brand
  impersonation, urgency, loan/raffle) rendered in Taglish. No LLM, no hallucination.
- **Safety net** — if the model says "legit" but the text has a URL + scam signals (or a
  high scam probability), the verdict is escalated and labelled "via safety rules", so
  obvious scams can't silently pass.
- **Learns from you, locally** — correct a verdict and the device remembers it (IndexedDB)
  and applies it to repeat/near-identical messages. A retrieval memory, not cloud, not
  on-device training — nothing leaves the phone.
- **Offline** — a service worker precaches the app shell and caches the model on first
  load (`vite-plugin-pwa`), so everything after that runs without a network.
- **Proof panel** — a live network-call counter, inference latency, and corrections learned.

The abstractions (`Detector`, `Explainer`, `Storage`, `NetworkProbe`, plus the
`VerdictEngine` that composes rules + corrections) live behind interfaces — see
`architecture.md`.

## Project documents

- [`requirements.md`](./requirements.md) — what we must accomplish
- [`architecture.md`](./architecture.md) — structure and abstractions
- [`deliverables.md`](./deliverables.md) — submission checklist
- [`AGENTS.md`](./AGENTS.md) — instructions for AI coding agents
- [`training/README.md`](./training/README.md) — how to reproduce the model

## Training

The model is trained on public Philippine SMS datasets via `training/smishguard_colab.ipynb`
(Google Colab, free T4). See [`training/README.md`](./training/README.md).

### Evaluation

Honest held-out results from `training/eval.py` (747 test messages, 3 classes):

| Metric | Value |
|---|---|
| Accuracy | **0.9746** |
| Macro-F1 | **0.9681** |
| Test set size | 747 |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| ham | 0.97 | 0.98 | 0.98 | 386 |
| otp_phish | 0.95 | 0.95 | 0.95 | 79 |
| scam | 0.99 | 0.97 | 0.98 | 282 |

Trained on public PH SMS data (`--ph-preset`: scottleechua CC-BY-4.0 + Henit007 HF sets)
plus the English SMS Spam Collection. The corpus has no `impersonation`/`loan`/`raffle`
examples, so the model is 3-class; those labels are only surfaced by the rules explainer.

## Disclosures

- **Models:** `sentence-transformers/all-MiniLM-L6-v2` (or `jcblaise/roberta-tagalog-base`)
  fine-tuned by
  this project → int8 ONNX published on Hugging Face.
- **Frameworks:** Vite, React, TypeScript, Transformers.js, ONNX Runtime Web; `transformers`,
  `datasets`, `onnxruntime`, `scikit-learn` (training).
- **Cloud / APIs:** none used at runtime.
- **Datasets:** public PH SMS datasets (see `training/prepare_data.py`).
- **AI dev tools used:** _(list them here)_.

## Commands

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```
