import { z } from 'zod';
import { MESSAGES, MESSAGE_MAX, cleanMobile } from './bookingRules.js';

export { MESSAGES, MESSAGE_MAX, cleanMobile } from './bookingRules.js';

export const enquirySchema = z.object({
  name: z.string().trim().min(2, MESSAGES.name).max(80, 'Please use a shorter name.'),
  mobile: z
    .string()
    .transform(cleanMobile)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, MESSAGES.mobile)),
  message: z.string({ error: MESSAGES.message }).trim().min(1, MESSAGES.message).max(MESSAGE_MAX, `Please keep your question under ${MESSAGE_MAX} characters.`),
  consent: z.literal(true, { error: MESSAGES.consent }),
});

/** Returns { data } or { errors: { field: message } }. */
export function parseEnquiry(body) {
  const r = enquirySchema.safeParse(body ?? {});
  if (r.success) return { data: r.data };
  const errors = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0];
    if (k && !errors[k]) errors[k] = issue.message;
  }
  return { errors };
}
