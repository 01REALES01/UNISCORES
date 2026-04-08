import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CARRERAS_UNINORTE } from '@/lib/constants';

// --- Helpers de Parsing Fuzzy ---
function normalize(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

function similarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
}

const CARRERA_ALIASES: Record<string, string> = {
    'comunicacion social y period': 'Comunicación Social y Periodismo',
    'comunicacion social y periodis': 'Comunicación Social y Periodismo',
    'colaborador': 'Funcionario',
    'colaboradora': 'Funcionario',
    'funcionario': 'Funcionario',
    'funcionaria': 'Funcionario',
};

function parseGenero(rama: string): 'masculino' | 'femenino' | 'mixto' | null {
    const n = normalize(rama);
    if (n.includes('femen') || n === 'f') return 'femenino';
    if (n.includes('mascul') || n === 'm') return 'masculino';
    if (n.includes('mixto')) return 'mixto';
    return null;
}

// "50 metros Libre" → { distancia: "50m", estilo: "Libre" }
function parsePrueba(raw: string): { distancia: string; estilo: string } | null {
    if (!raw || typeof raw !== 'string') return null;
    const match = raw.match(/(\d+)\s*metros?\s+(.+)/i);
    if (!match) return null;
    const distancia = match[1] + 'm';
    const estilo = match[2].trim();
    // Capitalize first letter
    const estiloNorm = estilo.charAt(0).toUpperCase() + estilo.slice(1).toLowerCase();
    return { distancia, estilo: estiloNorm };
}

