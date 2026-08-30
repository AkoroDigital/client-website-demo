// Twilio calls this once the caller finishes speaking (see the
// <Gather> in api/voice-status.js). Creates a Lead from what they
// said, emails the owner directly (Supabase's Database Webhooks
// aren't available on this project, so we don't rely on that), and
// confirms out loud that it was received.

const { validateTwilioSignature, requestUrl } = require('../lib/twilio-verify');
const { insertOne } = require('../lib/supabase-admin');
const { sendEmail } = require('../lib/send-email');

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

    if (process.env.OWNER_EMAIL) {
      const crmUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}/app/leads.html`;
      await sendEmail({
        to: process.env.OWNER_EMAIL,
        subject: 'New lead: missed call (phone)',
        text: `Phone: ${callerNumber}\nSource: phone\n\nVoicemail transcript: "${SpeechResult}"\n\nOpen the CRM to follow up: ${crmUrl}`,
      });
    }
  } catch (err) {
    console.error('voice-gather error', err);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Got it, thanks. Someone will call you back as soon as possible.</Say>
  <Hangup/>
</Response>`);
};
