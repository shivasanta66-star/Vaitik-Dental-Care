import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm.jsx';
import { hasSupabase } from '@/lib/env.js';
import { getStaff } from '@/lib/staff.js';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const { user, staff } = await getStaff();
  if (user && staff) redirect('/admin');
  return <LoginForm configured={hasSupabase()} />;
}
