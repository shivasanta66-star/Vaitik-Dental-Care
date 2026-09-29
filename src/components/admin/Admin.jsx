'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as actions from '@/app/admin/actions.js';
import { addDaysYmd, dLabel, longDate, t12 } from '@/lib/time.js';
import { DoctorsAndSchedule, GalleryEditor, ReviewsEditor, SettingsEditor, TreatmentsEditor } from './Editors.jsx';
import { useSignOut } from './SignOutButton.jsx';

export const STATUS_LABEL = { new: 'New', confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-show', cancelled: 'Cancelled' };
const STATUSES = Object.keys(STATUS_LABEL);
const CHIP = {
  new: { background: '#E6F1FB', color: '#0C447C', border: '1px solid #378ADD' },
  confirmed: { background: '#0C447C', color: '#FFFFFF', border: '1px solid #0C447C' },
  completed: { background: '#042C53', color: '#FFFFFF', border: '1px solid #042C53' },
  no_show: { background: '#FFFFFF', color: '#C4451C', border: '1px solid #C4451C' },
  cancelled: { background: '#FFFFFF', color: '#5A6B7D', border: '1px solid #B5D4F4', textDecoration: 'line-through' },
};
const PAYMENT = { pending: ['Fee pending', ''], paid: ['Fee paid', ' is-paid'], failed: ['Fee failed', ' is-warn'] };
const NAV = [
  ['dashboard', 'Dashboard', 'ph-squares-four'],
  ['appointments', 'Appointments', 'ph-calendar-check'],
  ['patients', 'Patients', 'ph-users'],
  ['treatments', 'Treatments and prices', 'ph-tooth'],
  ['doctors', 'Doctors and schedule', 'ph-clock'],
  ['reviews', 'Reviews', 'ph-star'],
  ['gallery', 'Gallery', 'ph-images'],
  ['settings', 'Settings', 'ph-gear'],
];

function waLink(a) {
  const msg = 'Namaskar ' + a.name.split(' ')[0] + ', this is Vaitik Dental Care, ' + a.branch + '. Your appointment (' + a.ref + ') is on ' + dLabel(a.date) + ' at ' + t12(a.time) + '. Reply YES to confirm or call us to change.';
  return 'https://wa.me/91' + a.mobile + '?text=' + encodeURIComponent(msg);
}

function Chip({ status }) {
  return (
    <span className="chip" style={CHIP[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// Toast + "run a server action, show the result, reload data".
function useActions() {
  const router = useRouter();
  const [toast, setToast] = useState('');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (msg) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(''), 2600);
  };
  const run = async (promise, okMsg) => {
    try {
      const r = await promise;
      if (r?.error) {
        flash(r.error);
        return null;
      }
      if (okMsg) flash(okMsg);
      router.refresh();
      return r ?? { ok: true };
    } catch {
      flash('Could not reach the server. Check your connection.');
      return null;
    }
  };
  return { toast, flash, run };
}

export default function Admin({ data, me, range, version }) {
  const router = useRouter();
  const signOut = useSignOut();
  const { toast, flash, run } = useActions();
  const [section, setSection] = useState('dashboard');
  const [dialog, setDialog] = useState(null);
  const sectionTitle = NAV.find((n) => n[0] === section)[1];
  const ctx = { data, me, run, flash, version };

  useEffect(() => {
    const onK = (e) => e.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', onK);
    return () => window.removeEventListener('keydown', onK);
  }, []);

  const actionsFor = (a) => ({
    confirm: () => run(actions.setAppointmentStatus(a.id, 'confirmed'), 'Confirmed ' + a.ref),
    complete: () => run(actions.setAppointmentStatus(a.id, 'completed'), 'Marked completed'),
    noshow: () => run(actions.setAppointmentStatus(a.id, 'no_show'), 'Marked no-show'),
    cancel: () => run(actions.setAppointmentStatus(a.id, 'cancelled'), 'Cancelled ' + a.ref),
    resched: () => setDialog({ type: 'resched', appt: a, date: a.date, time: a.time }),
    note: () => setDialog({ type: 'note', appt: a, note: a.internalNote }),
  });

  return (
    <>
      <div className="shell">
        <aside className="sidebar">
          <p className="brand">
            <span className="brand-word">VAITIK</span>
            <span className="brand-sub">admin</span>
          </p>
          <nav aria-label="Admin" className="side-nav">
            {NAV.map(([id, label, icon]) => (
              <button key={id} type="button" onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined}>
                <i className={'ph-duotone ' + icon} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <p>
              {me.email} · {me.role === 'owner' ? 'Owner' : 'Receptionist'}
            </p>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </aside>
        <header className="topbar">
          <span className="brand-word">VAITIK</span>
          <label style={{ flex: 1, display: 'flex' }}>
            <span className="visually-hidden">Section</span>
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              {NAV.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" aria-label="Sign out" onClick={signOut}>
            <i className="ph-duotone ph-sign-out" />
          </button>
        </header>

        <main className="content">
          <div className="content-head">
            <h1>{sectionTitle}</h1>
            <p className="small muted">{longDate(data.today)}</p>
          </div>

          {section === 'dashboard' && <Dashboard data={data} />}
          {section === 'appointments' && <Appointments data={data} range={range} actionsFor={actionsFor} router={router} />}
          {section === 'patients' && <Patients {...ctx} />}
          {section === 'treatments' && <TreatmentsEditor key={version} {...ctx} />}
          {section === 'doctors' && <DoctorsAndSchedule key={version} {...ctx} />}
          {section === 'reviews' && <ReviewsEditor key={version} {...ctx} />}
          {section === 'gallery' && <GalleryEditor key={version} {...ctx} />}
          {section === 'settings' && <SettingsEditor key={version} {...ctx} />}
        </main>
      </div>

      {dialog && <AppointmentDialog dialog={dialog} setDialog={setDialog} run={run} />}

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </>
  );
}

function Dashboard({ data }) {
  const todayA = data.appointments.filter((a) => a.date === data.today);
  const count = (status) => data.dashboard.today.filter((r) => r.status === status).reduce((n, r) => n + r.n, 0);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDaysYmd(data.today, i);
    const rows = data.dashboard.week.filter((r) => r.date === d);
    const by = (slug) => rows.filter((r) => r.branch_slug === slug).reduce((n, r) => n + r.n, 0);
    return { d, i, k: by('koraput'), s: by('semiliguda'), total: rows.reduce((n, r) => n + r.n, 0) };
  });
  const max = Math.max(1, ...days.map((c) => c.total));
  return (
    <>
      <div className="counts">
        {['new', 'confirmed', 'completed', 'no_show'].map((st) => (
          <div key={st} className="count">
            <p className="small muted" style={{ fontWeight: 500 }}>
              {STATUS_LABEL[st]} today
            </p>
            <p className="count-n">{count(st)}</p>
          </div>
        ))}
      </div>
      <div className="two-col">
        {data.branches.map((b) => {
          const list = todayA.filter((a) => a.branchSlug === b.slug && a.status !== 'cancelled');
          return (
            <section key={b.id} className="panel">
              <h2>
                {b.name} · today ({list.length})
              </h2>
              {!list.length && <p className="muted">No appointments today.</p>}
              {list.map((a) => (
                <div key={a.id} className="today-row">
                  <span className="today-time">{t12(a.time)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontWeight: 600 }}>{a.name}</strong>
                    <br />
                    <span className="small muted">{a.treatment}</span>
                  </span>
                  <Chip status={a.status} />
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <section className="panel" style={{ gap: 16 }}>
        <h2>Next 7 days</h2>
        <div role="img" aria-label={'Appointments next 7 days: ' + days.map((c) => dLabel(c.d) + ' ' + c.total).join(', ')} className="chart">
          {days.map((c) => (
            <div key={c.d} className="bar-col">
              <span className="small" style={{ fontWeight: 600 }}>
                {c.total}
              </span>
              <div className="bar" style={{ height: Math.round((c.total / max) * 140) + 'px' }}>
                <div style={{ background: '#378ADD', flex: c.s }} />
                <div style={{ background: '#042C53', flex: c.k }} />
              </div>
              <span className="small muted">{c.i === 0 ? 'Today' : dLabel(c.d).slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <p className="legend">
          <span>
            <span className="swatch" style={{ background: '#042C53' }} />
            Koraput
          </span>
          <span>
            <span className="swatch" style={{ background: '#378ADD' }} />
            Semiliguda
          </span>
        </p>
      </section>
    </>
  );
}

function Appointments({ data, range, actionsFor, router }) {
  const [flt, setFlt] = useState({ q: '', branch: '', status: '' });
  const [view, setView] = useState('table');
  const q = flt.q.toLowerCase();
  const filtered = data.appointments.filter(
    (a) =>
      (!flt.branch || a.branchSlug === flt.branch) &&
      (!flt.status || a.status === flt.status) &&
      (!q || a.name.toLowerCase().includes(q) || a.mobile.includes(q) || a.ref.toLowerCase().includes(q)),
  );
  const set = (k) => (e) => setFlt((f) => ({ ...f, [k]: e.target.value }));
  // Date range is loaded from the server, so changing it reloads the page data.
  const setRange = (k) => (e) => {
    const next = { ...range, [k]: e.target.value };
    if (next.from && next.to) router.push('/admin?from=' + next.from + '&to=' + next.to, { scroll: false });
  };

  return (
    <>
      <div className="filters">
        <label className="lbl" style={{ flex: '1 1 200px' }}>
          Search
          <input type="search" placeholder="Name, mobile or ref" value={flt.q} onChange={set('q')} className="inp" />
        </label>
        <label className="lbl">
          Branch
          <select value={flt.branch} onChange={set('branch')} className="inp">
            <option value="">All</option>
            {data.branches.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="lbl">
          Status
          <select value={flt.status} onChange={set('status')} className="inp">
            <option value="">All</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </label>
        <label className="lbl">
          From
          <input type="date" value={range.from} onChange={setRange('from')} className="inp" />
        </label>
        <label className="lbl">
          To
          <input type="date" value={range.to} onChange={setRange('to')} className="inp" />
        </label>
        <div role="group" aria-label="View" className="toggle">
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
            Table
          </button>
          <button type="button" aria-pressed={view === 'cal'} onClick={() => setView('cal')}>
            Calendar
          </button>
        </div>
      </div>
      <p className="small muted">
        {filtered.length} appointment{filtered.length === 1 ? '' : 's'}
      </p>
      {view === 'table' ? (
        <div className="table-card">
          <table className="table hover" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Branch</th>
                <th>Treatment</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const act = actionsFor(a);
                const pay = PAYMENT[a.payment];
                return (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ fontWeight: 600 }}>{dLabel(a.date)}</strong>
                      <br />
                      <span className="small muted">{t12(a.time)}</span>
                    </td>
                    <td>
                      <strong style={{ fontWeight: 600 }}>{a.name}</strong>
                      <br />
                      <span className="small muted">
                        {a.mobile} · {a.ref}
                      </span>
                      {a.note && (
                        <>
                          <br />
                          <span className="small muted">“{a.note}”</span>
                        </>
                      )}
                      {a.internalNote && (
                        <>
                          <br />
                          <span className="small" style={{ color: 'var(--navy-700)' }}>
                            <i className="ph-duotone ph-note" aria-hidden="true" /> {a.internalNote}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{a.branch}</td>
                    <td>{a.treatment}</td>
                    <td>
                      <div className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
                        <Chip status={a.status} />
                        {pay && <span className={'pill' + pay[1]}>{pay[0]}</span>}
                      </div>
                    </td>
                    <td style={{ paddingTop: 8, paddingBottom: 8 }}>
                      <div className="actions">
                        <button type="button" title="Confirm" aria-label={'Confirm ' + a.name} onClick={act.confirm} className="act">
                          <i className="ph-duotone ph-check" />
                        </button>
                        <button type="button" title="Mark completed" aria-label={'Mark ' + a.name + ' completed'} onClick={act.complete} className="act">
                          <i className="ph-duotone ph-check-circle" />
                        </button>
                        <button type="button" title="Reschedule" aria-label={'Reschedule ' + a.name} onClick={act.resched} className="act">
                          <i className="ph-duotone ph-calendar-dots" />
                        </button>
                        <button type="button" title="Mark no-show" aria-label={'Mark ' + a.name + ' no-show'} onClick={act.noshow} className="act">
                          <i className="ph-duotone ph-user-minus" />
                        </button>
                        <button type="button" title="Cancel" aria-label={'Cancel ' + a.name} onClick={act.cancel} className="act is-danger">
                          <i className="ph-duotone ph-x-circle" />
                        </button>
                        <button type="button" title="Internal note" aria-label={'Add note for ' + a.name} onClick={act.note} className="act">
                          <i className="ph-duotone ph-note-pencil" />
                        </button>
                        <a href={waLink(a)} target="_blank" rel="noopener" title="WhatsApp patient" aria-label={'WhatsApp ' + a.name} className="act is-wa">
                          <i className="ph-duotone ph-whatsapp-logo" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cal-card">
          <div className="cal">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const d = addDaysYmd(data.today, i);
              return (
                <div key={d} className={'cal-day' + (i === 0 ? ' is-today' : '')}>
                  <p>{(i === 0 ? 'Today · ' : '') + dLabel(d)}</p>
                  {filtered
                    .filter((a) => a.date === d)
                    .map((a) => (
                      <button key={a.id} type="button" onClick={actionsFor(a).resched} className="cal-item" style={CHIP[a.status]}>
                        <strong>{t12(a.time)}</strong> · {a.branch.slice(0, 3)}
                        <br />
                        {a.name}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function Patients({ data, me, run, flash }) {
  const [pq, setPq] = useState('');
  const [open, setOpen] = useState(null);
  const [history, setHistory] = useState({});
  const q = pq.toLowerCase();
  const list = data.patients.filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone.includes(q));

  const toggle = async (p) => {
    if (open === p.id) return setOpen(null);
    setOpen(p.id);
    const r = await actions.getPatientHistory(p.id);
    if (r?.error) flash(r.error);
    else setHistory((h) => ({ ...h, [p.id]: r.history }));
  };
  const remove = (p) => {
    if (!window.confirm('Delete ' + p.name + ' and all their appointments? This cannot be undone.')) return;
    run(actions.deletePatient(p.id), 'Patient deleted');
  };
  const exportCsv = () => {
    const rows = [['Name', 'Mobile', 'Completed visits', 'Total appointments', 'Last visit']].concat(list.map((p) => [p.name, p.phone, p.completed_visits, p.total_appointments, p.last_visit || '']));
    // Leading = + - @ would run as spreadsheet formulas, so they get a quote.
    const cell = (v) => {
      const s = String(v);
      return '"' + (/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
    };
    const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vaitik-patients.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('CSV downloaded');
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <input type="search" aria-label="Search patients" placeholder="Search name or mobile" value={pq} onChange={(e) => setPq(e.target.value)} className="inp" style={{ flex: '1 1 240px', maxWidth: 400 }} />
        <button type="button" onClick={exportCsv} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ph-duotone ph-download-simple" aria-hidden="true" />
          Export CSV
        </button>
      </div>
      <div className="table-card">
        <table className="table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Mobile</th>
              <th>Visits</th>
              <th>Last visit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const isOpen = open === p.id;
              return [
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.phone}</td>
                  <td>{p.completed_visits}</td>
                  <td>{p.last_visit ? dLabel(p.last_visit) : '—'}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" aria-expanded={isOpen} onClick={() => toggle(p)} className="btn" style={{ minHeight: 40, padding: '0 14px', border: '1px solid var(--blue-200)', background: 'var(--white)', color: 'var(--navy-700)' }}>
                      {isOpen ? 'Hide history' : 'History'}
                    </button>
                  </td>
                </tr>,
                isOpen && (
                  <tr key={p.id + '-h'}>
                    <td colSpan={5} style={{ padding: '0 16px 16px', background: 'var(--blue-25)' }}>
                      {!history[p.id] && <p className="small muted" style={{ padding: '8px 0' }}>Loading…</p>}
                      {history[p.id]?.map((v) => (
                        <p key={v.id} className="small" style={{ padding: '8px 0', borderBottom: '1px solid var(--blue-50)' }}>
                          <strong>
                            {dLabel(v.date)} {t12(v.time)}
                          </strong>{' '}
                          · {v.branch} · {v.treatment} · {STATUS_LABEL[v.status]}
                        </p>
                      ))}
                      {me.role === 'owner' && (
                        <p style={{ paddingTop: 12 }}>
                          <button type="button" onClick={() => remove(p)} className="link-btn is-danger">
                            Delete this patient and their data
                          </button>
                        </p>
                      )}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AppointmentDialog({ dialog, setDialog, run }) {
  const a = dialog.appt;
  const set = (k) => (e) => {
    const v = e.target.value;
    setDialog((d) => ({ ...d, [k]: v }));
  };
  const save = async () => {
    const r =
      dialog.type === 'resched'
        ? await run(actions.rescheduleAppointment(a.id, dialog.date, dialog.time), 'Rescheduled ' + a.ref)
        : await run(actions.saveInternalNote(a.id, dialog.note), 'Note saved');
    if (r) setDialog(null);
  };
  return (
    <div onClick={() => setDialog(null)} className="dialog-scrim">
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()} className="dialog">
        <h2 id="dlg-title">{dialog.type === 'resched' ? 'Reschedule appointment' : 'Internal note'}</h2>
        <p className="muted">
          {a.name} · {a.ref} · {a.branch}
        </p>
        {dialog.type === 'resched' ? (
          <>
            <div className="row">
              <label className="lbl">
                Date
                <input type="date" value={dialog.date} onChange={set('date')} className="inp" style={{ padding: '0 8px' }} />
              </label>
              <label className="lbl">
                Time
                <input type="time" step="900" value={dialog.time} onChange={set('time')} className="inp" style={{ padding: '0 8px' }} />
              </label>
            </div>
            <p className="small muted">The new time is checked against opening hours, holidays and other bookings.</p>
          </>
        ) : (
          <textarea aria-label="Internal note" rows={4} value={dialog.note} onChange={set('note')} placeholder="Visible to staff only" className="textarea" />
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setDialog(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={save} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
