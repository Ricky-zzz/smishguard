export type Label =
  | 'ham'
  | 'scam'
  | 'impersonation'
  | 'otp_phish'
  | 'loan'
  | 'raffle';

export const LABELS: Label[] = [
  'ham',
  'scam',
  'impersonation',
  'otp_phish',
  'loan',
  'raffle'
];

export const LABEL_TEXT: Record<Label, string> = {
  ham: 'Legit',
  scam: 'Scam',
  impersonation: 'Brand impersonation',
  otp_phish: 'OTP phishing',
  loan: 'Loan / utang scam',
  raffle: 'Raffle / prize scam'
};

export interface DetectorResult {
  label: Label;
  confidence: number;
  scores: Record<Label, number>;
}

export interface Detector {
  ready(): Promise<void>;
  classify(text: string): Promise<DetectorResult>;
  describe(): string;
}

export function emptyScores(): Record<Label, number> {
  return LABELS.reduce((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {} as Record<Label, number>);
}
