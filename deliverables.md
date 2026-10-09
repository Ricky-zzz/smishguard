# deliverables.md - SmishGuard

The definition of done. Deadline is the finish line; everything below must exist and be
reviewable in the public repo **as of the code freeze**. See `requirements.md` for what and
`architecture.md` for how.

## 1. Deadlines (from the briefing)

- **Code freeze / submission: 10:00 AM, October 10, 2026.** No extensions.
- Repo must be **public** by the deadline.
- Submit **once** on the Cerebral Valley event page:
  `cerebralvalley.ai/e/appbuildersph-hackathon-2026`.
- Demo Day is in person at Cyberzone, SM Makati; a team member must pitch live.

## 2. The project (submission checklist)

- [ ] Project name: **SmishGuard**
- [ ] Short description: on-device PH smishing detector PWA
- [ ] Team members (from the official website list)
- [ ] Public GitHub repository

## 3. The proof

- [ ] **Demo video (~1 min)** showing airplane mode + a fake GCash scam → verdict + explanation
- [ ] **X or LinkedIn video URL**, tagged Devin / Cognition, with `#AppBuildersPH`
- [ ] **What runs locally** - model inference (WASM int8), the rules explainer, the safety
      net, the correction memory, and all data storage (IndexedDB). Zero network after first load.
- [ ] **What requires internet** - the one-time first load (app shell + ~23 MB model); the
      model repo on Hugging Face for that download. Nothing at runtime.

## 4. The disclosures

- [ ] **Models:** backbone `sentence-transformers/all-MiniLM-L6-v2` + our fine-tuned int8
      ONNX (`Irumachi/smishguard-minilm-v2`) - full detail in `DISCLOSURES.md`
- [ ] **Technologies / frameworks:** Vite, React, TypeScript, Transformers.js, ONNX Runtime Web, `transformers`/`datasets`/`onnxruntime` (training)
- [ ] **APIs / cloud services:** none at runtime (state this loudly - it is the headline)
- [ ] **Existing code / assets:** open datasets + open pretrained backbone, listed by URL
- [ ] **AI development tools used:** opencode, Google Colab - see `DISCLOSURES.md` §7

## 5. Required answer

- [ ] **Why does this product benefit from running AI locally?** - copy §5 of
      `requirements.md` (OTP/bank privacy + zero-connectivity + zero per-message cost).

## 6. Repository artifacts

- [ ] `README.md` - what it is, how to recreate, how to reproduce training + eval
- [ ] `requirements.md`, `architecture.md`, `deliverables.md`, `AGENTS.md`
- [ ] Working PWA (`npm install && npm run dev` / `npm run build`)
- [ ] Fine-tuned model published on Hugging Face (public), linked in README
- [ ] `training/` scripts + a Colab notebook that reproduces the model
- [ ] Evaluation output: confusion matrix + **honest** F1 on a held-out set
- [ ] `.gitignore` (no `node_modules`, no model blobs if avoidable)

## 7. Demo script (what the video + live pitch show, in order)

1. Open the installed PWA. Point at **network requests: 0** and model size.
2. Turn on **airplane mode** (visible in the recording).
3. Paste the fake GCash scam:
   *"GCash: na-block ang account mo. I-click ang link para i-verify:
   gcash-verify.top/otp"*
4. Verdict appears **< 50 ms**: `impersonation / otp_phish - 98% - SCAM`.
5. Explanation in Taglish: impersonates GCash · contains a suspicious link · asks for OTP.
6. Counter still **0**. Close: "Your OTP never left this phone."
7. (Optional) Show a cloud call failing offline for contrast.

## 8. Scoring self-check (map to judging)

| Criterion | Weight | Our evidence |
|---|---|---|
| Problem & Usefulness | 25% | Universal PH smishing problem; clear target user |
| Local AI Implementation | 25% | Trained model + int8 + zero-network proof |
| Technical Execution | 20% | Reliable <50 ms demo, no hallucination |
| Innovation | 15% | PH-data fine-tune + offline + Taglish explainer |
| Product & Demo Quality | 15% | Airplane-mode hook, clean UI |

## 9. Non-negotiables

- No fake benchmarks (hard disqualification). Report the real F1.
- No external help from outside the team.
- No pre-existing project presented as new.
- Runtime must not secretly call a cloud AI API.
