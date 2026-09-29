\o /dev/null
-- Database checks: booking rules, double booking, hours, blocked dates,
-- row level security and role limits. Any failed check raises an error.

create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'CHECK FAILED: %', msg; end if;
end $$;

create function pg_temp.expect_error(stmt text, pattern text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin
    execute stmt;
  exception when others then
    failed := true;
    if sqlerrm !~* pattern and sqlstate !~* pattern then
      raise exception 'CHECK FAILED: % raised "%" (%), expected %', stmt, sqlerrm, sqlstate, pattern;
    end if;
  end;
  if not failed then raise exception 'CHECK FAILED: expected error % from: %', pattern, stmt; end if;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select id as koraput from branches where slug = 'koraput' \gset
select id as semiliguda from branches where slug = 'semiliguda' \gset
select clinic_today() + 3 as day3 \gset
select clinic_today() + (7 - extract(dow from clinic_today())::int) as sunday \gset

-- Seed ------------------------------------------------------------------
select pg_temp.check((select count(*) from branches) = 2, 'two branches seeded');
select pg_temp.check((select count(*) from branch_hours) = 14, 'seven days of hours for each branch');
select pg_temp.check((select count(*) from treatments) = 10, 'ten treatments seeded');
select pg_temp.check(
  (select opens = '17:00' and closes = '20:30' from branch_hours where branch_id = :'semiliguda' and weekday = 0),
  'Semiliguda Sunday hours are 5:00 – 8:30 PM');

-- Bookings (as the server, i.e. service role) ----------------------------
set role service_role;

select create_booking('Ravi Kumar', '9876543210', :'koraput', null, 'Not sure – need a check-up', :'day3', '10:00', 'Pain lower left', true) as ref1 \gset
select pg_temp.check(:'ref1' ~ '^VDC-[A-HJ-NP-Z2-9]{4}$', 'reference code looks like VDC-XXXX');

-- Double booking the same slot fails with slot_taken (unique violation)
select pg_temp.expect_error(format(
  $q$select create_booking('Asha Nayak', '9123456789', %L, null, null, %L, '10:00', null, true)$q$, :'koraput', :'day3'),
  'slot_taken');
select pg_temp.check((select count(*) from patients where phone = '9123456789') = 0, 'failed booking leaves no patient behind');
select pg_temp.check((select count(*) from appointments where branch_id = :'koraput' and date = :'day3' and slot_start = '10:00') = 1,
  'only one appointment holds the slot');

-- Same date at the other branch is fine (18:00 is open there every day)
select create_booking('Asha Nayak', '9123456789', :'semiliguda', null, null, :'day3', '18:00', null, true) is not null as ok \gset
-- Returning patient is matched by phone, not duplicated, and keeps their name
select create_booking('Someone Else', '9876543210', :'koraput', null, null, :'day3', '10:30', null, true) is not null as ok \gset
select pg_temp.check((select count(*) from patients where phone = '9876543210') = 1, 'patient upserted by phone');
select pg_temp.check((select name from patients where phone = '9876543210') = 'Ravi Kumar', 'existing patient name not overwritten');

-- Cancelling frees the slot
update appointments set status = 'cancelled' where ref_code = :'ref1';
select create_booking('Asha Nayak', '9123456789', :'koraput', null, null, :'day3', '10:00', null, true) is not null as ok \gset

-- Opening hours
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, %L, '08:30', null, true)$q$, :'koraput', :'day3'), 'slot_outside_hours');
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, %L, '21:30', null, true)$q$, :'koraput', :'day3'), 'slot_outside_hours');
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, %L, '10:15', null, true)$q$, :'koraput', :'day3'), 'slot_outside_hours');
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, %L, '10:00', null, true)$q$, :'semiliguda', :'sunday'), 'slot_outside_hours');
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, %L, '20:30', null, true)$q$, :'semiliguda', :'sunday'), 'slot_outside_hours');
select create_booking('Sunday One', '9000000002', :'semiliguda', null, null, :'sunday', '17:00', null, true) is not null as ok \gset
select create_booking('Sunday Two', '9000000003', :'semiliguda', null, null, :'sunday', '20:00', null, true) is not null as ok \gset

-- Past dates, consent
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, clinic_today() - 1, '10:00', null, true)$q$, :'koraput'), 'slot_in_past');
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, %L, '11:00', null, false)$q$, :'koraput', :'day3'), 'consent_required');
select pg_temp.expect_error(format($q$select create_booking('A B', '12345', %L, null, null, %L, '11:00', null, true)$q$, :'koraput', :'day3'), 'patients_phone_check');

-- Blocked dates: one branch, then all branches
reset role;
insert into blocked_dates (branch_id, date, reason) values (:'koraput', clinic_today() + 5, 'Test holiday');
insert into blocked_dates (branch_id, date, reason) values (null, clinic_today() + 6, 'Diwali');
set role service_role;
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, clinic_today() + 5, '10:00', null, true)$q$, :'koraput'), 'date_blocked');
select create_booking('Open Elsewhere', '9000000004', :'semiliguda', null, null, clinic_today() + 5, '18:00', null, true) is not null as ok \gset
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, clinic_today() + 6, '18:00', null, true)$q$, :'semiliguda'), 'date_blocked');

-- Rate limit: 5 attempts per 10 minutes
select pg_temp.check((select bool_and(check_rate_limit('iphash-1')) from generate_series(1, 5)), 'first five attempts allowed');
select pg_temp.check(not check_rate_limit('iphash-1'), 'sixth attempt blocked');
select pg_temp.check(check_rate_limit('iphash-2'), 'other IPs unaffected');
reset role;

