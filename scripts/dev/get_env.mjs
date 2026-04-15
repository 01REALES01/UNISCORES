import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
