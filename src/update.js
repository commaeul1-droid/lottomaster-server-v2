import { collectViaOfficialApi } from './collectors/official-api-collector.js';
import { collectViaHttp } from './collectors/http-collector.js';
import { collectViaBrowser } from './collectors/browser-collector.js';
import { collectViaExternalSources } from './collectors/external-collector.js';
import { collectManual } from './collectors/manual-collector.js';
import { readCsv, upsertCsv } from './storage/csv-store.js';
import { writeDataFiles, writeStatus } from './storage/json-store.js';
import { syncSupabase } from './storage/supabase-store.js';
import { sameDraw } from './validators/draw-validator.js';

const collectOnly = process.argv.includes('--collect-only');
const syncOnly = process.argv.includes('--sync-only');

async function main() {
  if (syncOnly) {
    const rows = await readCsv();
    console.log(await syncSupabase(rows));
    return;
  }

  // Read existing data before collection so the new official API can request
  // only rounds newer than the locally stored cursor.
  const existingRows = await readCsv();
  const existingLatestRound = existingRows.at(-1)?.round ?? null;

  const attempts = [];
  const manual = collectManual();
  const collectors = [
    ...(manual ? [{ name: 'manual-emergency', run: async () => manual }] : []),
    ...(process.env.LOTTO_SOURCE_URLS ? [{ name: 'external-source', run: () => collectViaExternalSources(process.env.LOTTO_SOURCE_URLS) }] : []),
    {
      name: 'dhlottery-official-api',
      run: () => collectViaOfficialApi({ cursorRound: existingLatestRound }),
    },
    { name: 'dhlottery-http', run: () => collectViaHttp() },
    { name: 'dhlottery-browser', run: () => collectViaBrowser() },
  ];

  let selected = null;
  const successful = [];
  for (const collector of collectors) {
    try {
      const draw = await collector.run();
      successful.push(draw);
      attempts.push({ collector: collector.name, ok: true, round: draw.round });
      if (!selected) selected = draw;
      if (successful.length >= 2 && sameDraw(successful[0], successful[1])) break;
    } catch (error) {
      attempts.push({ collector: collector.name, ok: false, error: error.message });
      console.warn(`[${collector.name}] ${error.message}`);
    }
  }

  if (!selected) {
    await writeStatus({
      ok: false,
      stage: 'collect',
      attempts,
      message: 'All automatic collectors failed. Existing data was preserved.',
    });
    throw new Error('all collectors failed; existing data preserved');
  }

  const agreement = successful.filter((draw) => sameDraw(draw, selected)).length;
  const { rows, changed } = await upsertCsv(selected);
  const latest = rows.at(-1);
  const status = {
    ok: true,
    changed,
    source: selected.source,
    agreement,
    attempts,
    message: changed ? 'New draw stored.' : 'Already up to date.',
  };

  await writeDataFiles(rows, latest, status);
  if (!collectOnly) status.supabase = await syncSupabase(rows);
  console.log(JSON.stringify({ latest, ...status }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
