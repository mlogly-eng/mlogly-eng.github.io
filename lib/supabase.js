import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vwotkstjgzwjjutzjjph.supabase.co'
const supabaseKey = 'sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj'

export const supabase = createClient(supabaseUrl, supabaseKey)