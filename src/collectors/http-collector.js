import { RESULT_URL } from '../lib/constants.js';
import { parseDhlotteryResultHtml } from '../parsers/dhlottery-result-parser.js';

export async function collectViaHttp({ timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${RESULT_URL}?_=${Date.now()}`;
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6',
        referer: 'https://www.dhlottery.co.kr/',
        'cache-control': 'no-cache',
      },
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseDhlotteryResultHtml(html, 'dhlottery-http');
  } finally {
    clearTimeout(timer);
  }
}
