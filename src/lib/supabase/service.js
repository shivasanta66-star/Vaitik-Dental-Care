import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../env.js';

// Full-access client for API routes. Never import this from client code.
export function createServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
