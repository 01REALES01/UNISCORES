const fs = require('fs');
const XLSX = require('xlsx');

try {
    const buffer = fs.readFileSync('c:\\Users\\LUIS D\\Downloads\\Calendario General 2026 (3).xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets['Futbol Masculino'] || wb.Sheets['Fútbol Masculino'];
    if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log("Teams in sheet:");
        for (let i = 0; i < Math.min(25, rows.length); i++) {
            console.log(rows[i]);
        }
    } else {
        console.log("Sheet not found!");
    }
} catch (e) {
    console.error("Error:", e);
}
