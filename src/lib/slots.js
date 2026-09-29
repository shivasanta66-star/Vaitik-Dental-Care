import { addDaysYmd, clinicNow, fmt, minToTime, timeToMin, weekdayOf } from './time.js';

export const BOOKING_WINDOW_DAYS = 60;
// Patients cannot book a slot starting within this many minutes from now.
export const LEAD_MINUTES = 30;

/**
 * Pure slot calculation for one branch and date.
 * hours: { opens, closes, slot_minutes } or null when the branch is closed that weekday.
 * blockedReason: text when the date is blocked (holiday), otherwise null.
 * taken: Set of slot start minutes already booked.
 * Returns { closed: null | 'closed' | 'blocked' | 'past' | 'too_far', reason, slots: [{ minutes, label, available, reason }] }.
 */
export function computeSlots({ date, hours, blockedReason = null, taken = new Set(), now = clinicNow() }) {
  if (date < now.ymd) return { closed: 'past', reason: null, slots: [] };
  if (date > addDaysYmd(now.ymd, BOOKING_WINDOW_DAYS)) return { closed: 'too_far', reason: null, slots: [] };
  if (blockedReason !== null) return { closed: 'blocked', reason: blockedReason, slots: [] };
  if (!hours) return { closed: 'closed', reason: null, slots: [] };

  const open = timeToMin(hours.opens);
  const close = timeToMin(hours.closes);
  const step = hours.slot_minutes || 30;
  const slots = [];
  for (let m = open; m + step <= close; m += step) {
    const past = date === now.ymd && m < now.minutes + LEAD_MINUTES;
    const booked = taken.has(m);
    slots.push({ minutes: m, time: minToTime(m), label: fmt(m), available: !past && !booked, reason: past ? 'past' : booked ? 'booked' : null });
  }
  return { closed: null, reason: null, slots };
}

/** Loads hours, blocked dates and live appointments for a branch/date, then computes slots. */
export async function getSlots(db, branchSlug, date, { excludeAppointmentId = null } = {}) {
  const { data: branch, error } = await db.from('branches').select('id').eq('slug', branchSlug).maybeSingle();
  if (error) throw error;
  if (!branch) return null;

  const [hoursRes, blockedRes, apptRes] = await Promise.all([
    db.from('branch_hours').select('opens, closes, slot_minutes').eq('branch_id', branch.id).eq('weekday', weekdayOf(date)).maybeSingle(),
    db.from('blocked_dates').select('reason').eq('date', date).or(`branch_id.eq.${branch.id},branch_id.is.null`),
    db.from('appointments').select('id, slot_start').eq('branch_id', branch.id).eq('date', date).neq('status', 'cancelled'),
  ]);
  for (const r of [hoursRes, blockedRes, apptRes]) if (r.error) throw r.error;

  const taken = new Set(apptRes.data.filter((a) => a.id !== excludeAppointmentId).map((a) => timeToMin(a.slot_start)));
  const blockedReason = blockedRes.data.length ? blockedRes.data[0].reason || 'Clinic closed' : null;
  return { branchId: branch.id, ...computeSlots({ date, hours: hoursRes.data, blockedReason, taken }) };
}

export function closedMessage(result) {
  switch (result.closed) {
    case 'past':
      return 'That date has passed. Please pick another date.';
    case 'too_far':
      return `You can book up to ${BOOKING_WINDOW_DAYS} days ahead.`;
    case 'blocked':
      return `The clinic is closed on this day (${result.reason}). Please pick another date.`;
    case 'closed':
      return 'This branch is closed on this day. Please pick another date.';
    default:
      return null;
  }
}
