-- ============================================================
-- Allow the public Contact form to create leads
--
-- Every table right now requires a team login for every operation,
-- including reading — correct for all of them except one: the
-- public Contact form needs to be able to CREATE a lead without
-- anyone being logged in (it's filled out by strangers on the
-- internet). This adds one narrow exception:
--
--   - Anyone (no login) may INSERT a new lead.
--   - They still cannot read, edit, or delete ANY lead, or touch
--     any other table. The existing "team full access" policy is
--     unaffected and still governs everything else.
--   - The new lead is forced to start as status "new" with no
--     client attached yet, even if someone tries to submit
--     something else directly — only your team can change that
--     from inside the CRM.
--
-- This is the same pattern a physical mailbox uses: anyone can drop
-- a letter in, only you have the key to open it and read what's
-- inside.
-- ============================================================

create policy "public can submit a lead" on public.leads
  for insert
  to anon
  with check (status = 'new' and converted_client_id is null);
