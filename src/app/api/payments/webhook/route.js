import { hasServiceRole } from '@/lib/env.js';
import { paymentUpdateFromEvent, verifyWebhookSignature } from '@/lib/razorpay.js';
import { createServiceClient } from '@/lib/supabase/service.js';
import { fail, json } from '../../_respond.js';

export const dynamic = 'force-dynamic';

// POST /api/payments/webhook — called by Razorpay. The payment status is only
// ever set here, after checking Razorpay's signature; the browser is never trusted.
export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !hasServiceRole()) return fail(404, 'Not found.');

  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'), secret)) {
    return fail(400, 'Invalid signature.');
  }

  let evt;
  try {
    evt = JSON.parse(raw);
  } catch {
    return fail(400, 'Invalid body.');
  }
  const update = paymentUpdateFromEvent(evt);
  if (!update) return json({ ok: true, ignored: evt?.event ?? null });

  const db = createServiceClient();
  let q = db.from('appointments').update({ payment_status: update.status, razorpay_payment_id: update.paymentId }).eq('razorpay_order_id', update.orderId);
  // A late "failed" event must never undo a successful payment.
  if (update.status === 'failed') q = q.neq('payment_status', 'paid');
  const { error } = await q;
  if (error) {
    console.error('webhook update failed', error);
    return fail(500, 'Could not record payment.');
  }
  return json({ ok: true });
}
