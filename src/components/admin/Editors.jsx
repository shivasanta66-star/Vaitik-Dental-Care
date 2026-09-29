'use client';

import { useState } from 'react';
import * as actions from '@/app/admin/actions.js';
import { getBrowserClient } from '@/lib/supabase/browser.js';
import { DAYS, WEEK, dLabel } from '@/lib/time.js';
import ImageSlot from '../ImageSlot.jsx';
import { uploadPhoto } from './upload.js';

// Editable copy of a server list. Components are re-keyed after each save,
// so the draft resets to what the database now holds.
function useDraft(initial) {
  const [list, setList] = useState(initial);
  return {
    list,
    set: setList,
    update: (i, patch) => setList((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x))),
    remove: (i) => setList((l) => l.filter((_, j) => j !== i)),
    move: (i, d) =>
      setList((l) => {
        const j = i + d;
        if (j < 0 || j >= l.length) return l;
        const a = [...l];
        [a[i], a[j]] = [a[j], a[i]];
        return a;
      }),
    add: (item) => setList((l) => [...l, item]),
  };
}

function PhotoInput({ label, onFile, busy }) {
  return (
    <>
      <input type="file" accept="image/*" aria-label={label} className="upload" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <span className="upload-label">{busy ? 'Uploading…' : 'Change photo'}</span>
    </>
  );
}

function useUpload(flash) {
  const [busy, setBusy] = useState(null);
  const upload = async (key, file, folder, done) => {
    setBusy(key);
    try {
      done(await uploadPhoto(file, folder));
      flash('Photo uploaded. Remember to save.');
    } catch (e) {
      flash(e.message);
    } finally {
      setBusy(null);
    }
  };
  return { busy, upload };
}

// ---------- treatments ----------

