import test from 'node:test';
import assert from 'node:assert/strict';
import { collectViaOfficialApi } from '../src/collectors/official-api-collector.js';

const DRAW_1235 = {
  code: '0000',
  message: 'success',
  data: {
    list: [{
      ltEpsd: '1235',
      ltRflYmd: '20260801',
      tm1WnNo: 2,
      tm2WnNo: 8,
      tm3WnNo: 17,
      tm4WnNo: 24,
      tm5WnNo: 31,
      tm6WnNo: 44,
      bnsWnNo: 9,
    }],
  },
};

test('falls back to a global latest query after empty cursor responses', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async (url) => {
      requested.push(String(url));
      if (requested.length === 1) {
        return new Response('', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      const parsed = new URL(url);
      const isGlobalLatest =
        parsed.searchParams.get('srchDir') === 'latest' &&
        parsed.searchParams.get('srchCursorLtEpsd') === '1';
      return new Response(
        JSON.stringify(isGlobalLatest ? DRAW_1235 : { data: { list: [] } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    };

    const draw = await collectViaOfficialApi({
      cursorRound: 1234,
      timeoutMs: 1000,
    });
    assert.equal(draw.round, 1235);
    assert.equal(requested.length, 4);
    assert.match(requested.at(-1), /srchCursorLtEpsd=1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('official JSON request continues when session warm-up fails', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) throw new Error('warm-up blocked');
      return new Response(JSON.stringify(DRAW_1235), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const draw = await collectViaOfficialApi({
      cursorRound: 1234,
      timeoutMs: 1000,
    });
    assert.equal(draw.round, 1235);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
