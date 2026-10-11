"""Builds shared/semantics.js from data/attributes.json + data/ratings.json.

Besides the raw word vectors it precomputes everything the renderers share:
  - per-attribute stats (how often an attribute lights up across the vocabulary)
  - an attribute similarity map (co-activation across words, blended with a domain prior)
  - 2D coordinates (SMACOF MDS) for field / constellation style renderers
  - a circular ordering for wheel style renderers
  - three 16x16 grid layouts: by domain, by similarity, and concentric rings by generality
  - composite axes (yin/yang, good/evil, ...) defined as lists of attribute indices

Run: python3 tools/build_data.py
"""
import json, pathlib
import numpy as np
from scipy.optimize import linear_sum_assignment

ROOT = pathlib.Path(__file__).resolve().parent.parent
N = 256

# Disciplines, grouped by family (门类). Each: 中文 English CODE (course-code prefix).
FAMILIES = [
    ("理", "理学", "Sciences", "数学 Mathematics MATH|统计学 Statistics STAT|物理学 Physics PHYS|化学 Chemistry CHEM|天文学 Astronomy ASTR|地质学 Geology GEOL|地理学 Geography GEOG|大气科学 Atmospheric_Science ATMS|海洋科学 Ocean_Science OCEA"),
    ("工", "工学", "Engineering", "计算机科学 Computer_Science CS|人工智能 Artificial_Intelligence AI|电子工程 Electrical_Engineering EE|机械工程 Mechanical_Engineering ME|土木工程 Civil_Engineering CE|建筑学 Architecture ARCH|材料科学 Materials_Science MSE|化学工程 Chemical_Engineering CHE|航空航天 Aerospace_Engineering AERO|环境工程 Environmental_Engineering ENVE"),
    ("生", "生命与健康", "Life & Health", "生物学 Biology BIOL|生态学 Ecology ECOL|农学 Agriculture AGRI|医学 Medicine MED|神经科学 Neuroscience NEUR|药学 Pharmacy PHAR|公共卫生 Public_Health PUBH"),
    ("人", "人文", "Humanities", "哲学 Philosophy PHIL|历史学 History HIST|考古学 Archaeology ARCL|文学 Literature LIT|语言学 Linguistics LING|宗教学 Religious_Studies RELI"),
    ("社", "社会科学", "Social Sciences", "心理学 Psychology PSYC|社会学 Sociology SOCI|人类学 Anthropology ANTH|政治学 Political_Science POLI|教育学 Education EDUC|新闻传播 Communication COMM"),
    ("经", "经管法", "Economics, Management & Law", "经济学 Economics ECON|金融学 Finance FIN|管理学 Management MGMT|法学 Law LAW"),
    ("艺", "艺术", "Arts", "音乐 Music MUSI|美术 Fine_Art ART|设计 Design DES|电影 Film FILM|戏剧 Theatre THEA|舞蹈 Dance DANC"),
]

# other (non-discipline) words shown in the picker, in display order
GROUPS = [
    ("生灵", "猴子 狮子 猫 蛇 蝴蝶 鹰 鲸 狐狸 蜜蜂 乌鸦 猫头鹰 龙 凤凰"),
    ("自然", "火 水 山 海 月亮 太阳 雷 雪 树 森林 玫瑰 莲花 种子 沙漠 星空"),
    ("器物", "剑 书 钥匙 镜子 灯塔 火箭 机器人 电脑 茶 咖啡 钻石 金币 毒药 骷髅 桥 面具 音乐"),
    ("场所", "城市 寺庙 医院 银行 学校 网络"),
    ("人物", "母亲 婴儿 国王 战士 小丑 神 孙悟空"),
    ("抽象", "爱 死亡 梦 自由 时间 孤独 战争 和平 智慧 秘密 节日 革命 婚礼 希望"),
]

