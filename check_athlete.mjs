import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const name = "ANDRES FELIPE ZAPATA MARZAN";
    console.log("Searching for:", name);

    const { data: p } = await supabase.from('profiles').select('id, full_name').ilike('full_name', `%${name}%`);
    console.log("Profiles matching full name:", p);

    const { data: j } = await supabase.from('jugadores').select('id, nombre, profile_id').ilike('nombre', `%${name}%`);
    console.log("Players matching full name:", j);
    
    // Also partial search
    const part = "ZAPATA MARZAN";
    console.log("Searching partial for:", part);
    const { data: j2 } = await supabase.from('jugadores').select('id, nombre').ilike('nombre', `%${part}%`);
    console.log("Players matching partial 'ZAPATA MARZAN':", j2);

    const { data: p2 } = await supabase.from('profiles').select('id, full_name').ilike('full_name', `%${part}%`);
    console.log("Profiles matching partial 'ZAPATA MARZAN':", p2);
}

check();
