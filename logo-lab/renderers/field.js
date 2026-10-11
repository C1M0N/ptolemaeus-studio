// 墨迹 Field — a folded ink blot made of tiles.
//
// The figure: a subject's lit attributes keep their places on the semantic plane (similar attributes sit
// close). Each becomes a drop of ink sized by its strength, and a minimum spanning tree joins the drops with
// ink, so the figure is always one connected body. The body is stood upright on its own long axis and folded
// along it, like a Rorschach card. The form therefore comes from how the meanings are arranged: a focused
// subject is a compact body, a diffuse one throws out arms. Every figure is upright and symmetric, so no
// meaning is carried by direction.
// The texture: the blot is filled with square tiles. Each tile takes the pattern of the domain whose
// attribute dominates at that spot, and its grey is that attribute's brightness in the matrix (60/120/190/255).
// A course is drawn from its own vector only, never from its subject code, so cross-listed courses match.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const N = 256;
  const G = 112;                // sampling grid for the silhouette
  const TAU = Math.PI * 2;
  const XY = D.layouts.xy;
  const freq = D.stats.freq;
  const fmax = Math.max(...freq) || 1;
  const idf = Float32Array.from(freq, (f) => 0.3 + 0.7 * (1 - f / fmax));   // generic attributes weigh less
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const f2 = (v) => v.toFixed(2);

  // ---------- marching squares (silhouette underlay, blot and contour styles) ----------
  function isoLoops(f, t) {
    const segs = [];
    const at = (x, y) => f[y * G + x];
    const lerp = (a, b) => (t - a) / (b - a || 1e-9);
    for (let y = 0; y < G - 1; y++) for (let x = 0; x < G - 1; x++) {
      const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
      const k = (a > t) | ((b > t) << 1) | ((c > t) << 2) | ((d > t) << 3);
      if (k === 0 || k === 15) continue;
      const T = [x + lerp(a, b), y], R = [x + 1, y + lerp(b, c)], B = [x + lerp(d, c), y + 1], Lf = [x, y + lerp(a, d)];
      const add = (p, q) => segs.push([p, q]);
      switch (k) {
        case 1: case 14: add(Lf, T); break;
        case 2: case 13: add(T, R); break;
        case 3: case 12: add(Lf, R); break;
        case 4: case 11: add(R, B); break;
        case 6: case 9: add(T, B); break;
        case 7: case 8: add(Lf, B); break;
        case 5: add(Lf, T); add(R, B); break;
        case 10: add(T, R); add(B, Lf); break;
      }
    }
    const key = (p) => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000);
    const ends = new Map();
    segs.forEach((s, i) => { for (const p of s) { const k = key(p); (ends.get(k) || ends.set(k, []).get(k)).push(i); } });
    const used = new Uint8Array(segs.length);
    const loops = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const loop = [segs[i][0], segs[i][1]];
      for (;;) {
        const last = loop[loop.length - 1];
        const next = (ends.get(key(last)) || []).find((j) => !used[j]);
        if (next === undefined) break;
        used[next] = 1;
        const s = segs[next];
        loop.push(key(s[0]) === key(last) ? s[1] : s[0]);
      }
      if (loop.length > 3) loops.push(loop);
    }
    return loops;
  }
  function smooth(loop, n) {
    let p = loop;
    for (let k = 0; k < n; k++) {
      const q = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
      }
      p = q;
    }
    return p;
  }
  const area = (loop) => loop.reduce((s, p, i) => { const q = loop[(i + 1) % loop.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

  // ---------- two alphabets, one shape per domain; drawn in a cell of half-size r, mirrored when sx = -1 ----------
  const poly = (x, y, r, sx, pts) => 'M' + pts.map(([a, b]) => `${f2(x + sx * a * r)} ${f2(y + b * r)}`).join('L') + 'Z';
  const circ = (x, y, r) => `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;
  const rot = (pts, a) => pts.map(([u, w]) => [u * Math.cos(a) - w * Math.sin(a), u * Math.sin(a) + w * Math.cos(a)]);
  const ngon = (n, a0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * TAU; return [Math.cos(a), Math.sin(a)]; });
  const bar = (len, w) => [[-len, -w], [len, -w], [len, w], [-len, w]];
  const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const wave = (amp, w) => {
    const top = [], bot = [];
    for (let i = 0; i <= 12; i++) { const t = -1 + i / 6, yy = Math.sin(t * Math.PI) * amp; top.push([t, yy - w]); bot.unshift([t, yy + w]); }
    return top.concat(bot);
  };

  // 拼砖 tiles: fill the cell, so the blot reads as one woven body (like cross-stitch or a pixel sprite)
  const TILES = [
    { zh: '实', d: (x, y, r, sx) => poly(x, y, r, sx, box(-1, -1, 1, 1)) },                                            // 存在 being
    { zh: '半', d: (x, y, r, sx) => poly(x, y, r, sx, [[-1, -1], [1, 1], [-1, 1]]) },                                  // 元素 elements
    { zh: '框', eo: true, d: (x, y, r, sx) => poly(x, y, r, sx, box(-1, -1, 1, 1)) + poly(x, y, r, sx, box(-0.42, -0.42, 0.42, 0.42)) }, // 色彩 colour
    { zh: '横', d: (x, y, r, sx) => [-0.72, 0, 0.72].map((c) => poly(x, y, r, sx, box(-1, c - 0.24, 1, c + 0.24))).join('') }, // 感官 senses
    { zh: '菱', d: (x, y, r, sx) => poly(x, y, r, sx, [[0, -1.08], [1.08, 0], [0, 1.08], [-1.08, 0]]) },               // 形态 form
    { zh: '斜', d: (x, y, r, sx) => poly(x, y, r, sx, [[-1, 0.3], [-1, 1], [-0.3, 1], [1, -0.3], [1, -1], [0.3, -1]]) }, // 运动 motion
    { zh: '弧', d: (x, y, r, sx) => poly(x, y, r, sx, [[-1, 1], ...arc(-1, 1, 2, -Math.PI / 2, 0, 10)]) },              // 生物 life
    { zh: '十', d: (x, y, r, sx) => poly(x, y, r, sx, bar(1, 0.34)) + poly(x, y, r, sx, rot(bar(1, 0.34), Math.PI / 2)) }, // 心智 mind
    { zh: '星', d: (x, y, r, sx) => poly(x, y, r, sx, [[0, -1.05], [0.28, -0.28], [1.05, 0], [0.28, 0.28], [0, 1.05], [-0.28, 0.28], [-1.05, 0], [-0.28, -0.28]]) }, // 正面情感
    { zh: '叉', d: (x, y, r, sx) => poly(x, y, r, sx, rot(bar(1.3, 0.3), Math.PI / 4)) + poly(x, y, r, sx, rot(bar(1.3, 0.3), -Math.PI / 4)) }, // 负面情感
    { zh: '珠', d: (x, y, r, sx) => poly(x, y, r, sx, box(-0.58, -0.58, 0.58, 0.58)) },                                // 价值 value
    { zh: '棋', d: (x, y, r, sx) => poly(x, y, r, sx, box(-1, -1, 0, 0)) + poly(x, y, r, sx, box(0, 0, 1, 1)) },         // 社会 society
    { zh: '竖', d: (x, y, r, sx) => poly(x, y, r, sx, box(-1, -1, -0.28, 1)) + poly(x, y, r, sx, box(0.28, -1, 1, 1)) }, // 人造 artifact
    { zh: '沙', d: (x, y, r, sx) => poly(x, y, r, sx, [[-1, -1], [1, -1], [0, 0]]) + poly(x, y, r, sx, [[-1, 1], [0, 0], [1, 1]]) }, // 文化 culture
    { zh: '波', d: (x, y, r, sx) => poly(x, y, r, sx, wave(0.42, 0.34)) },                                            // 自然 nature
    { zh: '角', d: (x, y, r, sx) => poly(x, y, r, sx, [[-1, -1], [-0.36, -1], [-0.36, 0.36], [1, 0.36], [1, 1], [-1, 1]]) }, // 关系 relation
  ];
  // 字形 glyphs: the earlier, more pictorial alphabet (needs space around each unit)
  const GLYPHS = [
    { zh: '环', eo: true, d: (x, y, r) => circ(x, y, r) + circ(x, y, r * 0.5) },
    { zh: '三角', d: (x, y, r, sx) => poly(x, y + r * 0.12, r * 1.08, sx, ngon(3, -Math.PI / 2)) },
    { zh: '圆点', d: (x, y, r) => circ(x, y, r * 0.92) },
    { zh: '波', d: (x, y, r, sx) => poly(x, y, r, sx, wave(0.34, 0.2)) },
    { zh: '六边', d: (x, y, r, sx) => poly(x, y, r, sx, ngon(6, Math.PI / 6)) },
    { zh: '箭', d: (x, y, r, sx) => poly(x, y, r, sx, [[-0.62, -0.95], [-0.08, -0.95], [0.78, 0], [-0.08, 0.95], [-0.62, 0.95], [0.24, 0]]) },
    { zh: '细胞', eo: true, d: (x, y, r, sx) => circ(x, y, r * 0.95) + circ(x + sx * r * 0.18, y - r * 0.12, r * 0.3) },
    { zh: '星芒', d: (x, y, r, sx) => [0, 1, 2].map((k) => poly(x, y, r, sx, rot(bar(1, 0.21), Math.PI / 2 + (k * Math.PI) / 3))).join('') },
    { zh: '花瓣', d: (x, y, r, sx) => poly(x, y, r, sx, [[0, -1], [0.55, -0.45], [0.7, 0.1], [0.45, 0.6], [0, 0.85], [-0.45, 0.6], [-0.7, 0.1], [-0.55, -0.45]]) },
    { zh: '叉', d: (x, y, r, sx) => poly(x, y, r, sx, rot(bar(0.98, 0.22), Math.PI / 4)) + poly(x, y, r, sx, rot(bar(0.98, 0.22), -Math.PI / 4)) },
    { zh: '菱', d: (x, y, r, sx) => poly(x, y, r, sx, [[0, -1.1], [0.78, 0], [0, 1.1], [-0.78, 0]]) },
    { zh: '三点', d: (x, y, r) => [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].map((a) => circ(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52, r * 0.36)).join('') },
    { zh: '方块', d: (x, y, r, sx) => poly(x, y, r, sx, box(-0.76, -0.76, 0.76, 0.76)) },
    { zh: '四角星', d: (x, y, r, sx) => poly(x, y, r * 1.08, sx, [[0, -1], [0.26, -0.26], [1, 0], [0.26, 0.26], [0, 1], [-0.26, 0.26], [-1, 0], [-0.26, -0.26]]) },
    { zh: '叶', d: (x, y, r, sx) => poly(x, y, r, sx, [[-0.78, 0.78], [-0.7, 0.05], [-0.4, -0.45], [0.05, -0.7], [0.78, -0.78], [0.7, -0.05], [0.4, 0.45], [-0.05, 0.7]]) },
    { zh: '十字', d: (x, y, r, sx) => poly(x, y, r, sx, bar(0.98, 0.24)) + poly(x, y, r, sx, rot(bar(0.98, 0.24), Math.PI / 2)) },
  ];

  // ---------- the figure ----------
  const kern = (d2, r2) => (d2 >= r2 ? 0 : (1 - d2 / r2) ** 2);
  function segD2(x, y, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y, wx = x - a.x, wy = y - a.y;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1e-9)));
    return { d2: (wx - t * vx) ** 2 + (wy - t * vy) ** 2, t };
  }

  const cache = new Map();
  function build(v, fold, ink) {
    const key = (fold ? 'f' : 'n') + ink.toFixed(2) + Array.from(v, (x) => (x * 255) | 0).join(',');
    if (cache.has(key)) return cache.get(key);
    let P = [];
    for (let i = 0; i < N; i++) if (v[i] > 0) P.push({ i, d: D.attrs[i].d, v: v[i], w: Math.pow(v[i], 1.5) * idf[i], x: XY[i][0], y: XY[i][1] });
    if (!P.length) return null;
    P.sort((a, b) => b.w - a.w);
    P = P.slice(0, 40);
    // centre on the weighted centroid, unit spread. The plane keeps one fixed orientation for every subject:
    // turning each figure onto its own long axis would let two nearly equal vectors come out rotated 90° apart.
    let sw = 0, cx = 0, cy = 0;
    for (const p of P) { sw += p.w; cx += p.w * p.x; cy += p.w * p.y; }
    cx /= sw; cy /= sw;
    for (const p of P) { p.x -= cx; p.y -= cy; }
    const rms = Math.sqrt(P.reduce((a, p) => a + p.w * (p.x * p.x + p.y * p.y), 0) / sw) || 1;
    // many meanings, smaller drops: a diffuse subject turns into limbs and holes instead of one solid mass
    const thin = Math.min(1, Math.sqrt(24 / P.length));
    for (const p of P) { p.x /= rms; p.y /= rms; p.r = ink * thin * (0.42 + 0.58 * Math.sqrt(p.v)); }
    // minimum spanning tree: ink runs between neighbouring meanings, so the body never falls apart
    const n = P.length, inT = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), par = new Int32Array(n).fill(-1);
    best[0] = 0;
    const E = [];
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let j = 0; j < n; j++) if (!inT[j] && (u < 0 || best[j] < best[u])) u = j;
      inT[u] = 1;
      if (par[u] >= 0) E.push({ a: P[par[u]], b: P[u], r: ink * thin * 0.5 * Math.sqrt(Math.min(P[par[u]].v, P[u].v)) + 0.1 });
      for (let j = 0; j < n; j++) if (!inT[j]) { const dd = Math.hypot(P[j].x - P[u].x, P[j].y - P[u].y); if (dd < best[j]) { best[j] = dd; par[j] = u; } }
    }
    // field at a point: total ink and the attribute that dominates there
    const one = (x, y, acc) => {
      for (const p of P) {
        const k = kern((x - p.x) ** 2 + (y - p.y) ** 2, p.r * p.r);
        if (k) { acc.t += k; if (k > acc.k) { acc.k = k; acc.p = p; } }
      }
      for (const e of E) {
        const q = segD2(x, y, e.a, e.b);
        const k = 0.9 * kern(q.d2, e.r * e.r);
        if (k) { acc.t += k; const p = q.t < 0.5 ? e.a : e.b; if (k * 0.8 > acc.k) { acc.k = k * 0.8; acc.p = p; } }
      }
      return acc;
    };
    const at = (x, y) => {
      const acc = one(x, y, { t: 0, k: 0, p: null });
      return fold ? one(-x, y, acc) : acc;
    };
    const T = 0.3;
    // sample a square window around the figure; find its bounding box
    let B = 0;
    for (const p of P) B = Math.max(B, Math.abs(p.x) + p.r, Math.abs(p.y) + p.r);
    const x0 = -B, span = 2 * B;
    const f = new Float32Array(G * G);
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const x = x0 + (gx / (G - 1)) * span, y = x0 + (gy / (G - 1)) * span;
      const t = at(x, y).t;
      f[gy * G + gx] = t;
      if (t > T) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    }
    if (fold) { const m = Math.max(-bx0, bx1); bx0 = -m; bx1 = m; }
    const out = { P, E, at, T, f, x0, span, box: [bx0, by0, bx1, by1] };
    cache.set(key, out);
    return out;
  }

  const GREYS = [0.3, 0.5, 0.74, 1];                    // ink for the four rating levels 60 / 120 / 190 / 255
  const level = (v) => (v > 0.86 ? 3 : v > 0.6 ? 2 : v > 0.36 ? 1 : 0);

  L.register({
    id: 'field',
    order: 3,
    name: '墨迹',
    en: 'Ink blot',
    tagline: '亮的属性在语义平面上滴成墨，连成一体再对折，用拼砖织出来',
    dims: '非零属性按语义平面上的位置滴墨（大小=强度），最小生成树把墨连成一体，沿自身长轴立起并对折；每格拼砖的花样 = 该处主导属性的领域，灰度 = 它在矩阵里的亮度。课程只按自己的语义向量生成。',
    lineage: '前人：罗夏墨迹测验（1921）；十字绣与安第斯织物的对称纹样；Truchet 拼砖（1704）；Blinn 的 metaball（1982）；GitHub identicon（2013）。',
    about: '<p><b>大形是一张对折的墨迹。</b>一个学科或一门课的非零属性留在语义平面上各自的位置（意思相近的挨着），每个滴一滴墨，越亮的属性墨越大；再用最小生成树把相邻的墨连起来，所以整个图形永远是一个身体，不会碎成灰尘。然后把它沿自己的长轴立起来、对折，像罗夏墨迹卡那样左右对称。形状因此来自<b>意义的排布</b>：集中的学科是一个结实的躯干，扩散的学科伸出很多肢体；没有哪个方向代表什么，所有图形都立着、都对称。</p>' +
      '<p><b>小形是拼砖。</b>墨迹被切成方格，每一格看那里哪个属性的墨最多，就用那个属性所在领域的花样：实 存在、半 元素、框 色彩、横 感官、菱 形态、斜 运动、弧 生物、十 心智、星 正面情感、叉 负面情感、珠 价值、棋 社会、竖 人造、沙 文化、波 自然、角 关系。拼砖填满格子，所以墨迹读起来像一块织物或像素画，而不是一团网点。<b>灰度</b>就是那个属性在矩阵里的亮度（60 / 120 / 190 / 255 四档）：最亮的属性最黑。</p>' +
      '<p>课程只由<b>它自己的语义向量</b>生成，课程代码只是文字标签。内容相同的交叉课程（MATH 414 和 STAT 414 都是"概率论"，由两个互不知情的打分者分别打分）会得到几乎相同的墨迹。反过来，语义上更像别的系的课，就会长得像别的系：计算理论像数学，机器学习像统计学习。</p>' +
      '<p>问题：16 种花样要靠图例才能读；形状来自语义平面上的位置，加减一个强属性会让肢体变化，这正是课程之间能区分开的原因，但也让单个属性的打分出入变得可见。</p>',
    controls: [
      { id: 'style', label: '画法', type: 'select', value: 'tile', options: [
        { value: 'tile', label: '拼砖' }, { value: 'glyph', label: '字形' }, { value: 'blob', label: '墨迹' }, { value: 'contour', label: '等高线' }] },
      { id: 'fold', label: '对折', type: 'toggle', value: true },
      { id: 'density', label: '格数', type: 'range', min: 7, max: 21, step: 1, value: 13 },
      { id: 'ink', label: '墨量', type: 'range', min: 0.25, max: 0.7, step: 0.01, value: 0.44 },
      { id: 'grey', label: '灰度', type: 'toggle', value: true },
      { id: 'ground', label: '底墨', type: 'toggle', value: true },
      { id: 'legend', label: '图例', type: 'toggle', value: true },
    ],
    render(ctx) {
      const { lab, size: S, colors, opts, course } = ctx;
      const detail = ctx.mode === 'detail';
      // a catalogued course is drawn from its own meaning only
      const v = course && course.vec ? course.vec : ctx.vec;
      const svg = lab.svg('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}` });
      const ink = colors.ink;
      const fold = opts.fold !== false;
      const B = build(v, fold, +opts.ink || 0.44);
      if (!B) {
        svg.appendChild(lab.svg('rect', { x: S * 0.3, y: S * 0.3, width: S * 0.4, height: S * 0.4, fill: 'none', stroke: colors.line, 'stroke-dasharray': '2 4' }));
        return svg;
      }
      const style = opts.style || 'tile';
      const showLegend = detail && opts.legend && (style === 'tile' || style === 'glyph');
      const [bx0, by0, bx1, by1] = B.box;
      const bw = bx1 - bx0, bh = by1 - by0;
      const room = showLegend ? 0.74 : 0.84;
      const scale = (S * room) / Math.max(bw, bh, 1e-6);
      const cxPx = S / 2, cyPx = showLegend ? S * 0.44 : S / 2;
      const mx = fold ? 0 : (bx0 + bx1) / 2, my = (by0 + by1) / 2;
      const toPx = (x, y) => [cxPx + (x - mx) * scale, cyPx + (y - my) * scale];
      const grey = opts.grey !== false;

      // the silhouette, as a pale ground (and as the whole drawing in the blot / contour styles)
      const loopsAt = (t) => isoLoops(B.f, t).filter((l) => Math.abs(area(l)) > 2).map((l) => smooth(l, 2));
      const pathOf = (loops) => loops.map((l) => 'M' + l.map(([gx, gy]) => {
        const [x, y] = toPx(B.x0 + (gx / (G - 1)) * B.span, B.x0 + (gy / (G - 1)) * B.span);
        return `${f2(x)} ${f2(y)}`;
      }).join(' L') + 'Z').join('');
      const counts = new Map();

      if (style === 'tile' || style === 'glyph') {
        if (opts.ground !== false) svg.appendChild(lab.svg('path', { d: pathOf(loopsAt(B.T)), fill: ink, 'fill-opacity': 0.09, 'fill-rule': 'evenodd' }));
        const n = Math.round(+opts.density || 13);
        const h = Math.max(bw, bh) / n;
        const alphabet = style === 'tile' ? TILES : GLYPHS;
        const fill = style === 'tile' ? 0.47 : 0.4;          // half-size of a unit, in cells
        const buckets = new Map();
        const placed = [];
        // lattice symmetric about the fold
        const nx = Math.ceil(bw / h / 2) + 1, ny = Math.ceil(bh / h / 2) + 1;
        const odd = fold ? 0.5 : 0;
        for (let j = -ny; j <= ny; j++) for (let k = -nx; k <= nx; k++) {
          const x = mx + (k + odd) * h, y = my + j * h;
          if (x < bx0 - h || x > bx1 + h || y < by0 - h || y > by1 + h) continue;
          const e = B.at(x, y);
          if (e.t <= B.T || !e.p) continue;
          const lv = grey ? level(e.p.v) : 3;
          const g = alphabet[e.p.d];
          const [px, py] = toPx(x, y);
          const sx = fold && x < 0 ? -1 : 1;
          const bk = e.p.d + '|' + lv;
          if (!buckets.has(bk)) buckets.set(bk, { lv, eo: !!g.eo, d: '' });
          buckets.get(bk).d += g.d(px, py, h * scale * fill, sx);
          counts.set(e.p.d, (counts.get(e.p.d) || 0) + 1);
          placed.push({ x: px, y: py, p: e.p, lv });
        }
        [...buckets.values()].sort((a, b) => a.lv - b.lv).forEach((b) => svg.appendChild(lab.svg('path', {
          d: b.d, fill: ink, 'fill-opacity': GREYS[b.lv], 'fill-rule': b.eo ? 'evenodd' : 'nonzero',
        })));
        if (detail && ctx.hover) {
          const hit = lab.svg('rect', { x: 0, y: 0, width: S, height: S, fill: 'transparent' });
          hit.addEventListener('pointermove', (ev) => {
            const rect = svg.getBoundingClientRect();
            const qx = ((ev.clientX - rect.left) / rect.width) * S, qy = ((ev.clientY - rect.top) / rect.height) * S;
            let bestP = null, bd = Infinity;
            for (const p of placed) { const dd = (p.x - qx) ** 2 + (p.y - qy) ** 2; if (dd < bd) { bd = dd; bestP = p; } }
            if (bestP && bd < (h * scale) ** 2) {
              const a = D.attrs[bestP.p.i];
              ctx.hover({ title: `${a.zh} ${a.en}`, sub: `${D.domains[a.d].zh} · ${alphabet[a.d].zh} · 亮度 ${Math.round(bestP.p.v * 255)}` });
            } else ctx.hover(null);
          });
          hit.addEventListener('pointerleave', () => ctx.hover(null));
          svg.appendChild(hit);
        }
      } else {
        // plain blot or contours, in grey tones: light rim, dark core
        const levels = grey ? [1, 2.2, 3.6] : [1];
        levels.forEach((m, i) => {
          const d = pathOf(loopsAt(B.T * m));
          if (!d) return;
          if (style === 'contour') svg.appendChild(lab.svg('path', { d, fill: 'none', stroke: ink, 'stroke-width': Math.max(1, S * (i ? 0.007 : 0.012)), 'stroke-opacity': grey ? GREYS[i + 1] : 1 }));
          else svg.appendChild(lab.svg('path', { d, fill: ink, 'fill-opacity': grey ? [0.35, 0.62, 1][i] : 1, 'fill-rule': 'evenodd' }));
        });
      }

      // course level, small and fixed: dots at six o'clock (same number, same dots: cross-listed courses still match)
      if (course && course.level) {
        const k = Math.min(course.level, 9), r = Math.max(1.2, S * 0.011), gap = r * 3.2, y = S * 0.965;
        for (let j = 0; j < k; j++) svg.appendChild(lab.svg('circle', { cx: S / 2 + (j - (k - 1) / 2) * gap, cy: y, r, fill: colors.muted }));
      }

      // legend: the patterns actually used, with their share
      if (showLegend && counts.size) {
        const alphabet = style === 'tile' ? TILES : GLYPHS;
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const fs = Math.max(10, S * 0.024), gr = fs * 0.45, step = (S * 0.88) / 5;
        top.forEach(([d, k], idx) => {
          const x = S * 0.06 + idx * step, y = S * 0.9;
          svg.appendChild(lab.svg('path', { d: alphabet[d].d(x + gr, y - fs * 0.35, gr, 1), fill: ink, 'fill-rule': alphabet[d].eo ? 'evenodd' : 'nonzero' }));
          const t = lab.svg('text', { x: x + gr * 2 + fs * 0.35, y, fill: colors.muted, 'font-size': fs, 'font-family': '"Noto Sans SC", system-ui, sans-serif' });
          t.textContent = `${D.domains[d].zh} ${Math.round((k / total) * 100)}%`;
          svg.appendChild(t);
        });
      }
      if (detail && course && course.title) {
        const t = lab.svg('text', { x: S * 0.96, y: S * 0.05, fill: colors.muted, 'font-size': Math.max(10, S * 0.024), 'text-anchor': 'end', 'font-family': '"Noto Sans SC", system-ui, sans-serif' });
        t.textContent = `${course.label} ${course.title}${course.vec ? '' : '（未打分）'}`;
        svg.appendChild(t);
      }
      return svg;
    },
  });
})();
