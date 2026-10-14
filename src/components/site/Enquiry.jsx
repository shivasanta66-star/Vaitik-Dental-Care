'use client';

import { useState } from 'react';
import { SITE } from '@/lib/content.js';
import { MESSAGES, MESSAGE_MAX, cleanMobile } from '@/lib/bookingRules.js';

const EMPTY = { name: '', mobile: '', message: '', consent: false, hp: '' };
const FIELD_IDS = { name: 'ask-name', mobile: 'ask-mobile', message: 'ask-message' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = MESSAGES.name;
  if (!/^[6-9]\d{9}$/.test(cleanMobile(f.mobile))) e.mobile = MESSAGES.mobile;
  if (!f.message.trim()) e.message = MESSAGES.message;
  if (!f.consent) e.consent = MESSAGES.consent;
  return e;
}

function focusFirstError(keys) {
  setTimeout(() => {
    const el = document.getElementById(FIELD_IDS[keys[0]]) || document.querySelector('#ask [role=alert]');
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120 });
      el.focus?.({ preventScroll: true });
    }
  }, 30);
}

/** "Book appointment" link to ClinicDesk. Always opens in a new tab. */
export function BookLink({ className, children, onClick }) {
  return (
    <a href={SITE.bookingUrl} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}

// "Ask us a question" form state.
export function useEnquiry() {
  const [f, setFState] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [phase, setPhase] = useState('form'); // form | loading | success | error
  const [message, setMessage] = useState('');

  const setF = (k, v) => {
    setFState((prev) => ({ ...prev, [k]: v }));
    setErr((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const send = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, mobile: f.mobile, message: f.message, consent: f.consent, website: f.hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPhase('success');
        return;
      }
      if (data.fields) {
        setErr(data.fields);
        setPhase('form');
        focusFirstError(Object.keys(data.fields));
        return;
      }
      setMessage(data.error || '');
      setPhase('error');
    } catch {
      setMessage('');
      setPhase('error');
    }
  };

  const submit = (e) => {
    e?.preventDefault?.();
    const errors = validate(f);
    const keys = Object.keys(errors);
    if (keys.length) {
      setErr(errors);
      focusFirstError(keys);
      return;
    }
    send();
  };

  const reset = () => {
    setFState(EMPTY);
    setErr({});
    setPhase('form');
    setMessage('');
  };

  return { f, err, phase, message, setF, setPhase, submit, retry: send, reset };
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="field-error">
      {children}
    </p>
  );
}

