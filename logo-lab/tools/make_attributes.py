"""Writes data/attributes.json: 16 domains x 16 attributes = 256 semantic dimensions.

Index i = domain * 16 + k. `pairs` lists antonym pairs (used for mirrored layouts and axes).
"""
import json, pathlib

DOMAINS = [
    ("存在", "Being & Time", "生命 life|死亡 death|诞生 birth|终结 ending|永恒 eternal|短暂 fleeting|变化 change|恒定 constancy|时间 time|古老 ancient|未来 future|循环 cycle|虚无 void|无限 infinite|实在 tangible|虚幻 illusory"),
    ("元素", "Elements", "火 fire|水 water|土 earth|风 wind|金属 metal|木 wood|石 stone|冰 ice|光 light|暗 darkness|电 electricity|烟雾 smoke|血 blood|沙尘 dust|晶体 crystal|毒 poison"),
    ("色彩", "Color & Sight", "红 red|黄 yellow|绿 green|蓝 blue|紫 purple|白 white|黑 black|金色 golden|银色 silver|灰 grey|鲜艳 vivid|素淡 muted|透明 transparent|闪耀 glittering|斑纹 patterned|多彩 multicolored"),
    ("感官", "Senses", "响亮 loud|寂静 silent|悦耳 melodious|刺耳 harsh|甜 sweet|苦 bitter|芳香 fragrant|腥臭 foul|炽热 hot|寒冷 cold|柔软 soft|坚硬 hard|光滑 smooth|粗糙 rough|湿润 wet|干燥 dry"),
    ("形态", "Form & Space", "巨大 huge|微小 tiny|圆润 round|尖锐 pointed|修长 elongated|方正 angular|高耸 tall|低伏 low|对称 symmetric|不规则 irregular|曲线 curving|直线 straight|空心 hollow|实心 solid|向心 centered|分散 scattered"),
    ("运动", "Motion & Energy", "迅速 fast|缓慢 slow|静止 still|流动 flowing|飞翔 flying|坠落 falling|上升 rising|旋转 spinning|爆发 explosive|脉动 pulsing|生长 growing|衰败 decaying|力量 powerful|脆弱 fragile|沉重 heavy|轻盈 weightless"),
    ("生物", "Body & Creature", "动物 animal|植物 plant|人 human|身体 body|眼睛 eye|手 hand|嘴 mouth|心脏 heart|骨骼 bone|翅膀 wing|爪牙 claws & fangs|毛发 fur|鳞甲 scales & shell|花朵 flower|种子 seed & fruit|疾病 disease"),
    ("心智", "Mind", "聪慧 intelligent|愚钝 foolish|知识 knowledge|记忆 memory|梦境 dream|想象 imagination|理性 reason|直觉 instinct|疯狂 madness|专注 focus|好奇 curiosity|狡黠 cunning|天真 innocence|意志 willpower|神秘 mystery|觉悟 enlightenment"),
    ("正面情感", "Positive Feeling", "喜悦 joy|爱 love|平静 calm|希望 hope|温柔 tenderness|骄傲 pride|勇气 courage|感恩 gratitude|兴奋 excitement|幽默 humor|安心 security|敬畏 awe|满足 contentment|浪漫 romance|自由 freedom|怀旧 nostalgia"),
    ("负面情感", "Negative Feeling", "愤怒 anger|恐惧 fear|悲伤 sadness|厌恶 disgust|孤独 loneliness|焦虑 anxiety|嫉妒 envy|羞耻 shame|痛苦 pain|绝望 despair|仇恨 hatred|无聊 boredom|贪婪 greed|傲慢 arrogance|悔恨 regret|冷漠 indifference"),
    ("价值", "Value", "善 good|恶 evil|真 true|伪 false|美 beautiful|丑 ugly|神圣 sacred|禁忌 taboo|纯洁 pure|堕落 corrupt|正义 justice|暴力 violence|慈悲 compassion|危险 danger|珍贵 precious|平凡 ordinary"),
    ("社会", "Society", "家 home|养育 nurture|权威 authority|王权 royalty|群体 collective|个体 individual|合作 cooperation|冲突 conflict|财富 wealth|贫穷 poverty|交流 communication|规则 rules|叛逆 rebellion|服从 obedience|友谊 friendship|异乡 foreign"),
    ("人造", "Artifact & Tech", "工具 tool|机械 machine|武器 weapon|建筑 building|城市 city|道路 road|载具 vehicle|容器 vessel|文字 writing|数字 number|网络 network|电子 electronic|宝石 gem|衣饰 clothing|食物 food|药 medicine"),
    ("文化", "Culture & Spirit", "宗教 religion|神明 deity|鬼魂 ghost|神话 myth|魔法 magic|仪式 ritual|艺术 art|音乐 music|故事 story|游戏 play|节庆 festival|传统 tradition|现代 modern|东方 Eastern|西方 Western|科学 science"),
    ("自然", "Nature & Place", "天空 sky|太阳 sun|月亮 moon|星辰 stars|海洋 ocean|河流 river|山岳 mountain|森林 forest|沙漠 desert|田野 field|地下 underground|雨 rain|风暴 storm|雪 snow|春天 spring|夜晚 night"),
    ("关系", "Structure", "秩序 order|混沌 chaos|对立 duality|和谐 harmony|因果 causality|偶然 chance|碎片 fragment|整体 whole|连接 connection|分离 separation|平衡 balance|极端 extreme|简单 simple|复杂 complex|开放 open|封闭 closed"),
]

