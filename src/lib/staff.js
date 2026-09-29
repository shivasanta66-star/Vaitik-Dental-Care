import 'server-only';
import { hasSupabase } from './env.js';
import { createSessionClient } from './supabase/server.js';

/** The signed-in user and their staff row (null when not staff). */
export async function getStaff() {
  if (!hasSupabase()) return { supabase: null, user: null, staff: null };
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, staff: null };
  const { data: staff } = await supabase.from('staff').select('role, name, email').eq('user_id', user.id).maybeSingle();
  return { supabase, user, staff };
}

export class AccessError extends Error {}

/** Throws unless the caller is staff (or an owner when role === 'owner'). */
export async function requireStaff(role = 'receptionist') {
  const ctx = await getStaff();
  if (!ctx.user || !ctx.staff) throw new AccessError('Please sign in again.');
  if (role === 'owner' && ctx.staff.role !== 'owner') throw new AccessError('Only an owner can do this.');
  return ctx;
}
