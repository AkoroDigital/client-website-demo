// Twilio SMS webhook — set as the "A message comes in" URL on your
// Twilio number. Continues the after-hours conversation started by
// api/voice-status.js (or starts a fresh one if someone texts in
// directly). Uses Claude with a tool the model calls only once the
// customer has clearly agreed on a specific day, so booking is a
// deliberate decision, not a guess parsed out of free text.

const { validateTwilioSignature, requestUrl } = require('../lib/twilio-verify');
const { selectOne, select, insertOne, updateOne } = require('../lib/supabase-admin');

const BOOK_TOOL = {
  name: 'book_appointment',
  description:
    "Call this ONLY once the customer has clearly agreed to a specific day for their appointment. Don't call it just because a date was mentioned in passing.",
  input_schema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'The agreed appointment date, in YYYY-MM-DD format.' },
      time_window: { type: 'string', description: "Rough time of day if mentioned, e.g. 'morning', 'afternoon'. Empty string if not specified." },
      customer_name: { type: 'string', description: "The customer's name, if given." },
      service_summary: { type: 'string', description: "Brief description of what they need, e.g. 'Water extraction, basement flooding'." },
      address: { type: 'string', description: 'Service address, if given. Empty string if not.' },
    },
    required: ['date', 'service_summary'],
  },
};

function systemPrompt(scheduleSummary) {
  return `You are texting on behalf of Business Name, a local water damage restoration company, following up with someone whose call went unanswered (it may be after hours, or the team was on another call).

Your job: figure out what they need, and if they want to schedule a visit, help them land on a specific day, then call book_appointment once they've clearly agreed to one.

Here is what's already on the schedule in the next few weeks (from the real job calendar):
${scheduleSummary || 'Nothing currently scheduled in this window.'}

Rules:
- Keep messages short — this is a text conversation. A sentence or two per message, not paragraphs.
- If this sounds like an active emergency (water actively spreading right now), your first line should say to call (555) 010-2030 immediately instead of continuing by text.
- Don't invent availability. Only reason from the schedule info given above. If a day already looks busy, say so plainly and suggest asking about a different day, rather than promising it works.
- Only call book_appointment once the customer has clearly agreed to a specific day. Try to get their name, what's going on, and the service address first if you don't have them yet — but don't interrogate; a couple of quick questions is enough.
- Never promise an exact time of day, only a rough window (morning/afternoon) at most — a real arrival window gets confirmed by a person separately.
- Plain, direct tone. No exclamation points, no corporate cheeriness, no emoji.
- You are an AI assistant texting after-hours — if asked directly, say so plainly.`;
}

async function callClaude(messages, scheduleSummary) {
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
      system: systemPrompt(scheduleSummary),
      tools: [BOOK_TOOL],
      messages,
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic error: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function getScheduleSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const jobs = await select(
    'jobs',
    `select=scheduled_date,service_summary&scheduled_date=gte.${today}&scheduled_date=lte.${end}&order=scheduled_date.asc`
  );
  const byDate = {};
  for (const j of jobs) {
    if (!j.scheduled_date) continue;
    byDate[j.scheduled_date] = (byDate[j.scheduled_date] || 0) + 1;
  }
  return Object.entries(byDate)
    .map(([date, count]) => `${date}: ${count} job${count > 1 ? 's' : ''} already booked`)
    .join('\n');
}

function xmlEscape(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(message)}</Message></Response>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const signature = req.headers['x-twilio-signature'];
  const valid = validateTwilioSignature(requestUrl(req), req.body, signature, process.env.TWILIO_AUTH_TOKEN);
  if (!valid) {
    return res.status(403).send('Forbidden');
  }

  const { From: phone, Body: incomingText } = req.body || {};
  const text = String(incomingText || '').slice(0, 500);

  res.setHeader('Content-Type', 'text/xml');

  try {
    let thread = await selectOne('sms_threads', `phone=eq.${encodeURIComponent(phone)}`);

    if (!thread) {
      const lead = await insertOne('leads', {
        name: 'Unknown (text)',
        phone,
        details: 'Started a text conversation with the AI assistant.',
        status: 'new',
      });
      thread = await insertOne('sms_threads', { phone, lead_id: lead.id, messages: [] });
    }

    if (thread.booked) {
      return res.status(200).send(
        twiml("You're already on our schedule — if anything's changed, give us a call and we'll sort it out.")
      );
    }

    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    messages.push({ role: 'user', content: text });

    const scheduleSummary = await getScheduleSummary();
    const claudeHistory = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
    const result = await callClaude(claudeHistory, scheduleSummary);

    let replyText = '';
    let bookingCall = null;
    for (const block of result.content || []) {
      if (block.type === 'text') replyText += block.text;
      if (block.type === 'tool_use' && block.name === 'book_appointment') bookingCall = block.input;
    }

    let finalReply = replyText || "Got it — one moment.";
    let booked = false;

    if (bookingCall && bookingCall.date && bookingCall.service_summary) {
      const client = await insertOne('clients', {
        name: bookingCall.customer_name || 'Unknown caller',
        phone,
        address: bookingCall.address || null,
      });

      await insertOne('jobs', {
        client_id: client.id,
        lead_id: thread.lead_id || null,
        service_summary: bookingCall.service_summary,
        status: 'new',
        address: bookingCall.address || null,
        scheduled_date: bookingCall.date,
        notes: `Booked by AI text assistant.${bookingCall.time_window ? ' Preferred window: ' + bookingCall.time_window : ''}`,
      });

      await updateOne('leads', thread.lead_id, {
        name: bookingCall.customer_name || 'Unknown caller',
        status: 'booked',
        converted_client_id: client.id,
      });

      booked = true;
      const prettyDate = new Date(bookingCall.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      });
      finalReply = `You're set for ${prettyDate}${bookingCall.time_window ? ' (' + bookingCall.time_window + ')' : ''} — ${bookingCall.service_summary}. Our team will follow up to confirm the exact arrival window. Text us if anything changes.`;
    }

    messages.push({ role: 'assistant', content: finalReply });

    await updateOne('sms_threads', thread.id, {
      messages,
      booked,
    });

    if (thread.lead_id) {
      // Regenerate the full transcript each time (from the thread's own
      // messages, the source of truth) rather than appending piecemeal,
      // so staff always see the complete conversation with nothing lost.
      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
        .join('\n');
      await updateOne('leads', thread.lead_id, {
        details: `Text conversation with AI assistant:\n${transcript}`.slice(0, 4000),
      });
    }

    return res.status(200).send(twiml(finalReply));
  } catch (err) {
    console.error('sms-incoming error', err);
    return res.status(200).send(
      twiml("Sorry, having some trouble on our end — please call (555) 010-2030 and we'll help directly.")
    );
  }
};
