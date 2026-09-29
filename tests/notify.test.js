import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyNewBooking } from '../src/lib/notify.js';

const booking = { ref: 'VDC-AB12', branch: 'Koraput', dateLabel: 'Thu, 1 Oct', timeLabel: '4:00 PM', name: 'Meena Das', phone: '9437001122', treatment: 'Fillings', note: 'Sensitive tooth' };

test('new-booking email goes to the clinic with branch, date, slot and phone', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('{}', { status: 200 });
  };
  process.env.RESEND_API_KEY = 're_test';
  process.env.CLINIC_EMAIL = 'desk@clinic.in, owner@clinic.in';
  try {
    await notifyNewBooking(booking);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ['desk@clinic.in', 'owner@clinic.in']);
  assert.match(body.subject, /VDC-AB12.*Koraput.*Thu, 1 Oct 4:00 PM/);
  for (const part of ['Branch: Koraput', 'Date: Thu, 1 Oct', 'Time: 4:00 PM', 'Phone: +91 9437001122']) assert.ok(body.text.includes(part), part);
});

test('email failures never break a booking', async () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  console.error = () => {};
  process.env.RESEND_API_KEY = 're_test';
  process.env.CLINIC_EMAIL = 'desk@clinic.in';
  try {
    await assert.doesNotReject(notifyNewBooking(booking));
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
  }
});

test('no email is attempted when Resend is not configured', async () => {
  delete process.env.RESEND_API_KEY;
  let called = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    called = true;
  };
  try {
    await notifyNewBooking(booking);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(called, false);
});
