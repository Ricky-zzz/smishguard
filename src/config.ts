export const MODEL_ID: string = import.meta.env.VITE_MODEL_ID ?? '';

export const APP_NAME = 'SmishGuard';

export const EXAMPLE_MESSAGES: { title: string; text: string }[] = [
  {
    title: 'GCash OTP phish',
    text:
      'GCash: Na-block ang account mo dahil sa suspicious activity. I-verify agad: https://gcash-verify.top/otp at ilagay ang 6-digit code na natanggap mo.'
  },
  {
    title: 'Loan offer',
    text:
      'Congrats! Approved ka sa PHP 50,000 cash loan, zero interest. I-message lang ang info mo para ma-release agad.'
  },
  {
    title: 'Legit bank alert',
    text:
      'BPI: Your transaction of PHP 250.00 at SM MAKATI was posted. If this was not you, call 889-10000. Never share your OTP.'
  }
];
