'use server';

import { revalidatePath } from 'next/cache';
import { hasServiceRole } from '@/lib/env.js';
import { getSlots } from '@/lib/slots.js';
import { AccessError, requireStaff } from '@/lib/staff.js';
import { createServiceClient } from '@/lib/supabase/service.js';
import { isYmd, minToTime, timeToMin } from '@/lib/time.js';

// Every action re-checks the caller's staff role on the server, and the
// database's row level security applies on top (session client).
// Actions return { ok: true } or { error: 'message for staff' }.

const STATUSES = ['new', 'confirmed', 'completed', 'no_show', 'cancelled'];
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';

async function guard(role, fn) {
  try {
    const ctx = await requireStaff(role);
    const result = await fn(ctx);
    return result ?? { ok: true };
  } catch (e) {
    if (e instanceof AccessError) return { error: e.message };
    console.error('admin action failed', e);
    return { error: dbMessage(e) };
  }
}

function dbMessage(e) {
  if (e?.code === '23505') return 'That time is already booked. Pick another.';
  if (e?.code === '42501' || /row-level security/i.test(e?.message || '')) return 'You do not have permission to do this.';
  return e?.message ? 'Could not save: ' + e.message : 'Could not save. Please try again.';
}

const must = ({ error, data }) => {
  if (error) throw error;
  return data;
};

const refreshSite = () => {
  revalidatePath('/');
  revalidatePath('/book');
};

// ---------- appointments ----------

export async function setAppointmentStatus(id, status) {
  if (!STATUSES.includes(status)) return { error: 'Unknown status.' };
  return guard('receptionist', async ({ supabase }) => {
    must(await supabase.from('appointments').update({ status }).eq('id', id).select('id').single());
  });
}

export async function rescheduleAppointment(id, date, time) {
  if (!isYmd(date) || !/^\d{2}:\d{2}$/.test(time || '')) return { error: 'Choose a date and time.' };
  return guard('receptionist', async ({ supabase }) => {
    const appt = must(await supabase.from('appointments').select('id, branch:branches(slug)').eq('id', id).single());
    const result = await getSlots(supabase, appt.branch.slug, date, { excludeAppointmentId: id });
    if (!result || result.closed) return { error: 'The branch is closed on that date.' };
    const slot = result.slots.find((s) => s.minutes === timeToMin(time));
    if (!slot) return { error: 'That time is outside opening hours or not on the slot grid.' };
    if (!slot.available) return { error: slot.reason === 'past' ? 'That time has passed.' : 'That time is already booked. Pick another.' };
    must(await supabase.from('appointments').update({ date, slot_start: minToTime(slot.minutes), status: 'confirmed' }).eq('id', id).select('id').single());
  });
}

export async function saveInternalNote(id, note) {
  return guard('receptionist', async ({ supabase }) => {
    must(await supabase.from('appointments').update({ internal_note: String(note || '').slice(0, 1000) || null }).eq('id', id).select('id').single());
  });
}

// ---------- patients ----------

export async function getPatientHistory(patientId) {
  return guard('receptionist', async ({ supabase }) => {
    const rows = must(
      await supabase
        .from('appointments')
        .select('id, date, slot_start, status, concern, branch:branches(name), treatment:treatments(name)')
        .eq('patient_id', patientId)
        .order('date', { ascending: false }),
    );
    return {
      ok: true,
      history: rows.map((r) => ({ id: r.id, date: r.date, time: r.slot_start.slice(0, 5), status: r.status, branch: r.branch?.name, treatment: r.treatment?.name || r.concern })),
    };
  });
}

export async function deletePatient(patientId) {
  return guard('owner', async ({ supabase }) => {
    must(await supabase.from('patients').delete().eq('id', patientId).select('id').single());
  });
}

// ---------- treatments ----------

export async function saveTreatments(list) {
  return guard('receptionist', async ({ supabase }) => {
    const used = new Set();
    const rows = list.map((t, i) => {
      const name = String(t.name || '').trim();
      if (!name) throw new Error('Every treatment needs a name.');
      let slug = slugify(name);
      while (used.has(slug)) slug += '-x';
      used.add(slug);
      return { ...(t.id ? { id: t.id } : {}), name, slug, blurb: t.blurb || '', icon: t.icon || 'ph-tooth', price_text: t.price || '', visible: !!t.visible, sort: i + 1 };
    });
    if (new Set(rows.map((r) => r.name.toLowerCase())).size !== rows.length) return { error: 'Two treatments have the same name.' };
    const existing = must(await supabase.from('treatments').select('id'));
    const keep = new Set(list.filter((t) => t.id).map((t) => t.id));
    const removed = existing.filter((t) => !keep.has(t.id)).map((t) => t.id);
    if (removed.length) must(await supabase.from('treatments').delete().in('id', removed));
    const { error } = await supabase.from('treatments').upsert(rows, { defaultToNull: false }).select('id');
    if (error?.code === '23505') return { error: 'Two treatments have the same name. If you swapped names, save one change at a time.' };
    if (error) throw error;
    refreshSite();
  });
}

