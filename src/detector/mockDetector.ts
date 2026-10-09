import { detectSignals, totalWeight } from '../signals';
import {
  Detector,
  DetectorResult,
  Label,
  LABELS,
  emptyScores
} from './types';

export class MockDetector implements Detector {
  private note: string;

  constructor(note = 'rules-only') {
    this.note = note;
  }

  async ready(): Promise<void> {}

  describe(): string {
    return `rules-only demo detector (${this.note})`;
  }

  async classify(text: string): Promise<DetectorResult> {
    const signals = detectSignals(text);
    const scores = emptyScores();
    scores.ham = 0.3;

    for (const s of signals) {
      switch (s.kind) {
        case 'url':
        case 'urgency':
          scores.scam += s.weight;
          break;
        case 'suspicious_url':
          scores.scam += s.weight * 1.25;
          break;
        case 'money':
          scores.scam += s.weight;
          scores.loan += s.weight * 0.5;
          break;
        case 'brand':
          scores.impersonation += s.weight;
          break;
        case 'otp_request':
          scores.otp_phish += s.weight;
          break;
        case 'loan':
          scores.loan += s.weight;
          break;
        case 'raffle':
          scores.raffle += s.weight;
          break;
      }
    }

    if (totalWeight(signals) === 0) {
      scores.ham = 0.9;
    }

    const sum = LABELS.reduce((acc, l) => acc + scores[l], 0) || 1;
    for (const l of LABELS) scores[l] = scores[l] / sum;

    let label: Label = 'ham';
    let best = -1;
    for (const l of LABELS) {
      if (scores[l] > best) {
        best = scores[l];
        label = l;
      }
    }

    return { label, confidence: scores[label], scores };
  }
}
