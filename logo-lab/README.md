# 学科纹章实验室

给每个学科、每门课程生成一个纹章（图腾、盾徽、符号）的实验。底层思路见 [PRINCIPLES.md](PRINCIPLES.md)。

## 打开

直接用浏览器打开 `index.html`（所有思路的总览），或者 `demos/<思路>.html`（单个思路）。不需要服务器。
在 claude.ai 里打开发布版时，还可以输入任意词，由 Claude 现场打分生成。

## 九种思路

| 文件 | 名字 | 一句话 |
|---|---|---|
| `renderers/grammar.js` | 纹章语法（提案） | 综合盾徽、家纹、汉字的机制：槽位 × 语素表 × 词形变化，规格与画法分离 |
| `renderers/matrix.js` | 矩阵 | 最初的想法：256 个属性排成 16×16，亮度就是语义强度 |
| `renderers/hexagram.js` | 卦象 | 只选 8 根对立轴，2⁸ = 256 个原型 |
| `renderers/sigil.js` | 符印 | 把属性排在轮盘上，按强度连线，像古老的符印 |
| `renderers/form.js` | 形态 | 收缩成约 10 根感知轴，映射到圆/尖、色彩、对称 |
| `renderers/radicals.js` | 字根 | 像汉字一样，用语义部首按结构拼成一个"字"，盖成印章 |
| `renderers/heraldry.js` | 盾徽 | 分区、色彩法则、寻常纹章、图形纹章、分家标记、拼合 |
| `renderers/kamon.js` | 家纹 | 母题 + 词形变化（数量、对向、交叉、阴阳）+ 圆规作图 |
| `renderers/monogram.js` | 代码字形 | 课程代码字母拼成字形，MIT Media Lab 那条路线的改良版 |

每种思路都实现同样的三层：**门类**（外框、分区之类最先被看到的特征）→ **学科**（主体图形）→ **课程号**（数得清的小标记）。

## 数据

- `data/attributes.json`：256 个语义属性，16 个领域 × 16 个（`tools/make_attributes.py` 生成）。
- `data/rubric.md`：打分规则。
- `data/ratings.json`：71 个日常词的打分；`data/ratings_disciplines.json`：48 个学科的打分。都由 Claude 按规则打分，再由另一个 Claude 独立复核。
- `shared/semantics.js`：由 `tools/build_data.py` 生成，包含向量、统计、相似度布局（MDS）、16×16 网格布局和合成轴。

改了打分或属性之后：

```sh
python3 tools/build_data.py     # 重新生成 shared/semantics.js
python3 tools/make_pages.py     # 重新生成 index.html 和 demos/
```

## 加一种新思路

按 [CONTRACT.md](CONTRACT.md) 写一个 `renderers/<id>.js`，用 `tools/harness.html?r=<id>` 预览，用 `node tools/shoot.mjs` 截图检查，然后重新生成页面。
