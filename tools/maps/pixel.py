# -*- coding: utf-8 -*-
"""像素画基础：画布、调色板、噪声、地形笔刷。

风格取自参考截图：高饱和蓝绿、深墨描边、三档明暗、抖动过渡。
"""

import math

from PIL import Image

TILE = 16
SCALE = 3

# ---------------------------------------------------------------- 调色板
INK = "#281849"
INK_SOFT = "#3b3a5c"
INK_DEEP = "#1b1436"

WATER = "#479dd7"
WATER_LT = "#5fb6e6"
WATER_DK = "#3d8ac3"
WATER_DEEP = "#316c9b"
WATER_DEEPEST = "#224e75"
FOAM = "#a9dcf2"
FOAM_W = "#e8f6fd"

SHORE_DARK = "#455c5d"
SHORE = "#6d9192"
SHORE_LT = "#94a29a"
SHORE_PALE = "#bdb7ab"
SAND = "#c2ab86"
SAND_LT = "#d8c7a2"

CREAM = "#ebe8d2"
CREAM_D = "#cdc9ad"
CREAM_S = "#a9a68e"

WOOD_DK = "#543451"
WOOD = "#7b4a50"
WOOD_LT = "#996363"
TIMBER = "#5c3a45"
TIMBER_LT = "#8a5a52"

TAN_DK = "#a77449"
TAN = "#bb875d"
TAN_LT = "#d6c09a"
THATCH = "#c8ab6b"
THATCH_LT = "#e0c88c"
THATCH_DK = "#9c8047"

ROOF_TEAL = "#5f8a8f"
ROOF_TEAL_LT = "#8fb3b0"
ROOF_TEAL_DK = "#3f6369"

GOLD = "#f0d38c"
GOLD_DK = "#c9a75f"
GLOW = "#ffe9b0"

GREEN_DK = "#3d5b4a"
GREEN = "#4e7d5e"
GREEN_M = "#5f9770"
GREEN_LT = "#79b184"
MOSS = "#6f9459"

TEAL_DK = "#344959"
TEAL = "#496f7d"
TEAL_M = "#5c8f92"
TEAL_LT = "#73c7b5"
MINT = "#8fe0c9"

PUR_DK = "#4b39a0"
PUR = "#6c5ac0"
PUR_M = "#9b87b5"
PUR_LT = "#a28ef2"
PUR_PALE = "#cdc2f7"
PINK = "#d78fc4"
PINK_LT = "#f0bcd8"
BLUE_BLOOM = "#7fa8e8"
BLUE_BLOOM_LT = "#b3ccf5"

STONE_DK = "#4a5a63"
STONE = "#6d8791"
STONE_LT = "#93a9ad"
STONE_PALE = "#b9c6c4"

METAL_DK = "#5b6c74"
METAL = "#8497a0"
METAL_LT = "#b9c7cb"

RED = "#c0564f"
RED_DK = "#8c3b3c"
RED_LT = "#dc7f6c"

# 每主题的地面五档色阶（暗→亮）、缝、墙
THEMES = {
    "aquarium": dict(ramp=["#223a49", "#2b4859", "#33566a", "#3c6379", "#486a80"],
                     ground_lt="#4f7b90", seam="#1d3241", seam_lt="#5f8fa4",
                     wall="#2a4657", wall_lt="#4f7c92", accent="#7fe3e0"),
    "store": dict(ramp=["#b0a78c", "#bbb298", "#c6bda2", "#d1c8ad", "#dcd3b8"],
                  ground_lt="#e6ddc2", seam="#9a9178", seam_lt="#eee6cb",
                  wall="#33304a", wall_lt="#565073", accent="#ffd98a"),
    "coast": dict(ramp=["#5c7a76", "#688a83", "#749890", "#80a69c", "#8db3a8"],
                  ground_lt="#9cbfb2", seam="#4e6a67", seam_lt="#a8c8ba",
                  wall=GREEN_DK, wall_lt=GREEN_M, accent=FOAM),
    "garden": dict(ramp=["#3f6b4d", "#487a57", "#528a62", "#5d9a6d", "#6aaa7a"],
                   ground_lt="#84c091", seam="#375f44", seam_lt="#93cf9f",
                   wall=GREEN_DK, wall_lt=GREEN_M, accent=PUR_LT),
    "sunset": dict(ramp=["#8f6440", "#a1734a", "#b28255", "#c29161", "#d2a06e"],
                   ground_lt="#e0b184", seam="#7a5335", seam_lt="#ecc096",
                   wall="#5a3f46", wall_lt="#8a6157", accent="#ffcf9a"),
    "night": dict(ramp=["#2c3047", "#343954", "#3c4260", "#454c6d", "#4f577a"],
                  ground_lt="#5c648a", seam="#242739", seam_lt="#6b7396",
                  wall="#232536", wall_lt="#454966", accent="#ffd98a"),
    "nightsea": dict(ramp=["#3c4558", "#454e63", "#4e586e", "#57627a", "#616d86"],
                     ground_lt="#6d7a95", seam="#333b4c", seam_lt="#7d8aa4",
                     wall=WATER_DEEPEST, wall_lt=WATER_DEEP, accent="#c8d8ff"),
}


