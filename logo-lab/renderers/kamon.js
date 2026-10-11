// 家紋 Kamon — root + inflection + compass construction.
// A study of why Japanese family crests work as a system: a few hundred base motifs (roots), a small
// morphology of modifiers (enclosure, number, arrangement, 陰 outline, 石持ち knock-out) and one drawing
// discipline (compass and ruler, flat ink, parts separated by hairline gaps). Here: family = enclosure,
// discipline = root motif + modifiers chosen from the semantic vector, course = inner rings + one clock dot.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const TAU = Math.PI * 2, PI = Math.PI;

  /* ================================================================ 2D helpers (y points down) */

  const O = [0, 0];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const pol = (r, a, c) => [(c ? c[0] : 0) + r * Math.cos(a), (c ? c[1] : 0) + r * Math.sin(a)];
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const deg = (d) => d * PI / 180;
  const angOf = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const rightOf = (a, b) => unit([-(b[1] - a[1]), b[0] - a[0]]); // right-hand normal of a->b on screen
  const fx = (x) => { const s = (Math.round(x * 100) / 100).toString(); return s === '-0' ? '0' : s; };

  function ccx(c1, r1, c2, r2) {
    const d = dist(c1, c2);
    if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
    const a = (d * d + r1 * r1 - r2 * r2) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const e = mul(sub(c2, c1), 1 / d), m = add(c1, mul(e, a));
    return [[m[0] - e[1] * h, m[1] + e[0] * h], [m[0] + e[1] * h, m[1] - e[0] * h]];
  }
  function lcx(p, u, c, r) { // line p + t·u (u unit) with circle -> [{t, p}]
    const f = sub(p, c), b = f[0] * u[0] + f[1] * u[1], q = f[0] * f[0] + f[1] * f[1] - r * r, disc = b * b - q;
    if (disc < 0) return [];
    const s = Math.sqrt(disc);
    return [-b - s, -b + s].map((t) => ({ t, p: add(p, mul(u, t)) }));
  }
  function llx(p1, p2, p3, p4) {
    const d1 = sub(p2, p1), d2 = sub(p4, p3), den = cross(d1, d2);
    if (Math.abs(den) < 1e-12) return lerp(p2, p3, 0.5);
    return add(p1, mul(d1, cross(sub(p3, p1), d2) / den));
  }
  const nearestTo = (pts, h) => pts.reduce((b, p) => (!b || dist(p, h) < dist(b, h) ? p : b), null);
  function inset(pts, d) { // offset a convex polygon inward by d
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += cross(pts[i], pts[(i + 1) % n]);
    const s = area > 0 ? 1 : -1;
    const lines = pts.map((a, i) => { const b = pts[(i + 1) % n], q = mul(rightOf(a, b), d * s); return [add(a, q), add(b, q)]; });
    return lines.map((l, i) => { const k = lines[(i - 1 + n) % n]; return llx(k[0], k[1], l[0], l[1]); });
  }

  /* ================================================================ the pen: compass + ruler only */
  // Lines and circular arcs, nothing else. A pen maps local "unit" coordinates (motif radius = 1) to the
  // 100 × 100 viewBox through a similarity (scale, rotation, mirror), so stroke weights stay constant.

  function Pen(g, l, d) {
    this.g = g;
    this.l = l || { s: 1, rot: 0, off: [0, 0], mir: false };
    this.d = d || [];
    this.cur = [0, 0];
    this.gc = Math.cos(g.rot || 0); this.gs = Math.sin(g.rot || 0);
    this.lc = Math.cos(this.l.rot || 0); this.ls = Math.sin(this.l.rot || 0);
    this.flip = !!g.mir !== !!this.l.mir;
    this.k = g.k * (this.l.s || 1);
  }
  Pen.prototype.sub = function (l) { return new Pen(this.g, Object.assign({ s: 1, rot: 0, off: [0, 0], mir: false }, l), this.d); };
  Pen.prototype.map = function (p) {
    const l = this.l, g = this.g;
    const u = l.mir ? -p[0] : p[0], v = p[1];
    let x = l.off[0] + l.s * (u * this.lc - v * this.ls);
    const y = l.off[1] + l.s * (u * this.ls + v * this.lc);
    if (g.mir) x = -x;
    return [g.x + g.k * (x * this.gc - y * this.gs), g.y + g.k * (x * this.gs + y * this.gc)];
  };
  Pen.prototype.M = function (p) { const q = this.map(p); this.d.push('M' + fx(q[0]) + ' ' + fx(q[1])); this.cur = p; return this; };
  Pen.prototype.L = function (p) { const q = this.map(p); this.d.push('L' + fx(q[0]) + ' ' + fx(q[1])); this.cur = p; return this; };
  // arc around centre c to p; dir +1 = increasing angle (clockwise on screen), -1 = decreasing
  Pen.prototype.C = function (c, p, dir) {
    const r = (dist(c, this.cur) + dist(c, p)) / 2;
    const span = norm(dir > 0 ? angOf(c, p) - angOf(c, this.cur) : angOf(c, this.cur) - angOf(c, p));
    let sweep = dir > 0 ? 1 : 0;
    if (this.flip) sweep = 1 - sweep;
    const q = this.map(p), rr = fx(r * this.k);
    this.d.push(`A${rr} ${rr} 0 ${span > PI ? 1 : 0} ${sweep} ${fx(q[0])} ${fx(q[1])}`);
    this.cur = p;
    return this;
  };
  // arc around c to p, going the way that passes the direction of guide point g
  Pen.prototype.Cv = function (c, p, g) {
    const a0 = angOf(c, this.cur);
    return this.C(c, p, norm(angOf(c, g) - a0) < norm(angOf(c, p) - a0) ? 1 : -1);
  };
  // arc to p with radius r, bulging to `side` (+1 = right of travel on screen, -1 = left)
  Pen.prototype.B = function (p, r, side) {
    const a = this.cur, ch = dist(a, p);
    r = Math.max(r, ch / 2 + 1e-6);
    const h = Math.sqrt(r * r - ch * ch / 4);
    const c = add(lerp(a, p, 0.5), mul(rightOf(a, p), -side * h));
    return this.C(c, p, cross(sub(a, c), sub(p, c)) > 0 ? 1 : -1);
  };
  Pen.prototype.Z = function () { this.d.push('Z'); return this; };
  Pen.prototype.circle = function (c, r) {
    return this.M([c[0] + r, c[1]]).C(c, [c[0] - r, c[1]], 1).C(c, [c[0] + r, c[1]], 1).Z();
  };
  Pen.prototype.poly = function (pts) { this.M(pts[0]); for (let i = 1; i < pts.length; i++) this.L(pts[i]); return this.Z(); };
  Pen.prototype.bar = function (a, b, w) {
    const n = mul(rightOf(a, b), w / 2);
    return this.poly([add(a, n), add(b, n), sub(b, n), sub(a, n)]);
  };
  Pen.prototype.rbar = function (a, b, w) {
    const n = mul(rightOf(a, b), w / 2), e = mul(unit(sub(b, a)), w / 2);
    return this.M(add(a, n)).L(add(b, n)).Cv(b, sub(b, n), add(b, e)).L(sub(a, n)).Cv(a, add(a, n), sub(a, e)).Z();
  };
  // symmetric lens between a and b with half-width s (two arcs of one radius)
  Pen.prototype.lens = function (a, b, s) {
    const ch = dist(a, b) / 2, r = (ch * ch + s * s) / (2 * s);
    return this.M(a).B(b, r, 1).B(a, r, 1).Z();
  };
  // annular band around c, radius r, width w, from angle a0 up to a1 (a1 > a0)
  Pen.prototype.band = function (c, r, w, a0, a1, cap) {
    const ro = r + w / 2, ri = r - w / 2;
    this.M(pol(ro, a0, c)).C(c, pol(ro, a1, c), 1);
    if (cap === 'round') this.Cv(pol(r, a1, c), pol(ri, a1, c), add(pol(r, a1, c), pol(w, a1 + PI / 2)));
    else this.L(pol(ri, a1, c));
    this.C(c, pol(ri, a0, c), -1);
    if (cap === 'round') this.Cv(pol(r, a0, c), pol(ro, a0, c), add(pol(r, a0, c), pol(w, a0 - PI / 2)));
    return this.Z();
  };
  // band along the arc from a to b that bulges `sag` to the right of a->b (negative = left)
  Pen.prototype.arcBand = function (a, b, sag, w, cap) {
    const ch = dist(a, b) / 2, s = Math.abs(sag), r = (ch * ch + s * s) / (2 * s);
    const n = rightOf(a, b), c = add(lerp(a, b, 0.5), mul(n, -Math.sign(sag) * (r - s)));
    const top = add(lerp(a, b, 0.5), mul(n, sag));
    let a0 = angOf(c, a), a1 = angOf(c, b);
    if (norm(angOf(c, top) - a0) > norm(a1 - a0)) [a0, a1] = [a1, a0];
    while (a1 < a0) a1 += TAU;
    return this.band(c, r, w, a0, a1, cap);
  };

  /* ================================================================ construction constants = style */

  const C0 = [50, 50];
  const BAND = 4.0;     // enclosure band
  const GAP = 3.0;      // band → motif
  const SW = 1.45;      // 陰 outline weight
  const HALO = 1.3;     // white gap where a front part crosses a back part (違い鷹の羽)
  const UG = 0.065;     // gap between the parts of one motif, in motif units
  const RING = { w: 0.7, p: 1.75, o: 1.3 }; // course rings: weight, pitch, first offset
  const FREE_R = 40;    // motif radius without an enclosure (8% margin + breath)

  /* ================================================================ 1. family → enclosure */
  // Seven frames, all drawn from lines and circles; offsets are exact (lines move, radii grow or shrink),
  // so the inner edge of a band and every course ring are compass constructions too.

  const line = (a, b) => ({ t: 'L', a, b });
  const circ = (c, r, convex) => ({ t: 'C', c, r, convex });
  const polyline = (pts) => pts.map((p, i) => line(p, pts[(i + 1) % pts.length]));

  function sumiiri() { // square with quarter-circle notches at the corners
    const h = 38.5, a = 50 - h, b = 50 + h, r = 9.5;
    const cs = [], hints = [];
    const corners = [[b, a], [b, b], [a, b], [a, a]];
    const sides = [[[a, a], [b, a]], [[b, a], [b, b]], [[b, b], [a, b]], [[a, b], [a, a]]];
    for (let k = 0; k < 4; k++) {
      cs.push(line(sides[k][0], sides[k][1]));
      cs.push(circ(corners[k], r, false));
      const dirIn = unit(sub(sides[k][0], sides[k][1]));
      const nxt = sides[(k + 1) % 4];
      hints.push(add(corners[k], mul(dirIn, r)), add(corners[k], mul(unit(sub(nxt[1], nxt[0])), r)));
    }
    return { cs, hints };
  }
  function yukiwa() { // six flat lobes with round bites between them
    const d = 8, r = 35, nr = 4.8;
    const cs = [], hints = [];
    const cusp = d * Math.cos(PI / 6) + Math.sqrt(r * r - (d * Math.sin(PI / 6)) ** 2);
    for (let k = 0; k < 6; k++) {
      const t = -PI / 2 + k * PI / 3;
      cs.push(circ(pol(d, t, C0), r, true));
      cs.push(circ(pol(cusp, t + PI / 6, C0), nr, false));
      hints.push(pol(cusp - 1, t + PI / 6 - 0.13, C0), pol(cusp - 1, t + PI / 6 + 0.13, C0));
    }
    return { cs, hints };
  }
  function mokko() { // four lobes (木瓜), cusps on the diagonals
    const d = 14, r = 30;
    const cs = [], hints = [];
    for (let k = 0; k < 4; k++) {
      const t = -PI / 2 + k * PI / 2;
      cs.push(circ(pol(d, t, C0), r, true));
      hints.push(pol(42, t + PI / 4, C0));
    }
    return { cs, hints };
  }

  const ENC = [
    { key: 'maru', zh: '丸', why: '圆规的第一笔：天体、轨道、原子，最抽象的形', circle: 42 },
    { key: 'kaku', zh: '角', why: '曲尺画出的方：造出来的东西都从直角开始', cs: polyline([[12, 12], [88, 12], [88, 88], [12, 88]]) },
    { key: 'kikko', zh: '亀甲', why: '龟甲象长寿，六角又是蜂巢与细胞', cs: polyline([[5, 50], [27.5, 11.03], [72.5, 11.03], [95, 50], [72.5, 88.97], [27.5, 88.97]]) },
    Object.assign({ key: 'mokko', zh: '木瓜', why: '木瓜纹出自唐代织物上的“窠纹”，典籍与传统的形' }, mokko()),
    { key: 'hishi', zh: '菱', why: '菱格一格连一格，像织物与篱笆：社会是关系的网', cs: polyline([[50, 3], [97, 50], [50, 97], [3, 50]]) },
    Object.assign({ key: 'sumiiri', zh: '隅入角', why: '四角内收的方，像契据、印章与账册的框' }, sumiiri()),
    Object.assign({ key: 'yukiwa', zh: '雪輪', why: '雪轮是家纹里最装饰性的边框：季节与诗意' }, yukiwa()),
  ];

  function offsetC(c, d) {
    if (c.t === 'L') { const n = mul(rightOf(c.a, c.b), d); return { t: 'L', a: add(c.a, n), b: add(c.b, n) }; }
    return { t: 'C', c: c.c, r: c.convex ? c.r - d : c.r + d, convex: c.convex };
  }
  function meet(a, b, hint) {
    if (a.t === 'L' && b.t === 'L') return llx(a.a, a.b, b.a, b.b);
    if (a.t === 'L') return nearestTo(lcx(a.a, unit(sub(a.b, a.a)), b.c, b.r).map((x) => x.p), hint) || hint;
    if (b.t === 'L') return nearestTo(lcx(b.a, unit(sub(b.b, b.a)), a.c, a.r).map((x) => x.p), hint) || hint;
    return nearestTo(ccx(a.c, a.r, b.c, b.r), hint) || hint;
  }
  const contourCache = new Map();
  function contour(e, delta) {
    const key = e.key + ':' + delta.toFixed(3);
    if (contourCache.has(key)) return contourCache.get(key);
    let ct;
    if (e.circle) ct = { circle: e.circle - delta };
    else {
      if (!e.v0) { const n0 = e.cs.length; e.v0 = e.cs.map((c, i) => meet(c, e.cs[(i + 1) % n0], e.hints ? e.hints[i] : null)); }
      const cs = e.cs.map((c) => offsetC(c, delta)), n = cs.length;
      ct = { cs, verts: cs.map((c, i) => meet(c, cs[(i + 1) % n], e.v0[i])) };
    }
    contourCache.set(key, ct);
    return ct;
  }
  function contourPath(ct) {
    const p = new Pen({ x: 0, y: 0, k: 1, rot: 0 });
    if (ct.circle) return p.circle(C0, ct.circle).d.join('');
    const n = ct.verts.length;
    p.M(ct.verts[n - 1]);
    ct.cs.forEach((c, i) => { if (c.t === 'L') p.L(ct.verts[i]); else p.C(c.c, ct.verts[i], c.convex ? 1 : -1); });
    return p.Z().d.join('');
  }
  function arcSpan(c, a, b, dir) { return norm(dir > 0 ? angOf(c, b) - angOf(c, a) : angOf(c, a) - angOf(c, b)); }
  function rayHit(ct, th) { // farthest point of the contour on the ray from the centre at angle th
    const u = [Math.cos(th), Math.sin(th)];
    if (ct.circle) return pol(ct.circle, th, C0);
    let best = null;
    const n = ct.verts.length;
    ct.cs.forEach((c, i) => {
      const a = ct.verts[(i - 1 + n) % n], b = ct.verts[i];
      if (c.t === 'L') {
        const d = sub(b, a), den = cross(u, d);
        if (Math.abs(den) < 1e-12) return;
        const t = cross(sub(a, C0), d) / den, s = cross(sub(a, C0), u) / den;
        if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9 && (!best || t > best.t)) best = { t, p: add(C0, mul(u, t)) };
      } else {
        const dir = c.convex ? 1 : -1, span = arcSpan(c.c, a, b, dir);
        for (const h of lcx(C0, u, c.c, c.r)) {
          if (h.t <= 0) continue;
          if (arcSpan(c.c, a, h.p, dir) <= span + 1e-9 && (!best || h.t > best.t)) best = h;
        }
      }
    });
    return best ? best.p : C0;
  }
  function perimeter(ct) {
    if (ct.circle) return TAU * ct.circle;
    const n = ct.verts.length;
    let s = 0;
    ct.cs.forEach((c, i) => {
      const a = ct.verts[(i - 1 + n) % n], b = ct.verts[i];
      s += c.t === 'L' ? dist(a, b) : c.r * arcSpan(c.c, a, b, c.convex ? 1 : -1);
    });
    return s;
  }
  const innerCache = new Map();
  function inscribed(e, delta) { // radius of the largest centred circle inside the contour
    const key = e.key + ':' + delta;
    if (!innerCache.has(key)) {
      const ct = contour(e, delta);
      let m = Infinity;
      for (let k = 0; k < 360; k++) m = Math.min(m, dist(C0, rayHit(ct, k * TAU / 360)));
      innerCache.set(key, m);
    }
    return innerCache.get(key);
  }

  /* ================================================================ 2. discipline → root motif */
  // 37 roots, each a drawing in a unit circle plus a semantic profile (weighted attributes = what the
  // picture means). Class decides how number inflects it (the "declension"):
  //   long  (feather, arrow, leaf …): 一つ / 違い (crossed) / 三つ寄せ (three, tails in)
  //   side  (crescent, cloud …):      一つ / 向かい (mirrored pair) / 三つ追い (three chasing)
  //   round (coin, cube, flower …):   一つ / 重ね (overlapped pair) / 三つ盛り (heaped three)
  // A motif may be drawn in several layers; every later layer cuts a hairline halo out of earlier ones.

  const MOTIFS = [];
  const def = (m) => { MOTIFS.push(m); };

  function tomoe(p, phi, h, Th, g) {
    // head circle h tangent to the rim at angle phi; the tail hugs the rim back to phi - Th, its inner edge is
    // the circle that touches the rim at the tail tip and the head (for 2 and 3 tomoe: the next head itself).
    const A = 2 * h / (2 - (1 - h) * (1 + Math.cos(Th))), rho = 1 - A;
    const Ro = 1 - g, rh = h - g, rc = rho + g;
    const H = pol(1 - h, phi), Cc = pol(1 - rho, phi - Th);
    const P = pol(Ro, phi), Q = add(H, mul(unit(sub(Cc, H)), rh));
    const tail = phi - Th;
    const X = ccx(O, Ro, Cc, rc);
    const T = X.length ? X.reduce((b, x) => (norm(angOf(O, x) - tail) < norm(angOf(O, b) - tail) ? x : b)) : pol(Ro, tail);
    p.M(T).C(O, P, 1).Cv(H, Q, add(H, pol(rh, phi + PI / 2)))
      .Cv(Cc, T, add(Cc, mul(unit(sub(pol(1, phi - Th / 2), Cc)), rc))).Z();
  }
  function leafShape(p, T, Y, s, sw, E) { // lens-shaped blade flowing into a stalk
    const c = -T[1] + Y, r = (c * c / 4 + s * s) / (2 * s), cy = (T[1] + Y) / 2;
    const CR = [s - r, cy], CL = [r - s, cy];
    const yj = cy + Math.sqrt(r * r - (sw - CR[0]) ** 2);
    p.M(T).C(CR, [sw, yj], 1).L([sw, E - sw]).Cv([0, E - sw], [-sw, E - sw], [0, E]).L([-sw, yj]).C(CL, T, 1).Z();
    return { CR, CL, r, cy, xr: (y) => CR[0] + Math.sqrt(Math.max(0, r * r - (y - cy) ** 2)), yj };
  }
  const FLAME = (() => {
    const Cb = [0, 0.35], rb = 0.55, tip = [0, -1];
    const cx = ((Cb[1] - tip[1]) ** 2 - rb * rb) / (2 * rb); // circle through the tip, centred level with it, tangent to the base
    const Cr = [cx, -1], Cl = [-cx, -1];
    const JR = add(Cb, mul(unit(sub(Cr, Cb)), rb)), JL = [-JR[0], JR[1]];
    return { Cb, tip, Cr, Cl, JR, JL };
  })();
  function flame(p, off, s, a, hole) {
    const F = FLAME, T = (q) => add(off, rot(mul(q, s), a));
    const draw = (f) => p.M(f(F.tip)).C(f(F.Cr), f(F.JR), -1).Cv(f(F.Cb), f(F.JL), f([0, 1])).C(f(F.Cl), f(F.tip), -1).Z();
    draw(T);
    if (hole) draw((q) => T(add([0, 0.5], mul(sub(q, [0, 0.5]), 0.4))));
  }
  function seigaiha(p, c, rich) {
    const bands = rich ? [[0.46, 0.39], [0.33, 0.26], [0.2, 0.13]] : [[0.46, 0.37], [0.29, 0.2]];
    for (const [ro, ri] of bands) p.band(c, (ro + ri) / 2, ro - ri, PI, TAU, 'butt');
    const k = rich ? 0.07 : 0.12;
    p.M([c[0] - k, c[1]]).C(c, [c[0] + k, c[1]], 1).Z();
  }

  def({ id: 'shippo', zh: '七宝', cn: '四圆相交', cls: 'round', ns: [1, 2, 3],
    prof: '对称3 秩序2 无限2 理性2 和谐2 整体1 连接1 圆润1 数字1 真1 永恒1 珍贵1',
    draw(o) {
      const p = o.pen(), dl = 0.07;
      for (let k = 0; k < 4; k++) {
        const a0 = k * PI / 2 + dl, a1 = (k + 1) * PI / 2 - dl, Q = pol(Math.SQRT2, k * PI / 2 + PI / 4);
        p.M(pol(1, a0)).C(O, pol(1, a1), 1).Cv(Q, pol(1, a0), O).Z();
      }
      if (o.rich) p.circle(O, 0.13);
    } });

  def({ id: 'kuyo', zh: '九曜', cn: '日月五星与罗睺计都', cls: 'round', ns: [1, 3], internal: true,
    prof: '星辰3 分散2 群体2 偶然2 数字2 向心1 天空1 微小1 夜晚1 整体1',
    draw(o) {
      const p = o.pen();
      if (o.n === 3) { for (let k = 0; k < 3; k++) p.circle(pol(0.5, -PI / 2 + k * TAU / 3), 0.4); return; }
      p.circle(O, 0.34);
      if (o.rich) p.circle(O, 0.15);
      for (let k = 0; k < 8; k++) p.circle(pol(0.74, -PI / 2 + k * PI / 4), 0.2);
    } });

  def({ id: 'tsukiboshi', zh: '月星', cn: '新月抱星', cls: 'side', ns: [1, 2, 3],
    prof: '月亮3 星辰3 夜晚2 天空2 神秘1 敬畏1 无限1 光1 好奇1 循环1',
    draw(o) {
      const p = o.pen(), Oc = [-0.06, 0.04], I = [0.3, -0.18];
      const X = ccx(Oc, 0.94, I, 0.78);
      p.M(X[0]).Cv(Oc, X[1], sub(Oc, sub(I, Oc))).Cv(I, X[0], Oc).Z();
      p.circle([0.4, -0.2], 0.19);
    } });

  def({ id: 'hi', zh: '日足', cn: '日轮与光芒', cls: 'round', ns: [1],
    prof: '太阳3 光3 炽热2 闪耀2 黄1 金色1 希望1 上升1 生命1 白1',
    draw(o) {
      const p = o.pen(), N = o.rich ? 16 : 12, hw = o.rich ? 0.1 : 0.13;
      p.circle(O, 0.4);
      for (let k = 0; k < N; k++) {
        const a = -PI / 2 + k * TAU / N, r1 = o.rich && k % 2 ? 0.84 : 1;
        p.poly([pol(0.53, a - hw), pol(r1, a), pol(0.53, a + hw)]);
      }
    } });

  def({ id: 'tomoe', zh: '巴', cn: '勾玉旋转', cls: 'round', ns: [1, 2, 3], internal: true,
    prof: '旋转3 循环2 力量2 对立2 流动1 变化1 脉动1 因果1 时间1',
    draw(o) {
      const p = o.pen(), n = o.n || 3;
      const cfg = n === 1 ? [0.5, 1.3 * PI] : n === 2 ? [0.5, PI] : [0.4641, TAU / 3];
      for (let k = 0; k < n; k++) tomoe(p, -PI / 2 + k * TAU / n, cfg[0], cfg[1], UG / 2);
    } });

  def({ id: 'izutsu', zh: '井筒', cn: '井字框，即 # 号', cls: 'round', ns: [1, 2, 3],
    prof: '数字3 网络2 规则2 方正2 秩序1 直线1 连接1 电子1',
    draw(o) {
      const p = o.pen(), w = 0.21, P = [-0.37, 0.37], E = 0.93;
      const segs = (cuts) => { const out = []; let s = -E; for (const c of cuts) { out.push([s, c - w / 2 - UG]); s = c + w / 2 + UG; } out.push([s, E]); return out; };
      for (let i = 0; i < 2; i++) {
        for (const [a, b] of segs(P.filter((_, j) => (i + j) % 2 === 1))) p.poly([[P[i] - w / 2, a], [P[i] + w / 2, a], [P[i] + w / 2, b], [P[i] - w / 2, b]]);
        for (const [a, b] of segs(P.filter((_, j) => (i + j) % 2 === 0))) p.poly([[a, P[i] - w / 2], [b, P[i] - w / 2], [b, P[i] + w / 2], [a, P[i] + w / 2]]);
      }
    } });

  def({ id: 'haguruma', zh: '歯車', cn: '齿轮', cls: 'round', ns: [1, 2, 3],
    prof: '机械3 旋转2 工具2 金属2 坚硬1 力量1 循环1 载具1',
    draw(o) {
      const p = o.pen(), N = 10, r0 = 0.75, st = TAU / N, hr = st * 0.29, ht = st * 0.19;
      for (let k = 0; k < N; k++) {
        const c = -PI / 2 + k * st;
        if (k === 0) p.M(pol(r0, c - hr)); else p.C(O, pol(r0, c - hr), 1);
        p.L(pol(1, c - ht)).C(O, pol(1, c + ht), 1).L(pol(r0, c + hr));
      }
      p.C(O, pol(r0, -PI / 2 - hr), 1).Z();
      if (o.rich) { p.circle(O, 0.17); for (let k = 0; k < 6; k++) p.circle(pol(0.49, -PI / 2 + k * PI / 3), 0.1); }
      else { p.circle(O, 0.43); p.circle(O, 0.22); }
    } });

  def({ id: 'kessho', zh: '結晶', cn: '立方晶', cls: 'round', ns: [1, 2, 3],
    prof: '晶体3 实在2 坚硬2 实心1 对称1 方正1 金属1 微小1 宝石1 秩序1 科学1',
    draw(o) {
      const p = o.pen(), V = [0, 1, 2, 3, 4, 5].map((k) => pol(1, -PI / 2 + k * PI / 3));
      p.poly(inset([O, V[5], V[0], V[1]], UG / 2));
      p.poly(inset([O, V[3], V[4], V[5]], UG / 2));
      if (!o.rich) p.poly(inset([O, V[1], V[2], V[3]], UG / 2));
      else for (let m = 0; m < 3; m++) {
        const f = (a, b) => add(mul(V[1], a), mul(V[3], b));
        p.poly(inset([f(m / 3, 0), f((m + 1) / 3, 0), f((m + 1) / 3, 1), f(m / 3, 1)], UG / 2));
      }
    } });

  def({ id: 'zeni', zh: '銭', cn: '方孔圆钱', cls: 'round', ns: [1, 2, 3], fit: 0.94,
    prof: '财富3 金色2 珍贵1 贪婪1 数字1 循环1 金属1 圆润1',
    draw(o) {
      const p = o.pen(), q = 0.27;
      p.circle(O, 1);
      if (o.rich) { p.circle(O, 0.85); p.circle(O, 0.78); }
      p.poly([[-q, -q], [q, -q], [q, q], [-q, q]]);
    } });

  def({ id: 'sakura', zh: '桜', cn: '樱花', cls: 'round', ns: [1, 2, 3],
    prof: '花朵3 美3 春天2 短暂2 艺术1 柔软1 浪漫1 鲜艳1 多彩1 东方1',
    draw(o) {
      const p = o.pen();
      for (let k = 0; k < 5; k++) {
        const R = (q) => rot(q, k * TAU / 5);
        p.M(R([0, -0.2])).B(R([-0.22, -0.96]), 0.5, -1).L(R([0, -0.8])).L(R([0.22, -0.96])).B(R([0, -0.2]), 0.5, -1).Z();
      }
      p.circle(O, 0.1);
      if (o.rich) for (let k = 0; k < 5; k++) p.circle(pol(0.3, -PI / 2 + PI / 5 + k * TAU / 5), 0.045);
    } });

  def({ id: 'ha', zh: '葉', cn: '叶', cls: 'long', ns: [1, 2, 3],
    prof: '植物3 绿3 生命2 生长2 森林1 循环1 和谐1 诞生1 春天1',
    draw(o) {
      const p = o.pen();
      leafShape(p, [0, -1], 0.55, 0.34, 0.045, 0.98);
      p.lens([0, -0.82], [0, 0.42], 0.028);
      if (o.rich) for (const y0 of [-0.48, -0.14, 0.2]) for (const sx of [1, -1]) p.lens([sx * 0.07, y0], [sx * 0.2, y0 - 0.17], 0.018);
    } });

  def({ id: 'ami', zh: '網', cn: '节点与连线', cls: 'round', ns: [1],
    prof: '网络3 连接3 复杂1 电1 交流1 群体1 电子1 脉动1 聪慧1',
    draw(o) {
      const p = o.pen(), R = 0.78, rn = 0.14, rc = 0.2, N = 6;
      p.circle(O, rc);
      if (o.rich) p.circle(O, 0.09);
      const cs = [];
      for (let k = 0; k < N; k++) cs.push(pol(R, -PI / 2 + k * TAU / N));
      cs.forEach((c, k) => {
        p.circle(c, rn);
        if (o.rich) p.circle(c, 0.06);
        const a = -PI / 2 + k * TAU / N;
        p.bar(pol(rc + UG, a), pol(R - rn - UG, a), 0.07);
        const d = cs[(k + 1) % N], u = unit(sub(d, c));
        p.bar(add(c, mul(u, rn + UG)), sub(d, mul(u, rn + UG)), 0.06);
      });
    } });

  def({ id: 'hane', zh: '鷹の羽', cn: '鹰羽', cls: 'long', ns: [1, 2, 3],
    prof: '翅膀3 飞翔3 轻盈2 风1 上升1 自由1 天空1 迅速1',
    draw(o) {
      const p = o.pen(), T = [0, -1], Y = 0.5, s = 0.3, sw = 0.035, E = 0.98;
      const c = 1 + Y, r = (c * c / 4 + s * s) / (2 * s), cy = (Y - 1) / 2, CR = [s - r, cy], CL = [r - s, cy];
      const xr = (y) => CR[0] + Math.sqrt(r * r - (y - cy) ** 2);
      const yj = cy + Math.sqrt(r * r - (sw - CR[0]) ** 2);
      const nR = 0.14, nL = -0.18, dn = 0.045;
      p.M(T).C(CR, [xr(nR - dn), nR - dn], 1).L([xr(nR) * 0.4, nR + 0.14]).L([xr(nR + dn), nR + dn]).C(CR, [sw, yj], 1)
        .L([sw, E - sw]).Cv([0, E - sw], [-sw, E - sw], [0, E]).L([-sw, yj])
        .C(CL, [-xr(nL + dn), nL + dn], 1).L([-xr(nL) * 0.4, nL + 0.14]).L([-xr(nL - dn), nL - dn]).C(CL, T, 1).Z();
      p.lens([0, -0.86], [0, 0.4], 0.022);
      if (o.rich) for (const [sx, y] of [[1, -0.5], [1, -0.2], [-1, -0.56], [-1, 0.14]]) p.lens([sx * 0.06, y], [sx * (xr(y - 0.05) - 0.07), y - 0.1], 0.02);
    } });

  def({ id: 'ine', zh: '稲', cn: '稻穗', cls: 'long', ns: [1, 2, 3],
    prof: '田野3 种子3 食物2 植物1 养育1 黄1 生长1 循环1 东方1',
    draw(o) {
      const p = o.pen();
      p.lens([0, -1], [0, -0.66], 0.085);
      p.M([-0.035, -0.6]).L([0.035, -0.6]).L([0.035, 0.925]).Cv([0, 0.925], [-0.035, 0.925], [0, 1]).Z();
      [-0.52, -0.22, 0.08, 0.38].forEach((y, k) => {
        const f = 1 - k * 0.07, l = 0.36 * f, hw = 0.068 * f;
        for (const sx of [1, -1]) { const b = [sx * 0.065, y]; p.lens(b, add(b, [sx * l * 0.574, -l * 0.819]), hw); }
      });
    } });

  def({ id: 'tsue', zh: '蛇杖', cn: '阿斯克勒庇俄斯之杖', cls: 'long', ns: [1],
    prof: '药3 疾病2 身体2 慈悲1 生命1 血1 心脏1 毒1 动物1',
    draw(o) {
      o.pen().rbar([0, -0.97], [0, 0.97], 0.1);
      const p = o.pen(), h = 0.05, c = [[0, -0.5], [0, -0.1], [0, 0.3]];
      p.M([0, -0.7 - h]).Cv(c[0], [0, -0.3 + h], [-1, -0.5]).Cv(c[1], [0, 0.1 - h], [1, -0.1]).Cv(c[2], [0, 0.5 + h], [-1, 0.3])
        .B([0.3, 0.47], 0.6, 1).B([0, 0.5 - h], 0.8, -1)
        .Cv(c[2], [0, 0.1 + h], [-1, 0.3]).Cv(c[1], [0, -0.3 - h], [1, -0.1]).Cv(c[0], [0, -0.7 + h], [-1, -0.5])
        .B([0.36, -0.73], 0.35, 1).B([0, -0.7 - h], 0.35, 1).Z();
      if (o.rich) p.circle([0.2, -0.73], 0.025);
    } });

  def({ id: 'hono', zh: '火焔', cn: '火焰', cls: 'long', ns: [1, 3],
    prof: '火3 炽热2 光2 爆发1 觉悟1 红1 烟雾1 意志1 希望1',
    draw(o) {
      const b = o.pen();
      flame(b, [-0.54, 0.32], 0.5, -0.42, false);
      flame(b, [0.54, 0.32], 0.5, 0.42, false);
      flame(o.pen(), [0, 0], 1, 0, true);
    } });

  def({ id: 'cho', zh: '蝶', cn: '蝴蝶', cls: 'round', ns: [1, 2, 3],
    prof: '梦境2 轻盈2 美2 变化2 飞翔1 短暂1 虚幻1 记忆1 翅膀1 直觉1 想象1',
    draw(o) {
      const p = o.pen();
      p.lens([0, -0.4], [0, 0.6], 0.075);
      p.circle([0, -0.53], 0.085);
      for (const q of [p, p.sub({ mir: true })]) {
        q.M([0.12, -0.07]).B([0.6, -0.88], 0.95, -1).B([0.98, -0.3], 0.48, -1).B([0.12, -0.07], 1.1, -1).Z();
        q.M([0.12, 0.05]).B([0.86, 0.17], 1.2, -1).B([0.42, 0.84], 0.46, -1).B([0.12, 0.05], 0.9, -1).Z();
        if (o.rich) {
          q.circle([0.6, -0.45], 0.1);
          q.circle([0.47, 0.42], 0.07);
          q.rbar([0.05, -0.64], [0.22, -0.86], 0.035);
          q.circle([0.26, -0.92], 0.045);
        }
      }
    } });

  def({ id: 'men', zh: '面', cn: '面具', cls: 'round', ns: [1, 2],
    prof: '故事2 嘴2 仪式2 对立1 游戏1 虚幻1 人1 神秘1 幽默1 传统1',
    draw(o) {
      const p = o.pen(), c = [0, 0.02], FL = [-0.84, 0.2], FR = [0.84, 0.2];
      p.M(FL).Cv(c, FR, [0, -1]).B([0, 0.96], 1.1, -1).B(FL, 1.1, -1).Z();
      const sad = o.k % 2 === 1;
      for (const sx of [1, -1]) p.lens([sx * 0.15, sad ? -0.13 : -0.06], [sx * 0.55, sad ? -0.05 : -0.14], 0.09);
      if (!sad) p.M([-0.4, 0.34]).B([0.4, 0.34], 0.445, 1).B([-0.4, 0.34], 1.04, -1).Z();
      else p.M([-0.4, 0.62]).B([0.4, 0.62], 0.473, -1).B([-0.4, 0.62], 1.18, 1).Z();
      if (o.rich) for (const sx of [1, -1]) p.lens([sx * 0.12, -0.3], [sx * 0.58, sad ? -0.24 : -0.36], 0.025);
    } });

  def({ id: 'kumo', zh: '雲', cn: '云', cls: 'side', ns: [1, 2, 3],
    prof: '天空3 风2 雨2 风暴2 变化1 烟雾1 水1 流动1 轻盈1',
    draw(o) {
      const p = o.pen(), Lc = [-0.46, 0.1], rl = 0.32, Mc = [0.02, -0.14], rm = 0.44, Rc = [0.5, 0.08], rr = 0.3, base = 0.34;
      const top = (ps) => (ps[0][1] < ps[1][1] ? ps[0] : ps[1]);
      const LM = top(ccx(Lc, rl, Mc, rm)), MR = top(ccx(Mc, rm, Rc, rr));
      const BL = [Lc[0] - Math.sqrt(rl * rl - (base - Lc[1]) ** 2), base], BR = [Rc[0] + Math.sqrt(rr * rr - (base - Rc[1]) ** 2), base];
      p.M(BL).Cv(Lc, LM, [-1, Lc[1]]).Cv(Mc, MR, [Mc[0], -1]).Cv(Rc, BR, [1, Rc[1]]).Z();
      p.band(Mc, 0.24, 0.075, deg(150), deg(400), 'round');
      p.band(Lc, 0.15, 0.06, deg(190), deg(420), 'round');
      if (o.rich) p.band(Rc, 0.14, 0.06, deg(160), deg(380), 'round');
    } });

  def({ id: 'me', zh: '目', cn: '眼', cls: 'round', ns: [1],
    prof: '眼睛3 光2 聪慧1 专注1 真1 暗1 想象1 好奇1 梦境1',
    draw(o) {
      const p = o.pen(), R = 1.2, w = 0.13, yc = Math.sqrt(R * R - 1);
      p.M([-1, 0]).B([1, 0], R, -1).B([-1, 0], R, -1).Z();
      const xi = Math.sqrt((R - w) ** 2 - yc * yc);
      p.M([-xi, 0]).C([0, yc], [xi, 0], 1).C([0, -yc], [-xi, 0], 1).Z();
      p.circle(O, 0.31);
      p.circle(O, 0.12);
      if (o.rich) for (const a of [-90, -64, -116, -40, -140]) {
        const s = Math.sin(deg(a)), t = yc * s + Math.sqrt(1 + yc * yc * s * s);
        p.rbar(pol(t + 0.12, deg(a)), pol(t + 0.3, deg(a)), 0.07);
      }
    } });

  def({ id: 'ogi', zh: '扇', cn: '折扇', cls: 'long', ns: [1, 2, 3],
    prof: '风2 曲线2 美2 轻盈1 艺术1 旋转1 节庆1 东方1 权威1 秩序1',
    draw(o) {
      const p = o.pen(), P = [0, 0.88], R1 = 0.82, R2 = 1.62, a0 = deg(-120), a1 = deg(-60);
      if (o.rich) {
        const N = 6, e2 = 0.02 / R2, e1 = 0.02 / R1;
        for (let k = 0; k < N; k++) {
          const b0 = a0 + (a1 - a0) * k / N, b1 = a0 + (a1 - a0) * (k + 1) / N;
          p.M(pol(R2, b0 + e2, P)).C(P, pol(R2, b1 - e2, P), 1).L(pol(R1, b1 - e1, P)).C(P, pol(R1, b0 + e1, P), -1).Z();
        }
      } else p.M(pol(R2, a0, P)).C(P, pol(R2, a1, P), 1).L(pol(R1, a1, P)).C(P, pol(R1, a0, P), -1).Z();
      const NR = o.rich ? 7 : 3, r0 = o.rich ? 0.3 : 0.24;
      for (let k = 0; k < NR; k++) {
        const a = a0 + 0.06 + (a1 - a0 - 0.12) * k / (NR - 1);
        p.bar(pol(r0, a, P), pol(R1 - UG, a, P), o.rich ? 0.035 : 0.07);
      }
      p.circle(P, 0.075);
    } });

  def({ id: 'hisago', zh: '瓢', cn: '葫芦，亦是烧瓶', cls: 'long', ns: [1, 3],
    prof: '容器3 药2 植物1 圆润1 毒1 东方1 传统1 种子1',
    draw(o) {
      const p = o.pen(), Cb = [0, 0.36], Ct = [0, -0.36];
      const X = ccx(Cb, 0.52, Ct, 0.3).sort((a, b) => a[0] - b[0]);
      p.M(X[0]).Cv(Ct, X[1], [0, -1]).Cv(Cb, X[0], [0, 1]).Z();
      p.rbar([0.01, -0.72], [0.06, -0.94], 0.07);
      if (o.rich) { p.bar([-0.22, -0.02], [0.22, -0.02], 0.045); p.lens([0.1, -0.83], [0.35, -0.93], 0.06); }
    } });

  def({ id: 'kasa', zh: '傘', cn: '伞', cls: 'long', ns: [1, 2, 3],
    prof: '安心3 雨2 群体1 慈悲1 养育1 家1 善1 秩序1',
    draw(o) {
      const p = o.pen(), xs = [0.954, 0.477, 0, -0.477, -0.954], y0 = -0.05, hc = [-0.16, 0.62];
      p.M([-0.954, y0]).Cv([0, 0.25], [0.954, y0], [0, -1]);
      for (let i = 1; i < xs.length; i++) p.B([xs[i], y0], 0.36, 1);
      p.Z();
      p.rbar([0, -0.81], [0, -0.96], 0.06);
      p.M([-0.04, 0.03]).L([0.04, 0.03]).L([0.04, 0.62]).Cv(hc, [-0.36, 0.62], [-0.16, 1])
        .Cv([-0.32, 0.62], [-0.28, 0.62], [-0.32, 0.4]).Cv(hc, [-0.04, 0.62], [-0.16, 1]).Z();
      if (o.rich) { p.lens([0, -0.64], [0, -0.13], 0.02); p.lens([-0.1, -0.62], [-0.43, -0.13], 0.02); p.lens([0.1, -0.62], [0.43, -0.13], 0.02); }
    } });

  def({ id: 'tenbin', zh: '天秤', cn: '天平', cls: 'round', ns: [1],
    prof: '正义3 平衡3 规则2 权威1 对称1 真1 秩序1 理性1',
    draw(o) {
      const p = o.pen();
      p.circle([0, -0.72], 0.07);
      p.rbar([-0.82, -0.56], [0.82, -0.56], 0.075);
      p.bar([0, -0.46], [0, 0.7], 0.09);
      p.poly([[-0.14, 0.75], [0.14, 0.75], [0.42, 0.88], [-0.42, 0.88]]);
      for (const sx of [1, -1]) {
        const px = sx * 0.6, cc = [px, -0.24], yr = 0.06, hw = Math.sqrt(0.42 * 0.42 - (yr - cc[1]) ** 2);
        p.M([px - hw, yr]).L([px + hw, yr]).Cv(cc, [px - hw, yr], [px, 1]).Z();
        p.bar([px - 0.03, -0.48], [px - hw + 0.03, yr - 0.03], 0.03);
        p.bar([px + 0.03, -0.48], [px + hw - 0.03, yr - 0.03], 0.03);
      }
    } });

  def({ id: 'torii', zh: '鳥居', cn: '门', cls: 'round', ns: [1],
    prof: '建筑3 神圣2 仪式1 宗教1 方正1 高耸1 传统1 对称1 东方1 开放1',
    draw(o) {
      const p0 = o.pen();
      for (const sx of [1, -1]) p0.poly([[sx * 0.3, -0.5], [sx * 0.41, -0.5], [sx * 0.5, 0.74], [sx * 0.37, 0.74]]);
      const p = o.pen(), e = [0.78, -0.66], m = [0, -0.57];
      const yc = (e[0] * e[0] + e[1] * e[1] - m[1] * m[1]) / (2 * (e[1] - m[1])), C = [0, yc], R = m[1] - yc, t = 0.12;
      const yb = (x) => yc + Math.sqrt((R + t) ** 2 - x * x);
      p.M([-e[0], e[1]]).C(C, e, -1).L([0.69, yb(0.69)]).C(C, [-0.69, yb(0.69)], 1).Z();
      p.poly([[-0.6, -0.26], [0.6, -0.26], [0.6, -0.15], [-0.6, -0.15]]);
      if (o.rich) p.poly([[-0.05, -0.41], [0.05, -0.41], [0.05, -0.3], [-0.05, -0.3]]);
    } });

  def({ id: 'hashi', zh: '橋', cn: '拱桥', cls: 'round', ns: [1],
    prof: '道路3 连接2 建筑2 石2 坚硬1 城市1 沉重1 河流1',
    draw(o) {
      const p = o.pen(), yt = -0.16, yb = 0.52, X = 0.86;
      p.M([-X, yt]).L([X, yt]).L([X, yb]).L([0.72, yb]).Cv([0.56, yb], [0.4, yb], [0.56, 0]).L([0.28, yb])
        .Cv([0, yb], [-0.28, yb], [0, 0]).L([-0.4, yb]).Cv([-0.56, yb], [-0.72, yb], [-0.56, 0]).L([-X, yb]).Z();
      p.rbar([-0.8, -0.32], [0.8, -0.32], 0.06);
      if (o.rich) { p.rbar([-0.56, 0.68], [0.56, 0.68], 0.05); p.rbar([-0.32, 0.8], [0.32, 0.8], 0.05); }
    } });

  def({ id: 'yama', zh: '山', cn: '三峰', cls: 'round', ns: [1],
    prof: '山岳3 土2 石2 高耸2 古老1 巨大1 沉重1 坚硬1 恒定1',
    draw(o) {
      const p0 = o.pen();
      p0.poly([[-0.52, -0.24], [-0.1, 0.46], [-0.88, 0.46]]);
      p0.poly([[0.52, -0.24], [0.88, 0.46], [0.1, 0.46]]);
      const p = o.pen(), A = [0, -0.86], y0 = -0.34, g = UG / 2;
      const ex = (y) => 0.72 * (y + 0.86) / 1.32;
      const z = [[-0.12, y0 + 0.1], [0, y0 - 0.02], [0.12, y0 + 0.1]];
      p.poly([[-ex(y0 + g), y0 + g], ...z.map((q) => [q[0], q[1] + g]), [ex(y0 + g), y0 + g], [0.72, 0.46], [-0.72, 0.46]]);
      p.poly([A, [ex(y0 - g), y0 - g], ...z.slice().reverse().map((q) => [q[0], q[1] - g]), [-ex(y0 - g), y0 - g]]);
    } });

  def({ id: 'hon', zh: '書', cn: '翻开的书', cls: 'round', ns: [1],
    prof: '文字3 知识3 故事2 记忆1 聪慧1 传统1 理性1',
    draw(o) {
      const p = o.pen();
      for (const q of [p, p.sub({ mir: true })]) {
        q.M([-0.05, -0.42]).B([-0.86, -0.54], 1.6, 1).L([-0.86, 0.4]).B([-0.05, 0.52], 1.6, 1).Z();
        if (o.rich) for (const y of [-0.2, 0, 0.2]) q.lens([-0.2, y], [-0.7, y - 0.075], 0.016);
      }
    } });

  def({ id: 'sunadokei', zh: '砂時計', cn: '沙漏', cls: 'round', ns: [1],
    prof: '时间3 短暂2 沙尘2 古老1 永恒1 循环1 终结1 记忆1',
    draw(o) {
      const p = o.pen();
      p.poly([[-0.46, -0.9], [0.46, -0.9], [0.46, -0.78], [-0.46, -0.78]]);
      p.poly([[-0.46, 0.78], [0.46, 0.78], [0.46, 0.9], [-0.46, 0.9]]);
      for (const sx of [1, -1]) p.bar([sx * 0.38, -0.72], [sx * 0.38, 0.72], 0.06);
      p.M([-0.29, -0.7]).L([0.29, -0.7]).B([0.035, -0.05], 0.75, -1).L([-0.035, -0.05]).B([-0.29, -0.7], 0.75, -1).Z();
      p.M([0.29, 0.7]).L([-0.29, 0.7]).B([-0.035, 0.05], 0.75, -1).L([0.035, 0.05]).B([0.29, 0.7], 0.75, -1).Z();
    } });

  def({ id: 'koto', zh: '琴', cn: '竖琴', cls: 'round', ns: [1],
    prof: '音乐3 悦耳3 和谐2 艺术1 脉动1 古老1 流动1',
    draw(o) {
      const p0 = o.pen();
      for (const q of [p0, p0.sub({ mir: true })]) {
        q.arcBand([-0.2, 0.6], [-0.58, -0.72], -0.2, 0.12, 'round');
        if (o.rich) q.circle([-0.64, -0.84], 0.07);
      }
      const p = o.pen();
      p.rbar([-0.64, -0.5], [0.64, -0.5], 0.08);
      p.M([-0.36, 0.5]).L([0.36, 0.5]).B([-0.36, 0.5], 0.366, -1).Z();
      for (const x of [-0.15, -0.05, 0.05, 0.15]) p.bar([x, -0.42], [x, 0.44], 0.035);
    } });

  def({ id: 'inazuma', zh: '稲妻', cn: '闪电', cls: 'long', ns: [1, 2, 3],
    prof: '电3 迅速2 爆发2 风暴1 闪耀1 力量1 尖锐1 电子1',
    draw(o) { o.pen().poly([[0.26, -1], [-0.38, 0.08], [-0.02, 0.08], [-0.26, 1], [0.4, -0.14], [0.04, -0.14]]); } });

  def({ id: 'nami', zh: '青海波', cn: '海浪', cls: 'round', ns: [1],
    prof: '水3 海洋3 流动2 河流1 曲线1 蓝1 循环1 湿润1',
    draw(o) {
      seigaiha(o.pen(), [0, -0.08], o.rich);
      const f = o.pen();
      seigaiha(f, [-0.47, 0.36], o.rich);
      seigaiha(f, [0.47, 0.36], o.rich);
    } });

  def({ id: 'hibiki', zh: '響', cn: '声波', cls: 'round', ns: [1],
    prof: '交流3 响亮2 网络1 群体1 分散1 迅速1 悦耳1 嘴1',
    draw(o) {
      const p = o.pen(), sp = deg(40);
      p.circle(O, 0.15);
      for (const r of [0.38, 0.6, 0.82]) { p.band(O, r, 0.1, -sp, sp, 'round'); p.band(O, r, 0.1, PI - sp, PI + sp, 'round'); }
    } });

  def({ id: 'hito', zh: '人', cn: '人形', cls: 'round', ns: [1, 2, 3],
    prof: '人3 群体2 个体1 家1 友谊1 合作1 身体1',
    draw(o) {
      const p = o.pen();
      p.circle([0, -0.42], 0.26);
      p.M([-0.7, 0.62]).Cv([0, 0.62], [0.7, 0.62], [0, -1]).Z();
    } });

  def({ id: 'kame', zh: '甕', cn: '裂开的陶瓮', cls: 'round', ns: [1],
    prof: '古老2 碎片3 地下2 土1 容器2 沙尘1 时间1 传统1',
    draw(o) {
      const p = o.pen(), Cb = [0, 0.22], rb = 0.6, nw = 0.2, h = UG / 2;
      const yn = Cb[1] - Math.sqrt(rb * rb - nw * nw);
      const z = [[0.03, -0.6], [-0.06, -0.3], [0.07, -0.04], [-0.05, 0.24], [0.06, 0.52], [-0.02, 0.6]];
      const yB = (x) => Cb[1] + Math.sqrt(rb * rb - x * x);
      p.rbar([-0.3, -0.72], [0.3, -0.72], 0.1);
      p.M([-nw, -0.6]);
      z.forEach((q) => p.L([q[0] - h, q[1]]));
      const zb = z[z.length - 1][0];
      p.L([zb - h, yB(zb - h)]).Cv(Cb, [-nw, yn], [-1, Cb[1]]).Z();
      p.M([z[0][0] + h, -0.6]).L([nw, -0.6]).L([nw, yn]).Cv(Cb, [zb + h, yB(zb + h)], [1, Cb[1]]);
      for (let i = z.length - 1; i >= 0; i--) p.L([z[i][0] + h, z[i][1]]);
      p.Z();
    } });

  def({ id: 'ki', zh: '規', cn: '圆规', cls: 'round', ns: [1],
    prof: '工具2 艺术2 简单2 和谐1 平衡1 理性1 想象1 现代1 美1',
    draw(o) {
      const H = [0, -0.6];
      o.pen().band(H, 1.46, 0.07, deg(66), deg(114), 'round');
      for (const t of [[0.5, 0.86], [-0.5, 0.86]]) {
        const n = mul(rightOf(H, t), 0.065);
        o.pen().poly([add(H, n), t, sub(H, n)]);
      }
      const ph = o.pen();
      ph.circle([0, -0.74], 0.14);
      ph.circle([0, -0.74], 0.06);
      ph.rbar([0, -0.93], [0, -0.99], 0.07);
    } });

  def({ id: 'ya', zh: '矢', cn: '箭', cls: 'long', ns: [1, 2, 3],
    prof: '专注3 迅速2 上升2 直线1 尖锐1 武器1 意志1 飞翔1 未来1',
    draw(o) {
      const p = o.pen();
      p.poly([[0, -1], [0.19, -0.58], [0, -0.68], [-0.19, -0.58]]);
      p.bar([0, -0.62], [0, 0.97], 0.07);
      for (const q of [p, p.sub({ mir: true })]) {
        if (o.rich) { q.poly([[0.07, 0.42], [0.22, 0.28], [0.22, 0.5], [0.07, 0.64]]); q.poly([[0.07, 0.7], [0.22, 0.56], [0.22, 0.76], [0.07, 0.9]]); }
        else q.poly([[0.07, 0.42], [0.22, 0.28], [0.22, 0.76], [0.07, 0.9]]);
      }
    } });

  const MBY = new Map(MOTIFS.map((m) => [m.id, m]));

  /* ================================================================ semantics: profiles and assignment */

  const AIDX = new Map(D.attrs.map((a) => [a.zh, a.i]));
  for (const m of MOTIFS) {
    m.p = new Float32Array(256);
    for (const tok of m.prof.split(/\s+/)) {
      const mm = tok.match(/^(.+?)(\d+(?:\.\d+)?)$/);
      const i = mm ? AIDX.get(mm[1]) : undefined;
      if (i != null) m.p[i] = +mm[2];
    }
  }
  const fitOf = (v, m) => L.cosine(v, m.p);
  function whyOf(v, m, n = 3) {
    const out = [];
    for (let i = 0; i < 256; i++) if (v[i] > 0 && m.p[i] > 0) out.push([i, v[i] * m.p[i]]);
    return out.sort((a, b) => b[1] - a[1]).slice(0, n).map(([i]) => D.attrs[i].zh);
  }

  const vsum = (v) => { let s = 0; for (let i = 0; i < 256; i++) s += v[i]; return s; };
  const anyW = (v, list) => { let p = 1; for (const [zh, w] of list) p *= 1 - w * v[AIDX.get(zh)]; return 1 - p; };
  const YIN_T = -0.15, STONE_T = 0.5;
  const NUMS = {
    1: [['个体', 1], ['专注', 1], ['简单', 1], ['向心', 0.8], ['实心', 0.6], ['整体', 0.6]],
    2: [['对立', 1], ['平衡', 0.9], ['冲突', 1], ['友谊', 0.8], ['爱', 0.6], ['交流', 0.5], ['对称', 0.4]],
    3: [['循环', 1], ['旋转', 1], ['群体', 1], ['合作', 0.9], ['和谐', 0.8], ['分散', 0.6], ['复杂', 0.4]],
  };
  // The vector's own preference for number, 陰/陽 and 石持ち.
  function inflection(v) {
    const sn = { 1: 0.3 + 0.5 * anyW(v, NUMS[1]), 2: 0.9 * anyW(v, NUMS[2]), 3: 0.9 * anyW(v, NUMS[3]) };
    const yang = L.axis(v, 'yang'), conc = L.axis(v, 'concrete');
    return { sn, yang, conc, yin: yang < YIN_T, stone: conc > STONE_T };
  }
  function prefN(m, inf) { return m.ns.reduce((b, n) => (inf.sn[n] > inf.sn[b] ? n : b), m.ns[0]); }

  // Min-cost assignment (Hungarian, rows <= columns).
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
        for (let j = 0; j <= m; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const out = new Array(n);
    for (let j = 1; j <= m; j++) if (p[j]) out[p[j] - 1] = j - 1;
    return out;
  }

  // The register (紋帳): every discipline gets a root by global assignment (each root at most twice; a
  // second use costs a little), then modifiers from its vector; a crest (root + number + 陰 + 石持ち) may
  // be held by one discipline only. On a clash the weaker claimant changes the modifier that costs least.
  const SHARE_COST = 0.035;
  const TABLE = (() => {
    const disc = D.words.filter((w) => w.kind === 'discipline').map((w) => ({ zh: w.zh, f: w.f, code: w.code, v: L.toVec(w.r) }));
    const cost = disc.map((d) => {
      const row = [];
      for (const m of MOTIFS) { const f = fitOf(d.v, m); row.push(-f, -f + SHARE_COST); }
      return row;
    });
    const asg = hungarian(cost);
    disc.forEach((d, i) => { d.m = MOTIFS[asg[i] >> 1]; d.fit = fitOf(d.v, d.m); d.inf = inflection(d.v); });
    const taken = new Map();
    const sig = (m, n, yin, stone) => `${m.id}/${n}/${+yin}/${+stone}`;
    for (const d of disc.slice().sort((a, b) => b.fit - a.fit)) {
      const m = d.m, inf = d.inf, n0 = prefN(m, inf);
      const opts = [];
      for (const n of m.ns) for (const yin of [false, true]) for (const stone of [false, true]) {
        let c = 0;
        if (n !== n0) c += inf.sn[n0] - inf.sn[n] + 0.05;
        if (yin !== inf.yin) c += Math.abs(inf.yang - YIN_T) + 0.05;
        if (stone !== inf.stone) c += Math.abs(inf.conc - STONE_T) + 0.05;
        opts.push({ n, yin, stone, c });
      }
      opts.sort((a, b) => a.c - b.c);
      const pick = opts.find((x) => !taken.has(sig(m, x.n, x.yin, x.stone))) || opts[0];
      taken.set(sig(m, pick.n, pick.yin, pick.stone), d.zh);
      Object.assign(d, { n: pick.n, yin: pick.yin, stone: pick.stone, moved: pick.c > 0 });
    }
    return new Map(disc.map((d) => [d.zh, d]));
  })();

  // The crest of any subject: table entry for a known discipline, best root + own modifiers otherwise.
  function specOf(vec, item) {
    const t = item && TABLE.get(item.zh);
    if (t && item.kind === 'discipline') return { m: t.m, n: t.n, yin: t.yin, stone: t.stone, why: whyOf(t.v, t.m), fit: t.fit, table: true };
    if (!vsum(vec)) return null;
    let best = MOTIFS[0], bf = -1;
    for (const m of MOTIFS) { const f = fitOf(vec, m); if (f > bf) { bf = f; best = m; } }
    const inf = inflection(vec);
    return { m: best, n: prefN(best, inf), yin: inf.yin, stone: inf.stone, why: whyOf(vec, best), fit: bf, table: false };
  }

  /* ================================================================ composition: arrangement and layers */

  function arrangement(cls, n) {
    if (n === 2) {
      if (cls === 'long') return [{ x: 0, y: 0, s: 0.97, rot: -0.62 }, { x: 0, y: 0, s: 0.97, rot: 0.62 }];
      if (cls === 'side') return [{ x: -0.42, y: 0, s: 0.6, rot: 0 }, { x: 0.42, y: 0, s: 0.6, rot: 0, mir: true }];
      return [{ x: -0.3, y: -0.3, s: 0.58, rot: 0 }, { x: 0.3, y: 0.3, s: 0.58, rot: 0 }];
    }
    if (n === 3) {
      if (cls === 'long') return [0, 1, 2].map((k) => { const a = k * TAU / 3; return { x: 0.46 * Math.sin(a), y: -0.46 * Math.cos(a), s: 0.54, rot: a }; });
      if (cls === 'side') return [0, 1, 2].map((k) => { const a = -PI / 2 + k * TAU / 3; return { x: 0.46 * Math.cos(a), y: 0.46 * Math.sin(a), s: 0.54, rot: a + PI / 2 }; });
      return [-PI / 2, PI / 6, 5 * PI / 6].map((a) => ({ x: 0.5 * Math.cos(a), y: 0.5 * Math.sin(a), s: 0.5, rot: 0 }));
    }
    return [{ x: 0, y: 0, s: 1, rot: 0 }];
  }

  // Layers (paint order) of one crest's motif inside the circle (cx, cy, R).
  function motifLayers(spec, cx, cy, R, rich) {
    const m = spec.m, out = [];
    const places = m.internal ? [{ x: 0, y: 0, s: 1, rot: 0 }] : arrangement(m.cls, spec.n);
    places.forEach((pl, k) => {
      const g = { x: cx + R * pl.x, y: cy + R * pl.y, k: R * pl.s * (m.fit || 1), rot: pl.rot || 0, mir: !!pl.mir };
      m.draw({ rich, k, n: spec.n, pen: () => { const p = new Pen(g); out.push(p); return p; } });
    });
    return out.map((p) => p.d.join('')).filter(Boolean);
  }

  let UID = 0;
  const uid = () => 'kmn' + (++UID).toString(36);
  const BOX = { x: -20, y: -20, width: 140, height: 140 };

  // Paint layers; every later layer cuts a halo (its own silhouette + HALO) out of all earlier ones.
  function paint(S, defs, layers, color, yin) {
    let g = null;
    for (const d of layers) {
      const el = yin
        ? S('path', { d, fill: 'none', stroke: color, 'stroke-width': SW, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
        : S('path', { d, fill: color, 'fill-rule': 'evenodd' });
      if (!g) { g = S('g', {}, [el]); continue; }
      const id = uid();
      defs.appendChild(S('mask', Object.assign({ id, maskUnits: 'userSpaceOnUse' }, BOX), [
        S('rect', Object.assign({ fill: '#fff' }, BOX)),
        S('path', { d, fill: '#000', stroke: '#000', 'stroke-width': 2 * HALO + (yin ? SW : 0), 'stroke-linejoin': 'round' }),
      ]));
      g = S('g', {}, [S('g', { mask: `url(#${id})` }, [g]), el]);
    }
    return g || S('g', {});
  }

  // A motif with its 陰 / 石持ち treatment, centred in the circle (cx, cy, R).
  function crest(S, defs, spec, cx, cy, R, rich, ink, yin) {
    if (!spec.stone) return paint(S, defs, motifLayers(spec, cx, cy, R, rich), ink, yin);
    const id = uid();
    defs.appendChild(S('mask', Object.assign({ id, maskUnits: 'userSpaceOnUse' }, BOX), [
      S('rect', Object.assign({ fill: '#fff' }, BOX)),
      paint(S, defs, motifLayers(spec, cx, cy, R * 0.72, rich), '#000', yin),
    ]));
    return S('circle', { cx, cy, r: R, fill: ink, mask: `url(#${id})` });
  }

  /* ================================================================ naming (the blazon) */

  const NUM_NAME = { long: ['', '違い', '三つ寄せ'], side: ['', '向かい', '三つ追い'], round: ['', '重ね', '三つ盛り'] };
  function crestName(spec, fam) {
    if (!spec) return '';
    const m = spec.m;
    let core = m.zh;
    if (m.id === 'tomoe') core = ['一つ', '二つ', '三つ'][spec.n - 1] + '巴';
    else if (m.id === 'kuyo') core = spec.n === 3 ? '三つ星' : '九曜';
    else core = NUM_NAME[m.cls][spec.n - 1] + core;
    const pre = (spec.stone ? '石持ち' : '') + (spec.yin ? '陰' : '');
    return (fam >= 0 ? ENC[fam].zh + 'に' : '') + pre + core;
  }
  function modText(spec) {
    const m = spec.m;
    const nTxt = m.internal ? (m.id === 'tomoe' ? spec.n + ' 个巴' : spec.n === 3 ? '三星' : '九曜')
      : { 1: '一つ（单个）', 2: { long: '違い（交叉）', side: '向かい（相对）', round: '重ね（叠放）' }[m.cls], 3: { long: '三つ寄せ（三枚尾相聚）', side: '三つ追い（三个相逐）', round: '三つ盛り（三个堆叠）' }[m.cls] }[spec.n];
    return `${nTxt}${spec.yin ? ' · 陰（只描轮廓）' : ''}${spec.stone ? ' · 石持ち（反白在圆盘里）' : ''}`;
  }

  /* ================================================================ render */

  function comboParts(ctx) {
    const item = ctx.item || {};
    if (item.kind !== 'combo') return null;
    let names = Array.isArray(item.parts) && item.parts.length === 2 ? item.parts : null;
    if (!names) { const bits = String(item.zh || ctx.word || '').split(/\s*[+×]\s*/); if (bits.length === 2) names = bits; }
    if (!names) return null;
    const out = names.map((p) => {
      const zh = typeof p === 'string' ? p : p && (p.zh || p.word);
      const v = p && p.vec ? p.vec : zh ? L.vec(zh) : null;
      if (!v) return null;
      const it = L.item(zh);
      return { zh, item: it, spec: specOf(v, it) };
    });
    return out[0] && out[1] && out[0].spec && out[1].spec ? out : null;
  }

  function bindHover(el, hover, info) {
    if (!hover) return;
    el.style.cursor = 'help';
    el.addEventListener('pointerenter', () => hover(info));
    el.addEventListener('pointerleave', () => hover(null));
  }

  function render(ctx) {
    const S = ctx.lab.svg;
    const size = ctx.size;
    const colors = ctx.colors || {};
    const ink = colors.ink || '#141922';
    const opts = ctx.opts || {};
    const detail = ctx.mode === 'detail';
    const hover = detail && typeof ctx.hover === 'function' ? ctx.hover : null;
    const item = ctx.item || { kind: 'word', f: -1 };
    const vec = ctx.vec || new Float32Array(256);
    const rich = opts.detail === 'rich' || (opts.detail !== 'simple' && size >= 160);
    const fam = item.kind === 'discipline' && item.f >= 0 && item.f < ENC.length ? item.f : -1;
    const frameOn = opts.frame !== false && fam >= 0;
    const course = item.kind === 'discipline' ? ctx.course : null;
    const parts = comboParts(ctx);
    const spec = parts ? null : specOf(vec, item);
    const yinOf = (s) => (opts.yinyang === 'yang' ? false : opts.yinyang === 'yin' ? true : s.yin);
    const name = parts ? `比翼 ${crestName(parts[0].spec, -1)} · ${crestName(parts[1].spec, -1)}` : crestName(spec, frameOn ? fam : -1);

    const root = S('svg', { width: size, height: size, viewBox: '0 0 100 100', role: 'img', 'aria-label': `${ctx.word || ''} ${name}`, style: 'display:block;overflow:visible' });
    const defs = S('defs', {});
    root.appendChild(defs);

    if (!spec && !parts) { // all-zero vector: a faint thread ring, nothing to inflect
      root.appendChild(S('circle', { cx: 50, cy: 50, r: 34, fill: 'none', stroke: colors.muted || ink, 'stroke-width': 0.8, 'stroke-dasharray': '1.2 2.4', opacity: 0.6 }));
      root.appendChild(S('circle', { cx: 50, cy: 50, r: 1.4, fill: colors.muted || ink, opacity: 0.6 }));
      return root;
    }

    const showName = detail && opts.name !== false;
    const G = S('g', showName ? { transform: 'translate(7.5 2) scale(0.85)' } : {});
    root.appendChild(G);

    // course: rings inside the frame (1–4 = year; 5+ = graduate, beaded), minor = a clock dot on the frame
    const lvl = course ? course.level : 0;
    const nRing = lvl <= 0 ? 0 : lvl <= 4 ? lvl : Math.min(4, lvl - 4);
    const beads = lvl >= 5;
    const enc = frameOn ? ENC[fam] : null;
    const zone = nRing ? RING.o + nRing * RING.p + 1.4 : GAP;
    const inner = enc ? inscribed(enc, BAND) : FREE_R + (nRing ? zone : 0);
    const R = inner - zone;
    const clockA = course && course.minor > 0 ? -PI / 2 + course.minor / 100 * TAU : null;

    // 1. enclosure
    if (enc) {
      const d = contourPath(contour(enc, 0)) + contourPath(contour(enc, BAND));
      const attrs = { d, fill: ink, 'fill-rule': 'evenodd' };
      if (clockA != null) {
        const id = uid(), pt = rayHit(contour(enc, BAND / 2), clockA);
        defs.appendChild(S('mask', Object.assign({ id, maskUnits: 'userSpaceOnUse' }, BOX), [
          S('rect', Object.assign({ fill: '#fff' }, BOX)), S('circle', { cx: pt[0], cy: pt[1], r: 1.25, fill: '#000' })]));
        attrs.mask = `url(#${id})`;
      }
      const eg = S('g', {}, [S('path', attrs)]);
      G.appendChild(eg);
      const F = D.families[fam];
      bindHover(eg, hover, { title: `门类 · ${F.zh}：${enc.zh}`, sub: enc.why });
    }

    // 2. course rings
    if (nRing) {
      const cg = S('g', { fill: 'none', stroke: ink });
      for (let j = 0; j < nRing; j++) {
        const off = RING.o + j * RING.p + RING.w / 2;
        const ct = enc ? contour(enc, BAND + off) : { circle: FREE_R + zone - off };
        const dp = contourPath(ct);
        if (beads) {
          const per = perimeter(ct), k = Math.max(12, Math.round(per / 2.5));
          cg.appendChild(S('path', { d: dp, 'stroke-width': 1.25, 'stroke-linecap': 'round', 'stroke-dasharray': `0 ${fx(per / k)}` }));
        } else cg.appendChild(S('path', { d: dp, 'stroke-width': RING.w }));
      }
      if (!enc && clockA != null) cg.appendChild(S('circle', { cx: 50 + (FREE_R + zone + 2) * Math.cos(clockA), cy: 50 + (FREE_R + zone + 2) * Math.sin(clockA), r: 1.1, fill: ink, stroke: 'none' }));
      G.appendChild(cg);
      bindHover(cg, hover, { title: `课程 · ${course.label}`, sub: `${nRing} 道${beads ? '珠轮（研究生）' : '细轮'} = ${lvl} 字头；尾数 ${String(course.minor).padStart(2, '0')} → 外框上的白点在 ${(course.minor / 100 * 12).toFixed(1)} 点钟` });
    } else if (course && clockA != null && !enc) {
      G.appendChild(S('circle', { cx: 50 + (FREE_R + 2.5) * Math.cos(clockA), cy: 50 + (FREE_R + 2.5) * Math.sin(clockA), r: 1.1, fill: ink }));
    }

    // 3. motif (or two motifs side by side: 比翼紋)
    if (parts) {
      const r = FREE_R * 0.6, dx = FREE_R * 0.4;
      const layersB = motifLayers(Object.assign({}, parts[1].spec, { stone: false }), 50 + dx, 50, r, rich);
      const layersA = motifLayers(Object.assign({}, parts[0].spec, { stone: false }), 50 - dx, 50, r, rich);
      const yb = yinOf(parts[1].spec), ya = yinOf(parts[0].spec);
      const gb = paint(S, defs, layersB, ink, yb), ga = paint(S, defs, layersA, ink, ya);
      // A sits in front of B: cut a halo of A's silhouette out of B
      const id = uid();
      defs.appendChild(S('mask', Object.assign({ id, maskUnits: 'userSpaceOnUse' }, BOX), [S('rect', Object.assign({ fill: '#fff' }, BOX)),
        ...layersA.map((d) => S('path', { d, fill: '#000', stroke: '#000', 'stroke-width': 2 * HALO + (ya ? SW : 0), 'stroke-linejoin': 'round' }))]));
      G.appendChild(S('g', { mask: `url(#${id})` }, [gb]));
      G.appendChild(ga);
      bindHover(ga, hover, { title: `比翼 · ${parts[0].zh}：${parts[0].spec.m.zh}`, sub: `两家的纹并排叠合（江户的比翼纹），前者在前。${modText(parts[0].spec)}` });
      bindHover(gb, hover, { title: `比翼 · ${parts[1].zh}：${parts[1].spec.m.zh}`, sub: modText(parts[1].spec) });
    } else {
      const mg = S('g', {}, [crest(S, defs, spec, 50, 50, R, rich, ink, yinOf(spec))]);
      G.appendChild(mg);
      bindHover(mg, hover, {
        title: `主纹 · ${spec.m.zh}（${spec.m.cn}）`,
        sub: `动机：${spec.why.join('、') || '—'}（匹配 ${spec.fit.toFixed(2)}）；${modText(spec)}`,
      });
    }

    // 4. the blazon under the mark (detail view)
    if (showName) {
      const serif = "'Noto Serif CJK JP','Noto Serif CJK SC','Source Han Serif','Hiragino Mincho ProN','Yu Mincho','Songti SC',serif";
      const t = S('text', { x: 50, y: 95.2, 'text-anchor': 'middle', 'font-family': serif, 'font-size': 4.6, fill: ink, 'letter-spacing': 0.4 });
      t.textContent = name + (course ? `　${course.label}` : '');
      root.appendChild(t);
    }
    return root;
  }

  /* ================================================================ register */

  const shared = (() => {
    const by = new Map();
    for (const d of TABLE.values()) { if (!by.has(d.m.id)) by.set(d.m.id, []); by.get(d.m.id).push(d); }
    return { roots: by.size, pairs: [...by.values()].filter((g) => g.length > 1).map((g) => `${g[0].m.zh}：${g.map((d) => d.zh).join('/')}`) };
  })();

  const about = [
    `<p>家纹从平安时代公家的车驾、衣饰纹样开始，后来武家把它画上阵幕和旗帜。几千个纹样大多是从两百来个母题派生出来的：藤、桐、葵、片喰、樱、鹰之羽、井桁、巴……再加上一套固定的修饰：丸に（套一个圈）、三つ（数量）、違い（交叉）、向かい（相对）、陰（只描轮廓）、石持ち（反白嵌在圆盘里）。这在语言学里叫形态学：词根加词缀。它能代表一个家，是因为每个家的纹都不一样；它们又像一家人，是因为差别只来自组合，不来自画法：都用圆规和直尺作图，单色，平涂，部件之间留一道细白缝。人先认出“这是一个纹”，再认出“这是谁家的纹”。</p>`,
    `<p>三层的对应：门类是外框，按约定指定，全部用圆规直尺构造——理 丸、工 角、生 亀甲、人 木瓜、社 菱、经 隅入角、艺 雪輪。学科是主纹：${MOTIFS.length} 个词根，每个带一份“语义画像”（用那 256 个属性写成的权重表），和学科向量算余弦，再做全局分配；一个词根最多给两个学科，所以同一个词根会以不同的修饰出现，比如${shared.pairs.slice(0, 3).join('，')}。修饰也来自向量：循环、旋转、群体多的取三，对立、平衡、冲突多的取二；阳轴偏暗的画成陰，实轴高的放进石持ち。课程是内轮：1–4 字头的课在外框内加 1–4 道细轮，研究生课换成珠轮；课号末两位是外框上一个白点，按钟面位置走。</p>`,
    `<p>字母和语法：词根分三种“变格”。长形（羽、箭、叶、扇、闪电）的二是違い、三是三つ寄せ；侧形（月星、云）的二是向かい、三是三つ追い；圆形（钱、晶、花、人）的二是重ね、三是三つ盛り。构造常数就是风格：只用线段和圆弧；外框带宽 4、陰的描线 1.45、部件间隙约为主纹半径的 6.5%；前面的部件压住后面的部件时，在后者上切出一道白边（违い鹰之羽的画法）。每个纹都有一个按规则生成的名字，例如「丸に三つ巴」「隅入角に石持ち重ね銭」，名字就是它的描述，换一种画法仍是同一个纹。两门学科组合时用江户的比翼纹：两个纹左右叠合，前者在前。</p>`,
    `<p>好处：48 像素也读得出，整张表一看就是同一只手画的；门类靠外框一眼可分；词根有像似或指示的动机（天平给法学，蛇杖给医学，齿轮给机械，井筒就是 # 号）；数量、阴阳、石持ち让同一个词根能派生出亲戚。问题：词根要手画，新学科可能需要新词根；共用词根时动机会变弱，有的学科只能分到“最不坏”的那个；修饰只用到两三根轴，向量里的大部分细节被丢掉了；三つ的排法在小尺寸下单元变小；课程标记很轻，要凑近才数得清。家纹本身也带着很强的日本文化色彩，这套是借它的机制，不是借它的身份。</p>`,
  ].join('');

  const reg = {
    id: 'kamon',
    order: 7,
    name: '家纹',
    en: 'Kamon',
    tagline: '词根加词缀：外框定门类，母题定学科',
    dims: `主纹：学科向量与 ${MOTIFS.length} 个词根“语义画像”的余弦匹配加全局分配（每个词根至多两个学科）；修饰：循环/群体/对立等属性定数量 1–3，阳轴定陰陽，实轴定石持ち；门类与课程不取向量。`,
    lineage: '前人：平安时代公家车驾与衣饰上的纹样；镰仓以后武家用于阵幕、旗帜；江户时代家纹普及到町人，比翼纹用于两家之纹的合并；纹章上绘师以圆规、直尺作纹；欧洲纹章的分家标记（cadency）。',
    about,
    controls: [
      { id: 'frame', label: '外框', type: 'toggle', value: true },
      { id: 'yinyang', label: '陰陽', type: 'select', value: 'auto', options: [{ value: 'auto', label: '自动' }, { value: 'yang', label: '陽' }, { value: 'yin', label: '陰' }] },
      { id: 'detail', label: '细节', type: 'select', value: 'auto', options: [{ value: 'auto', label: '自动' }, { value: 'simple', label: '简' }, { value: 'rich', label: '繁' }] },
      { id: 'name', label: '紋名', type: 'toggle', value: true },
    ],
    render,
  };
  Object.defineProperty(reg, 'debug', { value: { TABLE, MOTIFS, specOf, crestName }, enumerable: false });
  L.register(reg);
})();
