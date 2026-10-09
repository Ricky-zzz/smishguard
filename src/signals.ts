export type SignalKind =
  | 'url'
  | 'otp_request'
  | 'brand'
  | 'urgency'
  | 'money'
  | 'loan'
  | 'raffle';

export interface Signal {
  kind: SignalKind;
  match: string;
  weight: number;
  reason: string;
}

const URL_RE =
  /(https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(top|xyz|info|link|club|online|site|icu|buzz|click|vip|win|live|ph)\b)/i;
const OTP_RE =
  /\b(otp|one[-\s]?time\s*(pin|password|code)?|verification code|verify code|auth code|6[-\s]?digit|pin)\b/i;
const BRAND_RE =
  /\b(gcash|maya|paymaya|bpi|bdo|metrobank|landbank|unionbank|security bank|rcbc|chinabank|cebuana|palawan|mlhuillier|shopee|lazada|globe|smart|tnt|dito|sss|pag[-\s]?ibig|nbi|lto|dti|bfp|pnp)\b/i;
const URGENCY_RE =
  /\b(urgent|immediately|now|expires?|expiring|suspended|deactivated|blocked|na[-\s]?block|locked|verify|i[-\s]?verify|last warning|final notice|act now|hurry)\b/i;
const MONEY_RE = /(₱|\bphp\b|\bpeso|\bcash\b|\bpera\b|\b\d{3,}\b)/i;
const LOAN_RE =
  /\b(loan|utang|pautang|paloan|cash loan|sangla|sanglang|5[-\s/]?6|quick cash|instant cash)\b/i;
const RAFFLE_RE =
  /\b(raffle|premyo|prize|winner|nanalo|panalo|congratulations|congrats|swert|jackpot|gcash promo)\b/i;

export function detectSignals(text: string): Signal[] {
  const signals: Signal[] = [];

  const url = text.match(URL_RE);
  if (url) {
    signals.push({
      kind: 'url',
      match: url[0],
      weight: 0.35,
      reason: `May link na "${url[0]}" — huwag i-click.`
    });
  }

  const otp = text.match(OTP_RE);
  if (otp) {
    signals.push({
      kind: 'otp_request',
      match: otp[0],
      weight: 0.4,
      reason: 'Hinihingi ang OTP o verification code mo.'
    });
  }

  const brand = text.match(BRAND_RE);
  if (brand) {
    signals.push({
      kind: 'brand',
      match: brand[0],
      weight: 0.3,
      reason: `Ginagamit ang pangalan ng ${brand[0]} para magpapanggap.`
    });
  }

  const urgency = text.match(URGENCY_RE);
  if (urgency) {
    signals.push({
      kind: 'urgency',
      match: urgency[0],
      weight: 0.25,
      reason: 'May urgent o pananakot na pananalita.'
    });
  }

  const money = text.match(MONEY_RE);
  if (money) {
    signals.push({
      kind: 'money',
      match: money[0],
      weight: 0.15,
      reason: 'May pera o bayad na nabanggit.'
    });
  }

  const loan = text.match(LOAN_RE);
  if (loan) {
    signals.push({
      kind: 'loan',
      match: loan[0],
      weight: 0.4,
      reason: 'Tungkol sa loan o utang — karaniwang scam offer.'
    });
  }

  const raffle = text.match(RAFFLE_RE);
  if (raffle) {
    signals.push({
      kind: 'raffle',
      match: raffle[0],
      weight: 0.35,
      reason: 'Nagsasabi ng premyo o panalo na hindi naman inaasahan.'
    });
  }

  return signals;
}

export function totalWeight(signals: Signal[]): number {
  return signals.reduce((sum, s) => sum + s.weight, 0);
}
