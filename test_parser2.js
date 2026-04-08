require('ts-node').register({ transpileOnly: true });
const fs = require('fs');
const { parseScheduleExcel } = require('./src/lib/schedule-parser');

const normalizeFase = (round, grupo, header) => {
    const r = (round || '').toLowerCase().trim();
    const h = (header || '').toUpperCase();
    
    if (h === 'LLAVE' || h === 'LLAVES' || h === 'PARTIDO' || h === 'FINAL') {
        if (h === 'FINAL') return 'final';
        if (r.includes('tercer') || r.includes('3er') || r.includes('3º')) return 'tercer_puesto';
        if (r.includes('semi')) return 'semifinal';
        if (r.includes('cuarto')) return 'cuartos';
        if (r.includes('octavo')) return 'octavos';
        return 'eliminacion';
    }

    if (r.includes('tercer') || r.includes('3er') || r.includes('3º'))  return 'tercer_puesto';
    if (r.includes('semi'))                                               return 'semifinal';
    if (r.includes('cuarto'))                                             return 'cuartos';
    if (r.includes('final'))                                              return 'final';
    if (/^[A-Z]$/i.test((grupo || '').trim()))                            return 'grupos';
    return 'eliminacion';
};

try {
    const buffer = fs.readFileSync('c:\\Users\\LUIS D\\Downloads\\Calendario General 2026 (3).xlsx');
    const result = parseScheduleExcel(buffer);
    
    const fm = result.matches.filter(m => m.sport === 'Fútbol' && m.genero === 'masculino');
    
    fm.forEach(m => {
        const fase = normalizeFase(m.round, m.group_or_bracket, m.group_column_header);
        console.log(`[Fila ${m.row}] ${m.slot_a} Vs ${m.slot_b} | Grupo: ${m.group_or_bracket} | Ronda Extr: ${m.round} -> Fase: ${fase}`);
    });

} catch (e) {
    console.error("Error:", e);
}
