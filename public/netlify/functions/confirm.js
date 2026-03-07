exports.handler = async (event) => {
  const email = event.queryStringParameters?.email

  if (!email) {
    return {
      statusCode: 302,
      headers: { Location: 'https://ventmed.netlify.app?confirmed=error' }
    }
  }

  const SUPABASE_URL = 'https://vwotkstjgzwjjutzjjph.supabase.co'
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

  await fetch(`${SUPABASE_URL}/rest/v1/waitlist?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ confirmed: true })
  })

  return {
    statusCode: 302,
    headers: { Location: `https://ventmed.netlify.app/confirmed` }
  }
}
