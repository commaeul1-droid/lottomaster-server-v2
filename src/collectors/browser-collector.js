import { chromium } from 'playwright';
import { RESULT_URL } from '../lib/constants.js';
import { parseDhlotteryResultHtml } from '../parsers/dhlottery-result-parser.js';

export async function collectViaBrowser({ timeoutMs = 45000 } = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  try {
    const context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      viewport: { width: 1440, height: 1200 },
    });
    const page = await context.newPage();
    await page.goto(RESULT_URL, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(3500);
    // Some access pages keep the real result markup in the document. Parse the entire DOM.
    const html = await page.content();
    return parseDhlotteryResultHtml(html, 'dhlottery-browser');
  } finally {
    await browser.close();
  }
}
