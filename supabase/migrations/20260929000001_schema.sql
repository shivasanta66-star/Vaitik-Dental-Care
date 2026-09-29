-- Vaitik Dental Care: tables.
-- All times are clinic-local (Asia/Kolkata). Dates are plain dates, times are plain times.

create type public.appointment_status as enum ('new', 'confirmed', 'completed', 'no_show', 'cancelled');
create type public.staff_role as enum ('owner', 'receptionist');
create type public.payment_status as enum ('not_required', 'pending', 'paid', 'failed');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_odia text,
  tagline text,
  short_label text,
  address text not null,
  landmark text,
  phone text not null,               -- display format, e.g. +91 82494 20328
  whatsapp text not null,            -- digits with country code, e.g. 918249420328
  maps_url text,
  lat double precision,
  lng double precision,
  sort smallint not null default 0
);

-- One row per open weekday (0 = Sunday … 6 = Saturday). No row = closed that day.
create table public.branch_hours (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  slot_minutes smallint not null default 30 check (slot_minutes in (15, 30, 45, 60)),
  unique (branch_id, weekday),
  check (closes > opens)
);

-- branch_id null = closed at every branch that day.
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  date date not null,
  reason text,
  unique nulls not distinct (branch_id, date)
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qualification text,
  reg_no text,
  photo_url text,
  branch_ids uuid[] not null default '{}',
  schedule_text text,                -- e.g. "Koraput Mon–Sat, Semiliguda Sun evening"
  focus text,                        -- one line on what they mostly do
  active boolean not null default true,
  sort smallint not null default 0
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  blurb text,
  icon text not null default 'ph-tooth',  -- Phosphor icon class
  price_text text,
  sort smallint not null default 0,
  visible boolean not null default true
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null unique check (phone ~ '^[6-9][0-9]{9}$'),  -- Indian mobile, no +91
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null,
  patient_id uuid not null references public.patients (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  treatment_id uuid references public.treatments (id) on delete set null,
  concern text,                      -- what the patient picked, e.g. "Tooth pain / emergency"
  date date not null,
  slot_start time not null,
  status public.appointment_status not null default 'new',
  note text check (char_length(note) <= 200),
  internal_note text,
  consent boolean not null check (consent),
  source text not null default 'website' check (source in ('website', 'admin', 'phone', 'walk_in')),
  payment_status public.payment_status not null default 'not_required',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_ref_code_key unique (ref_code)
);

-- A slot can hold one live appointment. Cancelling frees it.
create unique index appointments_slot_unique
  on public.appointments (branch_id, date, slot_start)
  where status <> 'cancelled';
create index appointments_date_idx on public.appointments (date);
create index appointments_patient_idx on public.appointments (patient_id);
create index appointments_order_idx on public.appointments (razorpay_order_id) where razorpay_order_id is not null;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_initial text not null,
  text text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  branch_id uuid references public.branches (id) on delete set null,
  visible boolean not null default true,
  sort smallint not null default 0
);

create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  before_url text,
  after_url text,
  caption text not null,
  consent_confirmed boolean not null default false,
  visible boolean not null default false,
  sort smallint not null default 0,
  -- Nothing goes on the website without written patient consent.
  check (not visible or consent_confirmed)
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null default 'receptionist',
  name text,
  email text,
  created_at timestamptz not null default now()
);

-- Booking rate limit (5 per 10 minutes per IP). Stores a salted hash, never the IP itself.
create table public.booking_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index booking_attempts_ip_idx on public.booking_attempts (ip_hash, created_at);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
