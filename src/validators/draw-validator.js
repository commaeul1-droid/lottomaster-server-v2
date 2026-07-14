import { MAX_NUMBER, MIN_ROUND } from '../lib/constants.js';

export function normalizeDraw(input, source = 'unknown') {
  const round = Number.parseInt(String(input?.round ?? input?.drwNo ?? ''), 10);
  const rawNumbers = input?.numbers ?? [input?.n1, input?.n2, input?.n3, input?.n4, input?.n5, input?.n6];
  const numbers = Array.isArray(rawNumbers)
    ? rawNumbers.map((v) => Number.parseInt(String(v), 10)).sort((a, b) => a - b)
    : [];
  const bonus = Number.parseInt(String(input?.bonus ?? input?.bnusNo ?? ''), 10);
  const drawDate = normalizeDate(input?.drawDate ?? input?.draw_date ?? input?.drwNoDate ?? null);
  return { round, numbers, bonus, drawDate, source };
}

export function validateDraw(draw, { requireDate = false } = {}) {
  const errors = [];
  if (!Number.isInteger(draw.round) || draw.round < MIN_ROUND) errors.push('invalid round');
  if (!Array.isArray(draw.numbers) || draw.numbers.length !== 6) errors.push('winning numbers must contain 6 values');
  if (draw.numbers?.some((n) => !Number.isInteger(n) || n < 1 || n > MAX_NUMBER)) errors.push('winning number out of range');
  if (new Set(draw.numbers ?? []).size !== 6) errors.push('winning numbers are duplicated');
  if (!Number.isInteger(draw.bonus) || draw.bonus < 1 || draw.bonus > MAX_NUMBER) errors.push('invalid bonus');
  if (draw.numbers?.includes(draw.bonus)) errors.push('bonus duplicates winning number');
  if (requireDate && !draw.drawDate) errors.push('draw date missing');
  if (draw.drawDate && Number.isNaN(Date.parse(draw.drawDate))) errors.push('invalid draw date');
  return { ok: errors.length === 0, errors };
}

export function assertValidDraw(draw, options) {
  const result = validateDraw(draw, options);
  if (!result.ok) throw new Error(`Invalid draw: ${result.errors.join(', ')}`);
  return draw;
}

export function sameDraw(a, b) {
  return a.round === b.round && a.bonus === b.bonus && a.numbers.join(',') === b.numbers.join(',');
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim().replaceAll('.', '-').replaceAll('/', '-');
  const match = text.match(/(20\d{2})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}
