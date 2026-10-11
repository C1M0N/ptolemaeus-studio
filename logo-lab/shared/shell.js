// 学科纹章实验室: page shell. Subject console, gallery, detail view and attribute table.
// Load order: shared/semantics.js -> shared/lab.js -> renderers/*.js -> shared/shell.js
// Views are picked by bare hash tokens: '' / #gallery, #attrs, #<renderer id>.
(function () {
  'use strict';
  const L = window.LogoLab;
  const D = L && L.data;
  const $ = (id) => document.getElementById(id);
  if (!D) {
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px">数据没有加载（shared/semantics.js、shared/lab.js）。</p>');
    return;
  }

  /* ------------------------------------------------------------------ helpers */

  // h('div', {class, text, html, onclick, ...attrs}, [children]) -> element
  function h(tag, props, children) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    if (children != null) for (const c of [].concat(children)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
    return el;
  }

  // Per-viewer conveniences only; every access may throw (private mode, blocked storage, previews).
  const store = {
    get(key, fallback) {
      try { const s = localStorage.getItem('emblem-lab:' + key); return s == null ? fallback : JSON.parse(s); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('emblem-lab:' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
  const byte = (v) => Math.round(v * 255);
  const idOf = (zh) => L.hash(zh).toString(36);
  const enOf = (w) => (w && w.en && w.en.length > 1 ? w.en : ''); // placeholder 'x' counts as missing
  const CN_NUM = ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'];
  function levelText(level) {
    if (level >= 5) return '研究生';
    if (level >= 1) return `本科 ${level} 年级`;
    return '先修';
  }
  function clampCourse(v) {
    const n = Math.round(+v);
    return Number.isFinite(n) && n >= 1 ? Math.min(999, n) : 0;
  }

  /* ------------------------------------------------------------------ vocabulary */

  const disciplines = D.words.filter((w) => w.kind === 'discipline');
  const everyday = D.words.filter((w) => w.kind !== 'discipline');
  const vocab = new Map(D.words.map((w) => [w.zh, w]));
  const wordGroups = D.groups.filter((g) => g.kind !== 'discipline');
  const KIN_DEFAULT = ['数学', '历史学', '音乐', '医学'].filter((z) => vocab.has(z));
  const OPS = [['add', '叠加'], ['max', '并集'], ['min', '交集'], ['mean', '平均']];
  const opLabel = (op) => (OPS.find((o) => o[0] === op) || OPS[0])[1];
  const PRESETS = [0, 101, 241, 350, 472, 610];

  // Words scored live by Claude, kept per viewer: [{zh, r}]
  let custom = (() => {
    const list = store.get('custom', []);
    if (!Array.isArray(list)) return [];
    return list.filter((c) => c && typeof c.zh === 'string' && c.r && typeof c.r === 'object' && !vocab.has(c.zh)).slice(-40);
  })();
  const saveCustom = () => store.set('custom', custom);
  const findWord = (zh) => vocab.get(zh) || custom.find((c) => c.zh === zh) || null;
  const isCustom = (zh) => !vocab.has(zh) && !!findWord(zh);
  const itemOf = (zh) => (vocab.has(zh) ? L.item(zh) : { kind: 'word', zh, en: '', code: '', f: -1 });

  const vecCache = new Map();
  function vecOf(zh) {
    if (!vecCache.has(zh)) {
      const w = findWord(zh);
      vecCache.set(zh, w ? L.toVec(w.r) : new Float32Array(L.N));
    }
    return vecCache.get(zh);
  }
  function subjOf(zh, course) {
    const item = itemOf(zh);
    return { kind: item.kind, word: zh, vec: vecOf(zh), item, course: course || null };
  }

  /* ------------------------------------------------------------------ state */

  const saved = store.get('subject', {}) || {};
  const savedCombo = saved.combo || {};
  const state = {
    word: findWord(saved.word) ? saved.word : '数学',
    courseN: clampCourse(saved.courseN),
    combo: {
      a: findWord(savedCombo.a) ? savedCombo.a : '生物学',
      b: findWord(savedCombo.b) ? savedCombo.b : '计算机科学',
      op: OPS.some((o) => o[0] === savedCombo.op) ? savedCombo.op : 'add',
    },
    comboOn: !!saved.comboOn,
    view: 'gallery',
    rid: null,
    attr: null,
    opts: (() => { const o = store.get('opts', {}); return o && typeof o === 'object' ? o : {}; })(),
  };
  // Local testing: ?w=数学&c=241 (query strings never reach the published artifact).
  const query = new URLSearchParams(location.search);
  if (query.get('w') && findWord(query.get('w'))) { state.word = query.get('w'); state.comboOn = false; }
  if (query.has('c')) state.courseN = clampCourse(query.get('c'));

  // The subject every view draws: {kind, word, vec, item, course}
  function subject() {
    if (state.comboOn) {
      const { a, b, op } = state.combo;
      const ia = itemOf(a), ib = itemOf(b);
      const zh = a + ' × ' + b;
      const en = enOf(ia) && enOf(ib) ? enOf(ia) + ' × ' + enOf(ib) : '';
      // parts lets a renderer marshal the two identities itself (e.g. heraldic impalement)
      return { kind: 'combo', word: zh, vec: L.combine(vecOf(a), vecOf(b), op), item: { kind: 'combo', zh, en, code: '', f: -1, parts: [a, b] }, course: null, a, b, op };
    }
    const s = subjOf(state.word);
    if (s.item.kind === 'discipline' && state.courseN) s.course = L.course(state.courseN, s.item.code);
    return s;
  }
  let S = subject();

  function changed() {
    S = subject();
    store.set('subject', { word: state.word, courseN: state.courseN, combo: state.combo, comboOn: state.comboOn });
    refresh();
  }
  function selectWord(zh) {
    if (!findWord(zh)) return;
    state.word = zh;
    state.comboOn = false;
    changed();
  }

  /* ------------------------------------------------------------------ rendering core */

  const COLOR_KEYS = ['ink', 'paper', 'panel', 'muted', 'line', 'accent', 'seal'];
  let colors = {}, colorsKey = '';
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const c = {};
    for (const k of COLOR_KEYS) c[k] = cs.getPropertyValue('--' + k).trim();
    return c;
  }
  function syncColors() {
    const c = readColors();
    const key = COLOR_KEYS.map((k) => c[k]).join(',');
    if (key === colorsKey) return false;
    colors = c;
    colorsKey = key;
    return true;
  }
  syncColors();

  // Control values for a renderer: declared defaults, overridden by valid remembered values.
  function optsFor(r) {
    const mem = state.opts[r.id] || {};
    const o = {};
    for (const c of r.controls) {
      let v = c.value;
      const m = mem[c.id];
      if (m !== undefined) {
        if (c.type === 'select' && (c.options || []).some((op) => op.value === m)) v = m;
        else if (c.type === 'range' && typeof m === 'number' && Number.isFinite(m)) v = Math.min(c.max, Math.max(c.min, m));
        else if (c.type === 'toggle' && typeof m === 'boolean') v = m;
      }
      o[c.id] = v;
    }
    return o;
  }

  const warned = new Set();
  function errorNote(err, size) {
    const msg = (err && err.message) || String(err);
    const key = msg.slice(0, 120);
    if (!warned.has(key)) { warned.add(key); console.warn('[emblem-lab] renderer failed:', err); }
    const big = size >= 120;
    return h('div', { class: 'render-err', style: `width:${size}px;height:${size}px`, title: msg, role: 'img', 'aria-label': '渲染出错：' + msg },
      big ? [h('b', { text: '渲染出错' }), h('span', { text: msg.slice(0, 90) })] : [h('b', { text: '!' })]);
  }

  // One emblem in a slot. A broken renderer shows a note instead of breaking the page.
  function emblem(r, subj, size, mode, extra) {
    size = Math.max(16, Math.round(size));
    const slot = h('div', { class: 'slot' });
    try {
      const el = r.render({
        vec: subj.vec, word: subj.word, item: subj.item, course: subj.course,
        size, mode, opts: Object.assign({}, (extra && extra.opts) || optsFor(r)),
        colors: Object.assign({}, colors), lab: L,
        hover: (extra && extra.hover) || function () {},
      });
      if (!el || !(el instanceof Node)) throw new Error('render() 没有返回 SVG 或 canvas 元素');
      slot.append(el);
    } catch (e) {
      slot.append(errorNote(e, size));
    }
    return slot;
  }

  /* ------------------------------------------------------------------ subject console */

  let moreOpen = vocab.has(state.word) && vocab.get(state.word).kind !== 'discipline';

  function chip(zh, code) {
    return h('button', {
      type: 'button', class: 'chip', id: 'chip-' + idOf(zh), 'data-word': zh, 'aria-pressed': 'false',
      onclick: () => selectWord(zh),
    }, code ? [zh, h('small', { text: code })] : [zh]);
  }
  function rollRow(label, chips) {
    return h('div', { class: 'roll-row' }, [label, h('div', { class: 'chips' }, chips)]);
  }
  const famLabel = (fam) => h('div', { class: 'roll-label fam', title: `${fam.zh} ${fam.en}` },
    [h('span', { class: 'fam-key', text: fam.key }), h('span', { class: 'label-text', text: fam.zh })]);
  const textLabel = (text) => h('div', { class: 'roll-label' }, h('span', { class: 'label-text', text }));

  function buildRoll() {
    const roll = $('roll');
    roll.textContent = '';
    for (const fam of D.families) {
      roll.append(rollRow(famLabel(fam), disciplines.filter((w) => w.f === fam.f).map((w) => chip(w.zh, w.code))));
    }
    if (custom.length) {
      roll.append(rollRow(textLabel('你的词'), custom.map((c) => h('span', { class: 'chip-pair' }, [
        chip(c.zh),
        h('button', { type: 'button', class: 'chip-del', id: 'chip-del-' + idOf(c.zh), 'aria-label': `删除「${c.zh}」`, title: '删除', text: '×', onclick: () => removeCustom(c.zh) }),
      ]))));
    }
    const more = h('details', { class: 'more', id: 'more-words' }, h('summary', { text: `其他词语 · ${everyday.length} 个日常词，用来对照` }));
    for (const g of wordGroups) {
      const ws = everyday.filter((w) => w.group === g.label);
      if (ws.length) more.append(rollRow(textLabel(g.label), ws.map((w) => chip(w.zh))));
    }
    more.open = moreOpen;
    more.addEventListener('toggle', () => { moreOpen = more.open; });
    roll.append(more);
  }

  function removeCustom(zh) {
    custom = custom.filter((c) => c.zh !== zh);
    vecCache.delete(zh);
    saveCustom();
    if (state.combo.a === zh) state.combo.a = '生物学';
    if (state.combo.b === zh) state.combo.b = '计算机科学';
    if (state.word === zh) state.word = '数学';
    buildRoll();
    fillComboSelects();
    changed();
  }

  function buildCourse() {
    const seg = $('course-presets');
    for (const n of PRESETS) {
      seg.append(h('button', {
        type: 'button', id: 'course-' + (n || 'none'), class: n ? 'num' : null, 'data-n': n, 'aria-pressed': 'false',
        text: n ? String(n) : '无',
        onclick: () => { state.courseN = n; $('course-num').value = n ? String(n) : ''; changed(); },
      }));
    }
    let t = 0;
    $('course-num').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.courseN = clampCourse(e.target.value); changed(); }, 160);
    });
    $('course-num').addEventListener('change', (e) => { e.target.value = state.courseN ? String(state.courseN) : ''; });
  }

  function vocabOptions(sel) {
    sel.textContent = '';
    for (const fam of D.families) {
      sel.append(h('optgroup', { label: fam.zh }, disciplines.filter((w) => w.f === fam.f).map((w) => h('option', { value: w.zh, text: w.zh }))));
    }
    if (custom.length) sel.append(h('optgroup', { label: '你的词' }, custom.map((c) => h('option', { value: c.zh, text: c.zh }))));
    for (const g of wordGroups) {
      const ws = everyday.filter((w) => w.group === g.label);
      if (ws.length) sel.append(h('optgroup', { label: g.label }, ws.map((w) => h('option', { value: w.zh, text: w.zh }))));
    }
  }
  function fillComboSelects() {
    vocabOptions($('combo-a'));
    vocabOptions($('combo-b'));
    $('combo-a').value = state.combo.a;
    $('combo-b').value = state.combo.b;
  }
  function buildCombo() {
    fillComboSelects();
    for (const key of ['a', 'b']) {
      $('combo-' + key).addEventListener('change', (e) => { state.combo[key] = e.target.value; changed(); });
    }
    const seg = $('combo-op');
    for (const [op, label] of OPS) {
      seg.append(h('button', { type: 'button', id: 'combo-op-' + op, 'data-op': op, 'aria-pressed': 'false', title: op, text: label,
        onclick: () => { state.combo.op = op; changed(); } }));
    }
    $('combo-go').addEventListener('click', () => { state.comboOn = !state.comboOn; changed(); });
  }

  function updatePlate() {
    const s = S;
    $('plate').classList.toggle('is-combo', s.kind === 'combo');
    const kicker = $('plate-kicker');
    kicker.textContent = '';
    if (s.kind === 'combo') kicker.append(h('span', { class: 'fam-key', text: '×' }), `交叉学科 · ${opLabel(s.op)}`);
    else if (s.item.f >= 0) {
      const fam = D.families[s.item.f];
      kicker.append(h('span', { class: 'fam-key', text: fam.key }), `${fam.zh} · ${fam.en}`);
    } else if (isCustom(s.word)) kicker.append('你的词 · Claude 现场打分');
    else kicker.append(`日常词 · ${(vocab.get(s.word) || {}).group || ''}`);

    const name = $('plate-name');
    name.textContent = '';
    if (s.kind === 'combo') {
      name.append(s.a, h('br'), h('span', { class: 'x', text: '× ' }), s.b);
      name.style.fontSize = Math.max(26, 58 - 5 * Math.max([...s.a].length, [...s.b].length + 1)) + 'px';
    } else {
      name.textContent = s.word;
      const n = [...s.word].length;
      name.style.fontSize = n <= 3 ? '' : n === 4 ? '50px' : n <= 6 ? '40px' : '30px';
    }
    $('plate-en').textContent = s.kind === 'combo' ? s.item.en : enOf(vocab.get(s.word));

    const tags = $('plate-tags');
    tags.textContent = '';
    if (s.kind === 'discipline') tags.append(h('span', { class: 'tag', text: s.course ? s.course.label : s.item.code }));
    else if (s.kind === 'combo') tags.append(h('span', { class: 'tag seal', text: '交叉' }));
    else tags.append(h('span', { class: 'tag soft', text: isCustom(s.word) ? '你的词' : '对照词' }));
    if (s.course) tags.append(h('span', { class: 'tag soft', text: levelText(s.course.level) }));

    const top = L.top(s.vec, 5);
    const topEl = $('plate-top');
    topEl.textContent = '';
    if (top.length) {
      topEl.append('主要属性 ');
      top.forEach((t, k) => { if (k) topEl.append(' · '); topEl.append(h('span', { text: t.attr.zh })); });
    } else topEl.append('没有非零属性');
  }

  function updateConsole() {
    updatePlate();
    for (const b of document.querySelectorAll('#roll .chip')) {
      const on = !state.comboOn && b.dataset.word === state.word;
      b.setAttribute('aria-pressed', String(on));
      // Phone layout: chip rows scroll sideways; keep the selected chip inside its strip.
      const strip = b.closest('.chips');
      if (on && strip && strip.scrollWidth > strip.clientWidth + 1) {
        const left = b.offsetLeft - strip.offsetLeft;
        if (left < strip.scrollLeft || left + b.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = Math.max(0, left - 24);
      }
    }

    // course
    for (const b of $('course-presets').children) b.setAttribute('aria-pressed', String(+b.dataset.n === state.courseN));
    const num = $('course-num');
    if (document.activeElement !== num) num.value = state.courseN ? String(state.courseN) : '';
    const cn = $('course-note');
    cn.textContent = '';
    if (S.kind !== 'discipline') cn.append('课程编号只作用于 48 个学科。');
    else if (S.course) cn.append('显示为 ', h('b', { class: 'mono', text: S.course.label }), ` · ${levelText(S.course.level)}，尾数 ${String(S.course.minor).padStart(2, '0')}`);
    else cn.append('不加课程记号，显示学科本身。');

    // alchemy
    const on = state.comboOn;
    $('tool-combo').classList.toggle('is-on', on);
    for (const b of $('combo-op').children) b.setAttribute('aria-pressed', String(b.dataset.op === state.combo.op));
    const go = $('combo-go');
    go.setAttribute('aria-pressed', String(on));
    go.textContent = on ? '已合成' : '合成';
    go.title = on ? '再点一次回到单个词' : '把 A 和 B 合成一个新的语义向量';
    $('combo-a').value = state.combo.a;
    $('combo-b').value = state.combo.b;
    const cv = L.combine(vecOf(state.combo.a), vecOf(state.combo.b), state.combo.op);
    const near = $('combo-near');
    near.textContent = '';
    if (!cv.some((x) => x > 0)) near.append('两者没有共同属性，交集为空。');
    else {
      near.append('最接近：');
      L.nearest(cv, 3, [state.combo.a, state.combo.b]).forEach((n, k) => {
        if (k) near.append(' · ');
        near.append(h('b', { text: n.word }), ' ', h('span', { class: 'mono', text: n.sim.toFixed(2) }));
      });
    }
    updateLive();
  }

  /* ------------------------------------------------------------------ live scoring (artifact runtime) */

  let sample = null;
  let sampleState = 'pending'; // pending | ready | none | denied
  let liveCtl = null;
  let liveMsg = '';

  async function initSample() {
    try {
      sample = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('sample') : null;
    } catch (e) {
      sample = null;
    }
    sampleState = sample ? 'ready' : 'none';
    updateLive();
  }

  function updateLive() {
    const word = $('live-word').value.trim();
    const known = !!word && !!findWord(word);
    const go = $('live-go');
    go.textContent = known ? '选中' : '打分';
    go.disabled = !!liveCtl || (!known && sampleState !== 'ready');
    $('live-stop').hidden = !liveCtl;
    let note = liveMsg;
    if (!note) {
      if (known) note = `词表里有「${word}」，直接选中。`;
      else if (sampleState === 'none') note = '现场打分需要在 claude.ai 中打开本页，本地请从词表中选择。';
      else if (sampleState === 'denied') note = '你没有允许本页调用 Claude。';
      else if (sampleState === 'ready') note = '词表里没有的词，由 Claude 按同一套规则现场打分。';
    }
    $('live-status').textContent = note;
  }

  async function onLiveSubmit(e) {
    e.preventDefault();
    const input = $('live-word');
    const word = input.value.trim();
    if (!word) { liveMsg = '先输入一个词。'; updateLive(); return; }
    if (findWord(word)) {
      input.value = '';
      liveMsg = '';
      selectWord(word);
      return;
    }
    if (sampleState !== 'ready' || liveCtl) return;
    const ctl = new AbortController();
    liveCtl = ctl;
    liveMsg = `Claude 正在给「${word}」打分…`;
    updateLive();
    try {
      const json = await sample.json(L.ratingPrompt(word), { signal: ctl.signal, modelTier: 'default' });
      const r = L.parseRating(json);
      custom = custom.filter((c) => c.zh !== word).concat([{ zh: word, r }]).slice(-40);
      vecCache.delete(word);
      saveCustom();
      buildRoll();
      fillComboSelects();
      input.value = '';
      liveMsg = `「${word}」已加入“你的词”，${Object.keys(r).length} 个非零属性。`;
      liveCtl = null;
      selectWord(word);
    } catch (err) {
      const code = err && err.code;
      if (code === 'cancelled') liveMsg = '';
      else if (code === 'not_granted') { sampleState = 'denied'; liveMsg = '你没有允许本页调用 Claude。'; }
      else if (code === 'rate_limited') liveMsg = '请求太频繁，稍后再试。';
      else liveMsg = '打分没有成功，再试一次。';
    } finally {
      if (liveCtl === ctl) liveCtl = null;
      updateLive();
    }
  }

  function buildLive() {
    $('live-form').addEventListener('submit', onLiveSubmit);
    $('live-word').addEventListener('input', () => { liveMsg = ''; updateLive(); });
    $('live-stop').addEventListener('click', () => { if (liveCtl) liveCtl.abort(); });
  }

  /* ------------------------------------------------------------------ gallery */

  const MORE_IDEAS = [
    ['傅里叶轮廓', '语义向量 → 闭合曲线的谐波'],
    ['L-系统生长', '向量当基因，长成植物纹样'],
    ['纹样与编织', '重复单元的四方连续'],
    ['动态 logo', '脉动、呼吸，随课程进度变化'],
    ['声音 logo', '同一个向量换成音高、音色和节奏'],
    ['3D 物件', '纹章做成可以拿在手里的实物'],
    ['配色系统', '小林重顺色彩形象坐标'],
  ];

  function kinFor(s) {
    if (s.item.f >= 0) {
      const sib = disciplines.filter((w) => w.f === s.item.f && w.zh !== s.word).map((w) => w.zh);
      return sib.concat(KIN_DEFAULT.filter((z) => z !== s.word && !sib.includes(z))).slice(0, 4);
    }
    return KIN_DEFAULT.slice(0, 4);
  }

  function cardSize() {
    const grid = $('gallery-grid');
    const w = grid.clientWidth || 900;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const cardW = (w - 16 * (cols - 1)) / cols;
    return Math.round(Math.max(140, Math.min(232, cardW - 60)));
  }

  const featured = L.renderers.find((r) => r.featured) || null;
  const studies = L.renderers.filter((r) => r !== featured);

  // The featured proposal: one large emblem, its pitch, and the whole roll of 48 at a glance.
  function renderFeature(mark) {
    const box = $('gallery-featured');
    box.textContent = '';
    if (!featured) return;
    const r = featured;
    const opts = optsFor(r);
    const wide = window.innerWidth > 760;
    const size = wide ? 300 : Math.min(280, window.innerWidth - 90);
    const stage = h('div', { class: 'feature-stage crop' }, emblem(r, S, size, 'card', { opts }));
    if (mark) stage.append(h('span', { class: 'stage-mark' + (S.kind === 'combo' ? ' seal' : ''), text: mark }));
    const lede = h('div');
    lede.innerHTML = r.about || '';
    const first = lede.querySelector('p');
    box.append(h('a', { class: 'feature', href: '#' + r.id, id: 'card-' + r.id }, [
      stage,
      h('div', { class: 'feature-body' }, [
        h('p', { class: 'feature-kicker' }, [h('b', { text: '提案' }), h('span', { text: r.en || '' })]),
        h('h3', { class: 'feature-name', text: r.name }),
        h('p', { class: 'feature-tag', text: r.tagline || '' }),
        first ? h('p', { class: 'feature-lede', text: first.textContent }) : null,
        h('div', { class: 'feature-roll', 'aria-hidden': 'true' },
          disciplines.map((w) => { const sl = emblem(r, subjOf(w.zh), 40, 'card', { opts }); sl.title = w.zh + ' ' + (w.code || ''); return sl; })),
        h('span', { class: 'feature-go', text: '看完整体系与语法 →' }),
      ]),
    ]));
  }

  function renderGallery() {
    const grid = $('gallery-grid');
    const n = studies.length;
    $('gallery-title').textContent = featured ? `${CN_NUM[n] || n}个原理习作` : `${CN_NUM[n] || n}种生成思路`;
    $('gallery-sub').textContent = featured
      ? '每一种只复现一个传统的机制：矩阵、二进制卦、符印、感知形态、汉字部件、盾徽、家纹、字母。上面的提案把它们合在一起。每张卡片画的是当前学科，底下一排是同门类的其他学科。'
      : '每张卡片用同一个语义向量画出当前的词；底下一排小图是同一体系里的其他学科。点卡片看细节。';
    const mark = S.kind === 'combo' ? '交叉 · ' + opLabel(S.op) : S.course ? S.course.label : S.item.code;
    renderFeature(mark);
    const size = cardSize();
    const kin = kinFor(S).map((zh) => subjOf(zh));
    grid.textContent = '';
    if (!L.renderers.length) grid.append(h('div', { class: 'empty-note', text: '还没有注册任何渲染器（renderers/*.js）。' }));
    for (const r of studies) {
      const opts = optsFor(r);
      const stage = h('div', { class: 'card-stage crop' }, emblem(r, S, size, 'card', { opts }));
      if (mark) stage.append(h('span', { class: 'stage-mark' + (S.kind === 'combo' ? ' seal' : ''), text: mark }));
      grid.append(h('a', { class: 'card', href: '#' + r.id, id: 'card-' + r.id }, [
        stage,
        h('div', { class: 'card-body' }, [
          h('div', { class: 'card-head' }, [h('h3', { class: 'card-name', text: r.name }), h('span', { class: 'card-go', text: r.en || '' })]),
          h('p', { class: 'card-tag', text: r.tagline || '' }),
        ]),
        h('div', { class: 'kin', 'aria-hidden': 'true' }, kin.map((k) => h('figure', null, [
          emblem(r, k, 48, 'card', { opts }), h('figcaption', { text: k.word }),
        ]))),
      ]));
    }
    grid.append(h('div', { class: 'card card-note' + (studies.length % 3 === 0 ? ' wide' : '') }, [
      h('h3', { text: '还可以是什么' }),
      h('p', { text: '这里没做，但同样可以从同一组语义向量出发：' }),
      h('ul', null, MORE_IDEAS.map(([t, d]) => h('li', null, [h('b', { text: t }), h('span', { text: d })]))),
    ]));
  }

  /* ------------------------------------------------------------------ detail view */

  let detailFor = null;

  function setReadout(info) {
    const el = $('detail-readout');
    el.textContent = '';
    if (info && (info.title || info.sub)) {
      el.append(h('b', { text: info.title || '' }), info.sub || '');
    } else el.append('指向图形的部件，这里显示它代表什么（如果这个思路支持）。');
  }

  function fmtNum(v, step) {
    const dec = step ? (String(step).split('.')[1] || '').length : 2;
    return Number(v).toFixed(Math.min(4, dec));
  }

  function setOpt(r, c, v) {
    (state.opts[r.id] = state.opts[r.id] || {})[c.id] = v;
    store.set('opts', state.opts);
    refresh();
  }

  function buildControls(r) {
    const box = $('detail-controls');
    box.textContent = '';
    if (!r.controls.length) { box.append(h('p', { class: 'ctl-none', text: '这个思路没有可调参数。' })); return; }
    const o = optsFor(r);
    for (const c of r.controls) {
      const id = `ctl-${r.id}-${c.id}`;
      const options = c.options || [];
      let input, labelTag = 'span';
      if (c.type === 'select' && options.length <= 5) {
        input = h('div', { class: 'seg', role: 'group', id, 'aria-labelledby': id + '-label' });
        options.forEach((op, k) => input.append(h('button', {
          type: 'button', id: `${id}-${k}`, 'aria-pressed': String(op.value === o[c.id]), text: op.label != null ? op.label : String(op.value),
          onclick: (e) => {
            for (const b of input.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
            setOpt(r, c, op.value);
          },
        })));
      } else if (c.type === 'select') {
        labelTag = 'label';
        input = h('select', { class: 'field', id }, options.map((op, k) => h('option', { value: String(k), text: op.label != null ? op.label : String(op.value) })));
        input.value = String(Math.max(0, options.findIndex((op) => op.value === o[c.id])));
        input.addEventListener('change', () => setOpt(r, c, options[+input.value].value));
      } else if (c.type === 'range') {
        labelTag = 'label';
        const range = h('input', { type: 'range', id, min: c.min, max: c.max, step: c.step != null ? c.step : 'any', value: o[c.id] });
        const out = h('output', { for: id, id: id + '-out', text: fmtNum(o[c.id], c.step) });
        range.addEventListener('input', () => { out.textContent = fmtNum(+range.value, c.step); setOpt(r, c, +range.value); });
        input = h('div', { class: 'ctl-range' }, [range, out]);
      } else if (c.type === 'toggle') {
        input = h('button', { type: 'button', class: 'switch', role: 'switch', id, 'aria-checked': String(!!o[c.id]), 'aria-labelledby': id + '-label' });
        input.addEventListener('click', () => {
          const v = input.getAttribute('aria-checked') !== 'true';
          input.setAttribute('aria-checked', String(v));
          setOpt(r, c, v);
        });
      } else continue;
      const label = h(labelTag, { class: 'ctl-label', id: id + '-label', for: labelTag === 'label' ? id : null, text: c.label || c.id });
      box.append(h('div', { class: 'ctl' }, [label, input]));
    }
    box.append(h('div', { class: 'ctl' }, [h('span'), h('div', null, h('button', {
      type: 'button', class: 'linkish', id: `ctl-${r.id}-reset`, text: '恢复默认参数',
      onclick: () => { delete state.opts[r.id]; store.set('opts', state.opts); buildControls(r); refresh(); },
    }))]));
  }

  function fillDetailText(r) {
    $('crumb-name').textContent = r.name;
    $('detail-en').textContent = r.en || '';
    $('detail-name').textContent = r.name;
    $('detail-tagline').textContent = r.tagline || '';
    $('detail-dims').textContent = r.dims || '—';
    $('detail-lineage').textContent = (r.lineage || '—').replace(/^前人[：:]\s*/, '');
    $('detail-about').innerHTML = r.about || ''; // renderer-authored HTML (trusted project code)
    buildControls(r);
    const pager = $('detail-pager');
    pager.textContent = '';
    const list = L.renderers, k = list.indexOf(r);
    pager.hidden = list.length < 2;
    if (list.length >= 2) {
      const prev = list[(k - 1 + list.length) % list.length], next = list[(k + 1) % list.length];
      pager.append(
        h('a', { href: '#' + prev.id, id: 'pager-prev', class: 'prev' }, [h('span', { class: 'latin', text: '← 上一个思路' }), h('span', { class: 'pager-name', text: prev.name })]),
        h('a', { href: '#' + next.id, id: 'pager-next', class: 'next' }, [h('span', { class: 'latin', text: '下一个思路 →' }), h('span', { class: 'pager-name', text: next.name })]),
      );
    }
  }

  function renderStage(r) {
    const stage = $('detail-stage');
    const size = Math.min(480, Math.max(160, stage.clientWidth - 40));
    stage.textContent = '';
    stage.append(emblem(r, S, size, 'detail', { hover: setReadout }));
    const cap = S.kind === 'combo' ? `${S.word} · ${opLabel(S.op)}` : S.course ? `${S.word} · ${S.course.label}` : [S.word, S.item.code].filter(Boolean).join(' · ');
    stage.append(h('span', { class: 'stage-cap' + (S.kind === 'combo' ? ' seal' : ''), text: cap }));
    setReadout(null);
  }

  function renderSystem(r) {
    const box = $('detail-system');
    const size = (box.clientWidth || 900) < 560 ? 56 : 72;
    const opts = optsFor(r);
    const sig = [r.id, JSON.stringify(opts), colorsKey, size].join('|');
    if (box.dataset.sig !== sig) {
      box.textContent = '';
      for (const fam of D.families) {
        box.append(h('div', { class: 'sys-row' }, [
          h('div', { class: 'sys-label' }, [h('span', { class: 'fam-key', text: fam.key }), h('span', { text: fam.zh }), h('span', { class: 'latin', text: fam.en })]),
          h('div', { class: 'sys-items' }, disciplines.filter((w) => w.f === fam.f).map((w) => h('button', {
            type: 'button', class: 'sys-item', id: 'sys-' + w.code, 'data-word': w.zh, 'aria-pressed': 'false', title: `${w.zh} ${enOf(w)}`,
            onclick: () => selectWord(w.zh),
          }, [emblem(r, subjOf(w.zh), size, 'card', { opts }), h('span', { class: 'cap', text: w.zh }), h('span', { class: 'code', text: w.code })]))),
        ]));
      }
      box.dataset.sig = sig;
    }
    for (const b of box.querySelectorAll('.sys-item')) b.setAttribute('aria-pressed', String(!state.comboOn && b.dataset.word === state.word));
  }

  function renderCourses(r) {
    const block = $('block-courses');
    block.hidden = S.kind !== 'discipline';
    if (block.hidden) return;
    const box = $('detail-courses');
    box.textContent = '';
    const size = Math.round(Math.max(48, Math.min(96, ((box.clientWidth || 600) - 48) / 5 - 6)));
    const opts = optsFor(r);
    for (const n of [101, 201, 301, 401, 501]) {
      const course = L.course(n, S.item.code);
      box.append(h('figure', { class: 'course-item', style: 'margin:0' }, [
        emblem(r, Object.assign({}, S, { course }), size, 'card', { opts }),
        h('figcaption', { style: 'display:grid;justify-items:center;gap:2px' }, [h('span', { class: 'cap', text: course.label }), h('span', { class: 'lvl', text: levelText(course.level) })]),
      ]));
    }
  }

  function renderComposition() {
    const nz = S.vec.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    const top = L.top(S.vec, 12);
    $('comp-sub').textContent = nz
      ? `「${S.word}」有 ${nz} 个非零属性，下面是最强的 ${top.length} 个。地址是属性在 256 维里的字节位置：高位是领域，低位是领域内的序号。`
      : `「${S.word}」没有非零属性。`;
    const list = $('comp-top');
    list.textContent = '';
    if (!top.length) list.append(h('li', { class: 'comp-empty', text: '空向量：渲染器应当画出一个淡淡的空状态。' }));
    for (const t of top) {
      list.append(h('li', { class: 'comp-row' }, [
        h('span', { class: 'hex', text: L.hex(t.i) }),
        h('span', { text: t.attr.zh }),
        h('span', { class: 'en', text: t.attr.en }),
        h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${(t.v * 100).toFixed(1)}%` })),
        h('span', { class: 'val', text: String(byte(t.v)) }),
      ]));
    }
    const ds = L.domainSum(S.vec);
    const max = Math.max(1e-6, ...ds);
    const doms = $('comp-doms');
    doms.textContent = '';
    D.domains.forEach((dm, d) => {
      doms.append(h('div', { class: 'dom', title: `${dm.zh} ${dm.en}：${ds[d].toFixed(2)}` }, [
        h('span', { class: 'dom-val', text: ds[d] ? ds[d].toFixed(1) : '0' }),
        h('div', { class: 'dom-track' }, h('i', { style: `height:${((ds[d] / max) * 100).toFixed(1)}%` })),
        h('span', { class: 'dom-name', text: dm.zh }),
      ]));
    });
  }

  function renderDetail() {
    const r = L.renderers.find((x) => x.id === state.rid);
    if (!r) return;
    if (detailFor !== r.id) { fillDetailText(r); detailFor = r.id; }
    $('crumb-subj').textContent = S.course ? `${S.word} ${S.course.label}` : S.word;
    renderStage(r);
    renderSystem(r);
    renderCourses(r);
    renderComposition();
  }

  /* ------------------------------------------------------------------ attribute table */

  const nWords = D.words.length;
  const counts = D.stats.freq.map((f) => Math.round(f * nWords));
  const maxCount = Math.max(1, ...counts);
  let attrsBuilt = false;

  function cellShade(c) {
    return c ? 10 + Math.round((62 * c) / maxCount) : 0;
  }

  function buildAttrs() {
    if (attrsBuilt) return;
    attrsBuilt = true;
    const dead = counts.filter((c) => c === 0).length;
    $('attrs-intro').textContent = `256 = 16 个领域 × 16 个属性，每行一个领域。格子越深，${nWords} 个词里用到这个属性的越多；斜线格是“死像素”，没有一个词用到它。死像素和被滥用的属性，正是挑选属性时要解决的问题。`;

    const order = counts.map((c, i) => i).sort((a, b) => counts[b] - counts[a] || a - b);
    const stats = $('attrs-stats');
    stats.append(
      h('span', null, ['死像素 ', h('b', { class: 'mono', text: String(dead) }), ' 个']),
      h('span', null, ['平均每个属性被 ', h('b', { class: 'mono', text: (counts.reduce((a, b) => a + b, 0) / 256).toFixed(1) }), ' 个词用到']),
      h('span', null, ['用得最多：', ...order.slice(0, 5).flatMap((i, k) => [k ? ' · ' : '', h('b', { text: D.attrs[i].zh }), ' ', h('span', { class: 'mono', text: String(counts[i]) })])]),
    );

    const ramp = h('span', { class: 'ramp' }, [0.1, 0.3, 0.55, 0.8, 1].map((t) => h('i', { class: 'sw', style: `background:color-mix(in srgb, var(--accent) ${cellShade(Math.max(1, Math.round(t * maxCount)))}%, var(--panel))` })));
    $('attrs-legend').append(
      h('span', null, ['1 个词', ramp, `${maxCount} 个词`]),
      h('span', null, [h('i', { class: 'sw', style: 'background:repeating-linear-gradient(135deg, transparent 0 4px, var(--line) 4px 5px), var(--panel)' }), '死像素（0 个词）']),
      h('span', { id: 'legend-mine' }),
    );

    const table = $('attrs-table');
    const head = h('tr', null, [h('th', { scope: 'col' }, h('span', { class: 'latin', text: 'Domain' }))]);
    for (let k = 0; k < 16; k++) head.append(h('th', { scope: 'col', text: '_' + k.toString(16).toUpperCase() }));
    const body = h('tbody');
    for (const dm of D.domains) {
      const row = h('tr', null, h('th', { scope: 'row' }, [h('b', { text: dm.zh }), h('span', { text: dm.en })]));
      for (let k = 0; k < 16; k++) {
        const i = dm.d * 16 + k, a = D.attrs[i], c = counts[i];
        const cls = 'cell' + (c === 0 ? ' dead' : c / maxCount > 0.5 ? ' hot' : '');
        row.append(h('td', null, h('button', {
          type: 'button', class: cls, id: 'attr-' + L.hex(i), 'data-i': i, 'aria-pressed': 'false',
          style: c ? `--p:${cellShade(c)}%` : null,
          title: `${L.hex(i)} ${a.zh} ${a.en} · ${c} 个词`,
          onclick: () => { state.attr = i; updateAttrs(); },
        }, [h('span', { class: 'zh', text: a.zh }), h('span', { class: 'meta' }, [h('span', { text: L.hex(i) }), c ? h('span', { text: String(c) }) : h('b', { text: '死' })])])));
      }
      body.append(row);
    }
    table.append(h('thead', null, head), body);
  }

  function updateAttrs() {
    buildAttrs();
    if (state.attr == null) state.attr = (L.top(S.vec, 1)[0] || { i: order0() }).i;
    for (const b of document.querySelectorAll('#attrs-table .cell')) {
      const i = +b.dataset.i;
      b.classList.toggle('mine', S.vec[i] > 0);
      b.setAttribute('aria-pressed', String(i === state.attr));
    }
    const nz = S.vec.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    const lm = $('legend-mine');
    lm.textContent = '';
    lm.append(h('i', { class: 'sw', style: 'box-shadow: inset 0 0 0 2px var(--ink)' }), `粗框：当前「${S.word}」用到的 ${nz} 个属性`);
    renderAttrPick();
  }
  function order0() { return counts.indexOf(maxCount); }

  function renderAttrPick() {
    const i = state.attr, a = D.attrs[i], dm = D.domains[a.d], c = counts[i];
    const box = $('attr-pick');
    box.textContent = '';
    const pair = a.pair >= 0 ? D.attrs[a.pair] : null;
    box.append(h('div', null, [
      h('p', { class: 'hexbig', text: `${L.hex(i)} · 第 ${a.d + 1} 行第 ${a.k + 1} 格` }),
      h('h3', { text: a.zh }),
      h('p', { class: 'latin', style: 'margin:2px 0 0', text: a.en }),
      h('dl', null, [
        h('div', null, [h('dt', { text: '领域' }), h('dd', { text: `${dm.zh} ${dm.en}` })]),
        h('div', null, [h('dt', { text: '反义' }), h('dd', null, pair ? h('button', { type: 'button', class: 'linkish', id: 'attr-pair', text: `${pair.zh} ${L.hex(a.pair)}`, onclick: () => { state.attr = a.pair; updateAttrs(); } }) : '—')]),
        h('div', null, [h('dt', { text: '使用' }), h('dd', null, [h('span', { class: 'mono', text: `${c} / ${nWords}` }), c ? ` 个词（${Math.round((c / nWords) * 100)}%）` : ' 个词，死像素'])]),
        h('div', null, [h('dt', { text: '当前' }), h('dd', null, [`「${S.word}」 `, h('span', { class: 'mono', text: String(byte(S.vec[i])) })])]),
      ]),
    ]));
    const users = D.words.concat(custom)
      .map((w) => ({ w, v: +(w.r[i] || 0) }))
      .filter((u) => u.v > 0)
      .sort((x, y) => y.v - x.v)
      .slice(0, 8);
    const right = h('div', null, h('p', { class: 'users-title', text: users.length ? `用得最多的 ${users.length} 个词（点击切换当前词）` : '没有词用到它。' }));
    if (users.length) {
      right.append(h('ol', { class: 'users' }, users.map((u, k) => h('li', null, h('button', {
        type: 'button', class: 'user', id: 'attr-user-' + k, 'aria-pressed': String(!state.comboOn && u.w.zh === state.word),
        onclick: () => selectWord(u.w.zh),
      }, [
        h('span', { class: 'rank', text: String(k + 1) }),
        h('span', null, [u.w.zh, u.w.code ? h('small', { class: 'mono', text: u.w.code }) : null]),
        h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${((u.v / 255) * 100).toFixed(1)}%` })),
        h('span', { class: 'val', text: String(u.v) }),
      ])))));
    }
    box.append(right);
  }

  /* ------------------------------------------------------------------ routing */

  const single = L.renderers.length === 1 ? L.renderers[0] : null;

  function parseHash() {
    let t = location.hash.replace(/^#/, '');
    try { t = decodeURIComponent(t); } catch (e) { /* keep raw */ }
    if (t === 'attrs') return { view: 'attrs', rid: null };
    if (t === 'principles') return { view: 'principles', rid: null };
    if (L.renderers.some((r) => r.id === t)) return { view: 'detail', rid: t };
    if (single) return { view: 'detail', rid: single.id };
    return { view: 'gallery', rid: null };
  }

  function route(initial) {
    const prevView = state.view;
    Object.assign(state, parseHash());
    $('view-gallery').hidden = state.view !== 'gallery';
    $('view-detail').hidden = state.view !== 'detail';
    $('view-attrs').hidden = state.view !== 'attrs';
    $('view-principles').hidden = state.view !== 'principles';
    $('console').hidden = state.view === 'attrs' || state.view === 'principles';
    const navG = $('nav-gallery'), navA = $('nav-attrs'), navP = $('nav-principles');
    if (state.view === 'principles') navP.setAttribute('aria-current', 'page'); else navP.removeAttribute('aria-current');
    navG.hidden = !!single;
    if (single) navG.removeAttribute('aria-current');
    else if (state.view === 'gallery') navG.setAttribute('aria-current', 'page');
    else navG.removeAttribute('aria-current');
    if (state.view === 'attrs') navA.setAttribute('aria-current', 'page'); else navA.removeAttribute('aria-current');
    if (single) {
      navG.hidden = true;
      $('crumb-home').hidden = true;
      $('crumb-home').nextElementSibling.hidden = true;
    }
    renderView();
    if (!initial) {
      if (state.view === 'detail' && !single) scrollToEl($('view-detail'));
      else if (state.view !== prevView) window.scrollTo(0, 0);
    }
  }

  /* ------------------------------------------------------------------ refresh, theme, resize */

  let raf = 0;
  function refresh() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; renderView(); });
  }
  function renderView() {
    updateConsole();
    if (state.view === 'gallery') renderGallery();
    else if (state.view === 'detail') renderDetail();
    else if (state.view === 'attrs') updateAttrs();
  }

  function onTheme() { if (syncColors()) refresh(); }
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  if (darkMq.addEventListener) darkMq.addEventListener('change', onTheme);
  else if (darkMq.addListener) darkMq.addListener(onTheme);
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let lastW = window.innerWidth, resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      refresh();
    }, 160);
  });

  /* ------------------------------------------------------------------ boot */

  {
    const ms = $('mast-sub');
    ms.textContent = '';
    const parts = [['48', ' 个学科']];
    if (single) parts.push(['', single.name]);
    else if (featured) parts.push(['1', ' 个提案'], [String(studies.length), ' 个原理习作']);
    else parts.push([String(L.renderers.length), ' 种生成思路']);
    parts.forEach(([b, t], i) => { if (i) ms.append(' · '); if (b) ms.append(h('b', { text: b })); ms.append(t); });
    ms.append(' · 同一组语义向量');
  }
  buildRoll();
  buildCourse();
  buildCombo();
  buildLive();
  $('crumb-change').addEventListener('click', () => { scrollToEl($('console')); });
  window.addEventListener('hashchange', () => route(false));
  route(true);
  setTimeout(initSample, 0); // never block first paint on the runtime
})();
