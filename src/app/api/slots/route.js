import { hasServiceRole } from '@/lib/env.js';
import { closedMessage, getSlots } from '@/lib/slots.js';
import { createServiceClient } from '@/lib/supabase/service.js';
import { isYmd } from '@/lib/time.js';
import { fail, json } from '../_respond.js';

export const dynamic = 'force-dynamic';

// GET /api/slots?branch=koraput&date=2026-10-01
// → { slots: [{ minutes, time, label, available, reason }], closed, message }
export async function GET(request) {
  if (!hasServiceRole()) return fail(503, 'Online booking is not set up yet.');
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get('branch') || '';
  const date = searchParams.get('date') || '';
  if (!/^[a-z0-9-]+$/.test(branch) || !isYmd(date)) return fail(400, 'Choose a branch and a date.');

  try {
    const result = await getSlots(createServiceClient(), branch, date);
    if (!result) return fail(404, 'Unknown branch.');
    return json({ slots: result.slots, closed: result.closed, message: closedMessage(result) });
  } catch (e) {
    console.error('slots failed', e);
    return fail(500, 'Could not load times. Please try again.');
  }
}
