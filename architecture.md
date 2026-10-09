# architecture.md — SmishGuard

How the program is structured and the abstractions it follows. Read together with
`requirements.md` (what) and `deliverables.md` (finish line). See `AGENTS.md` for the
conflict rule.

## 1. System overview

Runtime is a **client-only** PWA. There is no backend. The only network activity ever is
the *first* load (app assets + model download), after which a service worker serves
everything from cache.

```
┌──────────────────────────── Browser (client) ────────────────────────────┐
│                                                                          │
│  UI (React)                                                              │
│   ├─ Input panel        (paste / Web Share Target)                       │
│   ├─ Verdict panel      (label + confidence + scam/ham banner)           │
│   ├─ Explanation panel  (Taglish reasons)                                │
│   ├─ History panel      (IndexedDB)                                      │
│   └─ Proof panel        (network counter, latency, sizes)                │
│                                                                          │
│  Core services (abstractions)                                            │
│   ├─ Detector      → classification                                      │
│   ├─ Explainer     → deterministic reasons                               │
│   ├─ Storage       → IndexedDB history                                   │
│   └─ NetworkProbe  → counts fetch/XHR, measures latency                  │
│                                                                          │
│  Inference worker (Web Worker)                                           │
│   └─ Transformers.js pipeline('text-classification') → ONNX Runtime Web  │
│        backend: WASM int8 (q8)                                          │
│                                                                          │
│  Service worker (PWA)                                                    │
│   └─ precache app shell + model files → offline after first load         │
└──────────────────────────────────────────────────────────────────────────┘

Offline training path (separate, not shipped at runtime):
  datasets → finetune.py → export_onnx.py (int8) → public HF repo → (served to client)
```

## 2. Data flow (single detection)

```
user text
  │
  ▼
UI.submit(text)
  │  (detector.classify)
  ▼
Worker: tokenize → transformer forward pass → logits → softmax
  │
  ▼
DetectorResult { label, confidence, scores }
  │
  ├─► Explainer.explain(text, result) → reasons[]  (rules + token attribution)
  │
  ├─► UI renders Verdict + Explanation
  │
  └─► Storage.add({text, label, confidence, at})   (on confirm)
```

## 3. Abstractions (the important part)

Each abstraction is a TypeScript interface with one production implementation. Swapping
implementations must not require touching the UI.

### 3.1 Detector
```ts
interface DetectorResult {
  label: Label;                 // 'ham' | 'scam' | 'impersonation' | 'otp_phish' | 'loan' | 'raffle'
  confidence: number;           // 0..1
  scores: Record<Label, number>;
}
interface Detector {
  ready(): Promise<void>;
  classify(text: string): Promise<DetectorResult>;
}
```
- Impl A: `TransformersDetector` (default, WASM q8).
- Impl B: `MockDetector` (rules-only) — lets UI/CI run before the model exists.
- Swapping MiniLM ↔ RoBERTa-tagalog = changing the model id, not the interface.

### 3.2 Explainer
```ts
interface Reason { text: string; kind: 'rule'; weight: number; }
interface Explainer {
  explain(text: string, result: DetectorResult): Promise<Reason[]>;
}
```
- Impl: `RuleExplainer` — a small signals table (URL present, OTP request, brand name,
  urgency / loan / raffle words) produces the reasons. **No LLM, no generation** (FR4).

### 3.3 Storage
```ts
interface HistoryEntry { id: string; text: string; label: Label; confidence: number; at: number; }
interface Storage {
  add(e: Omit<HistoryEntry,'id'>): Promise<HistoryEntry>;
  all(): Promise<HistoryEntry[]>;
  remove(id: string): Promise<void>;
}
```
- Impl: `IndexedDbStorage`.

### 3.4 NetworkProbe
```ts
interface NetworkProbe {
  start(): void;                // monkeypatch fetch/XMLHttpRequest to count calls
  count(): number;              // total requests observed since start
  measure<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }>;
}
```
- Impl: `CountingNetworkProbe`. The proof panel renders `count()` live (target: 0 during
  a demo, because everything is cached).

### 3.5 VerdictEngine (composes Detector + rules + corrections)
```ts
type VerdictSource = 'model' | 'rules' | 'correction';
interface Verdict extends DetectorResult { source: VerdictSource; note?: string; }
class VerdictEngine {
  constructor(detector: Detector, corrections: CorrectionStore);
  judge(text: string): Promise<Verdict>;
}
```
- Applies, in order: (1) a stored **correction** (exact / token-Jaccard ≥ 0.8) → `correction`;
  (2) the model; (3) the **rules safety net** — URL + scam signals, or P(non-ham) ≥ 0.4, on
  a `ham` verdict → `rules`; otherwise `model`. Implements FR9/FR10 without touching the UI's
  `Detector` abstraction.

## 4. Module map

| Path | Responsibility |
|---|---|
| `src/detector/types.ts` | `Detector`, `DetectorResult`, `Label` |
| `src/detector/workerDetector.ts` | Transformers.js implementation (owns the worker) |
| `src/detector/mockDetector.ts` | rules-only stand-in |
| `src/detector/index.ts` | `createDetector` factory (model → rules fallback) |
| `src/policy/verdictEngine.ts` | composes model + safety net + corrections |
| `src/signals.ts` | shared rule/signal patterns (detector + explainer) |
| `src/explainer/ruleExplainer.ts` | deterministic reasons |
| `src/storage/db.ts` | shared IndexedDB open + transaction helper |
| `src/storage/indexedDbStorage.ts` | history persistence |
| `src/storage/correctionStore.ts` | local correction memory (FR9) |
| `src/proof/countingNetworkProbe.ts` | request counter + latency |
| `src/worker/inference.worker.ts` | owns the model, answers `classify` messages |
| PWA via `vite-plugin-pwa` | precache app shell + cache model on first load |
| `src/App.tsx` | wires panels to services |
| `training/*` | offline: data → finetune → onnx → evaluate |

## 5. Key decisions

- **Why a worker?** Model loading and the forward pass block the main thread; the worker
  keeps the UI responsive and isolates WASM memory.
- **Why WASM int8 (not WebGPU)?** WebGPU is unavailable/uneven across devices (NFR5), and
  the shipped artifact is a single int8 (`q8`) ONNX model. WASM-int8 runs everywhere and a
  ~23 MB MiniLM is instant on CPU. WebGPU stays a possible future enhancement (it would need
  an additional `fp16` export).
- **Why rules for explanation?** Removes the hallucination and size risk of a second
  model; deterministic and instant (NFR2, FR4).
- **Why corrections via memory, not fine-tuning?** On-device gradient training is
  research-grade in 2026 and would blow the time budget. A local retrieval memory (FR9)
  adapts to the user's corrections instantly, stays private, and is honestly described as
  memory — not "the model re-trained".
- **Why precache the model?** So the "airplane mode" demo is genuine (FR6, NFR4).
- **Why no backend?** The whole point is that nothing leaves the device (§5 of reqs).

## 6. Failure handling

- Model fails to load → `MockDetector` keeps the app usable and the proof panel shows a
  clear "model unavailable" state (never a faked verdict).
- WebGPU unavailable is irrelevant: the app only ever uses WASM int8, so there is nothing
  to fall back from.
- Corrupt/empty input → validation message, no inference.
- Offline first ever load → cannot happen; document that first load needs network.
