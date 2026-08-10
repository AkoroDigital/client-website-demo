-- ============================================================
-- CLIENT RESOURCE MANAGEMENT — DATABASE SCHEMA
--
-- What this file does, in plain English:
--   1. Creates every table the internal app needs (clients, jobs,
--      estimates, invoices, etc.)
--   2. Locks every single one of them down so NOTHING is readable
--      or writable by anyone who isn't logged in as a team member
--      (this is the "Row Level Security" section near the bottom)
--   3. Loads in your current service price list as a starting point
--
-- How to run it: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. It's safe to run once. If you ever
-- need to re-run it, the table-creation lines will error on already-
-- existing tables (that's expected and not harmful).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helper: keep an "updated_at" column current ----------
-- Whenever a row in a table changes, this automatically stamps it
-- with the current time, so you can always tell when something was
-- last touched.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- TEAM PROFILES
-- Supabase Auth already handles logins and passwords in its own
-- built-in table (auth.users) that we never touch directly or see
-- passwords in. This table just adds a display name for each person,
-- so job assignments can show "Assigned to: Mike" instead of a code.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- Automatically create a profile row the moment someone's account is
-- created, so this never has to be done by hand.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SERVICES — your standard price list, so estimates and invoices
-- pull consistent pricing instead of being retyped every time.
-- ============================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_price numeric(10,2) not null,
  unit text not null default 'flat', -- 'flat' or 'per day'
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- ============================================================
-- LEADS — incoming inquiries, before they become a client/job
-- ============================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  details text,
  status text not null default 'new' check (status in ('new','contacted','booked','lost')),
  converted_client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ============================================================
-- ESTIMATES (+ line items)
-- ============================================================
create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','sent','approved','declined')),
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger estimates_set_updated_at before update on public.estimates
  for each row execute function public.set_updated_at();

create table public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null
);

-- ============================================================
-- JOBS — the center of the whole system
-- ============================================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  estimate_id uuid references public.estimates(id) on delete set null,
  service_summary text not null,
  status text not null default 'new' check (status in ('new','in_progress','drying','complete','cancelled')),
  address text,
  assigned_to uuid references public.profiles(id) on delete set null,
  scheduled_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ============================================================
-- RECURRING JOB TEMPLATES
-- Not automatic on a timer (fewer moving parts to break) — instead,
-- the app will show you what's "due" and let you generate the next
-- job with one click.
-- ============================================================
create table public.recurring_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_summary text not null,
  frequency text not null check (frequency in ('weekly','monthly','quarterly','yearly')),
  next_due_date date not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVOICES (+ line items) and PAYMENTS
-- Payments are tracked as a separate log (not just a "paid" flag)
-- because restoration jobs often get paid in stages via insurance.
-- ============================================================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue','void')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null default 'other' check (method in ('check','cash','card','insurance','other')),
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
-- Note: this only ever stores a dollar amount and a method label like
-- "card" — never a real card number. If online card payments are
-- added later, that goes through a dedicated processor (e.g. Stripe),
-- never through this database.

-- ============================================================
-- DOCUMENTS — photos, insurance paperwork, moisture readings
-- The actual files live in Supabase Storage (set up separately);
-- this table just tracks what each file is and which job it's for.
-- ============================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  file_path text not null,
  file_type text not null default 'photo' check (file_type in ('photo','insurance','moisture_reading','other')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SECURITY: lock every table down, then allow your logged-in team.
--
-- "Row Level Security" (RLS) is enforced by the database itself, not
-- by the app's code — meaning even if there were a bug in a page's
-- JavaScript, or someone found your database URL, they still could
-- not read or change anything without a valid team login. This is
-- the same mechanism real SaaS products rely on.
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.services       enable row level security;
alter table public.clients        enable row level security;
alter table public.leads          enable row level security;
alter table public.estimates      enable row level security;
alter table public.estimate_items enable row level security;
alter table public.jobs           enable row level security;
alter table public.recurring_jobs enable row level security;
alter table public.invoices       enable row level security;
alter table public.invoice_items  enable row level security;
alter table public.payments       enable row level security;
alter table public.documents      enable row level security;

-- Your whole team currently has the same access (per your earlier
-- call), so every table gets one simple rule: "must be logged in".
-- Splitting this into e.g. "field techs can't delete invoices" later
-- is a small change to make, table by table, whenever you want it.
create policy "team full access" on public.profiles       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.services       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.clients        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.leads          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.estimates      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.estimate_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.jobs           for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.recurring_jobs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.invoices       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.invoice_items  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.payments       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team full access" on public.documents      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Starting data: your current service price list
-- ============================================================
insert into public.services (name, default_price, unit) values
  ('Water extraction', 350.00, 'flat'),
  ('Structural drying', 75.00, 'per day'),
  ('Mold prevention', 180.00, 'flat'),
  ('Full restoration', 2500.00, 'flat');
