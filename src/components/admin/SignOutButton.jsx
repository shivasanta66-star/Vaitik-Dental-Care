'use client';

import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/browser.js';

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await getBrowserClient().auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };
}

export default function SignOutButton() {
  const signOut = useSignOut();
  return (
    <button type="button" onClick={signOut} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
      Sign out
    </button>
  );
}
