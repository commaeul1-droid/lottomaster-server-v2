import { OFFICIAL_RESULT_API_URL, RESULT_URL } from '../lib/constants.js';
import { parseOfficialResultResponse } from '../parsers/dhlottery-api-parser.js';

const DEFAULT_HEADERS = {
  accept: 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  referer: RESULT_URL,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
};

/**
 * New official-page data collector.
 *
 * The current result page loads draw data dynamically from:
 *   /lt645/selectPstLt645InfoNew.do
 *
 * We first open the result page to obtain its cookies, then call the JSON
 * endpoint using both "latest" and "center" query modes. Existing data is
 * never modified here; validation/storage remain in src/update.js.
 */
export async function collectViaOfficialApi({
  cursorRound = null,
  timeoutMs = 20000,
} = {}) {
  const cookie = await warmOfficialSession(timeoutMs);
  const headers = {
    ...DEFAULT_HEADERS,
    ...(cookie ? { cookie } : {}),
  };

  const cursor = Number.isInteger(Number(cursorRound)) ? Number(cursorRound) : null;
  const attempts = [];

  const queries = [
    ...(cursor ? [{ srchDir: 'latest', srchCursorLtEpsd: String(cursor) }] : []),
    ...(cursor ? [{ srchDir: 'center', srchLtEpsd: String(cursor + 1) }] : []),
    { srchDir: 'latest', srchCursorLtEpsd: String(cursor ?? 1) },
  ];

  for (const query of queries) {
    try {
      const payload = await requestOfficialJson(query, headers, timeoutMs);
      return parseOfficialResultResponse(payload, 'dhlottery-official-api');
    } catch (error) {
      attempts.push(`${formatQuery(query)}: ${error.message}`);
    }
  }

  throw new Error(`new official result API failed (${attempts.join(' | ')})`);
}

async function warmOfficialSession(timeoutMs) {
  const response = await fetchWithTimeout(
    `${RESULT_URL}?_=${Date.now()}`,
    {
      method: 'GET',
      redirect: 'follow',
      headers: {
        ...DEFAULT_HEADERS,
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    },
    timeoutMs,
  );

  // A warm-up access-control page can still issue cookies useful to the API.
  return collectSetCookie(response);
}

async function requestOfficialJson(query, headers, timeoutMs) {
  const url = new URL(OFFICIAL_RESULT_API_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('_', String(Date.now()));

  const response = await fetchWithTimeout(
    url.toString(),
    {
      method: 'GET',
      redirect: 'follow',
      headers,
    },
    timeoutMs,
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${preview(text)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (/text\/html/i.test(contentType) && /<!doctype|<html/i.test(text)) {
    throw new Error(`HTML access-control response: ${preview(text)}`);
  }

  try {
    return JSON.parse(stripJsonPrefix(text));
  } catch {
    throw new Error(`response was not valid JSON: ${preview(text)}`);
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function collectSetCookie(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers
      .getSetCookie()
      .map((value) => value.split(';', 1)[0])
      .filter(Boolean)
      .join('; ');
  }

  const raw = response.headers.get('set-cookie');
  if (!raw) return '';
  return raw
    .split(/,(?=[^;,]+=)/)
    .map((value) => value.trim().split(';', 1)[0])
    .filter(Boolean)
    .join('; ');
}

function stripJsonPrefix(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^\s*while\s*\(\s*1\s*\)\s*;\s*/, '')
    .replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;\s*/, '')
    .trim();
}

function preview(value) {
  return String(value ?? '').replace(/\s+/g, ' ').slice(0, 180);
}

function formatQuery(query) {
  return Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
}