# ---------------------------------------------------------------- 色彩与噪声
def blend(c1, c2, t):
    a = int(c1[1:], 16)
    b = int(c2[1:], 16)
    r = round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t)
    g = round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t)
    bl = round((a & 255) * (1 - t) + (b & 255) * t)
    return "#%02x%02x%02x" % (r, g, bl)


def darken(c, t):
    return blend(c, INK, t)


def lighten(c, t):
    return blend(c, "#ffffff", t)


def h01(x, y, s=0):
    n = (int(x) * 374761393 + int(y) * 668265263 + int(s) * 1442695041) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def vnoise(x, y, cell, s=0):
    """平滑值噪声（双线性 + smoothstep）。"""
    gx, gy = x / cell, y / cell
    x0, y0 = math.floor(gx), math.floor(gy)
    fx, fy = gx - x0, gy - y0
    sx = fx * fx * (3 - 2 * fx)
    sy = fy * fy * (3 - 2 * fy)
    a = h01(x0, y0, s)
    b = h01(x0 + 1, y0, s)
    c = h01(x0, y0 + 1, s)
    d = h01(x0 + 1, y0 + 1, s)
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy


def fbm(x, y, cell, octaves=3, s=0):
    v, amp, tot, c = 0.0, 1.0, 0.0, cell
    for i in range(octaves):
        v += vnoise(x, y, c, s + i * 17) * amp
        tot += amp
        amp *= 0.5
        c *= 0.5
    return v / tot


