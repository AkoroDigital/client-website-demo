// Connects this app to Supabase — and automatically uses the right
// project depending on where the site is running:
//   - On your computer (localhost)   -> the TEST project
//   - On the real deployed website   -> the PRODUCTION project
//
// This means you can freely create fake clients, fake jobs, weird
// test data, etc. while building and testing, with zero chance of
// it ever touching the real system the client's team will use.
//
// The "anon" key below is the public key — safe to have in
// browser-visible code (see the note in schema.sql). Never put the
// "service_role" key here or anywhere client-side.

const SUPABASE_CONFIG = {
  test: {
    url: 'https://bosqowdgeqaqvikdedhc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvc3Fvd2RnZXFhcXZpa2RlZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMTcxNjAsImV4cCI6MjEwMTg5MzE2MH0.X52dq6NzuQhT2Uf_EssCphBAXkERwJ4DoZvxVPYgBVg',
  },
  // TODO before real client handoff: create a second, clean Supabase
  // project for production, run supabase/schema.sql against it, and
  // fill in its URL + anon key here. Until this is filled in, the
  // live deployed site will keep using the test project as a
  // fallback — that's fine while we're still building, but must be
  // done before the client's team starts entering real data.
  production: {
    url: '',
    anonKey: '',
  },
};

const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const envName = isLocal ? 'test' : 'production';
const config = SUPABASE_CONFIG[envName].url ? SUPABASE_CONFIG[envName] : SUPABASE_CONFIG.test;

const supabaseClient = supabase.createClient(config.url, config.anonKey);
