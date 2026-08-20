-- ============================================================
-- SMS conversation state, for the after-hours missed-call assistant
--
-- This holds the in-progress text conversation between the AI and a
-- caller who didn't get through. It is NOT reachable by the anon key
-- or by logged-in team members through the normal app — only the
-- server-side functions (using the service_role key) can touch it.
-- RLS is enabled with zero policies, which means "nobody" for every
-- normal role; service_role bypasses RLS entirely by design, which
-- is what the serverless functions use.
-- ============================================================

create table public.sms_threads (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  booked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sms_threads_set_updated_at before update on public.sms_threads
  for each row execute function public.set_updated_at();

alter table public.sms_threads enable row level security;
-- Deliberately no policies added: this locks the table to service_role
-- access only, which is exactly what we want here.
