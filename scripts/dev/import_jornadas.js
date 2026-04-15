const XLSX = require('xlsx');
const fs = require('fs');

const MONTH_EN = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const MONTH_ES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function parseDate(raw) {
    if (raw instanceof Date) {
        return { year: raw.getFullYear(), month: raw.getMonth() + 1, day: raw.getDate() };
    }
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const s = raw.trim().toLowerCase();

    const enMatch = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (enMatch) {
        const month = MONTH_EN[enMatch[1]];
        if (month) return { year: parseInt(enMatch[3]), month, day: parseInt(enMatch[2]) };
        const parts = s.split(',').map(p => p.trim());
        for (const part of parts) {
            const m = part.match(/(\w+)\s+(\d{1,2})\s+(\d{4})/);
            if (m && MONTH_EN[m[1]]) return { year: parseInt(m[3]), month: MONTH_EN[m[1]], day: parseInt(m[2]) };
        }
    }

    const esMatch = s.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (esMatch) {
        const month = MONTH_ES[esMatch[2]];
        if (month) return { year: parseInt(esMatch[3]), month, day: parseInt(esMatch[1]) };
    }

    return null;
}

function parseTime(raw) {
    if (raw instanceof Date) {
        return { hour: raw.getHours(), minute: raw.getMinutes() };
    }
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const s = raw.trim().toUpperCase();

    const ampmMatch = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (ampmMatch) {
        let hour = parseInt(ampmMatch[1]);
        const minute = parseInt(ampmMatch[2]);
        if (ampmMatch[3] === 'PM' && hour < 12) hour += 12;
        if (ampmMatch[3] === 'AM' && hour === 12) hour = 0;
        return { hour, minute };
    }

    const plainMatch = s.match(/^(\d{1,2}):(\d{2})$/);
    if (plainMatch) {
        return { hour: parseInt(plainMatch[1]), minute: parseInt(plainMatch[2]) };
    }
    return null;
}

function buildTimestamp(date, time) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.year}-${pad(date.month)}-${pad(date.day)}T${pad(time.hour)}:${pad(time.minute)}:00-05:00`;
}

function main() {
    const filePath = 'c:\\Users\\LUIS D\\Downloads\\Calendario General 2026 (3).xlsx';
    if (!fs.existsSync(filePath)) {
        console.error("No se encontró el archivo:", filePath);
        process.exit(1);
    }
    const wb = XLSX.readFile(filePath, { cellDates: true });
    
    // Read twice to preserve dates
    const sheetRaw = XLSX.utils.sheet_to_json(wb.Sheets['POR DIA GENERAL'], {header: 1, raw: true});
    const sheetText = XLSX.utils.sheet_to_json(wb.Sheets['POR DIA GENERAL'], {header: 1, raw: false});

    const jornadas = [];
    const counters = { 'AJEDREZ': 0, 'TENIS DE MESA': 0 };

    for (let i = 0; i < sheetText.length; i++) {
        const row = sheetText[i];
        if (!row) continue;
        
        let hasParticipantes = false;
        for (let c = 0; c < row.length; c++) {
            if (typeof row[c] === 'string' && row[c].toUpperCase().includes('TODOS LOS PARTICIPANTES')) {
                hasParticipantes = true;
                break;
            }
        }

        if (hasParticipantes) {
            // Find sport in this row (typically column 8)
            let sport = null;
            for (let c = 0; c < row.length; c++) {
                if (!row[c]) continue;
                const upper = String(row[c]).toUpperCase().trim();
                if (upper === 'AJEDREZ' || upper === 'TENIS DE MESA') {
                    sport = upper;
                    break;
                }
            }
            
            if (sport && (sport === 'AJEDREZ' || sport === 'TENIS DE MESA')) {
                const nextRow = sheetText[i + 1] || [];
                const nextRowRaw = sheetRaw[i + 1] || [];

                let offset = 0;
                for (let c=0; c < 5; c++) {
                    if (row[c] && row[c].includes('PARTICIPANTES')) offset = c;
                }
                
                const venue = nextRow[offset + 5] || nextRow[5] || '';
                const dateRaw = nextRowRaw[offset + 6] || nextRowRaw[6] || nextRow[6] || '';
                const timeRaw = nextRowRaw[offset + 7] || nextRowRaw[7] || nextRow[7] || '';

                const pDate = parseDate(dateRaw);
                const pTime = parseTime(timeRaw);

                if (pDate && pTime) {
                    counters[sport]++;
                    const num = counters[sport];
                    const nombre = sport === 'AJEDREZ' ? `Ronda ${num}` : `Jornada ${num}`;
                    
                    jornadas.push({
                        sport: sport === 'AJEDREZ' ? 'Ajedrez' : 'Tenis de Mesa',
                        nombre: nombre,
                        numero: num,
                        genero: 'mixto', // As chosen by the user
                        venue: String(venue).trim(),
                        scheduled_at: buildTimestamp(pDate, pTime)
                    });
                }
            }
        }
    }

    if (jornadas.length === 0) {
        console.log("-- No se encontraron jornadas de Ajedrez o Tenis de Mesa");
        return;
    }

    // Generate SQL
    let sql = `-- MIGRATION GENERATED BY import_jornadas.js
DO $$
DECLARE
    v_ajedrez_id BIGINT;
    v_tenis_id BIGINT;
BEGIN
    SELECT id INTO v_ajedrez_id FROM disciplinas WHERE name ILIKE 'Ajedrez' LIMIT 1;
    SELECT id INTO v_tenis_id FROM disciplinas WHERE name ILIKE 'Tenis de Mesa' LIMIT 1;

    INSERT INTO jornadas (disciplina_id, genero, numero, nombre, scheduled_at, lugar, estado)
    VALUES 
`;
    const values = jornadas.map((j, i) => {
        const d_var = j.sport === 'Ajedrez' ? 'v_ajedrez_id' : 'v_tenis_id';
        const terminator = (i === jornadas.length - 1) ? '' : ',';
        return `        (${d_var}, '${j.genero}', ${j.numero}, '${j.nombre}', '${j.scheduled_at}', '${j.venue}', 'programado')${terminator}`;
    });

    sql += values.join('\n');
    sql += `
    ON CONFLICT (disciplina_id, genero, numero) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        scheduled_at = EXCLUDED.scheduled_at,
        lugar = EXCLUDED.lugar;
END $$;
`;

    const outPath = 'supabase/seed_jornadas.sql';
    fs.writeFileSync(outPath, sql);
    console.log(`Generado script SQL con ${jornadas.length} jornadas en ${outPath}`);
}

main();