class Canvas:
    def __init__(self, w, h, bg):
        self.w = w
        self.h = h
        self.buf = [[bg] * w for _ in range(h)]

    def inside(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def px(self, x, y, c):
        x = int(x)
        y = int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.buf[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.buf[int(y)][int(x)]
        return None

    def rect(self, x, y, w, h, c):
        x, y, w, h = int(x), int(y), int(w), int(h)
        for yy in range(max(0, y), min(self.h, y + h)):
            row = self.buf[yy]
            for xx in range(max(0, x), min(self.w, x + w)):
                row[xx] = c

    def box(self, x, y, w, h, c):
        x, y, w, h = int(x), int(y), int(w), int(h)
        self.hline(x, x + w - 1, y, c)
        self.hline(x, x + w - 1, y + h - 1, c)
        self.vline(x, y, y + h - 1, c)
        self.vline(x + w - 1, y, y + h - 1, c)

    def hline(self, x0, x1, y, c):
        y = int(y)
        if not (0 <= y < self.h):
            return
        row = self.buf[y]
        for xx in range(max(0, int(min(x0, x1))), min(self.w, int(max(x0, x1)) + 1)):
            row[xx] = c

    def vline(self, x, y0, y1, c):
        x = int(x)
        if not (0 <= x < self.w):
            return
        for yy in range(max(0, int(min(y0, y1))), min(self.h, int(max(y0, y1)) + 1)):
            self.buf[yy][x] = c

    def line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = err * 2
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy

    def ell(self, cx, cy, rx, ry, c):
        rx = max(0.5, rx)
        ry = max(0.5, ry)
        for yy in range(int(cy - ry - 1), int(cy + ry + 2)):
            for xx in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (xx - cx) / rx
                dy = (yy - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    self.px(xx, yy, c)

    def shade(self, x, y, t):
        c = self.get(x, y)
        if c:
            self.buf[int(y)][int(x)] = blend(c, INK, t)

    def shadow_ell(self, cx, cy, rx, ry, t=0.3):
        for yy in range(int(cy - ry - 1), int(cy + ry + 2)):
            for xx in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (xx - cx) / max(0.5, rx)
                dy = (yy - cy) / max(0.5, ry)
                d = dx * dx + dy * dy
                if d <= 1.0 and self.inside(xx, yy):
                    self.buf[yy][xx] = blend(self.buf[yy][xx], INK, t * (1.0 - d * 0.45))

    def shadow_rect(self, x, y, w, h, t=0.3):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                if self.inside(xx, yy):
                    self.buf[yy][xx] = blend(self.buf[yy][xx], INK, t)

    def tint(self, x, y, c, t):
        cur = self.get(x, y)
        if cur:
            self.buf[int(y)][int(x)] = blend(cur, c, t)

    def save(self, path, scale=SCALE):
        img = Image.new("RGB", (self.w, self.h))
        img.putdata([(int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)) for row in self.buf for c in row])
        if scale != 1:
            img = img.resize((self.w * scale, self.h * scale), Image.NEAREST)
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path)


# ---------------------------------------------------------------- 地形
def ground_field(cv, mask, ramp, seed, coarse=44, mid=15, fine=5):
    """用多尺度噪声铺地面，避免整块死板。mask(x,y)->bool"""
    n = len(ramp)
    for y in range(cv.h):
        for x in range(cv.w):
            if not mask(x, y):
                continue
            v = (0.52 * fbm(x, y, coarse, 2, seed)
                 + 0.31 * fbm(x, y, mid, 2, seed + 101)
                 + 0.17 * h01(x, y, seed + 7))
            i = int(v * n)
            i = max(0, min(n - 1, i))
            cv.px(x, y, ramp[i])


def scatter_decor(cv, mask, rng, kinds, seed=0, step=7, density=0.3):
    """在可行走面上撒装饰：草丛、碎石、裂纹、小花。"""
    for y in range(0, cv.h, step):
        for x in range(0, cv.w, step):
            jx = x + int(h01(x, y, seed + 3) * step)
            jy = y + int(h01(x, y, seed + 5) * step)
            if not mask(jx, jy):
                continue
            if h01(x, y, seed + 9) > density:
                continue
            kind = kinds[int(h01(x, y, seed + 13) * len(kinds)) % len(kinds)]
            kind(cv, jx, jy, rng)


def tuft(cv, x, y, rng, dark=GREEN_DK, light=GREEN_LT):
    cv.px(x, y, dark)
    cv.px(x, y - 1, light)
    cv.px(x, y - 2, light)
    cv.px(x + 1, y, dark)
    cv.px(x + 1, y - 1, dark)
    cv.px(x - 1, y, light)


def pebble(cv, x, y, rng, base=STONE_LT, dk=STONE_DK):
    w = rng.choice((2, 3, 3, 4))
    cv.hline(x, x + w - 1, y, base)
    cv.px(x, y + 1, dk)
    cv.px(x + w - 1, y + 1, dk)
    cv.px(x + w // 2, y - 1, lighten(base, 0.25))


def blossom(cv, x, y, rng, colors=(PUR_LT, PINK, BLUE_BLOOM_LT, "#f2e6a0")):
    c = colors[int(h01(x, y, 71) * len(colors)) % len(colors)]
    cv.px(x, y, c)
    cv.px(x + 1, y, c)
    cv.px(x, y - 1, c)
    cv.px(x + 1, y - 1, lighten(c, 0.3))
    cv.px(x + 2, y, darken(c, 0.35))


def crack(cv, x, y, rng, c=None):
    cur = cv.get(x, y) or "#000000"
    c = c or blend(cur, INK, 0.28)
    ln = rng.randint(4, 9)
    dx = rng.choice((-1, 1))
    for i in range(ln):
        cv.px(x + i * dx, y + (i // 3), c)
    cv.px(x + ln * dx, y + ln // 3, lighten(cur, 0.2))


def distance_transform(mask, w, h, maxd=40):
    """mask(x,y)->bool，返回每个像素到最近非 mask 像素的距离（上界 maxd）。"""
    INF = 999
    d = [[0 if not mask(x, y) else INF for x in range(w)] for y in range(h)]
    for y in range(h):
        row, prev = d[y], d[y - 1] if y else None
        for x in range(w):
            if row[x] == 0:
                continue
            best = row[x]
            if x and row[x - 1] + 1 < best:
                best = row[x - 1] + 1
            if prev:
                if prev[x] + 1 < best:
                    best = prev[x] + 1
                if x and prev[x - 1] + 1 < best:
                    best = prev[x - 1] + 1
                if x + 1 < w and prev[x + 1] + 1 < best:
                    best = prev[x + 1] + 1
            row[x] = min(best, maxd)
    for y in range(h - 1, -1, -1):
        row, nxt = d[y], d[y + 1] if y + 1 < h else None
        for x in range(w - 1, -1, -1):
            if row[x] == 0:
                continue
            best = row[x]
            if x + 1 < w and row[x + 1] + 1 < best:
                best = row[x + 1] + 1
            if nxt:
                if nxt[x] + 1 < best:
                    best = nxt[x] + 1
                if x + 1 < w and nxt[x + 1] + 1 < best:
                    best = nxt[x + 1] + 1
                if x and nxt[x - 1] + 1 < best:
                    best = nxt[x - 1] + 1
            row[x] = min(best, maxd)
    return d


def water_field(cv, mask, rng, base=WATER, deep=WATER_DEEP, deepest=WATER_DEEPEST, seed=7, night=False):
    """带水深渐变、波纹与碎浪的水面。"""
    d = distance_transform(mask, cv.w, cv.h, 44)
    for y in range(cv.h):
        for x in range(cv.w):
            if not mask(x, y):
                continue
            dd = d[y][x]
            t = min(1.0, dd / 26.0)
            c = blend(deep, base, t)
            if dd > 24:
                c = blend(c, base, 0.35)
            n = fbm(x, y, 11, 2, seed + 3)
            c = blend(c, deepest if n < 0.34 else lighten(base, 0.12), 0.24 if n < 0.34 else 0.18 * n)
            if dd <= 2:
                c = blend(c, FOAM, 0.55 if dd == 1 else 0.3)
            cv.px(x, y, c)
    # 波纹短横
    for _ in range(max(10, cv.w * cv.h // 3400)):
        x = rng.randrange(0, cv.w)
        y = rng.randrange(0, cv.h)
        if not mask(x, y) or d[y][x] < 3:
            continue
        ln = rng.randint(5, 13)
        col = lighten(base, 0.34)
        for i in range(ln):
            if mask(x + i, y):
                cv.px(x + i, y, col if i in (0, ln - 1) else lighten(base, 0.2))
        cv.px(x + 2, y + 1, blend(cv.get(x + 2, y + 1), FOAM, 0.5))
    # 靠近岸边的泡沫
    for y in range(cv.h):
        for x in range(cv.w):
            if not mask(x, y) or d[y][x] != 1:
                continue
            if h01(x, y, 19) > 0.4:
                cv.px(x, y, FOAM_W if h01(x, y, 23) > 0.55 else FOAM)


def shoreline_sand(cv, mask, rng, wet=SAND_LT, dry=SAND):
    """陆地靠水一侧的湿沙。"""
    d = distance_transform(lambda x, y: (not mask(x, y)) and cv.inside(x, y), cv.w, cv.h, 8)
    for y in range(cv.h):
        for x in range(cv.w):
            if mask(x, y) or not cv.inside(x, y):
                continue
            dd = d[y][x]
            if dd <= 3:
                cv.px(x, y, blend(wet, cv.get(x, y) or dry, (dd - 1) * 0.3))
