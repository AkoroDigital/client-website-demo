// Twilio calls this after the attempt to ring the owner's cell
// finishes (answered, no-answer, busy, or failed). If nobody picked
// up, this texts the caller back, creates a Lead (which also
// triggers the existing SMS-to-owner notification), and starts the
// SMS conversation thread the AI will continue in api/sms-incoming.js.

const { validateTwilioSignature, requestUrl } = require('../lib/twilio-verify');
const { insertOne } = require('../lib/supabase-admin');

const FIRST_MESSAGE =
  "Sorry we missed your call — this is Business Name's assistant. I can help right now over text: what's going on, and what's the address?";

async function sendSms(to, body) {
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER, Body: body });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio send failed: ${response.status} ${text}`);
  }
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

  const { DialCallStatus, From: callerNumber } = req.body || {};
  const missed = ['no-answer', 'busy', 'failed', 'canceled'].includes(DialCallStatus);

  if (!missed) {
    // Owner answered normally — nothing to do.
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }

  try {
    const lead = await insertOne('leads', {
      name: 'Unknown (missed call)',
      phone: callerNumber,
      details: 'Missed call. AI assistant is following up by text.',
      status: 'new',
    });

    await insertOne('sms_threads', {
      phone: callerNumber,
      lead_id: lead.id,
      messages: [{ role: 'assistant', content: FIRST_MESSAGE }],
    });

    await sendSms(callerNumber, FIRST_MESSAGE);
  } catch (err) {
    console.error('voice-status error', err);
    // Even if something above failed, still let the caller know
    // something is coming rather than just going silent.
  }

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry we missed you. We're sending you a text right now so we can help.</Say>
  <Hangup/>
</Response>`);
};
