// Called directly by the browser right after a lead is inserted —
// from the public Contact form, or the CRM's "Add lead" — instead of
// relying on a Supabase Database Webhook. That feature turned out not
// to be initialized on this Supabase project (a platform-level issue,
// not fixable from the dashboard), so this is the reliable substitute:
// same result, one less moving part that can silently fail.
//
// This never trusts the email content from the browser — it looks the
// lead back up by ID using the service_role key, so the only way to
// trigger a real notification is to have actually created a real lead
// first (a random guess at an ID won't find anything to send).

const { selectOne } = require('../lib/supabase-admin');
const { sendEmail } = require('../lib/send-email');

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

  if (isRateLimited()) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { leadId } = req.body || {};
  if (!leadId) {
    return res.status(400).json({ error: 'Missing leadId' });
  }

  if (!process.env.OWNER_EMAIL || !process.env.RESEND_API_KEY) {
    console.error('OWNER_EMAIL/RESEND_API_KEY environment variables are not fully set');
    return res.status(500).json({ error: 'Email notifications are not configured yet.' });
  }

  try {
    const lead = await selectOne('leads', `id=eq.${leadId}`);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const crmUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}/app/leads.html`;

    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject: `New lead: ${lead.name || 'Someone'} (${lead.source || 'unknown'})`,
      text: `Name: ${lead.name || 'Someone'}\nPhone: ${lead.phone || 'no phone given'}\nSource: ${lead.source || 'unknown'}\n\n${lead.details || ''}\n\nOpen the CRM to follow up: ${crmUrl}`,
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send notification email.' });
  }
};
