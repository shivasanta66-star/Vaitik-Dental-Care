// "Ask us a question" form rules shared by the browser and the server (no dependencies).

export const MESSAGE_MAX = 500;

// Accepts "98765 43210", "+91 98765 43210", "09876543210" → "9876543210".
export function cleanMobile(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

export const MESSAGES = {
  name: 'Please enter your full name.',
  mobile: 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.',
  message: 'Please type your question.',
  consent: 'Please tick this so we can contact you with an answer.',
};