// ---------- doctors ----------

export async function saveDoctors(list) {
  return guard('receptionist', async ({ supabase }) => {
    const rows = list.map((d, i) => {
      if (!String(d.name || '').trim()) throw new Error('Every doctor needs a name.');
      return {
        ...(d.id ? { id: d.id } : {}),
        name: d.name.trim(),
        qualification: d.qualification || null,
        reg_no: d.reg_no || null,
        schedule_text: d.schedule_text || null,
        focus: d.focus || null,
        photo_url: d.photo_url || null,
        branch_ids: d.branch_ids || [],
        active: !!d.active,
        sort: i + 1,
      };
    });
    const existing = must(await supabase.from('doctors').select('id'));
    const keep = new Set(list.filter((d) => d.id).map((d) => d.id));
    const removed = existing.filter((d) => !keep.has(d.id)).map((d) => d.id);
    if (removed.length) must(await supabase.from('doctors').delete().in('id', removed));
    if (rows.length) must(await supabase.from('doctors').upsert(rows, { defaultToNull: false }).select('id'));
    refreshSite();
  });
}

// ---------- schedule ----------

export async function saveSchedule(branchId, days, slotMinutes) {
  const step = Number(slotMinutes);
  if (![15, 30, 45, 60].includes(step)) return { error: 'Choose a slot length.' };
  return guard('receptionist', async ({ supabase }) => {
    for (const [weekday, d] of days.entries()) {
      if (d.closed) continue;
      if (!/^\d{2}:\d{2}$/.test(d.open) || !/^\d{2}:\d{2}$/.test(d.close) || d.close <= d.open) {
        return { error: 'Check the hours: closing time must be after opening time.' };
      }
      if (weekday > 6) return { error: 'Invalid day.' };
    }
    const closedDays = days.map((d, i) => (d.closed ? i : null)).filter((i) => i !== null);
    if (closedDays.length) must(await supabase.from('branch_hours').delete().eq('branch_id', branchId).in('weekday', closedDays));
    const rows = days
      .map((d, weekday) => (d.closed ? null : { branch_id: branchId, weekday, opens: d.open, closes: d.close, slot_minutes: step }))
      .filter(Boolean);
    if (rows.length) must(await supabase.from('branch_hours').upsert(rows, { onConflict: 'branch_id,weekday' }).select('id'));
    refreshSite();
  });
}

export async function addBlockedDate(branchId, date, reason) {
  if (!isYmd(date)) return { error: 'Pick a date first.' };
  return guard('receptionist', async ({ supabase }) => {
    const { error } = await supabase.from('blocked_dates').insert({ branch_id: branchId || null, date, reason: String(reason || '').trim() || 'Closed' });
    if (error?.code === '23505') return { error: 'That date is already blocked.' };
    if (error) throw error;
    refreshSite();
  });
}

export async function removeBlockedDate(id) {
  return guard('receptionist', async ({ supabase }) => {
    must(await supabase.from('blocked_dates').delete().eq('id', id));
    refreshSite();
  });
}

// ---------- reviews ----------

export async function saveReviews(list) {
  return guard('receptionist', async ({ supabase }) => {
    const rows = list.map((r, i) => {
      if (!String(r.text || '').trim() || !String(r.initial || '').trim()) throw new Error('Every review needs text and an initial.');
      return { ...(r.id ? { id: r.id } : {}), text: r.text.trim(), author_initial: r.initial.trim(), branch_id: r.branch_id || null, rating: 5, visible: !!r.visible, sort: i + 1 };
    });
    const existing = must(await supabase.from('reviews').select('id'));
    const keep = new Set(list.filter((r) => r.id).map((r) => r.id));
    const removed = existing.filter((r) => !keep.has(r.id)).map((r) => r.id);
    if (removed.length) must(await supabase.from('reviews').delete().in('id', removed));
    if (rows.length) must(await supabase.from('reviews').upsert(rows, { defaultToNull: false }).select('id'));
    refreshSite();
  });
}

