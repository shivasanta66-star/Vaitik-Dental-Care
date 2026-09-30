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
// Exact Google Maps listing embeds, by branch slug. Any branch without an entry falls back to a pin at its coordinates.
const MAP_EMBEDS = {
  koraput:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3658.6423635032243!2d82.7073856750575!3d18.81316228233802!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3af1e42ab9adbf%3A0x6cefb1edd3842294!2sVaitik%20dental%20care!5e1!3m2!1sen!2sin!4v1790734666089!5m2!1sen!2sin',
  semiliguda:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3661.0148115967286!2d82.85445117505475!3d18.703800382425616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3aff4b4c17fea5%3A0xccc285baa13d54e3!2sVaitik%20dental%20care%2C%20branch%202!5e1!3m2!1sen!2sin!4v1790735264288!5m2!1sen!2sin',
};

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
    mapSrc: MAP_EMBEDS[b.slug] || 'https://maps.google.com/maps?q=' + b.lat + ',' + b.lng + '&z=16&output=embed',
    dirHref: 'https://www.google.com/maps/dir/?api=1&destination=' + b.lat + ',' + b.lng,
    week: WEEK.map((i) => ({ day: DAYS[i], hours: rangeText(b.hours[i]), today: i === now.weekday })),
  };
}