# composite axes: (key, positive label, negative label, positive attrs, negative attrs)
AXES = [
    ("yang", "阳", "阴", [24, 37, 225, 224, 86, 45, 56, 33], [25, 38, 239, 234, 85, 226, 57, 41]),
    ("life", "生", "死", [0, 2, 90, 238, 96, 97, 109, 110], [1, 3, 91, 104, 210, 234, 111, 153]),
    ("good", "善", "恶", [160, 164, 128, 129, 130, 131, 132, 172, 168, 138], [161, 165, 144, 145, 146, 147, 152, 154, 173, 169, 31]),
    ("active", "动", "静", [80, 88, 89, 136, 144, 48, 16, 183, 87, 84], [81, 82, 49, 130, 7, 155]),
    ("hard", "刚", "柔", [67, 59, 61, 75, 106, 194, 26, 69], [66, 58, 60, 74, 132, 83, 17, 95]),
    ("nature", "天", "人", [96, 97, 231, 230, 228, 90, 109, 17, 18, 224], [193, 192, 195, 196, 203, 202, 201, 194, 198, 220]),
    ("order", "治", "乱", [240, 72, 187, 243, 250, 252, 7, 69], [241, 73, 188, 120, 253, 251, 183, 246]),
    ("warm", "暖", "寒", [56, 16, 32, 33, 225, 129, 176, 128], [57, 23, 35, 237, 159, 239, 226, 148]),
    ("power", "强", "弱", [92, 64, 94, 59, 178, 179, 88, 125, 194], [93, 65, 95, 58, 124, 113]),
    ("concrete", "实", "虚", [14, 99, 22, 101, 206, 199, 192, 18, 20, 21], [15, 117, 116, 12, 13, 114, 118, 240, 244, 142]),
]


def load():
    attrs = json.loads((ROOT / "data/attributes.json").read_text())
    ratings = json.loads((ROOT / "data/ratings.json").read_text())
    disciplines = json.loads((ROOT / "data/ratings_disciplines.json").read_text())
    return attrs, ratings, disciplines


def parse_ratings(*docs):
    by_word = {}
    for doc in docs:
        for w in doc["words"]:
            zh, _, en = w["word"].partition("/")
            vec = np.zeros(N, dtype=np.int32)
            for r in w["ratings"]:
                if 0 <= r["i"] < N:
                    vec[r["i"]] = max(vec[r["i"]], min(255, max(0, int(r["v"]))))
            by_word[zh.strip()] = (en.strip(), vec)
    return by_word


def word_vectors(by_word):
    words = []
    # "音乐" is both a discipline and an everyday word; the discipline wins, the word list skips it.
    for f, (key, fzh, fen, items) in enumerate(FAMILIES):
        for item in items.split("|"):
            zh, en, code = item.split(" ")
            if zh not in by_word:
                raise SystemExit(f"missing ratings for discipline {zh}")
            words.append({"zh": zh, "en": en.replace("_", " "), "group": fzh, "kind": "discipline",
                          "code": code, "f": f, "vec": by_word[zh][1]})
    taken = {w["zh"] for w in words}
    for group, names in GROUPS:
        for zh in names.split():
            if zh in taken:
                continue
            if zh not in by_word:
                raise SystemExit(f"missing ratings for {zh}")
            en, vec = by_word[zh]
            words.append({"zh": zh, "en": en, "group": group, "kind": "word", "vec": vec})
            taken.add(zh)
    extra = set(by_word) - taken
    if extra:
        print("note: ignoring unlisted words", extra)
    return words


def similarity(X, domains):
    """Attribute x attribute similarity in [0, 1]."""
    norms = np.linalg.norm(X, axis=0)
    safe = np.where(norms > 0, norms, 1)
    C = (X.T @ X) / np.outer(safe, safe)
    C[norms == 0, :] = 0
    C[:, norms == 0] = 0
    same = (domains[:, None] == domains[None, :]).astype(float)
    S = 0.6 * C + 0.4 * same
    np.fill_diagonal(S, 1)
    return S


