# -*- coding: utf-8 -*-
"""按参考截图画风重绘 maps 底图（AI 底图 + 程序化物件，位置严格沿用 JSON）。

两层合成：
  1. 地面层：优先使用 AI 生成的地形底图（tools/maps/ai_src/<id>.png），
     统一压到原生 16px/格 并做有限调色板量化，保证像素画质感；
     没有 AI 底图时退回程序化多尺度噪声地面。
  2. 物件层：水面、墙体、树木、房屋、鸟居、售货机、水槽、货架等
     全部按 game/data/maps/*.json 的格子坐标程序化绘制，位置零偏差。

运行：  python tools/maps/render_map_art.py
产物：  game/assets/images/maps/<map-id>.png （原生 16px/格 × 3 倍）
"""

import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))

from pixel import *          # noqa: E402,F401,F403
from props import *          # noqa: E402,F401,F403

DATA = ROOT / "game" / "data" / "maps"
ART = ROOT / "game" / "assets" / "images" / "maps"
AI_SRC = HERE / "ai_src"

# 主题 → AI 地形底图（同一主题的多张地图用不同裁切窗口区分）
AI_THEME = {
    "aquarium": "aquarium.png",
    "store": "store.png",
    "coast": "coast.png",
    "garden": "garden.png",
    "sunset": "sunset.png",
    "night": "night.png",
    "nightsea": "nightsea.png",
}

# 个别地图单独指定 AI 底图（不跟随主题，例如便利店走夜间冷色、手机店走日间米色）
MAP_AI = {
    "ch1-store": "store.png",
    "ch3-mall": "store-day.png",
}

# 个别地图的地表色调修正：(目标色, 混合强度)
GROUND_TINT = {
    "ch2-return": ("#c9b28c", 0.55),   # 夕阳海滩
    "ch2-shop": ("#c2a276", 0.32),     # 石阶旁的土路
    "ch3-coast": ("#5a6478", 0.45),    # 夜海滩
    "ch3-mall": ("#d8d0b4", 0.42),     # 手机店浅色地砖
    "ch1-store": ("#46608e", 0.46),    # 便利店夜间冷蓝地砖
}

# AI 底图占比（越小越依赖程序化像素纹理，边缘更清晰）
AI_WEIGHT = {"coast": 0.46, "store": 0.66}

# 平坦化大范围明暗（强度, 半径）：压掉 AI 底图上的大块亮斑/暗块，只留局部纹理
AI_FLATTEN = {"store": (0.95, 52)}

# 逐图覆盖主题墙色（便利店走夜间冷蓝，而非默认的紫灰）
MAP_PALETTE = {
    "ch1-store": {"wall": "#212c44", "wall_lt": "#3d4e6c"},
}

# 便利店地砖：每 2 格一条缝
TILE_SEAM_MAPS = {"ch1-store"}


def hexof(rgb):
    return "#%02x%02x%02x" % rgb


def load_ai_base(theme, mid, w, h):
    """AI 地形底图 → 原生分辨率缓冲：去水印、按图 id 偏移裁切、量化、补像素颗粒。"""
    name = MAP_AI.get(mid) or AI_THEME.get(theme)
    if not name:
        return None
    p = AI_SRC / name
    if not p.exists():
        return None
    img = Image.open(p).convert("RGB")
    cw, ch = img.size
    # 水印在右下角，先裁掉
    img = img.crop((0, 0, int(cw * 0.87), int(ch * 0.90)))
    cw, ch = img.size
    scale = max(w / cw, h / ch) * 1.3
    img = img.resize((int(cw * scale), int(ch * scale)), Image.LANCZOS)
    nw, nh = img.size
    seed = sum(ord(c) for c in mid)
    ox = int(h01(seed, 1, 5) * max(0, nw - w))
    oy = int(h01(seed, 2, 9) * max(0, nh - h))
    img = img.crop((ox, oy, ox + w, oy + h))
    flat = AI_FLATTEN.get(theme)
    if flat:
        amount, radius = flat
        mean = ImageStat.Stat(img).mean
        mid = Image.new("RGB", img.size, tuple(int(v) for v in mean))
        blur = img.filter(ImageFilter.GaussianBlur(radius))
        dark = ImageChops.subtract(mid, blur)
        bright = ImageChops.subtract(blur, mid)
        img = ImageChops.subtract(
            ImageChops.add(img, dark.point(lambda v: int(v * amount))),
            bright.point(lambda v: int(v * amount)))
    img = img.quantize(colors=30, method=Image.MEDIANCUT).convert("RGB")
    px = img.load()
    buf = []
    for y in range(h):
        row = []
        for x in range(w):
            c = hexof(px[x, y])
            n = h01(x, y, 97)
            if n > 0.88:
                c = blend(c, "#ffffff", 0.07)
            elif n < 0.12:
                c = blend(c, INK, 0.07)
            row.append(c)
        buf.append(row)
    return buf


# ---------------------------------------------------------------- 网格解析
def build_grid(m):
    grid = {}
    for y, row in enumerate(m["tiles"]):
        for x, ch in enumerate(row):
            grid[(x, y)] = "wall" if ch == "#" else "ground"
    objects = m.get("objects") or m.get("decor") or []
    for o in objects:
        k = o.get("kind") or "prop"
        for yy in range(int(o["y"]), int(o["y"] + o["h"])):
            for xx in range(int(o["x"]), int(o["x"] + o["w"])):
                grid[(xx, yy)] = k
    return grid, objects


