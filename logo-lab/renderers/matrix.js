// 矩阵 Matrix: the 256 attributes as a 16×16 dot matrix, one cell per attribute, size = rating.
// The honest baseline: the raw feature table drawn as an image. Family = one of 7 frames built from the
// same lattice (8 frame segments × 3 line treatments), course = a ruler on the bottom edge.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const N = 256;

  // ---------- layouts: attribute index -> cell (row*16 + col) ----------

  // Antonym mirror: each antonym pair sits at columns c and 15-c of one row, the "positive" pole (good, life,
  // yang, order, warm, power side) on the left (heraldic dexter). Pairs fill the outer columns, unpaired
  // attributes the centre; rows stay roughly = domains.
  function mirrorLayout() {
    const POLES = ['good', 'life', 'yang', 'order', 'warm', 'power'];
    const score = new Float32Array(N);
    for (const ax of D.axes) if (POLES.includes(ax.key)) {
      for (const i of ax.posAttrs) score[i] += 1;
      for (const i of ax.negAttrs) score[i] -= 1;
    }
    const dom = (i) => D.attrs[i].d;
    const pairs = [];
    const paired = new Uint8Array(N);
    for (const a of D.attrs) {
      const j = a.pair;
      if (j < 0 || j === a.i || paired[a.i] || paired[j] || D.attrs[j].pair !== a.i) continue;
      paired[a.i] = paired[j] = 1;
      let l = Math.min(a.i, j), r = Math.max(a.i, j);
      if (score[r] > score[l]) [l, r] = [r, l];
      pairs.push([l, r]);
    }
    // same-domain pairs first: they have an obvious home row
    pairs.sort((p, q) => (dom(p[0]) !== dom(p[1])) - (dom(q[0]) !== dom(q[1])) || p[0] - q[0]);
    const rowPairs = Array.from({ length: 16 }, () => []);
    const rowSingles = Array.from({ length: 16 }, () => []);
    const free = (r) => 16 - rowPairs[r].length * 2 - rowSingles[r].length;
    const nearest = (d, need) => {
      for (let k = 0; k < 16; k++) for (const r of [d - k, d + k]) if (r >= 0 && r < 16 && free(r) >= need) return r;
      return -1;
    };
    for (const p of pairs) {
      let r = free(dom(p[0])) >= 2 ? dom(p[0]) : free(dom(p[1])) >= 2 ? dom(p[1]) : nearest(dom(p[0]), 2);
      rowPairs[r].push(p);
    }
    // unpaired: home row while it has room, overflow to the nearest row with space
    const singles = D.attrs.filter((a) => !paired[a.i]).map((a) => a.i);
    const overflow = [];
    for (const i of singles) (free(dom(i)) >= 1 ? rowSingles[dom(i)] : overflow).push(i);
    for (const i of overflow) rowSingles[nearest(dom(i), 1)].push(i);
    const out = new Int16Array(N);
    for (let r = 0; r < 16; r++) {
      const ps = rowPairs[r].slice().sort((p, q) => D.attrs[p[0]].k - D.attrs[q[0]].k);
      ps.forEach(([a, b], c) => { out[a] = r * 16 + c; out[b] = r * 16 + 15 - c; });
      const ss = rowSingles[r].slice().sort((a, b) => a - b);
      ss.forEach((i, k) => { out[i] = r * 16 + ps.length + k; });
    }
    return out;
  }

  const layoutCache = {};
  function layout(key) {
    if (layoutCache[key]) return layoutCache[key];
    const cellOf = key === 'mirror' ? mirrorLayout() : Int16Array.from(D.layouts[key] || D.layouts.gridSimilar);
    const attrAt = new Int16Array(N).fill(-1);
    for (let i = 0; i < N; i++) attrAt[cellOf[i]] = i;
    for (let c = 0; c < N; c++) if (attrAt[c] < 0) throw new Error('matrix layout ' + key + ': empty cell ' + c);
    return (layoutCache[key] = { cellOf, attrAt });
  }

  // ---------- family frames: 8 segments (4 corners, 4 edge middles) × 3 treatments ----------
  const FRAMES = [
    { name: '全框', note: '封闭的公理系统' },            // 理 sciences: corners + middles, solid
    { name: '四角', note: '裁切 / 对位标记' },           // 工 engineering: corners only
    { name: '圆角框', note: '细胞膜，有机的边界' },       // 生 life & health: full, rounded
    { name: '天头地脚', note: '书页的上下两道线' },       // 人 humanities: top + bottom
    { name: '点线框', note: '许多个体连成的边界' },       // 社 social sciences: full, dotted
    { name: '双柱', note: '账簿与法庭的两根柱子' },       // 经 economics, management & law: left + right
    { name: '开角框', note: '只留四边中段，框在角上打开' }, // 艺 arts: middles only
  ];

  // Course ruler: `level` ticks hanging from the bottom edge, every 5th one long (5 = 4 short + 1 long).
  function tickXs(n) {
    const xs = [];
    for (let k = 0; k < n; k++) xs.push(8 + (k - (n - 1) / 2));
    return xs;
  }

  function partsOf(ctx) {
    const it = ctx.item || {};
    if (it.kind !== 'combo') return null;
    const toV = (p) => {
      if (!p) return null;
      if (p instanceof Float32Array || Array.isArray(p) && p.length === N) return p;
      if (typeof p === 'string') return L.vec(p);
      if (p.vec) return p.vec;
      if (p.r) return L.toVec(p.r);
      if (p.zh) return L.vec(p.zh);
      return null;
    };
    let names = Array.isArray(it.parts) ? it.parts : String(it.zh || ctx.word || '').split(/\s*[+×]\s*/);
    if (!names || names.length !== 2) return null;
    const a = toV(names[0]), b = toV(names[1]);
    if (!a || !b) return null;
    const label = (p) => typeof p === 'string' ? p : (p && p.zh) || '';
    return { a, b, la: label(names[0]) || 'A', lb: label(names[1]) || 'B' };
  }

  const q4 = (v) => { const x = v * 255; return x <= 0 ? 0 : x >= 240 ? 4 : x >= 170 ? 3 : x >= 105 ? 2 : 1; };
  const Q4_NAME = ['', '弱联想', '明确', '强烈', '定义性'];
  const PIXEL_T = 100 / 255;

  L.register({
    id: 'matrix',
    order: 1,
    name: '矩阵',
    en: 'Matrix',
    tagline: '256 个属性排成 16×16，一格一个字节，点的大小就是打分',
    dims: '全部 256 个属性原样使用：16 个领域 × 16 个属性，Claude 按同一套打分规则给 0–255 分，一格一个，不做筛选。',
    lineage: '前人：约鲁巴 Ifá 占卜的 256 个 Odù（16×16）；Jacquard 织机打孔卡（1804）；Bertin《图形符号学》的可重排矩阵（1967）；Don Park 的 Identicon（2007）与 GitHub 的 5×5 镜像头像（2013）；Pentagram 为 MIT Media Lab 做的 7×7 网格标识（2014）。',
    about: `<p>256 = 16×16 = 一个字节的全部地址（0x00–0xFF）。每个属性占一格，点的大小就是打分。这是最老实的做法，也有古老的同类：约鲁巴人的 Ifá 占卜把 16 个主 Odù 两两相配成 256 个 Odù，每个都有自己的诗句；织机的打孔卡、Identicon 头像也都是"一张固定的格子表，每个成员各填一份"。格子能让一群东西看起来像一家人，靠的是共用同一个场、同一种读法——哪怕内容是哈希出来的随机数，Identicon 放在一起也像一个家族。这是这条路唯一而且真实的系统性。</p>
<p>门类画在外框上：外框和点阵用同一套格线，由 8 段（四个角、四条边的中段）和 3 种画法（实线、点线、圆角）组合成 7 种——理学全框，工学只留四角（裁切标记），艺术只留四边中段，人文只画上下（天头地脚），经管法只画左右（双柱），社会科学是点线框，生命与健康是圆角框。学科就是 256 个点本身。课程是底边的一把刻度尺：级别几就挂几道刻度，第 5 道加长，所以研究生课一眼能看出"5 加几"；课号后两位是顶边上的一道短刻度，从左到右表示它在本级里的位置。</p>
<p>点阵部分的字母表只有一个符号——点；"四阶"把它量化成打分规则自己的四档（弱联想、明确、强烈、定义性），画成小点、圆圈、圈中点、实心圆，这是从数据走向字母表的第一步。语法只有一条：位置 = 属性。于是布局就是全部设计。按领域排，学科之间的差别是散落各行的点；按相似排（默认），常一起出现的属性挨在一起，散点开始聚成团；同心环把常用属性放在中间；反义镜像让每对反义词在同一行左右对称，善、生、阳、治一侧在左。Bertin 在 1967 年就演示过：同一张表换一种行列顺序，噪声就会变成图形。"对称"开关取左右两格的较大值，散点立刻像脸、像虫、像纹章——Identicon 靠的就是这一招，代价是丢掉一半位置信息。</p>
<p>问题也很清楚。一是死像素：很多属性几乎没有学科用得上，常年是空格。二是相关属性：科学、知识、理性、秩序这类属性在一整个门类里一起亮，学科共享同一团亮点，真正的区别落在打分 60 的弱点上，48px 下几乎看不见。三是没有显著性层级：眼睛不知道先看哪个点，也说不出"数学是哪个点"。四是没有理据：天文学的"星辰"只是 0xE3 处一个点，不像星星。纹章可以用一句话描述（blazon），别人照着这句话就能重画；矩阵只能用 256 个数字描述，所以忠实，却记不住。</p>
<p>所以矩阵更适合做系统的输入层，而不是看得见的输出。它是一张地址到意义的查找表，擅长精确比较：两个学科组合时，每格左半圆是 A、右半圆是 B，拼成满圆的格子就是两者共有的属性。设计好的字母表应该从这张表里读值——"0xE3 星辰 ≥ 190 就画一颗星"——就像纹章里文字的 blazon 和画出来的盾面：前者是数据，后者由另一套语法来画。</p>`,
    controls: [
      { id: 'layout', label: '布局', type: 'select', value: 'gridSimilar', options: [
        { value: 'gridDomain', label: '按领域' },
        { value: 'gridSimilar', label: '按相似' },
        { value: 'gridRings', label: '同心环' },
        { value: 'mirror', label: '反义镜像' },
      ] },
      { id: 'style', label: '画法', type: 'select', value: 'dot', options: [
        { value: 'dot', label: '圆点' },
        { value: 'square', label: '方块' },
        { value: 'quant', label: '四阶' },
        { value: 'pixel', label: '像素' },
      ] },
      { id: 'symmetry', label: '左右对称', type: 'toggle', value: false },
      { id: 'grid', label: '空格参考点', type: 'toggle', value: true },
    ],

    render(ctx) {
      const { size: S, colors, opts } = ctx;
      const ink = colors.ink;
      const item = ctx.item || { kind: 'word', f: -1 };
      const fam = item.f >= 0 && item.f < 7 ? item.f : -1;
      const course = fam >= 0 ? ctx.course : null;
      const style = opts.style || 'dot';
      const detail = ctx.mode === 'detail' && typeof ctx.hover === 'function';
      const { cellOf, attrAt } = layout(opts.layout || 'gridSimilar');

      // geometry: matrix 16u, frame 1u outside it, frame side 18u = 84% of the square
      const G = 1;
      let u = (S * 0.82) / (16 + 2 * G);
      if (style === 'pixel' && S < 260) u = Math.max(1, Math.floor(u));
      const ox = Math.round(((S - 16 * u) / 2) * 2) / 2, oy = ox;
      const X = (c) => ox + c * u, Y = (r) => oy + r * u;
      const sw = Math.max(1, Math.round(u * 0.12 * 2) / 2);
      const snap = sw % 2 === 1 ? (v) => Math.round(v - 0.5) + 0.5 : (v) => Math.round(v * 2) / 2;
      const f2 = (v) => Math.round(v * 100) / 100;

      const root = L.svg('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}`, role: 'img', 'aria-label': ctx.word || '' });

      // ---------- values per cell (with optional left-right mirror by max) ----------
      const parts = partsOf(ctx);
      const vec = ctx.vec || new Float32Array(N);
      const cellVal = (v, cell) => v[attrAt[cell]];
      const mirrorCell = (cell) => (cell & ~15) | (15 - (cell & 15));
      // returns [value, sourceAttr]
      const pick = (v, cell) => {
        const a = cellVal(v, cell);
        if (!opts.symmetry) return [a, attrAt[cell]];
        const m = mirrorCell(cell), b = cellVal(v, m);
        return b > a ? [b, attrAt[m]] : [a, attrAt[cell]];
      };
      let total = 0;
      for (let i = 0; i < N; i++) total += vec[i];
      const empty = total <= 0;

      // ---------- guide dots ----------
      const gGuide = L.svg('g', { fill: ink, opacity: empty ? 0.32 : u < 3.5 ? 0.13 : 0.2 });
      const gCells = L.svg('g', { fill: ink });
      root.appendChild(gGuide);
      root.appendChild(gCells);
      const gr = Math.max(0.45, u * 0.075);

      const R = u * (u < 3.5 ? 0.56 : 0.52);
      const cx = (cell) => X((cell & 15) + 0.5), cy = (cell) => Y((cell >> 4) + 0.5);

      // shape of one value in one cell; half: 0 whole, -1 left half, +1 right half (combo dimidiation)
      const pixelPaths = [];
      function mark(cell, v, half) {
        const x = cx(cell), y = cy(cell);
        if (style === 'square') {
          const s = u * 0.86, w = half ? s / 2 : s;
          const x0 = half > 0 ? x : x - s / 2;
          gCells.appendChild(L.svg('rect', { x: f2(x0), y: f2(y - s / 2), width: f2(w), height: f2(s), 'fill-opacity': f2(Math.min(1, 0.08 + v * 0.92)) }));
          return;
        }
        if (style === 'pixel') {
          if (v < PIXEL_T) return false;
          const w = half ? u / 2 : u;
          const x0 = half > 0 ? x : x - u / 2;
          pixelPaths.push(`M${f2(x0)} ${f2(y - u / 2)}h${f2(w + 0.04)}v${f2(u + 0.04)}h${f2(-w - 0.04)}z`);
          return;
        }
        let r = v * R;
        if (style === 'quant') {
          const q = q4(v);
          if (!half && (q === 2 || q === 3)) {
            const ring = q === 2 ? R * 0.62 : R * 0.8, rs = Math.max(0.6, u * 0.1);
            gCells.appendChild(L.svg('circle', { cx: f2(x), cy: f2(y), r: f2(ring - rs / 2), fill: 'none', stroke: ink, 'stroke-width': f2(rs) }));
            if (q === 3) gCells.appendChild(L.svg('circle', { cx: f2(x), cy: f2(y), r: f2(Math.max(0.5, R * 0.3)) }));
            return;
          }
          r = [0, R * 0.28, R * 0.55, R * 0.78, R][q];
        }
        r = Math.max(u < 3.5 ? 0.5 : 0.35, r);
        if (!half) gCells.appendChild(L.svg('circle', { cx: f2(x), cy: f2(y), r: f2(r) }));
        else gCells.appendChild(L.svg('path', { d: `M${f2(x)} ${f2(y - r)}A${f2(r)} ${f2(r)} 0 0 ${half > 0 ? 1 : 0} ${f2(x)} ${f2(y + r)}Z` }));
      }

      const shown = new Float32Array(N); // displayed value per cell, for hover
      const srcAttr = new Int16Array(N);
      for (let cell = 0; cell < N; cell++) {
        let drawn = false;
        if (parts) {
          const gate = pick(vec, cell)[0] > 0;
          const [va] = pick(parts.a, cell), [vb] = pick(parts.b, cell);
          if (gate && va > 0) { if (mark(cell, va, vb > 0 ? -1 : 0) !== false) drawn = true; }
          if (gate && vb > 0) { if (mark(cell, vb, va > 0 ? 1 : 0) !== false) drawn = true; }
          const [v, s] = pick(vec, cell);
          shown[cell] = v; srcAttr[cell] = s;
        } else {
          const [v, s] = pick(vec, cell);
          shown[cell] = v; srcAttr[cell] = s;
          if (v > 0 && mark(cell, v, 0) !== false) drawn = true;
        }
        if (!drawn && (opts.grid || empty)) gGuide.appendChild(L.svg('circle', { cx: f2(cx(cell)), cy: f2(cy(cell)), r: f2(gr) }));
      }
      if (pixelPaths.length) gCells.appendChild(L.svg('path', { d: pixelPaths.join(''), 'shape-rendering': 'crispEdges' }));

      // ---------- family frame ----------
      const a = -G, b = 16 + G;
      const P = (x, y) => `${snap(X(x))} ${snap(Y(y))}`;
      let frameD = '';
      const stroke = { fill: 'none', stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'square' };
      if (fam >= 0) {
        const k = 4, m0 = 8 - 4.5, m1 = 8 + 4.5;
        let el;
        if (fam === 0 || fam === 4) frameD = `M${P(a, a)}L${P(b, a)}L${P(b, b)}L${P(a, b)}Z`;
        else if (fam === 1) frameD = `M${P(a, a + k)}L${P(a, a)}L${P(a + k, a)}M${P(b - k, a)}L${P(b, a)}L${P(b, a + k)}M${P(b, b - k)}L${P(b, b)}L${P(b - k, b)}M${P(a + k, b)}L${P(a, b)}L${P(a, b - k)}`;
        else if (fam === 3) frameD = `M${P(a, a)}L${P(b, a)}M${P(a, b)}L${P(b, b)}`;
        else if (fam === 5) frameD = `M${P(a, a)}L${P(a, b)}M${P(b, a)}L${P(b, b)}`;
        else if (fam === 6) frameD = `M${P(m0, a)}L${P(m1, a)}M${P(b, m0)}L${P(b, m1)}M${P(m0, b)}L${P(m1, b)}M${P(a, m0)}L${P(a, m1)}`;
        if (fam === 2) {
          const x0 = snap(X(a)), w = snap(X(b)) - x0, rr = 3.5 * u;
          el = L.svg('rect', { x: x0, y: x0, width: w, height: w, rx: f2(rr), ...stroke });
          frameD = `M${x0 + rr} ${x0}H${x0 + w - rr}A${rr} ${rr} 0 0 1 ${x0 + w} ${x0 + rr}V${x0 + w - rr}A${rr} ${rr} 0 0 1 ${x0 + w - rr} ${x0 + w}H${x0 + rr}A${rr} ${rr} 0 0 1 ${x0} ${x0 + w - rr}V${x0 + rr}A${rr} ${rr} 0 0 1 ${x0 + rr} ${x0}Z`;
        } else if (fam === 4) {
          const ds = Math.max(1.3, sw * 1.7);
          el = L.svg('path', { d: frameD, ...stroke, 'stroke-width': f2(ds), 'stroke-linecap': 'round', 'stroke-dasharray': `0 ${f2(u)}` });
        } else el = L.svg('path', { d: frameD, ...stroke });
        root.appendChild(el);
      }

      // ---------- course ruler ----------
      let rulerBox = null;
      if (course && course.level > 0) {
        const n = Math.min(9, course.level);
        const xs = tickXs(n);
        const yb = snap(Y(b));
        let d = `M${snap(X(xs[0] - 0.5))} ${yb}H${snap(X(xs[n - 1] + 0.5))}`;
        xs.forEach((x, k) => { d += `M${snap(X(x))} ${yb}V${f2(yb + (k === 4 ? 1.75 : 1.15) * u)}`; });
        // minor: position within the level, a short tick on the top edge
        const col = Math.min(15, Math.floor((course.minor * 16) / 100));
        const ya = snap(Y(a));
        d += `M${snap(X(col + 0.5))} ${ya}V${f2(ya - 0.8 * u)}`;
        root.appendChild(L.svg('path', { d, fill: 'none', stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'butt' }));
        rulerBox = { d };
      }

      // combo: a short pale (vertical line) above and below = impalement, the emblem is two halves
      if (parts) {
        const x = snap(X(8));
        root.appendChild(L.svg('path', { d: `M${x} ${f2(Y(-1.5))}V${f2(Y(-0.45))}M${x} ${f2(Y(16.45))}V${f2(Y(17.5))}`, stroke: ink, 'stroke-width': sw, fill: 'none' }));
      }

      // ---------- hover targets (detail only) ----------
      if (detail) {
        const gHit = L.svg('g', { fill: 'transparent' });
        const on = (el, info) => {
          el.style.cursor = 'crosshair';
          el.addEventListener('pointerenter', () => ctx.hover(info()));
          el.addEventListener('pointerleave', () => ctx.hover(null));
        };
        for (let cell = 0; cell < N; cell++) {
          const r = L.svg('rect', { x: f2(X(cell & 15)), y: f2(Y(cell >> 4)), width: f2(u), height: f2(u), 'pointer-events': 'all' });
          on(r, () => {
            const i = attrAt[cell], at = D.attrs[i], dz = D.domains[at.d].zh;
            const v = shown[cell], s = srcAttr[cell];
            let sub = `领域 ${dz} · 强度 ${Math.round(vec[i] * 255)}`;
            if (style === 'quant' && vec[i] > 0) sub += ` · ${Q4_NAME[q4(vec[i])]}`;
            if (parts) sub += ` · ${parts.la} ${Math.round(parts.a[i] * 255)} / ${parts.lb} ${Math.round(parts.b[i] * 255)}`;
            if (opts.symmetry && s !== i && v > vec[i]) sub += ` · 显示镜像格 ${L.hex(s)} ${D.attrs[s].zh} ${Math.round(v * 255)}`;
            return { title: `${L.hex(i)} ${at.zh} ${at.en}`, sub };
          });
          gHit.appendChild(r);
        }
        root.appendChild(gHit);
        if (fam >= 0 && frameD) {
          const fe = L.svg('path', { d: frameD, fill: 'none', stroke: 'transparent', 'stroke-width': Math.max(8, u * 0.9), 'pointer-events': 'stroke' });
          const F = D.families[fam];
          on(fe, () => ({ title: `门类 · ${F.zh} ${F.en}`, sub: `外框：${FRAMES[fam].name}（${FRAMES[fam].note}）${item.code ? ' · ' + item.code : ''}` }));
          root.appendChild(fe);
        }
        if (rulerBox) {
          const re = L.svg('path', { d: rulerBox.d, fill: 'none', stroke: 'transparent', 'stroke-width': Math.max(10, u * 1.2), 'pointer-events': 'stroke' });
          on(re, () => ({ title: `课程 ${course.label}`, sub: `级别 ${course.level}（${course.level >= 5 ? '研究生' : '本科'}，底边 ${Math.min(9, course.level)} 道刻度）· 序号 ${String(course.minor).padStart(2, '0')}（顶边位置）` }));
          root.appendChild(re);
        }
      }
      return root;
    },
  });
})();
