import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CARRERAS_UNINORTE } from '@/lib/constants';

// --- Helpers de Parsing Fuzzy ---
function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
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

// "50 metros Libre" o "50m Libre" → { distancia: "50m", estilo: "Libre" }
function parsePrueba(raw: string): { distancia: string; estilo: string } | null {
    if (!raw || typeof raw !== 'string') return null;
    const match = raw.match(/(\d+)\s*(?:m|mts?|metros?)?\s+(.+)/i);
    if (!match) return null;
    let distancia = match[1] + 'm';
    // Limpiar el estilo de comas o punto y comas finales sueltos
    let estilo = match[2].trim().replace(/[;,]$/, '').trim();
    const estiloNorm = estilo.charAt(0).toUpperCase() + estilo.slice(1).toLowerCase();
    return { distancia, estilo: estiloNorm };
}

// Extraer múltiples pruebas si vienen en la misma celda, ej: "50m Libre; 25m Espalda"
function extractPruebas(raw: string): { distancia: string; estilo: string }[] {
    if (!raw || typeof raw !== 'string') return [];
    // Dividir por punto y coma, coma, saltos de línea, o la palabra " y "
    const parts = raw.split(/[;,\n]|\s+y\s+/i);
    const results: { distancia: string; estilo: string }[] = [];
    for (const part of parts) {
        const parsed = parsePrueba(part.trim());
        if (parsed) results.push(parsed);
    }
    return results;
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
            supabase
                .from('disciplinas')
                .select('id, name')
                .or('name.ilike.Natación,name.ilike.Natacion,name.ilike.Swimming')
                .limit(1)
                .maybeSingle(),
        ]);

        if (!carrerasRes.data || !disciplinasRes.data) {
            console.error("Referencia faltante:", { carreras: !!carrerasRes.data, disciplina: !!disciplinasRes.data });
            return NextResponse.json({ error: 'Error cargando datos de referencia (Disciplina Natación no encontrada)' }, { status: 500 });
        }

        const carreras = carrerasRes.data;
        const disciplinaId = disciplinasRes.data.id;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // Selección inteligente de hoja: Priorizar la que diga "REVISADO" o "FINAL"
        let sheetName = workbook.SheetNames[0];
        const targetSheet = workbook.SheetNames.find(name => {
            const n = name.toUpperCase();
            return n.includes('REVISADO') || n.includes('FINAL') || n.includes('REVISION');
        });
        
        if (targetSheet) {
            sheetName = targetSheet;
        }

        const worksheet = workbook.Sheets[sheetName];
        const warnings: string[] = [];
        warnings.push(`📄 Usando hoja: "${sheetName}"`);
        
        // Obtenemos los datos como una matriz de arreglos (header: 1) para control total
        const allData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (allData.length === 0) return NextResponse.json({ error: 'No data rows found' }, { status: 400 });

        // --- 1. Buscar la fila de Headers ---
        let headerRowIndex = -1;
        let headerNombreIdx = -1, headerCarreraIdx = -1, headerSexoIdx = -1, headerRamaIdx = -1;
        const pruebaIndices: number[] = [];

        for (let i = 0; i < Math.min(10, allData.length); i++) {
            const row = allData[i];
            let foundCore = 0;
            row.forEach((cell, idx) => {
                const norm = normalize(String(cell || ''));
                if (norm.includes('nombre') || norm.includes('name')) { headerNombreIdx = idx; foundCore++; }
                else if (norm.includes('carrera') || norm.includes('programa')) { headerCarreraIdx = idx; foundCore++; }
                else if (norm.includes('sexo') || norm.includes('sex')) headerSexoIdx = idx;
                else if (norm.includes('rama') || norm.includes('genero')) headerRamaIdx = idx;
                else if (norm.includes('prueba') || norm.includes('competencia') || norm.includes('evento') || norm.includes('participa')) pruebaIndices.push(idx);
            });

            if (foundCore >= 2) {
                headerRowIndex = i;
                // Filtrar pruebaIndices para que NO incluya columnas de Rama, Nombre o Carrera
                const forbidden = [headerNombreIdx, headerCarreraIdx, headerSexoIdx, headerRamaIdx];
                const fixedPruebas = pruebaIndices.filter(idx => !forbidden.includes(idx));
                pruebaIndices.length = 0;
                pruebaIndices.push(...new Set(fixedPruebas));
                break;
            } else {
                // Reset indices if this wasn't the header row
                headerNombreIdx = -1; headerCarreraIdx = -1; headerSexoIdx = -1; headerRamaIdx = -1;
                pruebaIndices.length = 0;
            }
        }

        if (headerRowIndex === -1 || headerNombreIdx === -1 || headerCarreraIdx === -1) {
            return NextResponse.json({ 
                error: `No pude detectar la fila de encabezados. Asegúrate que existan columnas llamadas 'Nombre' y 'Programa/Carrera'.` 
            }, { status: 400 });
        }

        let jugadoresCreated = 0;
        let carrerasCreated = 0;
        let rosterLinked = 0;
        const processedPruebas = new Set<string>();
        // warnings ya está declarado arriba

        // Pruebas map: key = `${pruebaNormalizada}-${genero}`
        const partiesMap = new Map<string, { params: any, participantes: any[] }>();

        // --- 2. Procesar Datos desde headerRowIndex + 1 ---
        for (let i = headerRowIndex + 1; i < allData.length; i++) {
            const row = allData[i];
            const nombreRaw = String(row[headerNombreIdx] || '').trim();
            if (!nombreRaw || nombreRaw === '0' || nombreRaw.toLowerCase() === 'nombre') continue;

            const nombre = nombreRaw;
            const carreraInput = String(row[headerCarreraIdx] || '').trim();
            const ramaInput = headerRamaIdx !== -1 ? String(row[headerRamaIdx] || '').trim() : '';
            const sexoInput = headerSexoIdx !== -1 ? String(row[headerSexoIdx] || '').trim() : '';
            
            // Detección ultra-estricta de género
            const rawGeneroText = (ramaInput + ' ' + sexoInput).toLowerCase();
            let genero: 'masculino' | 'femenino' | 'mixto' = 'masculino';
            
            if (rawGeneroText.includes('femen') || rawGeneroText.includes('mujer') || sexoInput.toUpperCase() === 'F') {
                genero = 'femenino';
            } else if (rawGeneroText.includes('mascul') || rawGeneroText.includes('hombre') || sexoInput.toUpperCase() === 'M' || sexoInput.toUpperCase() === 'H') {
                genero = 'masculino';
            }

            const sexo = genero === 'femenino' ? 'F' : 'M';

            let carreraId: number | null = null;
            let carreraMatched = '';

            const normCarrera = normalize(carreraInput);
            const carreraLookup = CARRERA_ALIASES[normCarrera] || carreraInput;
            let bestCarrera: { id: number; nombre: string; sim: number } | null = null;
            for (const c of carreras) {
                const sim = similarity(normalize(carreraLookup), normalize(c.nombre));
                if (!bestCarrera || sim > bestCarrera.sim) bestCarrera = { id: c.id, nombre: c.nombre, sim };
            }

            if (bestCarrera && bestCarrera.sim >= 0.5) {
                carreraId = bestCarrera.id;
                carreraMatched = bestCarrera.nombre;
            } else {
                continue; 
            }

            // Identificar jugador y profile_id (preservando lógica del usuario)
            let playerId = null;
            let profileId = null;
            const { data: existingPlayer } = await supabase
                .from('jugadores')
                .select('id, profile_id')
                .eq('nombre', nombre)
                .eq('carrera_id', carreraId)
                .limit(1)
                .maybeSingle();

            if (existingPlayer) {
                playerId = existingPlayer.id;
                profileId = existingPlayer.profile_id;
            } else {
                const playerRec = {
                    nombre,
                    carrera_id: carreraId,
                    disciplina_id: disciplinaId,
                    genero,
                    sexo,
                    updated_at: new Date().toISOString()
                };

                const { data: newPlayer, error: insertErr } = await supabase
                    .from('jugadores')
                    .insert(playerRec)
                    .select('id, profile_id')
                    .single();

                if (insertErr) {
                    console.error("Jugador Insert Error:", insertErr);
                    warnings.push(`⚠️ ${nombre}: Error DB -> ${insertErr.message}`);
                    continue;
                }
                playerId = newPlayer.id;
                profileId = newPlayer.profile_id;

                // 2.1 Fallback: search profiles table directly by name (word based + normalized)
                if (!profileId) {
                    const words = nombre.trim().split(/\s+/).filter(w => w.length > 2);
                    const [w1, w2] = words.sort((a,b) => b.length - a.length);

                    if (w1) {
                        let query = supabase.from('profiles').select('id, full_name').ilike('full_name', `%${w1}%`);
                        if (w2) query = query.ilike('full_name', `%${w2}%`);
                        
                        const { data: pros } = await query.limit(10);
                        
                        if (pros && pros.length > 0) {
                            // Using a simple local bestMatch since we don't have the function exported here
                            const sNorm = normalize(nombre);
                            const sWords = sNorm.split(' ');
                            let best: any = null;
                            let bestScore = 0;

                            for (const c of pros) {
                                const dbNorm = normalize(c.full_name || '');
                                const dbWords = dbNorm.split(' ');
                                
                                if (sNorm === dbNorm) {
                                    best = c;
                                    bestScore = 1;
                                    break;
                                }

                                const matched = sWords.filter(w => dbWords.includes(w)).length;
                                const score = matched / Math.max(sWords.length, dbWords.length);
                                if (score > bestScore) {
                                    bestScore = score;
                                    best = c;
                                }
                            }
                            if (best && bestScore > 0.4) profileId = best.id;
                        }
                    }
                }

                jugadoresCreated++;
            }

            // Process Pruebas: Escaneo inteligente total
            // Combinamos las columnas detectadas por header con un rango de seguridad (7 columnas después del género)
            const fallbackStart = (headerRamaIdx !== -1 ? headerRamaIdx : headerCarreraIdx) + 1;
            const fallbackRange = Array.from({length: 8}, (_, k) => fallbackStart + k);
            const searchIndices = [...new Set([...pruebaIndices, ...fallbackRange])];
            
            const extractedForThisUser: string[] = [];
            const summaryTests: { distancia: string; estilo: string }[] = [];
            const individualTests: { distancia: string; estilo: string }[] = [];

            for (const pIdx of searchIndices) {
                if (pIdx >= row.length) continue;
                const pVal = String(row[pIdx] || '').trim();
                if (!pVal) continue;

                // Evitar procesar la columna de Rama/Sexo como prueba si se coló
                if (pIdx === headerRamaIdx || pIdx === headerSexoIdx) continue;

                const parsedList = extractPruebas(pVal);
                
                // Si la celda tiene más de una prueba, es un "resumen" (separado por ;)
                if (parsedList.length > 1) {
                    summaryTests.push(...parsedList);
                } else if (parsedList.length === 1) {
                    individualTests.push(parsedList[0]);
                }
            }

            // Lógica de Prioridad: Si hay pruebas individuales, ignoramos el resumen para ese Estilo específico
            // Esto corrige el error de Ely donde el resumen dice 50m pero la columna individual dice 25m
            const finalTestsToUse = [...individualTests];
            for (const s of summaryTests) {
                const alreadyHaveThisStyle = finalTestsToUse.some(i => i.estilo.toLowerCase() === s.estilo.toLowerCase());
                if (!alreadyHaveThisStyle) {
                    finalTestsToUse.push(s);
                }
            }

            for (const parsed of finalTestsToUse) {
                // Evitar que palabras como "Femenino" o "Masculino" se cuenten como estilos
                if (parsed.estilo.toLowerCase().includes('femenin') || parsed.estilo.toLowerCase().includes('masculin')) continue;
                    
                const currentGender = genero; 
                const pruebaKey = `${parsed.distancia} ${parsed.estilo}-${currentGender}`;
                
                if (extractedForThisUser.includes(`${parsed.distancia} ${parsed.estilo}`)) continue;

                processedPruebas.add(`${parsed.distancia} ${parsed.estilo} (${currentGender})`);
                extractedForThisUser.push(`${parsed.distancia} ${parsed.estilo}`);

                    const participante = {
                        id: generateShortId(),
                        nombre: nombre,
                        carrera: carreraMatched,
                        carrera_id: carreraId,
                        profile_id: profileId || null,
                        estado: 'pending',
                        puntos: 0,
                        jugador_id: playerId 
                    };

                    if (!partiesMap.has(pruebaKey)) {
                        partiesMap.set(pruebaKey, {
                            params: {
                                disciplina_id: disciplinaId,
                                equipo_a: `${parsed.distancia} ${parsed.estilo}`, 
                                equipo_b: currentGender === 'femenino' ? 'Femenino' : 'Masculino',
                                genero: currentGender,
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
                    partiesMap.get(pruebaKey)!.participantes.push(participante);
                }
            
            // Log detalladísimo para Ely
            const isEly = nombre.toLowerCase().includes('ely');
            if (isEly || (i < headerRowIndex + 5)) {
                // Obtener nombres de headers para el log
                const headerRow = allData[headerRowIndex];
                const logs = pruebaIndices.map(idx => `[${headerRow[idx] || 'SinHeader'}]:"${row[idx] || ''}"`).join(' | ');
                warnings.push(`🔍 Scan: ${nombre} (${genero}) -> ${extractedForThisUser.join(', ') || 'Sin pruebas'} | Raw: ${logs}`);
            }
        }

        // Step 2: Handle Match Upsert/Update
        for (const [key, data] of partiesMap.entries()) {
            const { params, participantes } = data;
            
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
                // We keep jugador_id as it helps for backfilling/linking logic
                return clone;
            });

            if (existingMatch) {
                matchId = existingMatch.id;
                const existingMd = existingMatch.marcador_detalle || {};
                const prevPerts = Array.isArray(existingMd.participantes) ? existingMd.participantes : [];
                
                const existingNames = new Set(prevPerts.map((p: any) => p.nombre.toLowerCase()));
                const newPerts = finalParticipantes.filter(p => !existingNames.has(p.nombre.toLowerCase()));
                
                if (newPerts.length > 0) {
                    existingMd.participantes = [...prevPerts, ...newPerts];
                    await supabase.from('partidos').update({ marcador_detalle: existingMd }).eq('id', matchId);
                }
            } else {
                params.fecha = '2026-04-24T08:00:00.000-05:00'; 
                params.marcador_detalle.participantes = finalParticipantes;
                const { data: newMatch, error: matchErr } = await supabase
                    .from('partidos')
                    .insert(params)
                    .select('id')
                    .single();

                if (matchErr) {
                    warnings.push(`❌ Error Carrera ${params.equipo_a}: ${matchErr.message}`);
                    continue;
                }
                matchId = newMatch.id;
                carrerasCreated++;
            }

            if (matchId && participantes.length > 0) {
                const rosterEntries = participantes.map(p => ({
                    partido_id: matchId,
                    jugador_id: p.jugador_id,
                    equipo_a_or_b: 'equipo_a'
                }));

                await supabase.from('roster_partido').upsert(rosterEntries, { onConflict: 'partido_id, jugador_id, equipo_a_or_b' });
                rosterLinked += rosterEntries.length;
            }
        }

        return NextResponse.json({
            ok: true,
            jugadores_created: jugadoresCreated,
            partidos_created: carrerasCreated,
            roster_linked: rosterLinked,
            pruebas: Array.from(processedPruebas),
            warnings: [...new Set(warnings)] 
        });

    } catch (err: any) {
        console.error('[import-natacion] Error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
