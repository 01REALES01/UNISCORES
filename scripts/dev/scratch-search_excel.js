
const XLSX = require('xlsx');
const path = require('path');

const filename = process.argv[2] || 'PROGRAMACION PRIMERA RONDA.xlsx';
const filePath = path.resolve(filename);

try {
    const workbook = XLSX.readFile(filePath);
    console.log("Sheet names:", workbook.SheetNames);
    
    for (const sheetName of workbook.SheetNames) {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        for (let i = 0; i < data.length; i++) {
            const rowStr = JSON.stringify(data[i]);
            if (rowStr.toLowerCase().includes('villarraga') || rowStr.toLowerCase().includes('brito')) {
                console.log(`Row ${i}:`, data[i]);
            }
        }
    }
} catch (e) {
    console.error("Error loading file:", e.message);
}
