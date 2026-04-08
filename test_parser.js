require('ts-node').register({ transpileOnly: true });

const fs = require('fs');
const XLSX = require('xlsx');

// Mock out imports from schedule-parser if necessary, but schedule-parser just uses XLSX directly
const { parseScheduleExcel } = require('./src/lib/schedule-parser');

try {
    const buffer = fs.readFileSync('c:\\Users\\LUIS D\\Downloads\\Calendario General 2026 (3).xlsx');
    const result = parseScheduleExcel(buffer);
    
    console.log("Total errors:", result.errors.length);
    if (result.errors.length > 0) {
        console.log("First few errors:", result.errors.slice(0, 5));
    }
    
    // Filter matches for Futbol Masculino
    const fm = result.matches.filter(m => m.sport === 'Fútbol' && m.genero === 'masculino');
    console.log(`\nFound ${fm.length} matches for Футбол Masculino\n`);
    
    // Group matches by 'group_or_bracket' to see the sizes
    const byGroup = {};
    for (const m of fm) {
        if (!byGroup[m.group_or_bracket]) byGroup[m.group_or_bracket] = new Set();
        if (m.slot_a) byGroup[m.group_or_bracket].add(m.slot_a);
        if (m.slot_b) byGroup[m.group_or_bracket].add(m.slot_b);
    }
    
    for (const g in byGroup) {
        console.log(`Grupo ${g} tiene ${byGroup[g].size} equipos unicos:`, Array.from(byGroup[g]));
    }
    
    // Detailed list of first few matches
    console.log("\nSome parsed matches for Futbol Masculino:");
    fm.slice(0, 10).forEach(m => {
        console.log(`[Fila ${m.row}] ${m.slot_a} Vs ${m.slot_b} | Grupo: ${m.group_or_bracket} | Ronda: ${m.round}`);
    });

} catch (e) {
    console.error("Error:", e);
}
