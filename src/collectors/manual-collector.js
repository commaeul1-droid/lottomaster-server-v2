import { assertValidDraw, normalizeDraw } from '../validators/draw-validator.js';

export function collectManual(env = process.env) {
  if (!env.MANUAL_ROUND && !env.MANUAL_NUMBERS && !env.MANUAL_BONUS) return null;
  const numbers = String(env.MANUAL_NUMBERS ?? '').split(/[\s,]+/).filter(Boolean);
  return assertValidDraw(normalizeDraw({
    round: env.MANUAL_ROUND,
    numbers,
    bonus: env.MANUAL_BONUS,
    drawDate: env.MANUAL_DRAW_DATE,
  }, 'manual-emergency'));
}