export function TreatmentsEditor({ data, run }) {
  const d = useDraft(data.treatments);
  return (
    <>
      <p className="muted">Order here is the order on the website. Use &ldquo;From Rs …&rdquo; or &ldquo;Price after check-up&rdquo;.</p>
      <div className="stack" style={{ gap: 8 }}>
        {d.list.map((t, i) => (
          <div key={t.id || 'new-' + i} className={'edit-row' + (t.visible ? '' : ' is-hidden-item')}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" aria-label={'Move ' + t.name + ' up'} onClick={() => d.move(i, -1)} className="sq-btn">
                <i className="ph-duotone ph-arrow-up" />
              </button>
              <button type="button" aria-label={'Move ' + t.name + ' down'} onClick={() => d.move(i, 1)} className="sq-btn">
                <i className="ph-duotone ph-arrow-down" />
              </button>
            </div>
            <input aria-label="Treatment name" value={t.name} onChange={(e) => d.update(i, { name: e.target.value })} className="inp inp-sm" style={{ flex: '2 1 220px', fontWeight: 600 }} />
            <input aria-label="Price text" value={t.price} onChange={(e) => d.update(i, { price: e.target.value })} className="inp inp-sm" style={{ flex: '1 1 180px' }} />
            <label className="chk" style={{ fontWeight: 500 }}>
              <input type="checkbox" checked={t.visible} onChange={() => d.update(i, { visible: !t.visible })} style={{ width: 20, height: 20 }} />
              Show on site
            </label>
            <button type="button" aria-label={'Delete ' + t.name} onClick={() => d.remove(i)} className="sq-btn is-danger">
              <i className="ph-duotone ph-trash" />
            </button>
            <input aria-label={'Description of ' + t.name} placeholder="One-line description shown on the website" value={t.blurb} onChange={(e) => d.update(i, { blurb: e.target.value })} className="inp inp-sm" style={{ flex: '1 1 100%' }} />
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={() => d.add({ name: 'New treatment', price: 'From Rs [PRICE]', blurb: '', icon: 'ph-tooth', visible: false })} className="btn btn-secondary">
          + Add treatment
        </button>
        <button type="button" onClick={() => run(actions.saveTreatments(d.list), 'Saved. The website updates within a minute.')} className="btn btn-primary">
          Save changes
        </button>
      </div>
    </>
  );
}

// ---------- doctors and schedule ----------

export function DoctorsAndSchedule({ data, run, flash }) {
  const [branchId, setBranchId] = useState(data.branches[0]?.id);
  const branch = data.branches.find((b) => b.id === branchId);
  const [hours, setHours] = useState(() => Object.fromEntries(data.branches.map((b) => [b.id, b.hours])));
  const [slotLen, setSlotLen] = useState(() => Object.fromEntries(data.branches.map((b) => [b.id, String(b.slotMinutes)])));
  const [newBlock, setNewBlock] = useState({ date: '', reason: '', all: false });
  const setDay = (day, patch) => setHours((H) => ({ ...H, [branchId]: H[branchId].map((h, i) => (i === day ? { ...h, ...patch } : h)) }));
  const blocked = data.blocked.filter((b) => b.branch_id === branchId || b.branch_id === null);

  const addBlock = async () => {
    const r = await run(actions.addBlockedDate(newBlock.all ? null : branchId, newBlock.date, newBlock.reason), 'Date blocked');
    if (r) setNewBlock({ date: '', reason: '', all: false });
  };

  if (!branch) return <p className="muted">No branches found. Run the seed script.</p>;
  return (
    <>
      <div role="group" aria-label="Branch" className="toggle" style={{ border: 'none', gap: 8, borderRadius: 0 }}>
        {data.branches.map((b) => (
          <button key={b.id} type="button" aria-pressed={branchId === b.id} onClick={() => setBranchId(b.id)} style={{ padding: '0 20px', borderRadius: 999, border: '2px solid var(--navy-700)' }}>
            {b.name}
          </button>
        ))}
      </div>
      <div className="two-col" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="panel">
          <h2>Weekly hours</h2>
          {WEEK.map((i) => {
            const h = hours[branchId][i];
            return (
              <div key={i} className="sched-row">
                <span style={{ width: 96, fontWeight: 600 }}>{DAYS[i]}</span>
                <input type="time" aria-label={DAYS[i] + ' opens'} value={h.open} onChange={(e) => setDay(i, { open: e.target.value })} disabled={h.closed} />
                <span aria-hidden="true">–</span>
                <input type="time" aria-label={DAYS[i] + ' closes'} value={h.close} onChange={(e) => setDay(i, { close: e.target.value })} disabled={h.closed} />
                <label className="chk" style={{ gap: 6 }}>
                  <input type="checkbox" checked={h.closed} onChange={() => setDay(i, { closed: !h.closed })} />
                  Closed
                </label>
              </div>
            );
          })}
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, marginTop: 8 }}>
            Slot length
            <select value={slotLen[branchId]} onChange={(e) => setSlotLen((s) => ({ ...s, [branchId]: e.target.value }))} className="inp inp-sm" style={{ padding: '0 8px' }}>
              {['15', '30', '45', '60'].map((v) => (
                <option key={v} value={v}>
                  {v} min
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => run(actions.saveSchedule(branchId, hours[branchId], slotLen[branchId]), branch.name + ' hours saved')} className="btn btn-primary btn-save">
            Save {branch.name} hours
          </button>
        </section>
        <section className="panel">
          <h2>Holidays and blocked dates</h2>
          {!blocked.length && <p className="muted">No blocked dates.</p>}
          {blocked.map((b) => (
            <div key={b.id} className="blocked-row">
              <span style={{ fontWeight: 600, width: 120 }}>{dLabel(b.date)}</span>
              <span style={{ flex: 1 }}>
                {b.reason}
                {b.branch_id === null && <span className="small muted"> · all branches</span>}
              </span>
              <button type="button" aria-label={'Remove blocked date ' + dLabel(b.date)} onClick={() => run(actions.removeBlockedDate(b.id), 'Date unblocked')} className="sq-btn is-danger">
                <i className="ph-duotone ph-trash" />
              </button>
            </div>
          ))}
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <input type="date" aria-label="Date to block" min={data.today} value={newBlock.date} onChange={(e) => setNewBlock((n) => ({ ...n, date: e.target.value }))} className="inp" style={{ padding: '0 8px' }} />
            <input aria-label="Reason" placeholder="Reason, e.g. Diwali" value={newBlock.reason} onChange={(e) => setNewBlock((n) => ({ ...n, reason: e.target.value }))} className="inp" style={{ flex: '1 1 140px' }} />
            <label className="chk">
              <input type="checkbox" checked={newBlock.all} onChange={() => setNewBlock((n) => ({ ...n, all: !n.all }))} />
              All branches
            </label>
            <button type="button" onClick={addBlock} className="btn btn-secondary" style={{ padding: '0 16px' }}>
              Block date
            </button>
          </div>
          <p className="small muted">Existing bookings on a blocked date are not cancelled automatically. Check the Appointments list.</p>
        </section>
      </div>
      <DoctorsEditor data={data} run={run} flash={flash} />
    </>
  );
}

function DoctorsEditor({ data, run, flash }) {
  const d = useDraft(data.doctors);
  const { busy, upload } = useUpload(flash);
  return (
    <section className="stack" style={{ gap: 12 }}>
      <h2 style={{ fontSize: 20, color: 'var(--navy-700)', marginTop: 16 }}>Doctors</h2>
      <div className="doc-grid">
        {d.list.map((doc, i) => (
          <div key={doc.id || 'new-' + i} className={'doc-edit' + (doc.active ? '' : ' is-hidden-item')}>
            <div className="photo">
              <ImageSlot src={doc.photo_url} alt={doc.name} placeholder={'Photo: ' + doc.name} />
              <PhotoInput label={'Photo of ' + doc.name} busy={busy === i} onFile={(f) => upload(i, f, 'doctors', (url) => d.update(i, { photo_url: url }))} />
            </div>
            <div className="stack" style={{ flex: '1 1 180px', gap: 8 }}>
              <input aria-label="Name" value={doc.name} onChange={(e) => d.update(i, { name: e.target.value })} className="inp inp-sm" style={{ fontWeight: 600 }} />
              <input aria-label="Qualification" placeholder="Qualification, e.g. BDS, MDS" value={doc.qualification || ''} onChange={(e) => d.update(i, { qualification: e.target.value })} className="inp inp-sm" />
              <input aria-label="Dental Council registration number" placeholder="Dental Council Reg. No." value={doc.reg_no || ''} onChange={(e) => d.update(i, { reg_no: e.target.value })} className="inp inp-sm" />
              <input aria-label="Branch days" placeholder="e.g. Koraput Mon–Sat, Semiliguda Sun evening" value={doc.schedule_text || ''} onChange={(e) => d.update(i, { schedule_text: e.target.value })} className="inp inp-sm" />
              <input aria-label="Focus" placeholder="One line, e.g. root canals and extractions" value={doc.focus || ''} onChange={(e) => d.update(i, { focus: e.target.value })} className="inp inp-sm" />
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <label className="chk">
                  <input type="checkbox" checked={doc.active} onChange={() => d.update(i, { active: !doc.active })} />
                  Show on site
                </label>
                <button type="button" onClick={() => d.move(i, -1)} className="link-btn">
                  Move up
                </button>
                <button type="button" onClick={() => d.remove(i)} className="link-btn is-danger">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={() => d.add({ name: 'Dr ', qualification: '', reg_no: '', schedule_text: '', focus: '', photo_url: null, branch_ids: data.branches.map((b) => b.id), active: false })} className="btn btn-secondary">
          + Add doctor
        </button>
        <button type="button" onClick={() => run(actions.saveDoctors(d.list), 'Doctors saved')} className="btn btn-primary">
          Save doctors
        </button>
      </div>
    </section>
  );
}

// ---------- reviews ----------

export function ReviewsEditor({ data, run }) {
  const d = useDraft(data.reviews);
  return (
    <>
      <p className="muted">Paraphrase Google reviews in a sentence or two. First initial only.</p>
      <div className="two-col" style={{ gap: 16 }}>
        {d.list.map((r, i) => (
          <div key={r.id || 'new-' + i} className={'panel' + (r.visible ? '' : ' is-hidden-item')} style={{ padding: 16, gap: 8 }}>
            <textarea aria-label="Review text" rows={3} value={r.text} onChange={(e) => d.update(i, { text: e.target.value })} className="textarea" />
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input aria-label="Initial" value={r.initial} onChange={(e) => d.update(i, { initial: e.target.value })} className="inp inp-sm" style={{ width: 80, padding: '0 10px' }} />
              <select aria-label="Branch" value={r.branch_id || ''} onChange={(e) => d.update(i, { branch_id: e.target.value || null })} className="inp inp-sm" style={{ padding: '0 8px' }}>
                <option value="">No branch</option>
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <label className="chk" style={{ gap: 6, marginLeft: 'auto' }}>
                <input type="checkbox" checked={r.visible} onChange={() => d.update(i, { visible: !r.visible })} />
                Show
              </label>
              <button type="button" aria-label="Delete review" onClick={() => d.remove(i)} className="sq-btn is-danger">
                <i className="ph-duotone ph-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={() => d.add({ text: '', initial: '', branch_id: data.branches[0]?.id ?? null, visible: false })} className="btn btn-secondary">
          + Add review
        </button>
        <button type="button" onClick={() => run(actions.saveReviews(d.list), 'Saved. The website updates within a minute.')} className="btn btn-primary">
          Save changes
        </button>
      </div>
    </>
  );
}

// ---------- gallery ----------

export function GalleryEditor({ data, run, flash }) {
  const d = useDraft(data.gallery);
  const { busy, upload } = useUpload(flash);
  const photo = (g, i, side) => (
    <div className="media">
      <ImageSlot src={g[side + '_url']} alt={g.caption + ' ' + side} placeholder={side === 'before' ? 'Before' : 'After'} />
      <PhotoInput label={side + ' photo for ' + g.caption} busy={busy === i + side} onFile={(f) => upload(i + side, f, 'gallery', (url) => d.update(i, { [side + '_url']: url }))} />
    </div>
  );
  return (
    <>
      <p className="muted">Choose a photo for each side; it is converted to WebP under 500 KB. A pair goes live only when the consent box is ticked. The first 3 visible pairs (6 photos) show on the website.</p>
      <div className="gal-grid">
        {d.list.map((g, i) => (
          <div key={g.id || 'new-' + i} className="gal-tile">
            <div className="pair">
              {photo(g, i, 'before')}
              {photo(g, i, 'after')}
            </div>
            <div className="body">
              <input aria-label="Caption" placeholder="Treatment, e.g. Braces" value={g.caption} onChange={(e) => d.update(i, { caption: e.target.value })} className="inp inp-sm" style={{ padding: '0 10px' }} />
              <label className="chk">
                <input type="checkbox" checked={g.consent} onChange={() => d.update(i, g.consent ? { consent: false, visible: false } : { consent: true })} />
                Written patient consent on file
              </label>
              <label className="chk">
                <input type="checkbox" checked={g.visible} disabled={!g.consent} onChange={() => g.consent && d.update(i, { visible: !g.visible })} />
                Show on website
              </label>
              {!g.consent && <p className="small" style={{ color: 'var(--danger)' }}>Hidden until consent is ticked.</p>}
              <div className="row" style={{ gap: 12 }}>
                <button type="button" onClick={() => d.move(i, -1)} className="link-btn">
                  Move up
                </button>
                <button type="button" onClick={() => d.remove(i)} className="link-btn is-danger">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={() => d.add({ caption: '', before_url: null, after_url: null, consent: false, visible: false })} className="btn btn-secondary">
          + Add before/after pair
        </button>
        <button type="button" onClick={() => run(actions.saveGallery(d.list), 'Gallery saved')} className="btn btn-primary">
          Save gallery
        </button>
      </div>
    </>
  );
}

// ---------- settings ----------

export function SettingsEditor({ data, me, run, flash }) {
  const owner = me.role === 'owner';
  const [s, setS] = useState(data.settings);
  const [phones, setPhones] = useState(() => Object.fromEntries(data.branches.map((b) => [b.id, b.phone])));
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'receptionist' });
  const [myPassword, setMyPassword] = useState('');

  const addUser = async () => {
    const r = await run(actions.addStaff(newUser), 'Staff member added. Share the temporary password with them.');
    if (r) setNewUser({ email: '', name: '', password: '', role: 'receptionist' });
  };
  const resetPassword = async (u) => {
    const pw = window.prompt('New temporary password for ' + (u.name || u.email) + ' (at least 10 characters):');
    if (pw) run(actions.resetStaffPassword(u.user_id, pw), 'Password changed');
  };
  const changeMine = async () => {
    if (myPassword.length < 10) return flash('Use at least 10 characters.');
    const { error } = await getBrowserClient().auth.updateUser({ password: myPassword });
    if (error) return flash(error.message);
    setMyPassword('');
    flash('Your password was changed');
  };

  return (
    <>
      {!owner && <p className="notice">Only an owner can change these settings. You can change your own password below.</p>}
      <div className="two-col" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="panel">
          <h2>Branches and contact</h2>
          {data.branches.map((b) => (
            <label key={b.id} className="lbl">
              {b.name} phone / WhatsApp
              <input value={phones[b.id]} disabled={!owner} onChange={(e) => setPhones((p) => ({ ...p, [b.id]: e.target.value }))} className="inp" style={{ fontSize: 15 }} />
            </label>
          ))}
          <label className="lbl">
            Emergency number
            <input value={s.emergency} disabled={!owner} onChange={(e) => setS({ ...s, emergency: e.target.value })} className="inp" style={{ fontSize: 15 }} />
          </label>
          <p className="small muted">Hours are set per branch in Doctors and schedule.</p>
        </section>
        <section className="panel">
          <h2>Online booking fee</h2>
          <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}>
            <input type="checkbox" checked={s.feeOn} disabled={!owner} onChange={() => setS({ ...s, feeOn: !s.feeOn })} style={{ width: 22, height: 22, accentColor: 'var(--navy-700)' }} />
            Ask patients to pay a fee when booking online
          </label>
          <label className="lbl">
            Amount (Rs)
            <input inputMode="numeric" value={s.feeAmount} onChange={(e) => setS({ ...s, feeAmount: e.target.value })} disabled={!owner || !s.feeOn} className="inp" style={{ fontSize: 15, maxWidth: 200 }} />
          </label>
          <p className="small muted">When off, the booking form skips the payment step. Payments also need the Razorpay keys on the server.</p>
        </section>
        {owner && (
          <button type="button" onClick={() => run(actions.saveSettings({ ...s, phones }), 'Settings saved')} className="btn btn-primary btn-save" style={{ gridColumn: '1 / -1' }}>
            Save settings
          </button>
        )}
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2>Staff users</h2>
          {data.staff.map((u) => (
            <div key={u.user_id} className="row" style={{ alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--blue-50)' }}>
              <span style={{ flex: '1 1 200px', fontWeight: 600 }}>
                {u.name || u.email}
                {u.user_id === me.id ? ' (you)' : ''}
                <br />
                <span className="small muted" style={{ fontWeight: 400 }}>
                  {u.email}
                </span>
              </span>
              <select aria-label="Role" value={u.role} disabled={!owner || u.user_id === me.id} onChange={(e) => run(actions.setStaffRole(u.user_id, e.target.value), 'Role changed')} className="inp inp-sm" style={{ padding: '0 8px' }}>
                <option value="owner">Owner</option>
                <option value="receptionist">Receptionist</option>
              </select>
              {owner && u.user_id !== me.id && (
                <>
                  <button type="button" onClick={() => resetPassword(u)} className="link-btn">
                    Reset password
                  </button>
                  <button
                    type="button"
                    aria-label={'Remove ' + (u.name || u.email)}
                    onClick={() => window.confirm('Remove ' + (u.name || u.email) + '? They will no longer be able to sign in.') && run(actions.removeStaff(u.user_id), 'Staff member removed')}
                    className="sq-btn is-danger"
                  >
                    <i className="ph-duotone ph-trash" />
                  </button>
                </>
              )}
            </div>
          ))}
          {owner && (
            <div className="row" style={{ gap: 8, paddingTop: 8, borderTop: '1px solid var(--blue-50)' }}>
              <input aria-label="New staff email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="inp" style={{ flex: '1 1 200px' }} />
              <input aria-label="New staff name" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="inp" style={{ flex: '1 1 160px' }} />
              <input aria-label="Temporary password" placeholder="Temporary password (10+ characters)" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="inp" style={{ flex: '1 1 200px' }} />
              <select aria-label="Role for new staff" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="inp" style={{ padding: '0 8px' }}>
                <option value="receptionist">Receptionist</option>
                <option value="owner">Owner</option>
              </select>
              <button type="button" onClick={addUser} className="btn btn-secondary" style={{ padding: '0 16px' }}>
                Add staff member
              </button>
            </div>
          )}
        </section>
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2>Change my password</h2>
          <div className="row" style={{ gap: 8 }}>
            <input type="password" autoComplete="new-password" aria-label="New password" placeholder="New password (10+ characters)" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} className="inp" style={{ flex: '1 1 240px', maxWidth: 360 }} />
            <button type="button" onClick={changeMine} className="btn btn-secondary">
              Change password
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
