// 生长 Growth — the matrix as a genome, the emblem as an organism grown from it.
// Particles attach to a seed one by one. Each new particle either fills in the surface (Eden growth: a
// compact, round body) or arrives by a random walk and sticks where it first touches (diffusion-limited
// aggregation: branching coral). The subject's spread sets the mix, its domain profile sets the directions
// it grows toward, its family sets the seed, and a course is the same organism stopped at an earlier stage.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const M = 201, C = 100;              // lattice size and centre
  const N_FULL = 1600;                 // particles in a fully grown emblem
  const R_CAP = C - 24;                // growth stops before reaching the lattice edge
  const R_EMBLEM = 0.42;
  const BINS = 72;
  const STAGE = [1, 0.3, 0.5, 0.7, 0.85, 1];   // share of N_FULL shown for course level 1..5 (index 0 = no course)
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const TENSION = [0, 0.18, 0.75, 1, 1];

  // seed shapes, one per family (lattice offsets, chained so the seed draws as one stroke)
  const SEEDS = [
    { zh: '点', pts: [[0, 0]] },                                                        // 理
    { zh: '十字', pts: [[0, 0], [1, 0], [2, 0], [3, 0], [-1, 0], [-2, 0], [-3, 0], [0, 1], [0, 2], [0, 3], [0, -1], [0, -2], [0, -3]] }, // 工
    { zh: '环', pts: ring(4) },                                                         // 生
    { zh: '竖', pts: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, -1], [0, -2], [0, -3], [0, -4]] },  // 人
    { zh: '三点', pts: [[0, -5], [4, 3], [-4, 3]] },                                    // 社
    { zh: '横', pts: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [-1, 0], [-2, 0], [-3, 0], [-4, 0]] },  // 经
    { zh: '斜十字', pts: [[0, 0], [1, 1], [2, 2], [3, 3], [-1, -1], [-2, -2], [-3, -3], [1, -1], [2, -2], [3, -3], [-1, 1], [-2, 2], [-3, 3]] }, // 艺
  ];
  function ring(r) {
    const out = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2, p = [Math.round(r * Math.cos(a)), Math.round(r * Math.sin(a))];
      if (!out.some((q) => q[0] === p[0] && q[1] === p[1])) out.push(p);
    }
    return out;
  }

  // ---------- simulation ----------
  const cache = new Map();
  function grow(vec, fam, contrast, lab) {
    const q = Array.from(vec, (v) => (v * 255) | 0);
    const key = q.join(',') + '|' + fam + '|' + contrast.toFixed(2);
    if (cache.has(key)) return cache.get(key);
    const F = lab.features(vec);
    const s = Math.max(0, Math.min(1, 0.5 + (F.spread - 0.5) * (1 + 1.6 * contrast)));
    const pDLA = 0.06 + 0.9 * s;         // share of particles that arrive by random walk
    const pStick = 0.18 + 0.82 * s;      // a walker that touches the body sticks with this probability
    const rnd = lab.rng(lab.hash('growth|' + key));

    // preferred growth directions: domain shares placed around the circle
    const wt = new Float32Array(BINS);
    let wmax = 0;
    for (let b = 0; b < BINS; b++) {
      const th = (b / BINS) * Math.PI * 2;
      let w = 0;
      for (const d of F.dirs) w += Math.pow(d.share, 1.5) * Math.exp(3.5 * (Math.cos(th - d.angle) - 1));
      wt[b] = w;
      wmax = Math.max(wmax, w);
    }
    const bias = 0.8;
    for (let b = 0; b < BINS; b++) wt[b] = (1 - bias) + bias * (wmax ? wt[b] / wmax : 1);
    const cum = new Float32Array(BINS);
    let acc = 0;
    for (let b = 0; b < BINS; b++) { acc += wt[b]; cum[b] = acc; }
    const sampleAngle = () => {
      const r = rnd() * acc;
      let b = 0;
      while (cum[b] < r) b++;
      return ((b + rnd()) / BINS) * Math.PI * 2;
    };
    const binOf = (x, y) => { let a = Math.atan2(x - C, -(y - C)); if (a < 0) a += Math.PI * 2; return Math.min(BINS - 1, Math.floor((a / (Math.PI * 2)) * BINS)); };

    const occ = new Int32Array(M * M).fill(-1);
    const px = new Int16Array(N_FULL + 40), py = new Int16Array(N_FULL + 40), parent = new Int32Array(N_FULL + 40);
    const perim = [];
    let n = 0, rC = 0;
    const place = (x, y, par) => {
      occ[y * M + x] = n; px[n] = x; py[n] = y; parent[n] = par;
      rC = Math.max(rC, Math.hypot(x - C, y - C));
      for (const [dx, dy] of NB) { const s2 = (y + dy) * M + x + dx; if (occ[s2] < 0) perim.push(s2); }
      n++;
    };
    const seed = fam >= 0 ? SEEDS[fam].pts : SEEDS[0].pts;
    const chained = fam !== 4; // the three-point seed of 社 stays three separate colonies
    seed.forEach(([dx, dy], i) => place(C + dx, C + dy, chained && i ? occ[(C + seed[i - 1][1]) * M + C + seed[i - 1][0]] : -1));
    const nSeed = n;
    const neighbour = (x, y) => {
      const start = Math.floor(rnd() * 4);
      for (let k = 0; k < 4; k++) { const [dx, dy] = NB[(start + k) % 4]; const j = occ[(y + dy) * M + x + dx]; if (j >= 0) return j; }
      return -1;
    };

    let walkers = 0, steps = 0;
    while (n < N_FULL && rC < R_CAP) {
      if (rnd() < pDLA) {
        // diffusion-limited: launch a walker beyond the body, from a preferred direction
        walkers++;
        let th = sampleAngle(), r0 = rC + 4;
        let x = Math.round(C + r0 * Math.sin(th)), y = Math.round(C - r0 * Math.cos(th));
        for (let t = 0; t < 30000; t++) {
          steps++;
          const j = neighbour(x, y);
          if (j >= 0 && rnd() < pStick) { place(x, y, j); break; }
          const d = Math.hypot(x - C, y - C);
          if (d > rC + 22) { th = sampleAngle(); r0 = rC + 4; x = Math.round(C + r0 * Math.sin(th)); y = Math.round(C - r0 * Math.cos(th)); continue; }
          const len = d > rC + 7 ? Math.floor(d - rC - 5) : 1;   // long jumps while far away
          const [dx, dy] = NB[Math.floor(rnd() * 4)];
          const nx = x + dx * len, ny = y + dy * len;
          if (nx > 0 && ny > 0 && nx < M - 1 && ny < M - 1 && occ[ny * M + nx] < 0) { x = nx; y = ny; }
        }
      } else {
        // Eden: fill a surface site, preferring the subject's directions
        for (let tries = 0; tries < 400 && perim.length; tries++) {
          const k = Math.floor(rnd() * perim.length), site = perim[k];
          if (occ[site] >= 0) { perim[k] = perim[perim.length - 1]; perim.pop(); continue; }
          const x = site % M, y = Math.floor(site / M);
          let nOcc = 0;
          for (const [dx, dy] of NB) if (occ[(y + dy) * M + x + dx] >= 0) nOcc++;
          // surface tension: sites in a hollow fill first, so the compact body stays smooth and round
          if (tries < 399 && rnd() > wt[binOf(x, y)] * TENSION[nOcc]) continue;
          place(x, y, neighbour(x, y));
          break;
        }
      }
    }
    let x0 = M, x1 = 0, y0 = M, y1 = 0;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, px[i]); x1 = Math.max(x1, px[i]); y0 = Math.min(y0, py[i]); y1 = Math.max(y1, py[i]); }
    const box = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half: Math.max(x1 - x0, y1 - y0) / 2 + 1.5 };
    const out = { n, nSeed, px, py, parent, box, F, s, pDLA, walkers, steps };
    cache.set(key, out);
    return out;
  }

  L.register({
    id: 'growth',
    order: 2,
    name: '生长',
    en: 'Growth',
    tagline: '矩阵是基因：集中的学科长成圆盘，扩散的长成珊瑚',
    dims: '用矩阵算出的整体扩散度决定生长方式（表面填充 vs 随机游走），16 个领域的占比决定往哪些方向长；门类定种子，课程号定生长阶段。',
    lineage: '前人：Witten 与 Sander 的扩散限制凝聚（DLA，1981）与 Eden 生长模型（1961）；Nervous System 的 Floraform（2014）；Anders Hoff（inconvergent）的 Differential Line；Nordkyn 随天气变形的标志（Neue，2011）。',
    about: '<p>这里把矩阵当成基因，纹章是按基因长出来的。一粒一粒的粒子依次附着到一颗种子上。每一粒有两种来法：一种是直接填在表面的空位上（Eden 生长），这样长出来是一个紧实的圆盘；另一种是从远处随机游走过来，第一次碰到身体就粘上（扩散限制凝聚，DLA），这样长出来是分叉的珊瑚或霜花，因为突出的枝尖总是最先被碰到。</p>' +
      '<p>两种来法的比例由<b>扩散度</b>决定。扩散度综合了 16 个领域上的分布熵、主要领域的个数、亮格在相似网格上的离散程度和强属性的团块数，再按 48 个学科排名换算成 0~1。越集中的学科，越多粒子用表面填充，长成圆；越扩散的学科，越多粒子随机游走，长成分叉的形。方向也来自矩阵：16 个领域排成一圈，哪个领域占比大，游走的粒子就更多地从那个方向来，那一侧也长得更多。</p>' +
      '<p>三层：门类是<b>种子</b>，理学一个点，工学十字，生命与健康一个环，人文竖线，社会科学三颗分开的种子，经管法横线，艺术斜十字；种子决定了生长从什么形状开始。学科是生长规则。课程号是<b>生长阶段</b>：101 只长到三成，201 五成，301 七成，401 八成五，501 长满，研究生课程在下方加点。同一学科的所有课程是同一株生物的不同时刻，101 的形状就包含在 401 里面。</p>' +
      '<p>好处：形状是"长"出来的，有生命感；集中和扩散的区别一眼可见；课程之间的关系（先修、进阶）有了直观的形式。问题：生长带随机性，这里用学科向量算出的固定随机种子保证每次结果一样，但打分稍有变化，枝杈就可能长得完全不同，不如墨团稳定；门类种子在长满之后会被淹没，只能在中心隐约看到。</p>',
    controls: [
      { id: 'style', label: '画法', type: 'select', value: 'body', options: [
        { value: 'body', label: '实体' }, { value: 'branch', label: '枝' }, { value: 'dots', label: '粒' }] },
      { id: 'contrast', label: '夸张', type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 },
      { id: 'seed', label: '种子', type: 'toggle', value: true },
      { id: 'readout', label: '读数', type: 'toggle', value: true },
    ],
    render(ctx) {
      const { lab, size: S, colors, opts, vec, item, course } = ctx;
      const detail = ctx.mode === 'detail';
      const svg = lab.svg('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}` });
      const ink = colors.ink, paper = colors.panel || colors.paper;
      let total = 0;
      for (let i = 0; i < 256; i++) total += vec[i];
      if (!total) {
        svg.appendChild(lab.svg('circle', { cx: S / 2, cy: S / 2, r: S * 0.03, fill: colors.line }));
        return svg;
      }
      const fam = item && item.f >= 0 ? item.f : -1;
      const G = grow(vec, fam, +opts.contrast || 0, lab);
      const level = course ? Math.max(1, Math.min(9, course.level)) : 0;
      const shown = level ? Math.max(G.nSeed, Math.round(G.n * STAGE[Math.min(5, level)])) : G.n;
      // centre the fully grown organism; earlier course stages keep the same scale and position
      const k = (S * R_EMBLEM) / G.box.half;
      const X = (x) => S / 2 + (x - G.box.cx) * k, Y = (y) => S / 2 + (y - G.box.cy) * k;

      // subtree sizes over the shown prefix: trunks are thick, twigs thin
      const sub = new Float32Array(shown).fill(1);
      for (let i = shown - 1; i >= 0; i--) { const p = G.parent[i]; if (p >= 0 && p < shown) sub[p] += sub[i]; }
      const style = opts.style;
      const widthOf = (i) => {
        const t = Math.min(1, Math.log(1 + sub[i]) / Math.log(1 + 120));
        return style === 'branch' ? k * (0.35 + 1.5 * Math.pow(t, 1.4)) : k * (1.25 + 1.9 * Math.pow(t, 1.2));
      };

      if (style === 'dots') {
        const r = k * 0.48;
        let d = '';
        for (let i = 0; i < shown; i++) { const x = X(G.px[i]), y = Y(G.py[i]); d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`; }
        svg.appendChild(lab.svg('path', { d, fill: ink }));
      } else {
        // segments to parent, bucketed by width so the SVG stays small
        const buckets = new Map();
        for (let i = 0; i < shown; i++) {
          const p = G.parent[i];
          const w = Math.round(widthOf(i) * 4) / 4;
          const x = X(G.px[i]), y = Y(G.py[i]);
          const seg = p >= 0 ? `M${X(G.px[p]).toFixed(1)} ${Y(G.py[p]).toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}l0.01 0`;
          buckets.set(w, (buckets.get(w) || '') + seg);
        }
        [...buckets.keys()].sort((a, b) => b - a).forEach((w) => svg.appendChild(lab.svg('path', {
          d: buckets.get(w), fill: 'none', stroke: ink, 'stroke-width': w.toFixed(2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        })));
      }

      // the family seed, drawn at a fixed visual size where the organism started
      if (opts.seed && fam >= 0) {
        const d = familyMark(fam, X(C), Y(C), S * 0.06);
        const w = Math.max(1.2, S * 0.016);
        if (style === 'branch') svg.appendChild(lab.svg('path', { d, fill: 'none', stroke: paper, 'stroke-width': (w * 2.6).toFixed(2), 'stroke-linecap': 'round' }));
        svg.appendChild(lab.svg('path', { d, fill: 'none', stroke: style === 'branch' ? ink : paper, 'stroke-width': w.toFixed(2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }

      // graduate levels beyond the full organism: small dots under it
      if (level > 5) {
        const r = Math.max(1.4, S * 0.014), gap = r * 3.2, y = S * 0.955;
        for (let j = 0; j < level - 5; j++) svg.appendChild(lab.svg('circle', { cx: S / 2 + (j - (level - 6) / 2) * gap, cy: y, r, fill: ink }));
      }

      if (detail && opts.readout) {
        const t = lab.svg('text', { x: S * 0.04, y: S * 0.965, fill: colors.muted, 'font-size': Math.max(10, S * 0.026), 'font-family': '"IBM Plex Mono", ui-monospace, monospace' });
        t.textContent = `扩散 ${G.F.spread.toFixed(2)} · 游走 ${Math.round(G.pDLA * 100)}% · ${shown}/${G.n} 粒${fam >= 0 ? ' · 种子 ' + SEEDS[fam].zh : ''}`;
        svg.appendChild(t);
      }
      return svg;
    },
  });

  // the seven family marks, as strokes centred on (x, y) with radius r: the shapes of the seeds
  function familyMark(fam, x, y, r) {
    const f = (v) => v.toFixed(1);
    const circle = (cx, cy, rr) => `M${f(cx - rr)} ${f(cy)}a${f(rr)} ${f(rr)} 0 1 0 ${f(2 * rr)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-2 * rr)} 0`;
    switch (fam) {
      case 0: return circle(x, y, r * 0.32);                                                   // 理 point
      case 1: return `M${f(x - r)} ${f(y)}H${f(x + r)}M${f(x)} ${f(y - r)}V${f(y + r)}`;        // 工 cross
      case 2: return circle(x, y, r * 0.8);                                                    // 生 ring
      case 3: return `M${f(x)} ${f(y - r)}V${f(y + r)}`;                                       // 人 vertical
      case 4: return [[0, -1], [0.87, 0.5], [-0.87, 0.5]].map(([a, b]) => circle(x + a * r * 0.8, y + b * r * 0.8, r * 0.18)).join(''); // 社 three
      case 5: return `M${f(x - r)} ${f(y)}H${f(x + r)}`;                                       // 经 horizontal
      case 6: { const q = r * 0.75; return `M${f(x - q)} ${f(y - q)}L${f(x + q)} ${f(y + q)}M${f(x + q)} ${f(y - q)}L${f(x - q)} ${f(y + q)}`; } // 艺 X
      default: return '';
    }
  }
})();
