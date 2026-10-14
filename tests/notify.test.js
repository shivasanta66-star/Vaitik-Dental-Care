import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyNewEnquiry } from '../src/lib/notify.js';

const enquiry = { name: 'Meena Das', phone: '9437001122', message: 'Do you treat children on Sundays?' };

test('question email goes to the clinic with name, phone and the question', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('{}', { status: 200 });
  };
  process.env.RESEND_API_KEY = 're_test';
  process.env.CLINIC_EMAIL = 'desk@clinic.in, owner@clinic.in';
  let sent;
  try {
    sent = await notifyNewEnquiry(enquiry);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ['desk@clinic.in', 'owner@clinic.in']);
  assert.match(body.subject, /question.*Meena Das.*9437001122/);
  for (const part of ['Name: Meena Das', 'Phone: +91 9437001122', 'Do you treat children on Sundays?', 'not an appointment']) assert.ok(body.text.includes(part), part);
});

test('email failures are reported, never thrown', async () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  console.error = () => {};
  process.env.RESEND_API_KEY = 're_test';
  process.env.CLINIC_EMAIL = 'desk@clinic.in';
  try {
    globalThis.fetch = async () => {
      throw new Error('network down');
    };
    assert.equal(await notifyNewEnquiry(enquiry), false);
    globalThis.fetch = async () => new Response('bad', { status: 500 });
    assert.equal(await notifyNewEnquiry(enquiry), false);
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
    assert.equal(await notifyNewEnquiry(enquiry), false);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(called, false);
});
