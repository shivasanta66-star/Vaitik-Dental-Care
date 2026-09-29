import { useEffect, useRef, useState } from 'react';
import { BOOKING, BRANCHES, GALLERY, REVIEWS, SITE, TREATMENTS } from '../shared/content.js';
import { api } from '../shared/api.js';
import ImageSlot from '../shared/ImageSlot.jsx';
import { DAYS, addDays, dLabel, t12, ymd } from '../shared/time.js';

const STATUSES = ['New', 'Confirmed', 'Completed', 'No-show', 'Cancelled'];
const CHIP = {
  New: { background: '#E6F1FB', color: '#0C447C', border: '1px solid #378ADD' },
  Confirmed: { background: '#0C447C', color: '#FFFFFF', border: '1px solid #0C447C' },
  Completed: { background: '#042C53', color: '#FFFFFF', border: '1px solid #042C53' },
  'No-show': { background: '#FFFFFF', color: '#C4451C', border: '1px solid #C4451C' },
  Cancelled: { background: '#FFFFFF', color: '#5A6B7D', border: '1px solid #B5D4F4', textDecoration: 'line-through' },
};
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
const BRANCH_NAMES = Object.values(BRANCHES).map((b) => b.name);
const TREATS = TREATMENTS.map((t) => t.name);

// Demo appointments until GET /api/bookings is connected.
const NAMES = ['Sanjay Patnaik', 'Priya Nayak', 'Ramesh Majhi', 'Anita Sahu', 'Bikash Pujari', 'Sunita Behera', 'Manoj Gouda', 'Laxmi Harijan', 'Deepak Mishra', 'Rita Khara', 'Suresh Muduli', 'Pooja Das'];
function mockAppts() {
  const out = [];
  let n = 0;
  for (let d = -3; d <= 7; d++) {
    const k = 3 + ((((d * 7 + 11) % 4) + 4) % 4);
    for (let i = 0; i < k; i++) {
      n++;
      const branch = n % 3 === 0 ? 'Semiliguda' : 'Koraput';
      const h = branch === 'Koraput' ? 9 + ((n * 5) % 12) : 10 + ((n * 3) % 10);
      const status = d < 0 ? ['Completed', 'Completed', 'No-show', 'Cancelled'][n % 4] : d === 0 ? ['Confirmed', 'New', 'Completed', 'Confirmed'][n % 4] : n % 3 === 0 ? 'New' : 'Confirmed';
      const ni = (n * 7) % NAMES.length;
      out.push({
        id: n,
        ref: 'VDC-' + String(410200 + n * 37),
        name: NAMES[ni],
        mobile: '9' + String(437000000 + ni * 1111).slice(0, 9),
        branch,
        treatment: TREATS[(n * 3) % TREATS.length],
        date: addDays(d),
        time: String(h).padStart(2, '0') + ':' + (n % 2 ? '30' : '00'),
        status,
        note: '',
      });
    }
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const initialHours = () =>
  Object.fromEntries(
    Object.values(BRANCHES).map((b) => [
      b.name,
      [0, 1, 2, 3, 4, 5, 6].map((d) => {
        const [o, c] = b.hours(d);
        return { open: hhmm(o), close: hhmm(c), closed: false };
      }),
    ]),
  );

const isEmail = (s) => /\S+@\S+\.\S+/.test(s);
const chipStyle = (status) => CHIP[status];

function waLink(a) {
  const msg = 'Namaskar ' + a.name.split(' ')[0] + ', this is Vaitik Dental Care, ' + a.branch + '. Your appointment (' + a.ref + ') is on ' + dLabel(a.date) + ' at ' + t12(a.time) + '. Reply YES to confirm or call us to change.';
  return 'https://wa.me/91' + a.mobile + '?text=' + encodeURIComponent(msg);
}

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return w;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email) || !password) return setErr('Enter your staff email and password.');
    setErr('');
    if (await api.login(email, password)) onLogin(email);
  };
  return (
    <main className="login">
      <form onSubmit={submit} noValidate>
        <p className="brand">
          <span className="brand-word">VAITIK</span>
          <span className="brand-sub">dental care</span>
        </p>
        <h1>Staff sign in</h1>
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
        <button type="submit" className="btn btn-primary">
          Sign in
        </button>
        <p className="small muted">Prototype: any email and password works. POST /api/auth/login</p>
      </form>
    </main>
  );
}

