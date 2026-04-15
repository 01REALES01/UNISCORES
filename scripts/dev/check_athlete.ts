import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function check() {
    const name = "ANDRES FELIPE ZAPATA MARZAN";
    console.log("Searching for:", name);

    const { data: p } = await supabase.from('profiles').select('id, full_name').ilike('full_name', `%${name}%`);
    console.log("Profiles matching:", p);

    const { data: j } = await supabase.from('jugadores').select('id, nombre, profile_id').ilike('nombre', `%${name}%`);
    console.log("Players matching:", j);
    
    // Also partial search
    const part = "ZAPATA MARZAN";
    const { data: j2 } = await supabase.from('jugadores').select('id, nombre').ilike('nombre', `%${part}%`);
    console.log("Players matching partial 'ZAPATA MARZAN':", j2);
}

check();
