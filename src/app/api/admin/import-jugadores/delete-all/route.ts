// POST /api/admin/import-jugadores/delete-all
// Delete all jugadores (destructive operation, requires confirmation)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check that user is admin (data_entry role cannot delete all)
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!profile?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Only admins can delete all jugadores' }, { status: 403 });
    }

    // Delete only Excel-imported jugadores that have NOT linked a profile yet
    // Rules:
    //   email IS NOT NULL → came from Excel import
    //   profile_id IS NULL → student hasn't registered yet (if they did, keep their record)
    const { error, count } = await supabase
      .from('jugadores')
      .delete()
      .not('email', 'is', null)
      .is('profile_id', null);

    if (error) {
      console.error('[delete-all] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: count || 0 });
  } catch (err: any) {
    console.error('[delete-all] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
