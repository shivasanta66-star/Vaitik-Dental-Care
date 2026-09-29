import { useEffect, useState } from 'react';
import { BOOKING, BRANCHES, TREATMENTS } from '../shared/content.js';
import { api } from '../shared/api.js';
import { fmt, ymd } from '../shared/time.js';
import { branchView, waHref } from './branch.js';

const EMPTY = { name: '', mobile: '', branch: '', treatment: '', date: '', slot: '', note: '', consent: false, hp: '' };
const TREATMENT_OPTIONS = [...TREATMENTS.map((t) => t.name), 'Tooth pain / emergency', 'Not sure – need a check-up'];
const FIELD_IDS = { name: 'bk-name', mobile: 'bk-mobile', treatment: 'bk-treat', date: 'bk-date' };
const SIMULATE_ERROR = new URLSearchParams(window.location.search).has('simulateError');

// Demo stand-in until api.getSlots is connected: marks roughly one in four slots as booked.
const hash = (s) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

export function cleanMobile(v) {
  let d = v.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!/^[6-9]\d{9}$/.test(cleanMobile(f.mobile))) e.mobile = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (!f.branch) e.branch = 'Choose Koraput or Semiliguda.';
  if (!f.treatment) e.treatment = 'Choose a treatment, or "Not sure – need a check-up".';
  if (!f.date) e.date = 'Choose a date.';
  if (!f.slot) e.slot = f.date && f.branch ? 'Choose a time.' : 'Choose a branch and date first, then a time.';
  if (!f.consent) e.consent = 'Please tick this so we can contact you about the appointment.';
  return e;
}

// Booking form state. Lives in the page so "Book this" on a treatment card can prefill it.
export function useBooking() {
  const [f, setFState] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [phase, setPhase] = useState('form');
  const [ref, setRef] = useState('');
  const [attempts, setAttempts] = useState(0);

  const setF = (k, v) => {
    setFState((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'branch' || k === 'date') next.slot = '';
      return next;
    });
    setErr((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const send = () => {
    const a = attempts;
    setAttempts(a + 1);
    setPhase('loading');
    const { hp: _hp, ...rest } = f;
    const payload = { ...rest, mobile: cleanMobile(f.mobile) };
    api
      .createBooking(payload, { fail: SIMULATE_ERROR && a === 0 })
      .then((r) => {
        setRef(r);
        setPhase('success');
      })
      .catch(() => setPhase('error'));
  };

  const submit = (e) => {
    e?.preventDefault?.();
    // Bots fill the hidden field: pretend it worked and send nothing.
    if (f.hp) {
      setRef('VDC-000000');
      setPhase('success');
      return;
    }
    const errors = validate(f);
    const keys = Object.keys(errors);
    if (keys.length) {
      setErr(errors);
      setTimeout(() => {
        const el = document.getElementById(FIELD_IDS[keys[0]]) || document.querySelector('#book [role=alert]');
        if (el) {
          window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120 });
          el.focus?.({ preventScroll: true });
        }
      }, 30);
      return;
    }
    if (BOOKING.fee && phase === 'form') {
      setPhase('pay');
      return;
    }
    send();
  };

  const reset = () => {
    setFState(EMPTY);
    setErr({});
    setPhase('form');
    setRef('');
    setAttempts(0);
  };

  return { f, err, phase, ref, setF, setPhase, submit, send, reset };
}

function useBookedSlots(branch, date) {
  const [booked, setBooked] = useState(null);
  useEffect(() => {
    let live = true;
    setBooked(null);
    if (branch && date) api.getSlots(branch, date).then((r) => live && setBooked(r));
    return () => {
      live = false;
    };
  }, [branch, date]);
  return booked;
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="field-error">
      {children}
    </p>
  );
}

