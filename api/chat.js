// Serverless function (runs on Vercel, not in the browser).
//
// This is the ONLY place the real Anthropic API key is ever used. The
// chat widget in the browser calls this endpoint, this endpoint calls
// Anthropic using the secret key from Vercel's environment variables,
// and only the reply text goes back to the browser. The key itself
// never touches any file in this repo or any response sent to a
// visitor.

const ALLOWED_ORIGINS = [
  'https://client-website-demo-eight.vercel.app',
  // add your real custom domain here once you have one, e.g.:
  // 'https://yourbusiness.com',
];

const SYSTEM_PROMPT = `You are the website assistant for Business Name, a local water damage restoration company. You help visitors understand our services and get them to the right next step, not to have a long conversation for its own sake.

Facts you can rely on:
- Services: water extraction (from $350), structural drying (from $75/day), mold prevention (from $180), full restoration (from $2,500).
- 24/7 emergency response, licensed and insured, IICRC-certified crew, no subcontractors.
- Average response time is about 45 minutes for active emergencies.
- To book, get a quote, or reach us: call (555) 010-2030, or use the Contact page.
- Exact hours and our address aren't published yet — if asked, say to call and ask directly rather than guessing.

Rules:
- If someone describes water actively spreading or an ongoing emergency, your first line should tell them to call (555) 010-2030 right now, before anything else.
- Never invent specific commitments — no promised arrival times, no naming a technician, no guaranteeing availability. Only a phone call or a real quote can confirm that.
- Keep answers short and plain, matching a direct, no-fluff tone. No corporate cheerfulness, no exclamation points.
- If asked something unrelated to water damage restoration or this business, say briefly that it's outside what you can help with here.
- You are an AI assistant, not a technician or office staff — don't imply otherwise.`;

// Very lightweight abuse guard: caps requests per serverless instance
// per minute. Resets whenever Vercel spins up a fresh instance, so
// this is a deterrent against rapid bursts, not a hard global limit —
// see the note sent alongside this file for the real backstop.
const requestLog = [];
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited() {
  const now = Date.now();
  while (requestLog.length && now - requestLog[0] > RATE_WINDOW_MS) requestLog.shift();
  if (requestLog.length >= RATE_LIMIT) return true;
  requestLog.push(now);
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const originHeader = req.headers.origin || req.headers.referer || '';
  const isLocal = originHeader.includes('localhost') || originHeader.includes('127.0.0.1');
  const isAllowed = isLocal || ALLOWED_ORIGINS.some((o) => originHeader.startsWith(o));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (isRateLimited()) {
    return res.status(429).json({ error: 'Too many requests, please slow down.' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  // Bound the cost/size of any single request regardless of what the
  // client sends: only the last 10 turns, each capped in length.
  const trimmed = messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in this environment');
    return res.status(500).json({ error: 'Assistant is not configured yet.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error', data);
      return res.status(502).json({ error: 'Assistant is unavailable right now.' });
    }

    const text = data.content?.[0]?.text || "Sorry, I couldn't come up with a response.";
    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
