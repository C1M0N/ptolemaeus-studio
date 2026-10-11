// 卦象 Hexagram — the binary-code route.
// Eight opposites instead of 256 attributes: every subject becomes one of 2^8 = 256 pre-named archetypes,
// drawn as eight stacked lines (yao). Family = the pair of brackets around the lines, course = dots that climb
// the line positions plus one "moving line" mark (the I Ching's own notation for variants of one hexagram).
(function () {
  const L = window.LogoLab;
  const D = L.data;

  /* ---------------------------------------------------------------- the code */

  // Bottom line -> top line. Read bottom-up, the lines are the binary number from the most significant bit down
  // (the order of Shao Yong's sequence as Leibniz read it: 坤 000000 = 0, 剥 000001 = 1 ... 乾 = 63).
  const KEYS = ['yang', 'life', 'good', 'active', 'hard', 'nature', 'order', 'warm'];
  const AX = KEYS.map((key) => {
    const a = (D.axes || []).find((x) => x.key === key) || {};
    return { key, pos: a.pos || '+', neg: a.neg || '−' };
  });
  const FAINT = 0.12; // |axis| below this is a "void" line: no evidence either way
  const GRAY = [0, 1, 3, 2, 6, 7, 5, 4, 12, 13, 15, 14, 10, 11, 9, 8];
  const GRAY_AT = [];
  GRAY.forEach((g, i) => { GRAY_AT[g] = i; });

  const bitOf = (code, k) => (code >> (7 - k)) & 1;
  const bin = (code) => code.toString(2).padStart(8, '0');
  const hx = (code) => '0x' + code.toString(16).toUpperCase().padStart(2, '0');
  const nameOf = (code) => AX.map((a, k) => (bitOf(code, k) ? a.pos : a.neg)).join('');

  function reading(vec) {
    const vals = KEYS.map((k) => { const v = L.axis(vec, k); return Number.isFinite(v) ? v : 0; });
    let code = 0;
    vals.forEach((v, k) => { if (v > 0) code |= 1 << (7 - k); });
    return { vals, code };
  }

  /* --------------------------------------------- the 48 disciplines in the table */

  const DISC = D.words.filter((w) => w.kind === 'discipline')
    .map((w) => ({ zh: w.zh, f: w.f, code: reading(L.toVec(w.r)).code }));
  const BY_CODE = new Map();
  for (const d of DISC) {
    if (!BY_CODE.has(d.code)) BY_CODE.set(d.code, []);
    BY_CODE.get(d.code).push(d);
  }
  const STAT = (() => {
    const n = DISC.length;
    const groups = [...BY_CODE.values()];
    const coll = groups.filter((g) => g.length > 1);
    const famCount = new Map();
    for (const d of DISC) famCount.set(d.f * 256 + d.code, (famCount.get(d.f * 256 + d.code) || 0) + 1);
    return {
      n,
      cells: groups.length,
      groups: coll.length,
      members: coll.reduce((s, g) => s + g.length, 0),
      famMembers: DISC.filter((d) => famCount.get(d.f * 256 + d.code) > 1).length,
      expected: n * (1 - Math.pow(255 / 256, n - 1)), // birthday problem, uniform codes
      list: coll.map((g) => g.map((d) => d.zh).join(' = ')).join('；'),
    };
  })();

  /* ---------------------------------------------------------------- geometry */
  // Everything is drawn in a 100 × 100 box (viewBox), so proportions are the same at 48 px and 520 px.

  const T = 4.9;          // full line weight
  const PITCH = 7.2;      // line pitch inside a tetragram
  const MID = 6.4;        // extra breath between the lower four and the upper four lines
  const X0 = 25, X1 = 75; // line extent
  const GAP = 9.6;        // the break in a broken line (≈ 1/5 of the width)
  const lineY = (k) => 50 + (3.5 * PITCH + MID / 2) - k * PITCH - (k >= 4 ? MID : 0);

  const BR = { top: 12, bot: 88, xo: 9.2, w: 2.3 };

  // Family brackets, left glyph; the right one is the same path turned 180° (so 「 becomes 」).
  // Assigned by convention, grouped by kinship: angular (理 工), round (生 艺), plain bars (社 经), corner (人).
  const FAMILY = [
    { glyph: '⟨ ⟩', why: '尖括号：狄拉克记号里的内积 ⟨a|b⟩' },
    { glyph: '[ ]', why: '方括号：矩阵与数组，造出来的直角' },
    { glyph: '( )', why: '圆括号：细胞与果实的弧' },
    { glyph: '「 」', why: '直角引号：引文与书名' },
    { glyph: '| |', why: '单竖线：|S| 是集合的人数' },
    { glyph: '‖ ‖', why: '双竖线：账簿的双线与范数' },
    { glyph: '{ }', why: '花括号：乐谱里连起几行谱表的连谱号' },
  ];
  function bracketPath(f) {
    const { top: yt, bot: yb, xo } = BR;
    const h = yb - yt;
    if (f === 0) { const xi = xo + 7.4; return `M${xi} ${yt}L${xo} 50L${xi} ${yb}`; }
    if (f === 1) { const xi = xo + 6.4; return `M${xi} ${yt}L${xo} ${yt}L${xo} ${yb}L${xi} ${yb}`; }
    if (f === 2) {
      const s = 7.2, xi = xo + s, R = (h * h / 4 + s * s) / (2 * s);
      return `M${xi} ${yt}A${R.toFixed(3)} ${R.toFixed(3)} 0 0 0 ${xi} ${yb}`;
    }
    if (f === 3) { const xi = xo + 7.6; return `M${xi} ${yt}L${xo} ${yt}L${xo} ${(yt + h * 0.56).toFixed(2)}`; }
    if (f === 4) return `M${xo + 2.4} ${yt}L${xo + 2.4} ${yb}`;
    if (f === 5) return `M${xo} ${yt}L${xo} ${yb}M${xo + 4.8} ${yt}L${xo + 4.8} ${yb}`;
    if (f === 6) {
      const xi = xo + 7.6, xm = xo + 3.6, r = 5.5;
      return `M${xi} ${yt}Q${xm} ${yt} ${xm} ${yt + r}L${xm} ${50 - r}Q${xm} 50 ${xo} 50` +
        `Q${xm} 50 ${xm} ${50 + r}L${xm} ${yb - r}Q${xm} ${yb} ${xi} ${yb}`;
    }
    return '';
  }

  // Per style: where line k sits, how it is drawn, and its two side anchors
  // (dot = course level dot, mov = moving-line mark ○/×).
  const STYLES = {
    yao: {
      dot: (k) => [80.4, lineY(k)],
      mov: (k) => [19.6, lineY(k)],
    },
    ifa: {
      // Ifá: two columns of four, the right column is read first, each top to bottom.
      cell: (k) => [k < 4 ? 63 : 37, 27 + (k % 4) * 15.33],
      dot: (k) => [k < 4 ? 74 : 26, 27 + (k % 4) * 15.33],
      mov: (k) => [k < 4 ? 52.6 : 47.4, 27 + (k % 4) * 15.33],
    },
    ring: {
      ang: (k) => (112.5 + k * 45) * Math.PI / 180,
      dot: (k) => polar(7, STYLES.ring.ang(k)),
      mov: (k) => polar(36.6, STYLES.ring.ang(k)),
    },
  };
  function polar(r, a) { return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; }

  /* ---------------------------------------------------------------- drawing */

  function render(ctx) {
    const { lab, size, colors, opts } = ctx;
    const S = lab.svg;
    const ink = colors.ink;
    const detail = ctx.mode === 'detail';
    const style = STYLES[opts.style] ? opts.style : 'yao';
    const hover = detail && typeof ctx.hover === 'function' ? ctx.hover : null;
    const item = ctx.item || { kind: 'word', f: -1 };
    const fam = item.kind === 'discipline' && item.f >= 0 && item.f < 7 ? item.f : -1;

    const vec = ctx.vec || new Float32Array(256);
    const R = reading(vec);
    const code = R.code;

    // Moving lines: a course marks one line (from its last two digits); a combo marks the lines where
    // its two parents disagree (the I Ching's 本卦 → 之卦 notation: ○ old yang, × old yin).
    const moving = new Set();
    const course = item.kind === 'discipline' ? ctx.course : null;
    if (course && course.minor > 0) moving.add((course.minor - 1) % 8);
    const parts = comboParts(ctx, lab);
    if (parts) for (let k = 0; k < 8; k++) if (bitOf(parts[0].code, k) !== bitOf(parts[1].code, k)) moving.add(k);

    const root = S('svg', {
      width: size, height: size, viewBox: '0 0 100 100',
      role: 'img', 'aria-label': `${ctx.word || ''} ${bin(code)} ${nameOf(code)}`,
      style: 'display:block;overflow:visible',
    });

    const panel = detail && opts.code;
    const g = S('g', panel ? { transform: 'translate(17 -0.5) scale(0.66)' } : {});
    root.appendChild(g);

    // 1. family frame
    if (fam >= 0) {
      const d = bracketPath(fam);
      const attrs = { d, fill: 'none', stroke: ink, 'stroke-width': BR.w, 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-miterlimit': 12 };
      const fg = S('g', {}, [S('path', attrs), S('path', Object.assign({ transform: 'rotate(180 50 50)' }, attrs))]);
      g.appendChild(fg);
      if (hover) {
        const fm = D.families[fam];
        bindHover(fg, hover, { title: `门类 · ${fm.zh} ${fm.en}`, sub: `${FAMILY[fam].glyph}　${FAMILY[fam].why}` });
        fg.appendChild(S('rect', { x: 4, y: BR.top - 2, width: 16, height: BR.bot - BR.top + 4, fill: 'transparent' }));
        fg.appendChild(S('rect', { x: 80, y: BR.top - 2, width: 16, height: BR.bot - BR.top + 4, fill: 'transparent' }));
      }
    }

    // 2. the eight lines. Strength on: three weights (void / light / full); a void line is drawn hollow.
    for (let k = 0; k < 8; k++) {
      const v = R.vals[k], s = Math.abs(v), bit = bitOf(code, k);
      const grade = !opts.strength ? 2 : s < FAINT ? 0 : s < 0.4 ? 1 : 2;
      const t = grade === 1 ? T * 0.58 : T;
      const lg = S('g', {});
      const paint = { ink, hollow: grade === 0 };
      if (style === 'yao') drawYao(lg, S, paint, k, bit, t);
      else if (style === 'ifa') drawIfa(lg, S, paint, k, bit, t);
      else drawRing(lg, S, paint, k, bit, t);
      g.appendChild(lg);
      if (hover) {
        const a = AX[k];
        const hit = hitArea(S, style, k);
        bindHover(hit, hover, {
          title: `第 ${k + 1} 爻 · ${a.pos} / ${a.neg}（${a.key}）`,
          sub: `${v >= 0 ? '+' : ''}${v.toFixed(2)} → ${bit ? a.pos + ' · 实线' : a.neg + ' · 断线'}${s < FAINT ? ' · 近零，虚爻' : ''}`,
        });
        g.appendChild(hit);
      }
    }

    // 3. course: level dots climb the line positions (1xx = first line … 5xx+ crosses into the upper four)
    const st = STYLES[style];
    if (course && course.level > 0) {
      const n = Math.min(8, course.level);
      const cg = S('g', { fill: ink });
      for (let k = 0; k < n; k++) { const [x, y] = st.dot(k); cg.appendChild(S('circle', { cx: x, cy: y, r: 1.55 })); }
      if (course.level > 8) {
        const [x, y] = st.dot(7);
        cg.appendChild(S('circle', { cx: x, cy: y, r: 2.9, fill: 'none', stroke: ink, 'stroke-width': 0.8 }));
      }
      g.appendChild(cg);
      if (hover) {
        cg.appendChild(S('rect', { x: style === 'ring' ? 40 : st.dot(0)[0] - 3, y: style === 'ring' ? 40 : 14, width: style === 'ring' ? 20 : 6, height: style === 'ring' ? 20 : 72, fill: 'transparent' }));
        bindHover(cg, hover, { title: `课程 · ${course.label}`, sub: `${course.level} 级：圆点从初爻往上数到第 ${n} 爻${course.level >= 5 ? '（研究生，进入上四爻）' : ''}` });
      }
    }
    // moving-line marks
    for (const k of moving) {
      const [x, y] = st.mov(k);
      const bit = bitOf(code, k);
      const mg = S('g', { fill: 'none', stroke: ink, 'stroke-width': 0.95, 'stroke-linecap': 'round' });
      if (bit) mg.appendChild(S('circle', { cx: x, cy: y, r: 1.75 }));
      else {
        const e = 1.45;
        mg.appendChild(S('path', { d: `M${x - e} ${y - e}L${x + e} ${y + e}M${x + e} ${y - e}L${x - e} ${y + e}` }));
      }
      g.appendChild(mg);
      if (hover) {
        mg.appendChild(S('rect', { x: x - 3, y: y - 3, width: 6, height: 6, fill: 'transparent', stroke: 'none' }));
        const why = parts ? `${parts[0].zh} 与 ${parts[1].zh} 在此爻相反` : `课号尾数 ${String(course.minor).padStart(2, '0')} → 第 ${k + 1} 爻`;
        bindHover(mg, hover, { title: `动爻 · 第 ${k + 1} 爻 ${bit ? '○ 老阳' : '× 老阴'}`, sub: why });
      }
    }

    // 4. detail panel: the code, its pre-named reading, and the 16 × 16 table it lives in
    if (panel) drawPanel(root, ctx, code, parts, hover);
    return root;
  }

  const HAIR = 0.62; // outline weight of a hollow (void) line
  function bar(S, paint, x, y, w, h, extra) {
    if (!paint.hollow) return S('rect', Object.assign({ x, y, width: w, height: h, fill: paint.ink }, extra));
    const e = HAIR / 2;
    return S('rect', Object.assign({ x: x + e, y: y + e, width: Math.max(0, w - HAIR), height: Math.max(0, h - HAIR),
      fill: 'none', stroke: paint.ink, 'stroke-width': HAIR, opacity: 0.75 }, extra));
  }

  function drawYao(g, S, paint, k, bit, t) {
    const y = lineY(k) - t / 2;
    if (bit) g.appendChild(bar(S, paint, X0, y, X1 - X0, t));
    else {
      const w = (X1 - X0 - GAP) / 2;
      g.appendChild(bar(S, paint, X0, y, w, t));
      g.appendChild(bar(S, paint, X1 - w, y, w, t));
    }
  }

  function drawIfa(g, S, paint, k, bit, t) {
    const [cx, cy] = STYLES.ifa.cell(k);
    const half = 5.6;
    const at = (x) => bar(S, paint, x - t / 2, cy - half - t / 2, t, 2 * half + t, { rx: t / 2 });
    if (bit) g.appendChild(at(cx));
    else { g.appendChild(at(cx - 4.2)); g.appendChild(at(cx + 4.2)); }
  }

  function drawRing(g, S, paint, k, bit, t) {
    const deg = 112.5 + k * 45;
    const r0 = 12, r1 = 32.4, gap = 6;
    const seg = (a, b) => bar(S, paint, 50 + a, 50 - t / 2, b - a, t, { transform: `rotate(${deg} 50 50)` });
    if (bit) g.appendChild(seg(r0, r1));
    else { const m = (r0 + r1) / 2; g.appendChild(seg(r0, m - gap / 2)); g.appendChild(seg(m + gap / 2, r1)); }
  }

  function hitArea(S, style, k) {
    if (style === 'yao') return S('rect', { x: X0 - 2, y: lineY(k) - PITCH / 2, width: X1 - X0 + 4, height: PITCH, fill: 'transparent', style: 'cursor:crosshair' });
    if (style === 'ifa') { const [cx, cy] = STYLES.ifa.cell(k); return S('rect', { x: cx - 9, y: cy - 7.6, width: 18, height: 15.2, fill: 'transparent', style: 'cursor:crosshair' }); }
    return S('rect', { x: 61, y: 43, width: 23, height: 14, fill: 'transparent', transform: `rotate(${112.5 + k * 45} 50 50)`, style: 'cursor:crosshair' });
  }

  function bindHover(el, hover, info) {
    if (!hover) return;
    el.addEventListener('pointerenter', () => hover(info));
    el.addEventListener('pointerleave', () => hover(null));
  }

  // A combo's two parents: item.parts if given, else the two halves of its label when both are known words.
  function comboParts(ctx, lab) {
    const item = ctx.item || {};
    if (item.kind !== 'combo') return null;
    let names = Array.isArray(item.parts) && item.parts.length === 2 ? item.parts : null;
    if (!names) {
      const bits = String(item.zh || ctx.word || '').split(/\s*[+×]\s*/);
      if (bits.length === 2) names = bits;
    }
    if (!names) return null;
    const out = names.map((p) => {
      const zh = typeof p === 'string' ? p : p && (p.zh || p.word);
      const v = p && p.vec ? p.vec : zh ? lab.vec(zh) : null;
      return v ? { zh, code: reading(v).code } : null;
    });
    return out[0] && out[1] ? out : null;
  }

  function drawPanel(root, ctx, code, parts, hover) {
    const { lab, colors } = ctx;
    const S = lab.svg;
    const ink = colors.ink, muted = colors.muted || ink;
    const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
    const sans = "system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', 'WenQuanYi Zen Hei', sans-serif";

    root.appendChild(S('line', { x1: 8, y1: 63.2, x2: 92, y2: 63.2, stroke: colors.line || muted, 'stroke-width': 0.25 }));

    // bits (bottom line first = most significant), the reading under each bit, then hex and table address
    const bx = (i) => 10.6 + i * 6.1 + (i >= 4 ? 2.2 : 0);
    const tg = S('g', {});
    for (let i = 0; i < 8; i++) {
      const b = bitOf(code, i);
      const t1 = S('text', { x: bx(i), y: 75.2, 'text-anchor': 'middle', 'font-family': mono, 'font-size': 6.6, fill: ink, 'font-weight': 500 });
      t1.textContent = String(b);
      const t2 = S('text', { x: bx(i), y: 81.6, 'text-anchor': 'middle', 'font-family': sans, 'font-size': 3.3, fill: muted });
      t2.textContent = b ? AX[i].pos : AX[i].neg;
      tg.appendChild(t1);
      tg.appendChild(t2);
    }
    const others = (BY_CODE.get(code) || []).filter((d) => d.zh !== (ctx.item && ctx.item.zh)).map((d) => d.zh);
    const row = GRAY_AT[code >> 4] + 1, col = GRAY_AT[code & 15] + 1;
    let info = `${hx(code)} · 第 ${code} 号 · ${row} 行 ${col} 列`;
    const t3 = S('text', { x: 8, y: 87.6, 'font-family': sans, 'font-size': 2.75, fill: muted });
    t3.textContent = info;
    const t4 = S('text', { x: 8, y: 91.6, 'font-family': sans, 'font-size': 2.75, fill: others.length ? ink : muted });
    if (parts) t4.textContent = `${parts[0].zh} ${hx(parts[0].code)} · ${parts[1].zh} ${hx(parts[1].code)}`;
    else t4.textContent = others.length ? `同码：${others.slice(0, 4).join('、')}${others.length > 4 ? '…' : ''}` : '此格无其他学科';
    tg.appendChild(t3);
    tg.appendChild(t4);
    root.appendChild(tg);

    // Karnaugh map: rows = lower four lines, columns = upper four, both in Gray order,
    // so neighbouring cells (wrapping around) differ by exactly one line.
    const M = { x: 68, y: 68, s: 24 };
    const c = M.s / 16;
    const kg = S('g', {});
    kg.appendChild(S('rect', { x: M.x, y: M.y, width: M.s, height: M.s, fill: 'none', stroke: muted, 'stroke-width': 0.2, opacity: 0.7 }));
    kg.appendChild(S('path', { d: `M${M.x + M.s / 2} ${M.y}v${M.s}M${M.x} ${M.y + M.s / 2}h${M.s}`, stroke: muted, 'stroke-width': 0.18, opacity: 0.6 }));
    const r0 = GRAY_AT[code >> 4], c0 = GRAY_AT[code & 15];
    kg.appendChild(S('rect', { x: M.x, y: M.y + r0 * c, width: M.s, height: c, fill: ink, opacity: 0.07 }));
    kg.appendChild(S('rect', { x: M.x + c0 * c, y: M.y, width: c, height: M.s, fill: ink, opacity: 0.07 }));
    for (let r = 0; r < 16; r++) {
      for (let q = 0; q < 16; q++) {
        const cc = (GRAY[r] << 4) | GRAY[q];
        const x = M.x + q * c, y = M.y + r * c;
        const here = BY_CODE.get(cc);
        let el;
        if (cc === code) el = S('rect', { x: x + 0.12, y: y + 0.12, width: c - 0.24, height: c - 0.24, fill: ink });
        else if (here) el = S('rect', { x: x + 0.42, y: y + 0.42, width: c - 0.84, height: c - 0.84, fill: muted, opacity: here.length > 1 ? 0.95 : 0.6 });
        else el = S('circle', { cx: x + c / 2, cy: y + c / 2, r: 0.14, fill: muted, opacity: 0.7 });
        kg.appendChild(el);
        if (hover) {
          const hit = S('rect', { x, y, width: c, height: c, fill: 'transparent' });
          const names = here ? here.map((d) => d.zh).join('、') : '无学科';
          bindHover(hit, hover, { title: `${hx(cc)} · ${bin(cc)} · ${nameOf(cc)}`, sub: names });
          kg.appendChild(hit);
        }
      }
    }
    const ring = S('rect', { x: M.x + c0 * c - 0.7, y: M.y + r0 * c - 0.7, width: c + 1.4, height: c + 1.4, fill: 'none', stroke: ink, 'stroke-width': 0.35 });
    kg.appendChild(ring);
    root.appendChild(kg);
  }

  /* ---------------------------------------------------------------- register */

  const pct = (x) => Math.round(x);
  const about = [
    `<p>《周易》和约鲁巴的 Ifá 都是封闭的组合系统：只有两种笔画，位置固定，所有组合事先都有名字。六爻得 64 卦，Ifá 两列各四个记号得 16 × 16 = 256 个 Odù。一个符号的意思不在画面里，而在它在全表中的位置；集体共享的是这张有限的表和表上的解读（卦辞、Ifá 的诗篇）。所以任何新成员一出现就自动有格子、有名字、有读法，懂这张表的人看到同一个记号会读出同一件事——这就是它能承载集体认同的机制。</p>`,
    `<p>这里把 256 个属性压成 8 对对立：阳阴、生死、善恶、动静、刚柔、天人、治乱、暖寒（自下而上）。8 比 256 好选，因为每一条都是一眼能答的二选一，8 个位置人记得住，而 2<sup>8</sup> 正好又是 256 个原型，排成 16 × 16。每个原型的名字就是它的 8 个字，例如“阳生善动刚人治暖”。自下而上读出二进制，初爻是最高位，与邵雍先天次序、莱布尼茨的读法一致。</p>`,
    `<p>字母只有两个：实线（正）与断线（负）；|值| 决定线重，接近零的爻画成淡的虚爻（没有证据时默认为阴，即 0）。语法是位置：下四爻与上四爻之间留一道缝。门类是两侧的括号，像代码里类型包住值：理 ⟨ ⟩、工 [ ]、生 ( )、人 「 」、社 | |、经 ‖ ‖、艺 { }。课程用《周易》本来的办法：右侧圆点从初爻往上数课程级别（本科 1–4 在下四爻，研究生跨进上四爻），课号末两位选中一爻标作“动爻”（○ 老阳、× 老阴），同一卦，换一种读法。交叉学科画合成向量的卦，双亲相反的爻都标成动爻。</p>`,
    `<p>代价是只有 8 位活下来。按当前数据，${STAT.n} 门学科落在 ${STAT.cells} 个格子里，${STAT.members} 门学科与别人同码（${STAT.groups} 组：${STAT.list}）；码若均匀随机，生日问题预计约 ${pct(STAT.expected)} 门。门类括号是第二层：加上括号后还撞的有 ${STAT.famMembers} 门。线重保留了一部分强弱，但不改变码。一个真正的系统还要第三层——《周易》和 Ifá 靠每格的文本来区分，这里可以是一个中央母题或更多位。另一个问题是轴：这 8 条偏情感与象征，大多数学科都落在“人”和“治”一侧，区分力集中在少数几爻上。</p>`,
    `<p>好处是完全可数、可念、可比较：两个徽记差几爻一眼可见，卡诺图里相邻格只差一爻，任何新学科不用设计就有位置。其余两种画法同码同语法：Ifá 式右列先读、单痕为正双痕为负；环式八辐，左半是下四爻，右半是上四爻。</p>`,
  ].join('');

  L.register({
    id: 'hexagram',
    order: 2,
    name: '卦象',
    en: 'Hexagram',
    tagline: '八对阴阳定一卦，256 个原型各有其名',
    dims: '8 条对立轴（lab.axis：阳阴 生死 善恶 动静 刚柔 天人 治乱 暖寒）各取正负一位，|值| 为线重，共 8 位 = 256 格。',
    lineage: '前人：《周易》六爻 64 卦（西周）；约鲁巴 Ifá 两列八痕 256 Odù；邵雍先天图（11 世纪）与莱布尼茨《二进制算术阐释》（1703）；格雷码（Gray，1953 年专利）与卡诺图（Karnaugh，1953）。',
    about,
    controls: [
      { id: 'style', label: '画法', type: 'select', value: 'yao',
        options: [{ value: 'yao', label: '爻 · 叠线' }, { value: 'ifa', label: 'Ifá · 两列' }, { value: 'ring', label: '环 · 八辐' }] },
      { id: 'strength', label: '强弱', type: 'toggle', value: true },
      { id: 'code', label: '码表', type: 'toggle', value: true },
    ],
    render,
  });
})();
