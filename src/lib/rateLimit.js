import 'server-only';
import crypto from 'node:crypto';

export function clientIp(request) {
  const h = request.headers;
  return h.get('x-nf-client-connection-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

// Stores a keyed hash of the IP, never the IP itself.
export function ipHash(request, scope) {
  const key = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'vaitik';
  return crypto.createHmac('sha256', key).update(scope + ':' + clientIp(request)).digest('hex');
}

/** true when allowed. Default: 5 requests per 10 minutes per IP and scope. */
export async function allowRequest(db, request, scope, limit = 5, windowMinutes = 10) {
  const { data, error } = await db.rpc('check_rate_limit', {
    p_ip_hash: ipHash(request, scope),
    p_limit: limit,
    p_window: `${windowMinutes} minutes`,
  });
  if (error) throw error;
  return data === true;
}
