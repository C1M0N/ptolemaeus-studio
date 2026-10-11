// Do emblems keep apart what the meanings keep apart? Renders every rated course with one renderer,
// rasterises each emblem to a small grey image and compares them pairwise.
// Usage: node tools/measure.mjs [renderer] [opt.key=value ...]
// Prints: the cross-listed pair's visual similarity and its rank, and how well visual similarity follows
// semantic similarity (Spearman rank correlation over all course pairs).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = args.find((a) => !a.includes('=')) || 'field';
const optQuery = args.filter((a) => a.includes('=')).map((a) => (a.startsWith('opt.') ? a : 'opt.' + a)).join('&');
const url = pathToFileURL(path.join(here, 'harness.html')).href + `?r=${id}&words=数学&size=64${optQuery ? '&' + optQuery : ''}`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto(url);
await page.waitForFunction(() => document.body.dataset.ready === '1');
const result = await page.evaluate(async () => {
  const L = window.LogoLab;
  const r = L.renderers[L.renderers.length - 1];
  const opts = {};
  for (const c of r.controls) opts[c.id] = c.value;
  const q = new URLSearchParams(location.search);
  for (const [k, v] of q) if (k.startsWith('opt.')) {
    const c = r.controls.find((x) => x.id === k.slice(4));
    opts[k.slice(4)] = c && c.type === 'range' ? +v : c && c.type === 'toggle' ? v === '1' || v === 'true' : v;
  }
  const colors = { ink: '#000000', paper: '#ffffff', panel: '#ffffff', muted: '#ffffff', line: '#ffffff', accent: '#000', seal: '#000' };
  const S = 96, R = 32;
  const items = L.data.courses.filter((c) => c.r && Object.keys(c.r).length).map((c) => {
    const course = L.course(c.number, c.code);
    return { key: `${c.code} ${c.number}`, title: c.zh, code: c.code, vec: course.vec, course: { ...course, level: 0 } };
  });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = R;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  for (const it of items) {
    const svg = r.render({ vec: it.vec, word: it.key, item: L.item(it.code), course: it.course, size: S, mode: 'card', opts, colors, lab: L, hover: () => {} });
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await img.decode();
    g.fillStyle = '#fff';
    g.fillRect(0, 0, R, R);
    g.filter = 'blur(0.6px)';
    g.drawImage(img, 0, 0, R, R);
    g.filter = 'none';
    const px = g.getImageData(0, 0, R, R).data;
    it.img = Array.from({ length: R * R }, (_, k) => 1 - px[k * 4] / 255);
  }
  const corr = (a, b) => {
    const n = a.length;
    let ma = 0, mb = 0;
    for (let k = 0; k < n; k++) { ma += a[k]; mb += b[k]; }
    ma /= n; mb /= n;
    let sab = 0, saa = 0, sbb = 0;
    for (let k = 0; k < n; k++) { const x = a[k] - ma, y = b[k] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return sab / Math.sqrt(saa * sbb || 1);
  };
  const pairs = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    pairs.push({ a: items[i].key, b: items[j].key, vis: corr(items[i].img, items[j].img), sem: L.cosine(items[i].vec, items[j].vec), same: items[i].code === items[j].code });
  }
  return { n: items.length, pairs };
});
await browser.close();

const { pairs } = result;
const rank = (xs) => { const o = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = new Array(xs.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
const spearman = (a, b) => {
  const ra = rank(a), rb = rank(b), n = a.length, m = (n - 1) / 2;
  let s = 0, sa = 0, sb = 0;
  for (let k = 0; k < n; k++) { s += (ra[k] - m) * (rb[k] - m); sa += (ra[k] - m) ** 2; sb += (rb[k] - m) ** 2; }
  return s / Math.sqrt(sa * sb);
};
const byVis = [...pairs].sort((p, q) => q.vis - p.vis);
const x = pairs.find((p) => (p.a === 'MATH 414' && p.b === 'STAT 414') || (p.a === 'STAT 414' && p.b === 'MATH 414'));
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
console.log(`renderer ${id} ${optQuery}  courses ${result.n}, pairs ${pairs.length}`);
if (x) console.log(`MATH 414 vs STAT 414: visual ${x.vis.toFixed(2)} (semantic ${x.sem.toFixed(2)}), rank ${byVis.indexOf(x) + 1} of ${pairs.length}`);
console.log(`visual similarity: mean ${mean(pairs.map((p) => p.vis)).toFixed(2)}, same subject ${mean(pairs.filter((p) => p.same).map((p) => p.vis)).toFixed(2)}, different ${mean(pairs.filter((p) => !p.same).map((p) => p.vis)).toFixed(2)}`);
console.log(`Spearman(visual, semantic) = ${spearman(pairs.map((p) => p.vis), pairs.map((p) => p.sem)).toFixed(2)}`);
console.log('most alike:', byVis.slice(0, 6).map((p) => `${p.a}~${p.b} ${p.vis.toFixed(2)}`).join(', '));
