import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  'https://vwotkstjgzwjjutzjjph.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(req) {
  try {
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