export default function BookingSection({ booking, now }) {
  const { f, err, phase, ref, setF, setPhase, submit, send, reset } = booking;
  const booked = useBookedSlots(f.branch, f.date);

  // Time slots for the chosen branch and date, 30 minutes apart.
  const slots = [];
  if (f.branch && f.date) {
    const b = BRANCHES[f.branch];
    const [o, c] = b.hours(new Date(f.date + 'T00:00').getDay());
    const today = ymd(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (let m = o; m + 30 <= c; m += 30) {
      const past = f.date === today && m < nowMin + 30;
      const taken = booked ? booked.includes(m) : hash(f.branch + f.date + m) % 4 === 0;
      slots.push({ m, label: fmt(m), unavailable: past || taken, past });
    }
  }
  const free = slots.filter((x) => !x.unavailable).length;
  const slotHint = !f.branch || !f.date
    ? 'Choose a branch and date to see open times.'
    : free === 0
      ? 'No free times on this day. Please pick another date.'
      : 'Crossed-out times are booked or have passed.';

  const maxD = new Date(now);
  maxD.setDate(maxD.getDate() + 60);

  const side = branchView(BRANCHES[f.branch || 'koraput'], now);
  const sb = BRANCHES[f.branch] || BRANCHES.koraput;
  const dt = f.date ? new Date(f.date + 'T00:00') : null;
  const slotL = slots.find((x) => x.m === f.slot);
  const when = dt ? dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + (slotL ? ', ' + slotL.label : '') : '';
  const successWa = waHref(sb, 'Hello Vaitik Dental Care (' + sb.name + '). Booking request' + (ref ? ' ' + ref : '') + ': ' + f.name + ', ' + f.treatment + ', ' + when + '.');
  const firstName = f.name.trim().split(' ')[0] || 'thank you';

  const on = (k) => (e) => setF(k, e.target.value);
  const inputCls = (k) => 'input' + (err[k] ? ' is-invalid' : '');

  return (
    <section id="book" aria-labelledby="book-title" className="book-section tint">
      <div className="wrap stack gap-24">
        <div className="stack gap-8">
          <h2 id="book-title" className="h2 book-title">
            Book an appointment <span className="odia">ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ୍ କରନ୍ତୁ</span>
          </h2>
          <p className="muted">Takes under a minute. We call or WhatsApp you to confirm.</p>
        </div>
        <div className="book-layout">
          <div className="book-panel">
            {phase === 'form' && (
              <form noValidate onSubmit={submit} aria-describedby="book-title" className="book-form">
                <div aria-hidden="true" className="honeypot">
                  <label>
                    Leave this empty
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.hp} onChange={on('hp')} />
                  </label>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="bk-name">Full name</label>
                    <input id="bk-name" type="text" autoComplete="name" value={f.name} onChange={on('name')} aria-invalid={!!err.name} aria-describedby="bk-name-err" className={inputCls('name')} />
                    <FieldError id="bk-name-err">{err.name}</FieldError>
                  </div>
                  <div className="field">
                    <label htmlFor="bk-mobile">Mobile number</label>
                    <div className={'phone-group' + (err.mobile ? ' is-invalid' : '')}>
                      <span className="phone-prefix">+91</span>
                      <input id="bk-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="10-digit number" value={f.mobile} onChange={on('mobile')} aria-invalid={!!err.mobile} aria-describedby="bk-mobile-err" />
                    </div>
                    <FieldError id="bk-mobile-err">{err.mobile}</FieldError>
                  </div>
                </div>

                <fieldset className="fieldset">
                  <legend>Branch</legend>
                  <div role="radiogroup" className="branch-options">
                    {Object.values(BRANCHES).map((b) => {
                      const sel = f.branch === b.id;
                      return (
                        <button key={b.id} type="button" role="radio" aria-checked={sel} onClick={() => setF('branch', b.id)} className={'branch-option' + (sel ? ' is-selected' : err.branch ? ' is-error' : '')}>
                          <span aria-hidden="true" className="radio-ring">
                            <span className="radio-dot" />
                          </span>
                          <span className="stack" style={{ gap: 2 }}>
                            <span className="option-name">
                              {b.name} <span className="odia">{b.odia}</span>
                            </span>
                            <span className="small muted">{b.short}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError>{err.branch}</FieldError>
                </fieldset>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="bk-treat">Treatment or concern</label>
                    <select id="bk-treat" value={f.treatment} onChange={on('treatment')} aria-invalid={!!err.treatment} className={inputCls('treatment')}>
                      <option value="">Choose one</option>
                      {TREATMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <FieldError>{err.treatment}</FieldError>
                  </div>
                  <div className="field">
                    <label htmlFor="bk-date">Preferred date</label>
                    <input id="bk-date" type="date" min={ymd(now)} max={ymd(maxD)} value={f.date} onChange={on('date')} aria-invalid={!!err.date} className={inputCls('date')} />
                    <FieldError>{err.date}</FieldError>
                  </div>
                </div>

                <fieldset className="fieldset">
                  <legend>Time</legend>
                  <p className="small muted">{slotHint}</p>
                  <div className="slot-grid">
                    {slots.map((x) => {
                      const sel = f.slot === x.m;
                      return (
                        <button key={x.m} type="button" disabled={x.unavailable} aria-pressed={sel} aria-label={x.label + (x.unavailable ? (x.past ? ', time passed' : ', already booked') : '')} onClick={() => setF('slot', x.m)} className={'slot' + (sel ? ' is-selected' : '')}>
                          {x.label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError>{err.slot}</FieldError>
                </fieldset>

                <div className="field">
                  <label htmlFor="bk-note">
                    Anything we should know? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea id="bk-note" rows={3} maxLength={200} value={f.note} onChange={on('note')} placeholder="For example: pain in lower left tooth since 3 days" className="textarea" />
                  <p className="counter">{f.note.length}/200</p>
                </div>

                <div className="field">
                  <label className="consent">
                    <input type="checkbox" checked={f.consent} onChange={(e) => setF('consent', e.target.checked)} />
                    <span>
                      I agree to be contacted about my appointment. <a href="#privacy">Privacy policy</a>
                    </span>
                  </label>
                  <FieldError>{err.consent}</FieldError>
                </div>

                <button type="submit" className="btn btn-dark submit">
                  {BOOKING.fee ? 'Continue to booking fee' : 'Book appointment'}
                  <span className="odia">ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ୍ କରନ୍ତୁ</span>
                </button>
                <p className="small muted center">No payment needed to book. Final cost is explained after the check-up.</p>
              </form>
            )}

            {phase === 'pay' && (
              <div className="stack gap-16">
                <p className="small muted">Step 2 of 2</p>
                <h3 className="h3">Booking fee: Rs {BOOKING.feeAmount}</h3>
                <p>This small fee holds your slot and is adjusted in your treatment bill. {BOOKING.refundPolicy}</p>
                <div className="pay-grid">
                  <button type="button" onClick={send} className="btn btn-dark">
                    Pay with UPI
                  </button>
                  <button type="button" onClick={send} className="btn btn-outline" style={{ minHeight: 52 }}>
                    Card / net banking
                  </button>
                </div>
                <button type="button" onClick={() => setPhase('form')} className="btn-link">
                  Back to details
                </button>
              </div>
            )}

            {phase === 'loading' && (
              <div role="status" aria-live="polite" className="loading">
                <span aria-hidden="true" className="spinner" />
                <p style={{ fontWeight: 600 }}>Sending your booking…</p>
                <p className="small muted">Please keep this page open.</p>
              </div>
            )}

            {phase === 'success' && (
              <div role="status" aria-live="polite" className="stack gap-16">
                <span aria-hidden="true" className="result-icon">
                  <i className="ph-duotone ph-check-circle" />
                </span>
                <h3 className="h3" style={{ fontSize: 24 }}>
                  Request received, {firstName}.
                </h3>
                <p>
                  We will call or WhatsApp you on <strong>{'+91 ' + cleanMobile(f.mobile)}</strong> to confirm. If the time does not work, we will suggest the nearest free slot.
                </p>
                <dl className="summary">
                  <dt>Reference</dt>
                  <dd className="ref">{ref}</dd>
                  <dt>Branch</dt>
                  <dd>{sb.name}</dd>
                  <dt>For</dt>
                  <dd>{f.treatment}</dd>
                  <dt>When</dt>
                  <dd>{when}</dd>
                </dl>
                <div className="result-actions">
                  <a href={successWa} target="_blank" rel="noopener" className="btn btn-wa">
                    <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" style={{ fontSize: 22 }} />
                    Send on WhatsApp too
                  </a>
                  <button type="button" onClick={reset} className="btn btn-outline">
                    Book another
                  </button>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div role="alert" className="stack gap-16">
                <span aria-hidden="true" className="result-icon is-error">
                  <i className="ph-duotone ph-warning" />
                </span>
                <h3 style={{ fontSize: 22, color: 'var(--danger)' }}>Your booking did not go through</h3>
                <p>This is usually a weak network. Your details are saved on this page. Try again, or send them to us on WhatsApp.</p>
                <div className="result-actions">
                  <button type="button" onClick={send} className="btn btn-dark" style={{ padding: '0 28px' }}>
                    Try again
                  </button>
                  <a href={successWa} target="_blank" rel="noopener" className="btn btn-wa">
                    <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
                    Send on WhatsApp
                  </a>
                  <button type="button" onClick={() => setPhase('form')} className="btn-link" style={{ minHeight: 52, padding: '0 16px', alignSelf: 'auto' }}>
                    Edit details
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside aria-label="Selected branch" className="book-side">
            <h3 className="h3">
              {side.name} branch <span className="odia">{side.odia}</span>
            </h3>
            <p>{side.addr}</p>
            <p className={'status-badge' + (side.isOpen ? ' is-open' : '')}>{side.statusLabel}</p>
            <HoursTable caption="Hours" week={side.week} />
            <div className="side-actions">
              <a href={side.telHref} className="btn btn-outline">
                <i className="ph-duotone ph-phone" aria-hidden="true" />
                {side.phone}
              </a>
              <a href={side.waHref} target="_blank" rel="noopener" className="btn btn-wa">
                <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function HoursTable({ caption, week }) {
  return (
    <table className="hours-table">
      <caption>
        {caption} · <span className="odia">ସମୟ</span>
      </caption>
      <tbody>
        {week.map((d) => (
          <tr key={d.day} className={d.today ? 'is-today' : undefined}>
            <th scope="row">{d.day}</th>
            <td>{d.hours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
