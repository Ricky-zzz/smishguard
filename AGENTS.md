# AGENTS.md - SmishGuard

Project instructions for AI coding agents working in this repository.

## Read first, every session

1. `requirements.md` - what we must accomplish (the contract).
2. `architecture.md` - how it is structured and the abstractions to follow.
3. `deliverables.md` - the finish line and submission checklist.

Then check `README.md` for build/test commands.

## The conflict rule (most important)

Before implementing anything, verify it is consistent with `requirements.md` and
`architecture.md`.

- If a request, a new feature, or your own idea **conflicts with those docs**, **STOP and
  ask the user** before proceeding. Do not silently deviate.
- If the docs are ambiguous or silent on a decision, make the **smallest** reasonable
  choice, note it, and ask for confirmation.
- If the docs themselves need to change, propose the edit to the user and update all three
  docs together so they never drift apart.

## Architecture guardrails

- Keep the four abstractions (`Detector`, `Explainer`, `Storage`, `NetworkProbe`) behind
  their interfaces. Do not let the UI depend on a concrete implementation.
- Inference runs in the Web Worker. The main thread must stay responsive.
- Default backend is **WASM int8**. WebGPU is optional and must never be a hard dependency.
- The explanation layer is **deterministic** (rules + token attribution). Do not add an LLM
  or a chatbot to it (see `requirements.md` §6 non-goals).
- The runtime must make **zero network calls** after first load. Never add a runtime cloud
  call without an explicit, agreed docs change.
- Do not add comments unless asked.

## Product guardrails

- Label honesty: never inflate accuracy. Report the real F1. (Fake benchmarks =
  disqualification.)
- Do not claim detection of novel/unseen scam wording.
- Keep the download small (int8, < 50 MB preferred).

## Commands (update as the scaffold lands)

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Training: see `training/README` - runs on Google Colab, not local Python 3.14.

Run lint + typecheck + build before declaring any feature complete.

## Workflow expectations

- Prefer editing existing files over creating new ones.
- Keep changes small and reviewable.
- When finishing a task, state which doc requirement it satisfies.
