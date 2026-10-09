# Q&A — Judge criticism & hard questions

Prepared answers for Demo Day. Every answer follows one rule: **concede the grain of
truth, then give the fact, then restate the narrow true claim.** No defensiveness, no
inflated numbers.

## The ground rules we never break

- We report the real eval numbers (accuracy 0.9706, weighted-F1 0.97, macro-F1 0.87 on a
  748-message held-out set, with the macro caveat). Never inflate.
- We do **not** claim to detect novel, unseen scams.
- We do **not** call the correction memory "re-training" — it is a local retrieval memory.
- We say the model is **3-class** and **small on purpose**.

---

## 1. Product & need

### Q: "Don't people know not to click links in texts? The news says that all the time."

A: The advice fails against how these attacks actually work. In the Philippines, scam
texts arrive with **spoofed sender IDs** — they show up in the same thread as real GCash /
BDO messages, so "don't trust unknown senders" doesn't apply when the sender *looks*
trusted. Legitimate companies also send links (GCash promos, delivery tracking, "verify
now"), so "never click links" isn't a rule people can actually follow. The people who fall
for it aren't careless — they're tired, elderly, or under financial stress, hit with
engineered urgency ("your account will be blocked in 24h"). Our framing: we're a private
second-opinion for the two seconds after a scary message arrives, not a replacement for
common sense.

### Q: "Don't spam filters and telcos already block these?"

A: They block what has already been reported (reactive blocklists of numbers/links).
SmishGuard runs the check **on your device at the moment of decision**, is **Taglish-aware**
(generalizes across code-switched phrasing a blocklist can't), and **explains why** — and
nothing leaves the phone. Blocking and detection are different jobs; ours is detection at
the point of doubt.

### Q: "This is just a bunch of rules — why do you need a model at all?"

A: Correct that some signals are rules (URL, OTP request, brand names) — and we use rules
deliberately, but only for **explanation** and a **safety net**. The actual verdict comes
from a fine-tuned transformer, because scams are written in endless code-switched
variations that a fixed rule list can't enumerate. Rules alone miss the rephrasings; the
model catches them. The hybrid is intentional: model for judgment, rules for the "why".

### Q: "It only catches obvious scams. What about sophisticated ones?"

A: True, and we say so. We catch the **recycled patterns** — spoofed brands, OTP lures,
advance-fee, prize/raffle — which are the overwhelming majority of what actually
circulates. We explicitly do not claim to detect novel attacks, and we'd rather be honest
about that than inflate.

---

## 2. Local AI (the mandatory question)

### Q: "Why does this benefit from running locally? A server with a bigger model would be more accurate."

A: The message being checked contains the user's **OTP, bank name, account, and message
history**. To "check if it's a scam" on a server, the user has to upload exactly the
secrets the scammer is after — self-defeating. On-device it: (1) never leaves the phone,
(2) works with zero connectivity, and (3) costs nothing per message. A bigger cloud model
is more accurate *and* more of a privacy violation; the trade isn't free.

### Q: "You still need the internet to load it the first time, so it's not really offline."

A: Correct, and disclosed. The model downloads **once** on first load, then is cached and
all inference runs with zero network — airplane mode works after that. The point is the
**steady-state** is fully offline, which is when the tool is used day-to-day.

### Q: "Why WebAssembly and not WebGPU? Isn't WASM slow?"

A: The model is a ~23 MB int8 encoder. On WASM it answers in tens of milliseconds on CPU,
so there's no speed problem to solve at this size. WASM runs on **any** device (including
phones and laptops without a GPU); WebGPU would add a hardware dependency for no benefit
at 23 MB. WASM int8 is the safe default, WebGPU is a possible future optimization.

### Q: "That 'learns from your corrections' thing — it's not learning, it's just a cache."

A: Correct — it's a local retrieval memory, not gradient training, and we call it that in
the README and requirements. The honest claim is narrower: corrections are stored on
device and applied to repeat/near-identical messages, instantly and privately. True
on-device fine-tuning is still research-grade; we didn't pretend otherwise.

---

## 3. Technical execution

### Q: "How was it trained, and are your benchmarks real?"

A: Fine-tuned `sentence-transformers/all-MiniLM-L6-v2` for sequence classification on
public Philippine SMS data (scottleechua CC-BY-4.0, Henit007 Hugging Face sets) plus the
English SMS Spam Collection and a small curated seed set, then exported to int8 ONNX.
Evaluation is `training/eval.py` on a 15% held-out split the model never saw:
**748 messages, accuracy 0.9706, weighted-F1 0.97, macro-F1 0.87**. Macro-F1 is dragged
down by the tiny `otp_phish` class (5 examples); the decisive scam-vs-ham bound is
scam 0.96/0.97, ham 0.98/0.97. The full confusion matrix is in the README. Reproduce it
with the Colab notebook in `training/`.

### Q: "Your dataset is tiny and part-English. Isn't that 97% inflated?"

A: It's a fair caveat, which is why we disclose it rather than hide it. The test set mixes
English and Taglish, so part of the score is the easier English subset. It's still an
honest number on a real held-out set (weighted-F1 0.97 clears the ≥0.95 bar). We'd rather
report a real 0.97 on mixed data than a fake 0.99.

### Q: "Missed scams — isn't that a safety problem?"

A: That's why the **rules safety net** exists. If the model says "legit" but the text has a
suspicious link plus scam signals, or a high non-ham probability with a hard signal, the
verdict is escalated and marked "via safety rules" — so an uncertain model does not
silently pass an obvious scam. Reputable domains do not trigger the link escalation. For a
warning tool, recall matters more than a few false alarms, but borderline verdicts are
shown cautiously rather than as certain scams.

### Q: "What if the model fails to load at all?"

A: The app falls back to a rules-only detector and still runs — and it says so in the
proof panel rather than faking a verdict. The model loading has a visible progress status;
there's no silent failure path.

### Q: "What about prompt injection? Can someone trick it?"

A: It's a classifier, not an instruction-following model — there are no instructions to
override, so injection text is just input to score. That's a smaller attack surface than
a chat model. And the app makes zero network calls at runtime, so there's no data-exfil
path.

### Q: "Why not a native app that auto-reads my SMS?"

A: Deliberate. Auto-reading needs a system overlay + accessibility permissions on Android
(and is impossible on iOS) — and those are exactly the permissions scam apps abuse. We
chose paste/share as the input and require **zero permissions**; that's the security
posture, not a limitation.

### Q: "Did you actually build this during the hackathon, or reuse something?"

A: Built from an empty scaffold this window; the model was fine-tuned during the build
window; the open datasets and the open pretrained backbone are disclosed in the README and
submission. We used AI coding tools (opencode) and disclose that, as the rules require.

---

## 4. The one-line truths to fall back on

- The message never leaves the device.
- It works with the network off, after one download.
- We report our real numbers and our real limits.
- The model judges; the rules explain and catch the obvious misses.
