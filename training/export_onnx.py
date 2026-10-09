"""Export the fine-tuned model to int8 ONNX for Transformers.js.

    python export_onnx.py --model-dir model --out onnx_out

Uses torch.onnx directly (no optimum-cli, which breaks on Colab's diffusers/
huggingface_hub conflict). Produces onnx_out/ with config.json, tokenizer files,
and onnx/model_quantized.onnx (the file Transformers.js loads for dtype 'q8').
"""

import argparse
import os

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default="model")
    parser.add_argument("--out", default="onnx_out")
    args = parser.parse_args()

    onnx_dir = os.path.join(args.out, "onnx")
    os.makedirs(onnx_dir, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(args.model_dir, use_fast=True)
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


if __name__ == "__main__":
    main()
