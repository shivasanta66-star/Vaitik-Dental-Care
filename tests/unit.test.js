import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { branchStatus, hoursSummary } from '../src/lib/branch.js';
import { paymentUpdateFromEvent, verifyWebhookSignature } from '../src/lib/razorpay.js';
import { computeSlots } from '../src/lib/slots.js';
import { addDaysYmd, clinicNow, dLabel, fmt, isYmd } from '../src/lib/time.js';
import { cleanMobile, parseBooking } from '../src/lib/validation.js';

const KORAPUT = { hours: [0, 1, 2, 3, 4, 5, 6].map(() => [540, 1290]), blocked: {} };
const SEMILIGUDA = { hours: [0, 1, 2, 3, 4, 5, 6].map((d) => (d === 0 ? [1020, 1230] : [600, 1230])), blocked: {} };

test('clinic time is India time whatever the server timezone', () => {
  // 18:40 UTC on Tue 29 Sep = 00:10 IST on Wed 30 Sep
  assert.deepEqual(clinicNow(new Date('2026-09-29T18:40:00Z')), { ymd: '2026-09-30', weekday: 3, minutes: 10 });
  assert.equal(fmt(1290), '9:30 PM');
  assert.equal(fmt(0), '12:00 AM');
  assert.equal(dLabel('2026-10-04'), 'Sun, 4 Oct');
  assert.equal(addDaysYmd('2026-12-31', 1), '2027-01-01');
  assert.ok(isYmd('2026-02-28'));
  assert.ok(!isYmd('2026-02-30'));
});

test('Sunday hours at Semiliguda give 5:00–8:00 PM slots', () => {
  const now = { ymd: '2026-10-01', weekday: 4, minutes: 600 };
  const r = computeSlots({ date: '2026-10-04', hours: { opens: '17:00', closes: '20:30', slot_minutes: 30 }, now });
  assert.equal(r.closed, null);
  assert.deepEqual(r.slots.map((s) => s.time), ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']);
  assert.ok(r.slots.every((s) => s.available));
});

test('booked and past slots are unavailable', () => {
  const now = { ymd: '2026-10-01', weekday: 4, minutes: 10 * 60 + 5 }; // 10:05
  const r = computeSlots({ date: '2026-10-01', hours: { opens: '09:00', closes: '21:30', slot_minutes: 30 }, taken: new Set([12 * 60]), now });
  const at = (t) => r.slots.find((s) => s.time === t);
  assert.equal(at('10:00').reason, 'past');
  assert.equal(at('10:30').reason, 'past', 'needs 30 minutes notice');
  assert.equal(at('11:00').available, true);
  assert.equal(at('12:00').reason, 'booked');
  assert.equal(r.slots.at(-1).time, '21:00', 'last slot must finish by closing time');
});

test('closed, blocked, past and far-future dates have no slots', () => {
  const now = { ymd: '2026-10-01', weekday: 4, minutes: 600 };
  const hours = { opens: '09:00', closes: '21:30', slot_minutes: 30 };
  assert.equal(computeSlots({ date: '2026-10-02', hours: null, now }).closed, 'closed');
  assert.equal(computeSlots({ date: '2026-10-02', hours, blockedReason: 'Diwali', now }).closed, 'blocked');
  assert.equal(computeSlots({ date: '2026-09-30', hours, now }).closed, 'past');
  assert.equal(computeSlots({ date: '2026-12-15', hours, now }).closed, 'too_far');
});

test('hours summaries', () => {
  assert.equal(hoursSummary(KORAPUT.hours), 'Every day, 9:00 AM – 9:30 PM');
  assert.equal(hoursSummary(SEMILIGUDA.hours), 'Mon–Sat 10:00 AM – 8:30 PM · Sun 5:00 PM – 8:30 PM');
});

test('open / closed badge', () => {
  const tue = (minutes) => ({ ymd: '2026-09-29', weekday: 2, minutes });
  assert.deepEqual(branchStatus(KORAPUT, tue(500)), { open: false, label: 'Opens at 9:00 AM' });
  assert.deepEqual(branchStatus(KORAPUT, tue(600)), { open: true, label: 'Open now · till 9:30 PM' });
  assert.deepEqual(branchStatus(KORAPUT, tue(1300)), { open: false, label: 'Opens tomorrow 9:00 AM' });
  // Saturday night at Semiliguda → opens Sunday evening
  assert.equal(branchStatus(SEMILIGUDA, { ymd: '2026-10-03', weekday: 6, minutes: 1250 }).label, 'Opens tomorrow 5:00 PM');
  const holiday = { ...KORAPUT, blocked: { '2026-09-29': 'Diwali' } };
  assert.equal(branchStatus(holiday, tue(600)).label, 'Closed today · Opens tomorrow 9:00 AM');
});

test('booking validation', () => {
  const today = clinicNow().ymd;
  const good = { name: 'Ravi Kumar', mobile: '+91 98765 43210', branch: 'koraput', treatment: 'Root canal', date: addDaysYmd(today, 2), slot: 600, note: '', consent: true };
  const ok = parseBooking(good);
  assert.equal(ok.data.mobile, '9876543210');
  assert.equal(cleanMobile('09876543210'), '9876543210');

  const bad = (patch) => parseBooking({ ...good, ...patch }).errors;
  assert.ok(bad({ mobile: '5876543210' }).mobile, 'Indian mobiles start with 6-9');
  assert.ok(bad({ mobile: '98765' }).mobile);
  assert.ok(bad({ name: 'R' }).name);
  assert.ok(bad({ date: addDaysYmd(today, -1) }).date, 'no past dates');
  assert.ok(bad({ date: addDaysYmd(today, 61) }).date, 'no more than 60 days ahead');
  assert.ok(bad({ date: '2026-13-01' }).date);
  assert.ok(bad({ consent: false }).consent);
  assert.ok(bad({ slot: '' }).slot);
  assert.ok(bad({ note: 'x'.repeat(201) }).note);
});

test('Razorpay webhook signature', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.ok(verifyWebhookSignature(body, sig, secret));
  assert.ok(!verifyWebhookSignature(body, sig, 'wrong-secret'), 'wrong secret');
  assert.ok(!verifyWebhookSignature(body + ' ', sig, secret), 'tampered body');
  assert.ok(!verifyWebhookSignature(body, 'abc', secret), 'garbage signature');
  assert.ok(!verifyWebhookSignature(body, null, secret), 'missing signature');
  assert.deepEqual(paymentUpdateFromEvent(JSON.parse(body)), { orderId: 'order_1', paymentId: 'pay_1', status: 'paid' });
  assert.equal(paymentUpdateFromEvent({ event: 'refund.created' }), null);
});
