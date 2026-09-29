-- Row level security.
-- Public (anon): read-only access to what the website shows.
-- Bookings never come straight from the browser: /api/bookings uses the
-- service role key, which bypasses RLS, after validating the request.
-- Staff: full access to clinic data. Only owners change settings, staff,
-- branch details, or delete patients.

alter table public.branches enable row level security;
alter table public.branch_hours enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.doctors enable row level security;
alter table public.treatments enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;
alter table public.gallery enable row level security;
alter table public.settings enable row level security;
alter table public.staff enable row level security;
alter table public.booking_attempts enable row level security;  -- no policies: service role only

-- Public website reads
create policy "Public reads branches" on public.branches for select using (true);
create policy "Public reads hours" on public.branch_hours for select using (true);
create policy "Public reads blocked dates" on public.blocked_dates for select using (true);
create policy "Public reads visible treatments" on public.treatments for select using (visible or public.is_staff());
create policy "Public reads active doctors" on public.doctors for select using (active or public.is_staff());
create policy "Public reads visible reviews" on public.reviews for select using (visible or public.is_staff());
create policy "Public reads consented gallery" on public.gallery for select using ((visible and consent_confirmed) or public.is_staff());
create policy "Public reads public settings" on public.settings for select
  using (key in ('emergency_number', 'booking_fee_enabled', 'booking_fee_amount') or public.is_staff());

-- Staff (owner and receptionist)
create policy "Staff manage hours" on public.branch_hours for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage blocked dates" on public.blocked_dates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage doctors" on public.doctors for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage treatments" on public.treatments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage reviews" on public.reviews for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage gallery" on public.gallery for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff read patients" on public.patients for select to authenticated using (public.is_staff());
create policy "Staff add patients" on public.patients for insert to authenticated with check (public.is_staff());
create policy "Staff edit patients" on public.patients for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff read appointments" on public.appointments for select to authenticated using (public.is_staff());
create policy "Staff add appointments" on public.appointments for insert to authenticated with check (public.is_staff());
create policy "Staff edit appointments" on public.appointments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff read staff list" on public.staff for select to authenticated using (public.is_staff());

-- Owner only
create policy "Owner edits branches" on public.branches for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "Owner edits settings" on public.settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "Owner manages staff" on public.staff for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "Owner deletes patients" on public.patients for delete to authenticated using (public.is_owner());
create policy "Owner deletes appointments" on public.appointments for delete to authenticated using (public.is_owner());

-- Photo storage: public bucket, WebP only, 500 KB max. Staff upload and remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 512000, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
create policy "Staff update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff());
create policy "Staff delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());
