"""Export the fine-tuned model to int8 ONNX for Transformers.js.

    python export_onnx.py --model-dir model --out onnx_out

Uses torch.onnx directly (no optimum-cli, which breaks on Colab's diffusers/
huggingface_hub conflict). Produces onnx_out/ with config.json, tokenizer files,
and onnx/model_quantized.onnx (the file Transformers.js loads for dtype 'q8').

Two guardrails, learned the hard way:
1. The model is loaded with eager attention. The default SDPA path does not trace
   correctly with the legacy ONNX exporter and silently produces a graph that
   outputs near-constant logits for every input.
2. After export, the ONNX graph is run on real samples and its logits are compared
   against PyTorch. If they diverge, the script fails INSTEAD of writing a broken
   model. Never upload without a passing parity gate.
"""

import argparse
import os

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


PARITY_SAMPLES = [
    "GCash: Na-block ang account mo. I-verify agad: https://gcash-verify.top/otp at ilagay ang 6-digit code.",
    "BPI: Your transaction of PHP 250.00 at SM MAKATI was posted. If this was not you, call 889-10000. Never share your OTP.",
    "Nakuha ko na po yung padala niyo. Salamat po! - Aling Nena",
]

PARITY_TOLERANCE = 1e-3


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default="model")
    parser.add_argument("--out", default="onnx_out")
    args = parser.parse_args()

    config_path = os.path.join(args.model_dir, "config.json")
    if not os.path.isfile(config_path):
        raise SystemExit(
            f"No trained model at '{args.model_dir}' (missing config.json).\n"
            "Run finetune.py first, then run this in the same working directory."
        )

    onnx_dir = os.path.join(args.out, "onnx")
    os.makedirs(onnx_dir, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(args.model_dir, use_fast=True)
    try:
        model = AutoModelForSequenceClassification.from_pretrained(
            args.model_dir, attn_implementation="eager"
        )
    except (TypeError, ValueError):
        model = AutoModelForSequenceClassification.from_pretrained(args.model_dir)
    model.eval()

    sample = tokenizer("sample suspicious text", return_tensors="pt")
    input_names = list(sample.keys())
    inputs = tuple(sample[name] for name in input_names)

    dynamic_axes = {name: {0: "batch", 1: "sequence"} for name in input_names}
    dynamic_axes["logits"] = {0: "batch"}

    fp32_path = os.path.join(onnx_dir, "model.onnx")
    export_kwargs = dict(
        input_names=input_names,
        output_names=["logits"],
        dynamic_axes=dynamic_axes,
        opset_version=14,
    )
    try:
        torch.onnx.export(model, inputs, fp32_path, dynamo=False, **export_kwargs)
    except TypeError:
        torch.onnx.export(model, inputs, fp32_path, **export_kwargs)
    print("Wrote", fp32_path)

    check_parity(tokenizer, model, fp32_path, input_names)

    tokenizer.save_pretrained(args.out)
    model.config.save_pretrained(args.out)

    from onnxruntime.quantization import QuantType, quantize_dynamic

    quant_path = os.path.join(onnx_dir, "model_quantized.onnx")
    quantize_dynamic(fp32_path, quant_path, weight_type=QuantType.QInt8)
    print("Wrote", quant_path)
    print()
    print("Files to upload:")
    for root, _, files in os.walk(args.out):
        for f in files:
            print(" ", os.path.join(root, f))
    print()
    print("Next: upload every file above to a public Hugging Face model repo,")
    print("then set VITE_MODEL_ID=<user>/<repo> in .env and rebuild.")


def check_parity(tokenizer, model, fp32_path, input_names):
    import onnxruntime as ort

    encoded = tokenizer(
        PARITY_SAMPLES, return_tensors="pt", truncation=True, max_length=128,
        padding=True,
    )
    with torch.no_grad():
        torch_logits = model(
            **{name: encoded[name] for name in input_names}
        ).logits.numpy()

    sess = ort.InferenceSession(fp32_path, providers=["CPUExecutionProvider"])
    ort_inputs = {
        name: encoded[name].numpy()
        for name in input_names
        if name in {i.name for i in sess.get_inputs()}
    }
    missing = set(input_names) - set(ort_inputs)
    if missing:
        raise SystemExit(f"ONNX graph is missing inputs: {sorted(missing)}")
    onnx_logits = sess.run(["logits"], ort_inputs)[0]

    max_diff = float(np.abs(torch_logits - onnx_logits).max())
    print(f"Parity check: max |torch - onnx| = {max_diff:.2e} over {len(PARITY_SAMPLES)} samples")
    if max_diff > PARITY_TOLERANCE:
        raise SystemExit(
            f"PARITY FAILED (diff {max_diff:.2e} > {PARITY_TOLERANCE}). "
            "The exported ONNX graph does not match PyTorch — do NOT upload it. "
            "Re-export with eager attention (attn_implementation='eager')."
        )
    print("Parity check passed.")


if __name__ == "__main__":
    main()
