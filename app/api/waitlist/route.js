export async function POST(request) {
  const { email, year } = await request.json()
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  const res = await fetch("https://vwotkstjgzwjjutzjjph.supabase.co/rest/v1/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    },
    body: JSON.stringify({ email, year })
  })
  return new Response(JSON.stringify({ ok: res.ok }), { status: 200 })
}
