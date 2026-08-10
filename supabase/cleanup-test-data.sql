-- ============================================================
-- CLEANUP: clear out test data before the client's team starts
-- using this for real.
--
-- What this empties: clients, leads, jobs, estimates, invoices,
-- invoice line items, payments, documents, recurring job templates
-- — i.e. anything that could hold a fake test record.
--
-- What this leaves alone:
--   - "services" (your real price list)
--   - "profiles" / team logins (your real accounts, including yours)
--
-- Run this ONCE, right when you're ready to hand this off for real
-- use. After running it, every list in the app will be empty.
-- ============================================================

truncate table
  public.payments,
  public.invoice_items,
  public.invoices,
  public.estimate_items,
  public.estimates,
  public.documents,
  public.jobs,
  public.recurring_jobs,
  public.leads,
  public.clients
cascade;

-- Sanity check — every number below should read 0
select
  (select count(*) from public.clients)        as clients,
  (select count(*) from public.leads)          as leads,
  (select count(*) from public.jobs)            as jobs,
  (select count(*) from public.estimates)       as estimates,
  (select count(*) from public.invoices)        as invoices,
  (select count(*) from public.payments)        as payments,
  (select count(*) from public.documents)       as documents,
  (select count(*) from public.recurring_jobs)  as recurring_jobs;
