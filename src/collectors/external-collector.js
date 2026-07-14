import { normalizeDraw, assertValidDraw } from '../validators/draw-validator.js';

export async function collectViaExternalSources(urls) {
  const list = String(urls ?? '').split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
  const errors = [];
  for (const url of list) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json,text/csv,text/plain,*/*' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      const draw = parseExternal(body, url);
      return assertValidDraw(draw);
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(errors.length ? errors.join(' | ') : 'no external source configured');
}

function parseExternal(body, source) {
  try {
    const json = JSON.parse(body);
    const value = json.latest ?? json.draw ?? json.data ?? (Array.isArray(json.draws) ? json.draws[0] : json);
    return normalizeDraw(value, `external:${source}`);
  } catch { /* CSV/plain fallback */ }
  const lines = body.replaceAll('\r', '').split('\n').map((v) => v.trim()).filter(Boolean);
  for (const line of lines.reverse()) {
    const cells = line.split(',').map((v) => v.trim());
    if (cells.length >= 8 && /^\d+$/.test(cells[0])) {
      return normalizeDraw({ round: cells[0], numbers: cells.slice(1, 7), bonus: cells[7], drawDate: cells[8] }, `external:${source}`);
    }
  }
  throw new Error('unsupported external source format');
}
