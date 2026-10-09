import type { DetectorResult } from '../detector/types';

export type WorkerIn =
  | { type: 'load'; modelId: string }
  | { type: 'classify'; id: number; text: string };

export type WorkerOut =
  | { type: 'status'; phase: string; progress: number }
  | { type: 'ready'; backend: string; modelId: string }
  | { type: 'error'; message: string }
  | { type: 'result'; id: number; result: DetectorResult };
