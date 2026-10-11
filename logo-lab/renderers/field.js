// 墨团 Field — the matrix as a heat map on the semantic plane, cut at one level.
// Every lit attribute is a heat source at its place on the 2D map of meaning (similar attributes sit close).
// The sum is a continuous field; its iso-line is the emblem. A compact subject is pulled into one round blob,
// a diffuse one breaks into an archipelago: spread is read straight off the matrix, then exaggerated.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const N = 256;
  const G = 96;                 // field grid (same for every size, so a card and a detail view match)
  const R_EMBLEM = 0.43;        // emblem radius as a share of the square

  // ---------- marching squares: iso-lines of a G×G field at level t, as closed loops in grid units ----------
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
    // chain segments into loops by shared endpoints
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

  // Chaikin corner cutting, closed loops
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

  // ---------- family nucleus: the same seven shapes the lab uses for the families ----------
  function nucleus(f, x, y, r) {
    const P = (pts) => 'M' + pts.map(([a, b]) => `${(x + a * r).toFixed(2)} ${(y + b * r).toFixed(2)}`).join(' L') + 'Z';
    const ring = (n, rot) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
    switch (f) {
      case 0: return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;            // 理 circle
      case 1: return P([[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]]);                     // 工 square
      case 2: return `M${x} ${y - r}Q${x + r * 1.1} ${y} ${x} ${y + r}Q${x - r * 1.1} ${y} ${x} ${y - r}Z`;   // 生 leaf
      case 3: return `M${x - 0.8 * r} ${y + r}V${y - 0.1 * r}A${0.8 * r} ${0.8 * r} 0 0 1 ${x + 0.8 * r} ${y - 0.1 * r}V${y + r}Z`; // 人 arch
      case 4: return P(ring(6, Math.PI / 6));                                                              // 社 hexagon
      case 5: return P([[0, -1.1], [0.8, 0], [0, 1.1], [-0.8, 0]]);                                        // 经 lozenge
      case 6: return P(ring(8, -Math.PI / 2).map(([a, b], i) => (i % 2 ? [a * 0.45, b * 0.45] : [a, b]))); // 艺 star
      default: return null;
    }
  }

  // ---------- the field ----------
  const cache = new Map();
  function build(vec, source, contrast) {
    const key = source + contrast.toFixed(2) + '|' + Array.from(vec, (v) => (v * 255) | 0).join(',');
    if (cache.has(key)) return cache.get(key);
    const F = L.features(vec);
    // exaggerate spread toward the extremes (contrast 0 = as measured, 1 = pushed hard)
    const s0 = F.spread, s = Math.max(0, Math.min(1, 0.5 + (s0 - 0.5) * (1 + 1.6 * contrast)));
    const pts = [];
    for (let i = 0; i < N; i++) {
      if (vec[i] <= 0) continue;
      let x, y;
      if (source === 'grid') { const c = D.layouts.gridSimilar[i]; x = ((c % 16) + 0.5) / 16; y = (Math.floor(c / 16) + 0.5) / 16; }
      else [x, y] = D.layouts.xy[i];
      pts.push({ i, x, y, w: Math.pow(vec[i], 1.6) });
    }
    let cx = 0.5, cy = 0.5;
    const sw = pts.reduce((a, p) => a + p.w, 0);
    if (sw) { cx = pts.reduce((a, p) => a + p.w * p.x, 0) / sw; cy = pts.reduce((a, p) => a + p.w * p.y, 0) / sw; }
    // compact subjects are pulled toward their centre of meaning, diffuse ones are spread a little wider
    const pull = 0.45 + 0.75 * s;
    const sigma = 0.085 - 0.032 * s;
    for (const p of pts) { p.x = 0.5 + (p.x - cx) * pull; p.y = 0.5 + (p.y - cy) * pull; }
    const f = new Float32Array(G * G);
    const inv = 1 / (2 * sigma * sigma), cut = (3 * sigma) ** 2;
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const x = gx / (G - 1), y = gy / (G - 1);
      let v = 0;
      for (const p of pts) { const d2 = (x - p.x) ** 2 + (y - p.y) ** 2; if (d2 < cut) v += p.w * Math.exp(-d2 * inv); }
      // soft round window keeps every emblem inside the same circle
      const r = Math.hypot(x - 0.5, y - 0.5);
      const win = r < 0.36 ? 1 : r > 0.47 ? 0 : 0.5 + 0.5 * Math.cos(((r - 0.36) / 0.11) * Math.PI);
      f[gy * G + gx] = v * win;
    }
    let max = 0, mx = G / 2, my = G / 2;
    for (let k = 0; k < f.length; k++) if (f[k] > max) { max = f[k]; mx = k % G; my = Math.floor(k / G); }
    const out = { f, max, peak: [mx, my], pts, F, s };
    cache.set(key, out);
    return out;
  }

  L.register({
    id: 'field',
    order: 3,
    name: '墨团',
    en: 'Field',
    tagline: '亮的属性在语义平面上发热，叠成一团墨；越分散越碎成群岛',
    dims: '256 个属性按共现相似度摊在一张平面图上，每个非零属性是一个热源（强度 = 打分）；整体扩散度决定热源向中心收拢多少、晕开多宽。',
    lineage: '前人：Blinn 的 metaball（1982）与等值线绘制（marching squares）；Kohonen 的自组织映射（1982）与 WEBSOM 文献地图；Gärdenfors《概念空间》（2000）；Nordkyn 随天气变形的标志（Neue，2011）。',
    about: '<p>矩阵在这里不直接画出来，而是变成一张"热力图"。256 个属性先按"是否常在同一个词上一起出现"摊在一张平面图上，意思相近的挨着。一个学科的每个非零属性就是平面上的一个热源，打分越高越热。所有热源叠加成一个连续的场，在同一个高度切一刀，切出来的轮廓就是纹章。</p>' +
      '<p>你说的"集中的学科像圆，扩散的学科像发散的形状"由一个数控制：<b>扩散度</b>。它综合了四个指标（16 个领域上的分布熵、占比超过 6% 的领域数、亮格在相似网格上的离散半径、强属性聚成的团块数），再按 48 个学科排名换算成 0~1。扩散度低，热源被拉向中心、晕得更开，融成一个圆团；扩散度高，热源保持分散、晕得更窄，碎成几座岛。"夸张"滑块可以把这个差别推得更极端。</p>' +
      '<p>三层：门类是团块中心那个反白的小"核"（理学圆、工学方、生命与健康叶形、人文拱门、社会科学六边形、经管法菱形、艺术星形）；学科是墨团本身；课程是墨团外面的涟漪线，几年级就有几圈。</p>' +
      '<p>好处：形状是从数据里"长"出来的，没有人工挑选的图形，相近的学科自然长得像，打分的小变动只会让轮廓微微变化，很稳定。问题：墨团不能"读"，看形状说不出是哪门学科；而且它依赖那张平面图，平面图是用现有 119 个词算出来的，重算就会变，所以真要用时必须把平面图冻结下来。</p>',
    controls: [
      { id: 'style', label: '画法', type: 'select', value: 'blob', options: [
        { value: 'blob', label: '墨团' }, { value: 'contour', label: '等高线' }, { value: 'dots', label: '网点' }] },
      { id: 'source', label: '底图', type: 'select', value: 'map', options: [
        { value: 'map', label: '语义平面' }, { value: 'grid', label: '相似网格' }] },
      { id: 'contrast', label: '夸张', type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 },
      { id: 'readout', label: '读数', type: 'toggle', value: true },
    ],
    render(ctx) {
      const { lab, size: S, colors, opts, vec, item, course } = ctx;
      const detail = ctx.mode === 'detail';
      const svg = lab.svg('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}` });
      const ink = colors.ink, paper = colors.panel || colors.paper;
      const B = build(vec, opts.source === 'grid' ? 'grid' : 'map', +opts.contrast || 0);
      if (!B.max) {
        svg.appendChild(lab.svg('circle', { cx: S / 2, cy: S / 2, r: S * 0.36, fill: 'none', stroke: colors.line, 'stroke-dasharray': '2 4' }));
        return svg;
      }
      const T = B.max * 0.27;
      const loops = (t, n) => isoLoops(B.f, t).map((l) => smooth(l, n)).filter((l) => Math.abs(area(l)) > 2.5);
      const main = loops(T, 2);
      const level = course ? Math.min(6, course.level) : 0;
      const echoes = [];
      for (let r = 1; r <= level; r++) echoes.push(loops(T * Math.pow(0.6, r), 2));

      // scale so the outermost drawn line touches R_EMBLEM: a compact subject becomes a full round disc,
      // a diffuse one an archipelago spread over the same circle
      const c0 = (G - 1) / 2;
      let rMax = 0;
      for (const l of main.concat(...echoes)) for (const [x, y] of l) rMax = Math.max(rMax, Math.hypot(x - c0, y - c0));
      const k = Math.min((S * R_EMBLEM) / Math.max(rMax, 1), (S * R_EMBLEM) / ((G - 1) * 0.12));
      const X = (g) => S / 2 + (g - c0) * k;
      const toD = (ls) => ls.map((l) => 'M' + l.map(([x, y]) => `${X(x).toFixed(2)} ${X(y).toFixed(2)}`).join(' L') + 'Z').join('');
      const sw = Math.max(1, S * 0.008);

      // course ripples: one ring per level, outside the blob
      for (let r = level; r >= 1; r--) {
        svg.appendChild(lab.svg('path', { d: toD(echoes[r - 1]), fill: 'none', stroke: ink, 'stroke-width': sw * (r === 1 ? 0.9 : 0.7), opacity: 0.85 - r * 0.08 }));
      }

      if (opts.style === 'contour') {
        [1, 1.7, 2.6, 3.8].forEach((m, i) => {
          if (T * m >= B.max) return;
          svg.appendChild(lab.svg('path', { d: toD(loops(T * m, 2)), fill: 'none', stroke: ink, 'stroke-width': sw * (i ? 1 : 1.8) }));
        });
      } else if (opts.style === 'dots') {
        const n = 26, step = (G - 1) / (n - 1);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const gx = Math.round(i * step), gy = Math.round(j * step);
          const v = B.f[gy * G + gx] / B.max;
          if (v < 0.12) continue;
          svg.appendChild(lab.svg('circle', { cx: X(i * step).toFixed(2), cy: X(j * step).toFixed(2), r: (Math.sqrt(Math.min(1, v / 0.75)) * k * step * 0.5).toFixed(2), fill: ink }));
        }
      } else {
        svg.appendChild(lab.svg('path', { d: toD(main), fill: ink, 'fill-rule': 'evenodd' }));
      }

      // family nucleus at the hottest point
      if (item && item.f >= 0) {
        const d = nucleus(item.f, X(B.peak[0]), X(B.peak[1]), S * 0.058);
        if (d) svg.appendChild(lab.svg('path', opts.style === 'blob'
          ? { d, fill: paper }
          : { d, fill: paper, stroke: ink, 'stroke-width': sw * 1.4 }));
      }

      if (detail && opts.readout) {
        const F = B.F;
        const t = lab.svg('text', { x: S * 0.04, y: S * 0.965, fill: colors.muted, 'font-size': Math.max(10, S * 0.026), 'font-family': '"IBM Plex Mono", ui-monospace, monospace' });
        t.textContent = `扩散 ${F.spread.toFixed(2)} · 团块 ${F.clusters} · 领域 ${F.active}/16${level ? ' · 涟漪 ' + level : ''}`;
        svg.appendChild(t);
      }

      // hover: nearest attribute to the pointer
      if (detail && ctx.hover) {
        const hit = lab.svg('rect', { x: 0, y: 0, width: S, height: S, fill: 'transparent' });
        hit.addEventListener('pointermove', (e) => {
          const rect = svg.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * S, py = ((e.clientY - rect.top) / rect.height) * S;
          let best = null, bd = Infinity;
          for (const p of B.pts) {
            const qx = X(p.x * (G - 1)), qy = X(p.y * (G - 1));
            const dd = (qx - px) ** 2 + (qy - py) ** 2;
            if (dd < bd) { bd = dd; best = p; }
          }
          if (best && bd < (S * 0.06) ** 2) {
            const a = D.attrs[best.i];
            ctx.hover({ title: `${lab.hex(best.i)} ${a.zh} ${a.en}`, sub: `${D.domains[a.d].zh} · 强度 ${Math.round(vec[best.i] * 255)}` });
          } else ctx.hover(null);
        });
        hit.addEventListener('pointerleave', () => ctx.hover(null));
        svg.appendChild(hit);
      }
      return svg;
    },
  });
})();
