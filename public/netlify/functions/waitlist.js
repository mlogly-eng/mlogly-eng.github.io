exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const { email, year } = JSON.parse(event.body || '{}')

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) }
  }

  const SUPABASE_URL = 'https://vwotkstjgzwjjutzjjph.supabase.co'
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  const RESEND_KEY = process.env.RESEND_API_KEY

  // Save to Supabase
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ email, year, confirmed: false })
  })

  if (!dbRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save' }) }
  }

  // Send confirmation email via Resend
  const confirmUrl = `https://ventmed.netlify.app/.netlify/functions/confirm?email=${encodeURIComponent(email)}`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_KEY}`
    },
    body: JSON.stringify({
      from: 'Vent <hello@vent.med>',
      to: email,
      subject: 'Confirm your spot — Vent',
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:48px 32px;background:#0d0b08;color:#f5f2eb;">
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#c8452a;margin-bottom:32px;">VENT</div>
          <h1 style="font-size:42px;font-style:italic;font-weight:400;margin:0 0 16px;line-height:1.1;">You're almost<br>in.</h1>
          <p style="color:rgba(245,242,235,0.65);font-size:16px;line-height:1.75;margin:0 0 32px;">One click to confirm your spot on the Vent waitlist. We'll reach out when early access opens.</p>
          <a href="${confirmUrl}" style="display:inline-block;background:#c8452a;color:#f5f2eb;text-decoration:none;padding:14px 32px;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-family:monospace;">Confirm my spot →</a>
          <p style="color:rgba(245,242,235,0.3);font-size:12px;margin-top:48px;">If you didn't sign up for Vent, ignore this email.</p>
        </div>
      `
    })
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  }
}