// Genera un ID corto para los participantes de la carrera
const generateShortId = () => Math.random().toString(36).substring(2, 9);

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Load reference data
        const [carrerasRes, disciplinasRes] = await Promise.all([
            supabase.from('carreras').select('id, nombre'),
            supabase.from('disciplinas').select('id, name').eq('name', 'Natación').limit(1).maybeSingle(),
        ]);

        if (!carrerasRes.data || !disciplinasRes.data) {
            return NextResponse.json({ error: 'Error cargando datos de referencia' }, { status: 500 });
        }

        const carreras = carrerasRes.data;
        const disciplinaId = disciplinasRes.data.id;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rows.length === 0) return NextResponse.json({ error: 'No data rows found' }, { status: 400 });

        // Map headers
        // Buscamos cuál es la fila real de headers probando las primeras 5 filas
        let headerRow = rows[0] || {};
        for (let i = 0; i < Math.min(5, rows.length); i++) {
            const rowKeys = Object.keys(rows[i] || {}).map(k => normalize(k));
            if (rowKeys.some(k => k.includes('nombre')) && rowKeys.some(k => k.includes('programa') || k.includes('carrera'))) {
                headerRow = rows[i];
                break;
            }
        }

        const rawHeaders = Object.keys(headerRow);
        let headerNombre = '', headerCarrera = '', headerSexo = '', headerRama = '';
        const pruebaHeaders: string[] = [];

        for (const h of rawHeaders) {
            const norm = normalize(h);
            if (norm.includes('nombre') || norm.includes('name')) headerNombre = h;
            else if (norm.includes('carrera') || norm.includes('programa') || norm.includes('program')) headerCarrera = h;
            else if (norm.includes('sexo') || norm.includes('sex')) headerSexo = h;
            else if (norm.includes('rama') || norm.includes('genero')) headerRama = h;
            else if (norm.includes('prueba')) pruebaHeaders.push(h); // Prueba1, Prueba 2, Prueba 3 etc
        }

        if (!headerNombre || !headerCarrera || pruebaHeaders.length === 0) {
            return NextResponse.json({ 
                error: `Columnas requeridas no encontradas. Detectadas: Nombre=${headerNombre || 'NO'}, Programa=${headerCarrera || 'NO'}, Rama=${headerRama || 'NO'}, Pruebas=${pruebaHeaders.length}. Columnas en Excel: ${rawHeaders.join(', ')}` 
            }, { status: 400 });
        }

        let jugadoresCreated = 0;
        let carrerasCreated = 0;
        let rosterLinked = 0;
        const processedPruebas = new Set<string>();
        const warnings: string[] = [];

        // Pruebas map: key = `${pruebaNormalizada}-${genero}`
        const partiesMap = new Map<string, { params: any, participantes: any[] }>();

        // Step 1: Map rows & Upsert Jugadores
        const insertPromises: Promise<any>[] = [];
        for (const row of rows) {
            const nombre = (row[headerNombre] as string || '').trim();
            if (!nombre) continue;

            const carreraInput = (row[headerCarrera] as string || '').trim();
            const ramaInput = headerRama ? (row[headerRama] as string || '').trim() : '';
            const sexoInput = headerSexo ? (row[headerSexo] as string || '').trim() : '';
            
            const genero = parseGenero(ramaInput) || 'masculino';
            const sexo = (() => {
                const s = sexoInput.toUpperCase();
                return (s === 'M' || s === 'F') ? s : (genero === 'femenino' ? 'F' : 'M');
            })();

            let carreraId: number | null = null;
            let carreraMatched = '';

            const normCarrera = normalize(carreraInput);
            const carreraLookup = CARRERA_ALIASES[normCarrera] || carreraInput;
            let bestCarrera: { id: number; nombre: string; sim: number } | null = null;
            for (const c of carreras) {
                const sim = similarity(normalize(carreraLookup), normalize(c.nombre));
                if (!bestCarrera || sim > bestCarrera.sim) bestCarrera = { id: c.id, nombre: c.nombre, sim };
            }
            // Strict match check
            if (bestCarrera && bestCarrera.sim >= 0.5) {
                carreraId = bestCarrera.id;
                carreraMatched = bestCarrera.nombre;
                if (bestCarrera.sim < 0.72) {
                    warnings.push(`Carrera aproximada: "${carreraInput}" → "${carreraMatched}"`);
                }
            } else {
                continue; // Skip si no hay carrera (o manejar como error? mejor ignorar)
            }

            let playerId = null;
            const { data: existingPlayer } = await supabase
                .from('jugadores')
                .select('id')
                .eq('nombre', nombre)
                .eq('carrera_id', carreraId)
                .limit(1)
                .maybeSingle();

            if (existingPlayer) {
                playerId = existingPlayer.id;
            } else {
                const playerRec = {
                    nombre,
                    carrera_id: carreraId,
                    disciplina_id: disciplinaId,
                    genero,
                    sexo,
                    validado: true,
                    updated_at: new Date().toISOString()
                };

                const { data: newPlayer, error: insertErr } = await supabase
                    .from('jugadores')
                    .insert(playerRec)
                    .select('id')
                    .single();

                if (insertErr) {
                    console.error("Jugador Insert Error:", insertErr);
                    warnings.push(`No se pudo crear al jugador ${nombre}: ${insertErr.message}`);
                    continue;
                }
                playerId = newPlayer.id;
                jugadoresCreated++;
            }

            // Process Pruebas
            for (const ph of pruebaHeaders) {
                const pVal = (row[ph] as string || '').trim();
                if (!pVal) continue;

                const parsed = parsePrueba(pVal);
                if (!parsed) continue;

                const pruebaKey = `${parsed.distancia} ${parsed.estilo}-${genero}`;
                processedPruebas.add(`${parsed.distancia} ${parsed.estilo} (${genero})`);

                const participante = {
                    id: generateShortId(),
                    nombre: nombre,
                    carrera: carreraMatched,
                    carrera_id: carreraId,
                    estado: 'pending',
                    puntos: 0,
                    jugador_id: playerId // Interno temporal
                };

                if (!partiesMap.has(pruebaKey)) {
                    partiesMap.set(pruebaKey, {
                        params: {
                            disciplina_id: disciplinaId,
                            equipo_a: `${parsed.distancia} ${parsed.estilo}`, // "50m Libre"
                            equipo_b: genero === 'femenino' ? 'Femenino' : genero === 'masculino' ? 'Masculino' : 'Mixto',
                            genero: genero,
                            estado: 'programado',
                            lugar: 'Piscina Centro Deportivo',
                            marcador_detalle: {
                                tipo: 'carrera',
                                distancia: parsed.distancia,
                                estilo: parsed.estilo,
                                participantes: []
                            }
                        },
                        participantes: []
                    });
                }
                
                // Add to participants array
                partiesMap.get(pruebaKey)!.participantes.push(participante);
            }
        }

        // Step 2: Handle Match Upsert/Update
        for (const [key, data] of partiesMap.entries()) {
            const { params, participantes } = data;
            
            // Ver si ya existe el partido
            const { data: existingMatch } = await supabase
                .from('partidos')
                .select('id, marcador_detalle')
                .eq('disciplina_id', disciplinaId)
                .eq('equipo_a', params.equipo_a)
                .eq('genero', params.genero)
                .limit(1)
                .maybeSingle();
            
            let matchId = null;
            let finalParticipantes = participantes.map(p => {
                const clone = { ...p };
                delete clone.jugador_id; // Clean internal payload
                return clone;
            });

            if (existingMatch) {
                // Update
                matchId = existingMatch.id;
                const existingMd = existingMatch.marcador_detalle || {};
                const prevPerts = Array.isArray(existingMd.participantes) ? existingMd.participantes : [];
                
                // Deduplicate logic: Si el nombre ya está, no lo agregamos
                const existingNames = new Set(prevPerts.map((p: any) => p.nombre.toLowerCase()));
                const newPerts = finalParticipantes.filter(p => !existingNames.has(p.nombre.toLowerCase()));
                
                if (newPerts.length > 0) {
                    existingMd.participantes = [...prevPerts, ...newPerts];
                    await supabase.from('partidos').update({ marcador_detalle: existingMd }).eq('id', matchId);
                }
            } else {
                // Create
                params.marcador_detalle.participantes = finalParticipantes;
                const { data: newMatch, error: matchErr } = await supabase
                    .from('partidos')
                    .insert(params)
                    .select('id')
                    .single();

                if (matchErr) {
                    console.error("Match Insert Error:", matchErr);
                    continue;
                }
                matchId = newMatch.id;
                carrerasCreated++;
            }

            // Step 3: Insert roster_partido entries
            if (matchId && participantes.length > 0) {
                const rosterEntries = participantes.map(p => ({
                    partido_id: matchId,
                    jugador_id: p.jugador_id,
                    equipo_a_or_b: 'equipo_a'
                }));

                const { data: rosterRes, error: rosterErr } = await supabase
                    .from('roster_partido')
                    .upsert(rosterEntries, { onConflict: 'partido_id, jugador_id, equipo_a_or_b' });
                
                if (!rosterErr) {
                    rosterLinked += rosterEntries.length;
                }
            }
        }

        return NextResponse.json({
            ok: true,
            jugadores_created: jugadoresCreated,
            partidos_created: carrerasCreated,
            roster_linked: rosterLinked,
            pruebas: Array.from(processedPruebas),
            warnings: [...new Set(warnings)] // Unique warnings
        });

    } catch (err: any) {
        console.error('[import-natacion] Error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
