import fs from 'node:fs/promises';
import { CSV_PATH } from '../lib/constants.js';
import { assertValidDraw, normalizeDraw } from '../validators/draw-validator.js';

export async function readCsv(path = CSV_PATH) {
  const text = await fs.readFile(path, 'utf8');
  const lines = text.replaceAll('\r', '').split('\n').map((v) => v.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = line.split(',').map((v) => v.trim());
    if (c.length < 8) continue;
    try { rows.push(assertValidDraw(normalizeDraw({ round: c[0], numbers: c.slice(1, 7), bonus: c[7], drawDate: c[8] }, 'seed-csv'))); } catch { /* ignore malformed historical row */ }
  }
  rows.sort((a, b) => a.round - b.round);
  return rows;
}

export async function upsertCsv(draw, path = CSV_PATH) {
  const rows = await readCsv(path);
  const index = rows.findIndex((v) => v.round === draw.round);
  let changed = false;
  if (index >= 0) {
    const old = rows[index];
    const same = old.numbers.join(',') === draw.numbers.join(',') && old.bonus === draw.bonus;
    if (!same) throw new Error(`round ${draw.round} conflicts with existing seed data`);
    if (!old.drawDate && draw.drawDate) { rows[index] = draw; changed = true; }
  } else {
    const latest = rows.at(-1)?.round ?? 0;
    if (draw.round < latest) throw new Error(`refusing to append old round ${draw.round}; current latest=${latest}`);
    rows.push(draw); rows.sort((a, b) => a.round - b.round); changed = true;
  }
  if (changed) await writeCsv(rows, path);
  return { rows, changed };
}

export async function writeCsv(rows, path = CSV_PATH) {
  const includeDate = rows.some((r) => r.drawDate);
  const header = includeDate ? 'round,n1,n2,n3,n4,n5,n6,bonus,draw_date' : 'round,n1,n2,n3,n4,n5,n6,bonus';
  const body = rows.map((r) => [r.round, ...r.numbers, r.bonus, ...(includeDate ? [r.drawDate ?? ''] : [])].join(','));
  await fs.writeFile(path, `${header}\n${body.join('\n')}\n`, 'utf8');
}
