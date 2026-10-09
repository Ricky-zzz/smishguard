"""Export the fine-tuned model to int8 ONNX for Transformers.js.

    python export_onnx.py --model-dir model --out onnx_out

No optimum-cli (breaks on Colab's diffusers/huggingface_hub conflict). Produces
onnx_out/ with config.json, tokenizer files, and onnx/model_quantized.onnx.

Guardrails (each learned the hard way):
- Eager attention: SDPA/flash-attention do not trace correctly.
- torch.export (new exporter, torch 2.9+) is used FIRST; its `dynamic_shapes`
  keys must be INPUT NAMES ONLY (not outputs like 'logits').
- opset 18 (LayerNormalization needs >=17; avoids failing version-conversion).
- External-data weights are re-saved inline so Transformers.js gets one file.
- Every export is validated: ONNX vs PyTorch logits on real samples. Divergence
  > tolerance -> FAIL loudly, never upload.
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


class ParityError(RuntimeError):
    pass


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

    fp32_path = os.path.join(onnx_dir, "model.onnx")

    exported = False

    # Strategy 1: new torch.export-based exporter (torch 2.9+).
    try:
        dynamic_shapes = {name: {0: "batch", 1: "sequence"} for name in input_names}
        torch.onnx.export(
            model,
            inputs,
            fp32_path,
            dynamo=True,
            opset_version=18,
            dynamic_shapes=dynamic_shapes,
        )
        inline_weights(fp32_path)
        check_parity(tokenizer, model, fp32_path, input_names)
        print("Export OK (new torch.export exporter, dynamo=True)")
        exported = True
    except Exception as exc:
        print(
            f"new-exporter path failed ({type(exc).__name__}: {str(exc)[:180]}) — trying legacy"
        )
        try:
            os.remove(fp32_path)
        except OSError:
            pass
        for suffix in (".data", ".weights.pkl"):
            try:
                os.remove(fp32_path + suffix)
            except OSError:
                pass

    # Strategy 2: legacy exporter (last resort; parity gate will judge it).
    if not exported:
        dynamic_axes = {name: {0: "batch", 1: "sequence"} for name in input_names}
        dynamic_axes["logits"] = {0: "batch"}
        torch.onnx.export(
            model,
            inputs,
            fp32_path,
            input_names=input_names,
            output_names=["logits"],
            dynamic_axes=dynamic_axes,
            opset_version=14,
        )
        inline_weights(fp32_path)
        try:
            check_parity(tokenizer, model, fp32_path, input_names)
        except ParityError as exc:
            raise SystemExit(str(exc))
        print("Export OK (legacy exporter)")
        exported = True

    tokenizer.save_pretrained(args.out)
    model.config.save_pretrained(args.out)

    quant_path = os.path.join(onnx_dir, "model_quantized.onnx")
    try:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        quantize_dynamic(fp32_path, quant_path, weight_type=QuantType.QInt8)
        print("Wrote", quant_path)
    except Exception as exc:
        print(f"int8 quantization failed ({type(exc).__name__}: {str(exc)[:120]})")
        import shutil

        shutil.copyfile(fp32_path, quant_path)
        print("Falling back: shipped fp32 weights as model_quantized.onnx")
    print()
    print("Files to upload:")
    for root, _, files in os.walk(args.out):
        for f in files:
            print(" ", os.path.join(root, f))
    print()
    print("Next: upload every file above to a public Hugging Face model repo,")
    print("then set VITE_MODEL_ID=<user>/<repo> in .env and rebuild.")


def inline_weights(onnx_path):
    import onnx

    proto = onnx.load(onnx_path)
    del proto.graph.value_info[:]
    onnx.save_model(proto, onnx_path, save_as_external_data=False)
    for suffix in (".data", ".weights.pkl"):
        try:
            os.remove(onnx_path + suffix)
        except OSError:
            pass


def check_parity(tokenizer, model, fp32_path, input_names):
    import onnxruntime as ort

    encoded = tokenizer(
        PARITY_SAMPLES,
        return_tensors="pt",
        truncation=True,
        max_length=128,
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
        raise ParityError(f"ONNX graph missing inputs: {sorted(missing)}")

    out_names = [o.name for o in sess.get_outputs()]
    results = sess.run(out_names, ort_inputs)
    onnx_logits = None
    for r in results:
        a = np.asarray(r)
        if a.ndim == 2 and a.shape[-1] == torch_logits.shape[-1]:
            onnx_logits = a
            break
    if onnx_logits is None:
        raise ParityError(
            f"Could not identify a logits output among: {out_names}"
        )

    max_diff = float(np.abs(torch_logits - onnx_logits).max())
    print(
        f"Parity check: max |torch - onnx| = {max_diff:.2e} over {len(PARITY_SAMPLES)} samples"
    )
    if np.isnan(max_diff) or max_diff > PARITY_TOLERANCE:
        raise ParityError(
            f"PARITY FAILED (diff {max_diff:.2e} > {PARITY_TOLERANCE}). "
            "The exported ONNX does not match PyTorch — do NOT upload it."
        )
    print("Parity check passed.")


if __name__ == "__main__":
    main()