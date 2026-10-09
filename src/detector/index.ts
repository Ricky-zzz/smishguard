import { MODEL_ID } from '../config';
import { Detector } from './types';
import { MockDetector } from './mockDetector';
import { WorkerDetector, LoadStatus } from './workerDetector';

export async function createDetector(
  onStatus?: (s: LoadStatus) => void
): Promise<Detector> {
  if (!MODEL_ID) {
    return new MockDetector('no model configured');
  }
  try {
    const detector = new WorkerDetector(MODEL_ID, onStatus);
    await detector.ready();
    return detector;
  } catch (err) {
    console.warn('Model failed to load; using rules-only detector.', err);
    return new MockDetector('model failed to load');
  }
}

export * from './types';
export type { LoadStatus } from './workerDetector';
