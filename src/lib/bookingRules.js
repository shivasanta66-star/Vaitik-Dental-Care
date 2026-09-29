// Booking form rules shared by the browser and the server (no dependencies).

// Extra options in the booking form that are not treatments.
export const EXTRA_CONCERNS = ['Tooth pain / emergency', 'Not sure – need a check-up'];

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
  branch: 'Choose Koraput or Semiliguda.',
  treatment: 'Choose a treatment, or "Not sure – need a check-up".',
  date: 'Choose a date.',
  slot: 'Choose a time.',
  consent: 'Please tick this so we can contact you about the appointment.',
};
