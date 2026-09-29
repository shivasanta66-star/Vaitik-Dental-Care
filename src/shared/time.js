export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Monday-first week order for hour tables.
export const WEEK = [1, 2, 3, 4, 5, 6, 0];

// Minutes after midnight → "9:30 PM".
export const fmt = (m) => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(mm).padStart(2, '0') + ' ' + ap;
};

// Date → "2026-09-29" in local time.
export const ymd = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export const addDays = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

// "2026-09-29" → "Tue, 29 Sept"
export const dLabel = (s) => new Date(s + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

// "21:30" → "9:30 PM"
export const t12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return fmt(h * 60 + m);
};
