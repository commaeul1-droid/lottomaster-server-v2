import * as cheerio from 'cheerio';
import { assertValidDraw, normalizeDraw } from '../validators/draw-validator.js';

const BLOCK_MARKERS = [
  '서비스 접근 대기 중입니다',
  '서비스 접속이 차단 되었습니다',
  '현재 접속하신 아이피에서는',
];

export function parseDhlotteryResultHtml(html, source = 'dhlottery-html') {
  if (!html || typeof html !== 'string') throw new Error('empty HTML');
  const $ = cheerio.load(html);
  const fullText = normalizeSpace($.root().text());
  const tagSeparatedText = normalizeSpace(html.replace(/<[^>]+>/g, ' '));

  // Prefer embedded JSON/state because CSS classes may change.
  const jsonDraw = parseEmbeddedState(html, source);
  if (jsonDraw) return jsonDraw;

  const candidates = [];
  $('[class*="lotto"], [class*="win"], [class*="result"], main, article').each((_, el) => {
    const text = normalizeSpace($(el).text());
    if (text.length >= 20 && /\d+회/.test(text)) candidates.push(text);
  });
  candidates.push(tagSeparatedText);
  candidates.push(fullText);

  for (const text of candidates) {
    const draw = parseResultText(text, source);
    if (draw) return draw;
  }

  const blocked = BLOCK_MARKERS.some((marker) => fullText.includes(marker));
  throw new Error(blocked ? 'official page returned access-control content without parseable result' : 'official result HTML did not contain a valid draw');
}

export function parseResultText(text, source = 'dhlottery-text') {
  const cleaned = normalizeSpace(text);
  const roundMatches = [...cleaned.matchAll(/(\d{1,5})\s*회/g)].map((m) => Number(m[1]));
  if (!roundMatches.length) return null;
  const round = Math.max(...roundMatches);

  const dateMatch = cleaned.match(/(20\d{2})\s*[.년/-]\s*(\d{1,2})\s*[.월/-]\s*(\d{1,2})\s*일?/);
  const drawDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : null;

  const anchors = ['당첨번호', '당첨 번호', '보너스'];
  let focused = cleaned;
  const firstAnchor = anchors.map((a) => cleaned.indexOf(a)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (firstAnchor !== undefined) focused = cleaned.slice(firstAnchor, firstAnchor + 500);

  const allNumbers = [...focused.matchAll(/(?<!\d)([1-9]|[1-3]\d|4[0-5])(?!\d)/g)].map((m) => Number(m[1]));
  // Remove obvious round/date fragments and find first valid 7-number window.
  for (let i = 0; i <= allNumbers.length - 7; i++) {
    const nums = allNumbers.slice(i, i + 6);
    const bonus = allNumbers[i + 6];
    const draw = normalizeDraw({ round, numbers: nums, bonus, drawDate }, source);
    try { return assertValidDraw(draw); } catch { /* continue */ }
  }
  return null;
}

function parseEmbeddedState(html, source) {
  const objectPatterns = [
    /"drwNo"\s*:\s*(\d+)[\s\S]{0,1600}?"drwtNo1"\s*:\s*(\d+)[\s\S]{0,300}?"drwtNo2"\s*:\s*(\d+)[\s\S]{0,300}?"drwtNo3"\s*:\s*(\d+)[\s\S]{0,300}?"drwtNo4"\s*:\s*(\d+)[\s\S]{0,300}?"drwtNo5"\s*:\s*(\d+)[\s\S]{0,300}?"drwtNo6"\s*:\s*(\d+)[\s\S]{0,300}?"bnusNo"\s*:\s*(\d+)/,
    /"round"\s*:\s*(\d+)[\s\S]{0,1000}?"numbers"\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\][\s\S]{0,300}?"bonus"\s*:\s*(\d+)/,
  ];
  for (const pattern of objectPatterns) {
    const m = html.match(pattern);
    if (!m) continue;
    const draw = normalizeDraw({ round: m[1], numbers: m.slice(2, 8), bonus: m[8] }, source);
    try { return assertValidDraw(draw); } catch { /* continue */ }
  }
  return null;
}

function normalizeSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
