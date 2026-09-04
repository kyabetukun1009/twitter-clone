// Visual check for ported pages at pc + mobile widths.
// Usage: node scripts/shot-pages.mjs [baseUrl] [gate-password]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3000';
const PASSWORD = process.argv[3] || 'dev-gate-810';
const PAGES = [
  { name: 'profile', path: '/user/watashi', ready: 'text=件の投稿' },
  { name: 'bookmarks', path: '/bookmarks', ready: 'section' },
  { name: 'thread', path: '/tweet/114595', ready: 'article' },
  { name: 'search', path: '/search?q=%E6%B7%AB%E5%A4%A2', ready: 'article' },
  { name: 'quotes', path: '/quotes', ready: 'text=淫夢語録辞典' },
  { name: 'anniv', path: '/anniversaries', ready: 'section' },
  { name: 'notfound', path: '/no-such-page', ready: 'text=何もないゾ' }
];
const WIDTHS = [
  { name: 'pc', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

const browser = await chromium.launch();
let failed = 0;

// login once to seed storage state
const loginCtx = await browser.newContext();
const loginPage = await loginCtx.newPage();
await loginPage.goto(`${BASE}/gate`, { waitUntil: 'domcontentloaded' });
await loginPage.fill('input[type="password"]', PASSWORD);
await Promise.all([
  loginPage.waitForURL('**/home', { timeout: 15000 }),
  loginPage.click('button[type="submit"]')
]);
await loginPage.waitForTimeout(2000);
const storage = await loginCtx.storageState();
await loginCtx.close();

for (const { name, width, height } of WIDTHS) {
  for (const page of PAGES) {
    const context = await browser.newContext({
      viewport: { width, height },
      storageState: storage
    });
    const p = await context.newPage();
    const problems = [];
    p.on('pageerror', (err) =>
      problems.push(`[pageerror] ${String(err).slice(0, 200)}`)
    );
    p.on('response', (res) => {
      if (res.status() >= 400)
        problems.push(`[http${res.status()}] ${res.url().slice(0, 140)}`);
    });
    try {
      await p.goto(`${BASE}${page.path}`, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector(page.ready, { timeout: 15000 });
      console.log(`OK ${page.name}-${name}`);
    } catch {
      console.log(`NG ${page.name}-${name}`);
      failed++;
    }
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `shots/${page.name}-${name}.png` });
    for (const problem of problems.slice(0, 6)) console.log(`  ${problem}`);
    await context.close();
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
