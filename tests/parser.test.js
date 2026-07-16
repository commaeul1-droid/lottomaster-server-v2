import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseDhlotteryResultHtml } from '../src/parsers/dhlottery-result-parser.js';
import {
  parseOfficialResultItem,
  parseOfficialResultResponse,
} from '../src/parsers/dhlottery-api-parser.js';
import { validateDraw } from '../src/validators/draw-validator.js';

test('parses result page fixture', async () => {
  const html = await fs.readFile('tests/fixtures/result-sample.html', 'utf8');
  const draw = parseDhlotteryResultHtml(html);
  assert.equal(draw.round, 1232);
  assert.deepEqual(draw.numbers, [1, 8, 15, 23, 32, 45]);
  assert.equal(draw.bonus, 7);
});

test('parses the redesigned official result API envelope', async () => {
  const payload = JSON.parse(
    await fs.readFile('tests/fixtures/official-api-sample.json', 'utf8'),
  );
  const draw = parseOfficialResultResponse(payload);
  assert.equal(draw.round, 1232);
  assert.deepEqual(draw.numbers, [1, 8, 15, 23, 32, 45]);
  assert.equal(draw.bonus, 7);
  assert.equal(draw.drawDate, '2026-07-11');
});

test('selects the newest valid draw from an unsorted API list', () => {
  const draw = parseOfficialResultResponse({
    data: {
      list: [
        {
          ltEpsd: '1231',
          ltRflYmd: '20260704',
          tm1WnNo: 2,
          tm2WnNo: 9,
          tm3WnNo: 18,
          tm4WnNo: 25,
          tm5WnNo: 31,
          tm6WnNo: 44,
          bnsWnNo: 7,
        },
        {
          ltEpsd: '1232',
          ltRflYmd: '20260711',
          tm1WnNo: 1,
          tm2WnNo: 8,
          tm3WnNo: 15,
          tm4WnNo: 23,
          tm5WnNo: 32,
          tm6WnNo: 45,
          bnsWnNo: 7,
        },
      ],
    },
  });
  assert.equal(draw.round, 1232);
});

test('parses a single official API item', () => {
  const draw = parseOfficialResultItem({
    ltEpsd: 1232,
    ltRflYmd: '20260711',
    tm1WnNo: 45,
    tm2WnNo: 23,
    tm3WnNo: 1,
    tm4WnNo: 32,
    tm5WnNo: 8,
    tm6WnNo: 15,
    bnsWnNo: 7,
  });
  assert.deepEqual(draw.numbers, [1, 8, 15, 23, 32, 45]);
});

test('rejects duplicated number', () => {
  const result = validateDraw({
    round: 1,
    numbers: [1, 1, 2, 3, 4, 5],
    bonus: 6,
    drawDate: null,
  });
  assert.equal(result.ok, false);
});
