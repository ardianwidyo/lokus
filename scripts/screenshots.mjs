/**
 * Captures every screen of the console into docs/screenshots/.
 *
 * Playwright is deliberately NOT a dependency of this repo — it is a one-off
 * documentation tool, not something the product runs on, and plan.md does not
 * list it in the stack. Run it through npx:
 *
 *   npm run build --workspace web
 *   npm run preview --workspace web -- --port 4173 &
 *   npx playwright@1.62 install chromium      # first time only
 *   node scripts/screenshots.mjs
 *
 * The console runs on the seeded dataset in the browser, so no API, no
 * credentials and no network are involved and the images are reproducible.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await loadPlaywright();

/**
 * Playwright lives wherever npx put it, not in this repo's node_modules, and
 * ESM ignores NODE_PATH. So it is looked up rather than imported: installed
 * copy first, then the npx cache. `LOKUS_PLAYWRIGHT` overrides both.
 */
async function loadPlaywright() {
  const candidates = [process.env.LOKUS_PLAYWRIGHT, 'playwright'].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch {
      /* try the next one */
    }
  }

  const { readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');

  const cache = join(
    process.env.LOCALAPPDATA ?? process.env.HOME ?? '',
    process.platform === 'win32' ? 'npm-cache/_npx' : '.npm/_npx',
  );

  for (const entry of readdirSync(cache, { withFileTypes: true })) {
    const guess = join(cache, entry.name, 'node_modules/playwright/index.mjs');
    try {
      return await import(pathToFileURL(guess).href);
    } catch {
      /* not this one */
    }
  }

  throw new Error(
    'Playwright tidak ditemukan. Jalankan: npx playwright@1.62 install chromium, ' +
      'atau set LOKUS_PLAYWRIGHT ke path modulnya.',
  );
}

const BASE = process.env.LOKUS_PREVIEW_URL ?? 'http://localhost:4173';
const OUT = new URL('../docs/screenshots/', import.meta.url);

/**
 * The flagship question for screen 10 — it routes across all three agents and
 * so produces the fullest execution trace.
 */
const CHAT_QUESTION = 'Kenapa rating cabang Bekasi Timur turun bulan ini?';

/**
 * An empty chat box is the screen's honest first state, but it is not what the
 * screen is *for*: the execution trace only exists once something has been
 * asked. So this one screen is driven before it is photographed.
 */
async function askOnChat(page) {
  await page.fill('#chat-input', CHAT_QUESTION);
  await page.click('form button[type="submit"]');
  await page.waitForSelector('[aria-label="Jawaban agen"]', { timeout: 30_000 });
}

/** Matches web/src/app/screens.js, in rail order. */
const SCREENS = [
  ['01', 'masuk', '/masuk', 'viewer'],
  ['02', 'briefing', '/briefing', 'manager'],
  ['03', 'peta', '/peta', 'manager'],
  ['04', 'cabang', '/cabang?outlet=DPK-01', 'manager'],
  ['05', 'review', '/review', 'manager'],
  ['06', 'draft', '/draft', 'manager'],
  ['07', 'tema', '/tema', 'manager'],
  ['08', 'site-scout', '/site-scout', 'manager'],
  ['09', 'bandingkan', '/bandingkan', 'manager'],
  ['10', 'chat', '/chat', 'manager', askOnChat],
  ['11', 'pengetahuan', '/pengetahuan', 'manager'],
  ['12', 'jawaban', '/jawaban', 'manager'],
  ['13', 'tindakan', '/tindakan', 'manager'],
  ['14', 'admin', '/admin', 'admin'],
];

const TENANT = {
  tenantId: 'nusa-retail',
  name: 'Nusa Retail',
  outletCount: 42,
  area: 'Jabodetabek',
  segment: 'minimarket',
};

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
});

const page = await context.newPage();

// A screenshot of a screen that logged an error is not a screenshot worth
// keeping — the run fails loudly rather than quietly shipping a broken image.
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
});
page.on('pageerror', (error) => consoleErrors.push(`${page.url()} :: ${error.message}`));

const manifest = [];

for (const [number, id, path, role, prepare] of SCREENS) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });

  // Screen 01 is the sign-in itself, so it must be seen signed out.
  await page.evaluate(
    ([tenant, signedIn]) => {
      if (signedIn) {
        // ACTIVE_TENANT_KEY from web/src/data/tenantCache.js.
        window.sessionStorage.setItem('lokus:activeTenant', JSON.stringify(tenant));
      } else {
        window.sessionStorage.clear();
      }
    },
    [{ ...TENANT, role }, id !== 'masuk'],
  );

  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });

  // Panels resolve in two passes; wait until none of them is still loading.
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('.panel').length > 0 &&
        [...document.querySelectorAll('.panel')].every(
          (panel) => panel.getAttribute('data-status') !== 'loading',
        ),
      { timeout: 20_000 },
    )
    .catch(() => console.warn(`  ! ${id}: a panel was still loading at timeout`));

  if (prepare) await prepare(page);

  const file = `${number}-${id}.png`;
  // Playwright wants a path string here; a URL silently fails deep in its
  // mime-type sniffing rather than at the call.
  await page.screenshot({ path: fileURLToPath(new URL(file, OUT)), fullPage: true });

  const states = await page.$$eval('.panel', (panels) =>
    panels.map((panel) => panel.getAttribute('data-status')),
  );

  manifest.push({ number, id, path, role, file, panels: states });
  console.log(`  ✓ ${number} ${id.padEnd(12)} ${states.length} panel · ${states.join(', ')}`);
}

await writeFile(new URL('manifest.json', OUT), `${JSON.stringify(manifest, null, 2)}\n`);
await browser.close();

if (consoleErrors.length > 0) {
  console.error(`\n${consoleErrors.length} console error(s):`);
  for (const line of consoleErrors) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`\n${manifest.length} layar tersimpan di docs/screenshots/ — tanpa error konsol.`);
