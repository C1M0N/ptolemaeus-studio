// 字根 Radicals — the Chinese-character route.
// A finite set of semantic components (部件), each with positional variants (水 → 氵 on the left, 火 → 灬 at the
// bottom), combined by the few structures real characters use (左右 上下 包围 品字 …) into ONE invented character.
// Family = the outline of the seal the character is cut into; course = a small numeral in a notch of the seal's rim.
(function () {
  const L = window.LogoLab;
  const D = L.data;

  /* ------------------------------------------------------------------ glyph geometry
     Every form is a centre-line path in its own natural box (w × h, design units). Spacing between parallel
     strokes is ~16–22 units everywhere, so a form's box also says how much room it needs. Paths use absolute
     M L H V Q A Z only; they are transformed point by point, so the stroke is drawn after scaling and keeps
     one constant weight however a component is squeezed into its slot. */

  const F = (w, h, d, x) => Object.assign({ w, h, d }, x || {});
  const circ = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}`;

  // attrs: [attribute index, weight]. Activation = weighted probabilistic OR: 1 − Π(1 − w·v).
  // pref: positions in order of preference. L left 旁, R right 旁, T top 头, B bottom 底, E enclosure 框, full 独体.
  const RADS = [
    // ---- sky and weather
    { key: '日', name: '太阳 · 光', attrs: [[225, 1], [24, 1], [45, 0.5]], pref: ['L', 'full'], forms: {
      full: F(40, 56, 'M0 0H40V56H0Z M0 28H40'),
      L: F(30, 46, 'M0 0H30V46H0Z M0 23H30', { v: [0.12, 0.82], ch: '日' }),
      T: F(44, 32, 'M0 0H44V32H0Z M0 16H44') } },
    { key: '月', name: '月亮 · 夜', attrs: [[226, 1], [239, 0.7]], pref: ['full'], forms: {
      full: F(44, 64, 'M6 0V44Q6 58 0 64 M6 0H44V64L37 58 M6 21H44 M6 41H44') } },
    { key: '星', name: '星辰（古文 曐 上部三星）', attrs: [[227, 1], [224, 0.25], [13, 0.15]], pref: ['T', 'full'], forms: {
      full: F(52, 46, circ(26, 9, 9) + circ(9, 37, 9) + circ(43, 37, 9), { ch: '晶' }),
      T: F(64, 16, circ(8, 8, 8) + circ(32, 8, 8) + circ(56, 8, 8), { ch: '晶' }) } },
    { key: '雨', name: '雨 · 风暴 · 雪', attrs: [[235, 1], [236, 0.9], [237, 0.8], [23, 0.4]], pref: ['T', 'full'], forms: {
      full: F(64, 64, 'M4 0H60 M0 16V64 M0 16H64V64L57 58 M32 0V42 M12 30L18 36 M12 46L18 52 M46 30L52 36 M46 46L52 52'),
      T: F(64, 36, 'M6 0H58 M0 12V34 M0 12H64V34 M32 0V30 M11 21L17 27 M47 21L53 27', { ch: '雨' }) } },
    { key: '风', name: '风', attrs: [[19, 1], [236, 0.3]], pref: ['full'], forms: {
      full: F(60, 64, 'M10 0V42Q10 58 0 64 M10 0H48V50Q48 64 62 64 M20 18L38 46 M38 18L20 46') } },
    { key: '气', name: '气 · 烟（化学字：氧 氢 氮）', attrs: [[27, 1], [19, 0.35]], pref: ['E', 'full'], forms: {
      full: F(64, 60, 'M18 0L6 14 M12 8H60 M14 21H50 M6 34H52Q56 34 56 40V50Q56 60 64 60'),
      E: F(64, 64, 'M18 0L6 14 M12 8H60 M14 21H50 M6 34H52Q56 34 56 40V54Q56 64 64 64', { inner: [0, 0.56, 0.84, 1], ch: '气' }) } },
    // ---- earth and matter
    { key: '水', name: '水 · 海 · 河', attrs: [[17, 1], [228, 0.6], [229, 0.7], [62, 0.5], [83, 0.35]], pref: ['L', 'full'], forms: {
      full: F(60, 64, 'M30 0V60L23 54 M4 22H20L2 50 M54 12L34 30L60 62'),
      L: F(22, 64, 'M4 4L14 12 M0 24L10 32 M0 62L20 44', { ch: '氵' }) } },
    { key: '火', name: '火 · 热 · 爆发', attrs: [[16, 1], [56, 0.7], [88, 0.55]], pref: ['L', 'B', 'full'], forms: {
      full: F(60, 60, 'M30 0V28L4 60 M30 28L58 60 M10 18L14 32 M50 16L45 30'),
      L: F(30, 54, 'M15 0V28L2 54 M15 30L28 42 M3 12L5 24 M27 10L23 22', { ch: '火' }),
      B: F(64, 14, 'M6 2L2 14 M24 2L26 14 M40 2L42 14 M58 2L62 14', { ch: '灬' }) } },
    { key: '土', name: '土 · 尘', attrs: [[18, 1], [29, 0.5], [233, 0.2]], pref: ['L', 'B', 'full'], forms: {
      full: F(56, 52, 'M28 0V52 M8 20H48 M0 52H56'),
      L: F(28, 46, 'M14 0V40 M2 16H26 M0 46L28 34', { v: [0.1, 0.95], ch: '土' }),
      B: F(56, 30, 'M28 0V30 M10 12H46 M0 30H56') } },
    { key: '石', name: '石 · 坚', attrs: [[22, 1], [59, 0.35]], pref: ['L', 'full'], forms: {
      full: F(60, 60, 'M2 0H58 M24 0L2 40 M16 30H54V60H16Z'),
      L: F(32, 56, 'M0 0H32 M15 0L0 26 M8 24H30V50H8Z', { v: [0, 0.92], ch: '石' }) } },
    { key: '山', name: '山', attrs: [[230, 1], [70, 0.5]], pref: ['T', 'full'], forms: {
      full: F(56, 48, 'M28 0V48 M4 16V48H52V16'),
      T: F(56, 28, 'M28 0V28 M6 10V28H50V10', { ch: '山' }) } },
    { key: '田', name: '田 · 地图', attrs: [[233, 1], [46, 0.1]], pref: ['full'], forms: {
      full: F(52, 52, 'M0 0H52V52H0Z M26 0V52 M0 26H52') } },
    { key: '金', name: '金属', attrs: [[20, 1], [40, 0.5], [39, 0.3]], pref: ['L', 'full'], forms: {
      full: F(60, 66, 'M30 0L0 22 M30 0L60 22 M14 28H46 M10 44H50 M30 28V64 M16 50L20 58 M44 50L40 58 M0 66H60'),
      L: F(28, 64, 'M14 0L2 14 M8 10H28 M4 27H26 M14 10V60L28 50', { ch: '钅' }) } },
    { key: '王', name: '玉 · 晶 · 王权', attrs: [[204, 1], [30, 0.8], [174, 0.4], [179, 0.6]], pref: ['L', 'full'], forms: {
      full: F(52, 52, 'M0 0H52 M6 26H46 M0 52H52 M26 0V52'),
      L: F(28, 50, 'M0 0H28 M3 23H25 M14 0V44 M0 50L28 40', { ch: '王' }) } },
    { key: '电', name: '电 · 电子', attrs: [[26, 1], [203, 0.9]], pref: ['full'], forms: {
      full: F(56, 60, 'M0 8H44V40H0Z M0 24H44 M22 0V50Q22 60 32 60H56V50') } },
    // ---- life
    { key: '生', name: '生命 · 生长', attrs: [[0, 0.9], [2, 0.7], [90, 0.6]], pref: ['full'], forms: {
      full: F(60, 60, 'M18 0L6 20 M10 14H54 M32 0V60 M14 36H50 M0 60H60') } },
    { key: '木', name: '木 · 林', attrs: [[21, 1], [231, 1], [97, 0.25]], pref: ['L', 'full'], forms: {
      full: F(60, 60, 'M0 18H60 M30 0V60 M30 18L4 50 M30 18L56 50'),
      L: F(30, 60, 'M0 18H30 M15 0V60 M15 18L0 44 M16 28L28 40', { ch: '木' }) } },
    { key: '艹', name: '草 · 花 · 药草', attrs: [[97, 1], [109, 0.7], [34, 0.5], [54, 0.3]], pref: ['T'], forms: {
      full: F(60, 22, 'M0 10H60 M18 0V22 M42 0V22', { ch: '艹' }),
      T: F(60, 22, 'M0 10H60 M18 0V22 M42 0V22', { ch: '艹' }) } },
    { key: '禾', name: '禾 · 谷物（科 字从禾）', attrs: [[110, 1], [206, 0.7], [233, 0.4]], pref: ['L', 'full'], forms: {
      full: F(60, 64, 'M46 0L16 8 M0 22H60 M30 4V64 M30 22L4 54 M30 22L56 54'),
      L: F(32, 64, 'M28 0L6 6 M0 20H32 M16 2V64 M16 20L0 46 M17 30L30 42', { ch: '禾' }) } },
    { key: '犬', name: '兽 · 动物', attrs: [[96, 1], [107, 0.5], [106, 0.5]], pref: ['L', 'full'], forms: {
      full: F(60, 64, 'M0 22H60 M30 0V22Q28 50 2 64 M32 30L60 64 M44 4L52 12'),
      L: F(30, 64, 'M26 0L8 12 M6 3Q28 18 26 40Q25 56 14 64L9 58 M27 30L1 52', { ch: '犭' }) } },
    { key: '鱼', name: '鱼 · 海中生物', attrs: [[228, 0.7], [108, 0.6], [96, 0.25]], pref: ['full'], forms: {
      full: F(56, 72, 'M22 0L8 14 M16 5H38L30 14 M6 22H50V54H6Z M28 22V54 M6 38H50 M0 72H56') } },
    { key: '羽', name: '羽 · 飞', attrs: [[105, 1], [84, 0.9], [95, 0.3]], pref: ['full'], forms: {
      full: F(60, 60, 'M0 2H24V58L18 52 M6 20L14 26 M4 44L16 36 M32 2H56V58L50 52 M38 20L46 26 M36 44L48 36') } },
    { key: '人', name: '人', attrs: [[98, 1], [181, 0.4]], pref: ['L', 'full'], forms: {
      full: F(60, 60, 'M30 0Q30 36 0 60 M31 22Q36 48 60 60'),
      L: F(26, 64, 'M24 0L0 28 M12 14V64', { ch: '亻' }) } },
    { key: '众', name: '众 · 群体', attrs: [[180, 1], [182, 0.4]], pref: ['full'], forms: {
      full: F(64, 60, 'M32 0L18 24 M32 8L46 24 M16 32L0 60 M16 40L30 60 M48 32L34 60 M48 40L64 60') } },
    { key: '身', name: '身体', attrs: [[99, 1]], pref: ['full'], forms: {
      full: F(52, 64, 'M30 0L22 8 M12 10H42V64L35 58 M12 10V45 M12 23H42 M12 35H42 M0 54L52 41 M42 44L14 64') } },
    { key: '心', name: '心 · 情', attrs: [[103, 0.9], [129, 0.6], [172, 0.4], [146, 0.3], [145, 0.3]], pref: ['B', 'L', 'full'], forms: {
      full: F(64, 46, 'M4 22L8 34 M14 4V30Q14 46 30 46H50L58 36 M30 4L36 14 M56 8L62 20'),
      B: F(64, 40, 'M4 18L8 30 M14 2V26Q14 40 30 40H50L58 31 M30 2L36 12 M56 6L62 17', { ch: '心' }),
      L: F(26, 64, 'M14 0V64 M2 18L5 34 M24 16L27 26', { ch: '忄' }) } },
    { key: '目', name: '目 · 看', attrs: [[100, 1]], pref: ['full'], forms: {
      full: F(36, 64, 'M0 0H36V64H0Z M0 21H36 M0 43H36') } },
    { key: '手', name: '手', attrs: [[101, 1], [192, 0.25]], pref: ['L', 'full'], forms: {
      full: F(60, 64, 'M48 0L12 8 M4 22H56 M2 40H58 M30 4V58L23 52'),
      L: F(30, 64, 'M0 18H30 M16 0V58L9 52 M0 48L30 34', { ch: '扌' }) } },
    { key: '疒', name: '病', attrs: [[111, 1], [152, 0.5]], pref: ['E'], forms: {
      full: F(64, 64, 'M38 0L42 8 M14 12H64 M14 12V40Q14 56 2 64 M2 24L8 30 M2 44L8 38', { ch: '疒' }),
      E: F(64, 64, 'M38 0L42 8 M14 12H64 M14 12V40Q14 56 2 64 M2 24L8 30 M2 44L8 38', { inner: [0.3, 0.22, 1, 1], ch: '疒' }) } },
    { key: '皿', name: '皿 · 容器', attrs: [[199, 1], [206, 0.2]], pref: ['B', 'full'], forms: {
      full: F(64, 36, 'M8 0V30 M8 0H56V30 M24 0V30 M40 0V30 M0 30H64'),
      B: F(64, 30, 'M8 0V24 M8 0H56V24 M24 0V24 M40 0V24 M0 24H64') } },
    { key: '子', name: '子 · 养育', attrs: [[177, 1], [2, 0.4], [124, 0.5]], pref: ['B', 'full'], forms: {
      full: F(56, 60, 'M6 0H46L30 16 M30 16V56L23 50 M0 32H56'),
      B: F(56, 46, 'M8 0H46L30 12 M30 12V42L24 37 M0 24H56') } },
    // ---- mind, word and rite
    { key: '囟', name: '囟 · 脑（思 字古从囟）', attrs: [[112, 0.9], [115, 0.6], [116, 0.4], [119, 0.3]], pref: ['full'], forms: {
      full: F(52, 60, 'M20 0L14 8 M2 10H50V60H2Z M14 24L38 48 M38 24L14 48') } },
    { key: '爻', name: '爻 · 学（學 字中有爻）', attrs: [[114, 0.9], [118, 0.6]], pref: ['T', 'full'], forms: {
      full: F(56, 60, 'M8 2L48 26 M48 2L8 26 M4 34L52 60 M52 34L4 60'),
      T: F(60, 24, 'M2 0L26 24 M26 0L2 24 M34 0L58 24 M58 0L34 24', { ch: '爻' }) } },
    { key: '玄', name: '玄 · 幽深', attrs: [[126, 1], [12, 0.5], [13, 0.3], [15, 0.4]], pref: ['full'], forms: {
      full: F(56, 64, 'M26 0L30 8 M0 14H56 M34 18L18 32L36 38 M38 34L12 58H46 M38 46L46 54') } },
    { key: '言', name: '言 · 交流', attrs: [[186, 1], [102, 0.3]], pref: ['L', 'full'], forms: {
      full: F(56, 72, 'M24 0L32 8 M0 16H56 M10 30H46 M10 44H46 M10 56H46V72H10Z'),
      L: F(24, 64, 'M4 2L14 12 M0 28H12V58L24 48', { ch: '讠' }) } },
    { key: '文', name: '文 · 故事 · 纹', attrs: [[216, 0.8], [46, 0.5], [117, 0.3]], pref: ['full'], forms: {
      full: F(60, 60, 'M28 0L32 8 M0 16H60 M46 16Q38 44 2 60 M14 16Q22 44 58 60') } },
    { key: '册', name: '册 · 典籍', attrs: [[200, 1], [115, 0.5], [114, 0.35]], pref: ['full'], forms: {
      full: F(60, 60, 'M4 4V60 M4 4H24V60 M36 4V60 M36 4H56V56L50 51 M0 32H60') } },
    { key: '古', name: '古 · 传统', attrs: [[9, 1], [219, 0.6], [8, 0.3]], pref: ['full'], forms: {
      full: F(56, 62, 'M0 16H56 M28 0V30 M10 30H46V62H10Z') } },
    { key: '歹', name: '歹 · 残骨', attrs: [[1, 0.9], [104, 0.9], [246, 0.7], [3, 0.4]], pref: ['L', 'full'], forms: {
      full: F(56, 64, 'M0 0H56 M24 0L14 18 M16 14H46Q42 44 4 64 M24 34L34 44'),
      L: F(30, 60, 'M0 0H30 M13 0L6 14 M8 12H26Q24 38 0 60 M12 28L20 36', { ch: '歹' }) } },
    { key: '示', name: '示 · 神 · 礼', attrs: [[166, 1], [208, 0.9], [213, 0.7], [209, 0.8]], pref: ['L', 'full'], forms: {
      full: F(60, 60, 'M14 0H46 M0 18H60 M30 18V56L23 50 M16 32L4 50 M44 32L56 50'),
      L: F(28, 64, 'M12 0L16 8 M2 16H24L2 40 M14 30V64 M16 34L26 42', { ch: '礻' }) } },
    { key: '卜', name: '卜 · 占 · 偶然', attrs: [[245, 1], [126, 0.25]], pref: ['full'], forms: {
      full: F(36, 60, 'M12 0V60 M12 24L32 36') } },
    { key: '音', name: '音 · 乐', attrs: [[215, 1], [50, 0.9], [48, 0.4]], pref: ['full'], forms: {
      full: F(56, 76, 'M26 0L30 8 M6 12H50 M16 18L20 28 M40 18L36 28 M0 32H56 M10 42H46V76H10Z M10 59H46') } },
    { key: '彡', name: '彡 · 纹彩（形 彩 影）', attrs: [[164, 0.9], [46, 0.6], [47, 0.6], [214, 0.4]], pref: ['R', 'full'], forms: {
      full: F(44, 60, 'M40 0L8 16 M42 22L2 42 M44 44L0 60'),
      R: F(30, 64, 'M28 2L4 16 M30 24L0 42 M30 46L0 64', { ch: '彡' }) } },
    // ---- power, order and making
    { key: '戈', name: '戈 · 冲突', attrs: [[183, 1], [194, 0.9], [171, 0.8]], pref: ['R', 'full'], forms: {
      full: F(60, 60, 'M0 24L56 18 M22 0Q26 40 54 60L56 50 M50 30L10 56 M44 2L50 10'),
      R: F(46, 64, 'M0 24L42 18 M14 0Q18 42 40 64L42 54 M38 30L6 58 M32 2L38 10', { ch: '戈' }) } },
    { key: '力', name: '力', attrs: [[92, 1], [125, 0.3]], pref: ['R', 'full'], forms: {
      full: F(56, 60, 'M8 16H50V54L43 48 M28 0Q28 40 0 60'),
      R: F(34, 60, 'M4 16H32V54L26 48 M18 0Q18 40 0 60', { ch: '力' }) } },
    { key: '刂', name: '刀 · 裁断（判 则 制）', attrs: [[170, 0.85], [187, 0.6], [249, 0.4], [67, 0.3]], pref: ['R'], forms: {
      full: F(22, 64, 'M2 10V44 M20 0V60L13 54', { ch: '刂' }),
      R: F(22, 64, 'M2 10V44 M20 0V60L13 54', { ch: '刂' }) } },
    { key: '井', name: '井 · 秩序', attrs: [[240, 1], [187, 0.4], [69, 0.3]], pref: ['full'], forms: {
      full: F(56, 56, 'M0 18H56 M0 38H56 M18 0V40Q18 52 8 56 M38 0V56') } },
    { key: '囗', name: '囗 · 疆域（國 字外框）', attrs: [[178, 0.8], [255, 0.6], [247, 0.3]], pref: ['E'], forms: {
      full: F(56, 56, 'M0 0H56V56H0Z', { ch: '囗' }),
      E: F(64, 64, 'M0 0H64V64H0Z', { inner: [0.02, 0.02, 0.98, 0.98], ch: '囗' }) } },
    { key: '贝', name: '贝 · 财', attrs: [[184, 1], [174, 0.5], [156, 0.4]], pref: ['L', 'B', 'full'], forms: {
      full: F(56, 60, 'M8 0V42 M8 0H48V42 M28 14Q26 46 2 60 M36 46L54 60'),
      L: F(32, 56, 'M4 0V40 M4 0H28V40 M16 12Q15 40 0 56 M20 42L32 54', { ch: '贝' }),
      B: F(56, 44, 'M8 0V30 M8 0H48V30 M28 10Q26 32 2 44 M36 32L54 44') } },
    { key: '十', name: '十 · 数', attrs: [[201, 1]], pref: ['full'], forms: {
      full: F(48, 48, 'M0 24H48 M24 0V48') } },
    { key: '〇', name: '〇 · 循环 · 整全', attrs: [[11, 0.9], [66, 0.5], [247, 0.4], [13, 0.4], [87, 0.4]], pref: ['full'], forms: {
      full: F(48, 48, circ(24, 24, 24)) } },
    { key: '罒', name: '网', attrs: [[202, 1], [248, 0.45], [253, 0.2]], pref: ['T'], forms: {
      full: F(60, 24, 'M0 0H60V24H0Z M20 0V24 M40 0V24', { ch: '罒' }),
      T: F(60, 24, 'M0 0H60V24H0Z M20 0V24 M40 0V24', { ch: '罒' }) } },
    { key: '工', name: '工 · 器具', attrs: [[192, 1], [193, 0.5]], pref: ['L', 'full'], forms: {
      full: F(56, 44, 'M6 0H50 M28 0V44 M0 44H56'),
      L: F(28, 36, 'M2 0H26 M14 0V30 M0 36L28 28', { v: [0.12, 0.88], ch: '工' }) } },
    { key: '车', name: '车 · 轮 · 机', attrs: [[198, 1], [87, 0.5], [193, 0.3]], pref: ['L', 'full'], forms: {
      full: F(56, 60, 'M0 8H56 M28 0L6 34H50 M30 22V60 M0 50H56'),
      L: F(30, 60, 'M0 8H28 M14 0L2 28H28 M16 16V60 M0 52L30 44', { ch: '车' }) } },
    { key: '宀', name: '宀 · 屋 · 家', attrs: [[176, 1], [195, 0.8], [138, 0.3]], pref: ['T'], forms: {
      full: F(64, 26, 'M30 0L34 7 M0 24V11H64V24', { ch: '宀' }),
      T: F(64, 26, 'M30 0L34 7 M0 24V11H64V24', { ch: '宀' }) } },
    { key: '辶', name: '辶 · 道路', attrs: [[197, 1], [80, 0.3], [191, 0.3]], pref: ['E'], forms: {
      full: F(64, 64, 'M8 0L14 6 M0 16H14L4 32 M12 32V52Q12 60 24 60H64', { ch: '辶' }),
      E: F(64, 64, 'M8 0L14 6 M0 16H14L4 32 M12 32V52Q12 60 24 60H64', { inner: [0.26, 0, 1, 0.9], ch: '辶' }) } },
  ];
  RADS.forEach((r, i) => { r.idx = i; });
  const BY_KEY = new Map(RADS.map((r) => [r.key, r]));
  const POS_ZH = { L: '左旁', R: '右旁', T: '字头', B: '字底', E: '框', full: '独体' };

  function activation(r, v) {
    let p = 1;
    for (const [i, w] of r.attrs) p *= 1 - w * (v[i] || 0);
    return 1 - p;
  }
  function ranked(v) {
    return RADS.map((r) => ({ r, a: activation(r, v) }))
      .filter((x) => x.a > 0.001)
      .sort((x, y) => y.a - x.a || x.r.idx - y.r.idx);
  }

  // At most one enclosure, one top-only head and one right-only side per character (real characters obey the same).
  const only = (r, p) => r.pref.length === 1 && r.pref[0] === p;
  function compatible(list, r) {
    if (list.some((x) => x.r === r)) return false;
    for (const p of ['E', 'T', 'R']) if (only(r, p) && list.some((x) => only(x.r, p))) return false;
    return true;
  }
  const MIN_A = 0.3;
  function pick(v, n) {
    const rk = ranked(v);
    const out = [];
    if (!rk.length) return { list: out, ranked: rk };
    const top = rk[0].a;
    for (const x of rk) {
      if (out.length >= n) break;
      if (x.a < MIN_A || x.a < 0.42 * top) break;
      if (compatible(out, x.r)) out.push(x);
    }
    return { list: out, ranked: rk };
  }
  const keyOf = (list) => list.map((x) => x.r.key).sort().join('');

  // The register: like a herald's roll, every discipline must hold a combination no other discipline holds.
  // Disciplines are seated in order of how strongly their best radicals fire; a later one that collides swaps
  // its weakest radical for its next candidate.
  const DISC = D.words.filter((w) => w.kind === 'discipline');
  const REG = new Map();
  function registry(n) {
    if (REG.has(n)) return REG.get(n);
    const rows = DISC.map((w, j) => { const v = L.toVec(w.r); const p = pick(v, n); return { w, j, p, conf: p.list.reduce((s, x) => s + x.a, 0) }; });
    rows.sort((a, b) => b.conf - a.conf || a.j - b.j);
    const taken = new Map();
    const out = new Map();
    for (const row of rows) {
      let sel = row.p.list.slice();
      let swapped = null;
      if (sel.length && taken.has(keyOf(sel))) {
        let done = false;
        for (let j = sel.length - 1; j >= 0 && !done; j--) {
          for (const c of row.p.ranked) {
            if (c.a < 0.15) break;
            const rest = sel.filter((_, k) => k !== j);
            if (!compatible(rest, c.r)) continue;
            const trial = rest.concat([c]).sort((a, b) => b.a - a.a || a.r.idx - b.r.idx);
            if (!taken.has(keyOf(trial))) { swapped = { out: sel[j], in: c, clash: taken.get(keyOf(sel)) }; sel = trial; done = true; break; }
          }
        }
      }
      taken.set(keyOf(sel), row.w.zh);
      out.set(row.w.zh, { list: sel, ranked: row.p.ranked, swapped });
    }
    REG.set(n, out);
    return out;
  }

  /* ------------------------------------------------------------------ structure (间架结构) */

  const G = 16; // natural gap between components, same as the spacing between strokes inside one

  function formFor(r, want) {
    if (want && r.forms[want]) return { pos: want, f: r.forms[want] };
    return { pos: 'full', f: r.forms.full };
  }
  const leaf = (x, pos) => { const ff = formFor(x.r, pos); return { t: 'leaf', x, pos: ff.pos, f: ff.f }; };

  // An enclosure is a 9-slice: its bands (the strokes of 囗 疒 辶 气) keep their natural thickness and only the
  // interior grows to hold what is inside, as in a real typeface.
  function bands(f) {
    const [x0, y0, x1, y1] = f.inner;
    const gap = G * 0.8;
    return { l: x0 * f.w, t: y0 * f.h, r: (1 - x1) * f.w, b: (1 - y1) * f.h,
      gl: x0 > 0 ? gap : 0, gt: y0 > 0 ? gap : 0, gr: x1 < 1 ? gap : 0, gb: y1 < 1 ? gap : 0 };
  }

  function natural(n) {
    if (n.t === 'leaf') return [n.f.w, n.f.h];
    if (n.t === 'lr' || n.t === 'tb') {
      const s = n.kids.map(natural);
      if (n.t === 'lr') return [s.reduce((a, b) => a + b[0], 0) + G * (s.length - 1), Math.max(...s.map((b) => b[1]))];
      return [Math.max(...s.map((b) => b[0])), s.reduce((a, b) => a + b[1], 0) + G * (s.length - 1)];
    }
    if (n.t === 'encl') {
      const [iw, ih] = natural(n.inner);
      const b = bands(n.outer.f);
      return [Math.max(n.outer.f.w, b.l + b.r + b.gl + b.gr + iw), Math.max(n.outer.f.h, b.t + b.b + b.gt + b.gb + ih)];
    }
    if (n.t === 'pin') {
      const [t, a, b] = n.kids.map(natural);
      return [Math.max(t[0], a[0] + G + b[0]), t[1] + G + Math.max(a[1], b[1])];
    }
    return [1, 1];
  }
  const aspect = (n) => { const [w, h] = natural(n); return w / h; };
  const dist = (a, b) => Math.abs(Math.log(a / b));

  // Choose a structure for components in activation order. Conventional positions first (框 → 头 → 旁 → 底),
  // like the radical of a real character; what is left is arranged to match the slot's shape.
  // `ok` says which positional slots are still open on this branch: a side form (氵 亻 刂 …) may only sit at the
  // outer edge of the whole character, a head only on top, a foot only at the bottom (no 火氵皿 in a row).
  function plan(cs, target, ok) {
    ok = ok || { L: true, R: true, T: true, B: true };
    if (cs.length === 1) return leaf(cs[0], 'full');
    const rest = (x) => cs.filter((c) => c !== x);
    const wants = (c, p) => c.r.pref[0] === p || (p !== 'E' && only(c.r, p));
    const e = cs.find((c) => wants(c, 'E'));
    if (e) {
      const [x0, y0, x1, y1] = e.r.forms.E.inner;
      return { t: 'encl', outer: leaf(e, 'E'), inner: plan(rest(e), target * (x1 - x0) / (y1 - y0), { L: true, R: true, T: true, B: true }), x: e };
    }
    const t = ok.T && cs.find((c) => wants(c, 'T'));
    if (t) return { t: 'tb', kids: [leaf(t, 'T'), plan(rest(t), target * 1.35, Object.assign({}, ok, { T: false }))] };
    const l = ok.L && cs.find((c) => wants(c, 'L'));
    if (l) return { t: 'lr', kids: [leaf(l, 'L'), plan(rest(l), target * 0.66, Object.assign({}, ok, { L: false }))] };
    const rr = ok.R && cs.find((c) => wants(c, 'R'));
    if (rr) return { t: 'lr', kids: [plan(rest(rr), target * 0.72, Object.assign({}, ok, { R: false })), leaf(rr, 'R')] };
    const b = ok.B && cs.find((c) => c.r.forms.B && c.r.pref.indexOf('B') >= 0 && c.r.pref.indexOf('B') <= 1);
    if (b) return { t: 'tb', kids: [plan(rest(b), target * 1.3, Object.assign({}, ok, { B: false })), leaf(b, 'B')] };
    // only free-standing forms left: try the classic arrangements, keep the one closest to the slot's shape
    const L0 = cs.map((c) => leaf(c, 'full'));
    const cands = [];
    if (cs.length === 2) {
      cands.push({ t: 'lr', kids: L0 }, { t: 'tb', kids: L0 });
    } else if (cs.length === 3) {
      // 品字 only when all three parts are compact (晶 森 品); a thin part cannot carry the apex alone
      if (L0.every((l) => l.f.w / l.f.h > 0.74 && l.f.w / l.f.h < 1.4)) cands.push({ t: 'pin', kids: L0, bias: 0.9 });
      cands.push({ t: 'lr', kids: L0, bias: 1.15 });
      cands.push({ t: 'lr', kids: [L0[0], { t: 'tb', kids: [L0[1], L0[2]] }] });
      cands.push({ t: 'tb', kids: [L0[0], { t: 'lr', kids: [L0[1], L0[2]] }] });
    } else {
      cands.push({ t: 'tb', kids: [{ t: 'lr', kids: [L0[0], L0[1]] }, { t: 'lr', kids: L0.slice(2) }] });
      cands.push({ t: 'lr', kids: [{ t: 'tb', kids: [L0[0], L0[1]] }, { t: 'tb', kids: L0.slice(2) }] });
    }
    let best = cands[0], bs = Infinity;
    for (const c of cands) { const s = score(c, target) * (c.bias || 1); if (s < bs) { bs = s; best = c; } }
    return best;
  }

  // How well a candidate structure sits in a slot of the target shape: lay it out for real and add up how much
  // each component had to be squeezed out of its own proportions, and how much of its slot it leaves empty.
  function score(c, target) {
    const H = 100, W = 100 * target;
    const [nw, nh] = natural(c);
    const out = [];
    realize(c, [0, 0, W, H], out);
    let s = dist(nw / nh, target) * 0.6;
    for (const lf of out) {
      const f = lf.node.f;
      const sx = lf.slot[2] / f.w, sy = lf.slot[3] / f.h;
      const d = Math.abs(Math.log(sx / sy));
      s += 0.5 * d + 0.8 * Math.max(0, d - Math.log(MAXSTRETCH));
    }
    return s;
  }

  // Lay the tree into a box (design units). Each leaf gets a slot; it is stretched to fill it, but never by more
  // than MAXSTRETCH between its axes (the rest is centred), so a component stays recognisable.
  const MAXSTRETCH = 1.75;
  function realize(n, box, out) {
    const [bx, by, bw, bh] = box;
    if (n.t === 'leaf') {
      let [x, y, w, h] = [bx, by, bw, bh];
      if (n.f.v) { y = by + bh * n.f.v[0]; h = bh * (n.f.v[1] - n.f.v[0]); }
      let sx = w / n.f.w, sy = h / n.f.h;
      if (sx / sy > MAXSTRETCH) { const s2 = sy * MAXSTRETCH; x += (w - n.f.w * s2) / 2; sx = s2; }
      else if (sy / sx > MAXSTRETCH) { const s2 = sx * MAXSTRETCH; y += (h - n.f.h * s2) / 2; sy = s2; }
      out.push({ node: n, map: (px, py) => [x + px * sx, y + py * sy], slot: box });
      return;
    }
    if (n.t === 'lr' || n.t === 'tb') {
      const s = n.kids.map(natural);
      const horiz = n.t === 'lr';
      const tot = s.reduce((a, b) => a + (horiz ? b[0] : b[1]), 0);
      const avail = (horiz ? bw : bh) - G * (n.kids.length - 1);
      let at = horiz ? bx : by;
      n.kids.forEach((k, i) => {
        const len = avail * (horiz ? s[i][0] : s[i][1]) / tot;
        realize(k, horiz ? [at, by, len, bh] : [bx, at, bw, len], out);
        at += len + G;
      });
      return;
    }
    if (n.t === 'encl') {
      const f = n.outer.f, b = bands(f);
      const [NW, NH] = natural(n);
      const kx = bw / NW, ky = bh / NH;
      const [x0, y0, x1, y1] = f.inner;
      // piecewise-linear map of the enclosure: bands at natural scale, middle stretched
      const seg = (p, a0, a1, len, k, B0, B1) => (p <= a0 ? p * k : p >= a1 ? B1 - (len - p) * k : a0 * k + (p - a0) * ((B1 - (len - a1) * k) - a0 * k) / Math.max(1e-6, a1 - a0));
      out.push({ node: n.outer, slot: box,
        map: (px, py) => [bx + seg(px, x0 * f.w, x1 * f.w, f.w, kx, 0, bw), by + seg(py, y0 * f.h, y1 * f.h, f.h, ky, 0, bh)] });
      const ix = bx + (b.l + b.gl) * kx, iy = by + (b.t + b.gt) * ky;
      const iw = bw - (b.l + b.gl + b.r + b.gr) * kx, ih = bh - (b.t + b.gt + b.b + b.gb) * ky;
      realize(n.inner, [ix, iy, iw, ih], out);
      return;
    }
    if (n.t === 'pin') {
      const [t, a, b] = n.kids.map(natural);
      const th = (bh - G) * t[1] / (t[1] + Math.max(a[1], b[1]));
      const tw = Math.min(bw, bw * Math.max(0.5, t[0] / Math.max(t[0], a[0] + G + b[0])));
      realize(n.kids[0], [bx + (bw - tw) / 2, by, tw, th], out);
      const aw = (bw - G) * a[0] / (a[0] + b[0]);
      realize(n.kids[1], [bx, by + th + G, aw, bh - th - G], out);
      realize(n.kids[2], [bx + aw + G, by + th + G, bw - aw - G, bh - th - G], out);
    }
  }

  function structName(n) {
    if (n.t === 'leaf') return '独体';
    if (n.t === 'encl') return n.outer.x.r.key === '囗' ? '全包围' : '半包围';
    if (n.t === 'pin') return '品字';
    const k = n.kids;
    if (n.t === 'lr') return k.length === 3 ? '左中右' : k[1].t === 'tb' ? '左 + 上下' : k[0].t === 'tb' ? '上下 + 右' : '左右';
    if (n.t === 'tb') return k.length === 3 ? '上中下' : k[1].t === 'lr' ? '上 + 左右' : k[0].t === 'lr' ? '左右 + 下' : '上下';
    return '';
  }

  /* ------------------------------------------------------------------ path transform */

  function tx(d, f) { // f(x, y) -> [x, y]; also scales arc radii by the local stretch
    const tok = d.match(/[MLHVQAZ]|-?[\d.]+(?:e-?\d+)?/g) || [];
    let i = 0, cx = 0, cy = 0, cmd = '';
    const num = () => +tok[i++];
    const out = [];
    const P = (x, y) => { const p = f(x, y); return p[0].toFixed(2) + ' ' + p[1].toFixed(2); };
    while (i < tok.length) {
      if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
      if (cmd === 'M' || cmd === 'L') { cx = num(); cy = num(); out.push(cmd + P(cx, cy)); if (cmd === 'M') cmd = 'L'; }
      else if (cmd === 'H') { cx = num(); out.push('L' + P(cx, cy)); }
      else if (cmd === 'V') { cy = num(); out.push('L' + P(cx, cy)); }
      else if (cmd === 'Q') { const x1 = num(), y1 = num(); cx = num(); cy = num(); out.push('Q' + P(x1, y1) + ' ' + P(cx, cy)); }
      else if (cmd === 'A') {
        const r1 = num(), r2 = num(), rot = num(), la = num(), sw = num(); cx = num(); cy = num();
        const a = f(0, 0), b = f(1, 1);
        const kx = Math.abs(b[0] - a[0]), ky = Math.abs(b[1] - a[1]);
        out.push(`A${(r1 * kx).toFixed(2)} ${(r2 * ky).toFixed(2)} ${rot} ${la} ${sw} ` + P(cx, cy));
      } else if (cmd === 'Z') { out.push('Z'); cmd = ''; }
      else i++;
    }
    return out.join('');
  }

  /* ------------------------------------------------------------------ seals (family) */
  // All seven outlines pass through (50, TOP) and (50, BOT), so any two can be impaled: left half of one,
  // right half of the other, exactly as heraldry halves two arms on one shield.
  const FW = 3.6;            // rim weight (open frame)
  const TOP = 8 + FW / 2, BOT = 92 - FW / 2;
  const FAMILY = [
    { shape: '圆印', why: '天圆：观天察物，求自然之理', box: [24.5, 24.5, 75.5, 75.5],
      right: () => `A${50 - TOP} ${50 - TOP} 0 0 1 50 ${BOT}`, left: () => `A${50 - TOP} ${50 - TOP} 0 0 1 50 ${TOP}` },
    { shape: '方印', why: '地方 · 矩：造物先要尺规', box: [20, 20, 80, 80],
      right: () => `L87.6 ${TOP}Q${BOT} ${TOP} ${BOT} 12.4L${BOT} 87.6Q${BOT} ${BOT} 87.6 ${BOT}L50 ${BOT}`,
      left: () => `L12.4 ${BOT}Q${TOP} ${BOT} ${TOP} 87.6L${TOP} 12.4Q${TOP} ${TOP} 12.4 ${TOP}L50 ${TOP}` },
    { shape: '椭圆印', why: '卵形：胚胎与细胞', box: [29, 25, 71, 75],
      right: () => `A34.2 ${50 - TOP} 0 0 1 50 ${BOT}`, left: () => `A34.2 ${50 - TOP} 0 0 1 50 ${TOP}` },
    { shape: '碑形', why: '圆首碑：文字刻石，传之久远', box: [28, 30, 72, 80],
      right: () => `A34.2 34.2 0 0 1 84.2 ${TOP + 34.2}L84.2 89.2Q84.2 ${BOT} 83.2 ${BOT}L50 ${BOT}`,
      left: () => `L16.8 ${BOT}Q15.8 ${BOT} 15.8 89.2L15.8 ${TOP + 34.2}A34.2 34.2 0 0 1 50 ${TOP}` },
    { shape: '八角印', why: '八方：众人所居之地', box: [22, 22, 78, 78],
      right: () => `L${92 - 17 - 0.75} ${TOP}L${BOT} ${8 + 17 + 0.75}L${BOT} ${92 - 17 - 0.75}L${92 - 17 - 0.75} ${BOT}L50 ${BOT}`,
      left: () => `L${8 + 17 + 0.75} ${BOT}L${TOP} ${92 - 17 - 0.75}L${TOP} ${8 + 17 + 0.75}L${8 + 17 + 0.75} ${TOP}L50 ${TOP}` },
    { shape: '长方印', why: '关防：明清官署用的长方官印', box: [27, 20, 73, 80],
      right: () => `L81.4 ${TOP}Q83.6 ${TOP} 83.6 12L83.6 88Q83.6 ${BOT} 81.4 ${BOT}L50 ${BOT}`,
      left: () => `L18.6 ${BOT}Q16.4 ${BOT} 16.4 88L16.4 12Q16.4 ${TOP} 18.6 ${TOP}L50 ${TOP}` },
    { shape: '随形印', why: '随形闲章：书画家就石之形，不求方圆', box: [24, 23, 75, 76],
      right: () => `C71 ${TOP} 86.5 15 89 33C91.5 51 90 69 80.5 81C73 ${BOT - 1} 61 ${BOT} 50 ${BOT}`,
      left: () => `C30 ${BOT} 13 84.5 10.5 68.5C9 58 12.5 52 13 44C13.5 27 28 ${TOP} 50 ${TOP}` },
  ];
  const famOf = (it) => (it && it.kind === 'discipline' && it.f >= 0 && it.f < 7 ? it.f : -1);
  const outline = (a, b) => `M50 ${TOP}` + FAMILY[b].right() + FAMILY[a].left() + 'Z';

  /* ------------------------------------------------------------------ course numerals (边款) */
  const NUM = ['', 'M2 10H18', 'M5 5H15 M2 15H18', 'M5 3H15 M6 10H14 M2 17H18', 'M2 2H18V18H2Z M8 2V10 M12 2V8Q12 10 15 10',
    'M3 2H17 M9 2L7 17 M5 9H14V17 M1 17H19', 'M9 0L11 4 M2 7H18 M7 11L3 18 M13 11L17 18', 'M2 9L18 6 M8 1V15Q8 18 11 18H18',
    'M8 3L2 18 M12 3L18 18', 'M8 1Q8 12 2 18 M2 7H13V15Q13 18 16 18H18'];
  const NUM_ZH = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  /* ------------------------------------------------------------------ composing a subject */

  function compose(ctx) {
    const vec = ctx.vec || new Float32Array(256);
    const item = ctx.item || { kind: 'word', f: -1 };
    const n = Math.max(1, Math.min(4, Math.round(+ctx.opts.count || 3)));
    let sel = null, swapped = null, rk = null, parts = null;
    if (n >= 2 && item.kind === 'discipline' && DISC.some((w) => w.zh === item.zh)) {
      const reg = registry(n).get(item.zh);
      sel = reg.list; rk = reg.ranked; swapped = reg.swapped;
    } else if (item.kind === 'combo' && (parts = comboParts(ctx))) {
      // 会意: the new character takes its leading component from each parent, then fills from the blend
      const pa = pick(parts[0].vec, n), pb = pick(parts[1].vec, n), pc = pick(vec, n);
      sel = [];
      const add = (x) => { if (x && sel.length < n && compatible(sel, x.r)) sel.push(x); };
      add(pa.list[0]); add(pb.list[0]);
      for (const x of pc.list) add(x);
      for (const x of pa.list.concat(pb.list)) add(x);
      rk = pc.ranked;
    } else {
      const p = pick(vec, n);
      sel = p.list; rk = p.ranked;
    }
    return { sel, rk, swapped, parts, n };
  }

  function comboParts(ctx) {
    const item = ctx.item || {};
    let names = Array.isArray(item.parts) && item.parts.length === 2 ? item.parts : null;
    if (!names) { const b = String(item.zh || ctx.word || '').split(/\s*[+×]\s*/); if (b.length === 2) names = b; }
    if (!names) return null;
    const out = names.map((p) => {
      const zh = typeof p === 'string' ? p : p && (p.zh || p.word);
      const v = p && p.vec ? p.vec : zh ? L.vec(zh) : null;
      return v ? { zh, vec: v, f: famOf(L.item(zh)) } : null;
    });
    return out[0] && out[1] ? out : null;
  }

  /* ------------------------------------------------------------------ render */

  const SW = 3.1;            // the one stroke weight of every character (viewBox units)
  const SERIF = '"Noto Serif SC","Songti SC","SimSun",serif';
  let uid = 0;

  function render(ctx) {
    const { lab, size, colors } = ctx;
    const S = lab.svg;
    const ink = colors.ink;
    const opts = ctx.opts || {};
    const detail = ctx.mode === 'detail';
    const hover = detail && typeof ctx.hover === 'function' ? ctx.hover : null;
    const item = ctx.item || { kind: 'word', f: -1 };
    const id = 'rad' + (++uid) + '-' + lab.hash(String(ctx.word) + size);

    const C = compose(ctx);
    const fam = famOf(item);
    let famA = fam, famB = fam;
    if (C.parts) { famA = C.parts[0].f; famB = C.parts[1].f; if (famA < 0) famA = famB; if (famB < 0) famB = famA; }
    const framed = famA >= 0;
    const course = item.kind === 'discipline' && ctx.course && ctx.course.level > 0 ? ctx.course : null;
    const sealMode = !!opts.seal && framed;
    const kai = opts.script === 'kai';
    const explain = detail && opts.explain !== false;

    const root = S('svg', { width: size, height: size, viewBox: '0 0 100 100', role: 'img', style: 'display:block;overflow:visible',
      'aria-label': `${ctx.word || ''} ${C.sel.map((x) => x.r.key).join('')}` });
    const g = S('g', explain ? { transform: 'translate(13 1) scale(0.74)' } : {});
    root.appendChild(g);

    // ---- character box
    let box;
    if (framed) {
      const ba = FAMILY[famA].box, bb = FAMILY[famB].box;
      box = [ba[0], Math.max(ba[1], bb[1]), bb[2], Math.min(ba[3], bb[3])];
    } else box = [16, 16, 84, 84];

    // ---- empty state: a faint 米字格, the practice grid of a character not yet written
    if (!C.sel.length) {
      const m = colors.muted || ink;
      const gg = S('g', { fill: 'none', stroke: m, 'stroke-width': 0.6, opacity: 0.5 });
      gg.appendChild(S('rect', { x: 18, y: 18, width: 64, height: 64 }));
      gg.appendChild(S('path', { d: 'M18 18L82 82M82 18L18 82M50 18V82M18 50H82', 'stroke-dasharray': '1.6 2.2' }));
      g.appendChild(gg);
      if (framed) g.appendChild(S('path', { d: outline(famA, famB), fill: 'none', stroke: ink, 'stroke-width': FW, opacity: 0.35 }));
      return root;
    }

    // ---- structure and fit into the box (stroke weight constant: only coordinates are scaled)
    const tree = plan(C.sel, (box[2] - box[0]) / (box[3] - box[1]));
    const [NW, NH] = natural(tree);
    const leaves = [];
    realize(tree, [0, 0, NW, NH], leaves);
    const bw = box[2] - box[0], bh = box[3] - box[1];
    let SX = bw / NW, SY = bh / NH;
    const LIM = 1.4;
    if (SX / SY > LIM) SX = SY * LIM; else if (SY / SX > LIM) SY = SX * LIM;
    const OX = box[0] + (bw - NW * SX) / 2, OY = box[1] + (bh - NH * SY) / 2;

    const glyph = S('g', {});
    const hits = [];
    for (const lf of leaves) {
      const f = (x, y) => { const p = lf.map(x, y); return [OX + p[0] * SX, OY + p[1] * SY]; };
      const r = lf.node.x.r;
      const rect = [OX + lf.slot[0] * SX, OY + lf.slot[1] * SY, lf.slot[2] * SX, lf.slot[3] * SY];
      if (kai) glyph.appendChild(kaiText(S, lf, f, r));
      else glyph.appendChild(S('path', { d: tx(lf.node.f.d, f) }));
      hits.push({ lf, rect });
    }

    // ---- seal
    const outlineD = framed ? outline(famA, famB) : null;
    const notch = course ? [50 - 9, BOT - 6.2, 18, 12.4] : null;
    if (sealMode) {
      const mask = S('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 100, height: 100 });
      mask.appendChild(S('rect', { x: 0, y: 0, width: 100, height: 100, fill: '#fff' }));
      const cut = glyph.cloneNode(true);
      setPaint(cut, '#000', kai);
      mask.appendChild(cut);
      if (notch) mask.appendChild(S('rect', { x: notch[0], y: notch[1] - 2, width: notch[2], height: notch[3] + 6, rx: 1.2, fill: '#000' }));
      const defs = S('defs', {}, [mask]);
      g.appendChild(defs);
      g.appendChild(S('path', { d: outlineD, fill: ink, mask: `url(#${id}m)` }));
    } else {
      if (framed) {
        let rimMask = null;
        if (notch) {
          rimMask = S('mask', { id: id + 'r', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 100, height: 100 });
          rimMask.appendChild(S('rect', { x: 0, y: 0, width: 100, height: 100, fill: '#fff' }));
          rimMask.appendChild(S('rect', { x: notch[0], y: notch[1] - 2, width: notch[2], height: notch[3] + 6, fill: '#000' }));
          g.appendChild(S('defs', {}, [rimMask]));
        }
        g.appendChild(S('path', { d: outlineD, fill: 'none', stroke: ink, 'stroke-width': FW, 'stroke-linejoin': 'round', mask: rimMask ? `url(#${id}r)` : null }));
      }
      setPaint(glyph, ink, kai);
      g.appendChild(glyph);
    }

    // ---- course: the level as a small numeral in a notch at the foot of the rim, like a seal's side mark
    if (course) {
      const k = Math.max(1, Math.min(9, course.level));
      const s = 0.56, nx = 50 - 10 * s, ny = BOT - 10 * s;
      const cg = S('path', { d: tx(NUM[k], (x, y) => [nx + x * s, ny + y * s]), fill: 'none', stroke: ink, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      g.appendChild(cg);
      if (hover) {
        const hit = S('rect', { x: notch[0], y: notch[1], width: notch[2], height: notch[3], fill: 'transparent' });
        bindHover(hit, hover, { title: `课程 · ${course.label}`, sub: `边款「${NUM_ZH[k]}」= ${course.level} 年级${course.level >= 5 ? '（研究生）' : ''}；同一方印，换一处边款` });
        g.appendChild(hit);
      }
    }

    // ---- hover: which radical, which attributes fed it
    if (hover) {
      if (framed) {
        const ring = S('path', { d: outlineD, fill: 'none', stroke: 'transparent', 'stroke-width': 8 });
        const fa = D.families[famA], fb = D.families[famB];
        bindHover(ring, hover, famA === famB
          ? { title: `门类 · ${fa.zh}：${FAMILY[famA].shape}`, sub: FAMILY[famA].why }
          : { title: `拼合 · 左 ${FAMILY[famA].shape}（${fa.zh}）| 右 ${FAMILY[famB].shape}（${fb.zh}）`, sub: '两个门类的印形各取一半，如纹章的左右拼合' });
        g.appendChild(ring);
      }
      for (const h of hits) {
        const r = h.lf.node.x.r;
        const v = ctx.vec || new Float32Array(256);
        const feed = r.attrs.filter(([i]) => v[i] > 0).map(([i, w]) => `${D.attrs[i].zh} ${v[i].toFixed(2)}×${w}`).join('，');
        const ch = h.lf.node.f.ch || r.key;
        const hit = S('rect', { x: h.rect[0], y: h.rect[1], width: h.rect[2], height: h.rect[3], fill: 'transparent' });
        bindHover(hit, hover, { title: `${ch}${ch !== r.key ? '（' + r.key + '）' : ''} · ${r.name} · ${POS_ZH[h.lf.node.pos]}`, sub: `激活 ${h.lf.node.x.a.toFixed(2)} ← ${feed || '无'}` });
        g.appendChild(hit);
      }
    }

    if (explain) drawExplain(root, ctx, C, tree, famA, famB, framed, course);
    return root;
  }

  function setPaint(gEl, color, kai) {
    if (kai) { gEl.setAttribute('fill', color); gEl.setAttribute('stroke', 'none'); return; }
    gEl.setAttribute('fill', 'none');
    gEl.setAttribute('stroke', color);
    gEl.setAttribute('stroke-width', SW);
    gEl.setAttribute('stroke-linecap', 'round');
    gEl.setAttribute('stroke-linejoin', 'round');
  }

  // 楷体部首: the same structure rendered with real radical characters from a serif CJK font.
  // Positional radicals (氵 艹 刂 …) sit at one side of their em square, so the em is placed to put the ink in the slot.
  const EM = { L: [0, 0, 0.42, 1], R: [0.6, 0, 1, 1], T: [0, 0, 1, 0.42], B: [0, 0.62, 1, 1] };
  const SIDE = { '氵': 'L', '亻': 'L', '忄': 'L', '扌': 'L', '讠': 'L', '钅': 'L', '犭': 'L', '礻': 'L', '刂': 'R', '艹': 'T', '宀': 'T', '罒': 'T', '灬': 'B' };
  function kaiText(S, lf, f, r) {
    const ff = lf.node.f;
    const ch = ff.ch || r.key;
    const [x0, y0] = f(0, 0), [x1, y1] = f(ff.w, ff.h);
    let ex = x0, ey = y0, ew = x1 - x0, eh = y1 - y0;
    const em = SIDE[ch] ? EM[SIDE[ch]] : null;
    const over = ch === '囗' ? 1.3 : 1.12;
    if (em) { ew = ew / (em[2] - em[0]); eh = eh / (em[3] - em[1]); ex -= em[0] * ew; ey -= em[1] * eh; }
    else { ex -= ew * (over - 1) / 2; ey -= eh * (over - 1) / 2; ew *= over; eh *= over; }
    const t = S('text', { x: 0, y: 0.88, 'font-family': SERIF, 'font-size': 1, transform: `translate(${ex.toFixed(2)} ${ey.toFixed(2)}) scale(${ew.toFixed(2)} ${eh.toFixed(2)})` });
    t.textContent = ch;
    return t;
  }

  function bindHover(el, hover, info) {
    el.addEventListener('pointerenter', () => hover(info));
    el.addEventListener('pointerleave', () => hover(null));
  }

  // 说文 caption: the character's description, written the way the Shuowen Jiezi (100 CE) describes one: 从某从某.
  function drawExplain(root, ctx, C, tree, famA, famB, framed, course) {
    const S = ctx.lab.svg;
    const ink = ctx.colors.ink, muted = ctx.colors.muted || ink;
    const SANS = "system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', 'WenQuanYi Zen Hei', sans-serif";
    const t1 = S('text', { x: 50, y: 86, 'text-anchor': 'middle', 'font-family': SERIF, 'font-size': 4.6, fill: ink });
    t1.textContent = C.sel.map((x) => '从' + x.r.key).join('　');
    const bits = [structName(tree)];
    if (framed) bits.push(famA === famB ? `${FAMILY[famA].shape} · ${D.families[famA].zh}` : `${FAMILY[famA].shape} | ${FAMILY[famB].shape} 拼合`);
    if (course) bits.push(`${course.label} 边款「${NUM_ZH[Math.min(9, course.level)]}」`);
    const t2 = S('text', { x: 50, y: 92.5, 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 2.7, fill: muted });
    t2.textContent = bits.join(' · ');
    root.appendChild(t1);
    root.appendChild(t2);
    if (C.swapped) {
      const t3 = S('text', { x: 50, y: 97, 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 2.4, fill: muted });
      t3.textContent = `登记：${C.swapped.out.r.key} 已与「${C.swapped.clash}」重合，改用次选 ${C.swapped.in.r.key}`;
      root.appendChild(t3);
    }
  }

  /* ------------------------------------------------------------------ register */

  const swaps = (() => {
    const out = [];
    for (const [zh, v] of registry(3)) if (v.swapped) out.push(`${zh}与${v.swapped.clash}撞车，让出 ${v.swapped.out.r.key} 改用 ${v.swapped.in.r.key}`);
    return out;
  })();
  const about = [
    `<p>汉字是一个开放的系统：几种笔画组成两百来个部件，部件按少数几种结构（左右、上下、包围、品字）拼成几万个字。多数字是形声或会意（休 = 人 + 木），意义由认得出的部件承载，所以读者见到生字也能从部首猜出它属于哪一类：氵与水有关，疒与病有关，钅是金属，贝是钱。一个文化圈共享的不是某几个字，而是这套部件和拼法，新字一造出来就带着“自家人”的样子。字是结构，宋体、楷体只是渲染。徐冰的《天书》用真部件拼出没人认识的字，人人觉得能读，说明这套机制本身就能传达“这是我们的文字”。</p>`,
    `<p>这里每个学科是一个新造的字，刻成一方印。<b>门类</b>是印的外形，共七种：理学圆印（天圆），工学方印（矩尺），生命与健康椭圆印（卵），人文碑形（圆首碑，文字刻石），社科八角印（八方之人），经管法长方印（明清官署的长方官印“关防”），艺术随形印（书画家就石成形的闲章）。外形是远处最先看见的东西，所以交给最高的层级；默认是白文印（墨块里刻出白字），也可切换成只有边框的线框印。<b>学科</b>是印里那个字。<b>课程</b>是印脚缺口里的一个小数字，一、二、三……是年级，像印章的边款：同一方印只换边款，所以一个学科的各门课一眼就是同一个字。交叉学科取两边各自最强的部件合成一个会意字，印形左右各取一半拼起来，就是纹章的左右拼合。</p>`,
    `<p><b>字母</b>是 ${RADS.length} 个部件。每个部件有一个语义画像（2–5 个属性及权重，激活 = 1 − Π(1 − 权重 × 属性值)）和一个字形，所有字形用同一套规矩画：一种笔重，圆头圆角，横平竖直，斜笔和圆弧为辅，竖钩一律一个短回锋。和真汉字一样，部件有位置变体：水在左写作氵，火在下作灬，心在左作忄，言作讠，金作钅，犬作犭，示作礻；艹、宀、罒只做字头，刂只做右旁，囗、疒、辶、气是框。<b>语法</b>：取激活最高的 3 个部件（可调 1–4），先按惯例落位（框 → 头 → 左旁 → 右旁 → 底），剩下的在左右、上下、左中右、品字之间选变形最小的一种；每个部件按自身繁简分到空间，再非均匀地塞进格子，笔画在变换之后才描，所以压得再扁也是同一种粗细。框按九宫格拉伸，框线不变粗，只撑大内部。最后像纹章官登记一样查重：48 个学科按把握从高到低入座，组合撞车的把最弱的部件换成下一个候选${swaps.length ? `。目前有 ${swaps.length} 处：${swaps.join('；')}` : ''}。</p>`,
    `<p>好处是动机强，而且是汉字自己的动机：天文学是 星 压在 明 上（古文 曐 正是三星加生），化学是 气 裹着 火 和 皿（近代化学正是用 气、钅、石、氵 给元素造字），政治学是 囗 里有 戈（國 = 囗 + 或，或 字从戈），教育学是 爻、冊、子（學 字本有爻有子）。懂汉字的人能读出大意，不懂的人也看得出这是一族字。部件可学，规则写得出来，新学科来了按规则就有字。</p>`,
    `<p>问题也明显。这些字念不出来，也不在任何字典里，懂汉字的人会本能地去认，认不出可能当成错字。三个部件挤进一方印，48px 时笔画已经密成一团，门类主要靠印形认。部件数调成 1 时只剩部首，相近的学科会同部首（这本来就是部首的意思），不再保证唯一。课号后两位没有画，同年级的课共用一方印。楷体模式依赖本机字体，部件位置是估算的，压扁后粗细也会变，几何笔画才是本体。</p>`,
  ].join('');

  L.register({
    id: 'radicals',
    order: 5,
    name: '字根',
    en: 'Radicals',
    tagline: '部件按汉字结构合成一个新字，刻进门类的印',
    dims: `${RADS.length} 个部件各有一个属性画像（2–5 个属性带权重），按加权概率或算出激活，取最高的 3 个（1–4 可调）按汉字结构合成；48 个学科再做一次查重，保证 2–4 个部件时组合互不相同。`,
    lineage: '前人：许慎《说文解字》（约公元 100 年）的六书与“从某从某”的说解；梅膺祚《字汇》（1615）立 214 部，《康熙字典》（1716）沿用；Charles Bliss《Semantography》（1949）受汉字启发的表意符号；徐冰《天书》（1988 年首展）；明清官印与文人篆刻的印式（方、圆、长方、随形）。',
    about,
    controls: [
      { id: 'script', label: '字体', type: 'select', value: 'geo',
        options: [{ value: 'geo', label: '几何笔画' }, { value: 'kai', label: '楷体部首' }] },
      { id: 'count', label: '部件数', type: 'range', min: 1, max: 4, step: 1, value: 3 },
      { id: 'seal', label: '白文印', type: 'toggle', value: true },
      { id: 'explain', label: '说文', type: 'toggle', value: true },
    ],
    render,
    // for inspection / tests (not used by the shell)
    analyze: (vec, item, opts) => compose({ vec, item, opts: Object.assign({ count: 3 }, opts || {}) }),
    alphabet: RADS,
    pathTransform: tx,
  });
})();
