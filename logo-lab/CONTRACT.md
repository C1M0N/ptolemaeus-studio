# Renderer contract

Every idea ("思路") is one renderer file: `renderers/<id>.js`. It turns a 256-dim semantic vector into a square logo.
All pages load, in this order:

```html
<script src="shared/semantics.js"></script>   <!-- generated data: window.LogoLabData -->
<script src="shared/lab.js"></script>         <!-- core API: window.LogoLab -->
<script src="renderers/<id>.js"></script>     <!-- one or more renderers -->
<script src="shared/shell.js"></script>       <!-- page UI (gallery / detail views) -->
```

## Registering

```js
LogoLab.register({
  id: 'matrix',                 // same as file name and branch suffix
  order: 1,                     // position in the gallery
  name: '矩阵',                  // short Chinese name (2-4 字)
  en: 'Matrix',
  tagline: '256 个属性排成 16×16，亮度就是语义强度',   // one line, <= 28 汉字
  dims: '用哪些维度、怎么来的（一句话）',
  lineage: '前人：…（一句话，带年代）',
  about: `<p>…</p><p>…</p>`,    // detail-view explanation, Chinese HTML, 2-4 short paragraphs:
                                //   这个思路是什么 / 维度怎么选 / 图形怎么生成 / 优点和问题
  controls: [                   // optional, shown in the detail view only
    { id: 'layout', label: '布局', type: 'select', value: 'domain',
      options: [{ value: 'domain', label: '按领域' }, { value: 'similar', label: '按相似' }] },
    { id: 'threshold', label: '阈值', type: 'range', min: 0, max: 1, step: 0.05, value: 0.2 },
    { id: 'mirror', label: '镜像', type: 'toggle', value: false },
  ],
  render(ctx) { /* return an SVGElement or HTMLCanvasElement */ },
});
```

## `render(ctx)`

`ctx` fields:

| field | meaning |
|---|---|
| `vec` | `Float32Array(256)`, values in `[0, 1]` (0-255 rating / 255). Usually sparse: 18-40 nonzero. |
| `word` | label of what is shown, e.g. `数学`, `猴子` or `数学 + 音乐` |
| `item` | `{kind: 'discipline'|'word'|'combo', zh, en, code, f}` — `code` is the course-code prefix (`MATH`), `f` the family index 0-6 (`data.families`), `-1` when not a discipline |
| `course` | `null`, or `{number: 241, level: 2, minor: 41, label: 'MATH 241'}` when a specific course is shown |
| `size` | side length in CSS px. Return a square element exactly this size. |
| `mode` | `'card'` (gallery thumbnail, ~220px, no interaction) or `'detail'` (large, ~520px) |
| `opts` | `{ [controlId]: value }` for the declared controls (defaults filled in) |
| `colors` | resolved theme colors as CSS strings: `ink`, `paper`, `panel`, `muted`, `line`, `accent`, `seal` |
| `lab` | the `LogoLab` API (same as `window.LogoLab`) |
| `hover(info)` | detail mode only: call with `{ title, sub }` while the pointer is over a meaningful part (an attribute cell, a node), `hover(null)` to clear. Optional. |

## The system has three levels

The real goal: one emblem per academic discipline, and a variant per course, all in one visual language
(think heraldry: a family arms, then marks of difference for each son). Every renderer implements all three:

1. **Family (门类)** — `item.f`, 7 families: 理 工 生 人 社 经 艺. Something constant across all disciplines of a
   family (an enclosure shape, a field division, a frame, a corner mark, a base stroke…). Quiet but recognisable. Skip when `f === -1`.
2. **Discipline (学科)** — the semantic vector `vec` drives the main body of the mark. This is where the idea lives.
3. **Course (课程)** — when `course` is set, add a systematic "mark of difference": `level` (1-4 undergrad, 5+ grad)
   changes something countable (rings, ticks, dots, line count, a numeral); `minor` may change a small detail.
   Course variants of one discipline must still read as the same emblem.

