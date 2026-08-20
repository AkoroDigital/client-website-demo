// Server-only Supabase access using the service_role key, which
// bypasses Row Level Security entirely. This file must only ever be
// required from files under /api (server-side serverless functions) —
// never bundled into anything served to the browser. It lives outside
// /api specifically so Vercel doesn't turn it into a public route.
//
// Uses plain fetch() against Supabase's REST API (no SDK / npm
// dependency needed), same approach as the Anthropic and Twilio calls
// elsewhere in this project.

function baseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function url(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

async function selectOne(table, filterQuery) {
  const res = await fetch(url(`${table}?${filterQuery}&limit=1`), { headers: baseHeaders() });
  if (!res.ok) throw new Error(`Supabase select failed on ${table}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function select(table, filterQuery) {
  const res = await fetch(url(`${table}?${filterQuery}`), { headers: baseHeaders() });
  if (!res.ok) throw new Error(`Supabase select failed on ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertOne(table, payload) {
  const res = await fetch(url(table), {
    method: 'POST',
    headers: { ...baseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase insert failed on ${table}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0];
}

async function updateOne(table, id, payload) {
  const res = await fetch(url(`${table}?id=eq.${id}`), {
    method: 'PATCH',
    headers: { ...baseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase update failed on ${table}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0];
}

module.exports = { selectOne, select, insertOne, updateOne };