# ---------------------------------------------------------------- 地面 / 墙 / 水
def store_floor_seams(cv, m, fill, rng):
    """便利店地砖：每 2 格一条深缝 + 缝隙高光，再加几道冷光斜反射。"""
    t = TILE
    xs = [x for (x, _) in fill]
    ys = [y for (_, y) in fill]
    x0, x1 = min(xs) * t, (max(xs) + 1) * t
    y0, y1 = min(ys) * t, (max(ys) + 1) * t

    def ok(gx, gy):
        return (gx // t, gy // t) in fill

    for gx in range(x0 + t, x1 - 1, t * 2):
        for yy in range(y0, y1):
            if not (ok(gx, yy) and ok(gx + 1, yy)):
                continue
            cv.tint(gx, yy, "#33415a", 0.52)
            cv.tint(gx + 1, yy, "#b6c9dd", 0.18)
    for gy in range(y0 + t, y1 - 1, t * 2):
        for xx in range(x0, x1):
            if not (ok(xx, gy) and ok(xx, gy + 1)):
                continue
            cv.tint(xx, gy, "#33415a", 0.52)
            cv.tint(xx, gy + 1, "#b6c9dd", 0.18)
    # 抛光地砖上的冷光斜反射（参考图里地面那层湿亮反光）
    for _ in range(38):
        sx = rng.uniform(x0 + 4, x1 - 12)
        sy = rng.uniform(y0 + 4, y1 - 6)
        ln = rng.randint(5, 13)
        for i in range(ln):
            gx, gy = int(sx + i), int(sy + i * 0.36)
            if ok(gx, gy):
                cv.tint(gx, gy, "#cfeaf8", 0.13)


def paint_ground(cv, m, grid, pal, theme, rng, ai_base):
    t = TILE
    # 地面要铺满所有非墙、非水的格子（含物件脚下），否则物件缝隙会露出底色
    fill, walk = set(), set()
    for (x, y), k in grid.items():
        if k in ("wall", "water"):
            continue
        fill.add((x, y))
        if k == "ground":
            walk.add((x, y))

    def mask(x, y):
        return (x // t, y // t) in fill

    seed = (sum(ord(c) for c in m["id"]) * 13) % 997
    ground_field(cv, mask, pal["ramp"], seed=seed, coarse=46, mid=16, fine=5)
    if ai_base is not None:
        # 与 AI 底图混合：程序化部分提供清晰的像素颗粒，AI 提供丰富色彩与氛围
        for (x, y) in fill:
            for yy in range(t):
                for xx in range(t):
                    gx, gy = x * t + xx, y * t + yy
                    cv.px(gx, gy, blend(cv.get(gx, gy), ai_base[gy][gx], AI_WEIGHT.get(theme, 0.62)))
        # 个别地图的地表色调修正（例如沙滩要更沙、夜海滩要更冷）
        tint = GROUND_TINT.get(m["id"])
        if tint:
            color, amount = tint
            for (x, y) in fill:
                for yy in range(t):
                    for xx in range(t):
                        gx, gy = x * t + xx, y * t + yy
                        cv.px(gx, gy, blend(cv.get(gx, gy), color, amount))

    def decor_mask(x, y):
        return (x // t, y // t) in walk

    if m["id"] in TILE_SEAM_MAPS:
        store_floor_seams(cv, m, fill, rng)
        return walk

    decor = {
        "garden": [tuft, tuft, tuft, blossom, pebble],
        "coast": [tuft, pebble, pebble, blossom, tuft],
        "sunset": [pebble, pebble, tuft, crack, pebble],
        "night": [pebble, crack, crack, pebble, pebble],
        "nightsea": [pebble, pebble, crack, tuft, pebble],
        "aquarium": [pebble, crack, pebble, crack, pebble],
        "store": [crack, pebble, crack, pebble, pebble],
    }.get(theme, [tuft, pebble, blossom, crack, pebble])
    scatter_decor(cv, decor_mask, rng, decor, seed=11, step=8, density=0.42)
    return walk


def paint_water(cv, m, grid, theme, rng):
    t = TILE

    def is_water_cell(x, y):
        k = grid.get((x, y))
        if k is None:
            return False
        if k == "water":
            return True
        if k == "wall":
            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                if grid.get((x + dx, y + dy)) == "water":
                    return True
        return False

    def mask(x, y):
        return is_water_cell(x // t, y // t)

    base = {"nightsea": "#2f5f8c", "night": "#2b5580"}.get(theme, WATER)
    deep = {"nightsea": "#1d4270", "night": "#1b3f66"}.get(theme, WATER_DEEP)
    water_field(cv, mask, rng, base=base, deep=deep, seed=7)
    shoreline_sand(cv, mask, rng)


def door_cells_of(m, grid):
    doors = {}
    for e in m.get("events", []):
        if e.get("kind") != "transfer":
            continue
        ex, ey = e["x"], e["y"]
        for dx, dy, side in ((-1, 0, "left"), (1, 0, "right"), (0, -1, "top"), (0, 1, "bottom")):
            for step in (1, 2):
                cx, cy = ex + dx * step, ey + dy * step
                if grid.get((cx, cy)) == "wall":
                    doors[(cx, cy)] = side
                    break
    return doors


def paint_wall(cv, m, grid, pal, theme, rng, door_cells):
    t = TILE
    for (x, y), k in grid.items():
        if k != "wall":
            continue
        px0, py0 = x * t, y * t
        if (x, y) in door_cells:
            paint_door(cv, px0, py0, theme, door_cells[(x, y)])
            continue
        if theme in ("aquarium", "store"):
            cv.rect(px0, py0, t, t, pal["wall"])
            for yy in range(t):
                for xx in range(t):
                    gx, gy = px0 + xx, py0 + yy
                    n = fbm(gx, gy, 9, 2, 37)
                    if n > 0.62:
                        cv.px(gx, gy, pal["wall_lt"])
                    elif n < 0.38:
                        cv.px(gx, gy, darken(pal["wall"], 0.24))
            cv.hline(px0, px0 + t - 1, py0, lighten(pal["wall_lt"], 0.3))
            cv.hline(px0, px0 + t - 1, py0 + 1, pal["wall_lt"])
            cv.hline(px0, px0 + t - 1, py0 + 2, darken(pal["wall_lt"], 0.15))
            cv.hline(px0, px0 + t - 1, py0 + t - 3, darken(pal["wall"], 0.45))
            cv.hline(px0, px0 + t - 1, py0 + t - 2, darken(pal["wall"], 0.55))
            cv.hline(px0, px0 + t - 1, py0 + t - 1, INK)
            cv.vline(px0, py0 + 2, py0 + t - 2, darken(pal["wall"], 0.3))
            cv.vline(px0 + t - 1, py0 + 2, py0 + t - 2, darken(pal["wall"], 0.3))
        else:
            paint_border_mass(cv, m, grid, x, y, theme, rng)


def paint_border_mass(cv, m, grid, x, y, theme, rng):
    t = TILE
    px0, py0 = x * t, y * t
    inward = [grid.get((x + dx, y + dy)) for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0))]
    near_water = any(k == "water" for k in inward)
    if near_water and theme in ("nightsea", "night", "coast", "sunset"):
        cv.rect(px0, py0, t, t, WATER_DEEPEST if y == 0 else WATER_DEEP)
        for i in range(0, t, 3):
            if h01(px0 + i, py0, 83) > 0.5:
                cv.hline(px0 + i, px0 + i + 1, py0 + (i % 9), lighten(WATER_DEEP, 0.16))
        return
    if theme == "night":
        base, lt, dk = "#22243a", "#3a3f5e", "#151628"
    elif theme == "sunset":
        base, lt, dk = "#54423c", "#7a5f4e", "#33262a"
    else:
        base, lt, dk = GREEN_DK, GREEN_M, "#2b4436"
    for yy in range(t):
        for xx in range(t):
            gx, gy = px0 + xx, py0 + yy
            n = fbm(gx, gy, 13, 3, 53)
            cv.px(gx, gy, blend(dk, lt, min(1.0, max(0.0, (n - 0.32) * 1.5))))
    for _ in range(3):
        round_blob(cv, px0 + rng.uniform(2, t - 2), py0 + rng.uniform(2, t - 2), rng.uniform(3.4, 5.6),
                   rng, (dk, base, lt) if theme != "night" else ("#191a2c", "#262a44", "#3d4468"),
                   squash=0.85, dither=0.44, sparkle=False)
    cv.box(px0, py0, t, t, darken(base, 0.45))


def paint_door(cv, px0, py0, theme, side):
    pal = THEMES[theme]
    cv.rect(px0, py0, TILE, TILE, pal["wall"])
    cv.hline(px0, px0 + TILE - 1, py0, lighten(pal["wall_lt"], 0.3))
    cv.hline(px0, px0 + TILE - 1, py0 + 1, pal["wall_lt"])
    if side in ("left", "right"):
        cv.rect(px0, py0 + 2, TILE, TILE - 5, INK)
        cv.rect(px0 + 2, py0 + 3, TILE - 4, TILE - 7, "#3d5d6c")
        cv.vline(px0 + 3, py0 + 4, py0 + TILE - 6, "#5b8394")
        cv.hline(px0 + 3, px0 + TILE - 4, py0 + 3, "#7fa8b8")
        cv.rect(px0 + 1, py0 + 5, 2, 6, GLOW)
    else:
        cv.rect(px0 + 1, py0, TILE - 2, TILE - 3, INK)
        cv.rect(px0 + 2, py0 + 1, TILE - 4, TILE - 5, "#3d5d6c")
        cv.hline(px0 + 3, px0 + TILE - 4, py0 + 2, "#7fa8b8")


# ---------------------------------------------------------------- 对象
def object_art(cv, m, o, theme, rng, mid):
    t = TILE
    x, y = o["x"] * t, o["y"] * t
    w, h = o["w"] * t, o["h"] * t
    kind = o.get("kind") or "prop"
    if kind == "water":
        return
    if mid == "ch1-store":
        lab = o.get("label") or ""
        wide = y + h < cv.h - TILE          # 贴墙的整排货架阴影收紧一点
        store_shadow(cv, x, y, w, h, spread=6 if wide else 4, t=0.5)
        if lab == "冰柜":
            glass_fridge(cv, x, y, w, h, rng)
            return
        if lab == "收银台":
            checkout_counter(cv, x, y, w, h, rng)
            return
        if lab in ("杯面", "零食"):
            gondola_shelf(cv, x, y, w, h, rng, "cup" if lab == "杯面" else "snack")
            return
    if kind in ("trees", "flowers"):
        cv.shadow_rect(x, y + h - 4, w, 4, 0.26)
        if kind == "trees":
            pal = None
            if theme == "garden":
                pal = [GREEN_TONES, TEAL_TONES, GREEN_TONES, PURPLE_TONES, TEAL_TONES, GREEN_TONES]
            elif theme == "night":
                pal = [NIGHT_TONES]
            elif theme == "sunset":
                pal = [GREEN_TONES, TEAL_TONES, PURPLE_TONES, GREEN_TONES]
            grove(cv, x, y, x + w, y + h, rng, density=1.0, pal=pal)
        else:
            hydrangea(cv, x, y, x + w, y + h, rng)
        return
    if kind in ("tank", "shelf") and theme == "aquarium":
        if mid == "ch1-empty":
            aquarium_tank(cv, x, y, w, h, rng, empty=True)
            return
        if mid == "ch1-gallery":
            n = 4
            cw = int(w / n)
            for i in range(n):
                display_case(cv, x + i * cw + 2, y, cw - 4, h, rng)
            return
        aquarium_tank(cv, x, y, w, h, rng, style="isopod" if mid == "ch1-isopod" else "fish")
        return
    if kind == "shelf":
        shelf_case(cv, x, y, w, h, rng, "ice" if o.get("label") == "冰柜" else "shelf")
        return
    if kind == "ice":
        if mid == "ch2-shop":
            ice_shop(cv, x, y, w, h, rng)
        else:
            shelf_case(cv, x, y, w, h, rng, "ice")
        return
    if kind == "house":
        if theme == "night":
            tones = ("#3a3b4e", "#4d4f66", "#666a86")
        elif theme == "sunset":
            tones = (THATCH_DK, THATCH, THATCH_LT)
        else:
            tones = (THATCH_DK, THATCH, THATCH_LT)
        house(cv, x + 2, y + 2, w - 4, h - 4, rng, roof_tones=tones,
              lit=theme in ("night", "sunset"), chimney=(theme != "nightsea"),
              style=1 if x > cv.w / 2 else 0, dark=theme == "night")
        return
    if kind == "torii":
        torii(cv, x, y, w, h, rng)
        return
    if kind == "vending":
        vending(cv, x, y + 2, w, h - 4, rng, night=theme == "night")
        return
    if kind == "bench":
        bench(cv, x, y, w, h, rng)
        return
    if kind == "rocks":
        rocks(cv, x, y, w, h, rng, wet=theme == "nightsea", dark=theme == "nightsea")
        return
    if kind == "counter":
        counter(cv, x, y, w, h, rng)
        return
    cv.shadow_rect(x + 2, y + h - 3, w - 2, 4, 0.3)
    wood_panel(cv, x, y, w, h)


# ---------------------------------------------------------------- 逐图细部
def add_lights(cv, rng, points, color=GLOW, radius=26, strength=0.22):
    for lx, ly in points:
        for r in range(radius, 2, -2):
            for a in range(0, 360, 8):
                ax = lx + math.cos(math.radians(a)) * r * 1.4
                ay = ly + math.sin(math.radians(a)) * r * 0.5
                if cv.inside(int(ax), int(ay)) and h01(int(ax), int(ay), 71) > 0.62:
                    cv.tint(ax, ay, color, strength * (1 - r / radius))


def extra_ch1_entry(cv, m, rng):
    t = TILE
    cv.rect(2 * t + 2, 20, 34, 9, INK)
    cv.rect(2 * t + 3, 21, 32, 7, "#2d4a5c")
    cv.hline(2 * t + 3, 2 * t + 34, 21, "#7fb0c4")
    for i in range(3):
        cv.hline(2 * t + 5, 2 * t + 30 - i * 3, 23 + i * 2, "#9fd0e0")
    cv.rect(14 * t + 2, 20, 26, 12, INK)
    cv.rect(14 * t + 3, 21, 24, 10, "#e8e2c8")
    cv.rect(14 * t + 4, 22, 22, 8, "#5b8fa8")
    cv.hline(14 * t + 5, 14 * t + 24, 24, "#a8d8e8")
    for bx in (2 * t + 6, 15 * t + 6):
        cv.shadow_ell(bx + 6, 10 * t + 8, 9, 3, 0.3)
        cv.rect(bx, 10 * t - 2, 12, 10, INK)
        cv.rect(bx + 1, 10 * t - 1, 10, 8, "#8a5f4a")
        cv.hline(bx + 1, bx + 10, 10 * t - 1, "#b07f5f")
        round_blob(cv, bx + 6, 10 * t - 9, 7.5, rng, GREEN_TONES, squash=0.85)
    for i in range(5):
        cv.hline(8 * t + 2 + i * 3, 9 * t + 19 - i * 3, 8 * t + 4, "#5f92a8")
    cv.rect(3 * t + 4, 5 * t + 10, 20, 14, INK)
    cv.rect(3 * t + 5, 5 * t + 11, 18, 12, "#c9bfa0")
    cv.rect(3 * t + 6, 5 * t + 12, 16, 10, "#5b8fa8")
    add_lights(cv, rng, [(3 * t + 4, 5 * t + 14), (12 * t, 5 * t + 14)], radius=30, strength=0.2)


def extra_ch1_gallery(cv, m, rng):
    t = TILE
    for i in range(6):
        cv.rect(4 * t + i * 20, 20, 13, 3, "#5f92a8")
        cv.rect(4 * t + i * 20 + 3, 23, 7, 2, "#a8d8e8")
    for i in range(5):
        cv.hline(2 * t, 16 * t, 8 * t + i * 4, "#3f6b7e" if i % 2 else "#4f8095")
    add_lights(cv, rng, [(5 * t, 4 * t), (10 * t, 4 * t), (15 * t, 4 * t)], radius=28, strength=0.2)


def extra_ch1_panorama(cv, m, rng):
    t = TILE
    # 地面水波光纹：细长弧线，而不是糊成一片的圆斑
    for _ in range(46):
        cx = rng.uniform(2 * t, 16 * t)
        cy = rng.uniform(6 * t, 10 * t)
        span = rng.uniform(9, 22)
        thick = 1 if rng.random() < 0.6 else 2
        for i in range(int(span)):
            u = i / span
            yy = cy + math.sin(u * 3.0 + cx) * 2.2
            cv.tint(cx + i, yy, "#bff0fb", 0.34)
            if thick == 2:
                cv.tint(cx + i, yy + 1, "#8fd8ea", 0.2)
    for i in range(7):
        cv.hline(2 * t + i * 4, 16 * t - i * 4, 20 + i, "#5f92a8" if i % 2 else "#8fc0d4")
    for bx in (3 * t, 14 * t):
        bench(cv, bx, 8 * t + 4, 4 * t, 2 * t, rng)
    add_lights(cv, rng, [(6 * t, 4 * t), (12 * t, 4 * t)], radius=32, strength=0.22)


def extra_ch1_empty(cv, m, rng):
    t = TILE
    cv.rect(7 * t, 8 * t, 22, 15, INK)
    cv.rect(7 * t + 1, 8 * t + 1, 20, 13, "#5f7f8c")
    cv.rect(7 * t + 2, 8 * t + 2, 18, 10, "#9db6bc")
    cv.hline(7 * t + 2, 7 * t + 19, 8 * t + 2, "#c8dade")
    cv.vline(7 * t + 10, 8 * t + 3, 8 * t + 11, "#6f8f9c")
    for i in range(6):
        cv.hline(2 * t, 16 * t, 9 * t + 8 + i * 2, "#3f5f6c" if i % 2 else "#4f7484")
    cv.rect(13 * t, 10 * t, 10, 12, INK)
    cv.rect(13 * t + 1, 10 * t + 1, 8, 10, "#9fb6bd")
    cv.rect(13 * t + 2, 10 * t + 2, 6, 3, "#c0d0d4")
    round_blob(cv, 2 * t + 8, 10 * t, 7.5, rng, GREEN_TONES, squash=0.8)


def extra_ch1_restroom(cv, m, rng):
    t = TILE
    for i in range(3):
        px0 = (5 + i * 4) * t + 4
        cv.rect(px0, 0, 22, t - 3, INK)
        cv.rect(px0 + 1, 1, 20, t - 5, "#2f4a5c")
        cv.hline(px0 + 1, px0 + 20, 1, "#5f8fa4")
        cv.rect(px0 + 8, 9, 6, 3, "#8fb6c4")
    for i in range(3):
        cv.rect(3 * t + i * 32, 22, 12, 12, INK)
        cv.rect(3 * t + i * 32 + 1, 23, 10, 10, "#ecead2")
        cv.rect(3 * t + i * 32 + 1, 23, 10, 4, "#c0605a")
    cv.rect(14 * t + 4, 9 * t, 12, 15, INK)
    cv.rect(14 * t + 5, 9 * t + 1, 10, 13, "#9fb6bd")
    cv.rect(14 * t + 6, 9 * t + 2, 8, 3, "#c0d0d4")
    cv.rect(14 * t + 5, 9 * t + 7, 10, 2, "#7f979e")
    round_blob(cv, 2 * t + 8, 10 * t, 7.5, rng, GREEN_TONES, squash=0.8)


def extra_ch1_store(cv, m, rng):
    """夜间便利店：天花板灯管、左墙饮料层架、右墙夜景窗、收银台前地垫。"""
    t = TILE
    W, H = cv.w, cv.h
    lamps = [(3 + i * 6) * t + 22 for i in range(3)]

    # 1) 顶墙日光灯箱
    for lx in lamps:
        cv.rect(lx - 22, 3, 44, 12, "#161f33")
        cv.rect(lx - 21, 4, 42, 10, "#3d4c69")
        cv.rect(lx - 20, 6, 40, 4, "#eef6e6")
        cv.hline(lx - 20, lx + 19, 6, "#ffffff")
        cv.hline(lx - 20, lx + 19, 7, "#ecf6e0")
        cv.hline(lx - 20, lx + 19, 9, "#9fb4cc")
        cv.rect(lx - 16, 5, 32, 1, "#fbfef2")

    # 2) 灯下的地面光斑（柔和椭圆，越靠外越弱）
    for lx in lamps:
        for r in range(30, 4, -2):
            a = 0.11 * (1 - r / 30.0)
            for ang in range(0, 360, 6):
                ax = lx + math.cos(math.radians(ang)) * r * 1.5
                ay = 4 * t + math.sin(math.radians(ang)) * r * 0.55
                if cv.inside(int(ax), int(ay)) and h01(int(ax), int(ay), 61) > 0.3:
                    cv.tint(ax, ay, "#e8f4ff", a)

    # 3) 冰柜的冷光外溢：紧贴柜体的竖向渐隐光带（左右羽化，越远越淡）
    fx0, fx1 = 12 * t + 6, 15 * t - 6
    for k in range(56):
        yy = 4 * t + k
        fall = (1 - k / 56.0) ** 1.35
        for xx in range(fx0 - 10, fx1 + 10):
            edge = min(1.0, max(0.0, min(xx - (fx0 - 10), (fx1 + 10) - xx) / 10.0))
            a = 0.34 * fall * edge
            if a > 0.02 and h01(xx, yy, 73) > 0.14:
                cv.tint(xx, yy, "#a8ecf0", a)

    # 4) 左墙：挂式饮料层架（参考图左侧那排瓶子）
    wl, wr = 1, 15
    cv.rect(wl, 2 * t + 6, wr - wl + 1, 6 * t, S_INK)
    cv.rect(wl + 1, 2 * t + 7, wr - wl - 1, 6 * t - 2, "#2b3648")
    for r in range(3):
        sy = 2 * t + 26 + r * 26
        cv.hline(wl + 1, wr - 1, sy, S_FRAME_LT)
        cv.hline(wl + 1, wr - 1, sy + 1, S_FRAME)
        cv.hline(wl + 1, wr - 1, sy + 2, S_INK)
        for i, bx in enumerate(range(wl + 2, wr - 3, 4)):
            c = DRINK_COLS[(i + r) % len(DRINK_COLS)]
            cv.rect(bx, sy - 9, 4, 9, S_INK)
            cv.rect(bx + 1, sy - 8, 2, 7, c)
            cv.rect(bx + 1, sy - 5, 2, 2, S_PAPER)
            cv.px(bx + 1, sy - 9, lighten(c, 0.5))

    # 5) 右墙：夜景玻璃窗 + 月亮
    rx0 = 17 * t
    cv.rect(rx0, 2 * t + 6, t, 5 * t, S_INK)
    cv.rect(rx0 + 1, 2 * t + 7, t - 2, 5 * t - 2, "#17233d")
    for k in range(46):
        sx = rng.uniform(rx0 + 2, rx0 + t - 3)
        sy = rng.uniform(2 * t + 8, 7 * t + 2)
        cv.px(sx, sy, "#cfe0ff" if h01(int(sx), int(sy), 71) > 0.5 else "#8fa8d8")
    cv.ell(rx0 + 8, 2 * t + 20, 3.4, 3.2, "#f2f6e8")
    cv.ell(rx0 + 8, 2 * t + 20, 2.6, 2.4, "#fdfcf2")
    cv.tint(rx0 + 8, 2 * t + 20, "#ffffff", 0.2)
    for k in (1, 2):
        cv.hline(rx0 + 1, rx0 + t - 2, 2 * t + 7 + k * 22, S_INK)
    cv.vline(rx0 + 8, 2 * t + 7, 7 * t + 5, S_INK)
    cv.hline(rx0, rx0 + t - 1, 2 * t + 6, "#8fa0bb")
    cv.hline(rx0, rx0 + t - 1, 7 * t + 6, "#8fa0bb")

    # 6) 顶墙广告牌
    for ax in (94, 196):
        cv.rect(ax, 3, 26, 12, S_INK)
        cv.rect(ax + 1, 4, 24, 10, "#eef0e2")
        cv.rect(ax + 2, 5, 22, 4, "#c8564c")
        cv.hline(ax + 3, ax + 22, 10, "#93a6bd")
        cv.hline(ax + 3, ax + 17, 11, "#93a6bd")

    # 7) 收银台前的地垫 + 排队指引
    mx0, mx1 = 11 * t + 3, 15 * t - 3
    my0, my1 = 10 * t + 1, 10 * t + 13
    cv.rect(mx0, my0, mx1 - mx0, my1 - my0, "#44587b")
    cv.hline(mx0 + 1, mx1 - 2, my0 + 1, "#8fa8c8")
    cv.hline(mx0 + 1, mx1 - 2, my1 - 2, "#2b3852")
    cv.box(mx0, my0, mx1 - mx0, my1 - my0, "#26324a")
    for k in range(mx0 + 6, mx1 - 8, 12):
        cv.hline(k, k + 7, my0 + 6, "#6f88ac")
        cv.px(k + 7, my0 + 7, "#6f88ac")
        cv.px(k + 6, my0 + 5, "#6f88ac")

    # 8) 地面反光带（湿亮的抛光地面）
    for i in range(6):
        gy = 5 * t + 8 + i * 14
        gx0 = 2 * t + 6 + int(h01(i, 3, 41) * 20)
        for k in range(22):
            cv.tint(gx0 + k, gy + int(k * 0.22), "#cfe8f8", 0.1)


def extra_ch2_island(cv, m, rng):
    t = TILE
    # 石灯笼（鸟居前的两盏）
    for lx, ly in ((9 * t + 2, 8 * t - 6), (17 * t + 4, 12 * t)):
        cv.shadow_ell(lx + 8, ly + 26, 10, 3, 0.32)
        cv.rect(lx + 4, ly + 12, 8, 14, INK)
        cv.rect(lx + 5, ly + 13, 6, 12, STONE)
        cv.vline(lx + 5, ly + 13, ly + 24, STONE_LT)
        cv.rect(lx + 2, ly + 10, 12, 4, INK)
        cv.rect(lx + 3, ly + 11, 10, 2, STONE_DK)
        cv.rect(lx, ly, 16, 11, INK)
        cv.rect(lx + 1, ly + 1, 14, 9, STONE_LT)
        cv.rect(lx + 4, ly + 3, 8, 5, GOLD)
        cv.rect(lx + 5, ly + 4, 6, 3, GLOW)
        cv.rect(lx - 1, ly - 3, 18, 4, INK)
        cv.rect(lx, ly - 2, 16, 2, STONE_DK)
        add_lights(cv, rng, [(lx + 8, ly + 6)], color=GLOW, radius=18, strength=0.22)
    # 木制指路牌
    cv.shadow_ell(15 * t + 12, 11 * t + 14, 10, 3, 0.3)
    cv.rect(15 * t + 8, 11 * t - 6, 4, 22, INK)
    cv.rect(15 * t + 9, 11 * t - 5, 2, 20, WOOD)
    cv.rect(13 * t + 4, 11 * t - 12, 34, 11, INK)
    cv.rect(13 * t + 5, 11 * t - 11, 32, 9, TAN_LT)
    cv.hline(13 * t + 7, 13 * t + 34, 11 * t - 7, "#8a7a5c")
    cv.hline(13 * t + 7, 13 * t + 28, 11 * t - 5, "#8a7a5c")
    cv.rect(13 * t + 5, 11 * t - 11, 32, 2, "#e6d2a8")
    # 远景小船
    for bx, by in ((6 * t, 4 * t), (18 * t, 2 * t + 6)):
        cv.ell(bx, by, 12, 3.6, "#2b5570")
        cv.ell(bx, by - 1, 10, 2.6, "#7b5a4a")
        cv.hline(bx - 8, bx + 8, by - 1, "#9c7a62")
        cv.rect(bx - 1, by - 14, 2, 13, "#3f3a4a")
        cv.ell(bx + 4, by - 9, 6, 5, CREAM_D)
        cv.ell(bx + 4, by - 9, 4.6, 3.8, CREAM)
    # 岸边碎石
    pebbles_ring = [(9 * t, 5 * t + 6), (10 * t + 6, 9 * t + 8), (10 * t + 2, 14 * t + 4)]
    for px0, py0 in pebbles_ring:
        for i in range(7):
            pebble(cv, px0 + rng.uniform(-8, 14), py0 + rng.uniform(-6, 6), rng, STONE_LT, STONE_DK)


def extra_ch2_flowers(cv, m, rng):
    t = TILE
    # 碎石小径：横穿中部，边缘用噪声做有机起伏
    for x in range(1 * t, 27 * t):
        for y in range(6 * t, 9 * t):
            wob = fbm(x, y * 2, 12, 2, 173) * 7 - 3
            if y < 6 * t + 4 + wob or y > 8 * t + 2 + wob:
                continue
            cur = cv.get(x, y) or "#9aa886"
            if h01(x, y, 179) > 0.86:
                cv.px(x, y, lighten(cur, 0.3))
            elif h01(x, y, 179) < 0.16:
                cv.px(x, y, darken(cur, 0.22))
    for _ in range(26):
        pebble(cv, rng.uniform(2 * t, 26 * t), rng.uniform(6 * t, 9 * t), rng, "#b9b39b", "#7d7a66")
    for _ in range(90):
        gx, gy = rng.uniform(1 * t, 27 * t), rng.uniform(1 * t, 17 * t)
        if 6 * t < gy < 9 * t:
            continue
        tuft(cv, gx, gy, rng, darken(GREEN, 0.28), GREEN_LT)
    for _ in range(9):
        bx, by = rng.uniform(4 * t, 25 * t), rng.uniform(3 * t, 14 * t)
        cv.px(bx, by, "#f6e6a0")
        cv.px(bx - 1, by - 1, "#fff3c0")
        cv.px(bx + 1, by - 1, "#e8c86a")
        cv.px(bx + 1, by + 1, "#c8a84a")


def extra_ch2_stairs(cv, m, rng):
    t = TILE
    # 宽阔的登山石阶（走在 x 5..9 的空地上）
    cv.rect(5 * t - 6, 4 * t - 6, 5 * t + 12, 20 * 11 + 10, INK)
    cv.rect(5 * t - 5, 4 * t - 5, 5 * t + 10, 20 * 11 + 8, STONE)
    for y in range(4 * t - 5, 4 * t + 20 * 11 + 3):
        row = (y - (4 * t - 5))
        k = row % 11
        if k == 0:
            cv.hline(5 * t - 5, 9 * t + 4, y, STONE_DK)
        elif k == 1:
            cv.hline(5 * t - 5, 9 * t + 4, y, STONE_PALE)
        elif k in (9, 10):
            cv.hline(5 * t - 5, 9 * t + 4, y, STONE_DK)
        else:
            cv.hline(5 * t - 5, 9 * t + 4, y, STONE_LT if k < 5 else STONE)
    for y in range(4 * t - 5, 4 * t + 20 * 11 + 3):
        for x in range(5 * t - 4, 9 * t + 4):
            if h01(x * 3, y * 5, 191) > 0.93:
                cv.px(x, y, lighten(STONE, 0.18))
            elif h01(x * 3, y * 5, 191) < 0.06:
                cv.px(x, y, STONE_DK)
    # 石阶两侧矮护沿
    for i in range(20):
        sy = 4 * t + i * 11
        cv.rect(5 * t - 10, sy - 4, 5, 10, INK)
        cv.rect(5 * t - 9, sy - 3, 3, 8, STONE_DK)
        cv.rect(9 * t + 5, sy - 4, 5, 10, INK)
        cv.rect(9 * t + 6, sy - 3, 3, 8, STONE_DK)
    # 路灯
    for lx in (12 * t + 4, 24 * t):
        cv.shadow_ell(lx + 3, 9 * t + 4, 13, 4, 0.3)
        cv.rect(lx + 2, 9 * t - 30, 3, 34, INK)
        cv.rect(lx + 3, 9 * t - 29, 1, 32, METAL_DK)
        cv.rect(lx - 5, 9 * t - 39, 18, 10, INK)
        cv.rect(lx - 4, 9 * t - 38, 16, 8, GOLD_DK)
        cv.rect(lx - 2, 9 * t - 37, 12, 6, GLOW)
        add_lights(cv, rng, [(lx + 3, 9 * t + 2)], radius=22, strength=0.18)


def extra_ch2_shop(cv, m, rng):
    t = TILE
    for i in range(3):
        bx = (9 + i * 6) * t
        cv.rect(bx, 10 * t + 10, 22, 4, INK)
        cv.rect(bx + 1, 10 * t + 11, 20, 2, "#c8a87c")
    for _ in range(60):
        tuft(cv, rng.uniform(6 * t, 26 * t), rng.uniform(9 * t, 12 * t), rng,
             darken(GREEN, 0.3), GREEN_LT)
    for i in range(20):
        cv.hline(5 * t, 27 * t, 1 * t + i * 6, "#a97a52")
    add_lights(cv, rng, [(10 * t, 5 * t)], radius=26, strength=0.16)


def extra_ch2_return(cv, m, rng):
    t = TILE
    sun_x, sun_y = 16 * t, 1 * t + 9
    # 只把太阳所在的纵向水道染暖，其余海面保持通透的蓝
    for y in range(1 * t, 4 * t):
        for x in range(11 * t, 21 * t):
            dx = abs(x - sun_x) / (5 * t)
            warm = 0.30 * max(0.0, 1 - dx) * (1 - (y - 1 * t) / (3 * t))
            cv.tint(x, y, "#f8c890", warm)
    # 太阳与光晕
    cv.ell(sun_x, sun_y, 26, 23, blend("#ffdcac", "#479dd7", 0.5))
    cv.ell(sun_x, sun_y, 21, 18, "#ffe2ae")
    cv.ell(sun_x, sun_y, 16, 13, "#ffeec6")
    cv.ell(sun_x, sun_y, 10, 8, "#fff9e6")
    # 海面反光：宽窄不一、断续的金色横带
    y = 1 * t + 12
    while y < 7 * t:
        spread = int(10 + (y - 1 * t) * 1.7)
        n = h01(0, y, 73)
        if n >= 0.3:
            x0 = sun_x - spread + int(fbm(0, y, 9, 2, 67) * 16)
            x1 = sun_x + spread - int(fbm(0, y, 11, 2, 71) * 14)
            c = blend("#ffd98a", "#4aa5dd", 0.3 + n * 0.34)
            cv.hline(x0, x1, y, c)
            cv.hline(x0 + 2, x1 - 2, y + 1, blend(c, "#479dd7", 0.4))
            if n > 0.72:
                cv.hline(x0 + 6, x1 - 6, y - 1, blend(c, "#fff0c8", 0.5))
            for xx in range(x0 + 5, max(x0 + 6, x1 - 5), 15):
                if h01(xx, y, 89) > 0.62:
                    cv.px(xx, y, "#fff6e0")
                    cv.px(xx + 1, y, "#ffeec4")
        y += 5 + int(h01(0, y, 79) * 5)
    # 远处海岸线
    for x in range(1 * t, 27 * t):
        n = fbm(x, 3, 26, 2, 97)
        if n > 0.56:
            cv.hline(x, x, 1 * t + 1, "#4a6c84")
            cv.hline(x, x, 1 * t + 2, "#3c5a72")
    # 小船
    bx, by = 21 * t, 3 * t + 10
    cv.ell(bx, by, 14, 4.4, "#2b5570")
    cv.ell(bx, by - 1, 12, 3, "#7b5a4a")
    cv.hline(bx - 9, bx + 9, by - 2, "#9c7a62")
    cv.rect(bx - 1, by - 17, 2, 16, "#3f3a4a")
    cv.ell(bx + 4, by - 11, 7, 6, CREAM_D)
    cv.ell(bx + 4, by - 11, 5.5, 4.5, CREAM)
    # 沙滩细节：脚印、贝壳、湿沙
    for _ in range(60):
        tuft(cv, rng.uniform(2 * t, 27 * t), rng.uniform(9 * t, 16 * t), rng,
             "#8c7350", "#d8c49c")
    for i in range(34):
        fx, fy = rng.uniform(3 * t, 27 * t), rng.uniform(8 * t, 16 * t)
        cv.px(fx, fy, "#a98a66")
        cv.px(fx + 1, fy + 2, "#a98a66")
    add_lights(cv, rng, [(sun_x, sun_y)], color="#ffd9a0", radius=48, strength=0.14)


def extra_ch3_work(cv, m, rng):
    t = TILE
    for lx in (13 * t, 25 * t):
        cv.shadow_ell(lx + 3, 9 * t - 2, 14, 4, 0.3)
        cv.rect(lx + 2, 9 * t - 34, 3, 38, INK)
        cv.rect(lx + 3, 9 * t - 33, 1, 36, METAL_DK)
        cv.rect(lx - 6, 9 * t - 43, 20, 10, INK)
        cv.rect(lx - 5, 9 * t - 42, 18, 8, GOLD_DK)
        cv.rect(lx - 3, 9 * t - 41, 14, 6, GLOW)
        cv.rect(lx + 5, 9 * t - 34, 6, 2, GOLD)
        add_lights(cv, rng, [(lx + 3, 9 * t - 2)], radius=28, strength=0.3)
    for i in range(34):
        if (i // 3) % 2 == 0:
            cv.rect(13 * t, 9 * t + 4 + i * 5, 16, 2, "#565c78")
    for _ in range(4):
        px0, py0 = rng.uniform(3 * t, 24 * t), rng.uniform(10 * t, 15 * t)
        cv.ell(px0, py0, rng.uniform(6, 11), rng.uniform(2.6, 4), "#41507a")
        cv.ell(px0, py0 - 0.6, rng.uniform(4, 8), rng.uniform(1.4, 2.4), "#6376a4")
        cv.px(px0 + 1, py0 - 1, "#a8b6d8")
    add_lights(cv, rng, [(23 * t, 5 * t)], radius=26, strength=0.2)


def extra_ch3_coast(cv, m, rng):
    t = TILE
    moon_x, moon_y = 7 * t, 3 * t + 6
    cv.ell(moon_x, moon_y, 17, 16, blend("#e8e4cc", "#2f5f8c", 0.5))
    cv.ell(moon_x, moon_y, 14, 13, "#fdf8e4")
    cv.ell(moon_x - 5, moon_y + 2, 2.6, 2.6, "#ded9c0")
    cv.ell(moon_x + 5, moon_y - 4, 2.0, 2.0, "#ded9c0")
    cv.ell(moon_x + 2, moon_y + 6, 1.5, 1.5, "#e6e0c8")
    # 月光在水面碎成一片片，而不是规整的三角形
    y = 1 * t + 12
    while y < 7 * t:
        spread = int(9 + (y - 1 * t) * 1.5)
        n = h01(0, y, 79)
        if n > 0.28:
            x0 = moon_x - spread + int(fbm(0, y, 8, 2, 83) * 15)
            x1 = moon_x + spread - int(fbm(0, y, 10, 2, 87) * 13)
            cv.hline(x0, x1, y, blend("#dfeaff", "#2f5f8c", 0.26 + n * 0.34))
            if n > 0.66:
                cv.hline(x0 + 4, x1 - 4, y - 1, "#eef4ff")
            for xx in range(x0 + 6, max(x0 + 7, x1 - 6), 17):
                if h01(xx, y, 91) > 0.6:
                    cv.px(xx, y, "#ffffff")
        y += 4 + int(h01(0, y, 89) * 5)
    for _ in range(70):
        sx, sy = rng.uniform(0, cv.w), rng.uniform(0, 1 * t)
        cv.px(sx, sy, "#e8f0ff" if rng.random() < 0.5 else "#a8c8f0")
    # 灯塔
    lx, ly = 23 * t, 2
    cv.rect(lx, ly, 13, 26, INK)
    cv.rect(lx + 1, ly + 1, 11, 24, "#f0ead2")
    for i in range(0, 24, 8):
        cv.rect(lx + 1, ly + 1 + i, 11, 4, "#c0564f")
    cv.rect(lx - 2, ly - 8, 17, 9, INK)
    cv.rect(lx - 1, ly - 7, 15, 7, "#3f4a5c")
    cv.rect(lx + 2, ly - 6, 9, 5, "#ffe9a8")
    cv.rect(lx - 1, ly - 11, 15, 4, "#8c3b3c")
    cv.ell(lx + 6, ly - 4, 4, 4, "#fff3c8")
    add_lights(cv, rng, [(lx + 6, ly - 4)], color="#ffe9a8", radius=30, strength=0.26)
    # 拍岸浪
    for _ in range(34):
        wx, wy = rng.uniform(1 * t, 26 * t), rng.uniform(6 * t, 8 * t)
        cv.hline(wx, wx + rng.uniform(6, 18), wy, FOAM)
        cv.px(wx + 2, wy + 1, FOAM_W)
    # 沙滩上的稀疏碎砾（避免满屏白点）
    for _ in range(46):
        gx, gy = rng.uniform(2 * t, 26 * t), rng.uniform(9 * t, 16 * t)
        if h01(gx, gy, 193) > 0.5:
            pebble(cv, gx, gy, rng, "#8b98ac", "#4c586e")


EXTRAS = {
    "ch1-entry": extra_ch1_entry,
    "ch1-gallery": extra_ch1_gallery,
    "ch1-panorama": extra_ch1_panorama,
    "ch1-empty": extra_ch1_empty,
    "ch1-restroom": extra_ch1_restroom,
    "ch1-store": extra_ch1_store,
    "ch2-island": extra_ch2_island,
    "ch2-flowers": extra_ch2_flowers,
    "ch2-stairs": extra_ch2_stairs,
    "ch2-shop": extra_ch2_shop,
    "ch2-return": extra_ch2_return,
    "ch3-work": extra_ch3_work,
    "ch3-coast": extra_ch3_coast,
}


# ---------------------------------------------------------------- 组装
def build(m):
    t = TILE
    W, H = m["width"] * t, m["height"] * t
    theme = m.get("theme") or "aquarium"
    mid = m["id"]
    pal = dict(THEMES[theme])
    pal.update(MAP_PALETTE.get(mid, {}))
    rng = random.Random(sum(ord(c) for c in mid) * 7 + 13)
    cv = Canvas(W, H, pal["ramp"][2])
    grid, objects = build_grid(m)

    ai_base = load_ai_base(theme, mid, W, H)

    paint_ground(cv, m, grid, pal, theme, rng, ai_base)
    paint_wall(cv, m, grid, pal, theme, rng, door_cells_of(m, grid))
    paint_water(cv, m, grid, theme, rng)
    for o in objects:
        object_art(cv, m, o, theme, rng, mid)
    fn = EXTRAS.get(mid)
    if fn:
        fn(cv, m, rng)
    return cv


def main():
    ch1 = json.loads((DATA / "chapter1.json").read_text(encoding="utf-8"))
    ch2 = json.loads((DATA / "chapters.json").read_text(encoding="utf-8"))

    jobs = [m for mid, m in ch1.items() if mid != "ch1-room"]
    jobs += list(ch2.values())

    mall = dict(ch2["ch3-work"])
    mall.update(id="ch3-mall", name="手机店", theme="store",
                objects=[dict(x=3, y=3, w=7, h=3, kind="shelf", label="", image=""),
                         dict(x=16, y=3, w=7, h=3, kind="shelf", label="", image=""),
                         dict(x=6, y=11, w=16, h=2, kind="ice", label="", image="")])
    jobs.append(mall)

    want = [a for a in sys.argv[1:] if not a.startswith("-")]
    if want:
        jobs = [m for m in jobs if m["id"] in want]

    for m in jobs:
        cv = build(m)
        out = ART / (m["id"] + ".png")
        cv.save(out)
        print("  %-14s %4dx%-4d  %-8s %6.1f KB" % (m["id"], cv.w, cv.h, m.get("theme") or "-", out.stat().st_size / 1024))


if __name__ == "__main__":
    main()
