-- ============================================================
-- Lead source tracking + manual revenue + review tracking
--
-- What this adds:
--   - "source" on leads and clients — where the customer actually
--     came from (self-reported on the Contact form, or auto-tagged
--     "phone" by the missed-call assistant)
--   - "revenue" on jobs — a manually-entered dollar figure, the
--     number the dashboard's revenue-by-source report is built from
--   - "review_requested" / "review_notes" on jobs — lightweight
--     tracking for the last pipeline stage (Review)
-- ============================================================

alter table public.leads
  add column source text check (source in (
    'google_ads','google_search','instagram','facebook','referral','phone','website','other'
  ));

alter table public.clients
  add column source text check (source in (
    'google_ads','google_search','instagram','facebook','referral','phone','website','other'
  ));

alter table public.jobs
  add column revenue numeric(10,2),
  add column review_requested boolean not null default false,
  add column review_notes text;
