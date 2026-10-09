import { Detector, DetectorResult } from './types';
import type { WorkerIn, WorkerOut } from '../worker/protocol';

export interface LoadStatus {
  phase: string;
  progress: number;
}

export class WorkerDetector implements Detector {
  private worker: Worker;
  private modelId: string;
  private backend = 'wasm';
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (r: DetectorResult) => void; reject: (e: Error) => void }
  >();
  private readyResolve!: () => void;
  private readyReject!: (e: Error) => void;
  private readyPromise: Promise<void>;
  private onStatus?: (s: LoadStatus) => void;

  constructor(modelId: string, onStatus?: (s: LoadStatus) => void) {
    this.modelId = modelId;
    this.onStatus = onStatus;
    this.worker = new Worker(
      new URL('../worker/inference.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.worker.onmessage = (e: MessageEvent<WorkerOut>) =>
      this.handle(e.data);
    this.worker.onerror = (e) => this.readyReject(new Error(e.message));
  }

  private handle(msg: WorkerOut): void {
    switch (msg.type) {
      case 'status':
        this.onStatus?.({ phase: msg.phase, progress: msg.progress });
        break;
      case 'ready':
        this.backend = msg.backend;
        this.readyResolve();
        break;
      case 'error':
        this.readyReject(new Error(msg.message));
        for (const p of this.pending.values()) p.reject(new Error(msg.message));
        this.pending.clear();
        break;
      case 'result': {
        const p = this.pending.get(msg.id);
        if (p) {
          p.resolve(msg.result);
          this.pending.delete(msg.id);
        }
        break;
      }
    }
  }

  async ready(): Promise<void> {
    this.worker.postMessage({
      type: 'load',
      modelId: this.modelId
    } satisfies WorkerIn);
    await this.readyPromise;
  }

  async classify(text: string): Promise<DetectorResult> {
    const id = this.nextId++;
    return new Promise<DetectorResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'classify', id, text } satisfies WorkerIn);
    });
  }

  describe(): string {
    return `model ${this.modelId} (${this.backend})`;
  }
}
