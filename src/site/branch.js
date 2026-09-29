import { DAYS, WEEK, fmt } from '../shared/time.js';

export const waHref = (b, text) =>
  'https://wa.me/' + b.wa + '?text=' + encodeURIComponent(text || 'Hello Vaitik Dental Care (' + b.name + '). I would like to book an appointment.');

export function branchStatus(b, now) {
  const d = now.getDay();
  const m = now.getHours() * 60 + now.getMinutes();
  const [o, c] = b.hours(d);
  if (m < o) return { open: false, label: 'Opens at ' + fmt(o) };
  if (m < c) return { open: true, label: 'Open now · till ' + fmt(c) };
  return { open: false, label: 'Opens tomorrow ' + fmt(b.hours((d + 1) % 7)[0]) };
}

// Everything the UI shows about a branch at a given moment.
export function branchView(b, now) {
  const s = branchStatus(b, now);
  const d = now.getDay();
  const [o, c] = b.hours(d);
  return {
    ...b,
    isOpen: s.open,
    statusLabel: s.label,
    dayName: DAYS[d],
    todayHours: fmt(o) + ' – ' + fmt(c),
    telHref: 'tel:' + b.tel,
    waHref: waHref(b),
    dirHref: 'https://www.google.com/maps/dir/?api=1&destination=' + b.lat + ',' + b.lng,
    week: WEEK.map((i) => {
      const [a, z] = b.hours(i);
      return { day: DAYS[i], hours: fmt(a) + ' – ' + fmt(z), today: i === d };
    }),
  };
}
