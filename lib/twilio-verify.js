// Confirms a webhook request genuinely came from Twilio, not just
// someone who found the URL. Without this, anyone could POST fake
// "call missed" or "text received" events and make the system send
// real SMS messages (and create fake leads/jobs) at the business's
// expense.
//
// Implements Twilio's request-signing scheme directly (HMAC-SHA1 over
// the URL + sorted form params) so no Twilio SDK / npm install is
// needed — consistent with the rest of this project.

const crypto = require('crypto');

function validateTwilioSignature(fullUrl, params, signature, authToken) {
  if (!signature || !authToken) return false;
  const sortedKeys = Object.keys(params || {}).sort();
  let data = fullUrl;
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  const expected = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  // constant-time comparison
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requestUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}${req.url}`;
}

module.exports = { validateTwilioSignature, requestUrl };
