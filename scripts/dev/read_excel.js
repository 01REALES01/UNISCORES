const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('c:\\Users\\LUIS D\\Downloads\\Calendario General 2026 (3).xlsx');
    console.log("Sheet names:");
    console.log(workbook.SheetNames);
    
    // Most fixture parsers target sheets with specific names or just iterate. Let's look at the first two sheets.
    for (const sheetName of workbook.SheetNames.slice(0, 3)) {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // Print the first 5 rows to see what it looks like
        for (let i = 0; i < Math.min(5, data.length); i++) {
            console.log(`Row ${i}:`, data[i]);
        }
    }
} catch (e) {
    console.error("Error loading exactly that file:", e.message);
}
