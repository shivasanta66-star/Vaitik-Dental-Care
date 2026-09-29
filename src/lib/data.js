import 'server-only';
import { FALLBACK } from './content.js';
import { hasSupabase } from './env.js';
import { createPublicClient } from './supabase/public.js';
import { addDaysYmd, clinicNow, timeToMin } from './time.js';

const digits = (s) => String(s || '').replace(/\D/g, '');

export function mapBranch(row, hoursRows, blockedRows) {
  const hours = [null, null, null, null, null, null, null];
  for (const h of hoursRows.filter((h) => h.branch_id === row.id)) hours[h.weekday] = [timeToMin(h.opens), timeToMin(h.closes)];
  const blocked = {};
  for (const d of blockedRows.filter((d) => d.branch_id === row.id || d.branch_id === null)) blocked[d.date] = d.reason || 'Clinic closed';
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    odia: row.name_odia || '',
    tag: row.tagline || '',
    short: row.short_label || '',
    addr: row.address,
    landmark: row.landmark || '',
    phone: row.phone,
    tel: '+' + (digits(row.phone).length === 10 ? '91' + digits(row.phone) : digits(row.phone)),
    wa: digits(row.whatsapp),
    lat: row.lat,
    lng: row.lng,
    hours,
    blocked,
  };
}

/** Everything the public website needs. Falls back to built-in content when Supabase is not set up. */
export async function getSiteData() {
  if (!hasSupabase()) return FALLBACK;
  const db = createPublicClient();
  const today = clinicNow().ymd;
  const [branches, hours, blocked, treatments, doctors, reviews, gallery, settings] = await Promise.all([
    db.from('branches').select('*').order('sort'),
    db.from('branch_hours').select('branch_id, weekday, opens, closes'),
    db.from('blocked_dates').select('branch_id, date, reason').gte('date', today).lte('date', addDaysYmd(today, 14)),
    db.from('treatments').select('name, blurb, icon, price_text').order('sort'),
    db.from('doctors').select('id, name, qualification, reg_no, schedule_text, focus, photo_url').order('sort'),
    db.from('reviews').select('author_initial, text, branch_id').order('sort'),
    db.from('gallery').select('id, caption, before_url, after_url').order('sort').limit(3),
    db.from('settings').select('key, value'),
  ]);
  const failed = [branches, hours, blocked, treatments, doctors, reviews, gallery, settings].find((r) => r.error);
  if (failed) throw new Error('Could not load website data: ' + failed.error.message);

  const s = Object.fromEntries(settings.data.map((r) => [r.key, r.value]));
  const branchName = Object.fromEntries(branches.data.map((b) => [b.id, b.name]));
  return {
    live: true,
    settings: {
      emergencyNumber: s.emergency_number || '',
      feeEnabled: s.booking_fee_enabled === true,
      feeAmount: Number(s.booking_fee_amount) || 0,
    },
    branches: branches.data.map((b) => mapBranch(b, hours.data, blocked.data)),
    treatments: treatments.data.map((t) => ({ name: t.name, icon: t.icon, desc: t.blurb || '', price: t.price_text || '' })),
    doctors: doctors.data.map((d) => ({
      id: d.id,
      name: d.name,
      credentials: [d.qualification, d.reg_no ? 'Dental Council Reg. No. ' + d.reg_no : null].filter(Boolean).join(' · '),
      days: d.schedule_text || '',
      focus: d.focus || '',
      photo: d.photo_url,
    })),
    reviews: reviews.data.map((r) => ({ text: r.text, initial: r.author_initial, branch: branchName[r.branch_id] || '' })),
    gallery: gallery.data.map((g) => ({ id: g.id, caption: g.caption, before: g.before_url, after: g.after_url })),
  };
}
