import { WEEK, minToTime } from '@/lib/time.js';

const DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// schema.org Dentist entries so search engines show address, phone and hours.
export function dentistJsonLd(branches) {
  return branches.map((b) => ({
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: 'Vaitik Dental Care - ' + b.name,
    telephone: b.tel,
    address: { '@type': 'PostalAddress', streetAddress: b.addr, addressLocality: b.name, addressRegion: 'Odisha', addressCountry: 'IN' },
    geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng },
    openingHours: WEEK.filter((d) => b.hours[d]).map((d) => DAY[d] + ' ' + minToTime(b.hours[d][0]) + '-' + minToTime(b.hours[d][1])),
  }));
}
