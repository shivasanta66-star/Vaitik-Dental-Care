// Which services are configured. Public values are safe in the browser;
// everything else must only be read on the server.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabase = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const hasServiceRole = () => hasSupabase() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
export const hasRazorpay = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
