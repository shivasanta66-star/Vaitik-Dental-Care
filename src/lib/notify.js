import 'server-only';

// Emails the clinic about a new booking via Resend. Failures are logged, never thrown:
// the booking is already saved and the patient should still see success.
export async function notifyNewBooking({ ref, branch, dateLabel, timeLabel, name, phone, treatment, note }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CLINIC_EMAIL;
  if (!key || !to) return;
  const text = [
    `New booking ${ref}`,
    '',
    `Branch: ${branch}`,
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Patient: ${name}`,
    `Phone: +91 ${phone}`,
    `For: ${treatment}`,
    note ? `Note: ${note}` : null,
    '',
    'Confirm it in the admin panel, then call or WhatsApp the patient.',
  ]
    .filter((l) => l !== null)
    .join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Vaitik Dental Care <onboarding@resend.dev>',
        to: to.split(',').map((s) => s.trim()),
        subject: `New booking ${ref}: ${branch}, ${dateLabel} ${timeLabel}`,
        text,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('Resend email failed', res.status, await res.text());
  } catch (e) {
    console.error('Resend email failed', e);
  }
}
