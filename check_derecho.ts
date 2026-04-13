import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function check() {
  const { data: matches, error } = await supabase
    .from('partidos')
    .select('id, equipo_a, equipo_b, carrera_a_id, carrera_b_id, delegacion_a_id, delegacion_b_id, carrera_a(id, nombre, escudo_url), carrera_b(id, nombre, escudo_url), delegacion_a_info:delegaciones!delegacion_a_id(id, nombre, escudo_url), delegacion_b_info:delegaciones!delegacion_b_id(id, nombre, escudo_url)')
    .or('equipo_a.ilike.%Derecho%,equipo_b.ilike.%Derecho%')
    .limit(5)

  if (error) {
    console.error('Error fetching matches:', error)
    return
  }

  console.log(JSON.stringify(matches, null, 2))
}

check()
