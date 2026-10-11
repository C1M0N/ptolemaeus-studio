// 代码字形 Code Glyph — the alphabetic route (MIT Media Lab identity, Pentagram 2014), rebuilt.
// The course-code prefix (MATH, CS, PHYS…) is folded into a square monogram from one modular skeleton alphabet
// (5 × 5 node grid, straight strokes + quarter circles, one stroke weight). Family = the four corners of the frame,
// discipline = the letters + a semantic "accent" (corner treatment, weight, one mark in a counter),
// course = a heraldic label of hanging bars (one per level) and, in detail, the number in the same digits.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  let SEQ = 0; // clip-path ids must be unique per page

  /* ================================================================ alphabet */
  // A stroke is a list of nodes "x,y" in the unit box (x right, y down). Node suffix: '^' sharp corner,
  // '*' bowl (as round as the geometry allows), none = joint (small round or chamfer, set by the hard axis).
  // 'z' closes the stroke. The last string lists flags: l / r = full stem on that side, t / b = full bar on top /
  // bottom; two letters that meet with matching flags share that stroke (a ligature).
  const SRC = {
    A: ['0,1 0,0* 1,0* 1,1', '0,.56 1,.56', 'lr'],
    B: ['0,.5 .8,.5* .8,0* 0,0 0,1 1,1* 1,.5* 0,.5', 'l'],
    C: ['1,0 0,0* 0,1* 1,1', ''],
    D: ['0,0 0,1 1,1* 1,0* z', 'l'],
    E: ['1,0 0,0 0,1 1,1', '0,.5 .82,.5', 'ltb'],
    F: ['1,0 0,0 0,1', '0,.5 .82,.5', 'lt'],
    G: ['1,0 0,0* 0,1* 1,1 1,.52 .5,.52', ''],
    H: ['0,0 0,1', '1,0 1,1', '0,.5 1,.5', 'lr'],
    I: ['.25,0 .75,0', '.5,0 .5,1', '.25,1 .75,1', ''],
    J: ['1,0 1,1* 0,1* 0,.6', 'r'],
    K: ['0,0 0,1', '1,0 0,.55^ 1,1', 'l'],
    L: ['0,0 0,1 1,1', 'lb'],
    M: ['0,1 0,0^ .5,.62^ 1,0^ 1,1', 'lr'],
    N: ['0,1 0,0^ 1,1^ 1,0', 'lr'],
    O: ['0,0* 1,0* 1,1* 0,1* z', ''],
    P: ['0,1 0,0 1,0* 1,.56* 0,.56', 'l'],
    Q: ['0,0* 1,0* 1,1* 0,1* z', '.6,.6 1,1', ''],
    R: ['0,1 0,0 1,0* 1,.56* 0,.56', '.42,.56 1,1^', 'l'],
    S: ['1,0 0,0* 0,.5* 1,.5* 1,1* 0,1', ''],
    T: ['0,0 1,0', '.5,0 .5,1', 't'],
    U: ['0,0 0,1* 1,1* 1,0', 'lr'],
    V: ['0,0 .5,1^ 1,0', ''],
    W: ['0,0 .25,1^ .5,.38^ .75,1^ 1,0', ''],
    X: ['0,0 1,1', '1,0 0,1', ''],
    Y: ['0,0 .5,.52^ 1,0', '.5,.52 .5,1', ''],
    Z: ['0,0 1,0^ 0,1^ 1,1', 'tb'],
    0: ['0,0* 1,0* 1,1* 0,1* z', ''],
    1: ['.1,.3 .55,0^ .55,1', '.1,1 1,1', 'b'],
    2: ['0,0 1,0* 1,.5* 0,.5 0,1 1,1', 'b'],
    3: ['0,0 .9,0* .9,.5* .3,.5', '.3,.5 1,.5* 1,1* 0,1', ''],
    4: ['0,0 0,.66 1,.66', '.75,.36 .75,1', ''],
    5: ['1,0 0,0 0,.46 1,.46* 1,1* 0,1', 't'],
    6: ['1,0 0,0* 0,1* 1,1* 1,.5* 0,.5', ''],
    7: ['0,0 1,0^ .38,1', 't'],
    8: ['.08,0* .92,0* .92,.5* .08,.5* z', '0,.5* 1,.5* 1,1* 0,1* z', ''],
    9: ['0,1 1,1* 1,0* 0,0* 0,.5* 1,.5', ''],
  };
  const GLYPH = {};
  for (const ch in SRC) {
    const src = SRC[ch];
    const flags = src[src.length - 1];
    GLYPH[ch] = {
      strokes: src.slice(0, -1).map((s) => {
        const toks = s.trim().split(/\s+/);
        const closed = toks[toks.length - 1] === 'z';
        const pts = (closed ? toks.slice(0, -1) : toks).map((t) => {
          const c = t.endsWith('^') ? 0 : t.endsWith('*') ? 2 : 1;
          const [x, y] = t.replace(/[\^*]$/, '').split(',').map(Number);
          return [x, y, c];
        });
        return { pts, closed };
      }),
      l: flags.includes('l'), r: flags.includes('r'), t: flags.includes('t'), b: flags.includes('b'),
    };
  }

  /* ================================================================ geometry */
  // Corners of one stroke (already in drawing units). J = {round, j, big, cj, cbig}.
  // Each corner gets a tangent length t that never exceeds the segment (half of it when the neighbour is a corner too).
  function corners(P, closed, J) {
    const n = P.length;
    const isC = (i) => (closed || (i > 0 && i < n - 1)) && P[i][2] > 0;
    const out = P.map((p) => ({ p, kind: 'pt' }));
    for (let i = 0; i < n; i++) {
      if (!isC(i)) continue;
      const p = P[i], a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
      let ix = p[0] - a[0], iy = p[1] - a[1], ox = b[0] - p[0], oy = b[1] - p[1];
      const li = Math.hypot(ix, iy), lo = Math.hypot(ox, oy);
      if (li < 1e-6 || lo < 1e-6) continue;
      ix /= li; iy /= li; ox /= lo; oy /= lo;
      const th = Math.acos(Math.max(-1, Math.min(1, ix * ox + iy * oy)));
      if (th < 0.02 || th > Math.PI - 0.02) continue;
      const lim = Math.min(li * (isC((i - 1 + n) % n) ? 0.5 : 1), lo * (isC((i + 1) % n) ? 0.5 : 1));
      const big = P[i][2] === 2;
      if (J.round && (big ? J.big : J.j) <= 1e-6) continue;
      if (J.round) {
        const tn = Math.tan(th / 2);
        const t = Math.min((big ? J.big : J.j) * tn, lim);
        const r = t / tn;
        const A = [p[0] - ix * t, p[1] - iy * t], B = [p[0] + ox * t, p[1] + oy * t];
        let nx = -iy, ny = ix;
        if (nx * ox + ny * oy < 0) { nx = -nx; ny = -ny; }
        const C = [A[0] + nx * r, A[1] + ny * r];
        out[i] = { p, kind: 'arc', A, B, C, r, th, sweep: ix * oy - iy * ox > 0 ? 1 : 0 };
      } else {
        const t = Math.min(big ? J.cbig : J.cj, lim);
        out[i] = { p, kind: 'cut', A: [p[0] - ix * t, p[1] - iy * t], B: [p[0] + ox * t, p[1] + oy * t] };
      }
    }
    return out;
  }

  const f2 = (v) => Math.round(v * 100) / 100;
  // -> {d (svg path), poly (sampled polyline for distance tests)}
  function strokePath(P, closed, J) {
    const K = corners(P, closed, J);
    let d = '';
    const poly = [];
    const go = (pt, move) => { d += (move ? 'M' : 'L') + f2(pt[0]) + ' ' + f2(pt[1]); poly.push(pt); };
    const corner = (k) => {
      if (k.kind === 'pt') { go(k.p); return; }
      go(k.A);
      if (k.kind === 'cut') { go(k.B); return; }
      d += `A${f2(k.r)} ${f2(k.r)} 0 0 ${k.sweep} ${f2(k.B[0])} ${f2(k.B[1])}`;
      const a0 = Math.atan2(k.A[1] - k.C[1], k.A[0] - k.C[0]);
      const dir = k.sweep ? 1 : -1;
      for (let s = 1; s <= 6; s++) {
        const a = a0 + dir * k.th * s / 6;
        poly.push([k.C[0] + k.r * Math.cos(a), k.C[1] + k.r * Math.sin(a)]);
      }
    };
    const n = P.length;
    if (!closed) {
      go(P[0], true);
      for (let i = 1; i < n - 1; i++) corner(K[i]);
      go(P[n - 1]);
    } else {
      const k0 = K[0];
      go(k0.kind === 'pt' ? k0.p : k0.B, true);
      for (let i = 1; i < n; i++) corner(K[i]);
      corner(k0);
      d += 'Z';
    }
    return { d, poly };
  }

  function segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }
  function polyDist(px, py, polys) {
    let m = Infinity;
    for (const pl of polys) for (let i = 1; i < pl.length; i++) m = Math.min(m, segDist(px, py, pl[i - 1], pl[i]));
    return m;
  }

  /* ================================================================ composition */
  const shareH = (a, b) => GLYPH[a] && GLYPH[b] && GLYPH[a].r && GLYPH[b].l;
  const shareV = (a, b) => GLYPH[a] && GLYPH[b] && GLYPH[a].b && GLYPH[b].t;

  // rows of characters -> placements in grid units (the monogram is a 10 × 10 square of grid units;
  // letter boxes are 4 wide with a 2-unit gap, or 5 wide when two letters share the stem between them).
  function compose(rows) {
    const col = rows[2] === 'col';
    rows = rows.slice(0, 2).filter((r) => r.length);
    const out = [];
    const ligs = [];
    if (col && rows.length === 2) {
      // three letters: the first stands tall on the left, the other two stack on the right
      const [a, [b, c]] = rows;
      const sh = shareH(a[0], b) && shareH(a[0], c);
      const xr = sh ? 5 : 6, wr = sh ? 5 : 4;
      if (sh) ligs.push(a[0] + b, a[0] + c);
      const vs = shareV(b, c);
      if (vs) ligs.push(b + '/' + c);
      out.push({ ch: a[0], x: 0, y: 0, w: sh ? 5 : 4, h: 10 });
      out.push({ ch: b, x: xr, y: 0, w: wr, h: vs ? 5 : 4 }, { ch: c, x: xr, y: vs ? 5 : 6, w: wr, h: vs ? 5 : 4 });
      return { places: out, ligs };
    }
    const row = (chars, y, h) => {
      if (chars.length === 1) { out.push({ ch: chars[0], x: 0, y, w: 10, h }); return; }
      if (shareH(chars[0], chars[1])) {
        out.push({ ch: chars[0], x: 0, y, w: 5, h }, { ch: chars[1], x: 5, y, w: 5, h });
        ligs.push(chars[0] + chars[1]);
      } else out.push({ ch: chars[0], x: 0, y, w: 4, h }, { ch: chars[1], x: 6, y, w: 4, h });
    };
    if (!rows.length) return { places: out, ligs };
    if (rows.length === 1) {
      const r = rows[0];
      if (r.length === 1) out.push({ ch: r[0], x: 3, y: 0, w: 4, h: 10 });
      else row(r.slice(0, 2), 0, 10);
      return { places: out, ligs };
    }
    const [a, b] = rows;
    const vshare = a.length === 2 && b.length === 2 && shareV(a[0], b[0]) && shareV(a[1], b[1]);
    if (vshare) ligs.push(a[0] + '/' + b[0], a[1] + '/' + b[1]);
    row(a.slice(0, 2), 0, vshare ? 5 : 4);
    row(b.slice(0, 2), vshare ? 5 : 6, vshare ? 5 : 4);
    return { places: out, ligs };
  }
  function rowsOf(letters) {
    const s = letters.slice(0, 4);
    if (s.length <= 2) return [s.split('')];
    if (s.length === 3) return [[s[0]], [s[1], s[2]], 'col'];
    return [s.slice(0, 2).split(''), s.slice(2).split('')];
  }

  /* ================================================================ names -> letters */
  function abbrev(en) {
    const words = String(en || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    if (words.length > 1) return words.slice(0, 4).map((w) => w[0]).join('');
    const w = words[0];
    if (w.length <= 4) return w;
    let s = w[0];
    for (const ch of w.slice(1)) if (!'AEIOU'.includes(ch) && ch !== s[s.length - 1]) s += ch;
    return s.length >= 3 ? s.slice(0, 4) : w.slice(0, 4);
  }
  // Pinyin initials through the browser's pinyin collation (boundary characters of each initial).
  const PY_L = 'ABCDEFGHJKLMNOPQRSTWXYZ';
  const PY_B = '阿八嚓哒妸发旮哈讥咔垃痳拏噢妑七呥扨它穵夕丫帀';
  let pyOK = null;
  function pyInitial(ch) {
    if (/[A-Za-z0-9]/.test(ch)) return ch.toUpperCase();
    if (!/[一-鿿]/.test(ch)) return '';
    try {
      if (pyOK === null) {
        const cmp = (a, b) => a.localeCompare(b, 'zh-Hans-CN-u-co-pinyin');
        pyOK = cmp('猴', '哈') > 0 && cmp('猴', '讥') < 0 && cmp('中', '帀') > 0;
      }
      if (!pyOK) return '';
      let k = -1;
      for (let i = 0; i < PY_B.length; i++) if (ch.localeCompare(PY_B[i], 'zh-Hans-CN-u-co-pinyin') >= 0) k = i;
      return k >= 0 ? PY_L[k] : '';
    } catch (e) { return ''; }
  }
  function lettersOf(it, vec) {
    if (it && it.code) return String(it.code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    let s = abbrev(it && it.en);
    if (!s && it && it.zh) s = [...String(it.zh)].map(pyInitial).join('').slice(0, 4);
    if (!s && vec) s = L.top(vec, 2).map((t) => (t.attr.en || '')[0] || '').join('').toUpperCase();
    return s.replace(/[^A-Z0-9]/g, '');
  }

  /* ================================================================ semantics -> style */
  const IDX = new Map(D.attrs.map((a) => [a.zh, a.i]));
  // The accent alphabet: 17 small marks, each with a semantic profile (attribute weights). The one with the highest
  // weighted sum is set in the roomiest counter of the monogram.
  const ACCENTS = [
    { id: 'point', zh: '点', w: { 数字: 1, 微小: 0.7, 种子: 0.5, 理性: 0.55, 简单: 0.5, 真: 0.4, 专注: 0.4 } },
    { id: 'scatter', zh: '散', w: { 群体: 0.9, 分散: 1, 偶然: 1, 碎片: 0.5, 多彩: 0.3 } },
    { id: 'ring', zh: '环', w: { 循环: 1, 圆润: 0.7, 整体: 0.7, 财富: 0.6, 太阳: 0.6, 金色: 0.4, 和谐: 0.4 } },
    { id: 'wave', zh: '波', w: { 流动: 0.9, 水: 0.8, 海洋: 0.9, 河流: 0.8, 悦耳: 0.8, 音乐: 0.9, 曲线: 0.6, 风: 0.5, 交流: 0.6 } },
    { id: 'spark', zh: '星', w: { 星辰: 1, 光: 0.85, 闪耀: 0.9, 天空: 0.5, 觉悟: 0.5, 神圣: 0.5, 敬畏: 0.4 } },
    { id: 'bolt', zh: '电', w: { 电: 1, 电子: 0.8, 爆发: 0.6, 脉动: 0.6, 风暴: 0.6, 迅速: 0.4 } },
    { id: 'chevron', zh: '升', w: { 上升: 1, 飞翔: 0.9, 未来: 0.5, 翅膀: 0.6, 高耸: 0.4, 载具: 0.4 } },
    { id: 'peak', zh: '峰', w: { 山岳: 1, 石: 0.7, 土: 0.6, 高耸: 0.5, 古老: 0.3, 地下: 0.4, 建筑: 0.4 } },
    { id: 'plus', zh: '十', w: { 药: 1, 疾病: 0.9, 身体: 0.6, 血: 0.5, 心脏: 0.4 } },
    { id: 'equals', zh: '等', w: { 规则: 1, 正义: 0.9, 平衡: 0.9, 秩序: 0.7, 对称: 0.5, 权威: 0.5 } },
    { id: 'leaf', zh: '叶', w: { 植物: 1, 生命: 0.6, 绿: 0.7, 生长: 0.6, 森林: 0.7, 田野: 0.6, 种子: 0.4 } },
    { id: 'cut', zh: '切', w: { 冲突: 1, 对立: 0.9, 分离: 0.8, 碎片: 0.7, 尖锐: 0.7, 暴力: 0.6 } },
    { id: 'crescent', zh: '月', w: { 梦境: 1, 夜晚: 0.8, 月亮: 1, 虚幻: 0.7, 神秘: 0.6, 暗: 0.5, 记忆: 0.4 } },
    { id: 'diamond', zh: '晶', w: { 晶体: 1, 宝石: 0.9, 方正: 0.5, 实心: 0.5, 坚硬: 0.4, 实在: 0.4 } },
    { id: 'eye', zh: '目', w: { 眼睛: 1, 美: 0.4, 艺术: 0.4, 想象: 0.4, 好奇: 0.3 } },
    { id: 'lines', zh: '文', w: { 文字: 1, 故事: 0.8, 知识: 0.6, 记忆: 0.4, 交流: 0.3 } },
    { id: 'orbit', zh: '旋', w: { 旋转: 1, 变化: 0.4, 时间: 0.4, 机械: 0.4, 循环: 0.3 } },
  ].map((a) => Object.assign(a, { list: Object.entries(a.w).filter(([k]) => IDX.has(k)).map(([k, v]) => [IDX.get(k), v, k]) }));

  function pickAccent(vec) {
    let best = null, bs = 0.35;
    for (const a of ACCENTS) {
      let s = 0;
      for (const [i, w] of a.list) s += w * vec[i];
      if (s > bs + 1e-9) { bs = s; best = a; }
    }
    if (!best) return null;
    const why = best.list.map(([i, w, k]) => [k, w * vec[i]]).filter((x) => x[1] > 0).sort((p, q) => q[1] - p[1]).slice(0, 3).map((x) => x[0]);
    return { a: best, score: bs, why };
  }

  const U = 4.2;          // one grid unit in viewBox units: the monogram is 10 units = 42
  const OX = 29, OY = 27.6; // monogram origin (a little above centre: optical centre, room for a mark in base)
  function styleOf(vec, sem) {
    let mass = 0;
    for (let i = 0; i < 256; i++) mass += vec[i];
    if (!sem || mass < 1e-6) {
      return { round: true, soft: 0.3, pw: 0.5, w: U * 1.18, j: U * 0.72, accent: null, hard: 0, power: 0, neutral: true };
    }
    const hard = L.axis(vec, 'hard'), power = L.axis(vec, 'power');
    const round = hard < 0.3;
    const soft = Math.max(0, Math.min(1, -hard));
    const pw = Math.max(0, Math.min(1, (power + 0.7) / 1.7));
    return {
      round, soft, pw, hard, power,
      w: U * (0.95 + 0.45 * pw),
      j: U * (0.5 + 0.75 * soft),
      accent: pickAccent(vec),
    };
  }

  /* ================================================================ family frames */
  // Seven frames from one rule: a square whose four corners (TL TR BR BL) are each S square, R round,
  // C chamfered or N notched. Assigned by convention, chosen so each reads as a silhouette.
  const FAM = [
    { c: 'RRRR', name: '圆', why: '四角皆圆：天体、轨道与圆规' },
    { c: 'CCCC', name: '八角', why: '四角切去：机加工的倒角、螺母的面' },
    { c: 'RSRS', name: '叶', why: '对角两圆：叶片与细胞的轮廓' },
    { c: 'RRSS', name: '拱', why: '上圆下方：碑首、门洞与书页' },
    { c: 'RRRS', name: '话框', why: '三圆一方：留下的方角像说话的气泡' },
    { c: 'NNNN', name: '印牌', why: '四角内凹：票据、契约与印牌' },
    { c: 'SSSS', name: '画布', why: '四角皆方：绷好的画布、纸与舞台' },
  ];
  const FW = 2.2;
  const FX0 = 8 + FW / 2, FX1 = 92 - FW / 2, FH = (FX1 - FX0) / 2;
  const CLEG = FH - FH / (1 + Math.SQRT2); // chamfer leg that makes a regular octagon
  const NOTCH = FH * 0.32;

  function frameUpper(tl, tr) {
    const X0 = FX0, X1 = FX1, Y0 = FX0, h = FH, c = CLEG, n = NOTCH;
    let d = `M${f2(X0)} 50`;
    if (tl === 'R') d += `L${f2(X0)} ${f2(Y0 + h)}A${f2(h)} ${f2(h)} 0 0 1 ${f2(X0 + h)} ${f2(Y0)}`;
    else if (tl === 'C') d += `L${f2(X0)} ${f2(Y0 + c)}L${f2(X0 + c)} ${f2(Y0)}`;
    else if (tl === 'N') d += `L${f2(X0)} ${f2(Y0 + n)}A${f2(n)} ${f2(n)} 0 0 0 ${f2(X0 + n)} ${f2(Y0)}`;
    else d += `L${f2(X0)} ${f2(Y0)}`;
    if (tr === 'R') d += `L${f2(X1 - h)} ${f2(Y0)}A${f2(h)} ${f2(h)} 0 0 1 ${f2(X1)} ${f2(Y0 + h)}`;
    else if (tr === 'C') d += `L${f2(X1 - c)} ${f2(Y0)}L${f2(X1)} ${f2(Y0 + c)}`;
    else if (tr === 'N') d += `L${f2(X1 - n)} ${f2(Y0)}A${f2(n)} ${f2(n)} 0 0 0 ${f2(X1)} ${f2(Y0 + n)}`;
    else d += `L${f2(X1)} ${f2(Y0)}`;
    return d + `L${f2(X1)} 50`;
  }
  function frameLower(br, bl, move) {
    const X0 = FX0, X1 = FX1, Y1 = FX1, h = FH, c = CLEG, n = NOTCH;
    let d = move ? `M${f2(X1)} 50` : '';
    if (br === 'R') d += `L${f2(X1)} ${f2(Y1 - h)}A${f2(h)} ${f2(h)} 0 0 1 ${f2(X1 - h)} ${f2(Y1)}`;
    else if (br === 'C') d += `L${f2(X1)} ${f2(Y1 - c)}L${f2(X1 - c)} ${f2(Y1)}`;
    else if (br === 'N') d += `L${f2(X1)} ${f2(Y1 - n)}A${f2(n)} ${f2(n)} 0 0 0 ${f2(X1 - n)} ${f2(Y1)}`;
    else d += `L${f2(X1)} ${f2(Y1)}`;
    if (bl === 'R') d += `L${f2(X0 + h)} ${f2(Y1)}A${f2(h)} ${f2(h)} 0 0 1 ${f2(X0)} ${f2(Y1 - h)}`;
    else if (bl === 'C') d += `L${f2(X0 + c)} ${f2(Y1)}L${f2(X0)} ${f2(Y1 - c)}`;
    else if (bl === 'N') d += `L${f2(X0 + n)} ${f2(Y1)}A${f2(n)} ${f2(n)} 0 0 0 ${f2(X0)} ${f2(Y1 - n)}`;
    else d += `L${f2(X0)} ${f2(Y1)}`;
    return d + `L${f2(X0)} 50`;
  }
  // inner edge of the frame's top at x (for hanging the course label)
  function topInner(x, tl, tr) {
    const left = x < 50;
    const t = left ? tl : tr;
    const e = left ? x - FX0 : FX1 - x;
    let y = FX0;
    if (t === 'R' && e < FH) y = FX0 + FH - Math.sqrt(Math.max(0, FH * FH - (FH - e) * (FH - e)));
    else if (t === 'C' && e < CLEG) y = FX0 + (CLEG - e);
    else if (t === 'N' && e < NOTCH) y = FX0 + Math.sqrt(Math.max(0, NOTCH * NOTCH - e * e));
    return y + FW / 2;
  }

  /* ================================================================ drawing glyphs */
  // places: [{ch, x, y, w, h}] in grid units. geo: {ox, oy, u, w (stroke), round, j, style, soft, pw}.
  // Returns {g, clearance(px, py), own(k, px, py)}: distance from a point to the ink (all letters / letter k).
  function drawGlyphs(S, places, geo, ink, uid) {
    const g = S('g', {});
    const { ox, oy, u, style } = geo;
    const polysBy = places.map(() => []);
    if (style === 'line') {
      const polys = [];
      const defs = S('defs', {});
      g.appendChild(defs);
      places.forEach((pl, k) => {
        const gl = GLYPH[pl.ch];
        if (!gl) return;
        const bx = ox + pl.x * u, by = oy + pl.y * u, bw = pl.w * u, bh = pl.h * u;
        const half = geo.w / 2;
        const cid = `${uid}-c${k}`;
        defs.appendChild(S('clipPath', { id: cid }, [S('rect', { x: f2(bx - half), y: f2(by - half), width: f2(bw + 2 * half), height: f2(bh + 2 * half) })]));
        const m = Math.min(bw, bh);
        const J = { round: geo.round, j: geo.j, big: m / 2, cj: Math.min(geo.cj, m * 0.2), cbig: m * 0.3 };
        let d = '';
        for (const s of gl.strokes) {
          const P = s.pts.map(([x, y, c]) => [bx + x * bw, by + y * bh, c]);
          const r = strokePath(P, s.closed, J);
          d += r.d;
          polys.push(r.poly);
          polysBy[k].push(r.poly);
        }
        g.appendChild(S('path', {
          d, fill: 'none', stroke: ink, 'stroke-width': f2(geo.w),
          'stroke-linecap': geo.round ? 'round' : 'square', 'stroke-linejoin': geo.round ? 'round' : 'miter',
          'stroke-miterlimit': 12, 'clip-path': `url(#${cid})`,
        }));
      });
      return { g, clearance: (px, py) => polyDist(px, py, polys) - geo.w / 2, own: (k, px, py) => polyDist(px, py, polysBy[k]) - geo.w / 2 };
    }
    // modules: the same skeleton snapped to the grid and sampled at every grid node
    const polys = [];
    let maxX = 0, maxY = 0;
    const snap = (v) => Math.floor(v + 0.4999);
    places.forEach((pl, k) => {
      const gl = GLYPH[pl.ch];
      if (!gl) return;
      maxX = Math.max(maxX, pl.x + pl.w); maxY = Math.max(maxY, pl.y + pl.h);
      const m = Math.min(pl.w, pl.h);
      const J = { round: true, j: 0, big: m / 2 };
      for (const s of gl.strokes) {
        const P = s.pts.map(([x, y, c]) => [snap(pl.x + x * pl.w), snap(pl.y + y * pl.h), c]);
        const pl2 = strokePath(P, s.closed, J).poly;
        polys.push(pl2);
        polysBy[k].push(pl2);
      }
    });
    // straight strokes: one module per step along the major axis (DDA); bowls: every node within half a module
    const onBy = places.map(() => new Map());
    const mark = (k, i, j) => { if (i >= 0 && j >= 0 && i <= maxX && j <= maxY) onBy[k].set(j * 64 + i, [i, j]); };
    polysBy.forEach((pp, k) => {
      for (const pl of pp) {
        for (let q = 1; q < pl.length; q++) {
          const a = pl[q - 1], b = pl[q];
          const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.max(Math.abs(dx), Math.abs(dy));
          if (n >= 0.99) {
            const steps = Math.round(n);
            for (let t = 0; t <= steps; t++) mark(k, Math.round(a[0] + dx * t / steps), Math.round(a[1] + dy * t / steps));
          } else {
            for (let j = Math.floor(Math.min(a[1], b[1])) - 1; j <= Math.ceil(Math.max(a[1], b[1])) + 1; j++) {
              for (let i = Math.floor(Math.min(a[0], b[0])) - 1; i <= Math.ceil(Math.max(a[0], b[0])) + 1; i++) {
                if (segDist(i, j, a, b) <= 0.5) mark(k, i, j);
              }
            }
          }
        }
      }
    });
    const all = new Map();
    onBy.forEach((m) => m.forEach((v, key) => all.set(key, v)));
    const on = [...all.values()];
    onBy.forEach((m, k) => { onBy[k] = [...m.values()]; });
    if (style === 'dot') {
      const r = u * (0.4 + 0.08 * geo.pw);
      for (const [i, j] of on) g.appendChild(S('circle', { cx: f2(ox + i * u), cy: f2(oy + j * u), r: f2(r), fill: ink }));
      return { g, clearance: (px, py) => modClear(px, py, on, ox, oy, u, r), own: (k, px, py) => modClear(px, py, onBy[k], ox, oy, u, r) };
    }
    const s = u + 0.06; // modules touch: one solid shape, as on the Media Lab grid
    const rx = geo.round ? s * 0.12 * geo.soft : 0;
    let d = '';
    for (const [i, j] of on) {
      const x = ox + i * u - s / 2, y = oy + j * u - s / 2;
      if (!rx) d += `M${f2(x)} ${f2(y)}h${f2(s)}v${f2(s)}h${f2(-s)}Z`;
      else d += `M${f2(x + rx)} ${f2(y)}h${f2(s - 2 * rx)}a${f2(rx)} ${f2(rx)} 0 0 1 ${f2(rx)} ${f2(rx)}v${f2(s - 2 * rx)}a${f2(rx)} ${f2(rx)} 0 0 1 ${f2(-rx)} ${f2(rx)}h${f2(-(s - 2 * rx))}a${f2(rx)} ${f2(rx)} 0 0 1 ${f2(-rx)} ${f2(-rx)}v${f2(-(s - 2 * rx))}a${f2(rx)} ${f2(rx)} 0 0 1 ${f2(rx)} ${f2(-rx)}Z`;
    }
    g.appendChild(S('path', { d, fill: ink }));
    return { g, clearance: (px, py) => modClear(px, py, on, ox, oy, u, s / 2), own: (k, px, py) => modClear(px, py, onBy[k], ox, oy, u, s / 2) };
  }
  function modClear(px, py, on, ox, oy, u, h) {
    let m = Infinity;
    for (const [i, j] of on) {
      const dx = Math.max(0, Math.abs(px - ox - i * u) - h), dy = Math.max(0, Math.abs(py - oy - j * u) - h);
      m = Math.min(m, Math.hypot(dx, dy));
    }
    return m;
  }

  /* ================================================================ accents */
  // Every mark is drawn in a box of half-size r (nominal 5.2) with one stroke weight aw, so all 17 share a size.
  function drawAccent(S, id, x, y, r, aw, ink, round) {
    const st = { fill: 'none', stroke: ink, 'stroke-width': f2(aw), 'stroke-linecap': round ? 'round' : 'square', 'stroke-linejoin': round ? 'round' : 'miter' };
    const fl = { fill: ink };
    const X = (u) => f2(x + u * r), Y = (v) => f2(y + v * r);
    const P = (pts, z) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join('') + (z ? 'Z' : '');
    const g = S('g', {});
    const add = (tag, a, extra) => g.appendChild(S(tag, Object.assign({}, a, extra || {})));
    const dot = (u, v, rr) => add('circle', { cx: X(u), cy: Y(v), r: f2(rr * r) }, fl);
    switch (id) {
      case 'point': dot(0, 0, 0.56); break;
      case 'scatter': dot(-0.56, 0.36, 0.32); dot(0.56, 0.36, 0.32); dot(0, -0.58, 0.32); break;
      case 'ring': add('circle', { cx: X(0), cy: Y(0), r: f2(0.62 * r) }, st); break;
      case 'wave': {
        const q = 0.46 * r;
        add('path', { d: `M${f2(x - 2 * q)} ${f2(y)}A${f2(q)} ${f2(q)} 0 0 1 ${f2(x)} ${f2(y)}A${f2(q)} ${f2(q)} 0 0 0 ${f2(x + 2 * q)} ${f2(y)}` }, st);
        break;
      }
      case 'spark': { const q = 0.21; add('path', { d: P([[0, -1], [q, -q], [1, 0], [q, q], [0, 1], [-q, q], [-1, 0], [-q, -q]], true) }, fl); break; }
      case 'bolt': add('path', { d: P([[0.2, -1], [-0.48, 0.14], [-0.02, 0.14], [-0.2, 1], [0.48, -0.14], [0.02, -0.14]], true) }, fl); break;
      case 'chevron': add('path', { d: P([[-0.68, 0.34], [0, -0.34], [0.68, 0.34]]) }, st); break;
      case 'peak': add('path', { d: P([[0, -0.72], [0.82, 0.58], [-0.82, 0.58]], true) }, fl); break;
      case 'plus': add('path', { d: P([[-0.72, 0], [0.72, 0]]) + P([[0, -0.72], [0, 0.72]]) }, st); break;
      case 'equals': { const e = (aw / 2 + 1.1 * r / 5.2) / r; add('path', { d: P([[-0.7, -e], [0.7, -e]]) + P([[-0.7, e], [0.7, e]]) }, st); break; }
      case 'leaf': {
        const R = r * 1.02;
        add('path', { d: `M${X(-0.62)} ${Y(0.62)}A${f2(R)} ${f2(R)} 0 0 1 ${X(0.62)} ${Y(-0.62)}A${f2(R)} ${f2(R)} 0 0 1 ${X(-0.62)} ${Y(0.62)}Z` }, fl);
        break;
      }
      case 'cut': add('path', { d: P([[-0.42, 0.78], [0.42, -0.78]]) }, st, { 'stroke-width': f2(aw * 1.12) }); break;
      case 'crescent': {
        const R = r * 0.78, a0 = -Math.PI * 0.64, a1 = Math.PI * 0.64;
        const p1 = [x + R * Math.cos(a0), y + R * Math.sin(a0)], p2 = [x + R * Math.cos(a1), y + R * Math.sin(a1)];
        add('path', { d: `M${f2(p1[0])} ${f2(p1[1])}A${f2(R)} ${f2(R)} 0 1 0 ${f2(p2[0])} ${f2(p2[1])}A${f2(R * 0.8)} ${f2(R * 0.8)} 0 1 1 ${f2(p1[0])} ${f2(p1[1])}Z` }, fl);
        break;
      }
      case 'diamond': add('path', { d: P([[0, -0.9], [0.58, 0], [0, 0.9], [-0.58, 0]], true) }, fl); break;
      case 'eye': {
        const e = 0.92 * r, hgt = 0.5 * r, R = (e * e + hgt * hgt) / (2 * hgt);
        add('path', { d: `M${f2(x - e)} ${f2(y)}A${f2(R)} ${f2(R)} 0 0 1 ${f2(x + e)} ${f2(y)}A${f2(R)} ${f2(R)} 0 0 1 ${f2(x - e)} ${f2(y)}Z` }, st, { 'stroke-width': f2(aw * 0.72), 'stroke-linejoin': 'round' });
        dot(0, 0, 0.24);
        break;
      }
      case 'lines': {
        const e = (aw * 0.72 + 1.3 * r / 5.2) / r;
        add('path', { d: P([[-0.72, -e], [0.72, -e]]) + P([[-0.72, 0], [0.72, 0]]) + P([[-0.72, e], [0.12, e]]) }, st, { 'stroke-width': f2(aw * 0.72) });
        break;
      }
      case 'orbit':
        add('circle', { cx: X(0), cy: Y(0), r: f2(0.64 * r) }, st, { 'stroke-width': f2(aw * 0.62) });
        dot(0.45, -0.45, 0.27);
        break;
      default: break;
    }
    return g;
  }

  /* ================================================================ identity */
  function partOf(p, lab) {
    const zh = typeof p === 'string' ? p : p && (p.zh || p.word);
    if (!zh) return null;
    const it = lab.item(zh);
    const v = lab.vec(zh);
    return { zh, it, letters: lettersOf(it, v), f: it.kind === 'discipline' ? it.f : -1 };
  }
  function identity(ctx, lab, vec) {
    const item = ctx.item || { kind: 'word', f: -1 };
    if (item.kind === 'combo') {
      let names = Array.isArray(item.parts) && item.parts.length === 2 ? item.parts : null;
      if (!names) {
        const bits = String(item.zh || ctx.word || '').split(/\s*[+×]\s*/);
        if (bits.length === 2) names = bits;
      }
      const parts = names ? names.map((p) => partOf(p, lab)) : null;
      if (parts && parts[0] && parts[1] && parts[0].letters && parts[1].letters) {
        return {
          rows: [parts[0].letters.slice(0, 2).split(''), parts[1].letters.slice(0, 2).split('')],
          top: parts[0].f, bot: parts[1].f, parts, letters: parts[0].letters.slice(0, 2) + parts[1].letters.slice(0, 2),
        };
      }
    }
    const f = item.kind === 'discipline' && item.f >= 0 && item.f < 7 ? item.f : -1;
    const letters = lettersOf(item, vec);
    return { rows: rowsOf(letters), top: f, bot: f, parts: null, letters };
  }

  /* ================================================================ render */
  function render(ctx) {
    const { lab, size, colors, opts } = ctx;
    const S = lab.svg;
    const ink = colors.ink, muted = colors.muted || ink;
    const detail = ctx.mode === 'detail';
    const hover = detail && typeof ctx.hover === 'function' ? ctx.hover : null;
    const vec = ctx.vec || new Float32Array(256);
    const sem = opts.semantic !== false;
    const style = ['line', 'block', 'dot'].includes(opts.style) ? opts.style : 'line';
    const uid = 'mono' + (++SEQ);
    const item = ctx.item || { kind: 'word', f: -1 };

    const id = identity(ctx, lab, vec);
    const st = styleOf(vec, sem);
    const course = item.kind === 'discipline' && ctx.course && ctx.course.level > 0 ? ctx.course : null;
    const showNum = detail && course && opts.number !== false;

    const root = S('svg', {
      width: size, height: size, viewBox: '0 0 100 100', role: 'img',
      'aria-label': `${ctx.word || ''} ${id.letters}${course ? ' ' + course.number : ''}`,
      style: 'display:block;overflow:visible',
    });
    const g = S('g', showNum ? { transform: 'translate(50 8) scale(0.74) translate(-50 -8)' } : {});
    root.appendChild(g);

    // empty state: the bare module grid
    const comp = compose(id.rows);
    if (!comp.places.length) {
      const eg = S('g', { fill: muted, opacity: 0.45 });
      for (let j = 0; j <= 10; j++) for (let i = 0; i <= 10; i++) eg.appendChild(S('circle', { cx: OX + i * U, cy: OY + j * U, r: (i % 5 === 0 && j % 5 === 0) ? 0.9 : 0.45 }));
      g.appendChild(eg);
      return root;
    }

    // 1. family: the frame's corners (combo: upper half from the first parent, lower half from the second)
    const tC = id.top >= 0 ? FAM[id.top].c : null, bC = id.bot >= 0 ? FAM[id.bot].c : null;
    if (tC || bC) {
      let d = '';
      if (tC && bC) d = frameUpper(tC[0], tC[1]) + frameLower(bC[2], bC[3], false) + 'Z';
      else if (tC) d = frameUpper(tC[0], tC[1]);
      else d = frameLower(bC[2], bC[3], true);
      const fp = S('path', { d, fill: 'none', stroke: ink, 'stroke-width': FW, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });
      const fg = S('g', {}, [fp]);
      g.appendChild(fg);
      if (hover) {
        fg.appendChild(S('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 9 }));
        const famText = (f) => `${D.families[f].key} ${D.families[f].zh} · ${FAM[f].name}`;
        const title = id.parts ? `门类 · 上 ${id.top >= 0 ? famText(id.top) : '—'} / 下 ${id.bot >= 0 ? famText(id.bot) : '—'}` : `门类 · ${famText(id.top)}`;
        const sub = id.parts ? '交叉学科按纹章的“上下分割”（per fess）：上半框取第一门学科的门类，下半框取第二门' : FAM[id.top].why;
        bindHover(fg, hover, { title, sub });
      }
    }

    // 2. discipline: the monogram
    const geo = { ox: OX, oy: OY, u: U, w: st.w, round: st.round, j: st.j, cj: U * 0.7, style, soft: st.soft, pw: st.pw };
    const mg = drawGlyphs(S, comp.places, geo, ink, uid);
    g.appendChild(mg.g);
    if (hover) {
      mg.g.appendChild(S('rect', { x: OX - 4, y: OY - 4, width: 10 * U + 8, height: 10 * U + 8, fill: 'transparent' }));
      const rowsTxt = id.rows.filter(Array.isArray).map((r) => r.join(' ')).join(' / ');
      const lig = comp.ligs.length ? `；连字 ${comp.ligs.join('、')} 共用一笔` : '';
      const how = st.neutral ? '语义关：统一圆角与笔重' : `${st.round ? '圆角' : '切角'}（刚柔 ${st.hard >= 0 ? '+' : ''}${st.hard.toFixed(2)}）· 笔重 ${(st.w / U).toFixed(2)} 模块（强弱 ${st.power >= 0 ? '+' : ''}${st.power.toFixed(2)}）`;
      bindHover(mg.g, hover, { title: `字母 · ${id.letters}${id.parts ? '（' + id.parts.map((p) => p.letters).join(' × ') + '）' : ''}`, sub: `${rowsTxt}${lig} · ${how}` });
    }

    // 3. semantic accent in the roomiest counter
    if (st.accent) {
      // candidates: points inside a letter box, scored by clearance from the strokes and by how enclosed they are
      // (8 rays; a closed counter beats an open corner, so the mark reads as inside a letter, not as punctuation)
      const step = U / 4, NG = 40;
      const clr = new Float32Array((NG + 1) * (NG + 1));
      for (let j = 0; j <= NG; j++) for (let i = 0; i <= NG; i++) clr[j * (NG + 1) + i] = mg.clearance(OX + i * step, OY + j * step);
      const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      let best = null;
      const cx = OX + 5 * U, cy = OY + 5 * U;
      comp.places.forEach((p, k) => {
        const i0 = Math.round(p.x * 4), i1 = Math.round((p.x + p.w) * 4), j0 = Math.round(p.y * 4), j1 = Math.round((p.y + p.h) * 4);
        const own = new Map();
        const ownAt = (i, j) => {
          const key = j * 64 + i;
          if (!own.has(key)) own.set(key, mg.own(k, OX + i * step, OY + j * step));
          return own.get(key);
        };
        for (let j = j0 + 1; j < j1; j++) {
          for (let i = i0 + 1; i < i1; i++) {
            const c = clr[j * (NG + 1) + i];
            if (c < 5.6) continue;
            let enc = 0;
            for (const [dx, dy] of DIRS) {
              for (let s2 = 1; s2 <= 24; s2++) {
                const ii = i + dx * s2, jj = j + dy * s2;
                if (ii < i0 - 1 || ii > i1 + 1 || jj < j0 - 1 || jj > j1 + 1) break;
                if (ownAt(ii, jj) < 0) { enc++; break; }
              }
            }
            if (enc < 6) continue;
            const x = OX + i * step, y = OY + j * step;
            const sc = c * (0.4 + 0.6 * enc / 8) - 0.004 * Math.hypot(x - cx, y - cy);
            if (!best || sc > best.sc + 1e-9) best = { x, y, c, sc, enc, k };
          }
        }
      });
      // no real counter: the mark goes in base, under the letters (where a heraldic charge would sit)
      const R0 = 5.6;
      let ax = 50, ay = 81.6, sc = 1;
      if (best && (best.c - 1.5) / R0 >= 0.74) { ax = best.x; ay = best.y; sc = Math.min(1.05, (best.c - 1.5) / R0); }
      const ra = R0 * sc;
      const aw = Math.max(2, st.w * 0.5) * Math.min(1, sc);
      const ag = drawAccent(S, st.accent.a.id, ax, ay, ra, aw, ink, st.round);
      g.appendChild(ag);
      if (hover) {
        ag.appendChild(S('circle', { cx: ax, cy: ay, r: ra + 2, fill: 'transparent' }));
        bindHover(ag, hover, { title: `语义点缀 · ${st.accent.a.zh}（${st.accent.a.id}）`, sub: `最强属性簇：${st.accent.why.join('、')}　得分 ${st.accent.score.toFixed(2)}` });
      }
    }

    // 4. course: a heraldic label — one hanging bar per level; graduate levels (5+) close the bars with a crossbar
    if (course) {
      const n = Math.min(9, course.level);
      const sp = 4.6, yb = 20.4, bw = 2.3;
      const xs = Array.from({ length: n }, (_, k) => 50 + (k - (n - 1) / 2) * sp);
      const tl = tC ? tC[0] : 'S', tr = tC ? tC[1] : 'S';
      let d = '';
      for (const x of xs) {
        const yt = tC ? topInner(x, tl, tr) - 0.6 : 12.2;
        d += `M${f2(x)} ${f2(yt)}L${f2(x)} ${f2(yb)}`;
      }
      if (n >= 5) d += `M${f2(xs[0] - bw / 2)} ${f2(yb - bw / 2)}L${f2(xs[n - 1] + bw / 2)} ${f2(yb - bw / 2)}`;
      const cg = S('g', {}, [S('path', { d, fill: 'none', stroke: ink, 'stroke-width': bw, 'stroke-linecap': 'butt' })]);
      g.appendChild(cg);
      if (hover) {
        cg.appendChild(S('rect', { x: xs[0] - 3, y: 9, width: xs[n - 1] - xs[0] + 6, height: 12, fill: 'transparent' }));
        bindHover(cg, hover, { title: `课程 · ${course.label}`, sub: `${course.level} 级：${n} 根垂饰（纹章里长子的 label）${n >= 5 ? '，研究生课程用横杠连起' : ''}` });
      }
    }

    // 5. detail: the course number in the same modular digits
    if (showNum) {
      const digits = String(course.number).split('');
      const du = 3.4, dh = 4, dwd = 2, gap = 1;
      const tot = digits.length * dwd + (digits.length - 1) * gap;
      const places = digits.map((ch, k) => ({ ch, x: k * (dwd + gap), y: 0, w: dwd, h: dh }));
      const dgeo = { ox: 50 - (tot * du) / 2, oy: 92 - dh * du - 1.4, u: du, w: Math.max(2.2, st.w * 0.5), round: st.round, j: du * 0.5, cj: du * 0.5, style, soft: st.soft, pw: st.pw };
      const dg = drawGlyphs(S, places, dgeo, ink, uid + 'd');
      root.appendChild(dg.g);
      if (hover) {
        dg.g.appendChild(S('rect', { x: dgeo.ox - 3, y: dgeo.oy - 3, width: tot * du + 6, height: dh * du + 6, fill: 'transparent' }));
        bindHover(dg.g, hover, { title: `课号 · ${course.label}`, sub: `同一套模块骨架画出的数字；百位 ${course.level} 是年级，末两位 ${String(course.minor).padStart(2, '0')} 是序号` });
      }
    }
    return root;
  }

  function bindHover(el, hover, info) {
    if (!hover) return;
    el.addEventListener('pointerenter', () => hover(info));
    el.addEventListener('pointerleave', () => hover(null));
  }

  /* ================================================================ register */
  const about = [
    `<p>字母组合标志（monogram）是最老的集体标识之一：君士坦丁的 Chi-Rho 取基督名字的前两个希腊字母，查理曼在文书上画自己的花押，宋以后的官印用九叠篆把笔画折叠起来填满方印。它能代表一个集体，是因为借用了一套所有人早已共享的系统——字母表和名字。不用学新符号，谁都念得出来（“我认得 PHYS”）；来了新成员，按规则拼出缩写就有了标志。MIT Media Lab 2014 年的标识（Pentagram，Michael Bierut）走的就是这条路：每个组的缩写画在共用的 7×7 方格上，同一种粗笔画，系统感靠网格和笔重维持。</p>`,
    `<p>它让人觉得有点丑，原因大致有四：网格太粗，字母被硬塞进去，留下别扭的字腔和突兀的残段；所有组平级，看不出层级；形状只来自名字，与研究内容无关，所以显得任意；几乎没有光学修正。这里的改法：骨架画在每个字母 5×5 的节点网格上，只用横、竖、少量斜笔和四分之一圆；每个拐角只有三种——尖角、关节（小圆角或倒角）、碗（几何允许的最大圆），所以 O、D、P、S 的字腔自动均匀；每个字母按自己的框裁切，斜笔和尖角在顶线、底线处被切平；全部字母同一笔重、同一种端头。同一份骨架可以画成线、方块（接近 Media Lab）或圆点：规格和画法分开。</p>`,
    `<p>三层的映射。门类是外框的四个角，每角只能是方、圆、倒角、内凹之一，七个门类各取一组：理 四圆（圆形）、工 四倒角（八角）、生 对角两圆（叶形）、人 上圆下方（拱）、社 三圆一方（话框）、经 四内凹（印牌）、艺 四方（画布）。学科是课程代码本身：2 个字母左右并排（拉高），3 个字母首字母竖排在左、后两字叠在右，4 个字母 2×2；相邻两字在接缝处都有完整竖画（或横画）就共用这一笔，成为连字，如 MA、AR、NE、UR、MED。语义向量只调“口音”，不改字：刚柔轴决定圆角还是倒角、圆端还是方端，强弱轴决定笔重，最强的属性簇从 17 个点缀（点、散点、环、波、星、电、升、峰、十、等号、叶、切、月、晶、目、文、旋）里选一个，放进最封闭且够大的字腔（O、D、P、C 的腔）；没有这样的字腔，就放在字母下方，即纹章“底部”（base）的位置。课程借用纹章长子的 label：外框顶边垂下短竖，几年级就几根，研究生课程再用一根横杠连起来；详情里在下方用同一套模块数字写出课号。交叉学科按纹章的上下分割：上行是第一门代码的前两个字母、上半框是它的门类，下行和下半框归第二门。</p>`,
    `<p>老实说，字母路线的长处和短处是同一件事。长处是可读、可学、零成本扩展：任何有代码的课立刻就有标志，人能念、能手写。短处是字母只带着名字，不带着领域：语义路线回答“这门学科是什么”，字母只回答“它叫什么”。PHYS 和 PHIL 字形相近、意思很远；天文学和物理学意思很近，字形毫无关系；点缀和圆角只是口音，读不出“这是研究星星的学科”——这正是 Media Lab 显得任意的原因，这里只缓解，没有解决。另外，2 字母代码（CS、EE、AI）只能拉成高窄字，和 4 字母的方块节奏不同；O、C、G、Q 在 48px 下容易混；门类只靠外框说话。切到方块画法就能看到粗网格的老毛病：5 格宽的字母找不到中线，M、N 的斜笔只能走台阶。它适合做一套系统的“名字层”，和语义纹章并用，而不是取代它。</p>`,
  ].join('');

  L.register({
    id: 'monogram',
    order: 8,
    name: '代码字形',
    en: 'Code Glyph',
    tagline: '课程代码折进方块，向量只调口音',
    dims: '字母来自课程代码（没有代码时取英文名缩写或拼音首字母），向量只用三处：刚柔轴（lab.axis hard，>0.3 倒角方端，否则圆角，越柔越圆）、强弱轴（笔重 0.95–1.4 个网格单位）、17 个点缀各自属性加权和的最大者（低于 0.35 不加点缀）。',
    lineage: '前人：君士坦丁的 Chi-Rho（312）；查理曼的花押（8–9 世纪）；宋代官印的九叠篆；Herbert Bayer 的 Universal 字母（包豪斯，1925）；Wim Crouwel 的 New Alphabet（1967）；TheGreenEyl 的 Media Lab 算法标志（2011）；Pentagram / Michael Bierut 的 Media Lab 7×7 字形系统（2014）。',
    about,
    controls: [
      { id: 'style', label: '画法', type: 'select', value: 'line',
        options: [{ value: 'line', label: '线 · 笔画' }, { value: 'block', label: '块 · 方格' }, { value: 'dot', label: '点 · 圆点' }] },
      { id: 'semantic', label: '语义', type: 'toggle', value: true },
      { id: 'number', label: '课号', type: 'toggle', value: true },
    ],
    render,
  });
})();
