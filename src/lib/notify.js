import 'server-only';

export const hasEnquiryEmail = () => Boolean(process.env.RESEND_API_KEY && process.env.CLINIC_EMAIL);

// Emails the clinic a question from the "Ask us a question" form via Resend.
// The email is the only copy of the question, so this returns false on any failure
// and the visitor is told to try again or call/WhatsApp instead.
export async function notifyNewEnquiry({ name, phone, message }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CLINIC_EMAIL;
  if (!key || !to) return false;
  const text = [
    'New question from the website',
    '',
    `Name: ${name}`,
    `Phone: +91 ${phone}`,
    '',
    message,
    '',
    'Please call or WhatsApp them with an answer. This is a question, not an appointment.',
  ].join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Vaitik Dental Care <onboarding@resend.dev>',
        to: to.split(',').map((s) => s.trim()),
        subject: `New question from ${name} (+91 ${phone})`,
        text,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('Resend email failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend email failed', e);
    return false;
  }
}
