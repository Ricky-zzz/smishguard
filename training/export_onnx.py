"""Export the fine-tuned model to int8 ONNX for Transformers.js.

    python export_onnx.py --model-dir model --out onnx_out

Produces onnx_out/ with config.json, tokenizer files, and
onnx/model_quantized.onnx (the file Transformers.js loads for dtype 'q8').
"""

import argparse
import os
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default="model")
    parser.add_argument("--out", default="onnx_out")
    args = parser.parse_args()

    subprocess.run(
        [
            "optimum-cli",
            "export",
            "onnx",
            "--model",
            args.model_dir,
            "--task",
            "text-classification",
            args.out,
        ],
        check=True,
    )

    from onnxruntime.quantization import QuantType, quantize_dynamic

    src = os.path.join(args.out, "model.onnx")
    dst = os.path.join(args.out, "model_quantized.onnx")
    if not os.path.exists(src):
        print("Expected", src, "not found", file=sys.stderr)
        sys.exit(1)

    quantize_dynamic(src, dst, weight_type=QuantType.QInt8)
    print("Wrote", dst)
    print()
    print("Next steps:")
    print("  1. Create a Hugging Face model repo (e.g. <user>/smishguard-minilm).")
    print("  2. Upload every file in", args.out, "(config.json, tokenizer*, onnx/).")
    print("  3. Set VITE_MODEL_ID to that repo id in .env and rebuild.")


if __name__ == "__main__":
    main()
