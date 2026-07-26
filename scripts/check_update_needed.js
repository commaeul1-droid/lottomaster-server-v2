import fs from 'node:fs/promises';
import { readCsv } from '../src/storage/csv-store.js';
import { assessStoredRound } from '../src/lib/draw-freshness.js';

const rows = await readCsv();
const latestRound = rows.at(-1)?.round ?? null;
const freshness = assessStoredRound(latestRound);
const manualRequested = Boolean(
  process.env.MANUAL_ROUND ||
  process.env.MANUAL_NUMBERS ||
  process.env.MANUAL_BONUS ||
  process.env.MANUAL_DRAW_DATE,
);
const collectionRequired =
  manualRequested || freshness.state !== 'current';

if (process.env.GITHUB_OUTPUT) {
  await fs.appendFile(
    process.env.GITHUB_OUTPUT,
    `collection_required=${collectionRequired}\n`,
    'utf8',
  );
}

console.log(JSON.stringify({
  collectionRequired,
  manualRequested,
  ...freshness,
}, null, 2));
