'use client';

import { useEffect, useState } from 'react';
import { branchView, waHref } from '@/lib/branch.js';
import { SITE } from '@/lib/content.js';
import { BOOKING_WINDOW_DAYS } from '@/lib/slots.js';
import { addDaysYmd, dLabel, fmt } from '@/lib/time.js';
import { EXTRA_CONCERNS, MESSAGES, cleanMobile } from '@/lib/bookingRules.js';

const EMPTY = { name: '', mobile: '', branch: '', treatment: '', date: '', slot: '', note: '', consent: false, hp: '' };
const FIELD_IDS = { name: 'bk-name', mobile: 'bk-mobile', treatment: 'bk-treat', date: 'bk-date' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = MESSAGES.name;
  if (!/^[6-9]\d{9}$/.test(cleanMobile(f.mobile))) e.mobile = MESSAGES.mobile;
  if (!f.branch) e.branch = MESSAGES.branch;
  if (!f.treatment) e.treatment = MESSAGES.treatment;
  if (!f.date) e.date = MESSAGES.date;
  if (f.slot === '') e.slot = f.date && f.branch ? MESSAGES.slot : 'Choose a branch and date first, then a time.';
  if (!f.consent) e.consent = MESSAGES.consent;
  return e;
}

function focusFirstError(keys) {
  setTimeout(() => {
    const el = document.getElementById(FIELD_IDS[keys[0]]) || document.querySelector('#book [role=alert]');
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120 });
      el.focus?.({ preventScroll: true });
    }
  }, 30);
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window.'));
    document.body.appendChild(s);
  });
}

// Booking form state. Lives in the page so "Book this" on a treatment card can prefill it.
export function useBooking(settings) {
  const [f, setFState] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [phase, setPhase] = useState('form'); // form | pay | loading | success | error
  const [ref, setRef] = useState('');
  const [message, setMessage] = useState('');
  const [payment, setPayment] = useState(null); // { amount, paid }
  const [slotsVersion, setSlotsVersion] = useState(0);

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

  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  // Creates the booking (once) and returns its reference, or null after showing the problem.
  const createBooking = async () => {
    if (ref) return { ref, paymentRequired: payment != null };
    setPhase('loading');
    try {
      const { res, data } = await post('/api/bookings', {
        name: f.name,
        mobile: f.mobile,
        branch: f.branch,
        treatment: f.treatment,
        date: f.date,
        slot: f.slot,
        note: f.note,
        consent: f.consent,
        website: f.hp,
      });
      if (res.ok) {
        setRef(data.ref);
        if (data.paymentRequired) setPayment({ amount: data.amount, paid: false });
        return data;
      }
      if (data.fields) {
        setErr(data.fields);
        if (res.status === 409) setSlotsVersion((v) => v + 1); // reload times: someone just took this one
        setPhase('form');
        focusFirstError(Object.keys(data.fields));
        return null;
      }
      setMessage(data.error || '');
      setPhase('error');
      return null;
    } catch {
      setMessage('');
      setPhase('error');
      return null;
    }
  };

  const pay = async () => {
    const booking = await createBooking();
    if (!booking) return;
    if (!booking.paymentRequired) {
      setPhase('success');
      return;
    }
    setPhase('loading');
    try {
      const { res, data } = await post('/api/payments/order', { ref: booking.ref });
      if (!res.ok) throw new Error(data.error || 'Could not start the payment.');
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'Vaitik Dental Care',
        description: 'Booking fee ' + booking.ref,
        prefill: data.prefill,
        theme: { color: '#042C53' },
        // The server confirms payment from Razorpay's webhook; this only updates the screen.
        handler: () => {
          setPayment((p) => ({ ...p, paid: true }));
          setPhase('success');
        },
        modal: {
          ondismiss: () => {
            setMessage('Payment was not completed. Your booking is saved; you can pay now or at the clinic.');
            setPhase('pay');
          },
        },
      });
      rzp.open();
    } catch (e) {
      setMessage(e.message);
      setPhase('pay');
    }
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const errors = validate(f);
    const keys = Object.keys(errors);
    if (keys.length) {
      setErr(errors);
      focusFirstError(keys);
      return;
    }
    if (settings.feeEnabled && settings.feeAmount > 0 && phase === 'form') {
      setMessage('');
      setPhase('pay');
      return;
    }
    const booking = await createBooking();
    if (booking) setPhase('success');
  };

  const retry = async () => {
    const booking = await createBooking();
    if (booking) setPhase(booking.paymentRequired ? 'pay' : 'success');
  };

  const reset = () => {
    setFState(EMPTY);
    setErr({});
    setPhase('form');
    setRef('');
    setMessage('');
    setPayment(null);
  };

  return { f, err, phase, ref, message, payment, slotsVersion, setF, setPhase, submit, pay, retry, reset };
}

// Loads the times for the chosen branch and date from /api/slots.
function useSlots(branch, date, version) {
  const [state, setState] = useState({ loading: false, slots: [], message: '' });
  useEffect(() => {
    if (!branch || !date) {
      setState({ loading: false, slots: [], message: '' });
      return;
    }
    const ctl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    fetch('/api/slots?branch=' + encodeURIComponent(branch) + '&date=' + encodeURIComponent(date), { signal: ctl.signal })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) =>
        setState(ok ? { loading: false, slots: d.slots, message: d.message || '' } : { loading: false, slots: [], message: d.error || 'Could not load times. Please try again.', failed: true }),
      )
      .catch((e) => {
        if (e.name !== 'AbortError') setState({ loading: false, slots: [], message: 'Could not load times. Please check your connection.', failed: true });
      });
    return () => ctl.abort();
  }, [branch, date, version]);
  return state;
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="field-error">
      {children}
    </p>
  );
}

