import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';
import path from 'path';

const files = [
  'public/frutas_organicas_top20_erp.xlsx',
  'public/hortifruti_organico_top50.xlsx',
  'public/produtos_korin_completo.xlsx',
  'public/produtos_native_organicos.xlsx'
];

console.log('--- LATTUGA: ANALISADOR DE PLANILHAS ---');

for (const file of files) {
  try {
    const filePath = path.resolve(file);
    const buf = readFileSync(filePath);
    const workbook = xlsx.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Fetch only the first row (headers)
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const headers = json[0] || [];
    console.log(`\n📄 Arquivo: ${path.basename(file)}`);
    console.log(`📝 Colunas Encontradas: \n  -> ${headers.join(' | ')}`);
  } catch (err) {
    console.error(`❌ Erro ao ler ${file}: ${err.message}`);
  }
}
console.log('\nCole o resultado acima no chat para eu criar o mapeamento exato! 🚀');
