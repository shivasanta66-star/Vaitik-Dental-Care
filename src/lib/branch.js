import { DAYS, DAYS_SHORT, WEEK, addDaysYmd, clinicNow, fmt } from './time.js';

// Branch shape used by the website:
// { id, slug, name, odia, tag, short, addr, landmark, phone, tel, wa, lat, lng, mapsUrl,
//   hours: [[open, close] | null] × 7 (minutes, index 0 = Sunday), blocked: { 'YYYY-MM-DD': reason } }

export const waHref = (b, text) =>
  'https://wa.me/' + b.wa + '?text=' + encodeURIComponent(text || 'Hello Vaitik Dental Care (' + b.name + '). I would like to book an appointment.');

const openOn = (b, ymd, weekday) => (b.blocked?.[ymd] !== undefined ? null : b.hours[weekday]);

function nextOpening(b, now) {
  for (let i = 1; i <= 14; i++) {
    const ymd = addDaysYmd(now.ymd, i);
    const wd = (now.weekday + i) % 7;
    const h = openOn(b, ymd, wd);
    if (h) return { when: i === 1 ? 'tomorrow' : DAYS[wd], at: h[0] };
  }
  return null;
}

export function branchStatus(b, now) {
  const today = openOn(b, now.ymd, now.weekday);
  if (today) {
    const [o, c] = today;
    if (now.minutes < o) return { open: false, label: 'Opens at ' + fmt(o) };
    if (now.minutes < c) return { open: true, label: 'Open now · till ' + fmt(c) };
  }
  const next = nextOpening(b, now);
  const prefix = today ? '' : 'Closed today · ';
  return { open: false, label: next ? prefix + 'Opens ' + next.when + ' ' + fmt(next.at) : 'Closed' };
}

const rangeText = (h) => (h ? fmt(h[0]) + ' – ' + fmt(h[1]) : 'Closed');

// "Every day, 9:00 AM – 9:30 PM" or "Mon–Sat 10:00 AM – 8:30 PM · Sun 5:00 PM – 8:30 PM"
export function hoursSummary(hours) {
  const texts = WEEK.map((d) => rangeText(hours[d]));
  if (texts.every((t) => t === texts[0])) return texts[0] === 'Closed' ? 'Closed' : 'Every day, ' + texts[0];
  const groups = [];
  WEEK.forEach((d, i) => {
    const last = groups[groups.length - 1];
    if (last && last.text === texts[i]) last.to = d;
    else groups.push({ from: d, to: d, text: texts[i] });
  });
  return groups.map((g) => (g.from === g.to ? DAYS_SHORT[g.from] : DAYS_SHORT[g.from] + '–' + DAYS_SHORT[g.to]) + ' ' + g.text).join(' · ');
}

// Everything the UI shows about a branch at a given moment.
export function branchView(b, now = clinicNow()) {
  const s = branchStatus(b, now);
  const todayHours = openOn(b, now.ymd, now.weekday);
  return {
    ...b,
    isOpen: s.open,
    statusLabel: s.label,
    dayName: DAYS[now.weekday],
    todayHours: todayHours ? rangeText(todayHours) : b.blocked?.[now.ymd] ? 'Closed (' + b.blocked[now.ymd] + ')' : 'Closed',
    summary: hoursSummary(b.hours),
    telHref: 'tel:' + b.tel,
    waHref: waHref(b),
    dirHref: 'https://www.google.com/maps/dir/?api=1&destination=' + b.lat + ',' + b.lng,
    week: WEEK.map((i) => ({ day: DAYS[i], hours: rangeText(b.hours[i]), today: i === now.weekday })),
  };
}
