
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY;
  return NextResponse.json({ 
    hasServiceKey, 
    hasSecretKey,
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  });
}
