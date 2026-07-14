import fs from 'node:fs/promises';
import { readCsv } from './storage/csv-store.js';
import { writeStatus } from './storage/json-store.js';

const rows = await readCsv();
const latest = rows.at(-1);
let latestJson = null;
try { latestJson = JSON.parse(await fs.readFile('data/latest.json', 'utf8')); } catch { /* absent before first run */ }
const consistent = !latestJson || latestJson.latest?.round === latest.round;
const status = { ok: consistent, stage: 'health', csvRows: rows.length, latestRound: latest.round, latestJsonRound: latestJson?.latest?.round ?? null };
await writeStatus(status);
console.log(JSON.stringify(status, null, 2));
if (!consistent) process.exitCode = 1;
