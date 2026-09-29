-- Helper functions, the booking transaction and dashboard views.

-- Role checks used by row level security. SECURITY DEFINER so policies on
-- the staff table itself do not recurse.
create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'owner');
$$;

-- Clinic-local "today".
create function public.clinic_today() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- Creates a booking in one transaction: checks the slot is inside opening
-- hours, not on a blocked date and not in the past, upserts the patient by
-- phone and inserts the appointment. Returns the reference code.
-- Errors (message → meaning): consent_required, branch_closed,
-- slot_outside_hours, date_blocked, slot_in_past, slot_taken (SQLSTATE 23505).
create function public.create_booking(
  p_name text,
  p_phone text,
  p_branch_id uuid,
  p_treatment_id uuid,
  p_concern text,
  p_date date,
  p_slot_start time,
  p_note text,
  p_consent boolean,
  p_payment_status public.payment_status default 'not_required',
  p_source text default 'website'
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_hours public.branch_hours%rowtype;
  v_slot_min int := extract(epoch from p_slot_start)::int / 60;
  v_open_min int;
  v_close_min int;
  v_patient uuid;
  v_ref text;
  v_constraint text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not coalesce(p_consent, false) then
    raise exception 'consent_required';
  end if;

  select * into v_hours from public.branch_hours
   where branch_id = p_branch_id and weekday = extract(dow from p_date);
  if not found then
    raise exception 'branch_closed';
  end if;

  v_open_min := extract(epoch from v_hours.opens)::int / 60;
  v_close_min := extract(epoch from v_hours.closes)::int / 60;
  if v_slot_min < v_open_min
     or v_slot_min + v_hours.slot_minutes > v_close_min
     or (v_slot_min - v_open_min) % v_hours.slot_minutes <> 0 then
    raise exception 'slot_outside_hours';
  end if;

  if exists (select 1 from public.blocked_dates
              where date = p_date and (branch_id = p_branch_id or branch_id is null)) then
    raise exception 'date_blocked';
  end if;

  if p_date + p_slot_start < (now() at time zone 'Asia/Kolkata') then
    raise exception 'slot_in_past';
  end if;

  -- Existing patients keep their stored name; the no-op update lets RETURNING give the id.
  insert into public.patients (name, phone) values (p_name, p_phone)
  on conflict (phone) do update set phone = excluded.phone
  returning id into v_patient;

  loop
    v_ref := 'VDC-' || (
      select string_agg(substr(v_alphabet, 1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 4)
    );
    begin
      insert into public.appointments
        (ref_code, patient_id, branch_id, treatment_id, concern, date, slot_start, note, consent, payment_status, source)
      values
        (v_ref, v_patient, p_branch_id, p_treatment_id, p_concern, p_date, p_slot_start, nullif(p_note, ''), true, p_payment_status, p_source);
      return v_ref;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'appointments_ref_code_key' then
        continue;  -- reference collision: draw a new code
      end if;
      raise exception 'slot_taken' using errcode = '23505';
    end;
  end loop;
end $$;

-- Rate limit for the public booking endpoint. Returns false when the caller
-- has already made p_limit attempts inside p_window.
create function public.check_rate_limit(p_ip_hash text, p_limit int default 5, p_window interval default interval '10 minutes')
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.booking_attempts where created_at < now() - interval '1 day';
  select count(*) into v_count from public.booking_attempts
   where ip_hash = p_ip_hash and created_at > now() - p_window;
  if v_count >= p_limit then
    return false;
  end if;
  insert into public.booking_attempts (ip_hash) values (p_ip_hash);
  return true;
end $$;

-- Only the server (service role) may call these two.
revoke execute on function public.create_booking from public, anon, authenticated;
revoke execute on function public.check_rate_limit from public, anon, authenticated;
grant execute on function public.create_booking to service_role;
grant execute on function public.check_rate_limit to service_role;

-- Dashboard views. security_invoker makes them respect the caller's RLS,
-- so only staff see any rows.
create view public.dashboard_today with (security_invoker = on) as
  select b.slug as branch_slug, a.status, count(*)::int as n
    from public.appointments a
    join public.branches b on b.id = a.branch_id
   where a.date = public.clinic_today()
   group by b.slug, a.status;

create view public.dashboard_next_7_days with (security_invoker = on) as
  select d::date as date, b.slug as branch_slug, count(a.id)::int as n
    from generate_series(public.clinic_today(), public.clinic_today() + 6, interval '1 day') d
   cross join public.branches b
    left join public.appointments a
      on a.branch_id = b.id and a.date = d::date and a.status <> 'cancelled'
   group by d, b.slug;

create view public.patient_summary with (security_invoker = on) as
  select p.id, p.name, p.phone, p.created_at,
         count(a.id) filter (where a.status = 'completed')::int as completed_visits,
         count(a.id)::int as total_appointments,
         max(a.date) filter (where a.status = 'completed') as last_visit
    from public.patients p
    left join public.appointments a on a.patient_id = p.id
   group by p.id;

revoke all on public.dashboard_today, public.dashboard_next_7_days, public.patient_summary from anon;
