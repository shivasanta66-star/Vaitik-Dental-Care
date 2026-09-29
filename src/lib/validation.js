import { z } from 'zod';
import { BOOKING_WINDOW_DAYS } from './slots.js';
import { MESSAGES, cleanMobile } from './bookingRules.js';
import { addDaysYmd, clinicNow, isYmd } from './time.js';

export { EXTRA_CONCERNS, MESSAGES, cleanMobile } from './bookingRules.js';

export const bookingSchema = z.object({
  name: z.string().trim().min(2, MESSAGES.name).max(80, 'Please use a shorter name.'),
  mobile: z
    .string()
    .transform(cleanMobile)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, MESSAGES.mobile)),
  branch: z.string().regex(/^[a-z0-9-]+$/, MESSAGES.branch),
  treatment: z.string().trim().min(1, MESSAGES.treatment).max(80),
  date: z
    .string()
    .refine(isYmd, MESSAGES.date)
    .refine((d) => d >= clinicNow().ymd, 'That date has passed. Please pick another date.')
    .refine((d) => d <= addDaysYmd(clinicNow().ymd, BOOKING_WINDOW_DAYS), `You can book up to ${BOOKING_WINDOW_DAYS} days ahead.`),
  slot: z.number({ error: MESSAGES.slot }).int(MESSAGES.slot).min(0, MESSAGES.slot).max(24 * 60 - 1, MESSAGES.slot),
  note: z.string().trim().max(200, 'Please keep the note under 200 characters.').optional().default(''),
  consent: z.literal(true, { error: MESSAGES.consent }),
});

/** Returns { data } or { errors: { field: message } }. */
export function parseBooking(body) {
  const r = bookingSchema.safeParse(body ?? {});
  if (r.success) return { data: r.data };
  const errors = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0];
    if (k && !errors[k]) errors[k] = issue.message;
  }
  return { errors };
}
