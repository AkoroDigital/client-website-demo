// Twilio Voice webhook — set as the "A call comes in" URL on your
// Twilio number. Rings the owner's cell; if it goes unanswered,
// Twilio calls /api/voice-status next, which starts the text-back.

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

  const ownerNumber = process.env.OWNER_PHONE_NUMBER;
  const statusUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}/api/voice-status`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" action="${statusUrl}" method="POST">
    <Number>${ownerNumber}</Number>
  </Dial>
</Response>`);
};
