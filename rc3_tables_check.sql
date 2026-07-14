import { createAdminClient } from './supabase.js';
import { expectedLatestRound, fetchOfficialDraw, findLatestOfficialDraw } from './dhlottery.js';
import { buildAnalysisCache } from './analysis_cache.js';

const supabase = createAdminClient();

function argValue(name) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

async function logUpdate(status, message, extra = {}) {
  const payload = {
    source: 'github_actions',
    status,
    message,
    extra,
    created_at: new Date().toISOString()
  };
  const { error } = await supabase.from('lotto_update_logs').insert(payload);
  if (error) console.warn('Failed to write update log:', error.message);
}

async function upsertDraws(draws) {
  if (!draws.length) return { inserted: 0 };
  const { error } = await supabase.from('lotto_results').upsert(draws, { onConflict: 'round' });
  if (error) throw new Error(`Supabase upsert lotto_results failed: ${error.message}`);
  return { inserted: draws.length };
}

async function loadRecentDraws(limit = 260) {
  const { data, error } = await supabase
    .from('lotto_results')
    .select('round,draw_date,n1,n2,n3,n4,n5,n6,bonus')
    .order('round', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase select lotto_results failed: ${error.message}`);
  return data ?? [];
}

async function saveAnalysisCache(draws) {
  if (!draws.length) return;
  const cache = buildAnalysisCache(draws);
  const row = {
    cache_key: 'latest_rc3',
    latest_round: cache.latest_round,
    engine_version: cache.engine_version,
    payload: cache,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('lotto_analysis_cache').upsert(row, { onConflict: 'cache_key' });
  if (error) throw new Error(`Supabase upsert lotto_analysis_cache failed: ${error.message}`);
}

async function getDbLatestRound() {
  const { data, error } = await supabase
    .from('lotto_results')
    .select('round')
    .order('round', { ascending: false })
    .limit(1);
  if (error) throw new Error(`Supabase latest round check failed: ${error.message}`);
  return data?.[0]?.round ?? 0;
}

async function updateLatestOnly() {
  const dbLatest = await getDbLatestRound();
  const result = await findLatestOfficialDraw();
  if (!result.draw) {
    await logUpdate('failed', 'Official latest draw fetch failed', { expected: result.expected, diagnostics: result.diagnostics.slice(0, 8) });
    throw new Error(`Official latest draw fetch failed. expected=${result.expected}`);
  }

  if (result.draw.round <= dbLatest) {
    const recent = await loadRecentDraws(260);
    await saveAnalysisCache(recent);
    await logUpdate('success', `Already up to date. latest=${dbLatest}`, { officialLatest: result.draw.round, expected: result.expected });
    console.log(`Already up to date. DB latest=${dbLatest}, official=${result.draw.round}`);
    return;
  }

  const missing = [];
  for (let round = dbLatest + 1; round <= result.draw.round; round++) missing.push(round);
  if (dbLatest === 0) {
    await logUpdate('warning', 'DB is empty. Run recent or all backfill first.', { officialLatest: result.draw.round });
  }

  const rows = [];
  for (const round of missing) {
    const fetched = round === result.draw.round ? { draw: result.draw } : await fetchOfficialDraw(round);
    if (fetched.draw) rows.push(fetched.draw);
  }
  await upsertDraws(rows);
  const recent = await loadRecentDraws(260);
  await saveAnalysisCache(recent);
  await logUpdate('success', `Inserted/updated ${rows.length} draw(s). latest=${result.draw.round}`, { rounds: rows.map((r) => r.round) });
  console.log(`Inserted/updated ${rows.length} draw(s).`);
}

async function backfill(mode) {
  const expected = expectedLatestRound();
  const start = mode === 'all' ? 1 : Math.max(1, expected - Number(mode) + 1);
  const rows = [];
  const failed = [];

  for (let round = expected; round >= start; round--) {
    const { draw, probes } = await fetchOfficialDraw(round);
    if (draw) {
      rows.push(draw);
      console.log(`Fetched ${round}`);
    } else {
      failed.push({ round, probes: probes.slice(0, 2) });
      console.warn(`Failed ${round}`);
    }
    if (rows.length >= 25) {
      await upsertDraws(rows.splice(0));
    }
  }
  if (rows.length) await upsertDraws(rows);

  const recent = await loadRecentDraws(260);
  await saveAnalysisCache(recent);
  await logUpdate(failed.length ? 'warning' : 'success', `Backfill complete. mode=${mode}`, { expected, start, failedCount: failed.length, failed: failed.slice(0, 20) });
  console.log(`Backfill complete. failed=${failed.length}`);
}

async function main() {
  const backfillArg = argValue('--backfill');
  if (backfillArg) {
    await backfill(backfillArg === 'all' ? 'all' : String(Number(backfillArg) || 260));
  } else {
    await updateLatestOnly();
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await logUpdate('failed', error.message, { stack: error.stack });
  } catch (_) {}
  process.exit(1);
});