export default function EnquirySection({ enquiry, branches }) {
  const { f, err, phase, message, setF, setPhase, submit, retry, reset } = enquiry;
  const firstName = f.name.trim().split(' ')[0] || 'thank you';
  const on = (k) => (e) => setF(k, e.target.value);
  const inputCls = (k) => 'input' + (err[k] ? ' is-invalid' : '');

  return (
    <section id="ask" aria-labelledby="ask-title" className="book-section tint anchor">
      <div className="wrap stack gap-24">
        <div className="stack gap-8">
          <h2 id="ask-title" className="h2 book-title">
            Ask us a question <span className="odia">ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ</span>
          </h2>
          <p className="muted">Not sure about a treatment, the cost or what to expect? Send us your question and we will call or WhatsApp you with an answer.</p>
          <p className="notice ask-note">
            This form is for questions only and does not book an appointment.{' '}
            <BookLink className="ask-note-link">Book an appointment online</BookLink> instead.
          </p>
        </div>
        <div className="book-layout">
          <div className="book-panel">
            {phase === 'form' && (
              <form noValidate onSubmit={submit} aria-describedby="ask-title" className="book-form">
                <div aria-hidden="true" className="honeypot">
                  <label>
                    Leave this empty
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.hp} onChange={on('hp')} />
                  </label>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="ask-name">Full name</label>
                    <input id="ask-name" type="text" autoComplete="name" maxLength={80} value={f.name} onChange={on('name')} aria-invalid={!!err.name} aria-describedby="ask-name-err" className={inputCls('name')} />
                    <FieldError id="ask-name-err">{err.name}</FieldError>
                  </div>
                  <div className="field">
                    <label htmlFor="ask-mobile">Mobile number</label>
                    <div className={'phone-group' + (err.mobile ? ' is-invalid' : '')}>
                      <span className="phone-prefix">+91</span>
                      <input id="ask-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="10-digit number" value={f.mobile} onChange={on('mobile')} aria-invalid={!!err.mobile} aria-describedby="ask-mobile-err" />
                    </div>
                    <FieldError id="ask-mobile-err">{err.mobile}</FieldError>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="ask-message">Your question</label>
                  <textarea
                    id="ask-message"
                    rows={5}
                    maxLength={MESSAGE_MAX}
                    value={f.message}
                    onChange={on('message')}
                    placeholder="For example: How much does a root canal cost? Do you treat children?"
                    aria-invalid={!!err.message}
                    aria-describedby="ask-message-err"
                    className={'textarea' + (err.message ? ' is-invalid' : '')}
                  />
                  <p className="counter">
                    {f.message.length}/{MESSAGE_MAX}
                  </p>
                  <FieldError id="ask-message-err">{err.message}</FieldError>
                </div>

                <div className="field">
                  <label className="consent">
                    <input type="checkbox" checked={f.consent} onChange={(e) => setF('consent', e.target.checked)} />
                    <span>
                      I agree to be contacted about my question. <a href="/privacy">Privacy policy</a>
                    </span>
                  </label>
                  <FieldError>{err.consent}</FieldError>
                </div>

                <button type="submit" className="btn btn-dark submit">
                  Send question
                  <span className="odia">ପ୍ରଶ୍ନ ପଠାନ୍ତୁ</span>
                </button>
                <p className="small muted center">Please do not share medical history here; we discuss that in person.</p>
              </form>
            )}

            {phase === 'loading' && (
              <div role="status" aria-live="polite" className="loading">
                <span aria-hidden="true" className="spinner" />
                <p style={{ fontWeight: 600 }}>Sending your question…</p>
                <p className="small muted">Please keep this page open.</p>
              </div>
            )}

            {phase === 'success' && (
              <div role="status" aria-live="polite" className="stack gap-16">
                <span aria-hidden="true" className="result-icon">
                  <i className="ph-duotone ph-check-circle" />
                </span>
                <h3 className="h3" style={{ fontSize: 24 }}>
                  Question received, {firstName}.
                </h3>
                <p>
                  We will call or WhatsApp you on <strong>{'+91 ' + cleanMobile(f.mobile)}</strong> with an answer. This has not booked an appointment.
                </p>
                <div className="result-actions">
                  <BookLink className="btn btn-dark">Book appointment</BookLink>
                  <button type="button" onClick={reset} className="btn btn-outline">
                    Ask another question
                  </button>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div role="alert" className="stack gap-16">
                <span aria-hidden="true" className="result-icon is-error">
                  <i className="ph-duotone ph-warning" />
                </span>
                <h3 style={{ fontSize: 22, color: 'var(--danger)' }}>Your question did not go through</h3>
                <p>{message || 'This is usually a weak network. Your question is saved on this page. Try again, or call or WhatsApp us.'}</p>
                <div className="result-actions">
                  <button type="button" onClick={retry} className="btn btn-dark" style={{ padding: '0 28px' }}>
                    Try again
                  </button>
                  <button type="button" onClick={() => setPhase('form')} className="btn-link" style={{ minHeight: 52, padding: '0 16px', alignSelf: 'auto' }}>
                    Edit question
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside aria-label="Call or WhatsApp a branch" className="book-side">
            <h3 className="h3">Prefer to talk?</h3>
            <p>Call or WhatsApp either branch directly.</p>
            {branches.map((b) => (
              <div key={b.slug} className="stack gap-8">
                <p className="option-name">
                  {b.name} <span className="odia">{b.odia}</span>
                </p>
                <div className="side-actions">
                  <a href={b.telHref} className="btn btn-outline">
                    <i className="ph-duotone ph-phone" aria-hidden="true" />
                    {b.phone}
                  </a>
                  <a href={b.waHref} target="_blank" rel="noopener" className="btn btn-wa">
                    <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
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
