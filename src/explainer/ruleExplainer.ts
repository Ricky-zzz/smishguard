import type { DetectorResult } from '../detector/types';
import { detectSignals } from '../signals';

export interface Reason {
  text: string;
  kind: 'rule';
  weight: number;
}

export interface Explainer {
  explain(text: string, result: DetectorResult): Promise<Reason[]>;
}

export class RuleExplainer implements Explainer {
  async explain(text: string, result: DetectorResult): Promise<Reason[]> {
    if (result.label === 'ham') {
      return [
        {
          text: 'Walang nakitang tipikal na senyales ng scam sa mensahe.',
          kind: 'rule' as const,
          weight: 0.3
        }
      ];
    }

    const signals = detectSignals(text).sort((a, b) => b.weight - a.weight);
    const reasons: Reason[] = signals.map((s) => ({
      text: s.reason,
      kind: 'rule' as const,
      weight: s.weight
    }));

    if (reasons.length === 0) {
      reasons.push({
        text: 'Mataas ang hinala ng modelo batay sa pattern ng mensahe.',
        kind: 'rule',
        weight: result.confidence
      });
    }

    return reasons.slice(0, 4);
  }
}