export default function BookingSection({ booking, branches, treatments, settings, now }) {
  const { f, err, phase, ref, message, payment, slotsVersion, setF, setPhase, submit, pay, retry, reset } = booking;
  const slotState = useSlots(f.branch, f.date, slotsVersion);
  const slots = slotState.slots;
  const free = slots.filter((x) => x.available).length;
  const slotHint = !f.branch || !f.date
    ? 'Choose a branch and date to see open times.'
    : slotState.loading
      ? 'Loading open times…'
      : slotState.message || (free === 0 ? 'No free times on this day. Please pick another date.' : 'Crossed-out times are booked or have passed.');

  const bySlug = Object.fromEntries(branches.map((b) => [b.slug, b]));
  const sb = bySlug[f.branch] || branches[0];
  const side = branchView(sb, now);
  const when = f.date ? dLabel(f.date) + (f.slot !== '' ? ', ' + fmt(f.slot) : '') : '';
  const successWa = waHref(sb, 'Hello Vaitik Dental Care (' + sb.name + '). Booking request' + (ref ? ' ' + ref : '') + ': ' + f.name + ', ' + f.treatment + ', ' + when + '.');
  const firstName = f.name.trim().split(' ')[0] || 'thank you';
  const treatmentOptions = [...treatments.map((t) => t.name), ...EXTRA_CONCERNS];
  const feeOn = settings.feeEnabled && settings.feeAmount > 0;
  const feeAmount = payment?.amount ?? settings.feeAmount;

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
                    <input id="bk-name" type="text" autoComplete="name" maxLength={80} value={f.name} onChange={on('name')} aria-invalid={!!err.name} aria-describedby="bk-name-err" className={inputCls('name')} />
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
                    {branches.map((b) => {
                      const sel = f.branch === b.slug;
                      return (
                        <button key={b.slug} type="button" role="radio" aria-checked={sel} onClick={() => setF('branch', b.slug)} className={'branch-option' + (sel ? ' is-selected' : err.branch ? ' is-error' : '')}>
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
                      {treatmentOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <FieldError>{err.treatment}</FieldError>
                  </div>
                  <div className="field">
                    <label htmlFor="bk-date">Preferred date</label>
                    <input id="bk-date" type="date" min={now.ymd} max={addDaysYmd(now.ymd, BOOKING_WINDOW_DAYS)} value={f.date} onChange={on('date')} aria-invalid={!!err.date} className={inputCls('date')} />
                    <FieldError>{err.date}</FieldError>
                  </div>
                </div>

                <fieldset className="fieldset">
                  <legend>Time</legend>
                  <p className="small muted" aria-live="polite">
                    {slotHint}
                  </p>
                  <div className="slot-grid">
                    {slots.map((x) => {
                      const sel = f.slot === x.minutes;
                      return (
                        <button key={x.minutes} type="button" disabled={!x.available} aria-pressed={sel} aria-label={x.label + (x.available ? '' : x.reason === 'past' ? ', time passed' : ', already booked')} onClick={() => setF('slot', x.minutes)} className={'slot' + (sel ? ' is-selected' : '')}>
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
                      I agree to be contacted about my appointment. <a href="/privacy">Privacy policy</a>
                    </span>
                  </label>
                  <FieldError>{err.consent}</FieldError>
                </div>

                <button type="submit" className="btn btn-dark submit">
                  {feeOn ? 'Continue to booking fee' : 'Book appointment'}
                  <span className="odia">ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ୍ କରନ୍ତୁ</span>
                </button>
                <p className="small muted center">No payment needed to book. Final cost is explained after the check-up.</p>
              </form>
            )}

            {phase === 'pay' && (
              <div className="stack gap-16">
                <p className="small muted">Step 2 of 2</p>
                <h3 className="h3">Booking fee: Rs {feeAmount}</h3>
                <p>This small fee holds your slot and is adjusted in your treatment bill. {SITE.refundPolicy}</p>
                {message && (
                  <p role="alert" className="notice is-error">
                    {message}
                  </p>
                )}
                <div className="pay-grid">
                  <button type="button" onClick={pay} className="btn btn-dark">
                    Pay with UPI
                  </button>
                  <button type="button" onClick={pay} className="btn btn-outline" style={{ minHeight: 52 }}>
                    Card / net banking
                  </button>
                </div>
                {!ref && (
                  <button type="button" onClick={() => setPhase('form')} className="btn-link">
                    Back to details
                  </button>
                )}
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
                {payment && (
                  <p className="notice">
                    {payment.paid ? 'Thank you, your booking fee payment was received. It will show as paid once the bank confirms it.' : 'Booking fee not paid yet. You can pay at the clinic.'}
                  </p>
                )}
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
                <p>{message || 'This is usually a weak network. Your details are saved on this page. Try again, or send them to us on WhatsApp.'}</p>
                <div className="result-actions">
                  <button type="button" onClick={retry} className="btn btn-dark" style={{ padding: '0 28px' }}>
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
