import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// These 3 matches were created without fase/grupo, making them invisible
// to the classification view. We only need to set fase='grupos' and grupo.
const FIXES = [
    { id: 2295, grupo: 'A' },
    { id: 2304, grupo: 'B' },
    { id: 2306, grupo: 'B' },
];

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

        const results: { id: number; ok: boolean; error?: string }[] = [];

        for (const fix of FIXES) {
            const { error } = await supabase
                .from('partidos')
                .update({ fase: 'grupos', grupo: fix.grupo })
                .eq('id', fix.id);

            results.push({ id: fix.id, ok: !error, error: error?.message });
        }

        const updated = results.filter(r => r.ok).length;
        const failed = results.filter(r => !r.ok);

        return NextResponse.json({ updated, failed, results });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