def smacof(D, X0, iters=300):
    n = D.shape[0]
    X = X0.copy()
    for _ in range(iters):
        dist = np.linalg.norm(X[:, None] - X[None, :], axis=2)
        with np.errstate(divide="ignore", invalid="ignore"):
            B = -np.where(dist > 1e-9, D / dist, 0)
        np.fill_diagonal(B, 0)
        np.fill_diagonal(B, -B.sum(axis=1))
        X = B @ X / n
    return X


def classical_mds(D):
    n = D.shape[0]
    J = np.eye(n) - np.ones((n, n)) / n
    B = -0.5 * J @ (D ** 2) @ J
    vals, vecs = np.linalg.eigh(B)
    idx = np.argsort(vals)[::-1][:2]
    return vecs[:, idx] * np.sqrt(np.maximum(vals[idx], 1e-9))


def spread(P, min_dist=0.035, iters=200):
    """Push points apart so none overlap, keeping them inside the unit square."""
    P = P.copy()
    for _ in range(iters):
        diff = P[:, None] - P[None, :]
        dist = np.linalg.norm(diff, axis=2) + np.eye(len(P))
        push = np.clip(min_dist - dist, 0, None) / dist
        np.fill_diagonal(push, 0)
        P += 0.5 * (diff * push[:, :, None]).sum(axis=1)
        P = np.clip(P, 0.04, 0.96)
    return P


def normalize01(P, margin=0.06):
    P = P - P.min(axis=0)
    P = P / P.max()  # keep aspect ratio
    span = P.max(axis=0)
    P = P + (1 - span) / 2
    return margin + P * (1 - 2 * margin)


def grid_cells():
    return np.array([(r, c) for r in range(16) for c in range(16)], dtype=float)


def grid_by_similarity(P, D):
    """Assign attributes to 16x16 cells: Hungarian on MDS coords, then neighbour-swap refinement."""
    cells = (grid_cells()[:, ::-1] + 0.5) / 16  # (x, y)
    cost = ((P[:, None, :] - cells[None, :, :]) ** 2).sum(axis=2)
    rows, cols = linear_sum_assignment(cost)
    cell_of = np.empty(N, dtype=int)
    cell_of[rows] = cols
    attr_at = np.empty(N, dtype=int)
    attr_at[cell_of] = np.arange(N)

    def neighbours(cell):
        r, c = divmod(cell, 16)
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if 0 <= rr < 16 and 0 <= cc < 16:
                yield rr * 16 + cc

    def local_cost(cell, attr):
        return sum(D[attr, attr_at[n]] for n in neighbours(cell) if attr_at[n] != attr)

    rng = np.random.default_rng(7)
    for _ in range(40000):
        a, b = rng.integers(0, N, size=2)
        if a == b:
            continue
        ia, ib = attr_at[a], attr_at[b]
        before = local_cost(a, ia) + local_cost(b, ib)
        attr_at[a], attr_at[b] = ib, ia
        after = local_cost(a, ib) + local_cost(b, ia)
        if after > before:
            attr_at[a], attr_at[b] = ia, ib
    cell_of[attr_at] = np.arange(N)
    return cell_of


def grid_rings(P, freq, mean):
    """Most general attributes (fire most often) in the centre ring, the most specific outside."""
    cells = grid_cells()
    centre = 7.5
    ring = np.maximum(np.abs(cells[:, 0] - centre), np.abs(cells[:, 1] - centre)).astype(int)  # 0..7
    ang_cell = np.arctan2(cells[:, 0] - centre, cells[:, 1] - centre)
    c = P.mean(axis=0)
    ang_attr = np.arctan2(P[:, 1] - c[1], P[:, 0] - c[0])
    order = np.lexsort((-mean, -freq))  # by freq desc, then mean desc
    cell_of = np.empty(N, dtype=int)
    start = 0
    for rg in range(8):
        ring_cells = np.where(ring == rg)[0]
        ring_cells = ring_cells[np.argsort(ang_cell[ring_cells])]
        members = order[start:start + len(ring_cells)]
        members = members[np.argsort(ang_attr[members])]
        cell_of[members] = ring_cells
        start += len(ring_cells)
    return cell_of


