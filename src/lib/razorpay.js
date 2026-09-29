import crypto from 'node:crypto';

// Razorpay signs webhook bodies with HMAC-SHA256 using the webhook secret.
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(String(signature));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('Razorpay order failed: ' + res.status + ' ' + (await res.text()));
  return res.json();
}

/** Maps a webhook event to { orderId, paymentId, status } or null when irrelevant. */
export function paymentUpdateFromEvent(evt) {
  const payment = evt?.payload?.payment?.entity;
  const order = evt?.payload?.order?.entity;
  switch (evt?.event) {
    case 'payment.captured':
      return payment?.order_id ? { orderId: payment.order_id, paymentId: payment.id, status: 'paid' } : null;
    case 'order.paid':
      return order?.id ? { orderId: order.id, paymentId: payment?.id ?? null, status: 'paid' } : null;
    case 'payment.failed':
      return payment?.order_id ? { orderId: payment.order_id, paymentId: payment.id, status: 'failed' } : null;
    default:
      return null;
  }
}
