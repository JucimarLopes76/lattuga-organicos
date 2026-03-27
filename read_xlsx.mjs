import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';

const files = [
  'public/frutas_organicas_top20_erp.xlsx',
  'public/hortifruti_organico_top50.xlsx',
  'public/produtos_korin_completo.xlsx',
  'public/produtos_native_organicos.xlsx'
];

for (const file of files) {
  try {
    const buf = readFileSync(file);
    const workbook = xlsx.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- File: ${file} ---`);
    console.log('Headers:', json[0]);
    console.log('Row 1:', json[1]);
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}
