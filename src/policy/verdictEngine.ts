import { Detector, Label, LABELS, emptyScores } from '../detector/types';
import { detectSignals } from '../signals';
import { CorrectionStore } from '../storage/correctionStore';

export type VerdictSource = 'model' | 'rules' | 'correction';

export interface Verdict {
  label: Label;
  confidence: number;
  scores: Record<Label, number>;
  source: VerdictSource;
  note?: string;
  neutral?: boolean;
}

export const NON_HAM_THRESHOLD = 0.6;

export class VerdictEngine {
  private detector: Detector;
  private corrections: CorrectionStore;

  constructor(detector: Detector, corrections: CorrectionStore) {
    this.detector = detector;
    this.corrections = corrections;
  }

  async judge(text: string): Promise<Verdict> {
    const correction = await this.corrections.findMatch(text);
    if (correction) {
      const scores = emptyScores();
      scores[correction.label] = 1;
      return {
        label: correction.label,
        confidence: 1,
        scores,
        source: 'correction',
        note: 'Base sa correction mo. Natutunan locally.'
      };
    }

    const result = await this.detector.classify(text);
    const signals = detectSignals(text);
    const hasSuspiciousUrl = signals.some((s) => s.kind === 'suspicious_url');
    const risky = signals.some(
      (s) =>
        s.kind === 'otp_request' ||
        s.kind === 'brand' ||
        s.kind === 'urgency' ||
        s.kind === 'loan' ||
        s.kind === 'raffle'
    );
    const hardSignal = signals.some(
      (s) =>
        s.kind === 'suspicious_url' ||
        s.kind === 'urgency' ||
        s.kind === 'loan' ||
        s.kind === 'raffle'
    );
    const nonHam = LABELS.filter((l) => l !== 'ham').reduce(
      (sum, l) => sum + result.scores[l],
      0
    );

    if (result.label !== 'ham' && !hasSuspiciousUrl && !risky) {
      return {
        ...result,
        source: 'rules',
        neutral: true,
        note: 'Walang nakitang malinaw na senyales ng scam sa mensahe.'
      };
    }

    if (result.label === 'ham' && hasSuspiciousUrl && risky) {
      const label: Label = signals.some((s) => s.kind === 'otp_request')
        ? 'otp_phish'
        : 'scam';
      return this.escalate(
        label,
        'rules',
        'Na-flag ng safety rules: may link at senyales ng scam.',
        0.9
      );
    }

    if (result.label === 'ham' && nonHam >= NON_HAM_THRESHOLD && hardSignal) {
      const label = this.topNonHam(result.scores);
      return this.escalate(
        label,
        'rules',
        'Hindi sigurado ang modelo pero mataas ang senyales ng scam.',
        nonHam
      );
    }

    return { ...result, source: 'model' };
  }

  private topNonHam(scores: Record<Label, number>): Label {
    let best: Label = 'scam';
    let bestScore = -1;
    for (const l of LABELS) {
      if (l === 'ham') continue;
      if (scores[l] > bestScore) {
        bestScore = scores[l];
        best = l;
      }
    }
    return best;
  }

  private escalate(
    label: Label,
    source: VerdictSource,
    note: string,
    confidence: number
  ): Verdict {
    const scores = emptyScores();
    scores[label] = confidence;
    scores.ham = 1 - confidence;
    return { label, confidence, scores, source, note };
  }
}
