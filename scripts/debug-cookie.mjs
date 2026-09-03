// Inspect the browser cookie jar after gate login + call /me in-page.
const BASE = process.argv[2] || 'https://yajuter.vercel.app';
const PASSWORD = process.argv[3] || 'Seijirou20021009!';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${BASE}/gate`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="password"]', PASSWORD);
await Promise.all([
  page.waitForURL('**/home', { timeout: 15000 }),
  page.click('button[type="submit"]')
]);
console.log('cookies:', JSON.stringify(await context.cookies(), null, 1));
const result = await page.evaluate(async () => {
  const r = await fetch('/api/yajuter/me');
  return { status: r.status, body: (await r.text()).slice(0, 200) };
});
console.log('in-page /me:', JSON.stringify(result));
await browser.close();
