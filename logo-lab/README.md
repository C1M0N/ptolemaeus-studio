# 学科纹章实验室

给每个学科、每门课程生成一个纹章（图腾、盾徽、符号）的实验。底层思路见 [PRINCIPLES.md](PRINCIPLES.md)。

## 打开

直接用浏览器打开 `index.html`（所有思路的总览），或者 `demos/<思路>.html`（单个思路）。不需要服务器。
在 claude.ai 里打开发布版时，还可以输入任意词，由 Claude 现场打分生成。

## 五种思路

| 文件 | 名字 | 一句话 |
|---|---|---|
| `renderers/matrix.js` | 矩阵 | 最初的想法：256 个属性排成 16×16，亮度就是语义强度 |
| `renderers/growth.js` | 生长 | 矩阵是基因：集中的学科长成圆盘，扩散的长成珊瑚；门类是种子，课程号是生长阶段 |
| `renderers/field.js` | 墨迹 | 亮的属性在语义平面上滴墨，用最小生成树连成一体，再像罗夏墨迹那样对折；用方格拼砖织出来，花样 = 领域，灰度 = 亮度 |
| `renderers/form.js` | 形态 | 收缩成约 10 根感知轴，映射到圆/尖、色彩、对称 |
| `renderers/monogram.js` | 代码字形 | 课程代码字母拼成字形，MIT Media Lab 那条路线的改良版 |

生长用 `LogoLab.features(vec)` 从整个矩阵算出"扩散度"（16 个领域上的分布熵、主要领域数、亮格在相似网格上的离散半径、强属性的团块数，按 48 个学科排名换算成 0~1），再用它去决定图形是聚还是散。墨迹不用这个数，聚散直接来自属性在语义平面上的排布。

打过分的课程（`data/courses.json` + `data/ratings_courses_*.json`）只按自己的语义向量生成，不以学科为底。MATH 414 和 STAT 414 是同一门交叉课程，由两个互不知情的打分者分别打分（余弦相似度 0.94）。`node tools/measure.mjs field` 会把所有课程的纹章栅格化，两两比较视觉相似度，看它是否跟着语义相似度走。

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
