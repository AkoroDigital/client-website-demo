// Serverless function triggered by a Supabase Database Webhook whenever
// a new row is inserted into the "leads" table — whether it came from
// the public Contact form, was added by hand inside the CRM, or came
// from the missed-call voicemail flow. Emails the business owner.
//
// This uses email rather than SMS on purpose: SMS from a business
// number requires carrier registration (A2P), which takes time to
// clear. Email needs no such process, so this works immediately.
// Once A2P is approved, texting can be added back alongside this
// (see the note in api/voice-status.js).

const { sendEmail } = require('../lib/send-email');

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

  if (!process.env.OWNER_EMAIL || !process.env.RESEND_API_KEY) {
    console.error('OWNER_EMAIL/RESEND_API_KEY environment variables are not fully set');
    return res.status(500).json({ error: 'Email notifications are not configured yet.' });
  }

  const name = record.name || 'Someone';
  const phone = record.phone || 'no phone given';
  const source = record.source || 'unknown';
  const details = record.details || '';
  const crmUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}/app/leads.html`;

  try {
    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject: `New lead: ${name} (${source})`,
      text: `Name: ${name}\nPhone: ${phone}\nSource: ${source}\n\n${details}\n\nOpen the CRM to follow up: ${crmUrl}`,
    });
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send notification email.' });
  }
};
