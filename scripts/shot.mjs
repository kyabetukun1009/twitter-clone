// Headless browser check: gate login -> /home at 3 widths.
// Captures console errors, page errors, failed requests + screenshots.
// Usage: node scripts/shot.mjs [baseUrl] [gate-password]
// Defaults: http://localhost:3000 + dev-gate-810
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3000';
const PASSWORD = process.argv[3] || 'dev-gate-810';
const WIDTHS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'pc', width: 1280, height: 800 }
];

mkdirSync(new URL('../shots', import.meta.url), { recursive: true });

const browser = await chromium.launch();
let failed = 0;

for (const { name, width, height } of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      problems.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`);
  });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${String(err).slice(0, 300)}`));
  page.on('requestfailed', (req) =>
    problems.push(`[reqfail] ${req.url().slice(0, 120)} ${req.failure()?.errorText}`)
  );
  page.on('response', (res) => {
    if (res.status() >= 400)
      problems.push(`[http${res.status()}] ${res.url().slice(0, 160)}`);
  });

  try {
    await page.goto(`${BASE}/gate`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="password"]', PASSWORD);
    await Promise.all([
      page.waitForURL('**/home', { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    try {
      await page.waitForSelector('article', { timeout: 15000 });
      console.log(`OK ${name}: timeline rendered`);
    } catch {
      console.log(`NG ${name}: no <article> after login`);
      failed++;
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `shots/home-${name}.png` });
  } catch (e) {
    console.log(`NG ${name}: ${String(e).slice(0, 200)}`);
    failed++;
    try {
      await page.screenshot({ path: `shots/home-${name}.png` });
    } catch {}
  }
  for (const p of problems.slice(0, 10)) console.log(`  ${name} ${p}`);
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
