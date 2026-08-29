// Twilio calls this after the attempt to ring the owner's cell
// finishes (answered, no-answer, busy, or failed). If nobody picked
// up, this plays a message and listens for the caller to describe
// what they need — Twilio transcribes it live, and api/voice-gather.js
// turns that into a Lead and emails the owner.
//
// This is voice-only on purpose: SMS from a business number needs
// carrier registration (A2P), which is still pending. Voice calls
// don't require that, so this works today. Once A2P clears, this
// can be pointed back at the text-based flow in api/sms-incoming.js
// (that code is untouched and ready to go — just swap what this
// function does in the "missed" branch below).

const { validateTwilioSignature, requestUrl } = require('../lib/twilio-verify');

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

  const { DialCallStatus } = req.body || {};
  const missed = ['no-answer', 'busy', 'failed', 'canceled'].includes(DialCallStatus);

  res.setHeader('Content-Type', 'text/xml');

  if (!missed) {
    // Owner answered normally — nothing to do.
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }

  const gatherUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}/api/voice-gather`;

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${gatherUrl}" method="POST" speechTimeout="auto" timeout="8">
    <Say>Sorry we missed you. Please say your name, the address, and what's going on, and someone will call you back as soon as possible.</Say>
  </Gather>
  <Say>Sorry, I didn't catch that. Please call back when you can, or we'll follow up soon.</Say>
  <Hangup/>
</Response>`);
};
