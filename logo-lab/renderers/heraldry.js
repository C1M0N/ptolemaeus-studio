// 盾徽 Heraldry — a study of why coats of arms work as a collective identity system.
// Family = field division (one per family), discipline = tinctures + ordinary (+ its line) + charge(s),
// course = a mark of cadency. Every layer is drawn by one rule: counterchange. The painted region is the
// parity (XOR) of the stacked layers — division, ordinary, charges, cadency mark — so any two touching areas
// always differ in tincture: the rule of tincture is enforced by construction.
(function () {
  const L = window.LogoLab;
  const D = L.data;
  const N = 256;

  /* ================================================================ semantics */

  const IDX = new Map(D.attrs.map((a) => [a.zh, a.i]));
  // '星辰3 夜晚1' -> [[i, w], ...]
  function prof(spec) {
    return spec.trim().split(/\s+/).map((tok) => {
      const m = tok.match(/^(.+?)(-?[\d.]+)$/);
      const i = IDX.get(m[1]);
      if (i == null) throw new Error('heraldry: unknown attribute ' + m[1]);
      return [i, +m[2]];
    });
  }
  function norm(p) { let s = 0; for (const [, w] of p) s += w * w; return Math.sqrt(s) || 1; }
  function score(vec, p) { let s = 0; for (const [i, w] of p) s += w * vec[i]; return s / norm(p); }
  function vecNorm(v) { let s = 0; for (let i = 0; i < N; i++) s += v[i] * v[i]; return Math.sqrt(s); }

  // --- tinctures: two metals, five colours (the classical seven). Petra Sancta hatching for monochrome.
  const TINCT = {
    or: { en: 'Or', zh: '金', metal: true, hex: '#D4A12E', p: prof('金色2 黄1.5 太阳1.5 光1 财富1.5 王权1 珍贵1 闪耀1 喜悦0.5 骄傲0.3') },
    argent: { en: 'Argent', zh: '银', metal: true, hex: '#F2F0EA', p: prof('白1.5 银色2 纯洁1.5 月亮1 真0.8 平静0.6 冰0.5 雪0.5 透明0.5 简单0.6 理性0.4') },
    gules: { en: 'Gules', zh: '红', metal: false, hex: '#C23A30', p: prof('红2 血1.5 火1.5 炽热1 勇气1 力量1 爱1 愤怒1 冲突1 暴力1 心脏1 兴奋0.6 危险0.5') },
    azure: { en: 'Azure', zh: '蓝', metal: false, hex: '#2A58A6', p: prof('蓝2 天空1.5 水1.2 海洋1.5 河流1 寒冷0.5 平静0.5 无限0.6 风0.5 雨0.5 理性0.5 星辰0.5') },
    vert: { en: 'Vert', zh: '绿', metal: false, hex: '#2C7A53', p: prof('绿2 植物1.5 生长1.2 森林1.2 生命1 春天1 希望0.5 田野1 种子0.5 养育0.4') },
    purpure: { en: 'Purpure', zh: '紫', metal: false, hex: '#6E3F8E', p: prof('紫2 王权0.8 神秘1.2 神圣1 宗教1 梦境1 想象1 魔法1 神话1 敬畏0.5 浪漫0.5 艺术0.6') },
    sable: { en: 'Sable', zh: '黑', metal: false, hex: '#1E1F24', p: prof('黑2 暗1.5 夜晚1 死亡1 地下1 石0.7 金属0.7 坚硬0.7 沉重0.7 机械0.7 电子0.5 规则0.6 悲伤0.5 古老0.3') },
  };
  const METALS = ['or', 'argent'];
  const COLOURS = ['gules', 'azure', 'vert', 'purpure', 'sable'];

  // --- family divisions (convention, assigned once; the shield shape never changes)
  const DIVISION = [
    { key: 'quarterly', en: 'Quarterly', zh: '四分', why: '坐标轴把平面分成四个象限' },
    { key: 'chevron', en: 'Per chevron', zh: '人字分', why: '屋架与桁架的人字形' },
    { key: 'pale', en: 'Per pale', zh: '纵分', why: '身体左右对称' },
    { key: 'fess', en: 'Per fess', zh: '横分', why: '地平线：上是今天，下是过去' },
    { key: 'gyronny', en: 'Gyronny of eight', zh: '八旋分', why: '众人围着一个中心' },
    { key: 'bendsin', en: 'Per bend sinister', zh: '反斜分', why: '自左下向右上的走势线' },
    { key: 'saltire', en: 'Per saltire', zh: '斜十字分', why: '两束交叉的舞台光' },
  ];

  // --- ordinaries: the big geometric bands. Profiles say which meaning each band carries.
  const ORD = {
    fess: { en: 'fess', zh: '横带', lines: ['wavy', 'indented', 'embattled'], p: prof('静止1 平静1 恒定1 低伏1 田野1 海洋0.8 沙漠0.5 平衡0.6 整体0.5 沉重0.5 道路0.5 时间0.4') },
    pale: { en: 'pale', zh: '竖带', lines: ['wavy', 'indented'], p: prof('高耸1.5 上升1 修长1 直线1 专注1 意志0.6 权威0.5 建筑0.3') },
    bend: { en: 'bend', zh: '斜带', lines: ['wavy', 'indented', 'embattled'], p: prof('迅速1.2 流动1 变化1 飞翔1 风1 光0.6 坠落0.5 偶然0.5 电0.6 未来0.5') },
    chevron: { en: 'chevron', zh: '人字带', lines: ['wavy', 'indented', 'embattled'], p: prof('建筑1 家1 合作1 上升0.8 养育0.6 方正0.5 机械0.5 工具0.6') },
    cross: { en: 'cross', zh: '十字', lines: ['wavy', 'indented'], p: prof('连接1.5 网络1 交流1 道路1 对称0.6 平衡0.5 群体0.3 秩序0.3') },
    saltire: { en: 'saltire', zh: '斜十字', lines: ['wavy', 'indented'], p: prof('对立1.5 冲突1.5 偶然0.5 混沌0.6 分离0.6 连接0.4 交流0.3') },
    chief: { en: 'chief', zh: '盾首', lines: ['wavy', 'indented', 'embattled'], p: prof('权威1.5 王权1 天空1 知识1 觉悟0.6 传统0.6 古老0.6 神明0.6 规则0.5') },
    bordure: { en: 'bordure', zh: '镶边', lines: [], p: prof('封闭1.5 容器1 家1 安心1 整体1 养育0.6 规则0.5 向心1') },
    pile: { en: 'pile', zh: '尖楔', lines: [], p: prof('光1.5 觉悟1 专注1 尖锐1 坠落0.5 神圣0.7 向心0.5') },
  };
  // an ordinary whose lines coincide with the family division would merge with it
  const EXCLUDE = {
    quarterly: ['pale', 'fess', 'cross'], chevron: ['chevron'], pale: ['pale', 'cross'], fess: ['fess', 'cross', 'chief'],
    gyronny: ['pale', 'fess', 'cross', 'saltire', 'bend'], bendsin: ['bend', 'saltire'], saltire: ['saltire', 'bend', 'cross'],
  };

  // --- lines of partition (the edge of the ordinary)
  const LINE = {
    plain: { en: '', zh: '' },
    wavy: { en: 'wavy', zh: '波纹', p: prof('水1.5 流动1.5 海洋1 河流1 曲线0.8 雨0.5 悦耳0.6 脉动0.6 音乐0.4') },
    indented: { en: 'indented', zh: '锯齿', p: prof('尖锐1.5 电1.5 爆发1 危险1 风暴1 火0.6 刺耳0.6 冲突0.4') },
    embattled: { en: 'embattled', zh: '城垛', p: prof('建筑1.5 城市1 坚硬1 武器1 方正1 权威0.5 规则0.5 冲突0.4') },
  };
  const LINE_MIN = 0.34; // below this (normalised score) the edge stays plain

  // --- counts
  const COUNT = [
    { n: 1, p: prof('向心1 整体1 个体1 巨大0.7 简单1 专注0.7') },
    { n: 2, p: prof('对立1.5 对称1 平衡1 连接0.7 交流0.5 合作0.5') },
    { n: 3, p: prof('分散1.5 群体1 碎片1 复杂0.7 多彩0.5') },
  ];

  // --- charges: name, blazon, semantic profile. Drawn in DRAW below.
  const CH = {
    mullet: { zh: '星', en: ['mullet', 'mullets'], p: '星辰3 夜晚1 天空1 闪耀1 光0.5 希望0.5' },
    sun: { zh: '日', en: ['sun in splendour', 'suns in splendour'], p: '太阳3 光2 炽热1 金色1 黄1 觉悟0.5 喜悦0.5' },
    crescent: { zh: '新月', en: ['crescent', 'crescents'], p: '月亮3 夜晚1.5 梦境0.7 银色0.7 循环0.5' },
    coin: { zh: '方孔钱', en: ['coin pierced square', 'coins pierced square'], p: '财富3 金色1.5 数字0.7 珍贵1 贪婪1 循环0.5' },
    crystal: { zh: '晶', en: ['crystal', 'crystals'], p: '晶体3 宝石1.5 坚硬1 实在1 对称0.5 金属0.5' },
    fountain: { zh: '泉', en: ['fountain', 'fountains'], p: '海洋3 水2 河流1 流动1 蓝1 湿润0.5' },
    mount: { zh: '山', en: ['triple mount', 'triple mounts'], p: '山岳3 石1.5 土1.5 高耸0.5 古老0.5 坚硬0.5' },
    tower: { zh: '塔', en: ['tower', 'towers'], p: '建筑3 城市1.5 方正1 高耸1 石1 安心0.5' },
    key: { zh: '钥', en: ['key', 'keys'], p: '神秘1 封闭1 开放1 安心1 规则1 秩序1 财富0.5 权威0.7 专注0.5' },
    book: { zh: '书', en: ['book open', 'books open'], p: '文字3 知识2 故事1.5 记忆0.5 传统0.5' },
    gear: { zh: '齿轮', en: ['cogwheel', 'cogwheels'], p: '机械3 旋转2 工具1.5 金属1 循环0.5' },
    flame: { zh: '焰', en: ['flame', 'flames'], p: '火3 炽热2 爆发1 神圣0.7 光0.5 变化0.5' },
    sprout: { zh: '苗', en: ['sprout', 'sprouts'], p: '养育2 生长2.5 种子1.5 植物1.5 绿1 希望1 春天1' },
    tree: { zh: '树', en: ['tree', 'trees'], p: '森林3 植物1.5 生命1.5 连接1 整体1 和谐1 生长0.5' },
    garb: { zh: '禾束', en: ['garb', 'garbs'], p: '田野3 食物2 种子2 植物1 黄1 养育0.7 土0.5' },
    eye: { zh: '目', en: ['eye', 'eyes'], p: '眼睛3 好奇0.8 真0.5 专注0.5 光0.3' },
    heart: { zh: '心', en: ['heart', 'hearts'], p: '心脏3 爱2 血1 慈悲1 温柔1' },
    scales: { zh: '天平', en: ['pair of scales', 'pairs of scales'], p: '正义3 平衡2.5 规则1 对称0.5' },
    crown: { zh: '冠', en: ['crown', 'crowns'], p: '王权3 权威2.5 力量1 骄傲0.8 金色0.5' },
    lyre: { zh: '琴', en: ['lyre', 'lyres'], p: '音乐3 悦耳2.5 和谐1' },
    bolt: { zh: '闪电', en: ['thunderbolt', 'thunderbolts'], p: '电3 电子1 风暴1.5 爆发1 迅速1 脉动0.5' },
    quill: { zh: '羽笔', en: ['quill', 'quills'], p: '文字2 故事2 想象1 轻盈0.5 浪漫0.5 梦境0.5' },
    mask: { zh: '面具', en: ['mask', 'masks'], p: '游戏1.5 故事1.5 对立1 冲突1 嘴0.7 红0.5 虚幻0.7 仪式0.7 幽默0.7' },
    vol: { zh: '双翼', en: ['vol', 'vols'], p: '飞翔3 翅膀3 上升1.5 天空1 轻盈1 自由0.7' },
    flask: { zh: '烧瓶', en: ['flask', 'flasks'], p: '容器2 变化2 烟雾1.5 科学1 爆发0.7 多彩0.5 晶体0.3' },
    atom: { zh: '原子', en: ['atom', 'atoms'], p: '科学1.5 旋转1.5 力量1 微小1 光0.7 因果0.7 时间0.5 电0.5' },
    hourglass: { zh: '沙漏', en: ['hourglass', 'hourglasses'], p: '时间3 古老1.5 记忆1 短暂1 沙尘1 终结0.5' },
    infinity: { zh: '无穷', en: ['lemniscate', 'lemniscates'], p: '无限3 永恒1.5 理性1 数字1 对称1 真0.5' },
    globe: { zh: '地球', en: ['globe', 'globes'], p: '异乡1.5 土1.5 圆润1 河流0.7 山岳0.7 巨大0.7 整体0.7 斑纹0.5' },
    cloud: { zh: '云', en: ['cloud raining', 'clouds raining'], p: '风2 雨2 天空1.5 风暴1 变化0.5' },
    binary: { zh: '一零', en: ['one and nought', 'ones and noughts'], p: '数字2 电子1.5 网络1 现代1 迅速0.7 未来0.5 理性0.5' },
    spark: { zh: '星芒', en: ['estoile of four points', 'estoiles of four points'], p: '聪慧2.5 未来1.5 魔法1 闪耀1 想象0.5 知识0.5 现代0.5' },
    network: { zh: '网', en: ['network', 'networks'], p: '网络3 连接2.5 复杂1 脉动0.5 交流0.5' },
    bridge: { zh: '桥', en: ['bridge of one arch', 'bridges'], p: '道路3 连接1.5 建筑1 石1 城市0.5 河流0.5' },
    drop: { zh: '水滴', en: ['goutte', 'gouttes'], p: '纯洁2.5 水2 湿润1 雨1 透明0.5' },
    helix: { zh: '双螺旋', en: ['double helix', 'double helices'], p: '生命2.5 诞生1 生长1 变化1 动物0.7 微小0.5 科学0.5' },
    rod: { zh: '蛇杖', en: ['rod of Asclepius', 'rods of Asclepius'], p: '药2 身体1.5 疾病1.5 慈悲1 生命0.7 心脏0.5 血0.5' },
    capsule: { zh: '药囊', en: ['capsule', 'capsules'], p: '药3 毒1.5 苦1 疾病1 微小0.5 容器0.5' },
    horn: { zh: '号筒', en: ['speaking-trumpet', 'speaking-trumpets'], p: '交流2 响亮2.5 群体1 网络0.7 真0.5 迅速0.5' },
    speech: { zh: '话框', en: ['speech scroll', 'speech scrolls'], p: '嘴3 交流2 规则0.7 文字0.7 异乡0.5' },
    lamp: { zh: '灯', en: ['lamp of learning', 'lamps of learning'], p: '觉悟2.5 知识2 理性1 聪慧1 光1 真0.7 古老0.5' },
    hand: { zh: '手', en: ['hand appaumé', 'hands appaumé'], p: '手3 人1.5 仪式0.7 传统0.7 异乡0.7 合作0.5' },
    hive: { zh: '蜂巢', en: ['beehive', 'beehives'], p: '群体2.5 合作2 城市1 家1 平凡0.7 养育0.5' },
    butterfly: { zh: '蝶', en: ['butterfly', 'butterflies'], p: '梦境2 直觉2 记忆1.5 虚幻1 疯狂0.7 神秘0.5 轻盈0.5' },
    arrow: { zh: '升矢', en: ['arrow rising', 'arrows rising'], p: '上升2.5 迅速1.5 未来1 专注0.7 贪婪0.5' },
    die: { zh: '骰', en: ['die', 'dice'], p: '偶然3 游戏1.5 数字1 分散0.7' },
    palette: { zh: '调色板', en: ['palette', 'palettes'], p: '多彩2.5 艺术1.5 美1.5 鲜艳1 手0.5 想象0.5' },
    compass: { zh: '圆规', en: ['pair of compasses', 'pairs of compasses'], p: '工具2 简单1.5 现代1 和谐1 平衡1 规则0.5 方正0.5' },
    reel: { zh: '片盘', en: ['film reel', 'film reels'], p: '光1 故事1 梦境1 虚幻1 暗1 时间0.5 现代0.5' },
    tomoe: { zh: '三巴', en: ['triple tomoe', 'triple tomoe'], p: '旋转2 流动2 曲线1.5 轻盈1 脉动1 循环1' },
    amphora: { zh: '陶罐', en: ['amphora broken', 'amphorae broken'], p: '古老2 碎片2 地下1.5 容器1 土0.7 传统0.5' },
    flower: { zh: '玫瑰', en: ['rose', 'roses'], p: '花朵3 芳香1.5 美1 春天1 浪漫0.5' },
    cross: { zh: '十字', en: ['cross couped', 'crosses couped'], p: '安心1.5 疾病1.5 慈悲1 善1 群体0.7 药0.7 纯洁0.5' },
  };
  const CH_KEYS = Object.keys(CH);
  for (const k of CH_KEYS) CH[k].prof = prof(CH[k].p);

  // --- marks of cadency (English system): 1 label … 9 octofoil
  const CADENCY = [
    null,
    { zh: '三齿横标', en: 'a label', son: '长子' },
    { zh: '新月', en: 'a crescent', son: '次子' },
    { zh: '星', en: 'a mullet', son: '三子' },
    { zh: '无足燕', en: 'a martlet', son: '四子' },
    { zh: '圆环', en: 'an annulet', son: '五子' },
    { zh: '百合', en: 'a fleur-de-lis', son: '六子' },
    { zh: '玫瑰', en: 'a rose', son: '七子' },
    { zh: '磨铁十字', en: 'a cross moline', son: '八子' },
    { zh: '八叶', en: 'an octofoil', son: '九子' },
  ];

  /* ---------------------------------------------------------------- arms */

  function pickTinctures(vec) {
    const sc = {};
    for (const k in TINCT) sc[k] = score(vec, TINCT[k].p);
    const metal = METALS.slice().sort((a, b) => sc[b] - sc[a] || (a < b ? -1 : 1))[0];
    const colour = COLOURS.slice().sort((a, b) => sc[b] - sc[a] || (a < b ? -1 : 1))[0];
    // the stronger of the two is named first (it takes the dexter / chief part of the division)
    return sc[colour] > sc[metal] ? [colour, metal] : [metal, colour];
  }

  function rankOrdinaries(vec, div) {
    const ex = div ? EXCLUDE[div] : [];
    return Object.keys(ORD).filter((k) => !ex.includes(k))
      .map((k) => ({ k, s: score(vec, ORD[k].p) }))
      .sort((a, b) => b.s - a.s || (a.k < b.k ? -1 : 1));
  }

  function pickLine(vec, ord) {
    let best = 'plain', bs = LINE_MIN;
    for (const k of ORD[ord].lines) {
      const s = score(vec, LINE[k].p);
      if (s > bs) { bs = s; best = k; }
    }
    return best;
  }

  // One charge unless the subject is clearly about two (a pair, facing) or many (a triad, two and one) —
  // the kamon way of inflecting a motif (二つ, 三つ) without changing it.
  const COUNT_MARGIN = 0.3;
  function pickCount(vec) {
    const s = COUNT.map((c) => score(vec, c.p));
    let best = 1;
    if (s[2] > s[0] + COUNT_MARGIN && s[2] >= s[1]) best = 3;
    else if (s[1] > s[0] + COUNT_MARGIN) best = 2;
    return best;
  }

  function rankCharges(vec) {
    const vn = vecNorm(vec) || 1;
    return CH_KEYS.map((k) => ({ k, s: score(vec, CH[k].prof) / vn })).sort((a, b) => b.s - a.s || (a.k < b.k ? -1 : 1));
  }

  // The register: the 48 disciplines are assigned together, like a college of arms. Charges are handed out
  // by best global fit, never twice within a family and at most twice overall; ordinaries are spread within a
  // family so siblings differ in more than one feature. The herald's corrections (REGISTER_FIX) are listed
  // openly: the algorithm proposes, a person decides.
  const REGISTER_FIX = {};
  const REGISTER = (() => {
    const disc = D.words.filter((w) => w.kind === 'discipline').map((w) => ({ w, vec: L.toVec(w.r) }));
    const out = new Map();
    // charges
    const pairs = [];
    disc.forEach((d, di) => rankCharges(d.vec).forEach((c, rank) => pairs.push({ di, k: c.k, s: c.s, rank })));
    pairs.sort((a, b) => b.s - a.s || a.di - b.di || (a.k < b.k ? -1 : 1));
    const charge = new Array(disc.length).fill(null);
    const usedFam = new Set(), usedAll = new Map();
    for (const d of disc) {
      const fx = REGISTER_FIX[d.w.zh];
      if (fx && fx.charge) { const di = disc.indexOf(d); charge[di] = fx.charge; usedFam.add(d.w.f + ':' + fx.charge); usedAll.set(fx.charge, (usedAll.get(fx.charge) || 0) + 1); }
    }
    for (const p of pairs) {
      if (charge[p.di]) continue;
      const f = disc[p.di].w.f;
      if (usedFam.has(f + ':' + p.k) || (usedAll.get(p.k) || 0) >= 2) continue;
      charge[p.di] = p.k;
      usedFam.add(f + ':' + p.k);
      usedAll.set(p.k, (usedAll.get(p.k) || 0) + 1);
    }
    // ordinaries, spread within each family (strongest discipline chooses first)
    const famUse = {};
    const order = disc.map((d, di) => ({ di, s: rankOrdinaries(d.vec, DIVISION[d.w.f].key)[0].s })).sort((a, b) => b.s - a.s || a.di - b.di);
    const ordinary = [];
    for (const { di } of order) {
      const d = disc[di], f = d.w.f;
      const fx = REGISTER_FIX[d.w.zh];
      famUse[f] = famUse[f] || {};
      let k;
      if (fx && fx.ordinary) k = fx.ordinary;
      else {
        const r = rankOrdinaries(d.vec, DIVISION[f].key).map((o) => ({ k: o.k, s: o.s - 0.12 * (famUse[f][o.k] || 0) }));
        r.sort((a, b) => b.s - a.s || (a.k < b.k ? -1 : 1));
        k = r[0].k;
      }
      famUse[f][k] = (famUse[f][k] || 0) + 1;
      ordinary[di] = k;
    }
    disc.forEach((d, di) => {
      const fx = REGISTER_FIX[d.w.zh] || {};
      const ord = ordinary[di];
      out.set(d.w.zh, {
        f: d.w.f, div: DIVISION[d.w.f].key,
        t: fx.t || pickTinctures(d.vec),
        ord, line: fx.line || pickLine(d.vec, ord),
        charge: charge[di], n: fx.n || pickCount(d.vec),
      });
    });
    return out;
  })();

  function isZero(vec) { for (let i = 0; i < N; i++) if (vec[i] > 0) return false; return true; }

  // arms for any vector: registered disciplines use the register, anything else is blazoned on the spot
  function armsOf(vec, item) {
    if (!vec || isZero(vec)) return null;
    const zh = item && item.zh;
    const fam = item && item.kind === 'discipline' && item.f >= 0 && item.f < 7 ? item.f : -1;
    if (fam >= 0 && REGISTER.has(zh)) return Object.assign({ zh }, REGISTER.get(zh));
    const div = fam >= 0 ? DIVISION[fam].key : null;
    const ord = rankOrdinaries(vec, div)[0].k;
    return { zh, f: fam, div, t: pickTinctures(vec), ord, line: pickLine(vec, ord), charge: rankCharges(vec)[0].k, n: pickCount(vec) };
  }

  /* ---------------------------------------------------------------- blazon */

  const NUM_EN = ['', 'a', 'two', 'three'];
  const NUM_ZH = ['', '一', '二', '三'];
  function chargePhrase(c, n) {
    const e = CH[c].en;
    if (n === 1) return (/^[aeiou]/i.test(e[0]) ? 'an ' : 'a ') + e[0];
    return NUM_EN[n] + ' ' + e[1] + (n === 2 ? ' in fess' : '');
  }
  function chargeZh(c, n) { return NUM_ZH[n] + CH[c].zh + (n === 2 ? '并列' : n === 3 ? '品字' : ''); }

  function blazon(a) {
    const o = ORD[a.ord], ln = LINE[a.line];
    const oe = 'a ' + o.en + (ln.en ? ' ' + ln.en : ''), oz = (ln.zh || '') + o.zh;
    const ce = chargePhrase(a.charge, a.n), cz = chargeZh(a.charge, a.n);
    let pe, pz;
    if (a.ord === 'chief') { pe = `${ce}, ${oe}`; pz = `${cz}，${oz}`; }
    else if (a.ord === 'bordure') { pe = `${ce} within ${oe}`; pz = `${cz}，${oz}`; }
    else { pe = `${oe}, over all ${ce}`; pz = `${oz}，压${cz}`; }
    const t1 = TINCT[a.t[0]], t2 = TINCT[a.t[1]];
    if (a.div) {
      const dv = DIVISION.find((d) => d.key === a.div);
      return { en: `${dv.en} ${t1.en} and ${t2.en}, ${pe}, all counterchanged`, zh: `${t1.zh}${t2.zh}${dv.zh}，${pz}，互换色` };
    }
    return { en: `${t1.en}, ${pe}, ${t2.en}`, zh: `${t1.zh}底，${pz}，皆${t2.zh}` };
  }

  /* ================================================================ geometry */
  // Design space: the heater shield in a 100 × 100 box. Outer contour: flat top at y 8, straight sides
  // to y 40, two arcs (radius 56.13, centres on the line y 40) meeting at the point (50, 92).
  // The field is inset by 3 units from the contour line: a quiet gap, so the silhouette is constant.

  const INSET = 3;
  const RH = 56.13;
  const SHAPES = {
    heater: {
      path(i) {
        const r = RH - i, yb = 40 + Math.sqrt(r * r - Math.pow(50 - (85 - RH), 2));
        return `M${15 + i} ${8 + i}H${85 - i}V40A${r} ${r} 0 0 1 50 ${yb.toFixed(3)}A${r} ${r} 0 0 1 ${15 + i} 40Z`;
      },
      frame: { x0: 18, x1: 82, y0: 11, y1: 88.75, F: [50, 46], B: 12, k: 1 },
    },
    square: {
      path(i) { return `M${13 + i} ${13 + i}H${87 - i}V${87 - i}H${13 + i}Z`; },
      frame: { x0: 16, x1: 84, y0: 16, y1: 84, F: [50, 50], B: 12.5, k: 1 },
    },
    round: {
      path(i) { const r = 41 - i; return `M${50 - r} 50A${r} ${r} 0 1 1 ${50 + r} 50A${r} ${r} 0 1 1 ${50 - r} 50Z`; },
      frame: { x0: 12, x1: 88, y0: 12, y1: 88, F: [50, 50], B: 12, k: 0.95, round: 38 },
    },
  };

  // heater design coordinates -> a frame (whole field, or one half of an impaled field)
  function mapY(fr, y) {
    const [, fy] = fr.F;
    return y < 46 ? fy - (46 - y) * (fy - fr.y0) / 35 : fy + (y - 46) * (fr.y1 - fy) / 42.75;
  }
  function mapPt(fr, x, y) { return [fr.F[0] + (x - 50) * fr.sx, mapY(fr, y)]; }

  // Where the motif sits (heater coordinates: centre x, y and size) and where a cadency mark goes.
  // The motif always holds the centre, "over all": the ordinary passes behind it.
  const FIGURE = {
    chief: { c: [50, 58.5, 33], mark: [50, 21] },
    bordure: { c: [50, 49, 33], mark: [50, 23.5] },
    pile: { c: [50, 39, 27], mark: [50, 17.5] },
    fess: { c: [50, 47, 36], mark: [50, 18.5] },
  };
  const FIGURE_DEFAULT = { c: [50, 46.5, 36], mark: [50, 18.5] };
  // kamon-style inflection of the motif: one, a pair (side by side), a triad (two and one)
  const GROUP = {
    1: [[0, 0, 1]],
    2: [[-0.3, 0, 0.58], [0.3, 0, 0.58]],
    3: [[-0.29, -0.24, 0.54], [0.29, -0.24, 0.54], [0, 0.27, 0.54]],
  };
  const MARK_SIZE = 10;
  const GAP = 2.6; // stencil gap between the motif and the ordinary behind it

  // ---- line patterns along a straight segment. Returns [[s, d], ...] for s in [s0, s1].
  const LP = { a: 2.4, p: 17, ind: 2.4, pi: 10, h: 3.4, pe: 12 };
  function lineSamples(line, s0, s1) {
    const out = [];
    if (line === 'wavy') {
      const n = Math.max(2, Math.ceil((s1 - s0) / 0.6));
      for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; out.push([s, LP.a * Math.cos(2 * Math.PI * s / LP.p)]); }
    } else if (line === 'indented') {
      const tri = (s) => { const u = ((s / LP.pi) % 1 + 1) % 1; return LP.ind * (4 * Math.abs(u - 0.5) - 1); };
      out.push([s0, tri(s0)]);
      for (let k = Math.ceil(s0 / (LP.pi / 2)); k * LP.pi / 2 < s1; k++) { const s = k * LP.pi / 2; if (s > s0) out.push([s, tri(s)]); }
      out.push([s1, tri(s1)]);
    } else if (line === 'embattled') {
      const on = (s) => Math.abs((((s / LP.pe) + 0.5) % 1 + 1) % 1 - 0.5) < 0.25;
      const val = (s) => (on(s) ? LP.h : 0);
      out.push([s0, val(s0)]);
      const q = LP.pe / 4;
      for (let k = Math.ceil((s0 - q) / (2 * q)); ; k++) {
        const s = q + 2 * q * k; // breakpoints at pe/4 + n·pe/2
        if (s >= s1) break;
        if (s <= s0) continue;
        out.push([s, val(s - 1e-6)], [s, val(s + 1e-6)]);
      }
      out.push([s1, val(s1)]);
    } else out.push([s0, 0], [s1, 0]);
    return out;
  }
  const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
  // edge offsets for a band: top / bottom displacement in the "up" normal direction
  function bandEdges(line, w) {
    if (line === 'embattled') return { top: (d) => w / 2 - LP.h / 2 + d, bot: () => -w / 2 };
    return { top: (d) => w / 2 + d, bot: (d) => -w / 2 + d };
  }
  // straight band through anchor O along u (unit), s in [s0, s1]
  function band(O, u, nUp, w, line, s0, s1) {
    const sm = lineSamples(line, s0, s1), e = bandEdges(line, w);
    const top = sm.map(([s, d]) => add(add(O, u, s), nUp, e.top(d)));
    const bot = sm.map(([s, d]) => add(add(O, u, s), nUp, e.bot(d)));
    return top.concat(bot.reverse());
  }
  // chevron band with apex A, arms at 45°
  function chevronBand(A, w, line, len) {
    const r2 = Math.SQRT1_2;
    const uL = [-r2, r2], uR = [r2, r2], nL = [-r2, -r2], nR = [r2, -r2];
    const sm = lineSamples(line, 0, len), e = bandEdges(line, w);
    const d0 = sm[0][1];
    const tL = sm.map(([s, d]) => add(add(A, uL, s), nL, e.top(d)));
    const tR = sm.map(([s, d]) => add(add(A, uR, s), nR, e.top(d)));
    const bL = sm.map(([s, d]) => add(add(A, uL, s), nL, e.bot(d)));
    const bR = sm.map(([s, d]) => add(add(A, uR, s), nR, e.bot(d)));
    const mt = [A[0], A[1] - e.top(d0) * Math.SQRT2], mb = [A[0], A[1] - e.bot(d0) * Math.SQRT2];
    return tL.slice().reverse().concat([mt], tR, bR.slice().reverse(), [mb], bL);
  }
  const ptsD = (pts) => 'M' + pts.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z';

  // polygons (as path data) for the family division (region of the second tincture)
  function divisionPaths(div, fr) {
    const [fx, fy] = fr.F, X0 = fr.x0 - 30, X1 = fr.x1 + 30, Y0 = fr.y0 - 30, Y1 = fr.y1 + 30;
    const R = 160;
    switch (div) {
      case 'pale': return [ptsD([[fx, Y0], [X1, Y0], [X1, Y1], [fx, Y1]])];
      case 'fess': return [ptsD([[X0, fy], [X1, fy], [X1, Y1], [X0, Y1]])];
      case 'quarterly': return [ptsD([[fx, Y0], [X1, Y0], [X1, fy], [fx, fy]]), ptsD([[X0, fy], [fx, fy], [fx, Y1], [X0, Y1]])];
      case 'bendsin': return [ptsD([[fx - R, fy + R], [fx + R, fy - R], [fx + 2 * R, fy], [fx, fy + 2 * R]])];
      case 'chevron': { const ay = mapY(fr, 36); return [ptsD([[fx, ay], [fx + R, ay + R], [fx - R, ay + R]])]; }
      case 'saltire': return [ptsD([fr.F, [fx - R, fy - R], [fx - R, fy + R]]), ptsD([fr.F, [fx + R, fy - R], [fx + R, fy + R]])];
      case 'gyronny': {
        const out = [];
        for (let k = 1; k < 8; k += 2) {
          const a0 = (-90 + k * 45) * Math.PI / 180, a1 = a0 + Math.PI / 4;
          out.push(ptsD([fr.F, [fx + R * Math.cos(a0), fy + R * Math.sin(a0)], [fx + R * Math.cos(a1), fy + R * Math.sin(a1)]]));
        }
        return out;
      }
    }
    return [];
  }

  // polygons for the ordinary (bordure is handled by the caller: it follows the real shield edge)
  function ordinaryPaths(ord, line, fr) {
    const [fx, fy] = fr.F, w = fr.B, LEN = 130, r2 = Math.SQRT1_2;
    switch (ord) {
      case 'fess': return [ptsD(band(fr.F, [1, 0], [0, -1], w, line, -LEN, LEN))];
      case 'pale': return [ptsD(band(fr.F, [0, 1], [-1, 0], w, line, -LEN, LEN))];
      case 'bend': return [ptsD(band(fr.F, [r2, r2], [r2, -r2], w, line, -LEN, LEN))];
      case 'cross': return [ptsD(band(fr.F, [1, 0], [0, -1], w, line, -LEN, LEN)), ptsD(band(fr.F, [0, 1], [-1, 0], w, line, -LEN, LEN))];
      case 'saltire': return [ptsD(band(fr.F, [r2, r2], [r2, -r2], w, line, -LEN, LEN)), ptsD(band(fr.F, [r2, -r2], [r2, r2], w, line, -LEN, LEN))];
      case 'chevron': return [ptsD(chevronBand([fx, mapY(fr, 31)], w, line, LEN))];
      case 'chief': {
        const cy = mapY(fr, 31.5);
        const sm = lineSamples(line, fr.x0 - 30 - fx, fr.x1 + 30 - fx);
        const off = line === 'embattled' ? -LP.h / 2 : 0;
        const edge = sm.map(([s, d]) => [fx + s, cy + off + d]).reverse();
        return [ptsD([[fr.x0 - 30, fr.y0 - 30], [fr.x1 + 30, fr.y0 - 30]].concat(edge))];
      }
      case 'pile': {
        const hw = 27 * fr.sx, P = [fx, mapY(fr, 86)];
        const ext = (c) => { const dx = c[0] - P[0], dy = c[1] - P[1], l = Math.hypot(dx, dy); return [c[0] + dx / l * 30, c[1] + dy / l * 30]; };
        return [ptsD([ext([fx - hw, fr.y0]), ext([fx + hw, fr.y0]), P])];
      }
    }
    return [];
  }

  /* ================================================================ charges */
  // Every charge is drawn in a local box [-50, 50]², as flat shapes in `fg` with `cut` shapes punched out.
  // One drawing logic: circles, straight lines and arcs; bold silhouettes; parts that meet are separated by
  // a cut (stencil gap) rather than outlined. They are placed at their layout size, so 100 local units ≈ 15–31.

  // pen(S, fg, cut): shapes in fg, holes in cut. With `dil` set, the pen draws the silhouette instead:
  // holes are skipped and every shape is grown by `dil` (used to cut the ordinary around the motif).
  function pen(S, fg, cut, dil) {
    const out = [];
    const sil = dil != null;
    const put = (el, c) => { if (sil && c) return null; out.push(el); return el; };
    const col = (c) => (c ? cut : fg);
    const grow = sil ? { stroke: fg, 'stroke-width': 2 * dil, 'stroke-linejoin': 'round' } : {};
    const F = (attrs, c) => Object.assign(attrs, { fill: col(c) }, grow);
    const W = (w) => (sil ? w + 2 * dil : w);
    const cap = (c) => (sil ? 'round' : c || 'butt');
    return {
      out,
      path: (d, c) => put(S('path', F({ d }, c)), c),
      poly: (pts, c) => put(S('path', F({ d: ptsD(pts) }, c)), c),
      circle: (x, y, r, c) => put(S('circle', F({ cx: x, cy: y, r }, c)), c),
      ellipse: (x, y, rx, ry, rot, c) => put(S('ellipse', F({ cx: x, cy: y, rx, ry, transform: rot ? `rotate(${rot} ${x} ${y})` : null }, c)), c),
      rect: (x, y, w, h, rx, c, tr) => put(S('rect', F({ x, y, width: w, height: h, rx: rx || null, transform: tr || null }, c)), c),
      line: (pts, w, c, cp, join) => put(S('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: col(c), 'stroke-width': W(w), 'stroke-linecap': cap(cp), 'stroke-linejoin': sil ? 'round' : join || 'miter', 'stroke-miterlimit': 8 }), c),
      stroke: (d, w, c, cp, join) => put(S('path', { d, fill: 'none', stroke: col(c), 'stroke-width': W(w), 'stroke-linecap': cap(cp), 'stroke-linejoin': sil ? 'round' : join || 'round' }), c),
      ring: (x, y, r, w, c) => put(S('circle', { cx: x, cy: y, r, fill: 'none', stroke: col(c), 'stroke-width': W(w) }), c),
      ering: (x, y, rx, ry, w, rot, c) => put(S('ellipse', { cx: x, cy: y, rx, ry, fill: 'none', stroke: col(c), 'stroke-width': W(w), transform: rot ? `rotate(${rot} ${x} ${y})` : null }), c),
      group: (tr, fn) => { const sub = pen(S, fg, cut, dil); fn(sub); return put(S('g', { transform: tr }, sub.out)); },
      silhouette: (tr, d, fn) => { const sub = pen(S, cut, cut, d); fn(sub); return put(S('g', { transform: tr }, sub.out)); },
    };
  }

  const rad = (d) => d * Math.PI / 180;
  const pol = (r, deg, c = [0, 0]) => [c[0] + r * Math.cos(rad(deg)), c[1] + r * Math.sin(rad(deg))];
  function star(n, R, r, c = [0, 0], rot = -90) {
    const pts = [];
    for (let k = 0; k < 2 * n; k++) pts.push(pol(k % 2 ? r : R, rot + k * 180 / n, c));
    return pts;
  }
  function lens(P, Q, bulge) { // pointed leaf between P and Q
    const c = Math.hypot(Q[0] - P[0], Q[1] - P[1]), b = bulge * c, r = (c * c / 4 + b * b) / (2 * b);
    return `M${P[0]} ${P[1]}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${Q[0]} ${Q[1]}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${P[0]} ${P[1]}Z`;
  }
  function sampled(fn, t0, t1, n) { const out = []; for (let k = 0; k <= n; k++) out.push(fn(t0 + (t1 - t0) * k / n)); return out; }
  const r1 = (p) => p.map((v) => +v.toFixed(2));

  const DRAW = {
    mullet(g) { g.poly(star(5, 52, 21.5, [0, 5])); },
    sun(g) {
      g.circle(0, 0, 19);
      for (let k = 0; k < 12; k++) {
        const a = -90 + k * 30, tip = k % 2 ? 40 : 49, hw = 8.5;
        g.poly([pol(25.5, a - hw), pol(tip, a), pol(25.5, a + hw)]);
      }
    },
    crescent(g) { g.path('M-31.6 -14.5A40 40 0 1 0 31.6 -14.5A34 34 0 1 1 -31.6 -14.5Z'); },
    coin(g) { g.circle(0, 0, 46); g.ring(0, 0, 38.5, 3.2, true); g.rect(-14, -14, 28, 28, 0, true); },
    crystal(g) {
      g.poly([[0, -50], [26, -29], [26, 29], [0, 50], [-26, 29], [-26, -29]]);
      g.line([[-27, -29], [0, -14], [27, -29]], 3.6, true);
      g.line([[0, -14], [0, 51]], 3.6, true);
    },
    fountain(g) {
      g.circle(0, 0, 46);
      for (const y of [-19, 0, 19]) g.line(sampled((x) => r1([x, y + 4.5 * Math.sin(2 * Math.PI * x / 32)]), -50, 50, 40), 6, true);
    },
    mount(g) {
      g.poly([[-33, 44], [0, -44], [33, 44]]);
      g.poly([[-50, 44], [-26, -4], [-2, 44]]);
      g.poly([[50, 44], [26, -4], [2, 44]]);
      g.line([[-12.5, -11], [-4.5, -3], [0, -8], [4.5, -3], [12.5, -11]], 3.6, true);
    },
    tower(g) {
      g.rect(-20, -16, 40, 62);
      g.rect(-28, -32, 56, 12);
      for (const x of [-28, -6.5, 15]) g.rect(x, -46, 13, 14);
      g.path('M-8 46V31A8 8 0 0 1 8 31V46Z', true);
      g.rect(-3, -6, 6, 14, 0, true);
    },
    key(g) {
      g.ring(0, -28, 16.5, 11);
      g.rect(-5.5, -12, 11, 58);
      g.rect(5.5, 26, 15, 20);
      g.rect(5, 33, 9, 6, 0, true);
    },
    book(g) {
      g.path('M-3.5 -27C-18 -37 -34 -37 -48 -30V34C-34 28 -18 28 -3.5 38Z');
      g.path('M3.5 -27C18 -37 34 -37 48 -30V34C34 28 18 28 3.5 38Z');
      g.stroke('M-40 -10C-30 -15 -18 -15 -11 -10', 3.2, true);
      g.stroke('M40 -10C30 -15 18 -15 11 -10', 3.2, true);
    },
    gear(g) {
      const N = 8, R = 48, r = 37.5, ta = 8.5, tb = 13.5;
      let d = '';
      for (let k = 0; k < N; k++) {
        const a = -90 + k * 360 / N;
        const p1 = pol(r, a - tb), p2 = pol(R, a - ta), p3 = pol(R, a + ta), p4 = pol(r, a + tb), p5 = pol(r, a + 360 / N - tb);
        d += (k ? 'L' : 'M') + r1(p1).join(' ') + 'L' + r1(p2).join(' ') + `A${R} ${R} 0 0 1 ` + r1(p3).join(' ') + 'L' + r1(p4).join(' ') + `A${r} ${r} 0 0 1 ` + r1(p5).join(' ');
      }
      g.path(d + 'Z');
      g.circle(0, 0, 15, true);
    },
    flame(g) {
      g.path('M1 -50C7 -35 31 -22 33 4C35 28 19 48 0 48C-19 48 -35 31 -33 9C-31 -8 -21 -17 -16 -31C-11 -19 -8 -13 -4 -11C-7 -26 -5 -40 1 -50Z');
      g.path('M0 4C6 13 13 21 13 30C13 38 7 42 0 42C-7 42 -13 38 -13 30C-13 21 -6 13 0 4Z', true);
    },
    sprout(g) {
      g.line([[0, 48], [0, -10]], 8);
      g.path(lens([3, -12], [40, -46], 0.3));
      g.path(lens([-42, -22], [-3, 4], 0.3));
      g.line([[8, -18], [30, -37]], 2.6, true, 'round');
      g.line([[-33, -18], [-10, -2]], 2.6, true, 'round');
    },
    tree(g) {
      g.circle(0, -15, 33);
      g.rect(-6, 10, 12, 38);
      g.line([[0, 14], [0, -30]], 4.4, true);
      g.line([[0, -2], [-15, -17]], 4.4, true);
      g.line([[0, -12], [14, -26]], 4.4, true);
    },
    garb(g) {
      g.rect(-17, 2, 34, 8);
      g.poly([[-13, 13], [13, 13], [23, 48], [-23, 48]]);
      g.line([[-4, 14], [-8, 49]], 3, true);
      g.line([[4, 14], [8, 49]], 3, true);
      g.path(lens([0, -1], [0, -50], 0.27));
      g.path(lens([-6, 0], [-30, -42], 0.27));
      g.path(lens([30, -42], [6, 0], 0.27));
      g.line([[0, -6], [0, -40]], 2.4, true);
    },
    eye(g) {
      g.path('M-50 0Q0 -42 50 0Q0 42 -50 0Z');
      g.circle(0, 0, 18, true);
      g.circle(0, 0, 9.5);
    },
    heart(g) { g.path('M0 46C-12 33 -47 13 -47 -12C-47 -30 -33 -42 -20 -42C-10 -42 -3 -36 0 -28C3 -36 10 -42 20 -42C33 -42 47 -30 47 -12C47 13 12 33 0 46Z'); },
    scales(g) {
      g.rect(-3.6, -38, 7.2, 82);
      g.rect(-20, 42, 40, 7);
      g.rect(-40, -31, 80, 6.5);
      g.circle(0, -43, 6);
      for (const sx of [-1, 1]) {
        const cx = 34 * sx;
        g.path(`M${cx - 15} 12A15 15 0 0 0 ${cx + 15} 12Z`);
        g.line([[cx - 14.5, 12], [cx, -26], [cx + 14.5, 12]], 2.6, false, 'butt', 'round');
      }
    },
    crown(g) {
      g.poly([[-38, 18], [-45, -22], [-20, 0], [0, -32], [20, 0], [45, -22], [38, 18]]);
      g.circle(-45, -28, 6.5); g.circle(0, -39, 6.5); g.circle(45, -28, 6.5);
      g.rect(-38, 23, 76, 14);
    },
    lyre(g) {
      g.stroke('M-29 -38C-33 -6 -31 31 0 40C31 31 33 -6 29 -38', 9, false, 'butt');
      g.stroke('M-29 -38C-29 -46 -37 -50 -45 -45', 9, false, 'round');
      g.stroke('M29 -38C29 -46 37 -50 45 -45', 9, false, 'round');
      g.rect(-35, -27, 70, 6);
      for (const x of [-10, 0, 10]) g.rect(x - 1.5, -22, 3, 58);
    },
    bolt(g) { g.poly([[8, -50], [-24, 6], [-2, 6], [-14, 50], [26, -11], [4, -11], [22, -50]]); },
    quill(g) {
      g.group('rotate(32)', (q) => {
        q.path('M0 -52C19 -36 22 -6 7 25L0 31L-6 25C-19 -2 -16 -33 0 -52Z');
        q.line([[0, -40], [0, 29]], 3, true);
        q.poly([[16, -22], [22, -27], [19, -14]], true);
        q.poly([[-12, -4], [-17, -9], [-15, 4]], true);
        q.poly([[-3.2, 31], [3.2, 31], [0, 52]]);
      });
    },
    mask(g) {
      g.path('M-37 -32C-37 -46 37 -46 37 -32L35 0C33 29 15 46 0 46C-15 46 -33 29 -35 0Z');
      g.path('M-28 -13Q-16 -24 -4 -13Q-16 -7 -28 -13Z', true);
      g.path('M28 -13Q16 -24 4 -13Q16 -7 28 -13Z', true);
      g.path('M-19 12Q0 34 19 12Q0 23 -19 12Z', true);
    },
    vol(g) {
      for (const sx of [-1, 1]) {
        g.group(`scale(${sx} 1)`, (w) => {
          [[44, -22], [36, -8], [26, 6]].forEach(([len, y]) => w.rect(9, y, len, 10, 5, false, `rotate(-12 9 ${y + 5})`));
        });
      }
      g.circle(0, -12, 7.5);
    },
    flask(g) {
      g.rect(-13, -50, 26, 6);
      g.rect(-8, -44, 16, 23);
      g.path('M-8 -22H8L38 35Q43 46 32 46H-32Q-43 46 -38 35Z');
      g.line([[-40, 14], [40, 14]], 4, true);
    },
    atom(g) {
      for (const a of [0, 60, -60]) g.ering(0, 0, 46, 15, 6, a);
      g.circle(0, 0, 9);
    },
    hourglass(g) {
      g.rect(-34, -50, 68, 8);
      g.rect(-34, 42, 68, 8);
      g.poly([[-28, -38], [28, -38], [4.5, 0], [28, 38], [-28, 38], [-4.5, 0]]);
    },
    infinity(g) {
      const a = 46;
      g.line(sampled((t) => { const s = Math.sin(t), c = Math.cos(t), q = 1 + s * s; return r1([a * c / q, a * s * c / q]); }, 0, 2 * Math.PI, 120), 10, false, 'round', 'round');
    },
    globe(g) {
      g.circle(0, 0, 46);
      g.ering(0, 0, 18, 46, 3.4, 0, true);
      g.line([[-50, 0], [50, 0]], 3.4, true);
      g.line([[0, -50], [0, 50]], 3.4, true);
      g.line([[-50, -23], [50, -23]], 3.4, true);
      g.line([[-50, 23], [50, 23]], 3.4, true);
    },
    cloud(g) {
      g.circle(-24, -4, 18); g.circle(2, -18, 24); g.circle(26, -2, 16);
      g.rect(-24, -4, 50, 18);
      for (const x of [-20, 0, 20]) g.line([[x, 25], [x - 6, 46]], 6.5, false, 'round');
    },
    binary(g) {
      g.rect(-37, -32, 14, 64);
      g.ering(14, 0, 16.5, 26.5, 11, 0);
    },
    spark(g) {
      const sp = (cx, cy, R, k) => `M${cx} ${cy - R}Q${cx + k} ${cy - k} ${cx + R} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + R}Q${cx - k} ${cy + k} ${cx - R} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - R}Z`;
      g.path(sp(-6, 6, 44, 5));
      g.path(sp(31, -31, 16, 2));
    },
    network(g) {
      const P = [[0, -35], [-35, 25], [35, 25], [0, 4]];
      for (const [a, b] of [[0, 3], [1, 3], [2, 3], [0, 1], [0, 2], [1, 2]]) g.line([P[a], P[b]], 4.5);
      P.forEach((p, k) => { g.circle(p[0], p[1], (k === 3 ? 12 : 10) + 3.5, true); g.circle(p[0], p[1], k === 3 ? 12 : 10); });
    },
    bridge(g) {
      g.rect(-50, -24, 100, 9);
      g.path('M-50 -9H50V40H29A29 29 0 0 0 -29 40H-50Z');
    },
    drop(g) {
      g.path('M0 -50C14 -28 36 -7 36 16A36 34 0 0 1 -36 16C-36 -7 -14 -28 0 -50Z');
      g.stroke('M-22 12Q-22 28 -8 34', 4, true, 'round');
    },
    helix(g) {
      const A = 22, P = 64, y0 = -46, y1 = 46;
      const xa = (y) => A * Math.sin(2 * Math.PI * (y - y0) / P);
      // rungs (with gaps to both strands)
      for (let y = y0 + 6; y < y1 - 3; y += 9.2) {
        const x = Math.abs(xa(y));
        if (x < 9) continue;
        g.line([[-x + 7.5, y], [x - 7.5, y]], 3.4);
      }
      const strand = (sg, ya, yb) => sampled((y) => r1([sg * xa(y), y]), ya, yb, 40);
      g.line(strand(1, y0, y1), 8, false, 'butt', 'round');
      g.line(strand(-1, y0, y1), 8, false, 'butt', 'round');
      // over-under at each crossing (alternating)
      for (let k = 0; ; k++) {
        const yc = y0 + k * P / 2;
        if (yc > y1) break;
        const sg = k % 2 ? 1 : -1, ya = Math.max(y0, yc - 9), yb = Math.min(y1, yc + 9);
        g.line(strand(sg, ya, yb), 14, true, 'butt', 'round');
        g.line(strand(sg, ya - 1, yb + 1).filter((p) => p[1] >= y0 && p[1] <= y1), 8, false, 'butt', 'round');
      }
    },
    rod(g) {
      g.line([[0, -46], [0, 50]], 8, false, 'round');
      const sn = sampled((y) => r1([15 * Math.sin(Math.PI * (40 - y) / 23), y]), 40, -30, 60);
      g.line(sn, 14, true, 'round', 'round');
      g.line(sn, 7, false, 'round', 'round');
      g.ellipse(-12, -36, 9, 6.5, -25);
    },
    capsule(g) {
      g.group('rotate(-45)', (c) => {
        c.rect(-48, -18, 96, 36, 18);
        c.rect(4, -11, 37, 22, 11, true);
        c.rect(-2, -20, 4, 40, 0, true);
      });
    },
    horn(g) {
      g.poly([[-46, -9], [-24, -9], [28, -34], [28, 34], [-24, 9], [-46, 9]]);
      g.rect(32, -40, 8, 80);
      g.rect(-19, 15, 9, 22);
    },
    speech(g) {
      g.rect(-48, -42, 96, 64, 18);
      g.poly([[-27, 18], [-37, 46], [-5, 18]]);
      for (const x of [-20, 0, 20]) g.circle(x, -10, 6.5, true);
    },
    lamp(g) {
      g.group('translate(-2 6) scale(0.94)', (l) => {
        l.path('M-38 6C-38 24 -20 31 0 31C16 31 28 24 37 13L52 2L36 0C29 -7 16 -10 0 -10C-20 -10 -38 -6 -38 6Z');
        l.ring(-45, 6, 9, 6);
        l.path('M-14 -12A8 8 0 0 1 2 -12Z');
        l.rect(-20, 34, 30, 6);
        l.path('M46 -44C52 -34 56 -26 56 -19A10 10 0 0 1 36 -19C36 -26 40 -34 46 -44Z');
      });
    },
    hand(g) {
      g.rect(-24, -6, 46, 52, 12);
      [[-23, -34], [-11.5, -47], [0, -43], [11.5, -31]].forEach(([x, y]) => g.rect(x, y, 10, 2 - y, 5));
      g.rect(-35, -4, 11, 34, 5.5, false, 'rotate(-32 -29.5 13)');
    },
    hive(g) {
      [[-40, 31, 80, 14], [-36, 15, 72, 13], [-30, 0, 60, 12], [-22, -14, 44, 11], [-13, -27, 26, 10]].forEach(([x, y, w, h]) => g.rect(x, y, w, h, h / 2));
      g.circle(0, -35, 5);
      g.path('M-9 46V38A9 9 0 0 1 9 38V46Z', true);
    },
    butterfly(g) {
      g.ellipse(-23, -15, 23, 17.5, 32); g.ellipse(23, -15, 23, 17.5, -32);
      g.ellipse(-16, 17, 15, 12, -32); g.ellipse(16, 17, 15, 12, 32);
      g.line([[-50, 3], [50, 3]], 3, true);
      g.line([[0, -34], [0, 40]], 13, true);
      g.rect(-3.5, -24, 7, 52, 3.5);
      g.line([[-2, -25], [-12, -43]], 2.6, false, 'round');
      g.line([[2, -25], [12, -43]], 2.6, false, 'round');
    },
    arrow(g) {
      const pts = [[-46, 32], [-18, 2], [2, 18], [30, -15]];
      const d = [0.664, -0.747], p = [0.747, 0.664];
      const tip = [44, -31], base = add(tip, d, -24);
      g.line(pts.concat([base]), 9, false, 'butt', 'miter');
      g.poly([tip, add(base, p, 14), add(base, p, -14)]);
    },
    die(g) {
      g.group('rotate(15)', (q) => {
        q.rect(-40, -40, 80, 80, 13);
        for (const [x, y] of [[0, 0], [-20, -20], [20, -20], [-20, 20], [20, 20]]) q.circle(x, y, 7.5, true);
      });
    },
    palette(g) {
      g.path('M-6 -44C24 -46 48 -28 46 -4C44 14 30 12 22 20C14 28 24 40 6 44C-22 48 -46 26 -46 0C-46 -24 -30 -42 -6 -44Z');
      g.circle(5, 25, 6.5, true);
      for (const [x, y] of [[-27, -6], [-16, -27], [7, -32], [28, -18]]) g.circle(x, y, 6.5, true);
    },
    compass(g) {
      const H = [0, -38];
      for (const sx of [-1, 1]) {
        const tip = [28 * sx, 50], dx = tip[0] - H[0], dy = tip[1] - H[1], l = Math.hypot(dx, dy), p = [dy / l, -dx / l];
        g.poly([add(H, p, 5.5), add(H, p, -5.5), add(tip, p, -1.2), add(tip, p, 1.2)]);
      }
      g.stroke('M-17.5 14A54 54 0 0 0 17.5 14', 4.2, false, 'butt');
      g.circle(H[0], H[1], 12.5, true);
      g.circle(H[0], H[1], 8.5);
      g.rect(-2.5, -50, 5, 5);
    },
    reel(g) {
      g.circle(0, 0, 46);
      for (let k = 0; k < 6; k++) { const [x, y] = pol(25, -90 + k * 60); g.circle(x, y, 10.5, true); }
      g.circle(0, 0, 5, true);
    },
    tomoe(g) {
      const R = 48, rh = 15.5, gap = 3.6, dH = R - rh;
      for (let k = 0; k < 3; k++) {
        const a0 = rad(-90 + k * 120), aN = a0 + rad(120);
        const H = [dH * Math.cos(a0), dH * Math.sin(a0)], HN = [dH * Math.cos(aN), dH * Math.sin(aN)];
        const headOut = (phi) => { // outer radius of the next head along the ray phi (or -Infinity)
          const u = [Math.cos(phi), Math.sin(phi)], b = u[0] * HN[0] + u[1] * HN[1], disc = b * b - dH * dH + (rh + gap) * (rh + gap);
          return disc < 0 ? -Infinity : b + Math.sqrt(disc);
        };
        const outer = [], inner = [];
        const steps = 90;
        let end = aN;
        for (let j = 0; j <= steps; j++) {
          const phi = a0 + (aN - a0) * j / steps;
          const sp = R - 2 * rh * (1 - j / steps);
          const ri = Math.max(sp, headOut(phi));
          if (ri >= R - 0.4) { end = phi; break; }
          outer.push(pol(R, phi * 180 / Math.PI)); inner.push(pol(ri, phi * 180 / Math.PI));
        }
        outer.push(pol(R, end * 180 / Math.PI));
        // head: back half from inner point around to outer tangent point (going backwards in angle)
        const head = sampled((t) => [H[0] + rh * Math.cos(a0 + Math.PI + t), H[1] + rh * Math.sin(a0 + Math.PI + t)], 0, Math.PI, 30);
        const pts = outer.concat(inner.reverse(), head.slice(1)).map(r1);
        g.poly(pts);
      }
    },
    amphora(g) {
      g.rect(-11, -50, 22, 6);
      g.path('M-7 -42H7V-33C7 -25 30 -18 30 6C30 26 16 36 8 40L12 48H-12L-8 40C-16 36 -30 26 -30 6C-30 -18 -7 -25 -7 -33Z');
      g.stroke('M-7 -35C-20 -37 -27 -31 -23 -13', 5, false, 'butt');
      g.stroke('M7 -35C20 -37 27 -31 23 -13', 5, false, 'butt');
      g.line([[-32, 2], [-15, -6], [-4, 7], [8, -4], [18, 9], [32, 1]], 3.6, true, 'butt', 'miter');
    },
    flower(g) {
      for (let k = 0; k < 5; k++) { const [x, y] = pol(25, -90 + k * 72); g.circle(x, y, 19); }
      g.circle(0, 0, 13.5, true);
      g.circle(0, 0, 8.5);
    },
    cross(g) { g.rect(-14, -46, 28, 92); g.rect(-46, -14, 92, 28); },
  };

  // marks of cadency, same drawing logic, read at ~10 units
  const MARK = [
    null,
    (g) => { g.rect(-48, -26, 96, 15); for (const x of [-31, 0, 31]) g.poly([[x - 8, -11], [x + 8, -11], [x + 11, 24], [x - 11, 24]]); },
    (g) => DRAW.crescent(g),
    (g) => DRAW.mullet(g),
    (g) => g.path('M-47 2L-34 -5C-24 -13 -8 -13 4 -7L28 -30L21 -3L48 -15L30 4L48 21L16 12C2 18 -22 17 -32 8Z'),
    (g) => g.ring(0, 0, 33, 15),
    (g) => {
      g.path('M0 -50C15 -34 17 -14 7 2H-7C-17 -14 -15 -34 0 -50Z');
      g.path('M10 2C10 -19 31 -31 44 -19C50 -12 47 -1 39 3C37 -7 27 -10 19 2Z');
      g.path('M-10 2C-10 -19 -31 -31 -44 -19C-50 -12 -47 -1 -39 3C-37 -7 -27 -10 -19 2Z');
      g.rect(-22, 6, 44, 9);
      g.poly([[-6, 18], [6, 18], [11, 46], [0, 37], [-11, 46]]);
    },
    (g) => DRAW.flower(g),
    (g) => {
      g.rect(-8, -32, 16, 64); g.rect(-32, -8, 64, 16);
      for (const a of [0, 90, 180, 270]) g.group(`rotate(${a})`, (q) => q.stroke('M-17 -32A15 15 0 0 0 17 -32', 9, false, 'butt'));
    },
    (g) => { for (let k = 0; k < 8; k++) { const [x, y] = pol(30, k * 45); g.circle(x, y, 14); } g.circle(0, 0, 14, true); g.circle(0, 0, 8); },
  ];

  /* ================================================================ painting */

  let UID = 0;
  const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const serif = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Noto Serif', 'Noto Serif CJK SC', 'Songti SC', serif";

  // Petra Sancta hatching (Silvester de Petra Sancta, 1638): Or dots, Argent plain, Gules vertical,
  // Azure horizontal, Vert bendwise, Purpure bendwise sinister, Sable solid (modern practice).
  function hatchDefs(S, uid, ink) {
    const sp = 3.1, w = 0.95;
    const pat = (id, kids, rot) => S('pattern', { id, patternUnits: 'userSpaceOnUse', width: sp, height: sp, patternTransform: rot ? `rotate(${rot})` : null }, kids);
    const hline = () => S('rect', { x: 0, y: (sp - w) / 2, width: sp, height: w, fill: ink });
    return [
      pat(uid + '-or', [S('circle', { cx: sp / 4, cy: sp / 4, r: 0.55, fill: ink }), S('circle', { cx: sp * 3 / 4, cy: sp * 3 / 4, r: 0.55, fill: ink })]),
      pat(uid + '-gules', [S('rect', { x: (sp - w) / 2, y: 0, width: w, height: sp, fill: ink })]),
      pat(uid + '-azure', [hline()]),
      pat(uid + '-vert', [hline()], 45),
      pat(uid + '-purpure', [hline()], -45),
    ];
  }

  function paintOf(t, mode, uid, ink) {
    if (mode === 'colour') return TINCT[t].hex;
    if (mode === 'hatch') return t === 'argent' ? null : t === 'sable' ? ink : `url(#${uid}-${t})`;
    return TINCT[t].metal ? null : ink;
  }

  // Paint the parity of the layers: even -> paint0, odd -> paint1.
  function xorGroup(S, layers, paint0, paint1) {
    function rec(k, odd) {
      if (k === layers.length) {
        const p = odd ? paint1 : paint0;
        return p ? S('rect', { x: -10, y: -10, width: 120, height: 120, fill: p }) : null;
      }
      const a = rec(k + 1, odd), b = rec(k + 1, !odd);
      const kids = [];
      if (a) kids.push(S('g', { mask: `url(#${layers[k]}-n)` }, [a]));
      if (b) kids.push(S('g', { mask: `url(#${layers[k]}-p)` }, [b]));
      return kids.length ? S('g', {}, kids) : null;
    }
    return rec(0, false);
  }

  // A layer = a function (pen) -> draws its shapes. Two masks: -p (shape white) and -n (shape black).
  function addLayer(S, defs, id, drawFn) {
    const box = { x: -10, y: -10, width: 120, height: 120, maskUnits: 'userSpaceOnUse' };
    const pp = pen(S, '#fff', '#000'); drawFn(pp);
    const pn = pen(S, '#000', '#fff'); drawFn(pn);
    defs.appendChild(S('mask', Object.assign({ id: id + '-p' }, box), pp.out));
    defs.appendChild(S('mask', Object.assign({ id: id + '-n' }, box), [S('rect', { x: -10, y: -10, width: 120, height: 120, fill: '#fff' })].concat(pn.out)));
    return id;
  }

  // place a charge: heater layout [x, y, s] -> frame
  function placeCharge(fr, x, y, s) {
    let [px, py] = mapPt(fr, x, y);
    const ps = s * fr.k * (fr.ck || 1);
    if (fr.round) { // keep inside the roundel
      const dx = px - 50, dy = py - 50, d = Math.hypot(dx, dy), lim = fr.round - 2 - ps * 0.55;
      if (d > lim && d > 0) { const f = Math.max(0, lim) / d; px = 50 + dx * f; py = 50 + dy * f; }
    }
    return [px, py, ps];
  }
  function figureOf(a, fr) {
    const fg = FIGURE[a.ord] || FIGURE_DEFAULT;
    const [cx, cy, s] = fg.c;
    return { mark: fg.mark, placed: GROUP[a.n].map(([dx, dy, k]) => placeCharge(fr, cx + dx * s, cy + dy * s, s * k)) };
  }
  const tr = (px, py, ps) => `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${(ps / 100).toFixed(4)})`;

  // draw one achievement (a field with its own frame) into `parent`
  function drawArms(S, parent, defs, uid, a, fr, shape, opts, ink, course, hover) {
    const SH = SHAPES[shape];
    const { placed, mark } = figureOf(a, fr);
    const layers = [];
    // 1. family: the division (counterchanges everything above it)
    if (a.div) layers.push(addLayer(S, defs, uid + 'd', (g) => divisionPaths(a.div, fr).forEach((d) => g.path(d))));
    // 2. the ordinary, passing behind the motif with a stencil gap
    layers.push(addLayer(S, defs, uid + 'o', (g) => {
      if (a.ord === 'bordure') g.stroke(SH.path(INSET), fr.B * 0.72 * 2 * (fr.bk || 1), false, 'butt', 'miter');
      else ordinaryPaths(a.ord, a.line, fr).forEach((d) => g.path(d));
      for (const [px, py, ps] of placed) g.silhouette(tr(px, py, ps), GAP * 100 / ps, (q) => DRAW[a.charge](q));
    }));
    // 3. the motif
    layers.push(addLayer(S, defs, uid + 'c', (g) => { for (const [px, py, ps] of placed) g.group(tr(px, py, ps), (q) => DRAW[a.charge](q)); }));
    // 4. the mark of cadency
    let markAt = null;
    const lv = course && course.level > 0 ? Math.min(9, course.level) : 0;
    if (lv) {
      const [mx, my] = mapPt(fr, mark[0], mark[1]);
      markAt = [mx, my, MARK_SIZE * fr.k];
      layers.push(addLayer(S, defs, uid + 'm', (g) => g.group(tr(mx, my, markAt[2]), (q) => MARK[lv](q))));
    }
    const mode = opts.tincture === 'hatch' ? 'hatch' : opts.tincture === 'colour' ? 'colour' : 'flat';
    const grp = xorGroup(S, layers, paintOf(a.t[0], mode, uid, ink), paintOf(a.t[1], mode, uid, ink));
    const clipId = uid + 'k';
    defs.appendChild(S('clipPath', { id: clipId }, [S('path', { d: SH.path(INSET) })]));
    parent.appendChild(S('g', { 'clip-path': `url(#${clipId})` }, grp ? [grp] : []));

    if (hover) {
      const hg = S('g', { 'clip-path': `url(#${clipId})` });
      const fam = a.f >= 0 ? D.families[a.f] : null;
      const dv = a.div ? DIVISION.find((d) => d.key === a.div) : null;
      const hit = (el, info) => { el.setAttribute('fill', 'transparent'); el.addEventListener('pointerenter', () => hover(info)); el.addEventListener('pointerleave', () => hover(null)); hg.appendChild(el); };
      hit(S('rect', { x: 0, y: 0, width: 100, height: 100 }), dv
        ? { title: `门类 · ${fam.zh} → ${dv.en}（${dv.zh}）`, sub: `${TINCT[a.t[0]].zh}${TINCT[a.t[1]].zh}两色 · ${dv.why}` }
        : { title: `原野 · ${TINCT[a.t[0]].en}（${TINCT[a.t[0]].zh}）`, sub: '非学科：没有门类分区' });
      if (a.ord === 'bordure') hit(S('path', { d: SH.path(INSET), fill: 'none', stroke: 'transparent', 'stroke-width': fr.B * 1.44 }), ordInfo(a));
      else ordinaryPaths(a.ord, a.line, fr).forEach((d) => hit(S('path', { d }), ordInfo(a)));
      placed.forEach(([px, py, ps]) => hit(S('circle', { cx: px, cy: py, r: ps * 0.5 }), chargeInfo(a)));
      if (markAt) {
        const c = CADENCY[lv];
        hit(S('circle', { cx: markAt[0], cy: markAt[1], r: markAt[2] * 0.7 }), { title: `分家标记 · ${course.label}`, sub: `${lv} 级 = ${c.son}：${c.zh}（${c.en}）` });
      }
      parent.appendChild(hg);
    }
  }

  const topAttrs = (p, k) => p.slice().sort((x, y) => y[1] - x[1]).slice(0, k).map(([i]) => D.attrs[i].zh).join('、');
  function ordInfo(a) {
    return { title: `主带 · ${ORD[a.ord].en}${a.line !== 'plain' ? ' ' + LINE[a.line].en : ''}（${LINE[a.line].zh}${ORD[a.ord].zh}）`, sub: `取向：${topAttrs(ORD[a.ord].p, 4)}${a.line !== 'plain' ? ' · 边线：' + topAttrs(LINE[a.line].p, 3) : ''}` };
  }
  function chargeInfo(a) {
    const c = CH[a.charge];
    return { title: `纹样 · ${c.en[0]}（${c.zh}）${a.n > 1 ? ' × ' + a.n : ''}`, sub: `画像：${topAttrs(c.prof, 4)}` };
  }

  // combo parents: item.parts, or the two halves of the label
  function comboParts(ctx) {
    const item = ctx.item || {};
    if (item.kind !== 'combo') return null;
    let names = Array.isArray(item.parts) && item.parts.length === 2 ? item.parts : null;
    if (!names) { const bits = String(item.zh || ctx.word || '').split(/\s*[+×]\s*/); if (bits.length === 2) names = bits; }
    if (!names) return null;
    const out = names.map((p) => {
      const zh = typeof p === 'string' ? p : p && (p.zh || p.word);
      const v = p && p.vec ? p.vec : zh ? L.vec(zh) : null;
      if (!v || isZero(v)) return null;
      const it = (p && p.item) || L.item(zh);
      return { zh, en: it.en || '', a: armsOf(v, it) };
    });
    return out[0] && out[1] && out[0].a && out[1].a ? out : null;
  }

  /* ================================================================ render */

  function render(ctx) {
    const S = ctx.lab.svg;
    const size = ctx.size, colors = ctx.colors || {}, opts = ctx.opts || {};
    const ink = colors.ink || '#000', muted = colors.muted || ink;
    const shape = SHAPES[opts.shield] ? opts.shield : 'heater';
    const SH = SHAPES[shape];
    const detail = ctx.mode === 'detail';
    const showBlazon = detail && opts.blazon !== false;
    const hover = detail && typeof ctx.hover === 'function' ? ctx.hover : null;
    const uid = 'hz' + (++UID).toString(36);
    const item = ctx.item || { kind: 'word', f: -1 };
    const vec = ctx.vec || new Float32Array(N);
    const parts = comboParts(ctx);
    const arms = parts ? null : armsOf(vec, item);
    const course = item.kind === 'discipline' ? ctx.course : null;

    const root = S('svg', { width: size, height: size, viewBox: '0 0 100 100', role: 'img', style: 'display:block;overflow:visible' });
    const defs = S('defs');
    root.appendChild(defs);
    if (opts.tincture === 'hatch') hatchDefs(S, uid, ink).forEach((p) => defs.appendChild(p));
    const main = S('g', showBlazon ? { transform: 'translate(13 -1.5) scale(0.74)' } : {});
    root.appendChild(main);

    const outline = (op) => S('path', { d: SH.path(0), fill: 'none', stroke: ink, 'stroke-width': 1.5, 'stroke-linejoin': 'miter', opacity: op == null ? null : op });
    const baseFrame = Object.assign({ sx: (SH.frame.x1 - SH.frame.x0) / 64 }, SH.frame);
    let bz = null;

    if (!arms && !parts) {
      // tabula rasa: an empty shield
      main.appendChild(S('path', { d: SH.path(0), fill: 'none', stroke: ink, 'stroke-width': 1.2, 'stroke-dasharray': '2.4 2.4', opacity: 0.35 }));
      root.setAttribute('aria-label', `${ctx.word || ''}: 空盾`);
      if (showBlazon) bz = { zh: '空盾：没有语义，就没有纹章', en: 'A shield blank — no arms are borne' };
    } else if (parts) {
      // impalement: dexter = first parent, sinister = second, each redrawn to its half
      const g = 2.2, fx0 = SH.frame.x0, fx1 = SH.frame.x1, mid = 50;
      const halves = [[fx0, mid - g / 2], [mid + g / 2, fx1]];
      parts.forEach((p, k) => {
        const [hx0, hx1] = halves[k];
        const fr = Object.assign({}, baseFrame, { x0: hx0, x1: hx1, F: [(hx0 + hx1) / 2, SH.frame.F[1]], sx: (hx1 - hx0) / 64, B: SH.frame.B * 0.78, ck: 0.74, bk: 0.8 });
        const a = Object.assign({}, p.a, { n: 1 });
        // the half is the shield ∩ a half-plane: a clip (half) around a clip (shield)
        const hid = uid + 'h' + k;
        defs.appendChild(S('clipPath', { id: hid }, [S('rect', { x: k ? hx0 : -10, y: -10, width: k ? 120 - hx0 : hx1 + 10, height: 120 })]));
        const holder = S('g', { 'clip-path': `url(#${hid})` });
        main.appendChild(holder);
        drawArms(S, holder, defs, uid + 'i' + k, a, fr, shape, opts, ink, null, hover);
      });
      main.appendChild(outline());
      const b0 = blazon(Object.assign({}, parts[0].a, { n: 1 })), b1 = blazon(Object.assign({}, parts[1].a, { n: 1 }));
      root.setAttribute('aria-label', `${parts[0].zh} 拼合 ${parts[1].zh}`);
      if (showBlazon) bz = { zh: `左右拼合：${parts[0].zh} | ${parts[1].zh}`, en: `${parts[0].en || parts[0].zh} impaling ${parts[1].en || parts[1].zh}`, sub: [b0.en, b1.en] };
    } else {
      drawArms(S, main, defs, uid, arms, baseFrame, shape, opts, ink, course, hover);
      main.appendChild(outline());
      const b = blazon(arms);
      root.setAttribute('aria-label', `${ctx.word || ''}: ${b.zh}`);
      if (showBlazon) {
        bz = b;
        if (course && course.level > 0) {
          const c = CADENCY[Math.min(9, course.level)];
          bz.mark = `${course.label} · ${c.son}标记：${c.zh} · ${c.en} for difference`;
        }
      }
    }

    if (bz) drawBlazon(S, root, bz, ink, muted);
    return root;
  }

  // wrap a string to lines of at most `max` characters, at spaces / commas
  function wrap(str, max) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawBlazon(S, root, bz, ink, muted) {
    const g = S('g', { 'text-anchor': 'middle' });
    let y = 79.5;
    const t = (txt, fs, fill, extra) => { const el = S('text', Object.assign({ x: 50, y, 'font-size': fs, fill }, extra || {})); el.textContent = txt; g.appendChild(el); };
    t(bz.zh, 3.9, ink, { 'font-family': serif, 'letter-spacing': 0.15 });
    y += 5.2;
    for (const ln of wrap(bz.en, 64).slice(0, 2)) { t(ln, 2.9, ink, { 'font-family': serif, 'font-style': 'italic' }); y += 3.7; }
    if (bz.sub) for (const s of bz.sub) { for (const ln of wrap(s, 78).slice(0, 1)) { t(ln, 2.3, muted, { 'font-family': serif, 'font-style': 'italic' }); y += 3.1; } }
    if (bz.mark) { y += 0.6; t(bz.mark, 2.45, muted, { 'font-family': mono }); }
    root.appendChild(g);
  }

  /* ================================================================ register */

  const famLine = DIVISION.map((d, f) => `${D.families[f].key} ${d.zh}`).join('、');

  L.register({
    id: 'heraldry',
    order: 6,
    name: '盾徽',
    en: 'Heraldry',
    tagline: '门类分盾面，学科配色与纹样，课程加分家标记',
    dims: '学科向量对 7 种色、9 种主带、3 种边线、50 个纹样的语义画像打分（加权点积），取最高者；48 个学科一起登记分配，门类内纹样不重复。',
    lineage: '前人：12 世纪中叶起的欧洲纹章与纹章术语（blazon）；Scrope 诉 Grosvenor 案（1385–1390）；英格兰分家标记体系；Petra Sancta 的单色线纹法（1638）；20 世纪中叶芬兰市镇纹章的极简新纹章风格（Gustaf von Numers、Olof Eriksson 等）。',
    about: '',
    controls: [
      { id: 'shield', label: '盾形', type: 'select', value: 'heater', options: [{ value: 'heater', label: '盾形' }, { value: 'square', label: '方' }, { value: 'round', label: '圆' }] },
      { id: 'tincture', label: '着色', type: 'select', value: 'flat', options: [{ value: 'flat', label: '平涂' }, { value: 'hatch', label: '线纹' }, { value: 'colour', label: '原色' }] },
      { id: 'blazon', label: '纹章术语', type: 'toggle', value: true },
    ],
    render,
    // for inspection: the arms and blazon a word would receive
    blazonOf(word) { const v = L.vec(word); const a = v && armsOf(v, L.item(word)); return a ? Object.assign({ blazon: blazon(a) }, a) : null; },
    _famLine: famLine,
  });
})();
