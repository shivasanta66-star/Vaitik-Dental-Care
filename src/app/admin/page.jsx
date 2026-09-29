import { redirect } from 'next/navigation';
import Admin from '@/components/admin/Admin.jsx';
import SignOutButton from '@/components/admin/SignOutButton.jsx';
import { hasSupabase } from '@/lib/env.js';
import { getStaff } from '@/lib/staff.js';
import { addDaysYmd, clinicNow, isYmd, timeToMin } from '@/lib/time.js';

export const dynamic = 'force-dynamic';

function Notice({ title, children }) {
  return (
    <main className="center-card">
      <div>
        <h1 style={{ fontSize: 22, color: 'var(--navy-700)' }}>{title}</h1>
        {children}
      </div>
    </main>
  );
}

export default async function AdminPage({ searchParams }) {
  if (!hasSupabase()) {
    return (
      <Notice title="Admin is not set up yet">
        <p>Add the Supabase environment variables from .env.example, run the migrations, then create the first owner. The README explains each step.</p>
      </Notice>
    );
  }
  const { supabase, user, staff } = await getStaff();
  if (!user) redirect('/admin/login');
  if (!staff) {
    return (
      <Notice title="No staff access">
        <p>
          You are signed in as <strong>{user.email}</strong>, but this account is not on the staff list. Ask the clinic owner to add you.
        </p>
        <SignOutButton />
      </Notice>
    );
  }

  const sp = await searchParams;
  const today = clinicNow().ymd;
  const from = isYmd(sp?.from) ? sp.from : addDaysYmd(today, -30);
  const to = isYmd(sp?.to) ? sp.to : addDaysYmd(today, 60);

  const results = await Promise.all([
    supabase.from('branches').select('id, slug, name, phone').order('sort'),
    supabase.from('branch_hours').select('branch_id, weekday, opens, closes, slot_minutes'),
    supabase.from('blocked_dates').select('id, branch_id, date, reason').gte('date', today).order('date'),
    supabase
      .from('appointments')
      .select('id, ref_code, date, slot_start, status, note, internal_note, payment_status, concern, patient:patients(id, name, phone), branch:branches(slug, name), treatment:treatments(name)')
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('slot_start')
      .limit(3000),
    supabase.from('dashboard_today').select('branch_slug, status, n'),
    supabase.from('dashboard_next_7_days').select('date, branch_slug, n').order('date'),
    supabase.from('patient_summary').select('id, name, phone, completed_visits, total_appointments, last_visit').order('name'),
    supabase.from('treatments').select('id, name, blurb, icon, price_text, visible').order('sort'),
    supabase.from('doctors').select('id, name, qualification, reg_no, schedule_text, focus, photo_url, branch_ids, active').order('sort'),
    supabase.from('reviews').select('id, author_initial, text, branch_id, visible').order('sort'),
    supabase.from('gallery').select('id, caption, before_url, after_url, consent_confirmed, visible').order('sort'),
    supabase.from('settings').select('key, value'),
    supabase.from('staff').select('user_id, role, name, email').order('created_at'),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) {
    return (
      <Notice title="Could not load the admin data">
        <p>{failed.error.message}</p>
        <p className="small muted">Check that all migrations in supabase/migrations have been run.</p>
      </Notice>
    );
  }
  const [branches, hours, blocked, appts, dashToday, dashWeek, patients, treatments, doctors, reviews, gallery, settings, staffList] = results.map((r) => r.data);
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  const data = {
    today,
    branches: branches.map((b) => ({
      ...b,
      slotMinutes: hours.find((h) => h.branch_id === b.id)?.slot_minutes ?? 30,
      hours: [0, 1, 2, 3, 4, 5, 6].map((d) => {
        const h = hours.find((x) => x.branch_id === b.id && x.weekday === d);
        return h ? { open: h.opens.slice(0, 5), close: h.closes.slice(0, 5), closed: false } : { open: '10:00', close: '20:00', closed: true };
      }),
    })),
    blocked,
    appointments: appts.map((a) => ({
      id: a.id,
      ref: a.ref_code,
      patientId: a.patient?.id,
      name: a.patient?.name ?? '(deleted)',
      mobile: a.patient?.phone ?? '',
      branch: a.branch?.name ?? '',
      branchSlug: a.branch?.slug ?? '',
      treatment: a.treatment?.name || a.concern || '',
      date: a.date,
      time: a.slot_start.slice(0, 5),
      minutes: timeToMin(a.slot_start),
      status: a.status,
      note: a.note || '',
      internalNote: a.internal_note || '',
      payment: a.payment_status,
    })),
    dashboard: { today: dashToday, week: dashWeek },
    patients,
    treatments: treatments.map((t) => ({ id: t.id, name: t.name, blurb: t.blurb || '', icon: t.icon, price: t.price_text || '', visible: t.visible })),
    doctors,
    reviews: reviews.map((r) => ({ id: r.id, initial: r.author_initial, text: r.text, branch_id: r.branch_id, visible: r.visible })),
    gallery: gallery.map((g) => ({ id: g.id, caption: g.caption, before_url: g.before_url, after_url: g.after_url, consent: g.consent_confirmed, visible: g.visible })),
    settings: { emergency: s.emergency_number ?? '', feeOn: s.booking_fee_enabled === true, feeAmount: Number(s.booking_fee_amount) || 0 },
    staff: staffList,
  };
  const me = { id: user.id, email: user.email, role: staff.role, name: staff.name };
  return <Admin data={data} me={me} range={{ from, to }} version={Date.now()} />;
}
