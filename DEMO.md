# Demo video + social post (copy-paste these)

Submission requires: a ~1 min demo video and an X/LinkedIn post tagged Devin / Cognition
with `#AppBuildersPH`. A rough screen recording is enough — don't overthink it.

## Video script (~55 seconds, one take)

**Setup first (do this before recording):**
1. `npm run build` then `npm run preview` → open http://localhost:4173.
2. Wait for the pill: **Engine ready — model Irumachi/smishguard-minilm-v2 (wasm)**.
3. Turn ON airplane mode / disconnect Wi-Fi.
4. Screen record (Windows: Win+G → record; or OBS). Then talk while you act:

**Lines (match them to your clicks):**

- *(0:00, point at proof panel)* "This is SmishGuard — it checks if a text is a scam,
  entirely on your device. Notice: **network calls since ready: 0**."
- *(0:08)* "I'm in **airplane mode** — zero internet." *(show the airplane/wifi-off icon)*
- *(0:15)* Paste the GCash scam → click **Suriin locally**.
- *(0:20)* "**MALAMANG SCAM** — OTP phishing, a suspicious `.top` link, it impersonates
  GCash, and it asks for your OTP."
- *(0:28)* "Your OTP and the whole message **never left this phone**."
- *(0:34, optional but good)* Click **"Scam ito — hindi na-flag"** on a missed one; open the
  **Corrections** tab; re-check a similar text → "via your correction".
- *(0:48)* "Detection, explanation, and local corrections — all offline, no cloud."
- *(0:55)* Close: "If it's a scam, you find out here, not after you click."

That's it. 1 take, screen side by side with you or just the screen + voiceover.

## X / LinkedIn post

> Built SmishGuard at the @AppBuildersPH Hackathon 2026 — an on-device Philippine SMS
> smishing detector. Paste a text, get an instant scam verdict + Taglish explanation,
> fully local: zero network calls, works in airplane mode, even learns your corrections
> on-device. Trained a MiniLM on PH SMS data → int8 ONNX running in the browser.
> @DevinAI @Cognition #AppBuildersPH #LocalAI

Post it on X or LinkedIn. Tag **Devin / Cognition** and include **#AppBuildersPH**.

## Submission (cerebralvalley.ai/e/appbuildersph-hackathon-2026)

- Project name: **SmishGuard**
- Repo (public): https://github.com/Ricky-zzz/smishguard
- Video URL, X/LinkedIn URL, disclosures (already in README) — fill, check everything,
  submit **once** before 10:00 AM.