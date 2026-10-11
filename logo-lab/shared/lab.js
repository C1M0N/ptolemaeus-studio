// LogoLab core: data access, vector math and helpers shared by every renderer.
// Load order: shared/semantics.js -> shared/lab.js -> renderers/*.js -> shared/shell.js
(function () {
  const data = window.LogoLabData;
  const N = 256;
  const renderers = [];

  const byWord = new Map(data.words.map((w) => [w.zh, w]));

  function toVec(r) {
    const v = new Float32Array(N);
    for (const k in r) v[+k] = Math.max(0, Math.min(255, r[k])) / 255;
    return v;
  }

  // Metadata for a vocabulary entry: {kind: 'discipline'|'word', zh, en, code?, f?}. f = family index.
  function item(word) {
    const w = byWord.get(word);
    if (!w) return { kind: 'word', zh: word, en: '', code: '', f: -1 };
    return { kind: w.kind, zh: w.zh, en: w.en, code: w.code || '', f: w.f == null ? -1 : w.f };
  }

  // Course number -> {number, level (hundreds digit, 1-9), minor (last two digits, 0-99), label}.
  function course(number, code = '') {
    const n = Math.max(0, Math.min(999, Math.round(+number) || 0));
    if (!n) return null;
    return { number: n, level: Math.floor(n / 100), minor: n % 100, label: (code ? code + ' ' : '') + n };
  }

  // Float32Array(256) in [0, 1] for a vocabulary word, or null.
  function vec(word) {
    const w = byWord.get(word);
    return w ? toVec(w.r) : null;
  }

  // Strongest attributes, descending: [{i, v, attr}]
  function top(v, n = 12) {
    const idx = [];
    for (let i = 0; i < N; i++) if (v[i] > 0) idx.push(i);
    idx.sort((a, b) => v[b] - v[a] || a - b);
    return idx.slice(0, n).map((i) => ({ i, v: v[i], attr: data.attrs[i] }));
  }

  // Probabilistic OR of a set of attributes: 1 - prod(1 - v).
  function anyOf(v, list) {
    let p = 1;
    for (const i of list) p *= 1 - v[i];
    return 1 - p;
  }

  const axisByKey = new Map(data.axes.map((a) => [a.key, a]));

  // Composite axis value in [-1, 1]; positive = a.pos label (e.g. 阳), negative = a.neg (阴).
  function axis(v, key) {
    const a = axisByKey.get(key);
    if (!a) throw new Error('unknown axis ' + key);
    return anyOf(v, a.posAttrs) - anyOf(v, a.negAttrs);
  }

  // Sum of values per domain (each 0..16).
  function domainSum(v) {
    const out = new Float32Array(16);
    for (let i = 0; i < N; i++) out[data.attrs[i].d] += v[i];
    return out;
  }

  // ---- whole-matrix features: how a subject's meaning is spread, not what each cell says ----

  const TAU = Math.PI * 2;
  // Domains placed around a circle in data.layouts.domainOrder, starting at 12 o'clock, clockwise.
  const domainAngle = new Float32Array(16);
  data.layouts.domainOrder.forEach((d, k) => { domainAngle[d] = (k / 16) * TAU; });

  function rawFeatures(v) {
    const e = domainSum(v);
    let total = 0;
    for (let d = 0; d < 16; d++) total += e[d];
    const share = Float32Array.from(e, (x) => (total ? x / total : 0));
    let H = 0, active = 0;
    for (const p of share) { if (p > 0) H -= p * Math.log(p); if (p >= 0.06) active++; }
    H /= Math.log(16);
    // spread on the similarity grid: weighted radius of gyration, in cells
    const cell = data.layouts.gridSimilar;
    let sw = 0, sr = 0, sc = 0;
    for (let i = 0; i < N; i++) if (v[i] > 0) { const c = cell[i]; sw += v[i]; sr += v[i] * Math.floor(c / 16); sc += v[i] * (c % 16); }
    const cr = sw ? sr / sw : 7.5, cc = sw ? sc / sw : 7.5;
    let g = 0;
    for (let i = 0; i < N; i++) if (v[i] > 0) { const c = cell[i]; g += v[i] * ((Math.floor(c / 16) - cr) ** 2 + ((c % 16) - cc) ** 2); }
    const gyration = sw ? Math.sqrt(g / sw) : 0;
    // clusters: connected groups of strong cells (8-neighbourhood) on the similarity grid
    const on = new Uint8Array(256);
    for (let i = 0; i < N; i++) if (v[i] >= 0.45) on[cell[i]] = 1;
    const seen = new Uint8Array(256);
    let clusters = 0;
    for (let s = 0; s < 256; s++) {
      if (!on[s] || seen[s]) continue;
      clusters++;
      const stack = [s];
      seen[s] = 1;
      while (stack.length) {
        const c = stack.pop(), r = Math.floor(c / 16), q = c % 16;
        for (let dr = -1; dr <= 1; dr++) for (let dq = -1; dq <= 1; dq++) {
          const rr = r + dr, qq = q + dq, n = rr * 16 + qq;
          if (rr >= 0 && rr < 16 && qq >= 0 && qq < 16 && on[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
        }
      }
    }
    // core vs rim on the concentric layout: 0 = centre ring (common attributes) .. 7 = outer ring (rare)
    const rcell = data.layouts.gridRings;
    let ring = 0;
    for (let i = 0; i < N; i++) if (v[i] > 0) {
      const c = rcell[i];
      ring += v[i] * (Math.max(Math.abs(Math.floor(c / 16) - 7.5), Math.abs((c % 16) - 7.5)) - 0.5);
    }
    ring = sw ? ring / sw : 0;
    return { share, entropy: H, active, gyration, clusters, ring, total };
  }

  // Reference distribution over the disciplines, so `spread` reads as "how diffuse compared with other fields".
  let ref = null;
  function reference() {
    if (ref) return ref;
    const rows = data.words.filter((w) => w.kind === 'discipline').map((w) => rawFeatures(toVec(w.r)));
    const keys = ['entropy', 'active', 'gyration', 'clusters', 'ring'];
    const stats = {};
    for (const k of keys) {
      const xs = rows.map((r) => r[k]);
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) || 1;
      stats[k] = { m, sd };
    }
    const composite = (r) => ['entropy', 'active', 'gyration', 'clusters'].reduce((a, k) => a + (r[k] - stats[k].m) / stats[k].sd, 0) / 4;
    const sorted = rows.map(composite).sort((a, b) => a - b);
    ref = { stats, composite, sorted };
    return ref;
  }
  // position of x within a sorted list, 0..1 (linear between neighbours)
  function percentile(sorted, x) {
    if (x <= sorted[0]) return 0;
    if (x >= sorted[sorted.length - 1]) return 1;
    let i = 0;
    while (sorted[i + 1] < x) i++;
    return (i + (x - sorted[i]) / (sorted[i + 1] - sorted[i])) / (sorted.length - 1);
  }

  // Whole-matrix features of a vector:
  //   spread   0..1  compact (one region of meaning) .. diffuse (many unrelated regions), ranked against the 48 disciplines
  //   entropy  0..1  how evenly the meaning is shared among the 16 domains
  //   clusters       separate groups of strong attributes on the similarity grid
  //   rim      0..1  meaning carried by common (0) or rare, specific (1) attributes
  //   dirs           [{d, angle, share}] per domain, angle from data.layouts.domainOrder (0 = up, clockwise)
  function features(v) {
    const r = rawFeatures(v);
    const R = reference();
    const z = (k) => (r[k] - R.stats[k].m) / R.stats[k].sd;
    return {
      spread: r.total ? percentile(R.sorted, R.composite(r)) : 0,
      entropy: r.entropy,
      active: r.active,
      gyration: r.gyration,
      clusters: r.clusters,
      rim: Math.max(0, Math.min(1, 0.5 + z('ring') / 4)),
      dirs: Array.from(r.share, (share, d) => ({ d, angle: domainAngle[d], share })),
      empty: !r.total,
    };
  }

  // Alchemy: combine two vectors. add = clamped sum, max = union, min = intersection, mean = blend.
  function combine(a, b, mode = 'add') {
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = a[i], y = b[i];
      out[i] = mode === 'max' ? Math.max(x, y)
        : mode === 'min' ? Math.min(x, y)
        : mode === 'mean' ? (x + y) / 2
        : Math.min(1, x + y);
    }
    return out;
  }

  function cosine(a, b) {
    let ab = 0, aa = 0, bb = 0;
    for (let i = 0; i < N; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
    return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
  }

  // Closest vocabulary words to a vector: [{word, sim}]
  function nearest(v, k = 3, exclude = []) {
    const skip = new Set(exclude);
    return data.words
      .filter((w) => !skip.has(w.zh))
      .map((w) => ({ word: w.zh, sim: cosine(v, toVec(w.r)) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, k);
  }

  // Deterministic 32-bit hash of a string (FNV-1a) and a seeded PRNG (mulberry32).
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  // svg('circle', {cx: 1, r: 2}, [children]) -> SVGElement
  function svg(tag, attrs = {}, children = []) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    for (const c of children) if (c) el.appendChild(c);
    return el;
  }

  // HiDPI canvas sized to `size` CSS px. Returns {canvas, g} where g is the 2D context in CSS px.
  function canvas(size) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    c.style.width = size + 'px';
    c.style.height = size + 'px';
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    return { canvas: c, g };
  }

  const hex = (i) => '0x' + i.toString(16).toUpperCase().padStart(2, '0');

  // Register a renderer. See CONTRACT.md for the shape.
  function register(r) {
    for (const k of ['id', 'name', 'render']) if (!r[k]) throw new Error('renderer missing ' + k);
    r.controls = r.controls || [];
    renderers.push(r);
    renderers.sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  // Prompt used for live scoring of a new word (same rubric as the offline data).
  function ratingPrompt(word) {
    const list = data.attrs.map((a) => `${a.i} ${a.zh} ${a.en}`).join('\n');
    return `你在为一个"语义 logo 生成器"给词语打分。按下面的规则，给词语「${word}」在 256 个语义属性上打分。

${data.rubric}

256 个属性（序号 中文 英文）：
${list}

只输出一个 JSON 对象，不要任何其他文字。格式：{"word":"${word}","r":[[序号,分值],...]}
只列出非零的 18~40 个属性，分值为 1~255 的整数。例：{"word":"猴子","r":[[96,255],[107,190],[112,190],[137,120]]}`;
  }

  // Parse a live-scoring answer into a vector, or throw.
  function parseRating(json) {
    const pairs = json && Array.isArray(json.r) ? json.r : null;
    if (!pairs || !pairs.length) throw new Error('bad rating');
    const r = {};
    for (const p of pairs) {
      const i = Array.isArray(p) ? p[0] : p && p.i;
      const v = Array.isArray(p) ? p[1] : p && p.v;
      if (Number.isInteger(i) && i >= 0 && i < N && v > 0) r[i] = Math.min(255, Math.round(v));
    }
    if (Object.keys(r).length < 5) throw new Error('too few ratings');
    return r;
  }

  window.LogoLab = {
    data, N, renderers, register,
    vec, toVec, item, course, top, anyOf, axis, domainSum, features, domainAngle, combine, cosine, nearest,
    hash, rng, svg, canvas, hex,
    ratingPrompt, parseRating,
  };
})();
