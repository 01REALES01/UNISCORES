import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { parseExcelBuffer, validateAndMatchRows } from '@/lib/excel-import';
import type { ImportContext } from '@/lib/excel-import';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const supabase = await createRouteSupabase();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, roles')
        .eq('id', user.id)
        .single();

    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Sin permisos para importar' }, { status: 403 });
    }

    // Parse form data
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        return NextResponse.json({ error: 'Solo se aceptan archivos .xlsx o .xls' }, { status: 400 });
    }

    // Parse Excel
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rows;
    let sheetNames: string[];
    try {
        const result = parseExcelBuffer(buffer);
        rows = result.rows;
        sheetNames = result.sheetNames;
    } catch (e: any) {
        return NextResponse.json({ error: `Error al parsear el archivo: ${e.message}` }, { status: 400 });
    }

    if (rows.length === 0) {
        return NextResponse.json({ error: 'El archivo no contiene datos reconocibles' }, { status: 400 });
    }

    // Fetch DB context for matching
    const [carrerasRes, disciplinasRes, partidosRes, jugadoresRes] = await Promise.all([
        supabase.from('carreras').select('id, nombre'),
        supabase.from('disciplinas').select('id, name'),
        supabase.from('partidos').select('id, carrera_a_id, carrera_b_id, disciplina_id, fecha, equipo_a, equipo_b').limit(500),
        supabase.from('jugadores').select('id, nombre, numero, carrera_id').limit(2000),
    ]);

    const context: ImportContext = {
        carreras: carrerasRes.data ?? [],
        disciplinas: disciplinasRes.data ?? [],
        partidos: partidosRes.data ?? [],
        jugadores: jugadoresRes.data ?? [],
    };

    // Validate and match rows
    const matchedRows = validateAndMatchRows(rows, context);

    const counts = {
        total_rows: matchedRows.length,
        rows_ok: matchedRows.filter(r => r.validation_status === 'ok').length,
        rows_warning: matchedRows.filter(r => r.validation_status === 'warning').length,
        rows_error: matchedRows.filter(r => r.validation_status === 'error').length,
    };

    // Insert import metadata
    const { data: importRecord, error: importError } = await supabase
        .from('excel_imports')
        .insert({
            uploaded_by: user.id,
            uploader_name: profile?.full_name ?? null,
            filename: file.name,
            file_size_bytes: file.size,
            status: 'pending',
            sheet_names: sheetNames,
            ...counts,
        })
        .select('id')
        .single();

    if (importError || !importRecord) {
        return NextResponse.json({ error: 'Error al guardar metadata del import' }, { status: 500 });
    }

    const importId = importRecord.id;

    // Batch insert rows (100 at a time)
    const CHUNK = 100;
    for (let i = 0; i < matchedRows.length; i += CHUNK) {
        const chunk = matchedRows.slice(i, i + CHUNK).map(r => ({
            import_id: importId,
            sheet_name: r.sheet_name,
            row_number: r.row_number,
            row_type: r.row_type,
            raw_data: r.raw_data,
            matched_data: r.matched_data,
            validation_status: r.validation_status,
            validation_messages: r.validation_messages,
        }));
        const { error: rowError } = await supabase.from('excel_import_rows').insert(chunk);
        if (rowError) {
            console.error('[import-excel] row insert error:', rowError.message);
        }
    }

    return NextResponse.json({ import_id: importId, ...counts });
}
