import { hasRazorpay, hasServiceRole } from '@/lib/env.js';
import { notifyNewBooking } from '@/lib/notify.js';
import { allowRequest } from '@/lib/rateLimit.js';
import { closedMessage, getSlots } from '@/lib/slots.js';
import { createServiceClient } from '@/lib/supabase/service.js';
import { dLabel, fmt, minToTime } from '@/lib/time.js';
import { EXTRA_CONCERNS, parseBooking } from '@/lib/validation.js';
import { fail, json } from '../_respond.js';

export const dynamic = 'force-dynamic';

const DB_ERRORS = {
  consent_required: [400, { consent: 'Please tick this so we can contact you about the appointment.' }],
  branch_closed: [400, { date: 'This branch is closed on this day. Please pick another date.' }],
  date_blocked: [400, { date: 'The clinic is closed on this day. Please pick another date.' }],
  slot_outside_hours: [400, { slot: 'Please choose one of the times shown.' }],
  slot_in_past: [400, { slot: 'That time has passed. Please pick another.' }],
};
const SLOT_TAKEN = 'That time was just taken. Please pick another.';

// POST /api/bookings → { ref, paymentRequired, amount }
export async function POST(request) {
  if (!hasServiceRole()) return fail(503, 'Online booking is not set up yet. Please call or WhatsApp us.');
  const db = createServiceClient();

  try {
    if (!(await allowRequest(db, request, 'booking'))) {
      return fail(429, 'Too many booking attempts. Please wait a few minutes, or call or WhatsApp us.');
    }
  } catch (e) {
    console.error('rate limit check failed', e);
    return fail(500, 'Something went wrong. Please try again.');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Invalid request.');
  }

  // Honeypot: real people never see this field. Pretend it worked and save nothing.
  if (body?.website) return json({ ref: 'VDC-0000', paymentRequired: false });

  const { data: f, errors } = parseBooking(body);
  if (errors) return fail(400, 'Please check the highlighted fields.', { fields: errors });

  try {
    const slots = await getSlots(db, f.branch, f.date);
    if (!slots) return fail(400, 'Please check the highlighted fields.', { fields: { branch: 'Choose Koraput or Semiliguda.' } });
    if (slots.closed) return fail(400, 'Please check the highlighted fields.', { fields: { date: closedMessage(slots) } });
    const slot = slots.slots.find((s) => s.minutes === f.slot);
    if (!slot) return fail(400, 'Please check the highlighted fields.', { fields: { slot: 'Please choose one of the times shown.' } });
    if (!slot.available) {
      return slot.reason === 'past'
        ? fail(400, 'Please check the highlighted fields.', { fields: { slot: 'That time has passed. Please pick another.' } })
        : fail(409, SLOT_TAKEN, { fields: { slot: SLOT_TAKEN } });
    }

    const [{ data: treatment }, { data: settings }, { data: branch }] = await Promise.all([
      db.from('treatments').select('id').eq('name', f.treatment).eq('visible', true).maybeSingle(),
      db.from('settings').select('key, value').in('key', ['booking_fee_enabled', 'booking_fee_amount']),
      db.from('branches').select('name').eq('id', slots.branchId).single(),
    ]);
    if (!treatment && !EXTRA_CONCERNS.includes(f.treatment)) {
      return fail(400, 'Please check the highlighted fields.', { fields: { treatment: 'Choose a treatment, or "Not sure – need a check-up".' } });
    }
    const s = Object.fromEntries((settings || []).map((r) => [r.key, r.value]));
    const amount = Number(s.booking_fee_amount) || 0;
    const paymentRequired = s.booking_fee_enabled === true && amount > 0 && hasRazorpay();

    const { data: ref, error } = await db.rpc('create_booking', {
      p_name: f.name,
      p_phone: f.mobile,
      p_branch_id: slots.branchId,
      p_treatment_id: treatment?.id ?? null,
      p_concern: f.treatment,
      p_date: f.date,
      p_slot_start: minToTime(f.slot),
      p_note: f.note,
      p_consent: f.consent,
      p_payment_status: paymentRequired ? 'pending' : 'not_required',
    });
    if (error) {
      if (error.code === '23505' || error.message === 'slot_taken') return fail(409, SLOT_TAKEN, { fields: { slot: SLOT_TAKEN } });
      const known = DB_ERRORS[error.message];
      if (known) return fail(known[0], 'Please check the highlighted fields.', { fields: known[1] });
      throw error;
    }

    await notifyNewBooking({
      ref,
      branch: branch?.name ?? f.branch,
      dateLabel: dLabel(f.date),
      timeLabel: fmt(f.slot),
      name: f.name,
      phone: f.mobile,
      treatment: f.treatment,
      note: f.note,
    });
    return json({ ref, paymentRequired, amount: paymentRequired ? amount : 0 }, 201);
  } catch (e) {
    console.error('booking failed', e);
    return fail(500, 'Your booking did not go through. Please try again.');
  }
}
