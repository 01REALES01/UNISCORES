import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get Tenis disciplina_id
    const { data: disc, error: discError } = await supabase
      .from('disciplinas')
      .select('id')
      .ilike('name', 'Tenis')
      .single();

    if (discError || !disc) {
      return NextResponse.json({ error: 'Disciplina "Tenis" no encontrada en la DB' }, { status: 400 });
    }

    const disciplina_id = disc.id;

    // Delete all tennis matches (first round and group stage)
    const { data: deletedMatches, error: deleteError } = await supabase
      .from('partidos')
      .delete()
      .eq('disciplina_id', disciplina_id)
      .select('id');

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const deleted = deletedMatches?.length || 0;

    return NextResponse.json({
      deleted,
      message: `${deleted} partidos de tenis eliminados`,
    });
  } catch (err: any) {
    console.error('Tennis bracket delete error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
