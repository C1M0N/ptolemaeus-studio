// 符印 Sigil — the trace route: a public base figure of 256 stations, and a private path through them.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const N = 256;
  const TAU = Math.PI * 2;

  // ---------- geometry (unit space: 1 = 0.42 * size, origin = centre of the square) ----------
  const G = {
    seal: { cy: -0.1, rings: [0.36, 0.58, 0.8], foot: 0.97 },
    free: { cy: 0, rings: [0.44, 0.66, 0.88] },
  };

  // generality rings: common attributes sit on the inner ring, rare (specific) ones on the outer
  const freq = D.stats.freq;
  const byFreq = [...Array(N).keys()].sort((a, b) => freq[b] - freq[a] || a - b);
  const ringOf = new Int8Array(N);
  byFreq.forEach((i, rank) => { ringOf[i] = rank < 86 ? 0 : rank < 171 ? 1 : 2; });

  function positions(base, form) {
    const g = G[form], half = form === 'seal';
    const out = [];
    for (let i = 0; i < N; i++) {
      let x, y;
      if (base === 'kamea') {
        const cell = D.layouts.gridSimilar[i], row = Math.floor(cell / 16), col = cell % 16;
        x = half ? 0.06 + (col + 0.5) / 16 * 0.8 : ((col + 0.5) / 16 * 2 - 1) * 0.86;
        y = g.cy + ((row + 0.5) / 16 * 2 - 1) * (half ? 0.84 : 0.86);
      } else if (base === 'stars') {
        const [px, py] = D.layouts.xy[i];
        x = half ? 0.04 + px * 0.84 : (px * 2 - 1) * 0.94;
        y = g.cy + (py * 2 - 1) * (half ? 0.86 : 0.94);
      } else {
        const a = D.layouts.angle[i];
        const th = half ? Math.PI * (0.05 + 0.9 * a) : a * TAU;
        const r = g.rings[ringOf[i]];
        x = r * Math.sin(th);
        y = g.cy - r * Math.cos(th);
      }
      out.push([x, y]);
    }
    return out;
  }
  const POS = {};
  for (const b of ['wheel', 'kamea', 'stars']) for (const f of ['seal', 'free']) POS[b + f] = positions(b, f);

  // Specificity: attributes that light up in few words are better at telling sigils apart.
  // Used only to break ties between equal ratings (ratings are quantised: 255/190/150/120/90/60).
  const df = new Float32Array(N);
  for (const w of D.words) for (const k in w.r) if (w.r[k] > 0) df[+k] += 1;
  let dfMax = 1;
  for (let i = 0; i < N; i++) dfMax = Math.max(dfMax, df[i]);
  const spec = Float32Array.from(df, (x) => 1 - x / dfMax);

  // ---------- families: the seven classical planets, built from circle, crescent, cross, arrow, dot ----------
  const PLANETS = [
    { key: 'sun', sym: '☉', zh: '日', en: 'Sun', why: '光与度量' },
    { key: 'mars', sym: '♂', zh: '火星', en: 'Mars', why: '铁与工具' },
    { key: 'moon', sym: '☽', zh: '月', en: 'Moon', why: '潮汐、生长与身体' },
    { key: 'saturn', sym: '♄', zh: '土星', en: 'Saturn', why: '时间、记忆与学者' },
    { key: 'mercury', sym: '☿', zh: '水星', en: 'Mercury', why: '信使与交换' },
    { key: 'jupiter', sym: '♃', zh: '木星', en: 'Jupiter', why: '法度与财富' },
    { key: 'venus', sym: '♀', zh: '金星', en: 'Venus', why: '美' },
  ];

  // arc points, degrees, increasing angle = clockwise on screen (y down)
  function arcPts(cx, cy, r, a0, a1) {
    const pts = [];
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
    for (let j = 0; j <= n; j++) {
      const a = ((a0 + (a1 - a0) * j / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }
  // Each sign lives in a box [-1,1]^2 (y down): S open polylines, C circles [cx,cy,r], F filled polygons.
  function signGeometry(key) {
    const S = [], F = [], C = [];
    if (key === 'sun') {
      C.push([0, 0, 0.66]);
      F.push(arcPts(0, 0, 0.17, 0, 360));
    } else if (key === 'moon') {
      const r = 0.7, dx = 0.36, tx = dx / 2, ty = Math.sqrt(r * r - tx * tx);
      const a = (Math.atan2(ty, tx) * 180) / Math.PI;
      const ai = (Math.atan2(ty, tx - dx) * 180) / Math.PI;
      const outer = arcPts(0, 0, r, a, 360 - a);
      const inner = arcPts(dx, 0, r, ai, 360 - ai).reverse();
      F.push(outer.concat(inner).map(([x, y]) => [x + 0.16, y]));
    } else if (key === 'mercury') {
      C.push([0, -0.08, 0.34]);
      S.push(arcPts(0, -0.72, 0.3, 15, 165));
      S.push([[0, 0.26], [0, 0.96]]);
      S.push([[-0.28, 0.63], [0.28, 0.63]]);
    } else if (key === 'venus') {
      C.push([0, -0.3, 0.44]);
      S.push([[0, 0.14], [0, 0.96]]);
      S.push([[-0.32, 0.57], [0.32, 0.57]]);
    } else if (key === 'mars') {
      const cx = -0.2, cy = 0.2, r = 0.44, k = Math.SQRT1_2, tip = [0.68, -0.68];
      C.push([cx, cy, r]);
      S.push([[cx + r * k, cy - r * k], tip]);
      S.push([[0.22, -0.68], tip, [0.68, -0.22]]);
    } else if (key === 'jupiter') {
      // a curl falling into a base line, crossed by a stem: the geometric 4
      const head = arcPts(-0.3, -0.44, 0.3, 180, 395);
      S.push(head.concat([[-0.62, 0.34], [0.7, 0.34]]));
      S.push([[0.3, -0.64], [0.3, 0.96]]);
    } else if (key === 'saturn') {
      // a cross whose stem grows a sickle: the geometric h
      S.push([[-0.26, -0.96], [-0.26, 0.34]]);
      S.push([[-0.56, -0.62], [0.04, -0.62]]);
      const shoulder = arcPts(0.04, -0.06, 0.3, 180, 360);
      const hook = arcPts(0.56, 0.5, 0.22, 180, 90).map(([x, y]) => [x, y]);
      S.push(shoulder.concat([[0.34, 0.5]], hook.slice(1)));
    }
    return { S, F, C };
  }

  // ---------- the trace ----------
  function selectNodes(vec, k) {
    const idx = [];
    for (let i = 0; i < N; i++) if (vec[i] > 0) idx.push(i);
    idx.sort((a, b) => vec[b] - vec[a] || spec[b] - spec[a] || a - b);
    return idx.slice(0, k);
  }

  function polarNodes(sel, vec, P, cy) {
    return sel.map((i) => {
      const [x, y] = P[i];
      let th = Math.atan2(x, -(y - cy));
      if (th < 0) th += TAU;
      return { i, v: vec[i], x, y, th, r: Math.hypot(x, y - cy) };
    }).sort((a, b) => a.th - b.th || a.r - b.r || a.i - b.i);
  }

  // free form: angular order cut open at the widest gap
  function cutAtGap(nodes) {
    const n = nodes.length;
    if (n < 2) return { nodes, gap: TAU };
    let best = -1, gap = -1;
    for (let j = 0; j < n; j++) {
      const g = j === n - 1 ? nodes[0].th + TAU - nodes[j].th : nodes[j + 1].th - nodes[j].th;
      if (g > gap + 1e-9) { gap = g; best = j; }
    }
    const out = nodes.slice(best + 1).concat(nodes.slice(0, best + 1)).map((nd) => Object.assign({}, nd));
    for (let j = 1; j < n; j++) while (out[j].th < out[j - 1].th) out[j].th += TAU;
    return { nodes: out, gap };
  }

  const smooth = (t) => t * t * (3 - 2 * t);
  const fmt = (n) => Math.round(n * 100) / 100;
  let uid = 0;

  LogoLab.register({
    id: 'sigil',
    order: 3,
    name: '符印',
    en: 'Sigil',
    tagline: '256 个属性排成一张公共轮盘，最强的几项连成一笔',
    dims: '取最强的 k 个属性（同分取更少见的），按它们在公共底图上的位置连成一笔。',
    lineage: '前人：阿格里帕《神秘哲学三书》的行星魔方与印记（1531–1533）；约翰·迪伊《象形单子》（1564）；黄金黎明会的玫瑰十字字轮（1888 年后）；奥斯汀·奥斯曼·斯佩尔《快乐之书》中的符印法（1913）。',
    about: '<p>符印是最古老的“名字 → 符号”机器。阿格里帕把行星魔方印在书里，把天使的名字换成数字，在方阵上连线，得到一个只属于这个名字的印记；黄金黎明会把希伯来字母排在玫瑰花瓣上，沿着字母顺序画线；斯佩尔则把一句愿望删掉重复字母，再把剩下的笔画揉成一个图形。它们的共同点是：<b>底图是公共的，路径是私有的</b>。所有人共用同一张底图，所以印记之间可以比较；每个名字走出不同的路径，所以印记各不相同。</p><p>这里的“字母”是 256 个语义属性。轮盘上按相似度排列一圈（相近的属性挨在一起），常见的属性放内圈、少见的放外圈。一个学科取最强的 k 个属性（同分时优先取更少见的，因为它更能区分），再按它们在轮盘上的角度顺序连成一笔：起笔一个小圆，收笔一道横。“对称印”只用半个轮盘，再左右镜像，所以每个学科都得到一个左右对称、像器皿或人形的印。</p><p>三层这样分：门类用古典七曜的符号放在印心，理学是日 ☉，工学是火星 ♂，生命与健康是月 ☽，人文是土星 ♄，社会科学是水星 ☿，经管法是木星 ♃，艺术是金星 ♀。这是炼金术和占星术留下的一套封闭符号系统，只用圆、新月、十字、箭头四种部件拼成。学科是那一笔的走势。课程是收笔处的横：本科几年级就画几道，研究生课程把收笔封成一个实心点，再加横。</p><p>好处：手感强，每个学科的印都可以“拥有”；意思相近的学科会经过同样的节点，所以印里会出现相同的局部笔画。问题：连线顺序是人为规定的。按强度排序的话，打分稍微一变，顺序就变，整个印就不认得了；这里改成按轮盘角度排序，只要选中的属性不变，图形就不变，但换掉其中一个属性仍然会改变一段笔画。另外，路径本身只能读出“像”，读不出具体是哪些属性，它更像签名，而不是可以拼读的文字。</p>',
    controls: [
      { id: 'base', label: '底图', type: 'select', value: 'wheel',
        options: [{ value: 'wheel', label: '轮盘' }, { value: 'kamea', label: '方阵' }, { value: 'stars', label: '星图' }] },
      { id: 'form', label: '印式', type: 'select', value: 'seal',
        options: [{ value: 'seal', label: '对称印' }, { value: 'free', label: '自由笔' }] },
      { id: 'k', label: '节点数', type: 'range', min: 4, max: 14, step: 1, value: 8 },
      { id: 'path', label: '笔势', type: 'select', value: 'arc',
        options: [{ value: 'line', label: '折线' }, { value: 'arc', label: '弧线' }] },
      { id: 'guide', label: '底图线', type: 'select', value: 'auto',
        options: [{ value: 'auto', label: '自动（详情显示）' }, { value: 'on', label: '显示' }, { value: 'off', label: '隐藏' }] },
    ],
    render(ctx) {
      const { lab, size: s, colors, opts, vec, item, course } = ctx;
      const detail = ctx.mode === 'detail';
      const base = ['wheel', 'kamea', 'stars'].includes(opts.base) ? opts.base : 'wheel';
      const form = opts.form === 'free' ? 'free' : 'seal';
      const g = G[form];
      const k = Math.max(4, Math.min(14, Math.round(+opts.k || 8)));
      const arcs = opts.path !== 'line';
      const showGuide = opts.guide === 'on' || (opts.guide !== 'off' && detail);
      const P = POS[base + form];
      const c = s / 2, R = s * 0.42;
      const X = (u) => c + u * R, Y = (v) => c + v * R;
      const w = Math.max(1.3, s * 0.019 + 0.5);
      const ink = colors.ink;
      const id = 'sigil' + (++uid) + '_' + lab.hash((ctx.word || '') + s);
      const root = lab.svg('svg', { width: s, height: s, viewBox: `0 0 ${s} ${s}` });
      const hov = (el, title, sub) => {
        if (!detail || !ctx.hover) return el;
        el.style.cursor = 'crosshair';
        el.addEventListener('pointerenter', () => ctx.hover({ title, sub }));
        el.addEventListener('pointerleave', () => ctx.hover(null));
        return el;
      };
      const mirrorX = (pt) => [2 * c - pt[0], pt[1]];
      const polar = (th, r) => [X(r * Math.sin(th)), Y(g.cy - r * Math.cos(th))];
      const toD = (arr) => 'M' + arr.map(([x, y]) => fmt(x) + ' ' + fmt(y)).join(' L');
      const stroke = (d, sw, extra) => lab.svg('path', Object.assign({ d, fill: 'none', stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, extra || {}));

      // ---- families (one planet; a combo of two disciplines shows both, in conjunction) ----
      let families = item && item.f >= 0 ? [item.f] : [];
      let parts = null;
      if (item && item.kind === 'combo') {
        const names = Array.isArray(item.parts) ? item.parts
          : String(item.zh || ctx.word || '').split('+').map((x) => x.trim()).filter(Boolean);
        parts = names.slice(0, 2).map((p) => {
          const name = typeof p === 'string' ? p : p && p.zh;
          const it = name ? lab.item(name) : null;
          return { name, f: it ? it.f : -1, vec: name ? lab.vec(name) : null };
        });
        families = parts.map((p) => p.f).filter((f) => f >= 0);
        if (families.length === 2 && families[0] === families[1]) families = [families[0]];
      }

      // ---- guide: the shared base figure ----
      if (showGuide) {
        const gg = lab.svg('g', {});
        const gw = Math.max(0.6, s / 800);
        const line = colors.line;
        if (base === 'wheel') {
          for (const r of g.rings) gg.appendChild(lab.svg('circle', { cx: c, cy: fmt(Y(g.cy)), r: fmt(r * R), fill: 'none', stroke: line, 'stroke-width': gw }));
        } else if (base === 'kamea') {
          const half = form === 'seal';
          for (let j = 0; j <= 16; j++) {
            const xu = half ? 0.06 + j / 16 * 0.8 : (j / 16 * 2 - 1) * 0.86;
            const yu = g.cy + (j / 16 * 2 - 1) * (half ? 0.84 : 0.86);
            const x0 = half ? 0.06 : -0.86, x1 = half ? 0.86 : 0.86;
            const y0 = g.cy - (half ? 0.84 : 0.86), y1 = g.cy + (half ? 0.84 : 0.86);
            gg.appendChild(lab.svg('line', { x1: fmt(X(x0)), y1: fmt(Y(yu)), x2: fmt(X(x1)), y2: fmt(Y(yu)), stroke: line, 'stroke-width': gw }));
            gg.appendChild(lab.svg('line', { x1: fmt(X(xu)), y1: fmt(Y(y0)), x2: fmt(X(xu)), y2: fmt(Y(y1)), stroke: line, 'stroke-width': gw }));
            if (half) {
              gg.appendChild(lab.svg('line', { x1: fmt(X(-x0)), y1: fmt(Y(yu)), x2: fmt(X(-x1)), y2: fmt(Y(yu)), stroke: line, 'stroke-width': gw }));
              gg.appendChild(lab.svg('line', { x1: fmt(X(-xu)), y1: fmt(Y(y0)), x2: fmt(X(-xu)), y2: fmt(Y(y1)), stroke: line, 'stroke-width': gw }));
            }
          }
        }
        if (form === 'seal') gg.appendChild(lab.svg('line', { x1: c, y1: fmt(Y(-1)), x2: c, y2: fmt(Y(1)), stroke: line, 'stroke-width': gw }));
        const dr = Math.max(0.7, s / 480);
        for (let i = 0; i < N; i++) {
          const pts = form === 'seal' ? [[X(P[i][0]), Y(P[i][1])], [X(-P[i][0]), Y(P[i][1])]] : [[X(P[i][0]), Y(P[i][1])]];
          const a = D.attrs[i];
          for (const [x, y] of pts) {
            gg.appendChild(lab.svg('circle', { cx: fmt(x), cy: fmt(y), r: fmt(dr * (base === 'stars' ? 0.7 + freq[i] * 5 : 1)), fill: colors.muted, opacity: 0.5 }));
            if (detail) gg.appendChild(hov(lab.svg('circle', { cx: fmt(x), cy: fmt(y), r: Math.max(3, s / 160), fill: 'transparent' }), a.zh + ' ' + a.en, lab.hex(i) + ' · ' + D.domains[a.d].zh));
          }
        }
        root.appendChild(gg);
      }

      // ---- planet sign(s) ----
      const signR = form === 'seal' ? 0.21 : 0.24;
      const signs = lab.svg('g', {});
      if (families.length) {
        const sw = w * 0.8;
        const boxes = families.length === 1 ? [[0, g.cy, signR]] : [[-signR * 0.6, g.cy, signR * 0.62], [signR * 0.6, g.cy, signR * 0.62]];
        families.forEach((f, j) => {
          const [ox, oy, hr] = boxes[j];
          const geo = signGeometry(PLANETS[f].key);
          const tx = (p) => fmt(X(ox + p[0] * hr)), ty = (p) => fmt(Y(oy + p[1] * hr));
          const sg = lab.svg('g', {});
          for (const pl of geo.S) sg.appendChild(stroke('M' + pl.map((p) => tx(p) + ' ' + ty(p)).join(' L'), sw));
          for (const [cx, cy, r] of geo.C) sg.appendChild(lab.svg('circle', { cx: tx([cx, cy]), cy: ty([cx, cy]), r: fmt(r * hr * R), fill: 'none', stroke: ink, 'stroke-width': sw }));
          for (const pl of geo.F) sg.appendChild(lab.svg('path', { d: 'M' + pl.map((p) => tx(p) + ' ' + ty(p)).join(' L') + 'Z', fill: ink, stroke: ink, 'stroke-width': sw * 0.25, 'stroke-linejoin': 'round' }));
          const fam = D.families[f], pl = PLANETS[f];
          sg.appendChild(lab.svg('circle', { cx: tx([0, 0]), cy: ty([0, 0]), r: fmt(hr * R), fill: 'transparent' }));
          hov(sg, `${fam.zh} · ${pl.zh} ${pl.sym}`, `门类印：${pl.en}（${pl.why}）`);
          signs.appendChild(sg);
        });
      }

      const sel = selectNodes(vec, k);
      if (!sel.length) {
        // empty state: the faint ring of stations with nothing traced
        root.appendChild(lab.svg('circle', { cx: c, cy: fmt(Y(g.cy)), r: fmt(R * g.rings[2]), fill: 'none', stroke: colors.line, 'stroke-width': w * 0.6, 'stroke-dasharray': `0 ${fmt(w * 2.2)}`, 'stroke-linecap': 'round' }));
        root.appendChild(lab.svg('circle', { cx: c, cy: fmt(Y(g.cy)), r: fmt(w * 1.8), fill: 'none', stroke: colors.muted, 'stroke-width': w * 0.8 }));
        root.appendChild(signs);
        return root;
      }

      const level = course ? Math.max(1, Math.min(9, course.level)) : 0;
      const grad = level >= 5;
      const bars = grad ? level - 4 : level;
      const startR = w * 1.7;
      const segPts = (a, b) => { // a -> b, excluding a
        if (!arcs) return [polar(b.th, b.r)];
        const dth = b.th - a.th;
        const steps = Math.max(2, Math.ceil(Math.abs(dth) / (TAU / 144)));
        const out = [];
        for (let t = 1; t <= steps; t++) out.push(polar(a.th + dth * t / steps, a.r + (b.r - a.r) * smooth(t / steps)));
        return out;
      };

      let nodes, startPt, outline, closed = false, endA, endB, tailPts, mirrored = form === 'seal';
      if (form === 'seal') {
        nodes = polarNodes(sel, vec, P, g.cy);
        const first = nodes[0], last = nodes[nodes.length - 1];
        const top = { th: 0, r: first.r }, bot = { th: Math.PI, r: last.r };
        const right = [polar(0, first.r)];
        let prev = top;
        for (const nd of nodes.concat([bot])) { right.push(...segPts(prev, nd)); prev = nd; }
        outline = right.concat(right.slice(1, -1).reverse().map(mirrorX));
        closed = true;
        startPt = right[0];
        // terminal stroke: down the axis from the bottom junction to the foot
        endA = right[right.length - 1];
        endB = [c, Y(g.foot)];
        tailPts = [endA, endB];
      } else {
        const cut = cutAtGap(polarNodes(sel, vec, P, g.cy));
        nodes = cut.nodes;
        const n = nodes.length;
        outline = [polar(nodes[0].th, nodes[0].r)];
        for (let j = 1; j < n; j++) outline.push(...segPts(nodes[j - 1], nodes[j]));
        startPt = outline[0];
        const last = nodes[n - 1], lr = Math.max(0.2, last.r);
        const spacing = Math.max(w * 1.9, s * 0.03);
        const tailLen = w * 3.4 + bars * spacing;
        const maxAng = n > 1 ? cut.gap * 0.42 : TAU * 0.3;
        tailPts = [];
        if (arcs) {
          const dth = Math.min(maxAng, tailLen / (lr * R));
          const steps = Math.max(3, Math.ceil(dth / (TAU / 144)));
          for (let t = 0; t <= steps; t++) tailPts.push(polar(last.th + dth * t / steps, lr));
        } else {
          const len = Math.min(tailLen, maxAng * lr * R), dir = [Math.cos(last.th), Math.sin(last.th)];
          const [x0, y0] = polar(last.th, last.r);
          tailPts.push([x0, y0], [x0 + dir[0] * len, y0 + dir[1] * len]);
        }
      }

      // walk along the terminal stroke
      const cum = [0];
      for (let j = 1; j < tailPts.length; j++) cum.push(cum[j - 1] + Math.hypot(tailPts[j][0] - tailPts[j - 1][0], tailPts[j][1] - tailPts[j - 1][1]));
      const total = cum[cum.length - 1];
      const at = (d) => {
        d = Math.max(0, Math.min(total, d));
        let j = 1;
        while (j < cum.length - 1 && cum[j] < d) j++;
        const a = tailPts[j - 1], b = tailPts[j];
        const t = (d - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
        const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
        return { p: [a[0] + dx * t, a[1] + dy * t], dir: [dx / m, dy / m] };
      };

      // mask: the trace passes behind the planet sign and does not enter the start ring
      const mask = lab.svg('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: s, height: s }, [
        lab.svg('rect', { x: 0, y: 0, width: s, height: s, fill: 'white' }),
        families.length ? lab.svg('circle', { cx: c, cy: fmt(Y(g.cy)), r: fmt(signR * R * 1.35), fill: 'black' }) : null,
        lab.svg('circle', { cx: fmt(startPt[0]), cy: fmt(startPt[1]), r: fmt(startR), fill: 'black' }),
      ]);
      root.appendChild(lab.svg('defs', {}, [mask]));
      const trace = lab.svg('g', { mask: `url(#${id})` });
      trace.appendChild(stroke(toD(outline) + (closed ? 'Z' : ''), w));
      trace.appendChild(stroke(toD(tailPts), w));

      // terminal bar (graduate courses: a sealed dot) and course bars across the terminal stroke
      const barAt = (d, half, sw) => {
        const { p, dir } = at(d);
        const q = [-dir[1], dir[0]];
        return lab.svg('line', { x1: fmt(p[0] - q[0] * half), y1: fmt(p[1] - q[1] * half), x2: fmt(p[0] + q[0] * half), y2: fmt(p[1] + q[1] * half), stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'round' });
      };
      const end = at(total);
      if (grad) trace.appendChild(lab.svg('circle', { cx: fmt(end.p[0]), cy: fmt(end.p[1]), r: fmt(w * 1.5), fill: ink }));
      else trace.appendChild(barAt(total, w * 2.3, w));
      const spacing = form === 'seal' ? Math.min(Math.max(w * 1.9, s * 0.028), (total - w * 2.4) / Math.max(1, bars + 0.3)) : Math.max(w * 1.9, s * 0.03);
      for (let b = 0; b < bars; b++) trace.appendChild(barAt(total - w * 2.6 - b * spacing, w * 1.35, w * 0.7));

      // node dots by value (mirrored in the seal form)
      const common = parts && parts.length === 2 && parts[0].vec && parts[1].vec ? (i) => parts[0].vec[i] > 0 && parts[1].vec[i] > 0 : () => false;
      const n = nodes.length;
      nodes.forEach((nd, j) => {
        const p = polar(nd.th, nd.r);
        const pts = mirrored ? [p, mirrorX(p)] : [p];
        const a = D.attrs[nd.i];
        const isStart = !mirrored && j === 0;
        for (const [x, y] of pts) {
          if (!isStart) {
            const rr = w * (0.42 + 0.9 * nd.v);
            trace.appendChild(lab.svg('circle', { cx: fmt(x), cy: fmt(y), r: fmt(rr), fill: ink }));
            if (common(nd.i)) trace.appendChild(lab.svg('circle', { cx: fmt(x), cy: fmt(y), r: fmt(rr + w * 0.95), fill: 'none', stroke: ink, 'stroke-width': w * 0.5 }));
          }
          if (detail) {
            const role = mirrored ? '' : j === 0 ? ' · 起笔' : j === n - 1 ? ' · 收笔' : '';
            root.appendChild(hov(lab.svg('circle', { cx: fmt(x), cy: fmt(y), r: Math.max(6, w * 2.2), fill: 'transparent' }), a.zh + ' ' + a.en,
              `第 ${j + 1} 节点 · 强度 ${Math.round(nd.v * 255)} · ${lab.hex(nd.i)} · ${D.domains[a.d].zh}${role}`));
          }
        }
      });
      root.appendChild(trace);
      root.appendChild(lab.svg('circle', { cx: fmt(startPt[0]), cy: fmt(startPt[1]), r: fmt(startR), fill: 'none', stroke: ink, 'stroke-width': w * 0.8 }));
      root.appendChild(signs);

      if (detail && course) {
        root.appendChild(hov(lab.svg('circle', { cx: fmt(end.p[0]), cy: fmt(end.p[1]), r: Math.max(8, w * 3), fill: 'transparent' }), course.label,
          `${grad ? '研究生' : '本科'} ${course.level} 级 · 收笔横 ${bars} 道${grad ? ' · 封点' : ''}`));
      }
      return root;
    },
  });
})();