-- Gallery never visible without consent
select pg_temp.expect_error($q$insert into gallery (caption, visible, consent_confirmed) values ('x', true, false)$q$, 'gallery_check');
insert into gallery (caption, visible, consent_confirmed) values ('Hidden', false, false), ('Shown', true, true);
update treatments set visible = false where slug = 'implants';

-- Public (anon) access ------------------------------------------------------
select id as some_patient from patients limit 1 \gset
set role anon;
select pg_temp.check((select count(*) from appointments) = 0, 'anon sees no appointments');
select pg_temp.check((select count(*) from patients) = 0, 'anon sees no patients');
select pg_temp.check((select count(*) from treatments) = 9, 'anon sees only visible treatments');
select pg_temp.check((select count(*) from gallery) = 1, 'anon sees only consented, visible gallery items');
select pg_temp.check((select count(*) from settings) = 3, 'anon sees public settings');
select pg_temp.check((select count(*) from staff) = 0, 'anon sees no staff');
select pg_temp.expect_error(format($q$insert into appointments (ref_code, patient_id, branch_id, date, slot_start, consent) values ('VDC-HACK', %L, %L, clinic_today() + 3, '12:00', true)$q$, :'some_patient', :'koraput'), 'row-level security|violates');
select pg_temp.expect_error(format($q$select create_booking('A B', '9000000001', %L, null, null, clinic_today() + 3, '12:00', null, true)$q$, :'koraput'), 'permission denied');
select pg_temp.expect_error('select * from dashboard_today', 'permission denied');
with u as (update settings set value = 'true' where key = 'booking_fee_enabled' returning 1)
select pg_temp.check((select count(*) from u) = 0, 'anon cannot change settings');
reset role;

-- Staff roles ---------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'desk@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'stranger@example.com');
insert into staff (user_id, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner', 'owner@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'receptionist', 'desk@example.com');

-- Signed-in user who is not staff
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) from appointments) = 0, 'non-staff user sees no appointments');
select pg_temp.check((select count(*) from patients) = 0, 'non-staff user sees no patients');

-- Receptionist
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) from appointments) > 0, 'receptionist sees appointments');
select pg_temp.check((select count(*) from treatments) = 10, 'receptionist sees hidden treatments too');
select pg_temp.check((select count(*) from gallery) = 2, 'receptionist sees all gallery items');
select pg_temp.check((select count(*) from dashboard_next_7_days) = 14, 'dashboard view: 7 days x 2 branches');
select pg_temp.check((select sum(n) from dashboard_next_7_days) > 0, 'dashboard view counts bookings');
select pg_temp.check((select count(*) from patient_summary) > 0, 'receptionist sees patient summary');
with u as (update appointments set status = 'confirmed' where date = clinic_today() + 3 and status <> 'cancelled' returning 1)
select pg_temp.check((select count(*) from u) > 0, 'receptionist can confirm appointments');
-- Re-opening a cancelled appointment whose slot was re-booked is refused
select pg_temp.expect_error(format($q$update appointments set status = 'confirmed' where ref_code = %L$q$, :'ref1'), 'appointments_slot_unique');
with u as (update settings set value = 'true' where key = 'booking_fee_enabled' returning 1)
select pg_temp.check((select count(*) from u) = 0, 'receptionist cannot change settings');
with u as (update branches set phone = 'x' returning 1)
select pg_temp.check((select count(*) from u) = 0, 'receptionist cannot change branch details');
with d as (delete from patients returning 1)
select pg_temp.check((select count(*) from d) = 0, 'receptionist cannot delete patients');
select pg_temp.expect_error($q$insert into staff (user_id, role) values ('00000000-0000-0000-0000-00000000000c', 'owner')$q$, 'row-level security');
with u as (update staff set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b' returning 1)
select pg_temp.check((select count(*) from u) = 0, 'receptionist cannot promote themselves');
insert into blocked_dates (branch_id, date, reason) values (:'koraput', clinic_today() + 20, 'Staff can block dates');

-- Owner
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
with u as (update settings set value = '100' where key = 'booking_fee_amount' returning 1)
select pg_temp.check((select count(*) from u) = 1, 'owner can change settings');
insert into staff (user_id, role, email) values ('00000000-0000-0000-0000-00000000000c', 'receptionist', 'stranger@example.com');
with d as (delete from patients where phone = '9876543210' returning id)
select pg_temp.check((select count(*) from d) = 1, 'owner can delete a patient');
select pg_temp.check((select count(*) from appointments a join patients p on p.id = a.patient_id where p.phone = '9876543210') = 0,
  'deleting a patient removes their appointments');
reset role;
reset request.jwt.claim.sub;
select pg_temp.check((select count(*) from appointments a where not exists (select 1 from patients p where p.id = a.patient_id)) = 0,
  'no orphaned appointments');

-- Data retention ---------------------------------------------------------------
insert into patients (id, name, phone, created_at) values ('00000000-0000-0000-0000-0000000000f1', 'Old Patient', '9000000099', now() - interval '3 years');
insert into appointments (ref_code, patient_id, branch_id, date, slot_start, consent, status)
values ('VDC-OLD1', '00000000-0000-0000-0000-0000000000f1', :'koraput', clinic_today() - 800, '10:00', true, 'completed');
select pg_temp.check(purge_expired_patients(12) >= 1, 'purge removes patients inactive for 12 months');
select pg_temp.check(not exists (select 1 from appointments where ref_code = 'VDC-OLD1'), 'purged patient appointments are gone');
select pg_temp.check((select count(*) from patients where phone = '9123456789') = 1, 'recent patients are kept');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_error('select purge_expired_patients(12)', 'permission denied');
reset role;
