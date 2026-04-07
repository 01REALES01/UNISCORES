require('ts-node').register({ transpileOnly: true });
const fs = require('fs');
const { parseScheduleExcel } = require('./src/lib/schedule-parser');

try {
    const buffer = fs.readFileSync('c:\\Users\\LUIS D\\Downloads\\Calendario General 2026 (3).xlsx');
    const result = parseScheduleExcel(buffer);
    const fm = result.matches.filter(m => m.sport === 'Fútbol' && m.genero === 'masculino');
    
    fm.forEach(m => {
        if (m.round.includes('1era') || m.round.includes('2da') || m.round.includes('3ra')) {
            console.log(`Fila ${m.row} | Grupo: "${m.group_or_bracket}" | Eq_A: "${m.slot_a}" | Eq_B: "${m.slot_b}"`);
        }
    });
} catch (e) { console.error(e); }
