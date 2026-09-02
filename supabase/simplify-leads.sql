-- ============================================================
-- Simplify the Leads page for day-to-day use.
--
-- Adds a "job value" dollar figure directly on the lead, and swaps
-- the "booked" status for "won" — so a lead's whole story fits in
-- one line: who called, where they came from, have they been
-- contacted, what's the job worth, and did they win or lose it.
-- ============================================================

alter table public.leads
  add column job_value numeric(10,2);

update public.leads set status = 'won' where status = 'booked';

alter table public.leads drop constraint leads_status_check;
alter table public.leads
  add constraint leads_status_check check (status in ('new','contacted','won','lost'));
