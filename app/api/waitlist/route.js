export async function POST(request) {
  const { email, year } = await request.json()
  const res = await fetch("https://vwotkstjgzwjjutzjjph.supabase.co/rest/v1/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": "sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj",
      "Authorization": "Bearer sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj"
    },
    body: JSON.stringify({ email, year })
  })
  return new Response(JSON.stringify({ ok: res.ok }), { status: 200 })
}
}
