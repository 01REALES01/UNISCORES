const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
  // 1. Find the career "Derecho"
  const { data: carrera } = await supabase
    .from('carreras')
    .select('id, nombre, escudo_url')
    .ilike('nombre', '%Derecho%')
    .single()

  console.log('--- Carrera ---')
  console.log(carrera)

  if (carrera) {
    // 2. Find delegations that include this career
    const { data: delegaciones } = await supabase
      .from('delegaciones')
      .select('id, nombre, escudo_url, carrera_ids')
    
    const linkedDelegations = delegaciones.filter(d => 
      Array.isArray(d.carrera_ids) && d.carrera_ids.includes(carrera.id)
    )

    console.log('\n--- Delegaciones relacionadas ---')
    console.log(linkedDelegations)

    // 3. Check some matches for these delegations
    const delIds = linkedDelegations.map(d => d.id)
    const { data: matches } = await supabase
      .from('partidos')
      .select('id, equipo_a, equipo_b, carrera_a_id, delegacion_a_id')
      .or(`delegacion_a_id.in.(${delIds.join(',')}),delegacion_b_id.in.(${delIds.join(',')})`)
      .limit(3)
    
    console.log('\n--- Partidos recientes ---')
    console.log(matches)
  }
}

check()
