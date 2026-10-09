import { LABELS, Label, DetectorResult, emptyScores } from '../detector/types';
import type { WorkerIn, WorkerOut } from './protocol';

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (msg: WorkerOut) => void;
};

type RawScore = { label: string; score: number };
type Classifier = (
  text: string,
  options?: Record<string, unknown>
) => Promise<RawScore[] | RawScore>;

let classifier: Classifier | null = null;

function toLabel(raw: string): Label | null {
  const s = raw.toLowerCase().replace(/[^a-z_]/g, '');
  return (LABELS as string[]).includes(s) ? (s as Label) : null;
}

function mapResult(raw: RawScore[] | RawScore): DetectorResult {
  const arr = Array.isArray(raw) ? raw : [raw];
  const scores = emptyScores();
  let best: Label | null = null;
  let bestScore = -1;

  for (const r of arr) {
    const label = toLabel(r.label);
    if (!label) continue;
    scores[label] = r.score;
    if (r.score > bestScore) {
      bestScore = r.score;
      best = label;
    }
  }

  if (!best) {
    throw new Error('Model labels do not match SmishGuard labels');
  }
  return { label: best, confidence: bestScore, scores };
}

async function load(modelId: string): Promise<string> {
  const { pipeline } = await import('@huggingface/transformers');
  const progress_callback = (p: { status?: string; progress?: number }) =>
    ctx.postMessage({
      type: 'status',
      phase: p.status ?? 'loading',
      progress: typeof p.progress === 'number' ? p.progress : 0
    });

  const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

  if (hasGpu) {
    try {
      classifier = (await pipeline('text-classification', modelId, {
        device: 'webgpu',
        dtype: 'fp16',
        progress_callback
      })) as unknown as Classifier;
      return 'webgpu';
    } catch {
      /* fall back to wasm */
    }
  }

  classifier = (await pipeline('text-classification', modelId, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback
  })) as unknown as Classifier;
  return 'wasm';
}

ctx.onmessage = async (e: MessageEvent) => {
  const msg = e.data as WorkerIn;
  try {
    if (msg.type === 'load') {
      const backend = await load(msg.modelId);
      ctx.postMessage({ type: 'ready', backend, modelId: msg.modelId });
      return;
    }

    if (msg.type === 'classify') {
      if (!classifier) throw new Error('Model not loaded');
      const raw = await classifier(msg.text, { top_k: null });
      ctx.postMessage({ type: 'result', id: msg.id, result: mapResult(raw) });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ type: 'error', message });
  }
};