export default function Admin() {
  const w = useWidth();
  const [email, setEmail] = useState(() => (new URLSearchParams(window.location.search).has('demo') ? 'owner@vaitikdental.in' : ''));
  const [authed, setAuthed] = useState(() => !!email);
  const [section, setSection] = useState('dashboard');
  const [toast, setToast] = useState('');
  const toastTimer = useRef();

  const [appts, setAppts] = useState(mockAppts);
  const [flt, setFlt] = useState({ q: '', branch: '', status: '', from: '', to: '' });
  const [view, setView] = useState('table');
  const [dialog, setDialog] = useState(null);
  const [pq, setPq] = useState('');
  const [openP, setOpenP] = useState(null);
  const [treatments, setTreatments] = useState(() => TREATMENTS.map((t) => ({ name: t.name, price: t.price, visible: true })));
  const [schedBranch, setSchedBranch] = useState('Koraput');
  const [hours, setHours] = useState(initialHours);
  const [slotLen, setSlotLen] = useState('30');
  const [blocked, setBlocked] = useState(() => [{ date: addDays(24), reason: '[HOLIDAY NAME]' }]);
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' });
  const [reviews, setReviews] = useState(() => REVIEWS.map((r) => ({ ...r, visible: true })));
  const [gallery, setGallery] = useState(() => GALLERY.map((g) => ({ id: g.id, src: g.src, caption: g.caption, consent: false, visible: false })));
  const [settings, setSettings] = useState({
    phoneK: BRANCHES.koraput.phone,
    phoneS: BRANCHES.semiliguda.phone,
    emergency: SITE.emergencyNumber,
    feeOn: BOOKING.fee,
    feeAmount: BOOKING.feeAmount,
  });
  const [staff, setStaff] = useState([
    { name: 'Dr Ch Kartik', email: '[OWNER EMAIL]', role: 'owner' },
    { name: 'Dr Vaishali [SURNAME]', email: '[EMAIL]', role: 'owner' },
    { name: '[RECEPTIONIST NAME]', email: '[EMAIL]', role: 'receptionist' },
  ]);
  const [newUser, setNewUser] = useState('');

  useEffect(() => {
    const onK = (e) => e.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', onK);
    return () => {
      window.removeEventListener('keydown', onK);
      clearTimeout(toastTimer.current);
    };
  }, []);

  const flash = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };
  const updAppt = (id, patch, msg) => {
    api.updateAppointment(id, patch);
    setAppts((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    if (msg) flash(msg);
  };
  const updList = (set, i, patch) => set((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const delList = (set, i) => set((list) => list.filter((_, j) => j !== i));
  const save = (what, data) => {
    api.save(what, data);
    flash('Saved');
  };

  if (!authed) {
    return (
      <Login
        onLogin={(e) => {
          setEmail(e);
          setAuthed(true);
        }}
      />
    );
  }

  const wide = w >= 900;
  const today = ymd(new Date());
  const todayA = appts.filter((a) => a.date === today);
  const logout = () => setAuthed(false);

  const actions = (a) => ({
    confirm: () => updAppt(a.id, { status: 'Confirmed' }, 'Confirmed ' + a.ref),
    complete: () => updAppt(a.id, { status: 'Completed' }, 'Marked completed'),
    noshow: () => updAppt(a.id, { status: 'No-show' }, 'Marked no-show'),
    cancel: () => updAppt(a.id, { status: 'Cancelled' }, 'Cancelled ' + a.ref),
    resched: () => setDialog({ type: 'resched', id: a.id, date: a.date, time: a.time }),
    note: () => setDialog({ type: 'note', id: a.id, note: a.note }),
  });

  const q = flt.q.toLowerCase();
  const filtered = appts.filter(
    (a) =>
      (!flt.branch || a.branch === flt.branch) &&
      (!flt.status || a.status === flt.status) &&
      (!flt.from || a.date >= flt.from) &&
      (!flt.to || a.date <= flt.to) &&
      (!q || a.name.toLowerCase().includes(q) || a.mobile.includes(q) || a.ref.toLowerCase().includes(q)),
  );
  const setFlt1 = (k) => (e) => {
    const v = e.target.value;
    setFlt((f) => ({ ...f, [k]: v }));
  };

  const patientList = () => {
    const m = {};
    appts.forEach((a) => {
      (m[a.mobile] = m[a.mobile] || { name: a.name, mobile: a.mobile, visits: [] }).visits.push(a);
    });
    const pqq = pq.toLowerCase();
    return Object.values(m)
      .filter((p) => !pqq || p.name.toLowerCase().includes(pqq) || p.mobile.includes(pqq))
      .map((p) => {
        const done = p.visits.filter((x) => x.status === 'Completed');
        const last = done.length ? done[done.length - 1].date : '';
        return { ...p, count: done.length, lastRaw: last, last: last ? dLabel(last) : '—' };
      });
  };
  const exportCsv = () => {
    const rows = [['Name', 'Mobile', 'Visits', 'Last visit']].concat(patientList().map((p) => [p.name, p.mobile, p.count, p.lastRaw]));
    const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vaitik-patients.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('CSV downloaded');
  };

  const moveTreatment = (i, d) =>
    setTreatments((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const a = [...list];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  const setHour = (day, patch) =>
    setHours((H) => ({ ...H, [schedBranch]: H[schedBranch].map((h, i) => (i === day ? { ...h, ...patch } : h)) }));

  const dA = dialog && appts.find((a) => a.id === dialog.id);
  const sectionTitle = NAV.find((n) => n[0] === section)[1];

  const chartRaw = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDays(i);
    const l = appts.filter((a) => a.date === d && a.status !== 'Cancelled');
    return { d, k: l.filter((a) => a.branch === 'Koraput').length, s: l.filter((a) => a.branch === 'Semiliguda').length };
  });
  const max = Math.max(1, ...chartRaw.map((c) => c.k + c.s));

  return (
    <>
      <div className={'shell' + (wide ? '' : ' is-narrow')}>
        {wide ? (
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
              <p>{email} · Owner</p>
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </div>
          </aside>
        ) : (
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
            <button type="button" aria-label="Sign out" onClick={logout}>
              <i className="ph-duotone ph-sign-out" />
            </button>
          </header>
        )}

        <main className="content">
          <div className="content-head">
            <h1>{sectionTitle}</h1>
            <p className="small muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {section === 'dashboard' && (
            <>
              <div className="counts">
                {['New', 'Confirmed', 'Completed', 'No-show'].map((l) => (
                  <div key={l} className="count">
                    <p className="small muted" style={{ fontWeight: 500 }}>
                      {l} today
                    </p>
                    <p className="count-n">{todayA.filter((a) => a.status === l).length}</p>
                  </div>
                ))}
              </div>
              <div className="two-col">
                {BRANCH_NAMES.map((b) => {
                  const list = todayA.filter((a) => a.branch === b);
                  return (
                    <section key={b} className="panel">
                      <h2>
                        {b} · today ({list.length})
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
                          <span className="chip" style={chipStyle(a.status)}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </section>
                  );
                })}
              </div>
              <section className="panel" style={{ gap: 16 }}>
                <h2>Next 7 days</h2>
                <div role="img" aria-label={'Appointments next 7 days: ' + chartRaw.map((c) => dLabel(c.d) + ' ' + (c.k + c.s)).join(', ')} className="chart">
                  {chartRaw.map((c, i) => (
                    <div key={c.d} className="bar-col">
                      <span className="small" style={{ fontWeight: 600 }}>
                        {c.k + c.s}
                      </span>
                      <div className="bar" style={{ height: Math.round(((c.k + c.s) / max) * 140) + 'px' }}>
                        <div style={{ background: '#378ADD', flex: c.s }} />
                        <div style={{ background: '#042C53', flex: c.k }} />
                      </div>
                      <span className="small muted">{i === 0 ? 'Today' : new Date(c.d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</span>
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
          )}

          {section === 'appointments' && (
            <>
              <div className="filters">
                <label className="lbl" style={{ flex: '1 1 200px' }}>
                  Search
                  <input type="search" placeholder="Name, mobile or ref" value={flt.q} onChange={setFlt1('q')} className="inp" />
                </label>
                <label className="lbl">
                  Branch
                  <select value={flt.branch} onChange={setFlt1('branch')} className="inp">
                    <option value="">All</option>
                    {BRANCH_NAMES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lbl">
                  Status
                  <select value={flt.status} onChange={setFlt1('status')} className="inp">
                    <option value="">All</option>
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lbl">
                  From
                  <input type="date" value={flt.from} onChange={setFlt1('from')} className="inp" />
                </label>
                <label className="lbl">
                  To
                  <input type="date" value={flt.to} onChange={setFlt1('to')} className="inp" />
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
                        const act = actions(a);
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
                                  <span className="small" style={{ color: 'var(--navy-700)' }}>
                                    <i className="ph-duotone ph-note" aria-hidden="true" /> {a.note}
                                  </span>
                                </>
                              )}
                            </td>
                            <td>{a.branch}</td>
                            <td>{a.treatment}</td>
                            <td>
                              <span className="chip" style={chipStyle(a.status)}>
                                {a.status}
                              </span>
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
                      const d = addDays(i);
                      return (
                        <div key={d} className={'cal-day' + (i === 0 ? ' is-today' : '')}>
                          <p>{(i === 0 ? 'Today · ' : '') + dLabel(d)}</p>
                          {filtered
                            .filter((a) => a.date === d)
                            .map((a) => (
                              <button key={a.id} type="button" onClick={actions(a).resched} className="cal-item" style={chipStyle(a.status)}>
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
          )}

          {section === 'patients' && (
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
                    {patientList().map((p) => {
                      const open = openP === p.mobile;
                      return [
                        <tr key={p.mobile}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.mobile}</td>
                          <td>{p.count}</td>
                          <td>{p.last}</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                            <button type="button" aria-expanded={open} onClick={() => setOpenP(open ? null : p.mobile)} className="btn" style={{ minHeight: 40, padding: '0 14px', border: '1px solid var(--blue-200)', background: 'var(--white)', color: 'var(--navy-700)' }}>
                              {open ? 'Hide history' : 'History'}
                            </button>
                          </td>
                        </tr>,
                        open && (
                          <tr key={p.mobile + '-h'} style={{ borderTop: 'none' }}>
                            <td colSpan={5} style={{ padding: '0 16px 16px', background: 'var(--blue-25)' }}>
                              {p.visits.map((v) => (
                                <p key={v.id} className="small" style={{ padding: '8px 0', borderBottom: '1px solid var(--blue-50)' }}>
                                  <strong>
                                    {dLabel(v.date)} {t12(v.time)}
                                  </strong>{' '}
                                  · {v.branch} · {v.treatment} · {v.status}
                                </p>
                              ))}
                            </td>
                          </tr>
                        ),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {section === 'treatments' && (
            <>
              <p className="muted">Order here is the order on the website. Use "From Rs …" or "Price after check-up". PUT /api/treatments</p>
              <div className="stack" style={{ gap: 8 }}>
                {treatments.map((t, i) => (
                  <div key={i} className={'edit-row' + (t.visible ? '' : ' is-hidden-item')}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" aria-label={'Move ' + t.name + ' up'} onClick={() => moveTreatment(i, -1)} className="sq-btn">
                        <i className="ph-duotone ph-arrow-up" />
                      </button>
                      <button type="button" aria-label={'Move ' + t.name + ' down'} onClick={() => moveTreatment(i, 1)} className="sq-btn">
                        <i className="ph-duotone ph-arrow-down" />
                      </button>
                    </div>
                    <input aria-label="Treatment name" value={t.name} onChange={(e) => updList(setTreatments, i, { name: e.target.value })} className="inp inp-sm" style={{ flex: '2 1 220px', fontWeight: 600 }} />
                    <input aria-label="Price text" value={t.price} onChange={(e) => updList(setTreatments, i, { price: e.target.value })} className="inp inp-sm" style={{ flex: '1 1 180px' }} />
                    <label className="chk" style={{ fontWeight: 500 }}>
                      <input type="checkbox" checked={t.visible} onChange={() => updList(setTreatments, i, { visible: !t.visible })} style={{ width: 20, height: 20 }} />
                      Show on site
                    </label>
                    <button type="button" aria-label={'Delete ' + t.name} onClick={() => delList(setTreatments, i)} className="sq-btn is-danger">
                      <i className="ph-duotone ph-trash" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="row">
                <button type="button" onClick={() => setTreatments((l) => [...l, { name: 'New treatment', price: 'From Rs [PRICE]', visible: false }])} className="btn btn-secondary">
                  + Add treatment
                </button>
                <button type="button" onClick={() => save('treatments', treatments)} className="btn btn-primary">
                  Save changes
                </button>
              </div>
            </>
          )}

          {section === 'doctors' && (
            <>
              <div role="group" aria-label="Branch" className="toggle" style={{ border: 'none', gap: 8, borderRadius: 0 }}>
                {BRANCH_NAMES.map((b) => (
                  <button key={b} type="button" aria-pressed={schedBranch === b} onClick={() => setSchedBranch(b)} style={{ padding: '0 20px', borderRadius: 999, border: '2px solid var(--navy-700)' }}>
                    {b}
                  </button>
                ))}
              </div>
              <div className="two-col" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
                <section className="panel">
                  <h2>Weekly hours</h2>
                  {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                    const h = hours[schedBranch][i];
                    return (
                      <div key={i} className="sched-row">
                        <span style={{ width: 96, fontWeight: 600 }}>{DAYS[i]}</span>
                        <input type="time" aria-label={DAYS[i] + ' opens'} value={h.open} onChange={(e) => setHour(i, { open: e.target.value })} disabled={h.closed} />
                        <span aria-hidden="true">–</span>
                        <input type="time" aria-label={DAYS[i] + ' closes'} value={h.close} onChange={(e) => setHour(i, { close: e.target.value })} disabled={h.closed} />
                        <label className="chk" style={{ gap: 6 }}>
                          <input type="checkbox" checked={h.closed} onChange={() => setHour(i, { closed: !h.closed })} />
                          Closed
                        </label>
                      </div>
                    );
                  })}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, marginTop: 8 }}>
                    Slot length
                    <select value={slotLen} onChange={(e) => setSlotLen(e.target.value)} className="inp inp-sm" style={{ padding: '0 8px' }}>
                      {['15', '30', '45', '60'].map((v) => (
                        <option key={v} value={v}>
                          {v} min
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
                <section className="panel">
                  <h2>Holidays and blocked dates</h2>
                  {!blocked.length && <p className="muted">No blocked dates.</p>}
                  {blocked.map((b, i) => (
                    <div key={b.date + i} className="blocked-row">
                      <span style={{ fontWeight: 600, width: 120 }}>{dLabel(b.date)}</span>
                      <span style={{ flex: 1 }}>{b.reason}</span>
                      <button type="button" aria-label="Remove blocked date" onClick={() => delList(setBlocked, i)} className="sq-btn is-danger">
                        <i className="ph-duotone ph-trash" />
                      </button>
                    </div>
                  ))}
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <input type="date" aria-label="Date to block" value={newBlock.date} onChange={(e) => setNewBlock((n) => ({ ...n, date: e.target.value }))} className="inp" style={{ padding: '0 8px' }} />
                    <input aria-label="Reason" placeholder="Reason, e.g. Diwali" value={newBlock.reason} onChange={(e) => setNewBlock((n) => ({ ...n, reason: e.target.value }))} className="inp" style={{ flex: '1 1 140px' }} />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newBlock.date) return flash('Pick a date first');
                        setBlocked((l) => [...l, { ...newBlock, reason: newBlock.reason || 'Closed' }].sort((a, b) => a.date.localeCompare(b.date)));
                        setNewBlock({ date: '', reason: '' });
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0 16px' }}
                    >
                      Block date
                    </button>
                  </div>
                </section>
              </div>
              <button type="button" onClick={() => save('schedule', { hours, slotLen, blocked })} className="btn btn-primary btn-save">
                Save schedule
              </button>
            </>
          )}

          {section === 'reviews' && (
            <>
              <p className="muted">Paraphrase Google reviews in a sentence or two. First initial only. PUT /api/reviews</p>
              <div className="two-col" style={{ gap: 16 }}>
                {reviews.map((r, i) => (
                  <div key={i} className={'panel' + (r.visible ? '' : ' is-hidden-item')} style={{ padding: 16, gap: 8 }}>
                    <textarea aria-label="Review text" rows={3} value={r.text} onChange={(e) => updList(setReviews, i, { text: e.target.value })} style={{ borderRadius: 8, border: '1px solid var(--muted)', padding: '10px 12px', resize: 'vertical' }} />
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <input aria-label="Initial" value={r.initial} onChange={(e) => updList(setReviews, i, { initial: e.target.value })} className="inp inp-sm" style={{ width: 80, padding: '0 10px' }} />
                      <select aria-label="Branch" value={r.branch} onChange={(e) => updList(setReviews, i, { branch: e.target.value })} className="inp inp-sm" style={{ padding: '0 8px' }}>
                        {BRANCH_NAMES.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                      <label className="chk" style={{ gap: 6, marginLeft: 'auto' }}>
                        <input type="checkbox" checked={r.visible} onChange={() => updList(setReviews, i, { visible: !r.visible })} />
                        Show
                      </label>
                      <button type="button" aria-label="Delete review" onClick={() => delList(setReviews, i)} className="sq-btn is-danger">
                        <i className="ph-duotone ph-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row">
                <button type="button" onClick={() => setReviews((l) => [...l, { text: '', initial: '', branch: 'Koraput', visible: false }])} className="btn btn-secondary">
                  + Add review
                </button>
                <button type="button" onClick={() => save('reviews', reviews)} className="btn btn-primary">
                  Save changes
                </button>
              </div>
            </>
          )}

          {section === 'gallery' && (
            <>
              <p className="muted">Choose a WebP photo for a tile. An image goes live only when the consent box is ticked. Max 6 on the website. POST /api/gallery</p>
              <div className="gal-grid">
                {gallery.map((g, i) => (
                  <div key={g.id} className="gal-tile">
                    <div className="media">
                      <ImageSlot src={g.src} alt={g.caption} placeholder={g.caption} />
                      <input
                        type="file"
                        accept="image/*"
                        aria-label={'Upload photo for ' + g.caption}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) updList(setGallery, i, { src: URL.createObjectURL(file), file });
                        }}
                      />
                    </div>
                    <div className="body">
                      <input aria-label="Caption" value={g.caption} onChange={(e) => updList(setGallery, i, { caption: e.target.value })} className="inp inp-sm" style={{ padding: '0 10px' }} />
                      <label className="chk">
                        <input type="checkbox" checked={g.consent} onChange={() => updList(setGallery, i, g.consent ? { consent: false, visible: false } : { consent: true })} />
                        Written patient consent on file
                      </label>
                      <label className="chk">
                        <input type="checkbox" checked={g.visible} disabled={!g.consent} onChange={() => g.consent && updList(setGallery, i, { visible: !g.visible })} />
                        Show on website
                      </label>
                      {!g.consent && <p className="small" style={{ color: 'var(--danger)' }}>Hidden until consent is ticked.</p>}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => save('gallery', gallery)} className="btn btn-primary btn-save">
                Save gallery
              </button>
            </>
          )}

          {section === 'settings' && (
            <>
              <div className="two-col" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
                <section className="panel">
                  <h2>Branches and contact</h2>
                  {[
                    ['phoneK', 'Koraput phone / WhatsApp'],
                    ['phoneS', 'Semiliguda phone / WhatsApp'],
                    ['emergency', 'Emergency number'],
                  ].map(([k, label]) => (
                    <label key={k} className="lbl">
                      {label}
                      <input value={settings[k]} onChange={(e) => setSettings((s) => ({ ...s, [k]: e.target.value }))} className="inp" style={{ fontSize: 15 }} />
                    </label>
                  ))}
                  <p className="small muted">Hours are set per branch in Doctors and schedule.</p>
                </section>
                <section className="panel">
                  <h2>Online booking fee</h2>
                  <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="checkbox" checked={settings.feeOn} onChange={() => setSettings((s) => ({ ...s, feeOn: !s.feeOn }))} style={{ width: 22, height: 22, accentColor: 'var(--navy-700)' }} />
                    Ask patients to pay a fee when booking online
                  </label>
                  <label className="lbl">
                    Amount (Rs)
                    <input inputMode="numeric" value={settings.feeAmount} onChange={(e) => setSettings((s) => ({ ...s, feeAmount: e.target.value }))} disabled={!settings.feeOn} className="inp" style={{ fontSize: 15, maxWidth: 200 }} />
                  </label>
                  <p className="small muted">When off, the booking form skips the payment step.</p>
                </section>
                <section className="panel" style={{ gridColumn: '1 / -1' }}>
                  <h2>Staff users</h2>
                  {staff.map((u, i) => (
                    <div key={i} className="row" style={{ alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--blue-50)' }}>
                      <span style={{ flex: '1 1 200px', fontWeight: 600 }}>
                        {u.name}
                        <br />
                        <span className="small muted" style={{ fontWeight: 400 }}>
                          {u.email}
                        </span>
                      </span>
                      <select aria-label="Role" value={u.role} onChange={(e) => updList(setStaff, i, { role: e.target.value })} className="inp inp-sm" style={{ padding: '0 8px' }}>
                        <option value="owner">Owner</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                      <button type="button" aria-label="Remove user" onClick={() => delList(setStaff, i)} className="sq-btn is-danger">
                        <i className="ph-duotone ph-trash" />
                      </button>
                    </div>
                  ))}
                  <div className="row" style={{ gap: 8 }}>
                    <input aria-label="New user email" placeholder="Email of new staff member" value={newUser} onChange={(e) => setNewUser(e.target.value)} className="inp" style={{ flex: '1 1 240px' }} />
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEmail(newUser)) return flash('Enter a valid email');
                        setStaff((l) => [...l, { name: 'Invited', email: newUser, role: 'receptionist' }]);
                        setNewUser('');
                        flash('Invite sent (mock)');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0 16px' }}
                    >
                      Invite as receptionist
                    </button>
                  </div>
                </section>
              </div>
              <button type="button" onClick={() => save('settings', { settings, staff })} className="btn btn-primary btn-save">
                Save settings
              </button>
            </>
          )}
        </main>
      </div>

      {dA && (
        <div onClick={() => setDialog(null)} className="dialog-scrim">
          <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()} className="dialog">
            <h2 id="dlg-title">{dialog.type === 'resched' ? 'Reschedule appointment' : 'Internal note'}</h2>
            <p className="muted">
              {dA.name} · {dA.ref} · {dA.branch}
            </p>
            {dialog.type === 'resched' ? (
              <div className="row">
                <label className="lbl">
                  Date
                  <input type="date" value={dialog.date} onChange={(e) => setDialog((d) => ({ ...d, date: e.target.value }))} className="inp" style={{ padding: '0 8px' }} />
                </label>
                <label className="lbl">
                  Time
                  <input type="time" step="1800" value={dialog.time} onChange={(e) => setDialog((d) => ({ ...d, time: e.target.value }))} className="inp" style={{ padding: '0 8px' }} />
                </label>
              </div>
            ) : (
              <textarea aria-label="Internal note" rows={4} value={dialog.note} onChange={(e) => setDialog((d) => ({ ...d, note: e.target.value }))} placeholder="Visible to staff only" style={{ borderRadius: 8, border: '1px solid var(--muted)', padding: '10px 12px' }} />
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDialog(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (dialog.type === 'resched') updAppt(dA.id, { date: dialog.date, time: dialog.time, status: 'Confirmed' }, 'Rescheduled ' + dA.ref);
                  else updAppt(dA.id, { note: dialog.note }, 'Note saved');
                  setDialog(null);
                }}
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </>
  );
}
