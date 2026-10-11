// Screenshot a logo-lab page with headless Chromium and report console errors.
// Usage: node tools/shoot.mjs "<path relative to logo-lab, with ?query and #hash>" out.png [width] [height] [--dark] [--click=<css>]
// Example: node tools/shoot.mjs "tools/harness.html?r=matrix&words=猴子,火" /tmp/x.png 1200 800
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const [target, out = 'shot.png', width = '1200', height = '900'] = args.filter((a) => !a.startsWith('--'));
const [beforeHash, hash = ''] = target.split('#');
const [file, query = ''] = beforeHash.split('?');
const url = pathToFileURL(path.join(root, file)).href + (query ? '?' + query : '') + (hash ? '#' + hash : '');

const browser = await playwright.chromium.launch();
const page = await browser.newPage({
  viewport: { width: +width, height: +height },
  deviceScaleFactor: 1,
  colorScheme: flags.includes('--dark') ? 'dark' : 'light',
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.goto(url);
await page.waitForTimeout(800);
for (const f of flags.filter((x) => x.startsWith('--click='))) {
  await page.click(f.slice(8));
  await page.waitForTimeout(500);
}
const err = await page.$eval('#err', (e) => e.textContent).catch(() => '');
if (err) errors.push('[harness] ' + err);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
console.log('saved', out);