def main():
    attrs_doc, ratings, disciplines = load()
    attrs = attrs_doc["attrs"]
    # discipline ratings come second so they win if a name appears in both files
    words = word_vectors(parse_ratings(ratings, disciplines))
    X = np.array([w["vec"] for w in words], dtype=float) / 255.0  # words x attrs
    domains = np.array([a["d"] for a in attrs])

    freq = (X > 0).mean(axis=0)
    mean = X.mean(axis=0)
    S = similarity(X, domains)
    D = 1 - S

    P = smacof(D, classical_mds(D))
    P = spread(normalize01(P))

    c = P.mean(axis=0)
    ang = np.arctan2(P[:, 1] - c[1], P[:, 0] - c[0])
    angle = np.empty(N)
    angle[np.argsort(ang)] = np.arange(N) / N

    dom_centroid = np.array([P[domains == d].mean(axis=0) for d in range(16)])
    dom_ang = np.arctan2(dom_centroid[:, 1] - c[1], dom_centroid[:, 0] - c[0])
    domain_order = [int(d) for d in np.argsort(dom_ang)]

    grid_domain = [a["d"] * 16 + a["k"] for a in attrs]
    grid_sim = grid_by_similarity(P, D)
    rings = grid_rings(P, freq, mean)

    nonzero = (X > 0).sum(axis=1)
    print(f"disciplines: {sum(w['kind'] == 'discipline' for w in words)}")
    print(f"words: {len(words)}; nonzero per word min/mean/max = {nonzero.min()}/{nonzero.mean():.1f}/{nonzero.max()}")
    dead = [attrs[i]["zh"] for i in range(N) if freq[i] == 0]
    print(f"attributes never used by any word ({len(dead)}): {' '.join(dead)}")
    top = np.argsort(-freq)[:12]
    print("most frequent:", ", ".join(f"{attrs[i]['zh']} {freq[i]:.2f}" for i in top))

    data = {
        "version": 1,
        "placeholder": bool(disciplines.get("placeholder")),
        "domains": attrs_doc["domains"],
        "attrs": attrs,
        "families": [{"f": f, "key": k, "zh": z, "en": e} for f, (k, z, e, _) in enumerate(FAMILIES)],
        "groups": [{"label": z, "kind": "discipline"} for _, z, _, _ in FAMILIES]
                  + [{"label": g, "kind": "word"} for g, _ in GROUPS],
        "words": [dict({k: w[k] for k in ("zh", "en", "group", "kind") },
                       **({"code": w["code"], "f": w["f"]} if w["kind"] == "discipline" else {}),
                       r={str(i): int(v) for i, v in enumerate(w["vec"]) if v > 0}) for w in words],
        "stats": {"freq": [round(float(f), 4) for f in freq], "mean": [round(float(m), 4) for m in mean]},
        "layouts": {
            "gridDomain": grid_domain,
            "gridSimilar": [int(x) for x in grid_sim],
            "gridRings": [int(x) for x in rings],
            "xy": [[round(float(x), 4), round(float(y), 4)] for x, y in P],
            "angle": [round(float(a), 5) for a in angle],
            "domainOrder": domain_order,
        },
        "axes": [{"key": k, "pos": p, "neg": n, "posAttrs": pa, "negAttrs": na} for k, p, n, pa, na in AXES],
        "rubric": (ROOT / "data/rubric.md").read_text(),
    }
    js = ("// Generated by tools/build_data.py. Do not edit by hand.\n"
          "window.LogoLabData = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    out = ROOT / "shared/semantics.js"
    out.write_text(js)
    print(f"wrote {out} ({len(js) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