Rules:
- Pure and deterministic: the same `vec` + `opts` always gives the same image. Never use `Math.random()`;
  use `lab.rng(lab.hash(something))` if you need variety.
- Draw with `ctx.colors` (the shell re-renders on theme change). Monochrome ink on transparent background
  is the default look; colour is allowed when it carries meaning.
- The logo must read at 64px and look good at 520px. Keep a quiet margin (~8%) around the mark.
- An all-zero vector must not crash (draw a faint empty state).
- No external network calls, no globals other than the `register` call.
- Prefer SVG for geometric marks (crisp, hover-friendly); use canvas (`lab.canvas(size)`) for fields and textures.

## LogoLab API (`shared/lab.js`)

| call | returns |
|---|---|
| `LogoLab.data` | `{domains[16], attrs[256], words[72], groups, stats, layouts, axes, rubric}` |
| `data.families[f]` | `{f, key, zh, en}` — 理 理学, 工 工学, 生 生命与健康, 人 人文, 社 社会科学, 经 经管法, 艺 艺术 |
| `data.words[j]` | `{zh, en, group, kind, code?, f?, r}` — 48 disciplines (kind 'discipline', with code + family) then 71 everyday words |
| `item(word)`, `course(n, code)` | metadata helpers (see ctx.item / ctx.course) |
| `data.attrs[i]` | `{i, zh, en, d (domain 0-15), k (0-15 within domain), pair (antonym index or -1)}` |
| `data.domains[d]` | `{d, zh, en}` — 存在 元素 色彩 感官 形态 运动 生物 心智 正面情感 负面情感 价值 社会 人造 文化 自然 关系 |
| `data.stats.freq[i]` | share of the 72 words where attribute i is nonzero (generality) |
| `data.layouts.gridDomain[i]` | cell 0-255 (row*16+col) when rows = domains |
| `data.layouts.gridSimilar[i]` | cell 0-255, similar attributes are neighbours |
| `data.layouts.gridRings[i]` | cell 0-255, frequent attributes in the centre ring, rare ones outside |
| `data.layouts.xy[i]` | `[x, y]` in `[0,1]`, 2D semantic map of the attributes (MDS on co-activation + domain) |
| `data.layouts.angle[i]` | `[0,1)`, circular ordering, neighbours are similar |
| `data.layouts.domainOrder` | the 16 domains ordered around a circle so neighbouring domains are similar |
| `data.axes` | `[{key, pos, neg, posAttrs, negAttrs}]` keys: yang life good active hard nature order warm power concrete |
| `vec(word)` | vector for a vocabulary word |
| `top(vec, n)` | `[{i, v, attr}]` strongest attributes |
| `axis(vec, key)` | `[-1, 1]`, e.g. `axis(v,'good')` > 0 means 善 side |
| `domainSum(vec)` | `Float32Array(16)` sum per domain |
| `combine(a, b, mode)` | `'add' | 'max' | 'min' | 'mean'` |
| `nearest(vec, k, exclude)` | `[{word, sim}]` |
| `hash(str)`, `rng(seed)` | deterministic hash and PRNG |
| `svg(tag, attrs, children)` | create SVG elements |
| `canvas(size)` | `{canvas, g}` HiDPI canvas, `g` draws in CSS px |
| `hex(i)` | `'0x3A'` — each attribute's byte address |

## Testing a renderer

`tools/harness.html?r=<id>&size=120` renders all 48 disciplines (add `&all=1` for the 71 everyday words too).
`&words=数学,物理学,猴子` picks entries, `&course=101,241,350,472` repeats each entry as those courses,
`&opt.layout=similar` sets a control, `&theme=dark`, `&mode=detail`, `&empty=1`, `&combine=数学+音乐`.
`node tools/shoot.mjs "<url-relative-to-logo-lab>" out.png` screenshots any page and prints console errors.