// ---------- gallery ----------

export async function saveGallery(list) {
  return guard('receptionist', async ({ supabase }) => {
    const rows = list.map((g, i) => {
      if (!String(g.caption || '').trim()) throw new Error('Every photo pair needs a caption.');
      return {
        ...(g.id ? { id: g.id } : {}),
        caption: g.caption.trim(),
        before_url: g.before_url || null,
        after_url: g.after_url || null,
        consent_confirmed: !!g.consent,
        visible: !!g.consent && !!g.visible,
        sort: i + 1,
      };
    });
    const existing = must(await supabase.from('gallery').select('id'));
    const keep = new Set(list.filter((g) => g.id).map((g) => g.id));
    const removed = existing.filter((g) => !keep.has(g.id)).map((g) => g.id);
    if (removed.length) must(await supabase.from('gallery').delete().in('id', removed));
    if (rows.length) must(await supabase.from('gallery').upsert(rows, { defaultToNull: false }).select('id'));
    refreshSite();
  });
}

// ---------- settings (owner only) ----------

export async function saveSettings({ emergency, feeOn, feeAmount, phones }) {
  const amount = Number(feeAmount);
  if (feeOn && !(amount > 0 && amount <= 10000)) return { error: 'Enter a booking fee between Rs 1 and Rs 10,000.' };
  return guard('owner', async ({ supabase }) => {
    must(
      await supabase
        .from('settings')
        .upsert([
          { key: 'emergency_number', value: String(emergency || '').trim() },
          { key: 'booking_fee_enabled', value: !!feeOn },
          { key: 'booking_fee_amount', value: Number.isFinite(amount) ? amount : 0 },
        ])
        .select('key'),
    );
    for (const [branchId, phone] of Object.entries(phones || {})) {
      const d = String(phone).replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(d)) return { error: 'Phone numbers must be 10-digit Indian mobile numbers.' };
      const display = '+91 ' + d.slice(0, 5) + ' ' + d.slice(5);
      must(await supabase.from('branches').update({ phone: display, whatsapp: '91' + d }).eq('id', branchId).select('id').single());
    }
    refreshSite();
  });
}

// ---------- staff (owner only) ----------

export async function addStaff({ email, name, password, role }) {
  const mail = String(email || '').trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(mail)) return { error: 'Enter a valid email.' };
  if (String(password || '').length < 10) return { error: 'The temporary password needs at least 10 characters.' };
  if (!['owner', 'receptionist'].includes(role)) return { error: 'Choose a role.' };
  if (!hasServiceRole()) return { error: 'The server is missing SUPABASE_SERVICE_ROLE_KEY.' };
  return guard('owner', async ({ supabase }) => {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({ email: mail, password, email_confirm: true, user_metadata: { name } });
    if (error) return { error: /already/i.test(error.message) ? 'A user with that email already exists.' : error.message };
    must(await supabase.from('staff').insert({ user_id: data.user.id, role, name: String(name || '').trim() || null, email: mail }).select('user_id').single());
  });
}

export async function setStaffRole(userId, role) {
  if (!['owner', 'receptionist'].includes(role)) return { error: 'Choose a role.' };
  return guard('owner', async ({ supabase, user }) => {
    if (userId === user.id) return { error: 'You cannot change your own role.' };
    must(await supabase.from('staff').update({ role }).eq('user_id', userId).select('user_id').single());
  });
}

export async function removeStaff(userId) {
  if (!hasServiceRole()) return { error: 'The server is missing SUPABASE_SERVICE_ROLE_KEY.' };
  return guard('owner', async ({ user }) => {
    if (userId === user.id) return { error: 'You cannot remove yourself.' };
    const { error } = await createServiceClient().auth.admin.deleteUser(userId); // cascades to staff
    if (error) throw error;
  });
}

export async function resetStaffPassword(userId, password) {
  if (String(password || '').length < 10) return { error: 'The new password needs at least 10 characters.' };
  if (!hasServiceRole()) return { error: 'The server is missing SUPABASE_SERVICE_ROLE_KEY.' };
  return guard('owner', async ({ supabase }) => {
    must(await supabase.from('staff').select('user_id').eq('user_id', userId).single());
    const { error } = await createServiceClient().auth.admin.updateUserById(userId, { password });
    if (error) throw error;
  });
}
