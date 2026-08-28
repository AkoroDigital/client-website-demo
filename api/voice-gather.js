// Twilio calls this once the caller finishes speaking (see the
// <Gather> in api/voice-status.js). Creates a Lead from what they
// said and confirms out loud that it was received. The owner gets
// notified separately by the existing Supabase webhook -> email flow
// (api/notify-lead.js), the same one every other lead already uses.

const { validateTwilioSignature, requestUrl } = require('../lib/twilio-verify');
const { insertOne } = require('../lib/supabase-admin');

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

  const { SpeechResult, From: callerNumber } = req.body || {};

  res.setHeader('Content-Type', 'text/xml');

  if (!SpeechResult) {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, I didn't catch that. Please call back when you can, or we'll follow up soon.</Say>
  <Hangup/>
</Response>`);
  }

  try {
    await insertOne('leads', {
      name: 'Unknown (missed call)',
      phone: callerNumber,
      details: `Voicemail transcript: "${SpeechResult}"`,
      status: 'new',
      source: 'phone',
    });
  } catch (err) {
    console.error('voice-gather error', err);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Got it, thanks. Someone will call you back as soon as possible.</Say>
  <Hangup/>
</Response>`);
};
