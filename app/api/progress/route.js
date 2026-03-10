import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  'https://vwotkstjgzwjjutzjjph.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(req) {
  try {
    const { user_id, specialty, note_id, event, metadata } = await req.json()

    if (!user_id || !specialty || !note_id || !event) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { error } = await supabase.from('progress').insert({
      user_id,
      specialty,
      note_id,
      event,
      metadata: metadata || {},
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
