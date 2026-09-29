'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/browser.js';

export default function LoginForm({ configured }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email) || !password) return setErr('Enter your staff email and password.');
    setBusy(true);
    setErr('');
    const { error } = await getBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErr(/invalid/i.test(error.message) ? 'Wrong email or password.' : error.message);
    router.replace('/admin');
    router.refresh();
  };

  return (
    <main className="login">
      <form onSubmit={submit} noValidate>
        <p className="brand">
          <span className="brand-word">VAITIK</span>
          <span className="brand-sub">dental care</span>
        </p>
        <h1>Staff sign in</h1>
        {!configured && <p className="notice is-warn">Supabase is not configured yet. Add the environment variables from .env.example.</p>}
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && (
          <p role="alert" className="error">
            {err}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !configured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="small muted">Forgot your password? Ask the clinic owner to reset it.</p>
      </form>
    </main>
  );
}
