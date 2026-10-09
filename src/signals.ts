export type SignalKind =
  | 'url'
  | 'suspicious_url'
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
  /\b(?:https?:\/\/[^\s"'<>]+|www\.[^\s"'<>]+|[a-z0-9-]+\.(?:top|xyz|info|link|club|online|site|icu|buzz|click|vip|win|live)\b)/i;
const OTP_RE =
  /\b(otp|one[-\s]?time\s*(pin|password|code)?|verification code|verify code|auth code|6[-\s]?digit|pin)\b/i;
const BRAND_RE =
  /\b(gcash|maya|paymaya|bpi|bdo|metrobank|landbank|unionbank|security bank|rcbc|chinabank|cebuana|palawan|mlhuillier|shopee|lazada|globe|smart|tnt|dito|sss|pag[-\s]?ibig|nbi|lto|dti|bfp|pnp)\b/i;
const URGENCY_RE =
  /\b(urgent|immediately|now|expires?|expiring|suspended|deactivated|blocked|na[-\s]?block|locked|verify|i[-\s]?verify|last warning|final notice|act now|hurry)\b/i;
const MONEY_RE = /(₱|\bphp\b|\bpeso|\bcash\b|\bpera\b|\b\d{3,}\b)/i;
const LOAN_RE =
  /\b(loan|utang|pautang|paloan|cash loan|sangla|sanglang|5[-\s/]?6|quick cash|instant cash)\b/i;
const URL_SHORTENERS = 'bit\\.ly|tinyurl\\.com|t\\.co|goo\\.gl|is\\.gd|cutt\\.ly|shorturl\\.at';
const SUSPICIOUS_TLDS = 'top|xyz|info|link|club|online|site|icu|buzz|click|vip|win|live';
const REPUTABLE_SUFFIXES = [
  'shopee.ph',
  'lazada.com.ph',
  'bpi.com.ph',
  'bdo.com.ph',
  'metrobank.com.ph',
  'unionbankph.com',
  'landbank.com',
  'gcash.com',
  'maya.ph',
  'paymaya.com',
  'globe.com.ph',
  'smart.com.ph',
  'gov.ph'
];

function hostOf(url: string): string {
  const match = url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .match(/^[a-z0-9.-]+/);
  return match ? match[0] : '';
}

function isReputableHost(host: string): boolean {
  return REPUTABLE_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isSuspiciousUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const host = hostOf(url);
  if (host && isReputableHost(host)) return false;
  if (new RegExp(`\\.(${SUSPICIOUS_TLDS})\\b`).test(lower)) return true;
  if (new RegExp(`(?:^|\\b)(?:${URL_SHORTENERS})(?:\\/|$)`).test(lower)) return true;
  return /(otp|verify|verification|claim|prize|login|secure|account|unlock)/.test(host);
}

const RAFFLE_RE =
  /\b(raffle|premyo|prize|winner|nanalo|panalo|congratulations|congrats|swert|jackpot|gcash promo)\b/i;


export function detectSignals(text: string): Signal[] {
  const signals: Signal[] = [];

  const url = text.match(URL_RE);
  if (url) {
    signals.push({
      kind: 'url',
      match: url[0],
      weight: 0.2,
      reason: `May link na "${url[0]}". Tiyaking kilala at opisyal ang sender bago i-click.`
    });
    if (isSuspiciousUrl(url[0])) {
      signals.push({
        kind: 'suspicious_url',
        match: url[0],
        weight: 0.45,
        reason: `Kahina-hinala ang link na "${url[0]}". Huwag i-click o magbigay ng OTP.`
      });
    }
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
      reason: `Binanggit ang ${brand[0]}. Tiyaking opisyal ang sender bago mag-click o magbigay ng detalye.`
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
      reason: 'Tungkol sa loan o utang. Karaniwang scam offer.'
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
