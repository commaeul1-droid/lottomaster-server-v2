import { createClient } from '@supabase/supabase-js';

export function hasSupabaseConfig(env = process.env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function syncSupabase(rows, env = process.env) {
  if (!hasSupabaseConfig(env)) return { skipped: true, reason: 'Supabase secrets missing' };
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const payload = rows.map((r) => ({ round: r.round, n1: r.numbers[0], n2: r.numbers[1], n3: r.numbers[2], n4: r.numbers[3], n5: r.numbers[4], n6: r.numbers[5], bonus: r.bonus, draw_date: r.drawDate }));
  const chunkSize = 500;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const { error } = await client.from('lotto_results').upsert(payload.slice(i, i + chunkSize), { onConflict: 'round' });
    if (error) throw error;
  }
  return { skipped: false, synced: payload.length };
}
