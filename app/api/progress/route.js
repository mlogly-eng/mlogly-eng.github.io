import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  'https://vwotkstjgzwjjutzjjph.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

// In-memory rate limiter: { [ip]: { count, resetAt } }
const rateLimit = new Map()
const WINDOW_MS  = 60 * 1000  // 1 minute window
const MAX_REQ    = 30          // max 30 requests per minute per IP

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimit.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  if (entry.count >= MAX_REQ) return true

  entry.count++
  return false
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimit.entries()) {
    if (now > entry.resetAt) rateLimit.delete(ip)
  }
}, 5 * 60 * 1000)

export async function POST(req) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const { specialty, note_id, note_name, event, ...rest } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    if (!specialty || !note_id || !event) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Validate event type
    const validEvents = ['opened', 'completed', 'mcq_done']
    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    const { error } = await supabase.from('progress').insert({
      user_id: user.id,
      specialty,
      note_id,
      note_name: note_name || note_id,
      event,
      metadata: rest,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
