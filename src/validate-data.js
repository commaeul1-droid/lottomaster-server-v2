import { readCsv } from './storage/csv-store.js';
import { validateDraw } from './validators/draw-validator.js';

const rows = await readCsv();
if (!rows.length) throw new Error('seed CSV is empty');
for (let i = 0; i < rows.length; i++) {
  const result = validateDraw(rows[i]);
  if (!result.ok) throw new Error(`round ${rows[i].round}: ${result.errors.join(', ')}`);
  if (i > 0 && rows[i].round <= rows[i - 1].round) throw new Error(`round order/duplicate error at ${rows[i].round}`);
}
console.log(`VALID: ${rows.length} rows, latest=${rows.at(-1).round}`);