PAIRS = [
    (0, 1), (2, 3), (4, 5), (6, 7), (9, 10), (12, 13), (14, 15),
    (16, 17), (24, 25),
    (32, 34), (33, 36), (37, 38), (39, 40), (42, 43),
    (48, 49), (50, 51), (52, 53), (54, 55), (56, 57), (58, 59), (60, 61), (62, 63),
    (64, 65), (66, 67), (68, 69), (70, 71), (72, 73), (74, 75), (76, 77), (78, 79),
    (80, 81), (82, 83), (85, 86), (90, 91), (92, 93), (94, 95),
    (112, 113), (118, 119), (120, 121), (123, 124),
    (128, 146), (129, 154), (130, 149), (131, 153), (133, 151), (134, 145), (136, 155), (132, 159),
    (160, 161), (162, 163), (164, 165), (166, 167), (168, 169), (171, 172), (174, 175), (138, 173),
    (176, 191), (180, 181), (182, 183), (184, 185), (188, 189), (148, 190),
    (111, 207), (212, 223), (219, 220), (221, 222),
    (224, 234), (225, 226), (228, 232),
    (240, 241), (242, 243), (244, 245), (246, 247), (248, 249), (250, 251), (252, 253), (254, 255),
]

def main():
    attrs = []
    for d, (dzh, den, items) in enumerate(DOMAINS):
        parts = items.split("|")
        assert len(parts) == 16, (dzh, len(parts))
        for k, p in enumerate(parts):
            zh, en = p.split(" ", 1)
            attrs.append({"i": d * 16 + k, "zh": zh, "en": en, "d": d, "k": k, "pair": -1})
    seen = set()
    for a, b in PAIRS:
        assert a not in seen and b not in seen, (a, b)
        seen.update((a, b))
        attrs[a]["pair"], attrs[b]["pair"] = b, a
    zhs = [a["zh"] for a in attrs]
    assert len(set(zhs)) == 256, [z for z in zhs if zhs.count(z) > 1]
    out = {
        "domains": [{"d": d, "zh": z, "en": e} for d, (z, e, _) in enumerate(DOMAINS)],
        "attrs": attrs,
    }
    path = pathlib.Path(__file__).resolve().parent.parent / "data" / "attributes.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"wrote {path} ({len(attrs)} attrs, {len(PAIRS)} pairs)")

if __name__ == "__main__":
    main()
