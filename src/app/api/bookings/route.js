import { hasServiceRole } from '@/lib/env.js';
import { hasEnquiryEmail, notifyNewEnquiry } from '@/lib/notify.js';
import { allowRequest } from '@/lib/rateLimit.js';
import { createServiceClient } from '@/lib/supabase/service.js';
import { parseEnquiry } from '@/lib/validation.js';
import { fail, json } from '../_respond.js';

export const dynamic = 'force-dynamic';

const NOT_SENT = 'Your question did not go through. Please try again, or call or WhatsApp us.';

// POST /api/bookings → { ok: true }
// Receives the "Ask us a question" form and emails it to the clinic.
// Appointments are booked on ClinicDesk (SITE.bookingUrl), not here.
export async function POST(request) {
  if (!hasServiceRole() || !hasEnquiryEmail()) return fail(503, 'Online questions are not set up yet. Please call or WhatsApp us.');
  const db = createServiceClient();

  try {
    if (!(await allowRequest(db, request, 'booking'))) {
      return fail(429, 'Too many messages. Please wait a few minutes, or call or WhatsApp us.');
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

  // Honeypot: real people never see this field. Pretend it worked and send nothing.
  if (body?.website) return json({ ok: true });

  const { data: f, errors } = parseEnquiry(body);
  if (errors) return fail(400, 'Please check the highlighted fields.', { fields: errors });

  const sent = await notifyNewEnquiry({ name: f.name, phone: f.mobile, message: f.message });
  if (!sent) return fail(502, NOT_SENT);
  return json({ ok: true }, 201);
}
