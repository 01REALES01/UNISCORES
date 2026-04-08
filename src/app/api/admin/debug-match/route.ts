import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function normalizeName(name: string) {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, ' ');
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const name = searchParams.get('name') || "FELIPE ALFONSO JUVINAO ARAGON";
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const words = name.split(/\s+/).filter(w => w.length > 2);
    const [w1] = words.sort((a,b) => b.length - a.length);

    const { data: pros } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${w1}%`);

    const sNorm = normalizeName(name);
    const results = pros?.map(p => ({
        dbName: p.full_name,
        dbNorm: normalizeName(p.full_name),
        sNorm,
        match: normalizeName(p.full_name) === sNorm,
        p
    }));

    return NextResponse.json({
        search: name,
        w1,
        results
    });
}
