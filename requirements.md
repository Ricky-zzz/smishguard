# requirements.md — SmishGuard

The contract for what we must accomplish. If code, docs, or the demo disagree with
this file, **stop and ask before changing either side** (see `AGENTS.md`).

## 0. One-line product

A **Progressive Web App (PWA)** that detects Philippine **SMS smishing** (scam/phishing
texts) entirely **on-device**, using a **fine-tuned small transformer** that runs in the
browser via ONNX Runtime Web / Transformers.js. No cloud AI at runtime.

## 1. Challenge compliance (AppBuildersPH 2026 — Local AI)

| Rule (from briefing) | How SmishGuard satisfies it |
|---|---|
| Substantially built during the hackathon | Built Oct 9–10; only open datasets + open pretrained backbones are pre-existing |
| A meaningful part of AI inference executes locally | The classifier forward pass runs in-browser via WASM int8 |
| A working product, demonstrated | Live PWA demo on Demo Day |
| Models, APIs, frameworks, major tools disclosed | See `deliverables.md` §4 |
| Core Local AI works without depending entirely on a cloud AI API | Runtime makes **zero** network calls after first load; no AI API at all |
| Must answer: "Why does this benefit from running AI locally?" | §5 |

The theme is **Local AI**, not "Local LLM". A locally-executed trained classifier
qualifies (in-scope list includes *Local embeddings*, *Edge AI*, *Privacy-preserving AI*).

## 2. Functional requirements

- **FR1 — Input.** User can paste a message; on Android also **share** an SMS straight into
  the app (Web Share Target pre-fills it), or tap **"Gamitin ang na-copy kong message"** to
  read the clipboard. No automatic inbox reading (see §6 non-goals).
- **FR2 — Detect.** On submit, the app classifies the text into one of:
  `ham`, `scam`, `impersonation`, `otp_phish`, `loan`, `raffle`. Binary
  `scam`/`ham` is the minimum acceptable model; the multi-class set is the target.
- **FR3 — Verdict UI.** Show: label, confidence, and a clear scam/ham banner.
- **FR4 — Explanation (no chatbot).** Show 1–3 deterministic reasons in Taglish derived
  from a small rules/signals table (URL, OTP request, brand impersonation, urgency,
  money/loan/raffle keywords). No generated text, no second model, no LLM.
- **FR5 — History.** Persist confirmed verdicts in IndexedDB; list them with timestamp +
  label. User can delete entries.
- **FR6 — Offline.** After the first load, the app and model are cached (service worker)
  and it works in airplane mode.
- **FR7 — Proof panel.** Show a live network-request counter (starts at 0), per-inference
  latency, and the model/data size.
- **FR8 — Feedback.** User can mark a verdict wrong ("legit ito" / "scam ito"). The
  correction is stored locally in IndexedDB.
- **FR9 — Local auto-correction.** On the next check, a stored correction (exact or
  ~similar message, token-Jaccard ≥ 0.8) is applied and the verdict is marked
  "via your correction". This is a local memory, **not** on-device training (§6).
- **FR10 — Rules safety net.** If the model says `ham` but the text has a **suspicious**
  link **and** scam signals (OTP/brand/urgency/loan/raffle), or P(non-ham) ≥ 0.6 with a hard
  signal (suspicious link/urgency/loan/raffle), the verdict is escalated and marked
  "via safety rules". Reputable sender domains and mere brand/OTP mentions alone do not
  trigger it.
- **FR11 — Neutral guard.** If the model says `scam` but the text has **no** scam marker
  (no suspicious link, brand, OTP request, urgency, loan, or raffle), the verdict is shown
  as **"Hindi sigurado"** instead of a confident scam. Guards against out-of-distribution
  casual Tagalog being wrongly flagged.

## 3. Non-functional requirements

- **NFR1 — Accuracy.** Fine-tuned model must reach **weighted-F1 ≥ 0.95** on a held-out
  test set (measured: 0.97). Report macro-F1 too and explain it — the rare `otp_phish`
  class (5 test examples) dominates macro-F1, so it is reported but not the bar. Never
  inflate (fake benchmarks = disqualification).
- **NFR2 — Latency.** Single-message inference **< 50 ms** on the demo device (WASM CPU).
- **NFR3 — Size.** int8 model bundle **< 50 MB** preferred (MiniLM ~23 MB; RoBERTa-tagalog
  ~110 MB is the fallback ceiling).
- **NFR4 — Offline.** 100% of inference path works with no network.
- **NFR5 — Compatibility.** Runs on any WebAssembly browser (Chrome/Edge/Firefox/Safari),
  CPU-only. The shipped int8 model uses the **WASM q8** backend; WebGPU is a possible future
  enhancement (would need an `fp16` export), never a hard dependency.
- **NFR6 — Determinism.** Same input → same verdict and explanation.

## 4. Training requirements

- **TR1 — Data.** Use public PH SMS datasets (`--ph-preset` pulls scottleechua
  CC-BY-4.0 + the Henit007 Hugging Face sets; `--bootstrap` adds the English SMS Spam
  Collection). Document every source. Normalize to `text,label`.
- **TR2 — Backbone.** Start with `sentence-transformers/all-MiniLM-L6-v2` (PyTorch,
  small, exports cleanly). The ONNX-only `Xenova/*` repos are for inference, not training.
  Swap to `jcblaise/roberta-tagalog-base` only if NFR1 fails.
- **TR3 — Method.** Fine-tune a sequence-classification head end-to-end (not just a probe)
  so the artifact is genuinely "our trained model".
- **TR4 — Export.** `torch.onnx.export` → dynamic int8 quantization → publish tokenizer +
  config + `onnx/model_quantized.onnx` to a public Hugging Face repo. (Not `optimum-cli`,
  which conflicts with Colab's diffusers/huggingface_hub versions.)
- **TR5 — Evaluation.** Hold out ~15% stratified; produce a confusion matrix + F1
  reported in the README. If the corpus is small/noisy, say so.

## 5. Why this benefits from running AI locally (mandatory answer)

SMS is where **OTPs, GCash/Maya/bank alerts, and personal messages** live. Sending a
suspicious text to a cloud service to "check if it's a scam" means **uploading the exact
secrets the scammer wants** to a third party — self-defeating. On-device inference keeps
the message, the OTP, and the verdict on the phone; it works with **zero connectivity**
(scams arrive just as often on flaky rural data); and it costs nothing per message, so a
user can check every text. Cloud-only cannot make that privacy guarantee.

## 6. Non-goals (explicitly out of scope)

- Automatic SMS inbox scanning / background interception (needs native Android perms;
  impossible on iOS; not buildable in 24h).
- A conversational chatbot or LLM explanation generator (deterministic explainer instead).
- Guaranteeing detection of *novel, unseen* scam wording.
- Real-time URL/webpage fetching or reputation lookups (would break the offline claim).
- **On-device gradient training / fine-tuning** of the neural network. In 2026 that is
  research-grade on consumer hardware. FR9 is a local correction *memory* (retrieval),
  and we say so — it must not be described as the model "re-training".

## 7. Open decisions / assumptions

- A1 — Training runs on **Google Colab (free T4)** because local Python is 3.14 and ML
  wheels are unreliable there.
- A2 — Demo device: any laptop with Chrome; airplane mode during the live demo.
- A3 — Model repo will be public on Hugging Face under the participant's account.
