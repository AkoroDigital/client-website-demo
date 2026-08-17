// Serverless function triggered by a Supabase Database Webhook whenever
// a new row is inserted into the "leads" table — whether it came from
// the public Contact form or was added by hand inside the CRM. Sends a
// text to the business owner via Twilio.
//
// The real Twilio credentials and the shared webhook secret live only
// in Vercel's environment variables, never in this repo.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Confirm this call actually came from Supabase's webhook, not just
  // anyone who found this URL — Supabase sends this header because
  // we configure it to when the webhook is set up.
  const providedSecret = req.headers['x-webhook-secret'];
  if (!process.env.SUPABASE_WEBHOOK_SECRET || providedSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, table, record } = req.body || {};
  if (type !== 'INSERT' || table !== 'leads' || !record) {
    return res.status(400).json({ error: 'Unexpected payload' });
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, OWNER_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !OWNER_PHONE_NUMBER) {
    console.error('Twilio/owner environment variables are not fully set');
    return res.status(500).json({ error: 'SMS is not configured yet.' });
  }

  const name = record.name || 'Someone';
  const phone = record.phone || 'no phone given';
  const details = (record.details || '').slice(0, 160);

  const body = `New lead: ${name}, ${phone}. ${details}`.slice(0, 300);

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: OWNER_PHONE_NUMBER, From: TWILIO_FROM_NUMBER, Body: body });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error', data);
      return res.status(502).json({ error: 'Failed to send text.' });
    }

    return res.status(200).json({ sent: true, sid: data.sid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
