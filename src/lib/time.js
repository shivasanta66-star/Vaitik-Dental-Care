// Date and time helpers. The clinic runs on India time (UTC+5:30, no daylight
// saving), so "now" is always computed in IST whatever the server or browser
// timezone is. Labels are built by hand so server and browser render the same text.

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Monday-first week order for hour tables.
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
const IST_OFFSET_MIN = 330;

// Minutes after midnight → "9:30 PM".
export const fmt = (m) => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(mm).padStart(2, '0') + ' ' + ap;
};

// "21:30" or "21:30:00" → 1290
export const timeToMin = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};
// 1290 → "21:30"
export const minToTime = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
// "21:30" → "9:30 PM"
export const t12 = (t) => fmt(timeToMin(t));

// Today's date, weekday and minute in the clinic's timezone.
export function clinicNow(at = new Date()) {
  const d = new Date(at.getTime() + IST_OFFSET_MIN * 60000);
  return { ymd: d.toISOString().slice(0, 10), weekday: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

const utc = (ymd) => new Date(ymd + 'T00:00:00Z');
export const weekdayOf = (ymd) => utc(ymd).getUTCDay();
export const addDaysYmd = (ymd, n) => {
  const d = utc(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(utc(s).getTime()) && utc(s).toISOString().startsWith(s);

// "2026-09-29" → "Tue, 29 Sep"
export const dLabel = (ymd) => {
  const d = utc(ymd);
  return DAYS_SHORT[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONTHS_SHORT[d.getUTCMonth()];
};
// "2026-09-29" → "Tuesday 29 September 2026"
export const longDate = (ymd) => {
  const d = utc(ymd);
  return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
};
