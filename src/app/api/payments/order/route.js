import { hasRazorpay, hasServiceRole } from '@/lib/env.js';
import { createRazorpayOrder } from '@/lib/razorpay.js';
import { allowRequest } from '@/lib/rateLimit.js';
import { createServiceClient } from '@/lib/supabase/service.js';
import { fail, json } from '../../_respond.js';

export const dynamic = 'force-dynamic';

// POST /api/payments/order { ref } → { orderId, amount, currency, keyId }
// Only works while the booking fee is switched on in Settings.
export async function POST(request) {
  if (!hasServiceRole() || !hasRazorpay()) return fail(404, 'Online payment is not available.');
  const db = createServiceClient();

  const { data: settings } = await db.from('settings').select('key, value').in('key', ['booking_fee_enabled', 'booking_fee_amount']);
  const s = Object.fromEntries((settings || []).map((r) => [r.key, r.value]));
  const amount = Number(s.booking_fee_amount) || 0;
  if (s.booking_fee_enabled !== true || amount <= 0) return fail(404, 'Online payment is not available.');

  if (!(await allowRequest(db, request, 'payment', 10, 10))) return fail(429, 'Too many attempts. Please wait a few minutes.');

  let ref;
  try {
    ({ ref } = await request.json());
  } catch {
    return fail(400, 'Invalid request.');
  }
  if (typeof ref !== 'string' || !/^VDC-[A-Z0-9]{4}$/.test(ref)) return fail(400, 'Invalid booking reference.');

  const { data: appt } = await db
    .from('appointments')
    .select('id, ref_code, payment_status, status, patient:patients(phone, name)')
    .eq('ref_code', ref)
    .maybeSingle();
  if (!appt || appt.status === 'cancelled') return fail(404, 'Booking not found.');
  if (appt.payment_status === 'paid') return fail(409, 'This booking fee is already paid.');
  if (appt.payment_status === 'not_required') return fail(409, 'No booking fee is due for this booking.');

  try {
    const order = await createRazorpayOrder({ amountPaise: Math.round(amount * 100), receipt: ref, notes: { ref } });
    await db.from('appointments').update({ razorpay_order_id: order.id, payment_status: 'pending' }).eq('id', appt.id);
    return json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      prefill: { name: appt.patient?.name, contact: '+91' + appt.patient?.phone },
    });
  } catch (e) {
    console.error('razorpay order failed', e);
    return fail(502, 'Could not start the payment. Please try again.');
  }
}
