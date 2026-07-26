import { collectViaOfficialApi } from './collectors/official-api-collector.js';
import { collectViaHttp } from './collectors/http-collector.js';
import { collectViaBrowser } from './collectors/browser-collector.js';
import { collectViaExternalSources } from './collectors/external-collector.js';
import { collectManual } from './collectors/manual-collector.js';
import { readCsv, upsertCsv } from './storage/csv-store.js';
import { writeDataFiles, writeStatus } from './storage/json-store.js';
import { syncSupabase } from './storage/supabase-store.js';
import { sameDraw } from './validators/draw-validator.js';
import { assessStoredRound } from './lib/draw-freshness.js';

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
  const checkedAt = new Date();
  const storedFreshness = assessStoredRound(existingLatestRound, checkedAt);

  const attempts = [];
  const manual = collectManual();
  const forceCollection =
    Boolean(manual) || process.argv.includes('--force-collect');
  if (!forceCollection && storedFreshness.state === 'current') {
    const latest = existingRows.at(-1);
    console.log(JSON.stringify({
      latest,
      ok: true,
      changed: false,
      source: 'seed-csv-current',
      agreement: 0,
      attempts,
      expectedLatestRound: storedFreshness.expectedRound,
      message: 'Already up to date; automatic collection was not required.',
    }, null, 2));
    return;
  }
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
      existingLatestRound,
      expectedLatestRound: storedFreshness.expectedRound,
      freshness: storedFreshness.state,
      message:
        'All automatic collectors failed while a newer official draw was required. Existing data was preserved.',
    });
    throw new Error(
      `all collectors failed; latest=${existingLatestRound ?? 'none'}, ` +
      `expected=${storedFreshness.expectedRound}; existing data preserved`,
    );
  }

  const selectedFreshness = assessStoredRound(selected.round, checkedAt);
  if (selectedFreshness.state !== 'current') {
    await writeStatus({
      ok: false,
      stage: 'freshness',
      attempts,
      selectedRound: selected.round,
      expectedLatestRound: selectedFreshness.expectedRound,
      freshness: selectedFreshness.state,
      message:
        'A collector returned a valid draw structure, but its round was not the expected current round. Existing data was preserved.',
    });
    throw new Error(
      `collector returned ${selectedFreshness.state} round ` +
      `${selected.round}; expected=${selectedFreshness.expectedRound}`,
    );
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
    expectedLatestRound: selectedFreshness.expectedRound,
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
