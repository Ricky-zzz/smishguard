# SmishGuard

**AppBuildersPH Hackathon 2026 entry — theme: Local AI**

An on-device detector for **Philippine SMS smishing** (scam / phishing texts). Paste a
suspicious message and a small transformer — running entirely in your browser — returns a
verdict and a Taglish explanation. After the first load the app makes **zero network
calls**; it works in airplane mode.

## Why local?

SMS is where your OTPs, GCash/Maya alerts, and bank messages live. Sending a suspicious
text to the cloud to "check if it's a scam" means uploading the exact secrets the scammer
wants to a third party. SmishGuard runs the model on your device, so the message and the
verdict never leave the phone, it works with no connectivity, and checking costs nothing.

## Installation

Requirements: Node.js 18+ and npm.

```bash
npm install       # 1. install dependencies
npm run dev       # 2. run the dev server -> http://localhost:5173
```

The real model is the default (`Irumachi/smishguard-minilm`) and downloads once on first
load, then runs fully offline. To override it, set `VITE_MODEL_ID` in `.env` (see
`.env.example`).

Production build + offline test:

```bash
npm run build     # typecheck + build to dist/ (creates the service worker)
npm run preview   # serve the build at http://localhost:4173
```

Load the preview **once online** (so the model caches), then enable **airplane mode** —
everything still works.

## Deploy to Vercel (for the phone demo)

The build is static (`dist/`), so it deploys as a normal Vite project on **Vercel**, which
also gives you the HTTPS required for PWA install + service worker.

1. Push the repo to GitHub (done).
2. In Vercel: **Import project** → select `smishguard` → framework **Vite** (auto),
   build `npm run build`, output `dist`. No env vars needed.
3. **Phone demo (offline):**
   - On your phone, open the Vercel URL **once over Wi-Fi** and wait for the pill to say
     `Engine ready` (this downloads + caches the model and registers the service worker).
   - Tap **Add to Home Screen** (install the PWA).
   - Turn on **airplane mode** → open the installed app → paste a scam SMS → it still
     detects, counter stays at 0.

## How it works

- **Detection** — a fine-tuned small encoder exported to int8 ONNX, run by
  [Transformers.js](https://github.com/huggingface/transformers.js) inside a Web Worker on
  the **WASM** backend (`dtype: q8`). Model: [`Irumachi/smishguard-minilm`](https://huggingface.co/Irumachi/smishguard-minilm).
- **Explanation** — deterministic rules/signals (unknown URL, OTP request, brand
  impersonation, urgency, loan/raffle) rendered in Taglish. No LLM, no hallucination.
- **Safety net** — if the model says "legit" but the text has a suspicious link plus scam
  signals (or a high non-ham probability with a hard signal), the verdict is escalated and
  labelled "via safety rules". Reputable domains such as `shopee.ph` are not treated as
  suspicious links.
- **Learns from you, locally** — correct a verdict and the device remembers it (IndexedDB)
  and applies it to repeat/near-identical messages. A retrieval memory, not cloud, not
  on-device training — nothing leaves the phone.
- **Offline** — a service worker precaches the app shell and caches the model on first
  load (`vite-plugin-pwa`), so everything after that runs without a network.
- **Proof panel** — a live network-call counter, inference latency, and corrections
  learned.
- **Input without copy-paste** — on Android, share an SMS straight into the app
  (Web Share Target pre-fills the message); on any device, open the app with the message
  already copied and tap **"Gamitin ang na-copy kong message"**.

The abstractions (`Detector`, `Explainer`, `Storage`, `NetworkProbe`, plus the
`VerdictEngine` that composes rules + corrections) live behind interfaces — see
`architecture.md`.

## Project documents

- [`requirements.md`](./requirements.md) — what we must accomplish
- [`architecture.md`](./architecture.md) — structure and abstractions
- [`deliverables.md`](./deliverables.md) — submission checklist
- [`Q&A.md`](./Q&A.md) — judge Q&A: hard questions and concrete answers
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

- **Models:** `sentence-transformers/all-MiniLM-L6-v2` fine-tuned for sequence
  classification → int8 ONNX published at
  [`Irumachi/smishguard-minilm`](https://huggingface.co/Irumachi/smishguard-minilm).
- **Frameworks:** Vite, React, TypeScript, Transformers.js, ONNX Runtime Web; `transformers`,
  `datasets`, `onnxruntime`, `scikit-learn` (training).
- **Cloud / APIs:** none used at runtime.
- **Datasets:** public Philippine SMS data — `scottleechua/spam-and-marketing-sms`
  (CC-BY-4.0), `Henit007/henit11` + `Henit007/karannnn` (Hugging Face), and the UCI
  `sms_spam` collection (see `training/prepare_data.py`).
- **Existing code / assets:** open datasets and the open pretrained backbone above; the
  application code and the fine-tuned weights were produced during the hackathon.
- **AI development tools used:** opencode (AI coding assistant) and Google Colab for model
  training.

## Commands

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```
