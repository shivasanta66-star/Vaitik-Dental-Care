'use client';

import { useState } from 'react';
import { waHref } from '@/lib/branch.js';
import { SITE } from '@/lib/content.js';
import { MESSAGES, MESSAGE_MAX, cleanMobile } from '@/lib/bookingRules.js';

const EMPTY = { name: '', mobile: '', message: '' };
const FIELD_IDS = { name: 'ask-name', mobile: 'ask-mobile', message: 'ask-message' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = MESSAGES.name;
  if (!/^[6-9]\d{9}$/.test(cleanMobile(f.mobile))) e.mobile = MESSAGES.mobile;
  if (!f.message.trim()) e.message = MESSAGES.message;
  return e;
}

function focusFirstError(keys) {
  setTimeout(() => {
    const el = document.getElementById(FIELD_IDS[keys[0]]);
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120 });
      el.focus({ preventScroll: true });
    }
  }, 30);
}

/** The WhatsApp message the patient sends to the chosen branch. */
export function questionText(branch, f) {
  return [
    'Hello Vaitik Dental Care (' + branch.name + '). I have a question.',
    '',
    'Name: ' + f.name.trim(),
    'Mobile: +91 ' + cleanMobile(f.mobile),
    '',
    f.message.trim(),
  ].join('\n');
}

/** "Book appointment" link to ClinicDesk. Always opens in a new tab. */
export function BookLink({ className, children, onClick }) {
  return (
    <a href={SITE.bookingUrl} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}

// "Ask us a question" form state. Nothing is sent from the website: the
// question opens in WhatsApp, and the patient presses Send there.
export function useEnquiry() {
  const [f, setFState] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [sent, setSent] = useState(null); // { branch, href } once WhatsApp has been opened

  const setF = (k, v) => {
    setFState((prev) => ({ ...prev, [k]: v }));
    setErr((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  // Called from the click itself, so the browser allows the new tab / WhatsApp app to open.
  const sendTo = (branch) => {
    const errors = validate(f);
    const keys = Object.keys(errors);
    if (keys.length) {
      setErr(errors);
      focusFirstError(keys);
      return;
    }
    const href = waHref(branch, questionText(branch, f));
    window.open(href, '_blank', 'noopener,noreferrer');
    setSent({ branch, href });
  };

  const reset = () => {
    setFState(EMPTY);
    setErr({});
    setSent(null);
  };

  return { f, err, sent, setF, sendTo, back: () => setSent(null), reset };
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
  const { f, err, sent, setF, sendTo, back, reset } = enquiry;
  const on = (k) => (e) => setF(k, e.target.value);
  const inputCls = (k) => 'input' + (err[k] ? ' is-invalid' : '');

  return (
    <section id="ask" aria-labelledby="ask-title" className="book-section tint">
      <div className="wrap stack gap-24">
        <div className="stack gap-8">
          <h2 id="ask-title" className="h2 book-title">
            Ask us a question <span className="odia">ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ</span>
          </h2>
          <p className="muted">Not sure about a treatment, the cost or what to expect? Type your question and send it to us on WhatsApp. We will reply there or call you.</p>
          <p className="notice ask-note">
            This form is for questions only and does not book an appointment.{' '}
            <BookLink className="ask-note-link">Book an appointment online</BookLink> instead.
          </p>
        </div>
        <div className="book-layout">
          <div className="book-panel">
            {!sent && (
              <form noValidate onSubmit={(e) => e.preventDefault()} aria-describedby="ask-title" className="book-form">
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

                <fieldset className="fieldset">
                  <legend>Send on WhatsApp to</legend>
                  <div className="ask-send">
                    {branches.map((b) => (
                      <button key={b.slug} type="button" onClick={() => sendTo(b)} className="btn btn-wa ask-send-btn">
                        <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
                        <span>
                          {b.name} <span className="odia">{b.odia}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="small muted center">
                  WhatsApp opens with your question typed in. Nothing is sent until you press Send there. Please do not share medical history; we discuss that in person.
                </p>
              </form>
            )}

            {sent && (
              <div role="status" aria-live="polite" className="stack gap-16">
                <span aria-hidden="true" className="result-icon">
                  <i className="ph-duotone ph-whatsapp-logo" />
                </span>
                <h3 className="h3" style={{ fontSize: 24 }}>
                  Now press Send in WhatsApp
                </h3>
                <p>
                  Your question is typed into a WhatsApp chat with our <strong>{sent.branch.name}</strong> branch. It reaches us only after you press Send. Sending a question does not book an
                  appointment.
                </p>
                <div className="result-actions">
                  <a href={sent.href} target="_blank" rel="noopener noreferrer" className="btn btn-wa">
                    <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
                    WhatsApp did not open? Tap here
                  </a>
                  <button type="button" onClick={reset} className="btn btn-outline">
                    Ask another question
                  </button>
                  <button type="button" onClick={back} className="btn-link" style={{ minHeight: 52, padding: '0 16px', alignSelf: 'auto' }}>
                    Edit question
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside aria-label="Call a branch" className="book-side">
            <h3 className="h3">Prefer to talk?</h3>
            <p>Call either branch directly.</p>
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
