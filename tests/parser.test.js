import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseDhlotteryResultHtml } from '../src/parsers/dhlottery-result-parser.js';
import { validateDraw } from '../src/validators/draw-validator.js';

test('parses result page fixture', async () => {
  const html = await fs.readFile('tests/fixtures/result-sample.html', 'utf8');
  const draw = parseDhlotteryResultHtml(html);
  assert.equal(draw.round, 1232);
  assert.deepEqual(draw.numbers, [1, 8, 15, 23, 32, 45]);
  assert.equal(draw.bonus, 7);
});

test('rejects duplicated number', () => {
  const result = validateDraw({ round: 1, numbers: [1, 1, 2, 3, 4, 5], bonus: 6, drawDate: null });
  assert.equal(result.ok, false);
});
