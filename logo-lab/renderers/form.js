// 形态 Form — the perceptual route. Ten felt axes (刚柔 动静 强弱 …) shape one closed silhouette;
// the family fixes the lobe count, the course adds concentric echo lines.
(function () {
  const L = window.LogoLab;
  const TAU = Math.PI * 2;

  // Family -> lobe count (the conventional layer). 理 工 生 人 社 经 艺
  const LOBES = [6, 4, 5, 2, 3, 8, 7];
  const LOBE_WHY = [
    '六瓣：雪花、晶格、苯环——自然定律的形',
    '四瓣：直角与方格——营造的形',
    '五瓣：花冠、海星、五指——生命独有的五重对称',
    '两瓣：人体与面孔的左右对称，“人”字两笔',
    '三瓣：三人为“众”',
    '八瓣：四通八达——交换与权衡',
    '七瓣：七音、七色',
  ];

  // Axis order used for the guides; role = which visual variable the axis drives.
  const GUIDE = [
    ['hard', '瓣尖 尖↔圆'], ['active', '瓣深 · 旋转'], ['power', '大小 · 瓣宽'], ['order', '对称 ↔ 抖动'],
    ['good', '瓣谷 舒展↔收紧'], ['life', '有机微颤'], ['nature', '曲线 ↔ 直线'], ['concrete', '实心 · 排线 · 空线'],
    ['warm', '色相 暖↔寒'], ['yang', '明度'],
  ];
  const KEYS = GUIDE.map((g) => g[0]);
  const AXIS = new Map(L.data.axes.map((a) => [a.key, a]));

  let uid = 0;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pos = (x) => (x > 0 ? x : 0);

  // ---------------------------------------------------------------- semantic model

  function vecSeed(vec) {
    let s = '';
    for (let i = 0; i < 256; i++) if (vec[i] > 0) s += i + ':' + Math.round(vec[i] * 255) + ',';
    return L.hash(s || 'empty');
  }

  function model(vec, item) {
    const ax = {};
    for (const k of KEYS) ax[k] = L.axis(vec, k);
    const f = item && item.f >= 0 && item.f < 7 ? item.f : -1;
    // Without a family the lobe count is felt too: lively, sharp, complex things get more lobes.
    const m = f >= 0 ? LOBES[f]
      : clamp(Math.round(3 + 2 * ax.active + 1.2 * ax.hard + 2.5 * (vec[253] - vec[252])), 1, 9);
    // few lobes need more depth to read as lobes at all
    const depthGain = m === 1 ? 1.2 : m === 2 ? 1.75 : m === 3 ? 1.25 : 1;
    return {
      ax, f, m,
      tip: clamp(1.25 * Math.exp(-1.2 * ax.hard), 0.36, 3.2),       // 刚: cusp tips  柔: round tips
      valley: clamp(1.2 * Math.exp(0.9 * ax.good), 0.5, 2.9),       // 善: open valleys  恶: pinched
      depth: clamp((0.31 + 0.13 * ax.active + 0.04 * ax.hard) * depthGain, 0.18, 0.78), // 动: deep lobes
      twist: 0.85 * clamp((ax.active - 0.15) / 0.85, 0, 1),         // 动: pinwheel asymmetry
      turn: 0.5 * ax.active,                                        // 动: rotation off upright
      size: 0.8 + 0.2 * ax.power,                                   // 强: big
      broad: 0.36 * pos(ax.power - 0.2) / 0.8,                      // 强: broad flat-topped lobes
      growth: 0.26 * pos(-ax.order - 0.05) / 0.95,                  // 乱: lobes grow unevenly round the circle
      jitter: 0.1 * pos(-ax.order - 0.45) / 0.55,                   // 大乱: plus a little noise
      crenate: 0.085 * pos(ax.life - 0.1) / 0.9,                    // 生: each lobe buds three small ones
      straight: clamp(-ax.nature * 1.1, 0, 1),                      // 人造: straight facets
      fill: ax.concrete >= 0.3 ? 'solid' : ax.concrete <= -0.3 ? 'line' : 'hatch', // 实 / 虚
      seed: vecSeed(vec),
    };
  }

  // ---------------------------------------------------------------- silhouette

  // lobe profile: 0 at the tip, 1 at the valley; a = tip exponent, b = valley exponent
  function profile(u, a, b) {
    const ua = Math.pow(u, a), ub = Math.pow(1 - u, b);
    return ua + ub > 0 ? ua / (ua + ub) : 0;
  }

  // Unit silhouette around the polar origin. Samples at absolute angles starting at the top.
  // Returns {pts, tips} where tips are sample indices of the lobe tips.
  function contour(M, N) {
    const rnd = L.rng(M.seed);
    const m = M.m;
    const lr = [], la = [], ld = [];
    const start = Math.floor(rnd() * m);
    for (let i = 0; i < m; i++) {
      const g = m > 1 ? (((i - start + m) % m) / (m - 1)) * 2 - 1 : 0;   // -1 .. 1 round the circle
      lr.push(1 + M.growth * g + M.jitter * (2 * rnd() - 1));
      la.push(1 + 0.8 * M.growth * g + 1.5 * M.jitter * (2 * rnd() - 1));
      ld.push(0.6 * M.jitter * (2 * rnd() - 1));
    }
    const top = -Math.PI / 2;
    const phi0 = top + (M.turn * Math.PI) / m;
    const r = new Float64Array(N), code = new Int32Array(N);
    const brk = [0, 0.5];
    if (M.broad > 0.04) brk.push(M.broad / 2, 1 - M.broad / 2);
    brk.sort((a, b) => a - b);
    for (let s = 0; s < N; s++) {
      const phi = top + (s / N) * TAU;
      let p = (((phi - phi0) / TAU) * m) % m;
      if (p < 0) p += m;
      const i0 = Math.floor(p) % m, i1 = (i0 + 1) % m, f = p - Math.floor(p), sm = f * f * (3 - 2 * f);
      const q = p + lerp(ld[i0], ld[i1], sm);
      const qi = Math.floor(q);
      let fr = q - qi;
      fr += (M.twist / TAU) * (1 - Math.cos(TAU * fr));              // pinwheel warp, monotone for twist < 1
      const d = fr < 0.5 ? fr : 1 - fr;                               // 0 at tip, 0.5 at valley
      let u = 2 * d;
      if (M.broad > 0) u = clamp((u - M.broad) / (1 - M.broad), 0, 1);
      let rr = lerp(lr[i0], lr[i1], sm) * (1 - M.depth * lerp(la[i0], la[i1], sm) * profile(u, M.tip, M.valley));
      if (M.crenate > 0) {
        const sf = (fr * 3) % 1, sd = sf < 0.5 ? sf : 1 - sf;
        rr *= 1 - M.crenate * profile(2 * sd, M.tip, Math.max(0.8, M.valley * 0.8));
      }
      r[s] = rr;
      let b = 0;
      while (b < brk.length && fr >= brk[b]) b++;
      code[s] = qi * 16 + b;                                           // which facet this sample lies on
    }
    // facet vertices: where the facet code changes
    const verts = [], tips = [];
    for (let s = 0; s < N; s++) {
      if (code[s] !== code[(s - 1 + N) % N]) {
        verts.push(s);
        if (code[s] % 16 === 1) tips.push(s);
      }
    }
    const pts = new Array(N);
    for (let s = 0; s < N; s++) {
      const phi = top + (s / N) * TAU;
      pts[s] = [r[s] * Math.cos(phi), r[s] * Math.sin(phi)];
    }
    if (M.straight > 0 && verts.length >= 3) {
      const out = pts.map((p) => p.slice());
      for (let v = 0; v < verts.length; v++) {
        const a = verts[v], b = verts[(v + 1) % verts.length];
        const len = (b - a + N) % N || N;
        const A = pts[a], Bp = pts[b];
        for (let t = 0; t < len; t++) {
          const s = (a + t) % N, k = t / len;
          const cx = lerp(A[0], Bp[0], k), cy = lerp(A[1], Bp[1], k);
          out[s] = [lerp(pts[s][0], cx, M.straight), lerp(pts[s][1], cy, M.straight)];
        }
      }
      return { pts: out, tips };
    }
    return { pts, tips };
  }

  // Combination of two identities: the geometric mean of their radii, so both symmetries interfere.
  function blend(cA, cB) {
    const N = cA.pts.length;
    const pts = new Array(N);
    for (let s = 0; s < N; s++) {
      const [ax, ay] = cA.pts[s], [bx, by] = cB.pts[s];
      const ra = Math.hypot(ax, ay), rb = Math.hypot(bx, by);
      const rr = Math.sqrt(ra * rb), phi = -Math.PI / 2 + (s / N) * TAU;
      pts[s] = [rr * Math.cos(phi), rr * Math.sin(phi)];
    }
    return { pts, tips: cA.tips.concat(cB.tips) };
  }

  // Radial offset of a star-shaped outline (around 0,0): delta > 0 dilates (Minkowski sum with a disc),
  // delta < 0 erodes. Evenly spaced echoes with round caps on spikes; no self-intersections.
  function offset(pts, delta, K) {
    const d2 = delta * delta, out = [];
    for (let j = 0; j < K; j++) {
      const a = -Math.PI / 2 + (j / K) * TAU, ux = Math.cos(a), uy = Math.sin(a);
      let best = delta > 0 ? 0 : Infinity;
      for (let i = 0; i < pts.length; i++) {
        const x = pts[i][0], y = pts[i][1];
        const t = x * ux + y * uy, perp = x * x + y * y - t * t;
        if (perp > d2) continue;
        const h = Math.sqrt(d2 - perp);
        if (delta > 0) { if (t + h > best) best = t + h; } else if (t - h < best) best = t - h;
      }
      if (!isFinite(best) || best < 0) best = 0;
      out.push([best * ux, best * uy]);
    }
    return out;
  }

  function maxRadius(pts) {
    let m = 0;
    for (const p of pts) m = Math.max(m, Math.hypot(p[0], p[1]));
    return m;
  }

  function pathD(pts, ox, oy) {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      d += (i ? 'L' : 'M') + (ox + pts[i][0]).toFixed(2) + ',' + (oy + pts[i][1]).toFixed(2);
    }
    return d + 'Z';
  }

  // ---------------------------------------------------------------- colour (OKLCH)

  function parseColor(c) {
    c = (c || '').trim();
    let m = c.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split('').map((x) => x + x).join('');
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    }
    m = c.match(/rgba?\(([^)]+)\)/);
    if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map((x) => parseFloat(x) / 255);
    return [1, 1, 1];
  }
  function luminance(rgb) {
    const lin = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  function oklchToRgb(Lk, C, hDeg) {
    const h = (hDeg * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    const l = Math.pow(Lk + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(Lk - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(Lk - 0.0894841775 * a - 1.291485548 * b, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  }
  function oklch(Lk, C, h) {
    let rgb = oklchToRgb(Lk, C, h);
    for (let i = 0; i < 24 && rgb.some((v) => v < -0.001 || v > 1.001); i++) { C *= 0.9; rgb = oklchToRgb(Lk, C, h); }
    const hex = rgb.map((v) => {
      v = clamp(v, 0, 1);
      v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return Math.round(v * 255).toString(16).padStart(2, '0');
    });
    return '#' + hex.join('');
  }

  // Hue wheel: x = warm (plus a little activity, Kobayashi's warm = dynamic), y = nature (plus life).
  // warm → vermilion, nature → green, cold → blue, man-made / mind → violet.
  const HUE_AT = [[0, 42], [0.25, 140], [0.5, 248], [0.75, 312], [1, 402]];
  function tone(ax, dark) {
    const x = ax.warm + 0.3 * ax.active, y = ax.nature + 0.3 * ax.life;
    const mag = Math.min(1, Math.hypot(x, y));
    let t = Math.atan2(y, x) / TAU;
    if (t < 0) t += 1;
    let hue = 0;
    for (let i = 1; i < HUE_AT.length; i++) {
      if (t <= HUE_AT[i][0]) { const [t0, h0] = HUE_AT[i - 1], [t1, h1] = HUE_AT[i]; hue = lerp(h0, h1, (t - t0) / (t1 - t0)); break; }
    }
    hue %= 360;
    const C = clamp(0.035 + 0.11 * mag + 0.035 * pos(ax.active) + 0.03 * pos(ax.power), 0.03, 0.19);
    const Lk = dark ? clamp(0.76 + 0.07 * ax.yang + 0.03 * ax.good, 0.62, 0.88)
      : clamp(0.57 + 0.09 * ax.yang + 0.04 * ax.good, 0.42, 0.7);
    // heraldic hatching direction (Petra Sancta): warm = vertical, cold = horizontal, green = \, purple = /
    const quad = Math.round(t * 4) % 4;
    return { color: oklch(Lk, C, hue), hue, C, L: Lk, mag, hatch: [90, 45, 0, 135][quad] };
  }

  // ---------------------------------------------------------------- render

  function render(ctx) {
    const { size, colors, opts, vec } = ctx;
    const S = L.svg;
    const id = 'form' + ++uid;
    const root = S('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, xmlns: 'http://www.w3.org/2000/svg' });
    const defs = S('defs');
    root.appendChild(defs);

    const dark = luminance(parseColor(colors.paper)) < 0.35;
    const detailMode = ctx.mode === 'detail';
    const rich = opts.detail === 'rich';
    const guides = detailMode && opts.guides;

    let sum = 0;
    for (let i = 0; i < 256; i++) sum += vec[i];

    // layout box for the mark
    const margin = size * 0.08;
    let cx = size / 2, cy = size / 2, half = size / 2 - margin;
    const guideH = guides ? size * 0.2 : 0;
    if (guides) { half = (size - 2 * margin - guideH) / 2; cy = margin + half; }

    if (sum <= 0) {
      root.appendChild(S('circle', {
        cx, cy, r: half * 0.62, fill: 'none', stroke: colors.muted, 'stroke-width': Math.max(1, size * 0.008),
        'stroke-dasharray': `${Math.max(2, size * 0.02)} ${Math.max(3, size * 0.03)}`, opacity: 0.6,
      }));
      root.appendChild(S('circle', { cx, cy, r: Math.max(1, size * 0.012), fill: colors.muted, opacity: 0.6 }));
      return root;
    }

    const M = model(vec, ctx.item);
    const T = tone(M.ax, dark);
    const ink = opts.color ? T.color : colors.ink;

    // silhouette (combos with known parts: geometric mean of the two parent silhouettes)
    const N = size >= 300 ? 1440 : 960;
    let C;
    const parts = ctx.item && ctx.item.kind === 'combo' && Array.isArray(ctx.item.parts) ? ctx.item.parts : null;
    const partInfo = parts && parts.length === 2 ? parts.map(resolvePart).filter(Boolean) : [];
    if (partInfo.length === 2) {
      const cs = partInfo.map((p) => contour(model(p.vec, p.item), N));
      C = blend(cs[0], cs[1]);
    } else {
      C = contour(M, N);
    }

    // course: echo count; first four go outward, the fifth onward cut inward
    const level = ctx.course ? clamp(ctx.course.level, 1, 9) : 0;
    const outN = Math.min(level, 4), inN = Math.max(0, level - 4);
    const gap = Math.max(2.4, size * 0.03);
    const echoW = Math.max(0.75, size * 0.0075);

    // fit: bbox of the silhouette scaled to the power-driven size, echoes included
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of C.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const avail = half - outN * gap;
    const k = (avail * M.size) / Math.max(x1 - x0, y1 - y0) * 2;
    const px = C.pts.map(([x, y]) => [x * k, y * k]);
    const ox = cx - ((x0 + x1) / 2) * k, oy = cy - ((y0 + y1) / 2) * k;   // polar origin on the page
    const R = maxRadius(px);
    const shapeD = pathD(px, ox, oy);

    const sw = Math.max(1.2, size * 0.02 * (1 + 0.3 * M.ax.power));
    const g = S('g');
    root.appendChild(g);

    // outward echoes (behind the mark)
    const K = size >= 300 ? 720 : 480;
    for (let e = 1; e <= outN; e++) {
      g.appendChild(S('path', {
        d: pathD(offset(px, e * gap, K), ox, oy), fill: 'none', stroke: ink, 'stroke-width': echoW,
        'stroke-linejoin': 'round', opacity: 0.9 - 0.12 * (e - 1),
      }));
    }

    // knockout lines (inward echoes on a solid mark, rich-mode veins) go into a mask
    const cut = [];
    const innerLines = [];
    for (let e = 1; e <= inN; e++) {
      const ring = offset(px, -e * gap * 0.85, K);
      if (maxRadius(ring) < gap * 0.6) break;
      innerLines.push(pathD(ring, ox, oy));
    }
    const veins = [];
    if (rich && size >= 72) {
      for (const s of C.tips) {
        const [x, y] = px[s];
        veins.push(`M${(ox + x * 0.16).toFixed(2)},${(oy + y * 0.16).toFixed(2)}L${(ox + x * 0.7).toFixed(2)},${(oy + y * 0.7).toFixed(2)}`);
      }
      const inset = offset(px, -Math.max(2, R * 0.07), K);
      if (maxRadius(inset) > R * 0.2) innerLines.unshift(pathD(inset, ox, oy));
    }
    const lineW = Math.max(0.8, size * 0.0085);

    if (M.fill === 'solid') {
      const body = S('path', { d: shapeD, fill: ink });
      if (innerLines.length || veins.length) {
        const mask = S('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: size, height: size });
        mask.appendChild(S('rect', { x: 0, y: 0, width: size, height: size, fill: '#fff' }));
        for (const d of innerLines) mask.appendChild(S('path', { d, fill: 'none', stroke: '#000', 'stroke-width': echoW * 1.3, 'stroke-linejoin': 'round' }));
        for (const d of veins) mask.appendChild(S('path', { d, stroke: '#000', 'stroke-width': lineW * 1.2, 'stroke-linecap': 'round' }));
        defs.appendChild(mask);
        body.setAttribute('mask', `url(#${id}m)`);
      }
      g.appendChild(body);
      cut.push(body);
    } else {
      if (M.fill === 'hatch') {
        const clip = S('clipPath', { id: id + 'c' });
        clip.appendChild(S('path', { d: shapeD }));
        defs.appendChild(clip);
        const sp = Math.max(2.6, size * 0.03);
        const hw = Math.max(0.7, size * 0.0085);
        const hatch = S('g', { 'clip-path': `url(#${id}c)` });
        const ang = (opts.color ? T.hatch : 45) * Math.PI / 180;
        const dx = Math.cos(ang), dy = -Math.sin(ang), nx = -dy, ny = dx;
        const reach = R * 1.5;
        let d = '';
        for (let t = -reach; t <= reach; t += sp) {
          const bx = ox + nx * t, by = oy + ny * t;
          d += `M${(bx - dx * reach).toFixed(2)},${(by - dy * reach).toFixed(2)}L${(bx + dx * reach).toFixed(2)},${(by + dy * reach).toFixed(2)}`;
        }
        hatch.appendChild(S('path', { d, stroke: ink, 'stroke-width': hw, fill: 'none' }));
        g.appendChild(hatch);
      } else {
        g.appendChild(S('path', { d: shapeD, fill: ink, 'fill-opacity': 0.06, stroke: 'none' }));
      }
      for (const d2 of innerLines) g.appendChild(S('path', { d: d2, fill: 'none', stroke: ink, 'stroke-width': echoW, 'stroke-linejoin': 'round', opacity: 0.85 }));
      for (const d2 of veins) g.appendChild(S('path', { d: d2, stroke: ink, 'stroke-width': lineW, 'stroke-linecap': 'round', opacity: 0.85 }));
      g.appendChild(S('path', {
        d: shapeD, fill: 'none', stroke: ink, 'stroke-width': M.fill === 'line' ? sw : sw * 0.8, 'stroke-linejoin': 'round',
      }));
    }

    // minor number: a bead on the outermost echo, clockwise from the top like a clock hand
    if (ctx.course && outN > 0) {
      const a = -Math.PI / 2 + (ctx.course.minor / 100) * TAU;
      const ring = offset(px, outN * gap, 360);
      const idx = Math.round(((a + Math.PI / 2) / TAU) * 360) % 360;
      const [bx, by] = ring[idx];
      root.appendChild(S('circle', { cx: ox + bx, cy: oy + by, r: Math.max(1.6, gap * 0.42), fill: ink }));
    }

    if (detailMode && ctx.hover) {
      const fam = M.f >= 0 ? L.data.families[M.f].zh + ' · ' + LOBE_WHY[M.f] : M.m + ' 瓣（无门类，由动静与繁简决定）';
      const fillName = { solid: '实心（实）', hatch: '排线（半实半虚）', line: '空线（虚）' }[M.fill];
      g.addEventListener('mouseenter', () => ctx.hover({ title: ctx.word, sub: fam + ' · ' + fillName }));
      g.addEventListener('mouseleave', () => ctx.hover(null));
    }

    if (guides) drawGuides(root, ctx, M, T, ink, margin, size - margin - guideH * 0.88, size - 2 * margin, guideH * 0.88);
    return root;
  }

  function resolvePart(p) {
    if (!p) return null;
    if (typeof p === 'string') { const v = L.vec(p); return v ? { vec: v, item: L.item(p) } : null; }
    if (p.vec) return { vec: p.vec, item: p.item || p };
    if (p.zh) { const v = L.vec(p.zh); return v ? { vec: v, item: L.item(p.zh) } : null; }
    return null;
  }

  // Ten tiny bipolar bars: negative pole left, positive right, dot = value.
  function drawGuides(root, ctx, M, T, ink, x, y, w, h) {
    const S = L.svg, { colors, size } = ctx;
    const cols = 5, rows = 2, cw = w / cols, rh = h / rows;
    const fs = Math.max(8, size * 0.024);
    const g = S('g', { 'font-family': 'system-ui, sans-serif', 'font-size': fs.toFixed(1) });
    GUIDE.forEach(([key, role], i) => {
      const a = AXIS.get(key), v = M.ax[key];
      const c = i % cols, r = Math.floor(i / cols);
      const gx = x + c * cw, gy = y + r * rh + rh * 0.55;
      const tx0 = gx + fs * 1.25, tx1 = gx + cw - fs * 1.45;
      const cell = S('g');
      cell.appendChild(S('rect', { x: gx, y: y + r * rh, width: cw, height: rh, fill: 'transparent' }));
      const lab = (t, xx, anchor, strong) => {
        const el = S('text', { x: xx, y: gy + fs * 0.36, 'text-anchor': anchor, fill: strong ? colors.ink : colors.muted });
        el.textContent = t;
        return el;
      };
      cell.appendChild(lab(a.neg, gx + fs * 0.1, 'start', v < -0.05));
      cell.appendChild(lab(a.pos, gx + cw - fs * 0.35, 'end', v > 0.05));
      cell.appendChild(S('line', { x1: tx0, y1: gy, x2: tx1, y2: gy, stroke: colors.line, 'stroke-width': Math.max(1, size * 0.004) }));
      const mid = (tx0 + tx1) / 2;
      cell.appendChild(S('line', { x1: mid, y1: gy - fs * 0.3, x2: mid, y2: gy + fs * 0.3, stroke: colors.line, 'stroke-width': Math.max(1, size * 0.003) }));
      const vx = lerp(mid, v >= 0 ? tx1 : tx0, Math.abs(v));
      cell.appendChild(S('line', { x1: mid, y1: gy, x2: vx, y2: gy, stroke: ink, 'stroke-width': Math.max(1.2, size * 0.006), 'stroke-linecap': 'round' }));
      cell.appendChild(S('circle', { cx: vx, cy: gy, r: Math.max(2, fs * 0.28), fill: ink }));
      if (ctx.hover) {
        cell.addEventListener('mouseenter', () => ctx.hover({ title: `${a.pos} / ${a.neg}  ${v >= 0 ? '+' : ''}${v.toFixed(2)}`, sub: role }));
        cell.addEventListener('mouseleave', () => ctx.hover(null));
      }
      g.appendChild(cell);
    });
    root.appendChild(g);
  }

  L.register({
    id: 'form',
    order: 4,
    name: '形态',
    en: 'Form',
    tagline: '十个直觉轴捏成一个剪影，门类定瓣数',
    dims: '256 维压成 10 个语义轴（刚柔、动静、强弱、治乱、善恶、生死、天人、实虚、暖寒、阴阳），各驱动一个视觉变量。',
    lineage: '前人：Köhler 的 takete/maluma（1929/1947）、Ramachandran 与 Hubbard 的 bouba/kiki（2001）、Osgood 语义差异量表（1957）、康定斯基包豪斯形色问卷（1923）、小林重顺色彩形象坐标（1990）、Gielis 超级公式（2003）、Petra Sancta 纹章排线（1638）。',
    about: `<p>这条路线不靠符号，靠知觉。人看到尖角会想到“kiki”，看到圆团会想到“bouba”；不同语言的人给形状配词，结果高度一致。Osgood 发现词义的情感部分主要落在“评价、力量、活动”三根轴上，康定斯基和小林重顺分别给形状和颜色找过类似的坐标。这些对应先于语言，所以一套按它们造出来的形，不用教，大家也会“感到”它的意思。</p>
<p>做法：把 256 维压成 10 根轴，每根轴只管一个视觉变量。刚柔管瓣尖（尖刺或圆头），动静管瓣深和旋转（静则端正，动则像风车），强弱管大小与瓣宽，治乱管对称还是参差，善恶管瓣谷（舒展或收紧），生死管轮廓的有机微颤，天人管曲线还是直线折面，实虚管实心、排线或空线，暖寒和天人一起定色相（暖朱、天绿、寒蓝、人紫），阴阳定明度。排线方向借用纹章的 Petra Sancta 色点法：竖线红、横线蓝、左上斜绿、右上斜紫，黑白打印时也能读出色相。</p>
<p>三层：门类是约定，用瓣数表达——理六（晶格雪花）、工四（直角方格）、生五（花与五指）、人二（左右对称，“人”字两笔）、社三（三人为众）、经八（四通八达）、艺七（七音七色）。家纹也是这样：同一种花，数瓣、取势各有规矩。学科是语义，决定瓣的具体样子。课程用回响线：百位数就是回响线的条数，前四条向外扩，第五条起向内刻；后两位数是外圈上的一颗珠子，像钟面指针那样从正上方顺时针走。</p>
<p>好处：每个学科都有一个能被一眼认出、不重复的剪影；意思近的学科形状也近；有知觉研究撑腰，第一眼的“气质”大致对。问题也明显：256 个数只剩 10 个活下来，物理和工程可能长得相似；意思是“感到”的，不是“读到”的，看形猜不出是哪门学科；它更像气质画像，不是一套可学、可拼写的语言——瓣数之外没有可以背的字母。</p>`,
    controls: [
      { id: 'color', label: '色彩', type: 'toggle', value: true },
      { id: 'guides', label: '轴标', type: 'toggle', value: false },
      { id: 'detail', label: '细节', type: 'select', value: 'simple', options: [{ value: 'simple', label: '简' }, { value: 'rich', label: '繁' }] },
    ],
    render,
  });
})();
