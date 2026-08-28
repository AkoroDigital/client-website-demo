// Server-only email sending via Resend (https://resend.com) — chosen
// specifically because it needs no carrier-style registration process
// like SMS does, just an API key, so it works today while A2P is
// still pending. Plain fetch(), no SDK/npm dependency.

async function sendEmail({ to, subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

module.exports = { sendEmail };
