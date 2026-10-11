// 纹章语法 Emblem Grammar — the synthesis renderer (main proposal).
// What heraldry, kamon and Chinese characters share, rebuilt as one system:
//   a finite alphabet of motivated morphemes, slots ordered by salience, kamon-style inflection,
//   a herald's registry that keeps primary charges unique, and a blazon (specification) that is
//   separate from the drawing. blazon(ctx) -> plain object + Chinese sentence; draw(blazon, style) -> SVG.
(function () {
  const L = window.LogoLab;
  const D = L.data;

  /* ==================================================================================================
   * 1. CONSTRUCTION CONSTANTS — 构造常数
   * Everything below is drawn from these numbers. They are the "hand" of the system: change them and
   * the whole set changes style together, without changing a single blazon.
   * ================================================================================================ */
  const SIZE = 240;                 // the square is 24u × 24u
  const U = 10;                     // one grid unit
  const C = SIZE / 2;               // centre
  const W = 0.5 * U;                // 规矩: the one stroke weight (frame, division, primary charge)
  const W_FINE = 0.36 * U;          // small charges (secondary, 品字 triples)
  const W_RING = 0.24 * U;          // the plain ring of a non-discipline word
  const CUT = 1.2;                  // 印刻: carved channels are this much heavier than 规矩 strokes
  const CORNER = 0.8 * U;           // fillet radius on every polygonal frame corner
  // Every straight line in a morpheme runs at one of these angles (mod 90); arcs use radii from ARCS
  // (in charge-grid units: a charge is drawn on a 20 × 20 grid, centre 0,0).
  const ANGLES = [0, 30, 45, 60, 90];
  const ARCS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const CH = { whole: 5.2 * U, pale: 5.0 * U, major: 4.2 * U, impaled: 3.3 * U, minor: 1.45 * U, triple: 2.6 * U };
  const MARK = { y: 4.8 * U, r: 0.28 * U, gap: 0.36 * U, bar: 1.5 * U, barH: 0.46 * U };
  const HATCH = { pitch: 0.46 * U, w: 0.11 * U, halo: 0.7 * U };   // Petra Sancta tincture lines
  const BASE = 15.6 * U;            // the line of partition between the major field and the base

  // Field layouts: where the primary (p) and secondary (s) charges sit, and the line of partition.
  // The minor field is always the base (the "ground"); the marks of difference always sit on top (the chief).
  const LAYOUT = {
    plain: { p: [C, 124, CH.whole] },
    pale: { p: [C, 124, CH.pale] },
    fess: { p: [C, 101, CH.major], s: [C, 182, CH.minor], line: () => `M0 ${BASE}H${SIZE}` },
    wavy: { p: [C, 101, CH.major], s: [C, 184, CH.minor], line: () => wavyLine(BASE, 12) },
    indented: { p: [C, 101, CH.major], s: [C, 185, CH.minor], line: () => indentLine(BASE, 7, 16) },
    chevron: { p: [C, 99, CH.major], s: [C, 186, CH.minor], line: () => `M-20 ${150 + 140}L${C} 150L${SIZE + 20} ${150 + 140}` },
  };
  function wavyLine(y, r) {
    // semicircles of radius r, a crest centred on the axis
    const n = 2 * Math.ceil(SIZE / (4 * r)) + 1;
    let d = `M${C - n * r} ${y}`;
    for (let i = 0; i < n; i++) d += `A${r} ${r} 0 0 ${i % 2 ? 0 : 1} ${C - n * r + (i + 1) * 2 * r} ${y}`;
    return d;
  }
  function indentLine(y, a, half) {
    let d = '';
    const n = Math.ceil(SIZE / 2 / half) + 1;
    for (let i = -n; i <= n; i++) d += (i === -n ? 'M' : 'L') + `${C + i * half} ${y + (i % 2 ? a : -a)}`;
    return d;
  }

  /* ---------------------------------------------------------------------------- geometry helpers */
  const RAD = Math.PI / 180;
  const n2 = (x) => Math.round(x * 100) / 100;
  const pt = (x, y) => n2(x) + ' ' + n2(y);
  const polar = (r, deg, cx = 0, cy = 0) => [cx + r * Math.cos(deg * RAD), cy + r * Math.sin(deg * RAD)];
  const circ = (cx, cy, r) => `M${pt(cx - r, cy)}A${r} ${r} 0 1 0 ${pt(cx + r, cy)}A${r} ${r} 0 1 0 ${pt(cx - r, cy)}Z`;
  const poly = (pts, close = true) => pts.map((p, i) => (i ? 'L' : 'M') + pt(p[0], p[1])).join('') + (close ? 'Z' : '');
  const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${pt(x + r, y)}H${n2(x + w - r)}A${r} ${r} 0 0 1 ${pt(x + w, y + r)}V${n2(y + h - r)}A${r} ${r} 0 0 1 ${pt(x + w - r, y + h)}` +
      `H${n2(x + r)}A${r} ${r} 0 0 1 ${pt(x, y + h - r)}V${n2(y + r)}A${r} ${r} 0 0 1 ${pt(x + r, y)}Z`;
  }
  function ell(cx, cy, rx, ry, rot = 0) {
    const [dx, dy] = polar(rx, rot);
    return `M${pt(cx - dx, cy - dy)}A${rx} ${ry} ${rot} 1 0 ${pt(cx + dx, cy + dy)}A${rx} ${ry} ${rot} 1 0 ${pt(cx - dx, cy - dy)}Z`;
  }
  // arc on circle (cx, cy, r) from angle a0 to a1 (degrees, screen coords: 90 = down); clockwise when a1 > a0
  function arc(cx, cy, r, a0, a1, join) {
    const [x0, y0] = polar(r, a0, cx, cy), [x1, y1] = polar(r, a1, cx, cy);
    return `${join ? 'L' : 'M'}${pt(x0, y0)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${pt(x1, y1)}`;
  }
  // lens between p and q, half-width b at the middle (two equal arcs)
  function vesica(p, q, b) {
    const half = Math.hypot(q[0] - p[0], q[1] - p[1]) / 2;
    const r = n2((half * half + b * b) / (2 * b));
    return `M${pt(p[0], p[1])}A${r} ${r} 0 0 1 ${pt(q[0], q[1])}A${r} ${r} 0 0 1 ${pt(p[0], p[1])}Z`;
  }
  // compass-and-ruler teardrop: circle (cx, cy, r) and the two tangents from the tip
  function teardrop(cx, cy, r, tx, ty) {
    const d = Math.hypot(tx - cx, ty - cy), base = Math.atan2(ty - cy, tx - cx) / RAD, phi = Math.acos(r / d) / RAD;
    const a = polar(r, base + phi, cx, cy), b = polar(r, base - phi, cx, cy);
    return `M${pt(tx, ty)}L${pt(a[0], a[1])}A${r} ${r} 0 1 1 ${pt(b[0], b[1])}Z`;
  }
  function starPts(n, R, r, rot = -90, dy = 0) {
    const out = [];
    for (let k = 0; k < 2 * n; k++) { const p = polar(k % 2 ? r : R, rot + k * 180 / n); out.push([p[0], p[1] + dy]); }
    return out;
  }
  // polygon with every corner filleted to radius r
  function roundPoly(pts, r) {
    const n = pts.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const ux = a[0] - p[0], uy = a[1] - p[1], lu = Math.hypot(ux, uy);
      const vx = b[0] - p[0], vy = b[1] - p[1], lv = Math.hypot(vx, vy);
      const ang = Math.acos((ux * vx + uy * vy) / (lu * lv));
      const t = Math.min(r / Math.tan(ang / 2), lu / 2, lv / 2);
      const rr = t * Math.tan(ang / 2);
      const p1 = [p[0] + ux / lu * t, p[1] + uy / lu * t], p2 = [p[0] + vx / lv * t, p[1] + vy / lv * t];
      const sweep = ux * vy - uy * vx < 0 ? 1 : 0;
      d += (i ? 'L' : 'M') + pt(p1[0], p1[1]) + `A${n2(rr)} ${n2(rr)} 0 0 ${sweep} ${pt(p2[0], p2[1])}`;
    }
    return d + 'Z';
  }
  // intersections of two circles (null if none)
  function cc(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d > r1 + r2 || d < Math.abs(r1 - r2) || !d) return null;
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const mx = x1 + a * dx / d, my = y1 + a * dy / d;
    return [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
  }
  const ang = (cx, cy, p) => Math.atan2(p[1] - cy, p[0] - cx) / RAD;

  /* ---------------------------------------------------------------------------- 2. ENCLOSURES (family) */
  // Seven silhouettes, one construction: all centred, optically matched in area, polygon corners filleted
  // with CORNER, curves are compass arcs. Assigned by convention, each with a reason.
  function hexPts(R) { const out = []; for (let k = 0; k < 6; k++) out.push(polar(R, k * 60, C, C)); return out; }
  function quatrefoil(dist, r) {
    const cusp = polar((dist + Math.sqrt(2 * r * r - dist * dist)) / 2 * Math.SQRT2, -45, C, C);
    const k = cusp[0] - C;
    const P = [[C + k, C - k], [C + k, C + k], [C - k, C + k], [C - k, C - k]];
    return `M${pt(P[3][0], P[3][1])}` + P.map((p) => `A${r} ${r} 0 1 1 ${pt(p[0], p[1])}`).join('') + 'Z';
  }
  const ARCH = (hw, top, bot) => `M${C - hw} ${bot - CORNER}V${top + hw}A${hw} ${hw} 0 0 1 ${C + hw} ${top + hw}V${bot - CORNER}` +
    `A${CORNER} ${CORNER} 0 0 1 ${C + hw - CORNER} ${bot}H${C - hw + CORNER}A${CORNER} ${CORNER} 0 0 1 ${C - hw} ${bot - CORNER}Z`;
  const LENS = (h, w) => { const r = n2((h * h + w * w) / (2 * w)); return `M${C} ${C - h}A${r} ${r} 0 0 1 ${C} ${C + h}A${r} ${r} 0 0 1 ${C} ${C - h}Z`; };
  const ENC = [
    { key: 'circle', zh: '圆', d: circ(C, C, 94), top: C - 94, bot: C + 94,
      why: '圆规画出的第一个形：天体、普遍规律、无始无终' },
    { key: 'square', zh: '方', d: roundPoly([[C - 84, C - 84], [C + 84, C - 84], [C + 84, C + 84], [C - 84, C + 84]], CORNER), top: C - 84, bot: C + 84,
      why: '直尺与矩尺：被造出来的东西，砖、板、机器' },
    { key: 'vesica', zh: '叶形', d: LENS(100, 80), top: C - 100, bot: C + 100,
      why: '两圆相交的 vesica：种子、细胞、叶、眼' },
    { key: 'arch', zh: '拱门', d: ARCH(78, C - 94, C + 90), top: C - 94, bot: C + 90,
      why: '门与碑：书院、神殿和墓碑的轮廓' },
    { key: 'hexagon', zh: '六角', d: roundPoly(hexPts(100), CORNER), top: C - 86.6, bot: C + 86.6,
      why: '蜂巢的格：个体拼成群体，每格都和六格相邻' },
    { key: 'lozenge', zh: '菱', d: roundPoly([[C, C - 110], [C + 96, C], [C, C + 110], [C - 96, C]], CORNER), top: C - 110, bot: C + 110,
      why: '菱形：秤的平衡、钱与契约，也是纹章里的菱形盾' },
    { key: 'quatrefoil', zh: '四叶', d: quatrefoil(48, 50), top: C - 98, bot: C + 98,
      why: '哥特窗花的四叶：装饰本身成为形式' },
  ];
  const RING = { key: 'ring', zh: '细环', d: circ(C, C, 92), top: C - 92, bot: C + 92, why: '非学科：没有门类，只有一道细环' };
  const encOf = (key) => ENC.find((e) => e.key === key) || RING;

  /* ---------------------------------------------------------------------------- 3. MORPHEMES (charges) */
  // Each morpheme: key, zh, profile (its meaning written in the 256 attributes), prims (the drawing on a
  // 20 × 20 grid, centre 0,0), flags: simple (legible when small -> may be a secondary), long (may be
  // crossed, 違い), rot (may be set at 45°), box (local bounding box), k (optical size factor).
  // Primitive types: S shape (outline in 阴 / filled in 阳, evenodd holes), L line, B line that thickens
  // in 阳, D dot, F always filled, K knock line (ink in 阴, carved out of a filled 阳 shape), O knock dot.
  const s = (d, tr) => ({ t: 'S', d, tr });
  const l = (d, tr) => ({ t: 'L', d, tr });
  const b = (d, tr) => ({ t: 'B', d, tr });
  const f = (d, tr) => ({ t: 'F', d, tr });
  const k = (d, tr) => ({ t: 'K', d, tr });
  const o = (d, tr) => ({ t: 'O', d, tr });
  const dot = (x, y, r) => ({ t: 'D', d: circ(x, y, r) });
  const seg = (x1, y1, x2, y2) => `M${pt(x1, y1)}L${pt(x2, y2)}`;
  const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]);

  const IDX = new Map(D.attrs.map((a) => [a.zh, a.i]));
  function prof(str) {
    const out = [];
    for (const tok of str.trim().split(/\s+/)) {
      const [name, w] = tok.split(':');
      const i = IDX.get(name);
      if (i != null) out.push([i, w == null ? 1 : +w]);
    }
    return out;
  }

  const M = [];
  function def(key, zh, profile, prims, flags) { M.push(Object.assign({ key, zh, profile: prof(profile), prims }, flags || {})); }

  // --- sky & elements
  def('star', '星', '星辰:1 天空:.6 夜晚:.5 闪耀:.5 光:.3 无限:.3 敬畏:.3 希望:.2',
    [s(poly(starPts(5, 10, 4.1, -90, 0.9)))], { simple: true, tri: true });
  def('crescent', '月', '月亮:1 夜晚:.7 梦境:.4 暗:.3 循环:.3 银色:.3 寂静:.3 神秘:.2', [s(crescent(9.5, 4.4, -2.8, 7.8))], { simple: true });
  def('sun', '日', '太阳:1 光:.7 炽热:.5 金色:.4 黄:.3 希望:.3 生命:.2',
    [s(circ(0, 0, 4.6)), l([0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const p = polar(6.9, a), q = polar(9.8, a); return seg(p[0], p[1], q[0], q[1]); }).join(''))],
    { simple: true });
  def('wave', '波', '海洋:1 水:.8 流动:.5 蓝:.4 湿润:.3 曲线:.3 河流:.3',
    [b([-5.6, 0, 5.6].map((y) => waveLine(-9.5, y, 4, 2.375)).join(''))], { simple: true });
  def('flame', '火', '火:1 炽热:.6 爆发:.4 红:.4 光:.3 力量:.2',
    [s(teardrop(0, 3.2, 6.6, 1.4, -10) + teardrop(0.2, 4.6, 2.8, -0.6, -2.4))], { simple: true, tri: true });
  def('drop', '滴', '雨:.8 湿润:.7 水:.6 血:.5 纯洁:.4 透明:.3',
    [s(teardrop(0, 3.4, 6.4, 0, -10)), k(arc(0, 3.4, 3.9, 110, 165))], { simple: true, tri: true });
  def('cloud', '云', '天空:.8 雨:.7 风:.6 风暴:.5 轻盈:.4 变化:.3',
    [s(cloudPath())], { simple: true, box: [-10, -7, 10, 7] });
  def('cyclone', '气旋', '风暴:1 风:.8 旋转:.8 天空:.5 雨:.4 混沌:.3 力量:.3',
    [s(circ(0, 0, 3.2) + circ(0, 0, 1.3)), b(arc(3.4, 0, 6.6, 180, 300) + arc(-3.4, 0, 6.6, 0, 120))]);
  def('lightning', '闪电', '电:1 迅速:.5 爆发:.5 风暴:.4 脉动:.4 力量:.4 光:.3',
    [s(poly([[1, -10], [-6.5, 1.5], [-1, 1.5], [-3.5, 10], [6.5, -2.5], [1.2, -2.5], [6, -10]]))], { simple: true });
  def('snow', '雪', '雪:1 冰:.8 寒冷:.8 白:.5 晶体:.5 对称:.4 纯洁:.3 寂静:.3',
    [l([0, 60, 120, 180, 240, 300].map((a) => {
      const A = a - 90, p = polar(9.6, A), m = polar(5.4, A), q1 = polar(2.8, A - 60, m[0], m[1]), q2 = polar(2.8, A + 60, m[0], m[1]);
      return seg(0, 0, p[0], p[1]) + seg(m[0], m[1], q1[0], q1[1]) + seg(m[0], m[1], q2[0], q2[1]);
    }).join(''))], { simple: true, rot: true });
  def('mountain', '山', '山岳:1 高耸:.6 石:.5 巨大:.5 恒定:.4 敬畏:.3',
    [s(poly([[-10, 8], [-5, 0], [-3.33, 2.67], [2, -8], [10, 8]])), k(poly([[-0.6, -3.2], [0.9, -1.8], [2.4, -3.4], [3.4, -2.2], [4.4, -3.2]], false))],
    { simple: true, box: [-10, -8, 10, 8] });

  // --- life
  def('leaf', '叶', '植物:.9 绿:.8 春天:.5 生长:.4 森林:.3',
    [s(vesica([-7, 7], [7.4, -7.4], 4.6)), l(seg(-9.6, 9.6, -7, 7)), k(seg(-6.6, 6.6, 4.6, -4.6))], { simple: true, tri: true });
  def('sprout', '芽', '种子:.9 生长:.8 诞生:.6 春天:.5 养育:.5 希望:.4 植物:.4',
    [l(seg(0, 10, 0, -0.6)), s(vesica([0, -0.6], [-8.6, -7], 3.2)), s(vesica([0, -0.6], [8.6, -7], 3.2))], { simple: true });
  def('tree', '松', '森林:1 木:.8 植物:.6 生命:.5 绿:.4 和谐:.3 整体:.3 生长:.3 古老:.2',
    [s(poly([[0, -10], [4.5, -5.5], [2.2, -5.5], [6.7, -1], [4.2, -1], [8.7, 3.5], [-8.7, 3.5], [-4.2, -1], [-6.7, -1], [-2.2, -5.5], [-4.5, -5.5]])),
      l(seg(0, 3.5, 0, 9.6))], { simple: true });
  def('wheat', '穗', '田野:1 种子:.7 食物:.7 黄:.5 植物:.5 养育:.4 金色:.3 生长:.3',
    [l(seg(0, 10, 0, -5)), s(vesica([0, -10.2], [0, -4.4], 1.8))].concat([-4.8, -1, 2.8].flatMap((y) => [
      s(vesica([-0.5, y + 3], [-4.8, y - 1.3], 1.7)), s(vesica([0.5, y + 3], [4.8, y - 1.3], 1.7))])), { long: true, noPale: true });
  def('lotus', '莲', '神圣:.9 觉悟:.8 纯洁:.7 宗教:.6 东方:.5 平静:.5 花朵:.5 神明:.4',
    [s(vesica([0, 7], [0, -10], 3.6)), s(vesica([-0.6, 7.4], [-8.4, -4], 3)), s(vesica([0.6, 7.4], [8.4, -4], 3)),
      s(vesica([-1.2, 8], [-10, 3.6], 2.2)), s(vesica([1.2, 8], [10, 3.6], 2.2))]);
  def('cell', '胞', '生命:.8 微小:.7 诞生:.5 圆润:.4 生长:.4 身体:.3 科学:.3',
    [s(circ(0, 0, 9.4) + circ(2.6, -1.8, 3.6)), dot(2.6, -1.8, 1.3), o(circ(-4.4, 3.8, 1.1)), o(circ(-3.6, -4.6, 0.9)), o(circ(3, 5, 0.9))]);
  def('helix', '螺旋', '生命:1 诞生:.5 变化:.5 生长:.4 科学:.4 微小:.3 连接:.3 复杂:.3',
    [b(helixStrand(1) + helixStrand(-1), 'rotate(45)'), l([-10.4, -6.1, -1.7, 1.7, 6.1, 10.4].map((y) => { const x = Math.abs(4.4 * Math.sin(Math.PI * (y + 13) / 8.67)) - 1.1; return seg(-x, y, x, y); }).join(''), 'rotate(45)')]);
  def('heart', '心', '心脏:1 爱:.8 温柔:.5 慈悲:.4 身体:.3 浪漫:.3',
    [s('M0 8.6L-7.8 0.81A5.52 5.52 0 0 1 0 -6.99A5.52 5.52 0 0 1 7.8 0.81Z')], { simple: true, tri: true, box: [-9.4, -8.6, 9.4, 8.6] });
  def('eye', '目', '眼睛:1 专注:.4 神秘:.3 真:.3 光:.3 美:.2',
    [s('M-10 0A11 11 0 0 1 10 0A11 11 0 0 1 -10 0Z' + circ(0, 0, 4)), dot(0, 0, 1.9)], { simple: true, box: [-10, -6.4, 10, 6.4] });
  def('staff', '蛇杖', '药:.8 身体:.8 疾病:.6 生命:.5 慈悲:.5 血:.4 死亡:.3 心脏:.3',
    [l(seg(0, -10, 0, 10) + seg(-2.2, -10, 2.2, -10)), l('M0 8.2A2.4 2.4 0 0 1 0 3.4A2.4 2.4 0 0 0 0 -1.4A2.4 2.4 0 0 1 0 -6.2L1.6 -7.3'),
      s(ell(3.3, -8.3, 2.2, 1.4, -28))], { long: true, noPale: true, box: [-3, -10, 5.5, 10] });
  def('capsule', '胶囊', '药:1 疾病:.5 微小:.4 容器:.4 苦:.4 圆润:.3 毒:.3',
    [s(rrect(-4.2, -9.6, 8.4, 19.2, 4.2), 'rotate(45)'), f('M-4.2 0V-5.4A4.2 4.2 0 0 1 4.2 -5.4V0Z', 'rotate(45)'), k(seg(-4.2, 0, 4.2, 0), 'rotate(45)')]);
  def('cross', '十字', '药:.6 安心:.6 疾病:.5 慈悲:.5 群体:.4 善:.4 纯洁:.3 白:.3',
    [s(poly([[-3.2, -9.6], [3.2, -9.6], [3.2, -3.2], [9.6, -3.2], [9.6, 3.2], [3.2, 3.2], [3.2, 9.6], [-3.2, 9.6], [-3.2, 3.2], [-9.6, 3.2], [-9.6, -3.2], [-3.2, -3.2]]))],
    { simple: true, rot: true });
  def('neuron', '神经元', '网络:.6 电:.6 脉动:.6 身体:.5 记忆:.5 连接:.5 复杂:.4',
    [s(circ(-2.4, -2.4, 3.4)), dot(-2.4, -2.4, 1.1),
      l(seg(-4.8, -4.8, -7.4, -7.4) + seg(-7.4, -7.4, -7.4, -10) + seg(-7.4, -7.4, -10, -7.4) + seg(-5.8, -2.4, -10, -2.4) + seg(-2.4, -5.8, -2.4, -10) +
        seg(0, 0, 6.4, 6.4) + seg(6.4, 6.4, 9.6, 6.4) + seg(6.4, 6.4, 6.4, 9.6) + seg(3.2, 3.2, 3.2, 6.6)),
      dot(9.6, 6.4, 1.2), dot(6.4, 9.6, 1.2), dot(3.2, 6.6, 1.2)]);

  // --- making
  def('gear', '齿轮', '机械:1 旋转:.6 金属:.6 工具:.6 力量:.5 坚硬:.3 循环:.3', [s(gearPath(8, 9.8, 7.4) + circ(0, 0, 3.2))], { simple: true });
  def('chip', '芯片', '电子:1 数字:.8 现代:.5 机械:.4 微小:.4 方正:.4 理性:.3 秩序:.3',
    [s(rrect(-6.4, -6.4, 12.8, 12.8, 1.4) + rrect(-2.8, -2.8, 5.6, 5.6, 0.6)),
      l([-3.4, 0, 3.4].map((t) => seg(t, -6.4, t, -9.6) + seg(t, 6.4, t, 9.6) + seg(-6.4, t, -9.6, t) + seg(6.4, t, 9.6, t)).join(''))], { rot: true });
  def('network', '网络', '网络:1 连接:.8 聪慧:.6 复杂:.5 知识:.3 数字:.3 未来:.3', netPrims());
  def('crystal', '晶', '晶体:1 对称:.6 坚硬:.5 实心:.4 秩序:.4 实在:.4 方正:.3 宝石:.3',
    [s(poly([0, 1, 2, 3, 4, 5].map((i) => polar(9.8, -90 + 60 * i)))), k(seg(0, 0, 0, 9.8) + seg(0, 0, ...polar(9.8, -30)) + seg(0, 0, ...polar(9.8, 210)))],
    { simple: true, rot: true });
  def('flask', '烧瓶', '容器:.8 变化:.7 科学:.6 烟雾:.5 多彩:.4 爆发:.4 毒:.2',
    [s('M-2.2 -8.6V-3.4L-8.6 7A1.8 1.8 0 0 0 -7 9.6H7A1.8 1.8 0 0 0 8.6 7L2.2 -3.4V-8.6Z'), l(seg(-3.8, -9, 3.8, -9)),
      k(seg(-5.2, 2.6, 5.2, 2.6)), o(circ(-1.6, 5.8, 1.1)), o(circ(2, 6.6, 0.8))]);
  def('valve', '阀', '流动:.9 机械:.7 容器:.6 金属:.5 工具:.4 封闭:.3 开放:.3',
    [s(poly([[-9.6, -4], [0, 1.2], [-9.6, 6.4]]) + poly([[9.6, -4], [0, 1.2], [9.6, 6.4]])), l(seg(0, 1.2, 0, -6.6) + seg(-4.6, -6.6, 4.6, -6.6))],
    { box: [-9.6, -6.6, 9.6, 6.4] });
  def('bridge', '桥', '道路:1 连接:.8 建筑:.5 石:.5 坚硬:.4 沉重:.4 巨大:.3 金属:.3',
    [s('M-10 -4.4H10V8H7.6A7.6 7.6 0 0 0 -7.6 8H-10Z' + circ(-7, -1, 1.5) + circ(7, -1, 1.5)), l(seg(-10, -7.6, 10, -7.6))], { box: [-10, -7.6, 10, 8] });
  def('temple', '殿', '建筑:1 对称:.6 美:.5 石:.5 方正:.5 高耸:.4 城市:.3 家:.3 艺术:.3',
    [s(poly([[0, -9.8], [10, -4.1], [-10, -4.1]])), l(seg(-9, -2, 9, -2) + [-6.6, -2.2, 2.2, 6.6].map((x) => seg(x, -2, x, 6.8)).join('')),
      s(rect(-10, 6.8, 20, 2.8))]);
  def('column', '柱', '古老:.7 传统:.6 石:.6 建筑:.5 西方:.5 高耸:.4 对称:.4 恒定:.4',
    [s(rect(-7, -9.8, 14, 2.6)), s(rect(-4.4, -7.2, 8.8, 14.4)), s(rect(-7, 7.2, 14, 2.6)), k(seg(-1.5, -5.6, -1.5, 5.6) + seg(1.5, -5.6, 1.5, 5.6))]);
  def('city', '城', '城市:1 建筑:.7 现代:.5 高耸:.5 群体:.4 方正:.3',
    [s(rect(-9.5, -1, 6, 10.6) + rect(-3.5, -9.6, 7, 19.2) + rect(3.5, -4.6, 6, 14.2)),
      o(rect(-7.6, 2, 2, 2) + rect(-1, -6.4, 2, 2) + rect(-1, -1.6, 2, 2) + rect(5.6, -1.4, 2, 2) + rect(5.6, 3.4, 2, 2))]);
  def('rocket', '火箭', '上升:.8 飞翔:.7 迅速:.7 未来:.6 载具:.6 天空:.4 火:.3 机械:.3 爆发:.3',
    [s('M0 -10A11 11 0 0 1 3.6 -1V5.2H-3.6V-1A11 11 0 0 1 0 -10Z' + circ(0, -3.2, 1.7), 'rotate(45)'),
      s(poly([[-3.6, 0.8], [-7, 5.2], [-7, 7.8], [-3.6, 5.2]]) + poly([[3.6, 0.8], [7, 5.2], [7, 7.8], [3.6, 5.2]]), 'rotate(45)'),
      l('M-1.8 6.8L0 9.8L1.8 6.8', 'rotate(45)')], { k: 1.12 });
  def('key', '钥匙', '神秘:.7 开放:.7 封闭:.5 工具:.4 金属:.4 安心:.3',
    [s(circ(-4.6, -4.6, 4.4) + circ(-4.6, -4.6, 1.8)), l(seg(-1.5, -1.5, 8.8, 8.8) + seg(6.2, 6.2, 8.4, 4) + seg(3.6, 3.6, 5.6, 1.6))], { simple: true });
  def('sword', '剑', '武器:1 暴力:.6 勇气:.6 冲突:.5 尖锐:.5 金属:.4 力量:.3',
    [s(poly([[0, -10], [1.8, -7.6], [1.8, 3.6], [-1.8, 3.6], [-1.8, -7.6]])), k(seg(0, -6.8, 0, 2.4)), s(rrect(-5.6, 3.6, 11.2, 2, 1)),
      l(seg(0, 5.6, 0, 8)), dot(0, 9, 1.4)], { long: true, noPale: true, box: [-5.6, -10, 5.6, 10.4] });
  def('house', '屋', '家:1 安心:.6 养育:.5 建筑:.4 温柔:.3 封闭:.2',
    [s(poly([[0, -9.6], [9.6, 0], [6.6, 0], [6.6, 9.4], [-6.6, 9.4], [-6.6, 0], [-9.6, 0]]) + rect(-2, 3, 4, 6.4))], { simple: true });
  def('gate', '鸟居', '神圣:.6 仪式:.6 东方:.6 传统:.5 开放:.5 神明:.4 宗教:.4',
    [s(poly([[-10, -9.8], [10, -9.8], [8.8, -7.2], [-8.8, -7.2]])), l(seg(-8, -3.6, 8, -3.6) + seg(0, -7.2, 0, -3.6) + seg(-5.4, -7.2, -5.9, 10) + seg(5.4, -7.2, 5.9, 10))]);

  // --- knowledge & society
  def('book', '书', '知识:1 文字:.7 记忆:.4 故事:.4 觉悟:.3 好奇:.3 养育:.2',
    [s('M0 -5.6A16 16 0 0 0 -10 -8V6A16 16 0 0 1 0 8.6Z'), s('M0 -5.6A16 16 0 0 1 10 -8V6A16 16 0 0 0 0 8.6Z'),
      k(seg(-7.8, -3.4, -2.4, -2.4) + seg(-7.8, 0.4, -2.4, 1.4) + seg(7.8, -3.4, 2.4, -2.4) + seg(7.8, 0.4, 2.4, 1.4))], { simple: true, box: [-10, -8, 10, 8.6] });
  def('nib', '笔尖', '文字:1 故事:.7 想象:.6 艺术:.4 交流:.3 浪漫:.3',
    [s(poly([[0, 10], [-6, 0], [-6, -3], [-3.5, -6.5], [-3.5, -10], [3.5, -10], [3.5, -6.5], [6, -3], [6, 0]]) + circ(0, -1, 1.7)), k(seg(0, 0.7, 0, 8.2))],
    { long: true, noPale: true, box: [-6, -10, 6, 10] });
  def('speech', '言', '交流:1 嘴:.8 异乡:.4 文字:.4 人:.3 规则:.3 群体:.2',
    [s('M-5.6 -8.6H5.6A4 4 0 0 1 9.6 -4.6V0.6A4 4 0 0 1 5.6 4.6H-1.4L-6.4 9.6L-5 4.6H-5.6A4 4 0 0 1 -9.6 0.6V-4.6A4 4 0 0 1 -5.6 -8.6Z'),
      o(circ(-4, -2, 1.25) + circ(0, -2, 1.25) + circ(4, -2, 1.25))], { box: [-9.6, -8.6, 9.6, 9.6] });
  def('broadcast', '广播', '交流:.8 网络:.5 群体:.5 响亮:.5 分散:.4 迅速:.4 连接:.4 真:.3',
    [dot(0, -1.6, 2), l(arc(0, -1.6, 4.8, -40, 40) + arc(0, -1.6, 8.4, -40, 40) + arc(0, -1.6, 4.8, 140, 220) + arc(0, -1.6, 8.4, 140, 220)),
      l('M-3.8 9.8L0 1.4L3.8 9.8')]);
  def('owl', '枭', '聪慧:.8 知识:.7 理性:.6 夜晚:.5 觉悟:.5 好奇:.4 古老:.4 真:.4 神秘:.3',
    [s('M-7.2 2V-9.6L-3.6 -6H3.6L7.2 -9.6V2A7.2 7.6 0 0 1 -7.2 2Z' + circ(-3.3, -2.2, 2.4) + circ(3.3, -2.2, 2.4)),
      dot(-3.3, -2.2, 1), dot(3.3, -2.2, 1), o(poly([[-1, 1], [1, 1], [0, 2.8]])), k('M-2.6 5L0 6.6L2.6 5')]);
  def('hourglass', '沙漏', '时间:1 古老:.5 短暂:.5 沙尘:.5 终结:.4 记忆:.4 变化:.3',
    [s(rrect(-7.6, -10, 15.2, 2.2, 1)), s(rrect(-7.6, 7.8, 15.2, 2.2, 1)), s(poly([[-5.6, -7.8], [5.6, -7.8], [1.1, 0], [5.6, 7.8], [-5.6, 7.8], [-1.1, 0]])),
      o(poly([[-3.6, 7.8], [3.6, 7.8], [0, 4.2]]))]);
  def('ding', '鼎', '古老:.9 地下:.6 碎片:.6 仪式:.5 传统:.5 容器:.4 金属:.4 神秘:.3 骨骼:.3',
    [s('M-8.6 -4.2H8.6A8.6 8 0 0 1 -8.6 -4.2Z'), b('M-6.8 -4.2V-9.4H-3.6V-4.2M3.6 -4.2V-9.4H6.8V-4.2'), l(seg(-9.8, -4.2, 9.8, -4.2)),
      l(seg(-4.6, 2.4, -6, 9.6) + seg(4.6, 2.4, 6, 9.6) + seg(0, 3.8, 0, 9.6)), k(seg(-7.4, -1.2, 7.4, -1.2))]);
  def('scales', '天平', '正义:1 平衡:.9 规则:.5 对称:.4 权威:.3 秩序:.3 理性:.2',
    [l(seg(0, -8, 0, 8) + seg(-8.4, -5.4, 8.4, -5.4) + 'M-10.6 2.2L-8.4 -5.4L-6.2 2.2M10.6 2.2L8.4 -5.4L6.2 2.2'), dot(0, -8.8, 1.5),
      s('M-11 2.2A2.6 2.6 0 0 0 -5.8 2.2Z'), s('M5.8 2.2A2.6 2.6 0 0 0 11 2.2Z'), s(poly([[-3.6, 8], [3.6, 8], [5, 10], [-5, 10]]))], { k: 0.9 });
  def('crown', '冠', '王权:1 权威:.8 骄傲:.5 金色:.5 力量:.4 珍贵:.4',
    [s(poly([[-9, -4], [-4.5, 0], [0, -6.6], [4.5, 0], [9, -4], [7.6, 6.6], [-7.6, 6.6]])), k(seg(-7.4, 3.6, 7.4, 3.6)),
      dot(-9, -5.8, 1.5), dot(0, -8.4, 1.5), dot(9, -5.8, 1.5)], { simple: true, box: [-10, -9.9, 10, 6.6] });
  def('flag', '旗', '群体:.7 自由:.6 冲突:.5 权威:.5 骄傲:.4 风:.3 叛逆:.3',
    [l(seg(-7, -10, -7, 10)), s(poly([[-7, -8.6], [8.6, -8.6], [4.6, -4], [8.6, 0.6], [-7, 0.6]]))], { long: true, box: [-7, -10, 8.6, 10] });
  def('crowd', '群像', '群体:1 人:.7 合作:.5 城市:.4 友谊:.4 平凡:.3 冲突:.2',
    [s(bust(0, -9.6, 1.05)), s(bust(-6.4, -3.2, 1.0)), s(bust(6.4, -3.2, 1.0))], { box: [-10, -9.6, 10, 6] });
  def('figure', '人像', '人:1 个体:.6 好奇:.4 身体:.4 异乡:.4 传统:.3 仪式:.3',
    [s(circ(0, -5.4, 3.8)), s('M-8.4 9.6A8.4 8.4 0 0 1 8.4 9.6Z')]);
  def('psi', 'ψ', '梦境:.7 直觉:.7 记忆:.6 人:.4 神秘:.4 虚幻:.4 疯狂:.4 暗:.2',
    [b(seg(0, -10, 0, 10) + 'M-7 -9.6V-5A7 7 0 0 0 7 -5V-9.6' + seg(-3.6, 10, 3.6, 10))], { noPale: true, box: [-7, -10, 7, 10] });
  def('org', '层级', '秩序:.9 权威:.7 合作:.7 规则:.6 专注:.4 群体:.4 上升:.2',
    [s(rrect(-3.4, -8.8, 6.8, 5.2, 1)), l('M0 -3.6V-0.2M-6.8 3.4V-0.2H6.8V3.4M0 -0.2V3.4'),
      s(rrect(-9.6, 3.4, 5.6, 5.2, 1)), s(rrect(-2.8, 3.4, 5.6, 5.2, 1)), s(rrect(4, 3.4, 5.6, 5.2, 1))], { box: [-9.6, -8.8, 9.6, 8.6] });

  // --- number & value
  def('infinity', '无穷', '无限:1 永恒:.7 循环:.4 对称:.4 理性:.4 数字:.4 真:.3 秩序:.3',
    [b(infinityPath(5.6))], { box: [-9.6, -4, 9.6, 4] });
  def('bell', '钟形', '偶然:.9 数字:.7 曲线:.6 分散:.6 群体:.5 对称:.3 理性:.3',
    [s('M-10 8.6C-4.6 8.6 -4 -8 0 -8C4 -8 4.6 8.6 10 8.6Z'), k(seg(0, -6.4, 0, 8.6) + seg(-3.4, 2, -3.4, 8.6) + seg(3.4, 2, 3.4, 8.6))], { box: [-10, -8, 10, 8.6] });
  def('coin', '钱', '财富:1 金色:.6 珍贵:.5 循环:.4 数字:.3 贪婪:.3 圆润:.3 平衡:.2',
    [s(circ(0, 0, 9.8) + rect(-3.4, -3.4, 6.8, 6.8)), k(circ(0, 0, 7.4))], { simple: true, tri: true });
  def('rising', '升线', '上升:1 财富:.6 偶然:.5 未来:.5 数字:.4 贪婪:.3 迅速:.3 变化:.3',
    [l('M-9.6 -9.6V9.6H9.6'), l('M-6.4 5L-2.4 1L1.2 4.6L5.6 0.2'), s(poly([[9.2, -3.4], [3.6, -1.6], [7.4, 2.2]]))]);
  def('cycle', '循环', '循环:1 绿:.5 纯洁:.4 平衡:.4 生命:.3 整体:.3 未来:.3 变化:.3', cyclePrims());
  def('rings', '三环', '连接:1 合作:.7 和谐:.6 整体:.6 友谊:.5 平衡:.3 爱:.3',
    [b(circ(0, -3.4, 5.6) + circ(-3.6, 2.8, 5.6) + circ(3.6, 2.8, 5.6))], { simple: true });
  def('atom', '原子', '科学:.9 旋转:.6 微小:.5 电:.4 力量:.4 因果:.4 理性:.3 光:.3',
    [dot(0, 0, 2), b(ell(0, 0, 9.8, 3.6, 0) + ell(0, 0, 9.8, 3.6, 60) + ell(0, 0, 9.8, 3.6, 120))]);
  def('spiral', '涡', '旋转:1 循环:.5 无限:.4 曲线:.4 变化:.3 神秘:.3', [b(spiralPath(2.5, 7))], { simple: true });
  def('strata', '地层', '土:.8 石:.8 地下:.7 古老:.6 缓慢:.5 时间:.4 坚硬:.3', strataPrims(), { box: [-9.6, -8.6, 9.6, 8.6] });
  def('globe', '地球', '土:.7 圆润:.6 整体:.5 异乡:.5 巨大:.4 河流:.3 山岳:.3 好奇:.3',
    [s(circ(0, 0, 9.6)), k(ell(0, 0, 4.2, 9.6, 0) + seg(0, -9.6, 0, 9.6) + seg(-9.6, 0, 9.6, 0) + seg(-8.2, -5, 8.2, -5) + seg(-8.2, 5, 8.2, 5))], { simple: true });

  // --- arts
  def('note', '音符', '音乐:1 悦耳:.9 脉动:.4 和谐:.4 节庆:.3 流动:.3',
    [s(ell(-5.2, 6.2, 3.2, 2.3, -25)), s(ell(5.2, 4.2, 3.2, 2.3, -25)), l(seg(-2.3, 5.2, -2.3, -6.6) + seg(8.1, 3.2, 8.1, -8.6)),
      s(poly([[-2.3, -5.6], [8.1, -7.6], [8.1, -10], [-2.3, -8]]))], { box: [-8.4, -10, 8.4, 8.6] });
  def('palette', '调色板', '多彩:.9 艺术:.8 美:.6 鲜艳:.5 手:.5 想象:.4', [s(palettePath())]);
  def('divider', '圆规', '工具:.7 简单:.7 平衡:.5 和谐:.5 秩序:.4 美:.4 对称:.3 理性:.3 手:.3',
    [s(circ(0, -7.4, 2.4) + circ(0, -7.4, 0.9)), l(seg(0, -9.8, 0, -10.4) + seg(-0.9, -5.2, -6.4, 9.8) + seg(0.9, -5.2, 6.4, 9.8)), k(arc(0, -7.4, 11, 72, 108))]);
  def('film', '胶片', '光:.7 故事:.7 虚幻:.6 时间:.5 暗:.5 梦境:.5 现代:.4 眼睛:.4',
    [s(rect(-6.6, -10, 13.2, 20) + rect(-2.6, -6.4, 5.2, 12.8)), o([-7.4, -2.6, 2.2, 7].map((y) => rect(-5.4, y, 1.7, 2.4) + rect(3.7, y, 1.7, 2.4)).join(''))]);
  def('mask', '面具', '故事:.7 对立:.6 冲突:.5 游戏:.5 虚幻:.5 幽默:.4 仪式:.4 嘴:.4',
    [s('M-8.4 -8.6H8.4V-1A8.4 9.6 0 0 1 -8.4 -1Z' + vesica([-6.2, -3.4], [-1.6, -3.4], 1.6) + vesica([1.6, -3.4], [6.2, -3.4], 1.6) +
      'M-4.4 2.4A4.6 4.6 0 0 0 4.4 2.4A6.4 6.4 0 0 1 -4.4 2.4Z')], { box: [-8.4, -8.6, 8.4, 8.6] });
  def('fan', '扇', '轻盈:.8 曲线:.7 美:.6 旋转:.5 流动:.5 风:.4 柔软:.4 东方:.4 身体:.3 脉动:.3',
    [s(arc(0, 4.4, 12, -150, -30) + arc(0, 4.4, 3.6, -30, -150, true) + 'Z'),
      k([-126, -102, -78, -54].map((a) => { const p = polar(3.6, a, 0, 4.4), q = polar(12, a, 0, 4.4); return seg(p[0], p[1], q[0], q[1]); }).join('')),
      l(seg(0, 4.4, 0, 9.6)), dot(0, 4.4, 1.3)], { box: [-10.4, -7.6, 10.4, 9.6] });
  def('wing', '翼', '翅膀:1 飞翔:.9 轻盈:.6 自由:.6 天空:.4 上升:.3',
    [s(rrect(-9.6, -7.6, 19.2, 4.4, 2.2)), s(rrect(-9.6, -1.6, 15.4, 4.4, 2.2)), s(rrect(-9.6, 4.4, 11, 4.4, 2.2))], { simple: true, box: [-9.6, -7.6, 9.6, 8.8] });

  // --- procedural morpheme drawings
  function crescent(r1, cx2, cy2, r2) {
    const I = cc(0, 0, r1, cx2, cy2, r2);
    const th = Math.atan2(cy2, cx2) / RAD;
    let [p1, p2] = I;
    if (((ang(0, 0, p1) - th + 540) % 360) - 180 < 0) [p1, p2] = [p2, p1];
    const span = ((ang(cx2, cy2, p2) - ang(cx2, cy2, p1)) + 360) % 360;
    return `M${pt(p1[0], p1[1])}A${r1} ${r1} 0 1 1 ${pt(p2[0], p2[1])}A${r2} ${r2} 0 ${360 - span > 180 ? 1 : 0} 0 ${pt(p1[0], p1[1])}Z`;
  }
  // one strand of the double helix: three half-waves along y from -13 to 13 (drawn at 45°)
  function helixStrand(sg) {
    const A = 4.6, h = 26 / 3;
    let d = 'M0 -13';
    for (let i = 0; i < 3; i++) {
      const y0 = -13 + i * h, c = n2(4 / 3 * A * sg * (i % 2 ? -1 : 1));
      d += `C${c} ${n2(y0 + 0.18 * h)} ${c} ${n2(y0 + 0.82 * h)} 0 ${n2(y0 + h)}`;
    }
    return d;
  }
  function waveLine(x0, y, n, r) {
    let d = `M${pt(x0, y)}`;
    for (let i = 0; i < n; i++) d += `A${r} ${r} 0 0 ${i % 2 ? 0 : 1} ${pt(x0 + (i + 1) * 2 * r, y)}`;
    return d;
  }
  function cloudPath() {
    const A = [-5.4, 2.2, 4.2], B = [0.4, -1.8, 5.6], Cc = [5.8, 2.6, 3.8];
    const base = 6.4;
    const ab = cc(...A, ...B).sort((p, q) => p[1] - q[1])[0];
    const bc = cc(...B, ...Cc).sort((p, q) => p[1] - q[1])[0];
    return `M${pt(A[0], base)}A${A[2]} ${A[2]} 0 0 1 ${pt(A[0] - A[2], A[1])}` + `A${A[2]} ${A[2]} 0 0 1 ${pt(ab[0], ab[1])}` +
      `A${B[2]} ${B[2]} 0 0 1 ${pt(bc[0], bc[1])}` + `A${Cc[2]} ${Cc[2]} 0 0 1 ${pt(Cc[0] + Cc[2], Cc[1])}` +
      `A${Cc[2]} ${Cc[2]} 0 0 1 ${pt(Cc[0], base)}Z`;
  }
  function gearPath(n, R, r) {
    const p = 360 / n, pts = [];
    for (let i = 0; i < n; i++) {
      const a = -90 + i * p;
      pts.push(polar(r, a - 0.28 * p), polar(R, a - 0.15 * p), polar(R, a + 0.15 * p), polar(r, a + 0.28 * p));
    }
    return poly(pts);
  }
  function netPrims() {
    const L1 = [[-8, -4.6], [-8, 4.6]], L2 = [[0, -7.6], [0, 0], [0, 7.6]], L3 = [[8, -4.6], [8, 4.6]];
    const rN = 2.1;
    let d = '';
    const edge = (p, q) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      d += seg(p[0] + dx / len * rN, p[1] + dy / len * rN, q[0] - dx / len * rN, q[1] - dy / len * rN);
    };
    for (const p of L1) for (const q of L2) edge(p, q);
    for (const p of L2) for (const q of L3) edge(p, q);
    return [l(d), s(L1.concat(L2, L3).map(([x, y]) => circ(x, y, rN)).join(''))];
  }
  function cyclePrims() {
    const out = [];
    const R = 7;
    for (let i = 0; i < 3; i++) {
      const a0 = -90 + i * 120 + 14, a1 = a0 + 76;
      out.push(b(arc(0, 0, R, a0, a1)));
      out.push(s(poly([polar(R, a1 + 22), polar(R + 3, a1), polar(R - 3, a1)])));
    }
    return out;
  }
  function infinityPath(dd) {
    const r = n2(dd * Math.SQRT1_2), t = dd * Math.SQRT1_2 * Math.SQRT1_2;
    return `M0 0L${pt(t, -t)}A${r} ${r} 0 1 1 ${pt(t, t)}L${pt(-t, -t)}A${r} ${r} 0 1 0 ${pt(-t, t)}Z`;
  }
  function spiralPath(g, n) {
    let d = 'M0 0', x = 0;
    for (let i = 1; i <= n; i++) {
      const r = i * g / 2;
      const nx = i % 2 ? (i + 1) / 2 * g : -i / 2 * g;
      d += `A${n2(r)} ${n2(r)} 0 0 1 ${pt(nx, 0)}`;
      x = nx;
    }
    return d;
  }
  function strataPrims() {
    const fx = (y) => -2 + 5 * (y + 8.6) / 17.2;
    let d = seg(-2, -8.6, 3, 8.6);
    for (const y of [-3.6, 1.2]) d += seg(-9.6, y, fx(y), y);
    for (const y of [-1.8, 3]) d += seg(fx(y), y, 9.6, y);
    return [s(rrect(-9.6, -8.6, 19.2, 17.2, 1.2)), k(d)];
  }
  function bust(cx, top, sc) {
    const hr = 2.3 * sc, sr = 3.9 * sc;
    const hy = top + hr, dy = hy + hr + 1.1 * sc + sr;
    return circ(cx, hy, hr) + `M${pt(cx - sr, dy)}A${n2(sr)} ${n2(sr)} 0 0 1 ${pt(cx + sr, dy)}Z`;
  }
  function palettePath() {
    const R = 9.6, notchC = polar(R, 30), p1 = polar(R, 52), p2 = polar(R, 8);
    let d = `M${pt(p1[0], p1[1])}A${R} ${R} 0 1 1 ${pt(p2[0], p2[1])}A3.6 3.6 0 0 0 ${pt(p1[0], p1[1])}Z`;
    void notchC;
    d += circ(2.6, 3.6, 1.9);
    for (const [x, y] of [[-4.8, -4.2], [0.4, -6.4], [5.2, -3.6], [-6, 1.6]]) d += circ(x, y, 1.8);
    return d;
  }

  /* ---------------------------------------------------------------------------- 4. SEMANTICS */
  function norm(v) { let q = 0; for (let i = 0; i < 256; i++) q += v[i] * v[i]; return Math.sqrt(q); }
  // motivation = cosine between the morpheme's profile and the subject vector
  function motive(m, v, nv) {
    let dot = 0, pp = 0;
    for (const [i, w] of m.profile) { dot += w * v[i]; pp += w * w; }
    return pp && nv ? dot / Math.sqrt(pp) / nv : 0;
  }
  const isZero = (v) => { for (let i = 0; i < 256; i++) if (v[i] > 0) return false; return true; };

  // Field divisions: each is motivated by a small set of attributes (weighted mean).
  const DIV = {
    plain: { zh: '不分', p: prof('整体:1 简单:.8 和谐:.6 向心:.6 恒定:.4 永恒:.3 纯洁:.3 圆润:.3'), bias: 0.04, cap: 14 },
    pale: { zh: '竖分', p: prof('对立:1 冲突:.7 分离:.5 平衡:.5 对称:.3'), bias: 0, cap: 7 },
    fess: { zh: '横分', p: prof('土:.8 地下:.8 田野:.7 石:.5 低伏:.6 沉重:.5 古老:.5 静止:.4 秩序:.4 恒定:.3'), bias: 0, cap: 8 },
    wavy: { zh: '波分', p: prof('水:.9 海洋:.8 河流:.7 流动:.8 循环:.5 变化:.5 时间:.4 曲线:.4 柔软:.3'), bias: 0, cap: 8 },
    indented: { zh: '锯齿分', p: prof('迅速:.8 爆发:.8 电:.7 脉动:.6 尖锐:.6 混沌:.5 风暴:.5 力量:.4 偶然:.4'), bias: 0, cap: 7 },
    chevron: { zh: '人字分', p: prof('上升:.9 生长:.7 建筑:.7 高耸:.6 山岳:.6 希望:.5 未来:.5 合作:.4 力量:.3'), bias: 0, cap: 8 },
  };
  // Petra Sancta (1638): tinctures as hatching, so colour survives in monochrome. The base takes the
  // strongest colour attribute of the subject; no colour = argent (blank).
  const TINCT = [
    { key: 'or', zh: '金', how: '点', a: prof('金色:1 黄:.9') },
    { key: 'gules', zh: '红', how: '竖线', a: prof('红:1') },
    { key: 'azure', zh: '蓝', how: '横线', a: prof('蓝:1') },
    { key: 'vert', zh: '绿', how: '右斜线', a: prof('绿:1') },
    { key: 'purpure', zh: '紫', how: '左斜线', a: prof('紫:1') },
    { key: 'sable', zh: '黑', how: '交叉线', a: prof('黑:1 暗:.7') },
  ];
  function tinctureOf(v) {
    let best = null, bs = 0.34;
    for (const t of TINCT) for (const [i, w] of t.a) if (v[i] * w > bs) { bs = v[i] * w; best = t; }
    return best;
  }
  const DIV_KEYS = Object.keys(DIV);
  function divScore(key, v) {
    const p = DIV[key].p;
    let s1 = 0, sw = 0;
    for (const [i, w] of p) { s1 += w * v[i]; sw += w; }
    return (sw ? s1 / sw : 0) + DIV[key].bias;
  }
  const MOD = {
    triple: prof('群体:1 分散:.8 碎片:.5 多彩:.3'),
    crossed: prof('对立:1 冲突:.8'),
  };
  function wmean(p, v) { let s1 = 0, sw = 0; for (const [i, w] of p) { s1 += w * v[i]; sw += w; } return sw ? s1 / sw : 0; }

  // Hungarian algorithm (rows <= cols), minimises total cost. Returns the column for each row.
  function hungarian(cost) {
    const n = cost.length, m = cost[0].length, INF = 1e18;
    const u = new Float64Array(n + 1), v = new Float64Array(m + 1), p = new Int32Array(m + 1), way = new Int32Array(m + 1);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Float64Array(m + 1).fill(INF), used = new Uint8Array(m + 1);
      do {
        used[j0] = 1;
        const i0 = p[j0];
        let delta = INF, j1 = 0;
        for (let j = 1; j <= m; j++) if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const out = new Array(n).fill(-1);
    for (let j = 1; j <= m; j++) if (p[j]) out[p[j] - 1] = j - 1;
    return out;
  }

  // The herald's registry: computed once, then memoised.
  let REG = null;
  function registry() {
    if (REG) return REG;
    const disc = D.words.filter((w) => w.kind === 'discipline');
    const vecs = disc.map((w) => L.toVec(w.r));
    const scores = vecs.map((v) => { const nv = norm(v); return M.map((m) => motive(m, v, nv)); });
    const asg = hungarian(scores.map((row) => row.map((x) => 1 - x)));
    // divisions: capacitated greedy over (discipline, division) pairs, best first
    const pairs = [];
    disc.forEach((w, i) => {
      for (const key of DIV_KEYS) {
        if (key === 'pale' && M[asg[i]].noPale) continue;
        pairs.push([i, key, divScore(key, vecs[i])]);
      }
    });
    pairs.sort((a, b2) => b2[2] - a[2] || a[0] - b2[0]);
    const divOf = new Array(disc.length).fill(null), used = {};
    for (const [i, key] of pairs) {
      if (divOf[i] || (used[key] || 0) >= DIV[key].cap) continue;
      divOf[i] = key;
      used[key] = (used[key] || 0) + 1;
    }
    // thresholds for the inflections, relative to the 48 disciplines
    const quant = (arr, q) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
    const yang = vecs.map((v) => L.axis(v, 'yang'));
    const byName = new Map();
    let first = 0, total = 0;
    disc.forEach((w, i) => {
      const best = scores[i].indexOf(Math.max(...scores[i]));
      if (best === asg[i]) first++;
      total += scores[i][asg[i]];
      byName.set(w.zh, { i, prim: asg[i], div: divOf[i] || 'plain', score: scores[i][asg[i]], best, bestScore: scores[i][best] });
    });
    // who would have liked someone else's charge
    const ceded = [];
    disc.forEach((w, i) => {
      const e = byName.get(w.zh);
      if (e.best !== e.prim) {
        const holder = disc.find((x, j) => asg[j] === e.best);
        ceded.push({ zh: w.zh, wanted: M[e.best].zh, got: M[e.prim].zh, holder: holder ? holder.zh : '' });
      }
    });
    REG = {
      byName, disc, scores,
      yangT: quant(yang, 0.55),
      tripleT: 0.3,
      crossedT: 0.35,
      stats: { n: disc.length, first, avg: total / disc.length, ceded, divCount: used },
    };
    return REG;
  }

  /* ---------------------------------------------------------------------------- 5. BLAZON (specification) */
  const NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const BRISURE = [
    { key: 'dot', zh: '点' }, { key: 'annulet', zh: '环' }, { key: 'lozenge', zh: '菱' }, { key: 'mullet', zh: '星' },
  ];

  function bestOf(v, pool, exclude) {
    const nv = norm(v);
    let best = null, bs = -1;
    for (const m of pool) {
      if (exclude && exclude.has(m.key)) continue;
      const sc = motive(m, v, nv);
      if (sc > bs) { bs = sc; best = m; }
    }
    return best ? { m: best, score: bs } : null;
  }

  // the core: subject -> blazon (a plain object + a sentence). Pure function of (vec, item, course, modifiers).
  function blazonOf(vec, item, course, mods) {
    const reg = registry();
    const isDisc = item && item.kind === 'discipline' && item.f >= 0 && item.f < 7;
    const f = isDisc ? item.f : -1;
    const enc = f >= 0 ? ENC[f] : RING;
    const out = { enclosure: enc.key, family: f, word: item ? item.zh : '' };
    if (!vec || isZero(vec)) {
      out.empty = true;
      out.division = 'plain';
      out.sentence = `${enc.zh} · 空白（无语义）`;
      return out;
    }
    const entry = isDisc ? reg.byName.get(item.zh) : null;
    let prim, pscore;
    if (entry) { prim = M[entry.prim]; pscore = motive(prim, vec, norm(vec)); }
    else { const bo = bestOf(vec, M); prim = bo.m; pscore = bo.score; }
    let division = entry ? entry.div : null;
    if (!division) {
      let bs = -1;
      for (const key of DIV_KEYS) {
        if (key === 'pale' && prim.noPale) continue;
        const sc = divScore(key, vec);
        if (sc > bs) { bs = sc; division = key; }
      }
    }
    out.division = division;
    out.primary = { key: prim.key, zh: prim.zh, score: +pscore.toFixed(3) };
    out.registered = !!entry;
    // inflections (kamon morphology)
    out.count = 1;
    out.crossed = false;
    out.rotate = 0;
    out.tincture = null;
    if (mods) {
      out.tincture = L.axis(vec, 'yang') > reg.yangT ? 'yang' : 'yin';
      if (division === 'plain' && prim.tri && wmean(MOD.triple, vec) > reg.tripleT) out.count = 3;
      if (division !== 'pale' && prim.long && wmean(MOD.crossed, vec) > reg.crossedT) { out.crossed = true; out.count = 2; }
      if (division !== 'pale' && prim.rot && L.axis(vec, 'active') > 0.55) out.rotate = 45;
    }
    out.counterchanged = division === 'pale';
    if (LAYOUT[division].s) {
      const t = tinctureOf(vec);
      out.base = t ? { key: t.key, zh: t.zh, how: t.how } : { key: 'argent', zh: '银', how: '空白' };
    }
    // secondary charge: the strongest simple morpheme on what the primary leaves unexplained
    if (LAYOUT[division].s) {
      const pmax = Math.max(...prim.profile.map((x) => x[1]));
      const res = new Float32Array(vec);
      for (const [i, w] of prim.profile) res[i] *= 1 - w / pmax;
      const bo = bestOf(res, M.filter((m) => m.simple), new Set([prim.key])) || bestOf(vec, M.filter((m) => m.simple), new Set([prim.key]));
      if (bo) out.secondary = { key: bo.m.key, zh: bo.m.zh, score: +bo.score.toFixed(3) };
    }
    // marks of difference
    if (isDisc && course && course.level > 0) {
      out.cadency = { level: course.level, minor: course.minor, bars: Math.floor(course.level / 5), dots: course.level % 5,
        brisure: BRISURE[Math.min(3, Math.floor(course.minor / 25))].key, label: course.label };
    }
    out.sentence = sentence(out);
    return out;
  }

  function chargeWords(bz) {
    let t = bz.primary.zh;
    if (bz.count === 3) t = `三${t}品字`;
    else if (bz.crossed) t = `双${t}交叉`;
    const mods = [];
    if (bz.counterchanged) mods.push('左右换色');
    else if (bz.tincture) mods.push(bz.tincture === 'yang' ? '阳' : '阴');
    if (bz.rotate) mods.push('斜置');
    return t + (mods.length ? '（' + mods.join('·') + '）' : '');
  }
  function sentence(bz) {
    if (bz.impaled) {
      const [A, B] = bz.parties;
      return `左右拼合 · 左：${encOf(A.enclosure).zh}·${chargeWords(A)} · 右：${encOf(B.enclosure).zh}·${chargeWords(B)}`;
    }
    const parts = [encOf(bz.enclosure).zh + (bz.family >= 0 ? '框' : ''), DIV[bz.division].zh, '主纹 ' + chargeWords(bz)];
    if (bz.secondary) parts.push('底' + (bz.base && bz.base.key !== 'argent' ? bz.base.zh : '') + '：' + bz.secondary.zh);
    if (bz.cadency) {
      const c = bz.cadency, br = BRISURE.find((x) => x.key === c.brisure).zh;
      parts.push('课程 ' + (c.bars ? '一横' : '') + (c.dots ? NUM[c.dots] + br : ''));
    }
    return parts.join(' · ');
  }

  // combos: item.parts = [A, B] (strings or {zh, vec}); else the two halves of the label if both are known
  function comboParties(ctx) {
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
      const v = p && p.vec ? p.vec : zh ? L.vec(zh) : null;
      return v ? { zh, vec: v, item: L.item(zh) } : null;
    });
    return out[0] && out[1] ? out : null;
  }

  function blazon(ctx) {
    const opts = (ctx && ctx.opts) || {};
    const mods = opts.modifiers !== false;
    const parties = comboParties(ctx || {});
    if (parties) {
      const P = parties.map((p) => blazonOf(p.vec, p.item, null, mods));
      if (P.every((x) => !x.empty)) {
        const bz = { impaled: true, parties: P, enclosure: 'impaled', family: -1, word: ctx.word || '' };
        bz.sentence = sentence(bz);
        return bz;
      }
    }
    return blazonOf(ctx.vec, ctx.item || { kind: 'word', f: -1 }, ctx.course, mods);
  }

  /* ---------------------------------------------------------------------------- 6. DRAW (rendering) */
  let UID = 0;
  const morph = (key) => M.find((m) => m.key === key);

  // blazon -> placed elements in the 240 × 240 square
  function layout(bz) {
    const plan = { panels: [], lines: [], charges: [], marks: null };
    if (bz.impaled) {
      const [A, B] = bz.parties;
      const eA = encOf(A.enclosure), eB = encOf(B.enclosure);
      plan.panels.push({ enc: eA, half: 'L', solid: A.family >= 0, bz: A }, { enc: eB, half: 'R', solid: B.family >= 0, bz: B });
      plan.lines.push({ d: `M${C} ${Math.min(eA.top, eB.top)}V${Math.max(eA.bot, eB.bot)}`, kind: 'impale' });
      [A, B].forEach((P, i) => {
        plan.charges.push({ m: morph(P.primary.key), x: C + (i ? 46 : -46), y: 122, hs: CH.impaled, rot: P.rotate, tinc: P.tincture, panel: i, role: 'primary', bz: P });
      });
      return plan;
    }
    const enc = encOf(bz.enclosure);
    plan.panels.push({ enc, half: null, solid: bz.family >= 0, bz });
    if (bz.empty) return plan;
    const Lo = LAYOUT[bz.division];
    const m = morph(bz.primary.key);
    const [x, y, hs] = Lo.p;
    const base = { m, tinc: bz.tincture, panel: 0, role: 'primary' };
    if (bz.count === 3) {
      const h = CH.triple, dx = 0.5 * hs, up = 0.46 * hs, dn = 0.42 * hs;
      for (const [ox, oy] of [[0, -up], [-dx, dn], [dx, dn]]) plan.charges.push(Object.assign({}, base, { x: x + ox, y: y + oy, hs: h, rot: bz.rotate, fine: true }));
    } else if (bz.crossed) {
      for (const r of [-45, 45]) plan.charges.push(Object.assign({}, base, { x, y, hs: hs * 0.92, rot: r }));
    } else {
      plan.charges.push(Object.assign({}, base, { x, y, hs, rot: bz.rotate, cc: bz.counterchanged }));
    }
    let sec = null;
    if (bz.secondary && Lo.s) {
      const [sx, sy, sh] = Lo.s;
      sec = { m: morph(bz.secondary.key), x: sx, y: sy, hs: sh, rot: 0, tinc: bz.tincture, panel: 0, role: 'secondary', fine: true };
      plan.charges.push(sec);
    }
    if (Lo.line && bz.base && bz.base.key !== 'argent') {
      plan.base = { d: Lo.line() + `L${SIZE + 40} ${SIZE + 40}L-40 ${SIZE + 40}Z`, tincture: bz.base.key, sec };
    }
    if (bz.cadency) plan.marks = marksOf(bz.cadency);
    // division line; the pale is broken around the charge (and the marks) so nothing is crossed
    if (bz.division === 'pale') {
      const box = m.box || [-10, -10, 10, 10], sc = hs / 10 * (m.k || 1);
      const gaps = [[y + box[1] * sc - 8, y + box[3] * sc + 8]];
      if (plan.marks) gaps.push([MARK.y - 9, MARK.y + 9]);
      gaps.sort((a, b2) => a[0] - b2[0]);
      let d = '', y0 = 0;
      for (const [g0, g1] of gaps) { if (g0 > y0) d += `M${C} ${n2(y0)}V${n2(g0)}`; y0 = g1; }
      d += `M${C} ${n2(y0)}V${SIZE}`;
      plan.lines.push({ d, kind: 'pale', clip: true });
    } else if (Lo.line) plan.lines.push({ d: Lo.line(), kind: bz.division, clip: true });
    return plan;
  }

  function marksOf(c) {
    const items = [];
    for (let i = 0; i < c.bars; i++) items.push({ t: 'bar', w: MARK.bar });
    for (let i = 0; i < c.dots; i++) items.push({ t: c.brisure, w: MARK.r * 2 });
    const total = items.reduce((a, it) => a + it.w, 0) + MARK.gap * 1.6 * (items.length - 1);
    let x = C - total / 2;
    for (const it of items) { it.x = x + it.w / 2; x += it.w + MARK.gap * 1.6; }
    return { items, c };
  }

  // one placed charge -> SVG. mode 'line' | 'solid'; target 'ink' (on the page) | 'cut' (inside a carve mask)
  function drawCharge(S, defs, ch, mode, target, ink, halo) {
    const m = ch.m, sc = ch.hs / 10 * (m.k || 1);
    const w = (ch.fine ? W_FINE : W) * (target === 'cut' ? CUT : 1) / sc;
    if (halo) {
      // the charge's silhouette grown by `halo`: clears hatching around a charge
      const hw = w + halo.w / sc;
      const tr0 = `translate(${n2(ch.x)} ${n2(ch.y)})${ch.rot ? ` rotate(${ch.rot})` : ''} scale(${n2(sc * 1000) / 1000})`;
      const hg = S('g', { transform: tr0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      for (const p of m.prims) {
        if (p.t === 'K' || p.t === 'O') continue;
        const fillIt = p.t === 'S' || p.t === 'D' || p.t === 'F';
        let el = S('path', { d: p.d, fill: fillIt ? halo.color : 'none', stroke: halo.color, 'stroke-width': p.t === 'B' && mode === 'solid' ? hw + w : hw });
        if (p.tr) el = S('g', { transform: p.tr }, [el]);
        hg.appendChild(el);
      }
      return hg;
    }
    const main = target === 'cut' ? '#000' : ink;
    const knockCol = target === 'cut' ? '#fff' : '#000';
    const tr = `translate(${n2(ch.x)} ${n2(ch.y)})${ch.rot ? ` rotate(${ch.rot})` : ''} scale(${n2(sc * 1000) / 1000})`;
    const g = S('g', { transform: tr, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const knocks = [];
    const solid = mode === 'solid';
    for (const p of m.prims) {
      let el, knock = false;
      if (p.t === 'S') el = S('path', { d: p.d, 'fill-rule': 'evenodd', fill: solid ? main : 'none', stroke: main, 'stroke-width': w });
      else if (p.t === 'L') el = S('path', { d: p.d, fill: 'none', stroke: main, 'stroke-width': w });
      else if (p.t === 'B') el = S('path', { d: p.d, fill: 'none', stroke: main, 'stroke-width': solid ? w * 2 : w });
      else if (p.t === 'D') el = S('path', { d: p.d, fill: main });
      else if (p.t === 'F') el = S('path', { d: p.d, fill: main, stroke: main, 'stroke-width': w });
      else if (p.t === 'K') { knock = solid; el = S('path', { d: p.d, fill: 'none', stroke: solid ? knockCol : main, 'stroke-width': w * 0.9 }); }
      else if (p.t === 'O') { knock = solid; el = S('path', { d: p.d, fill: solid ? knockCol : main }); }
      if (!el) continue;
      if (p.tr) el = S('g', { transform: p.tr }, [el]);
      if (knock && target === 'ink') knocks.push(el);
      else g.appendChild(el);
    }
    if (!knocks.length) return g;
    const id = 'gk' + (++UID);
    const mask = S('mask', { id, maskUnits: 'userSpaceOnUse', x: -SIZE, y: -SIZE, width: 3 * SIZE, height: 3 * SIZE });
    mask.appendChild(S('rect', { x: -SIZE, y: -SIZE, width: 3 * SIZE, height: 3 * SIZE, fill: '#fff' }));
    mask.appendChild(S('g', { transform: tr, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, knocks));
    defs.appendChild(mask);
    return S('g', { mask: `url(#${id})` }, [g]);
  }

  function clipFor(S, defs, d) {
    const id = 'gc' + (++UID);
    defs.appendChild(S('clipPath', { id }, [S('path', { d })]));
    return `url(#${id})`;
  }
  const HALF = { L: `M-10 -10H${C}V${SIZE + 10}H-10Z`, R: `M${C} -10H${SIZE + 10}V${SIZE + 10}H${C}Z` };

  function drawMarks(S, parent, marks, fill) {
    const g = S('g', {});
    const y = MARK.y, r = MARK.r;
    for (const it of marks.items) {
      if (it.t === 'bar') g.appendChild(S('rect', { x: n2(it.x - it.w / 2), y: n2(y - MARK.barH / 2), width: it.w, height: MARK.barH, rx: MARK.barH / 2, fill }));
      else if (it.t === 'dot') g.appendChild(S('circle', { cx: n2(it.x), cy: y, r, fill }));
      else if (it.t === 'annulet') g.appendChild(S('circle', { cx: n2(it.x), cy: y, r: r - 0.55, fill: 'none', stroke: fill, 'stroke-width': 1.1 }));
      else if (it.t === 'lozenge') g.appendChild(S('path', { d: poly([[it.x, y - r * 1.25], [it.x + r * 0.95, y], [it.x, y + r * 1.25], [it.x - r * 0.95, y]]), fill }));
      else g.appendChild(S('path', { d: poly(starPts(5, r * 1.35, r * 0.55, -90).map(([px, py]) => [it.x + px, y + py + 0.3])), fill }));
    }
    parent.appendChild(g);
    return g;
  }

  function bind(el, hover, info) {
    if (!hover || !el) return;
    el.style.cursor = 'help';
    el.addEventListener('pointerenter', () => hover(info));
    el.addEventListener('pointerleave', () => hover(null));
  }

  function draw(bz, style, ctx) {
    const S = L.svg;
    const size = ctx.size || 220;
    const colors = ctx.colors || {};
    const ink = colors.ink || '#141922';
    const muted = colors.muted || ink;
    const detail = ctx.mode === 'detail';
    const opts = ctx.opts || {};
    const showText = detail && opts.blazon;
    const hover = detail && typeof ctx.hover === 'function' ? ctx.hover : null;
    const carve = style === 'carve';

    const root = S('svg', { width: size, height: size, viewBox: `0 0 ${SIZE} ${SIZE}`, role: 'img', 'aria-label': `${ctx.word || ''}：${bz.sentence || ''}`, style: 'display:block' });
    const defs = S('defs');
    root.appendChild(defs);
    const g = S('g', showText ? { transform: `translate(${C} 110) scale(0.86) translate(${-C} ${-C})` } : {});
    root.appendChild(g);
    const plan = layout(bz);

    if (bz.empty) {
      const p = plan.panels[0];
      g.appendChild(S('path', { d: p.enc.d, fill: 'none', stroke: muted, 'stroke-width': W_RING, 'stroke-dasharray': '3 6', opacity: 0.6 }));
      g.appendChild(S('circle', { cx: C, cy: C, r: 2.4, fill: muted, opacity: 0.6 }));
    } else if (!carve) {
      paintRule(S, defs, g, plan, ink, hover);
    } else {
      paintCarve(S, defs, g, plan, ink, hover);
    }

    if (showText && bz.sentence) {
      const lines = wrap(bz.sentence, 30);
      const font = "system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', 'WenQuanYi Zen Hei', sans-serif";
      lines.forEach((t, i) => {
        const tx = S('text', { x: C, y: n2(SIZE - 12.5 - (lines.length - 1 - i) * 8.4), 'text-anchor': 'middle', 'font-family': font, 'font-size': 6.3, fill: muted });
        tx.textContent = t;
        root.appendChild(tx);
      });
    }
    return root;
  }

  function wrap(text, max) {
    const parts = text.split(' · ');
    const lines = [];
    let cur = '';
    for (const p of parts) {
      const next = cur ? cur + ' · ' + p : p;
      if (next.length > max && cur) { lines.push(cur); cur = p; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  function hoverInfo(kind, plan, extra) {
    const fam = (f) => (f >= 0 ? D.families[f] : null);
    if (kind === 'frame') {
      const p = extra;
      const fm = fam(p.bz.family);
      return fm ? { title: `门类 · ${fm.zh}（${p.enc.zh}框）`, sub: p.enc.why } : { title: '非学科 · 细环', sub: RING.why };
    }
    if (kind === 'line') return { title: `分区 · ${extra.kind === 'impale' ? '左右拼合' : DIV[extra.kind].zh}`, sub: divWhy(extra.kind) };
    if (kind === 'charge') {
      const ch = extra, m = ch.m, bz = ch.bz || plan.panels[0].bz;
      const top = m.profile.slice().sort((a, b2) => b2[1] - a[1]).slice(0, 4).map(([i]) => D.attrs[i].zh).join('、');
      if (ch.role === 'secondary') return { title: `副纹 · ${m.zh}`, sub: `主纹没解释掉的意义里最强的一个 · 画像：${top}` };
      const reg = bz.registered ? registry().byName.get(bz.word) : null;
      const who = reg ? `登记：${bz.word} 专用` : '非学科：取最佳匹配，可重复';
      return { title: `主纹 · ${m.zh} · 动机 ${bz.primary.score.toFixed(2)}`, sub: `画像：${top} · ${who}` };
    }
    if (kind === 'marks') {
      const c = extra.c;
      return { title: `分家标记 · ${c.label}`, sub: `${c.level} 级：一横 = 5，一点 = 1（玛雅记数）；末两位 ${String(c.minor).padStart(2, '0')} → 标记形状「${BRISURE.find((x) => x.key === c.brisure).zh}」` };
    }
    return null;
  }
  function divWhy(kind) {
    return {
      plain: '不分：整体、简单、和谐占上风', pale: '竖分：对立与冲突，主纹左右换色（counterchange）',
      fess: '横分（直线）：大地、地下、沉稳与秩序，副纹落在底部', wavy: '波分：水、流动、循环与时间', indented: '锯齿分：速度、爆发、电与冲突',
      chevron: '人字分：上升、生长、建筑',
      impale: '交叉学科：纹章的拼合（impalement），左右各取一方',
    }[kind] || '';
  }

  // Petra Sancta hatching as an SVG pattern (one per use)
  function hatchPattern(S, defs, key, color) {
    const id = 'gh' + (++UID), p = HATCH.pitch;
    const rot = { or: 45, vert: 45, purpure: -45 }[key] || 0;
    const pat = S('pattern', { id, patternUnits: 'userSpaceOnUse', width: p, height: p, patternTransform: rot ? `rotate(${rot} ${C} ${C})` : null });
    const ln = (x1, y1, x2, y2) => S('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': HATCH.w });
    if (key === 'or') pat.appendChild(S('circle', { cx: p / 2, cy: p / 2, r: HATCH.w * 0.9, fill: color }));
    if (key === 'azure' || key === 'vert' || key === 'purpure' || key === 'sable') pat.appendChild(ln(-1, p / 2, p + 1, p / 2));
    if (key === 'gules' || key === 'sable') pat.appendChild(ln(p / 2, -1, p / 2, p + 1));
    defs.appendChild(pat);
    return `url(#${id})`;
  }
  // the hatched base: clipped to the enclosure and to the base region, cleared around the secondary charge
  function drawBase(S, defs, parent, plan, color, clearColor, target, ink) {
    const B = plan.base;
    const rectEl = S('rect', { x: -10, y: 0, width: SIZE + 20, height: SIZE + 10, fill: hatchPattern(S, defs, B.tincture, color) });
    let el = S('g', { 'clip-path': clipFor(S, defs, B.d) }, [rectEl]);
    el = S('g', { 'clip-path': clipFor(S, defs, plan.panels[0].enc.d) }, [el]);
    if (B.sec) {
      if (target === 'cut') {
        parent.appendChild(el);
        parent.appendChild(drawCharge(S, defs, B.sec, B.sec.tinc === 'yin' ? 'line' : 'solid', 'cut', ink, { w: HATCH.halo, color: clearColor }));
        return;
      }
      const id = 'gk' + (++UID);
      const mask = S('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: SIZE, height: SIZE });
      mask.appendChild(S('rect', { width: SIZE, height: SIZE, fill: '#fff' }));
      mask.appendChild(drawCharge(S, defs, B.sec, B.sec.tinc === 'yang' ? 'solid' : 'line', 'ink', ink, { w: HATCH.halo, color: '#000' }));
      defs.appendChild(mask);
      el = S('g', { mask: `url(#${id})` }, [el]);
    }
    parent.appendChild(el);
  }

  // 规矩: compass-and-ruler line work, one stroke weight
  function paintRule(S, defs, g, plan, ink, hover) {
    for (const p of plan.panels) {
      const el = S('path', { d: p.enc.d, fill: 'none', stroke: ink, 'stroke-width': p.enc.key === 'ring' ? W_RING : W, 'stroke-linejoin': 'round' });
      const wrapG = p.half ? S('g', { 'clip-path': clipFor(S, defs, HALF[p.half]) }, [el]) : el;
      g.appendChild(wrapG);
      bind(wrapG, hover, hoverInfo('frame', plan, p));
    }
    if (plan.base) drawBase(S, defs, g, plan, ink, null, 'ink', ink);
    for (const ln of plan.lines) {
      const el = S('path', { d: ln.d, fill: 'none', stroke: ink, 'stroke-width': W, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' });
      const wrapG = ln.clip ? S('g', { 'clip-path': clipFor(S, defs, plan.panels[0].enc.d) }, [el]) : el;
      g.appendChild(wrapG);
      bind(wrapG, hover, hoverInfo('line', plan, ln));
    }
    for (const ch of plan.charges) {
      let el;
      if (ch.cc) {
        el = S('g', {}, [
          S('g', { 'clip-path': clipFor(S, defs, HALF.L) }, [drawCharge(S, defs, ch, 'solid', 'ink', ink)]),
          S('g', { 'clip-path': clipFor(S, defs, HALF.R) }, [drawCharge(S, defs, ch, 'line', 'ink', ink)]),
        ]);
      } else el = drawCharge(S, defs, ch, ch.tinc === 'yang' ? 'solid' : 'line', 'ink', ink);
      g.appendChild(el);
      bind(el, hover, hoverInfo('charge', plan, ch));
    }
    if (plan.marks) bind(drawMarks(S, g, plan.marks, ink), hover, hoverInfo('marks', plan, plan.marks));
  }

  // 印刻: the field is a solid seal; division, charges and marks are carved out of it
  function paintCarve(S, defs, g, plan, ink, hover) {
    const id = 'gm' + (++UID);
    const mask = S('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: SIZE, height: SIZE });
    mask.appendChild(S('rect', { width: SIZE, height: SIZE, fill: '#000' }));
    let anySolid = false;
    const cc = plan.charges.find((ch) => ch.cc);
    plan.panels.forEach((p) => {
      if (!p.solid) {
        const el = S('path', { d: p.enc.d, fill: 'none', stroke: ink, 'stroke-width': W_RING, 'stroke-linejoin': 'round' });
        g.appendChild(p.half ? S('g', { 'clip-path': clipFor(S, defs, HALF[p.half]) }, [el]) : el);
        return;
      }
      anySolid = true;
      const half = p.half || (cc ? 'L' : null);
      const el = S('path', { d: p.enc.d, fill: '#fff' });
      mask.appendChild(half ? S('g', { 'clip-path': clipFor(S, defs, HALF[half]) }, [el]) : el);
      if (cc && !p.half) {
        // counterchange: the right half of the field is paper, outlined; the charge there is ink
        const fr = S('path', { d: p.enc.d, fill: 'none', stroke: ink, 'stroke-width': W * CUT, 'stroke-linejoin': 'round' });
        g.appendChild(S('g', { 'clip-path': clipFor(S, defs, HALF.R) }, [fr]));
      }
    });
    if (plan.base && plan.panels[0].solid) drawBase(S, defs, mask, plan, '#000', '#fff', 'cut', ink);
    for (const ln of plan.lines) mask.appendChild(S('path', { d: ln.d, fill: 'none', stroke: '#000', 'stroke-width': W * CUT, 'stroke-linejoin': 'round' }));
    for (const ch of plan.charges) {
      const panel = plan.panels[ch.panel] || plan.panels[0];
      const mode = ch.tinc === 'yin' ? 'line' : 'solid';
      if (!panel.solid) { g.appendChild(drawCharge(S, defs, ch, mode, 'ink', ink)); continue; }
      if (ch.cc) {
        mask.appendChild(S('g', { 'clip-path': clipFor(S, defs, HALF.L) }, [drawCharge(S, defs, ch, 'solid', 'cut', ink)]));
        g.appendChild(S('g', { 'clip-path': clipFor(S, defs, HALF.R) }, [drawCharge(S, defs, ch, 'solid', 'ink', ink)]));
      } else mask.appendChild(drawCharge(S, defs, ch, mode, 'cut', ink));
    }
    if (plan.marks) {
      if (plan.panels[0].solid) drawMarks(S, mask, plan.marks, '#000');
      else drawMarks(S, g, plan.marks, ink);
    }
    if (anySolid) {
      defs.appendChild(mask);
      g.insertBefore(S('rect', { width: SIZE, height: SIZE, fill: ink, mask: `url(#${id})` }), g.firstChild);
    }
    if (hover) {
      // invisible hit areas so the carved version can be read the same way
      plan.panels.forEach((p) => { const h = S('path', { d: p.enc.d, fill: 'none', stroke: 'transparent', 'stroke-width': 14 }); g.appendChild(h); bind(h, hover, hoverInfo('frame', plan, p)); });
      plan.charges.forEach((ch) => {
        const sc = ch.hs;
        const h = S('rect', { x: ch.x - sc, y: ch.y - sc, width: 2 * sc, height: 2 * sc, fill: 'transparent' });
        g.appendChild(h);
        bind(h, hover, hoverInfo('charge', plan, ch));
      });
      if (plan.marks) { const h = S('rect', { x: C - 32, y: MARK.y - 8, width: 64, height: 16, fill: 'transparent' }); g.appendChild(h); bind(h, hover, hoverInfo('marks', plan, plan.marks)); }
    }
  }

  function render(ctx) {
    const opts = ctx.opts || {};
    return draw(blazon(ctx), opts.style === 'carve' ? 'carve' : 'rule', ctx);
  }

  /* ---------------------------------------------------------------------------- 7. REGISTER */
  const reg0 = registry();
  const st = reg0.stats;
  const cededText = st.ceded.slice(0, 4).map((c) => `${c.zh}想要「${c.wanted}」（已归${c.holder}），改用「${c.got}」`).join('；');

  const about = [
    `<p>盾徽、家纹和汉字能代表一个集体，靠的是同一套机制：一张有限的词表，一组组合规则，加上登记。看到一个纹章，懂规则的人能读出它是谁、和谁是一家；纹章官登记保证不重复；纹章术语（blazon）用一句话把纹章完整写下来，谁照着画都算同一个。身份存在于描述里，不在某一张画里。涂尔干说图腾让抽象的氏族变得看得见；前提是图腾属于一个大家共享的系统。</p>`,
    `<p>这里的三层：<b>门类 = 外框</b>，轮廓最先被看到，7 种外框用同一组构造常数画出（圆 理、方 工、叶形 生、拱门 人、六角 社、菱 经、四叶 艺），非学科只有一道细环。<b>学科 = 分区 + 主纹</b>：主纹从 ${M.length} 个语素里选，每个语素有一份用 256 个属性写成的"语义画像"，与学科向量的余弦就是动机分；48 个学科用匈牙利算法一次性全局分配，主纹互不重复，总动机最大（${st.first} 门拿到了自己的第一选择，平均动机 ${st.avg.toFixed(2)}）。<b>课程 = 顶部的分家标记</b>：玛雅记数，一点 = 1，一横 = 5，课号末两位换标记形状（点、环、菱、星）。交叉学科按纹章的拼合（impalement）左右各取一半外框和主纹。</p>`,
    `<p>语法按显著度排成槽位：外框 → 分区（不分 / 竖分 / 横分 / 人字分 / 斜分，由五组属性决定，竖分时主纹左右换色）→ 主纹 → 家纹式词形变化（阴阳：线描或实心，由明暗轴决定；三つ 品字：群体与分散；違い 交叉：对立与冲突；斜置）→ 副纹（主纹没解释掉的剩余意义里最强的简单语素，落在下方的次要区）→ 分家标记。每个纹章先生成 blazon：一个数据对象和一句中文描述；再由渲染器去画。"规矩"是圆规直尺的单线作图，"印刻"是实心刻印、图形镂空；同一句 blazon，两种画法，身份不变。文件顶部的构造常数（24u 网格、0.5u 笔画、允许角度 0/30/45/60/90°、圆弧半径表、0.8u 圆角、各槽位尺寸）就是个人风格所在：换一组常数，就换了一只手。</p>`,
    `<p>长处：可读（先看外框知门类，再看主纹知学科，数顶上的点知年级）、可生成（新学科按同样的规则就有位置）、可组合（拼合），主纹有动机而且由登记保证唯一。问题：语素表是人定的，意义只能在表里挑，表外的就丢了；全局分配意味着有人要让步（${cededText || '无'}）；副纹与课程标记在 48px 下几乎看不清；分区和修饰的阈值是调出来的，不是推出来的。真要用，还需要一位纹章官逐个审定，并把纹章印在课表、证书和毕业典礼上用起来，意义才会长出来。</p>`,
  ].join('');

  L.register({
    id: 'grammar',
    order: 0,
    featured: true,
    name: '纹章语法',
    en: 'Emblem Grammar',
    tagline: '外框定门类，主纹定学科，点横定课程',
    dims: `全部 256 维只用于"选择"：与 ${M.length} 个语素画像算余弦（动机分）后全局分配主纹；5 组属性的加权均值选分区；明暗、动静两条轴和两组属性决定词形变化。`,
    lineage: '前人：欧洲纹章与纹章簿（12 世纪中叶起；blazon 描述与绘制分离；Petra Sancta 1638 年的单色线纹表色法）；日本家纹（平安时代起，圆规直尺作图）；《说文解字》（许慎，公元 100 年）与六书；涂尔干《宗教生活的基本形式》（1912）论图腾是氏族的标志；MIT Media Lab 标识（Pentagram，2014）。',
    about,
    controls: [
      { id: 'style', label: '画法', type: 'select', value: 'rule', options: [{ value: 'rule', label: '规矩 · 单线' }, { value: 'carve', label: '印刻 · 实心' }] },
      { id: 'modifiers', label: '词形变化', type: 'toggle', value: true },
      { id: 'blazon', label: '纹章描述', type: 'toggle', value: true },
    ],
    blazon,
    draw: (bz, style, ctx) => draw(bz, style, ctx || {}),
    morphemes: M.map((m) => ({ key: m.key, zh: m.zh })),
    constants: { SIZE, U, W, W_FINE, W_RING, CUT, CORNER, ANGLES, ARCS, CH, MARK },
    render,
  });
})();
