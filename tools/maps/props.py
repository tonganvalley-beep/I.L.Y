# -*- coding: utf-8 -*-
"""参考截图风格的像素道具：树丛、建筑、鸟居、售货机、长椅、岩石、水槽、货架……"""

import math

from pixel import *


# ---------------------------------------------------------------- 有机色块
def round_blob(cv, cx, cy, r, rng, tones, squash=1.0, outline=INK, dither=0.36, sparkle=True):
    """有机圆形色块：三档明暗 + 抖动过渡 + 左上高光。tones=(dark, mid, light[, spark])"""
    dark_t, mid_t, light_t = tones[0], tones[1], tones[2]
    spark_t = tones[3] if len(tones) > 3 else lighten(light_t, 0.3)
    lobes = [(rng.uniform(0, math.tau), rng.uniform(0.10, 0.24), rng.randint(2, 4)) for _ in range(3)]

    def rad(th):
        v = 1.0
        for ph, amp, k in lobes:
            v += amp * math.sin(k * th + ph)
        return r * max(0.52, v)

    x0, x1 = int(cx - r * 1.5), int(cx + r * 1.5) + 1
    y0, y1 = int(cy - r * 1.5 * squash), int(cy + r * 1.5 * squash) + 1
    for y in range(y0, y1):
        for x in range(x0, x1):
            dx = x - cx
            dy = (y - cy) / squash
            rr = math.hypot(dx, dy)
            lim = rad(math.atan2(dy, dx))
            if rr <= lim:
                u, v = dx / r, dy / r
                lum = -(0.60 * u + 0.82 * v)
                lum += (h01(x, y, 5) - 0.5) * dither
                cv.px(x, y, light_t if lum > 0.42 else (mid_t if lum > -0.14 else dark_t))
            elif rr <= lim + 1.3:
                cv.px(x, y, outline)
    if sparkle:
        for _ in range(max(1, int(r / 5))):
            a = rng.uniform(-2.7, -0.5)
            d = rng.uniform(0.25, 0.66) * r
            cv.px(cx + math.cos(a) * d, cy + math.sin(a) * d, spark_t)


def wood_panel(cv, x, y, w, h, body=WOOD, lt=WOOD_LT, dk=INK):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.rect(x, y, w, h, body)
    cv.hline(x, x + w - 1, y, lt)
    cv.hline(x, x + w - 1, y + h - 1, dk)
    cv.vline(x, y, y + h - 1, lt)
    cv.vline(x + w - 1, y, y + h - 1, dk)
    for i in range(x + 3, x + w - 2, 5):
        cv.px(i, y + h // 2, darken(body, 0.28))


# ---------------------------------------------------------------- 树
GREEN_TONES = (GREEN_DK, GREEN_M, GREEN_LT, MINT)
TEAL_TONES = ("#3c6a74", "#5fa89e", TEAL_LT, MINT)
PURPLE_TONES = ("#4a3a86", "#7a68c8", PUR_LT, PUR_PALE)
BLUE_TONES = ("#3a5fa8", BLUE_BLOOM, BLUE_BLOOM_LT, "#e2ecff")
PINK_TONES = ("#9c4a76", PINK, PINK_LT, "#ffe3f2")
NIGHT_TONES = ("#232c46", "#33405e", "#4b5c80", "#6f83a8")

TREE_PALETTES = [GREEN_TONES, TEAL_TONES, GREEN_TONES, TEAL_TONES, GREEN_TONES]
FLOWER_TREE_PALETTES = [PURPLE_TONES, PURPLE_TONES, PINK_TONES, PURPLE_TONES, BLUE_TONES]


def tree(cv, cx, base_y, r, rng, pal=None, trunk_h=None, shadow=True):
    pal = pal or rng.choice(TREE_PALETTES)
    if shadow:
        cv.shadow_ell(cx + r * 0.34, base_y + 1, r * 0.96, r * 0.32, 0.34)
    th = trunk_h if trunk_h is not None else max(4, int(r * 0.5))
    tw = max(2, int(r * 0.24))
    cv.rect(cx - tw // 2 - 1, base_y - th, tw + 2, th + 2, INK)
    cv.rect(cx - tw // 2, base_y - th, tw, th + 1, WOOD)
    cv.vline(cx - tw // 2, base_y - th, base_y - 1, WOOD_LT)
    cv.vline(cx + tw // 2 - 1, base_y - th, base_y - 1, darken(WOOD, 0.3))
    cy = base_y - th - r * 0.55
    round_blob(cv, cx, cy, r, rng, pal, squash=0.88)
    if rng.random() < 0.62:
        round_blob(cv, cx - r * 0.6, cy + r * 0.28, r * 0.6, rng, pal, squash=0.82)
    if rng.random() < 0.62:
        round_blob(cv, cx + r * 0.6, cy + r * 0.24, r * 0.56, rng, pal, squash=0.82)
    if rng.random() < 0.34:
        round_blob(cv, cx + r * 0.1, cy - r * 0.72, r * 0.5, rng, pal, squash=0.8)


def grove(cv, x0, y0, x1, y1, rng, density=0.9, pal=None, base_tone=GREEN_DK):
    """成片树林：先铺林下阴影，再按 y 序叠树，保留可见缝隙。"""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    # 林下阴影铺满整块，避免露出规整矩形
    for y in range(y0, y1):
        for x in range(x0, x1):
            n = fbm(x, y, 21, 2, 77)
            cv.px(x, y, darken(base_tone, 0.42) if n < 0.42 else darken(base_tone, 0.24))
    span_x, span_y = max(1, x1 - x0), max(1, y1 - y0)
    cols = max(1, int(span_x / 14))
    rows = max(1, int(span_y / 14))
    spots = []
    for ri in range(rows + 1):
        for ci in range(cols + 1):
            if rng.random() > density:
                continue
            cx = x0 + (ci + 0.5) * span_x / (cols + 0.5) + rng.uniform(-3.5, 3.5)
            cy = y0 + (ri + 0.75) * span_y / (rows + 0.35) + rng.uniform(-2.5, 2.5)
            pal_i = pal[rng.randrange(len(pal))] if isinstance(pal, list) else pal
            spots.append((cy, cx, rng.uniform(8.6, 11.6) if rows < 3 else rng.uniform(7.4, 10.0), pal_i))
    spots.sort()
    for cy, cx, r, p in spots:
        tree(cv, cx, min(cy + 2, y1 + 3), r, rng, p)


def hydrangea(cv, x0, y0, x1, y1, rng,
              blooms=(BLUE_TONES, PURPLE_TONES, PINK_TONES,
                      ("#4a68b0", "#8aa8e8", BLUE_BLOOM_LT, "#eef4ff"))):
    """紫阳花花丛：深绿叶底 + 成球的花序。"""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    # 叶团铺底（有机起伏，不露矩形）
    for _ in range(int((x1 - x0) * (y1 - y0) / 62)):
        cx = rng.uniform(x0 - 2, x1 + 2)
        cy = rng.uniform(y0 - 2, y1 + 2)
        if cx < x0 - 1 or cx > x1 or cy < y0 - 1 or cy > y1:
            if fbm(cx, cy, 14, 2, 91) < 0.5:
                continue
        r = rng.uniform(4.5, 8.5)
        c = "#2b4535" if rng.random() < 0.45 else (GREEN_DK if rng.random() < 0.6 else "#4a7451")
        cv.ell(cx, cy, r, r * 0.8, c)
        cv.ell(cx - r * 0.3, cy - r * 0.3, r * 0.5, r * 0.4, lighten(c, 0.14))
    cols = max(2, int((x1 - x0) / 12))
    rows = max(2, int((y1 - y0) / 12))
    for ri in range(rows + 1):
        for ci in range(cols + 1):
            cx = x0 + (ci + 0.5) * (x1 - x0) / (cols + 0.4) + rng.uniform(-3, 3)
            cy = y0 + (ri + 0.6) * (y1 - y0) / (rows + 0.25) + rng.uniform(-2.5, 2.5)
            # 花丛轮廓做有机起伏，避免整块矩形
            edge = min(cx - x0, x1 - 1 - cx, cy - y0, y1 - 1 - cy)
            if edge < 7 and fbm(cx, cy, 15, 2, 151) < 0.5:
                continue
            r = rng.uniform(4.4, 6.8)
            round_blob(cv, cx, cy, r, rng, rng.choice(blooms), squash=0.94, dither=0.44)
            for _ in range(4):
                cv.px(cx + rng.uniform(-r, r) * 0.9, cy + rng.uniform(-r, r) * 0.9, GREEN_DK)


# ---------------------------------------------------------------- 建筑
def shingle_roof(cv, x, y, w, h, tones, rng, taper=0):
    """坡屋顶：上窄下宽的梯形 + 错缝瓦垄。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    dk, mid, lt = tones
    for row in range(h):
        t = row / max(1, h - 1)
        inset = int(round(taper * (1 - t)))
        rx, rw = x + inset, w - inset * 2
        if rw <= 2:
            continue
        c = blend(dk, mid, min(1.0, 0.22 + t * 0.98))
        cv.hline(rx, rx + rw - 1, y + row, c)
        if row % 3 == 2:
            cv.hline(rx, rx + rw - 1, y + row, darken(c, 0.3))
        elif row % 3 == 0:
            cv.hline(rx, rx + rw - 1, y + row, lighten(c, 0.14))
        off = 0 if (row // 3) % 2 == 0 else 3
        for cx0 in range(off, rw, 6):
            cv.px(rx + cx0, y + row, darken(c, 0.34))
    cv.box(x, y, w, h, INK)
    cv.hline(x + 1, x + w - 2, y, lighten(lt, 0.25))


def window(cv, x, y, w, h, glow=True, frame=TIMBER):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.rect(x - 1, y - 1, w + 2, h + 2, INK)
    if glow:
        cv.rect(x, y, w, h, GOLD)
        cv.hline(x, x + w - 1, y, GLOW)
        cv.hline(x, x + w - 1, y + h - 1, GOLD_DK)
        cv.vline(x + w - 1, y, y + h - 1, GOLD_DK)
        cv.hline(x, x + w - 1, y + h, blend(GOLD, INK, 0.55))
    else:
        cv.rect(x, y, w, h, "#3c4a5c")
        cv.hline(x, x + w - 1, y, "#5b6f85")
        for i in range(x + 1, x + w - 1, 3):
            cv.px(i, y + 1, "#7b93a8")
    cv.vline(x + w // 2, y, y + h - 1, frame)
    cv.hline(x, x + w - 1, y + h // 2, frame)


def house(cv, x, y, w, h, rng, roof_tones=None, wall=CREAM, lit=True, chimney=False, style=0, dark=False):
    """日式/洋风小屋：石基 + 木筋墙 + 上窄下宽的坡瓦屋顶（可带烟囱）。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    roof_tones = roof_tones or (THATCH_DK, THATCH, THATCH_LT)
    wall_h = max(14, int(h * 0.46))
    roof_h = h - wall_h + 10
    ry = y + 2
    wall_y = ry + roof_h - 4
    cv.shadow_rect(x + 4, y + h - 8, w - 2, 8, 0.3)
    # 墙体
    cv.rect(x + 3, wall_y, w - 6, y + h - wall_y, INK)
    cv.rect(x + 4, wall_y + 1, w - 8, y + h - wall_y - 2, wall)
    cv.rect(x + 4, wall_y + 1, w - 8, 2, lighten(wall, 0.25))
    cv.vline(x + 4, wall_y + 1, y + h - 3, darken(wall, 0.22))
    cv.vline(x + w - 5, wall_y + 1, y + h - 3, darken(wall, 0.32))
    # 石基
    cv.rect(x + 3, y + h - 6, w - 6, 6, INK)
    cv.rect(x + 4, y + h - 5, w - 8, 4, STONE)
    for i in range(x + 6, x + w - 6, 7):
        cv.vline(i, y + h - 5, y + h - 2, STONE_DK)
    cv.hline(x + 4, x + w - 5, y + h - 3, STONE_LT)
    # 木筋
    mullion = x + (int(w * 0.36) if style else w // 2)
    cv.rect(mullion - 1, wall_y + 1, 3, y + h - 8 - wall_y, TIMBER)
    cv.rect(x + 4, wall_y + 2, w - 8, 2, TIMBER_LT)
    # 门
    dw = max(6, w // 8)
    dx = x + w - dw - 9 if style else x + 8
    cv.rect(dx - 1, wall_y + 6, dw + 2, y + h - 7 - wall_y - 6, INK)
    cv.rect(dx, wall_y + 7, dw, y + h - 7 - wall_y - 7, WOOD)
    cv.vline(dx + 1, wall_y + 7, y + h - 8, WOOD_LT)
    cv.vline(dx + dw - 1, wall_y + 7, y + h - 8, darken(WOOD, 0.35))
    cv.px(dx + dw - 3, wall_y + 7 + (y + h - 14 - wall_y) // 2, GOLD)
    # 窗
    for wx in (x + 9, x + w - 20):
        if abs(wx - dx) < 13:
            continue
        window(cv, wx, wall_y + 5, 9, 7, glow=lit)
    # 屋顶
    taper = min(7, max(3, w // 14))
    shingle_roof(cv, x + 1, ry, w - 2, roof_h, roof_tones, rng, taper=taper)
    # 屋脊
    cv.rect(x - 1, ry - 3, w + 2, 5, INK)
    cv.rect(x, ry - 2, w, 3, "#5a4a4e" if dark else "#7c5a46")
    cv.hline(x + 1, x + w - 2, ry - 2, "#5f4d52" if dark else "#a5806a")
    # 檐口阴影
    cv.hline(x + 3, x + w - 4, wall_y - 1, blend(INK, wall, 0.35))
    cv.hline(x + 3, x + w - 4, wall_y, blend(INK, wall, 0.58))
    if chimney:
        cx, cy = x + w - 22, ry - 15
        cv.rect(cx - 1, cy - 2, 9, 18, INK)
        cv.rect(cx, cy - 1, 7, 16, STONE)
        cv.rect(cx, cy - 1, 7, 3, STONE_LT)
        cv.vline(cx + 3, cy + 3, cy + 13, STONE_DK)
        smoke(cv, cx + 3, cy - 3, rng)


def smoke(cv, x, y, rng, n=5):
    for i in range(n):
        r = 2.2 + i * 0.95
        px0 = x + i * 2.6 + rng.uniform(-0.8, 0.8)
        py0 = y - i * 6.0
        cv.ell(px0, py0, r + 1, r + 0.8, blend(CREAM, INK, 0.25))
        cv.ell(px0, py0, r, r * 0.9, CREAM_D if i else CREAM)
        cv.ell(px0 - r * 0.35, py0 - r * 0.35, r * 0.55, r * 0.5, lighten(CREAM, 0.3))


# ---------------------------------------------------------------- 日式道具
def torii(cv, x, y, w, h, rng):
    """鸟居：石基 + 朱红立柱 + 笠木/岛木 + 贯 + 注连绳。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 8, y + h - 4, w - 16, 6, 0.32)
    base_y = y + h
    pw = 6
    lx, rx = x + 9, x + w - 15
    for px0 in (lx, rx):
        cv.rect(px0 - 1, y + 3, pw + 2, h - 1, INK)
        cv.rect(px0, y + 4, pw, h - 4, RED)
        cv.vline(px0, y + 4, base_y - 2, RED_LT)
        cv.vline(px0 + pw - 1, y + 4, base_y - 2, RED_DK)
        cv.vline(px0 + pw - 2, y + 4, base_y - 2, darken(RED, 0.22))
        cv.rect(px0 - 3, base_y - 4, pw + 6, 6, INK)
        cv.rect(px0 - 2, base_y - 3, pw + 4, 4, STONE_LT)
        cv.hline(px0 - 2, px0 + pw + 1, base_y - 3, STONE_PALE)
        cv.hline(px0 - 2, px0 + pw + 1, base_y, STONE_DK)
    gy = y + h - 12
    cv.rect(x + 2, gy - 1, w - 4, 7, INK)
    cv.rect(x + 3, gy, w - 6, 5, RED)
    cv.hline(x + 3, x + w - 4, gy, RED_LT)
    cv.hline(x + 3, x + w - 4, gy + 4, RED_DK)
    cv.rect(lx + pw // 2 - 1, y + 2, 4, gy - y - 3, INK)
    cv.rect(lx + pw // 2, y + 3, 2, gy - y - 4, RED_DK)
    cv.rect(x - 1, y - 1, w + 2, 5, INK)
    cv.rect(x, y, w, 3, RED_DK)
    cv.rect(x - 4, y - 6, w + 8, 6, INK)
    cv.rect(x - 3, y - 5, w + 6, 4, RED)
    cv.hline(x - 3, x + w + 2, y - 5, RED_LT)
    cv.hline(x - 3, x + w + 2, y - 2, RED_DK)
    cv.rect(x - 6, y - 8, 11, 4, INK)
    cv.rect(x - 5, y - 7, 9, 3, RED)
    cv.rect(x + w - 5, y - 8, 11, 4, INK)
    cv.rect(x + w - 4, y - 7, 9, 3, RED)
    for i in range(x + 7, x + w - 7, 5):
        cv.hline(i, i + 2, gy + 6, CREAM)
        cv.hline(i, i + 2, gy + 7, CREAM_D)
        if (i // 5) % 2 == 0:
            cv.vline(i + 1, gy + 8, gy + 10, CREAM)
            cv.px(i + 1, gy + 11, CREAM_D)


def vending(cv, x, y, w, h, rng, night=False):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 4, w, 5, 0.32)
    cv.rect(x, y, w, h, INK)
    cv.rect(x + 1, y + 1, w - 2, h - 2, "#b8453f")
    cv.rect(x + 1, y + 1, w - 2, 7, "#d9584a")
    cv.hline(x + 1, x + w - 2, y + 1, "#ef8b70")
    cv.rect(x + 1, y + 8, w - 2, h - 11, "#8f3330")
    cv.rect(x + 3, y + 9, w - 6, h - 18, "#1d3340")
    cv.hline(x + 3, x + w - 4, y + 9, "#4d6c7c")
    cols = ("#e8c65a", "#7fc6e0", "#e07c6a", "#a9d68f", "#d3a0e0")
    for row in range(2):
        for i, xx in enumerate(range(x + 5, x + w - 6, 5)):
            c = lighten(cols[(i + row) % len(cols)], 0.22 if night else 0.0)
            cv.rect(xx, y + 11 + row * 9, 3, 7, c)
            cv.px(xx, y + 11 + row * 9, lighten(c, 0.4))
            cv.px(xx + 1, y + 12 + row * 9, lighten(c, 0.55))
    cv.rect(x + 1, y + h - 9, w - 2, 6, "#7a2a28")
    cv.rect(x + 4, y + h - 8, w - 8, 4, "#241620")
    cv.hline(x + 4, x + w - 5, y + h - 8, "#4f3038")


def bench(cv, x, y, w, h, rng):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 3, w - 4, 5, 0.32)
    back = max(8, int(h * 0.42))
    seat_y = y + back
    # 靠背：两条横板 + 竖挡
    cv.rect(x + 3, y, w - 6, back, INK)
    for by in (y + 1, y + back - 5):
        cv.rect(x + 4, by, w - 8, 4, WOOD)
        cv.hline(x + 4, x + w - 5, by, WOOD_LT)
        cv.hline(x + 4, x + w - 5, by + 3, darken(WOOD, 0.3))
    for lx in (x + 4, x + w - 8, x + w // 2 - 2):
        cv.vline(lx, y, y + back - 1, darken(WOOD, 0.18))
    # 座面
    cv.rect(x, seat_y, w, 5, INK)
    cv.rect(x + 1, seat_y + 1, w - 2, 3, WOOD)
    cv.hline(x + 1, x + w - 2, seat_y + 1, WOOD_LT)
    cv.hline(x + 2, x + w - 3, seat_y + 3, darken(WOOD, 0.34))
    # 铁脚
    for lx in (x + 3, x + w - 8):
        cv.rect(lx, seat_y + 4, 5, h - (seat_y - y) - 2, INK)
        cv.rect(lx + 1, seat_y + 5, 3, h - (seat_y - y) - 4, METAL_DK)
        cv.vline(lx + 1, seat_y + 5, h + y - 2, METAL_LT)
        cv.rect(lx - 1, h + y - 3, 7, 3, INK)
        cv.rect(lx, h + y - 2, 5, 1, METAL)


def rocks(cv, x, y, w, h, rng, wet=False, dark=False):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 5, w - 2, 6, 0.34)
    tones = ("#2d3a52", "#3f4f68", "#5a6d88", "#8397ac") if dark else (STONE_DK, STONE, STONE_LT, STONE_PALE)
    n = max(2, w // 20)
    for i in range(n):
        cx = x + (i + 0.5) * w / n + rng.uniform(-3, 3)
        cy = y + h - 4 + rng.uniform(-2, 1)
        r = rng.uniform(6.5, 11)
        round_blob(cv, cx, cy - r * 0.42, r, rng, tones, squash=0.74, dither=0.3)
        for _ in range(2):
            cv.px(cx + rng.uniform(-r * 0.6, r * 0.6), cy - r * 0.5 + rng.uniform(-1, 3),
                  "#3f5a68" if dark else MOSS)
    if wet:
        for i in range(x + 1, x + w - 1, 2):
            if h01(i, y, 41) > 0.35:
                cv.px(i, y + h - 1, FOAM)


# ---------------------------------------------------------------- 室内道具
def aquarium_tank(cv, x, y, w, h, rng, style="fish", empty=False):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 5, w - 3, 6, 0.36)
    cv.rect(x, y, w, h, INK)
    cv.rect(x + 1, y + 1, w - 2, h - 2, "#1d3b4d")
    ix, iy, iw, ih = x + 4, y + 5, w - 8, h - 11
    if empty:
        cv.rect(ix, iy, iw, ih, "#16242e")
        for row in range(ih):
            cv.hline(ix, ix + iw - 1, iy + row, blend("#22333f", "#0e1a22", row / max(1, ih - 1)))
        cv.rect(ix, iy + ih - 5, iw, 5, "#2c2a2a")
        cv.hline(ix, ix + iw - 1, iy + ih - 5, "#413c38")
        for i in range(ix + 6, ix + iw - 6, 19):
            cv.line(i, iy + 3, i + 9, iy + ih - 8, "#2b3f4c")
            cv.line(i + 4, iy + ih - 7, i - 3, iy + 5, "#22333d")
    else:
        for row in range(ih):
            t = row / max(1, ih - 1)
            cv.hline(ix, ix + iw - 1, iy + row, blend("#4babd0", "#0d2c44", t * 0.9))
        for i in range(3):
            yy = iy + 4 + i * max(4, ih // 4)
            for xx in range(ix + 3 + i * 9, ix + iw - 5, 27):
                cv.hline(xx, min(ix + iw - 4, xx + 10), yy, "#8fdcf0")
                cv.tint(xx + 1, yy + 1, "#cdf1fb", 0.5)
        cv.rect(ix, iy + ih - 6, iw, 6, SAND)
        cv.hline(ix, ix + iw - 1, iy + ih - 6, SAND_LT)
        cv.hline(ix, ix + iw - 1, iy + ih - 1, darken(SAND, 0.32))
        for _ in range(max(2, iw // 30)):
            bx = rng.randrange(ix + 4, ix + iw - 8)
            by = iy + ih - 7
            cc = rng.choice([MINT, "#8fd0c0", "#c58fd0", "#e0a06a", "#7fd0e0"])
            for k in range(rng.randint(7, 13)):
                sx = bx + math.sin(k * 0.6) * 2.4
                cv.px(sx, by - k, cc)
                cv.px(sx + 1, by - k, darken(cc, 0.28))
        if style == "fish":
            for _ in range(max(3, iw // 24)):
                fx = rng.randrange(ix + 6, ix + iw - 10)
                fy = rng.randrange(iy + 6, iy + ih - 13)
                fc = rng.choice(["#f0c65a", "#e88a5a", "#7fc0e8", "#f0a0c0", "#a8e8b0"])
                cv.ell(fx, fy, 3.6, 2.2, darken(fc, 0.34))
                cv.ell(fx, fy, 3.2, 1.9, fc)
                cv.px(fx + 3, fy - 1, fc)
                cv.px(fx + 4, fy, lighten(fc, 0.3))
                cv.px(fx - 3, fy, darken(fc, 0.4))
                cv.px(fx + 1, fy - 1, INK)
            for bx in range(ix + 5, ix + iw - 5, 13):
                for k in range(rng.randint(2, 5)):
                    cv.px(bx + rng.uniform(-1, 1), iy + ih - 9 - k * 2, FOAM_W)
        elif style == "isopod":
            cx0 = ix + iw // 2
            cy0 = iy + ih - 9
            body = "#c9b494"
            for k in range(8):
                seg = iw * 0.055
                rr = iw * 0.13 * (1 - abs(k - 3.5) / 9.0)
                cv.ell(cx0 + (k - 3.5) * seg, cy0 - 3, rr, 4.4, darken(body, 0.34))
                cv.ell(cx0 + (k - 3.5) * seg, cy0 - 3.4, rr - 0.9, 3.5, body)
                cv.px(cx0 + (k - 3.5) * seg, cy0 - 5.6, lighten(body, 0.3))
            for k in range(7):
                cv.line(cx0 - iw * 0.16 + k * 4, cy0 + 1, cx0 - iw * 0.2 + k * 4, cy0 + 5, "#8f7c62")
                cv.line(cx0 + iw * 0.16 - k * 4, cy0 + 1, cx0 + iw * 0.2 - k * 4, cy0 + 5, "#8f7c62")
            cv.line(cx0 + iw * 0.16, cy0 - 5, cx0 + iw * 0.27, cy0 - 11, "#cbb392")
            cv.line(cx0 - iw * 0.16, cy0 - 5, cx0 - iw * 0.27, cy0 - 11, "#cbb392")
            cv.px(cx0, cy0 - 6, "#efe4cc")
    cv.rect(x + 2, y + 2, w - 4, 3, "#cdeef8")
    cv.rect(x + 2, y + 2, w - 4, 1, "#eefaff")
    cv.vline(x + 2, y + 2, y + h - 4, "#8fd0e0")
    cv.vline(x + w - 3, y + 4, y + h - 5, "#0a1d29")
    cv.rect(x, y + h - 3, w, 4, "#1b2f3c")
    cv.hline(x, x + w - 1, y + h - 3, "#3f6474")


def display_case(cv, x, y, w, h, rng, title_hue=None):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 3, w - 2, 4, 0.32)
    cv.rect(x, y + h - 10, w, 10, INK)
    cv.rect(x + 1, y + h - 9, w - 2, 8, WOOD)
    cv.hline(x + 1, x + w - 2, y + h - 9, WOOD_LT)
    cv.hline(x + 1, x + w - 2, y + h - 2, darken(WOOD, 0.4))
    cv.rect(x + 1, y, w - 2, h - 9, INK)
    cv.rect(x + 2, y + 1, w - 4, h - 11, "#1a3d52")
    for row in range(h - 11):
        cv.hline(x + 2, x + w - 3, y + 1 + row, blend("#3f9ac0", "#0f3048", row / max(1, h - 12) * 0.85))
    cv.hline(x + 2, x + w - 3, y + h - 10, SAND_LT)
    hue = title_hue or rng.choice([MINT, "#f0c65a", "#e88a5a", "#a0c8f0"])
    for i in range(max(1, (w - 10) // 10)):
        cx = x + 6 + i * 10
        cv.ell(cx, y + h - 16, 3.4, 2.4, darken(hue, 0.3))
        cv.ell(cx, y + h - 16.5, 2.9, 2.0, hue)
        cv.px(cx + 2, y + h - 17, hue)
        cv.px(cx + 1, y + h - 17, lighten(hue, 0.35))
    cv.line(x + 3, y + h - 13, x + 4, y + 3, "#cdf1fb")
    cv.line(x + w - 5, y + h - 13, x + w - 6, y + 4, "#8fd0e0")


def shelf_case(cv, x, y, w, h, rng, kind="shelf"):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 3, w - 2, 4, 0.32)
    cv.rect(x, y, w, h, INK)
    if kind == "ice":
        cv.rect(x + 1, y + 1, w - 2, h - 2, "#274b5c")
        cv.rect(x + 2, y + 2, w - 4, h - 6, "#3f7f96")
        for row in range(h - 9):
            cv.hline(x + 2, x + w - 3, y + 2 + row, blend("#8fd8ea", "#2f6e88", row / max(1, h - 10)))
        cv.rect(x + 2, y + 2, w - 4, 3, "#dff4fa")
        cv.hline(x + 3, x + w - 4, y + 3, "#ffffff")
        for i in range(x + 4, x + w - 5, 8):
            cv.vline(i, y + 4, y + h - 7, "#8fd0e0")
        cv.rect(x + 1, y + h - 6, w - 2, 5, "#4b6b78")
        cv.hline(x + 2, x + w - 3, y + h - 6, "#a8dcea")
    else:
        cv.rect(x + 1, y + 1, w - 2, h - 2, "#7f8f92")
        cv.hline(x + 1, x + w - 2, y + 1, "#b3c0c1")
        rows = max(2, h // 11)
        cols = ("#d05a4e", "#5aa8d0", "#e0b84a", "#6fbf7a", "#c98fd0", "#e89a5a")
        for r in range(rows):
            ry = y + 4 + r * (h - 7) // rows
            cv.hline(x + 2, x + w - 3, ry, "#42555a")
            cv.hline(x + 2, x + w - 3, ry + 1, "#a9b6b6")
            for i, xx in enumerate(range(x + 4, x + w - 5, 6)):
                c = cols[(i + r) % len(cols)]
                cv.rect(xx, ry - 6, 4, 6, darken(c, 0.3))
                cv.rect(xx, ry - 6, 3, 5, c)
                cv.px(xx, ry - 6, lighten(c, 0.4))
                cv.px(xx + 1, ry - 5, lighten(c, 0.55))
        cv.rect(x + 1, y + h - 4, w - 2, 3, "#57696d")


def counter(cv, x, y, w, h, rng):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 3, w - 2, 4, 0.32)
    cv.rect(x, y, w, h, INK)
    cv.rect(x + 1, y + 1, w - 2, h - 2, WOOD)
    cv.hline(x + 1, x + w - 2, y + 1, WOOD_LT)
    cv.hline(x + 1, x + w - 2, y + h - 2, darken(WOOD, 0.4))
    for i in range(x + 4, x + w - 3, 9):
        cv.vline(i, y + 2, y + h - 3, darken(WOOD, 0.22))
    rx = x + 3
    cv.rect(rx, y - 8, 13, 9, INK)
    cv.rect(rx + 1, y - 7, 11, 7, METAL_LT)
    cv.rect(rx + 2, y - 6, 9, 3, "#2b3a44")
    cv.hline(rx + 2, rx + 10, y - 5, "#6f8f9c")
    cv.rect(rx + 3, y - 2, 7, 2, METAL)
    cv.rect(x + w - 16, y - 2, 11, 4, INK)
    cv.rect(x + w - 15, y - 1, 9, 2, "#4f6b78")


def ice_shop(cv, x, y, w, h, rng):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 4, y + h - 5, w - 6, 6, 0.3)
    body_h = max(22, int(h * 0.5))
    by = y + h - body_h
    cv.rect(x, by, w, body_h, INK)
    cv.rect(x + 1, by + 1, w - 2, body_h - 2, CREAM)
    cv.hline(x + 2, x + w - 3, by + 2, "#fff8e0")
    cv.rect(x + 1, by + body_h - 5, w - 2, 5, CREAM_D)
    for i in range(x + 6, x + w - 5, 16):
        cv.vline(i, by + 3, by + body_h - 6, CREAM_S)
    cv.rect(x + 4, by + 6, w - 8, body_h - 14, INK)
    cv.rect(x + 5, by + 7, w - 10, body_h - 16, "#37505f")
    for row in range(body_h - 16):
        cv.hline(x + 5, x + w - 6, by + 7 + row, blend("#5fa8c0", "#24404f", row / max(1, body_h - 17) * 0.7))
    cols = ("#e88a9a", "#8fd0b0", "#f0d070", "#c9a0e0")
    for i, xx in enumerate(range(x + 7, x + w - 10, 9)):
        c = cols[i % len(cols)]
        cv.ell(xx + 2, by + body_h - 14, 2.7, 2.7, darken(c, 0.32))
        cv.ell(xx + 2, by + body_h - 14.4, 2.1, 2.1, c)
        cv.px(xx + 2, by + body_h - 16, lighten(c, 0.45))
        cv.rect(xx + 1, by + body_h - 12, 3, 4, TAN)
    ax, aw = x - 3, w + 6
    cv.rect(ax, y, aw, 12, INK)
    for i, xx in enumerate(range(ax + 1, ax + aw - 1, 6)):
        cv.rect(xx, y + 1, 3, 10, "#f6f2e4" if i % 2 == 0 else "#dc5a56")
    cv.hline(ax + 1, ax + aw - 2, y + 1, "#ffffff")
    cv.hline(ax + 1, ax + aw - 2, y + 11, "#8f3f3f")
    for xx in range(ax + 4, ax + aw - 4, 15):
        cv.vline(xx, y + 12, y + 16, "#c8c2a8")
    sx, sy = x + w - 14, y - 12
    cv.rect(sx - 1, sy - 1, 11, 11, INK)
    cv.rect(sx, sy, 9, 9, "#f0d070")
    cv.ell(sx + 4, sy + 4, 2.8, 2.6, "#e88a9a")
    cv.px(sx + 4, sy + 1, "#ffffff")
    cv.px(sx + 3, sy + 3, lighten("#e88a9a", 0.4))
    cv.rect(sx + 3, sy + 9, 3, 6, TAN)
    cv.px(sx + 3, sy + 10, TAN_LT)


def market_stall(cv, x, y, w, h, rng):
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 3, y + h - 3, w - 3, 5, 0.32)
    cv.rect(x, y, w, h, INK)
    cv.rect(x + 1, y + 1, w - 2, h - 2, WOOD)
    for i in range(x + 2, x + w - 3, 4):
        cv.hline(i, i + 1, y + 2, WOOD_LT)
        cv.hline(i, i + 1, y + h - 4, darken(WOOD, 0.3))
    cv.rect(x + 3, y + 4, w - 6, 6, TAN_LT)
    cv.hline(x + 3, x + w - 4, y + 4, "#f0e0c0")
    cols = ("#d05a4e", "#6fbf7a", "#e0b84a")
    for i, xx in enumerate(range(x + 5, x + w - 6, 7)):
        c = cols[i % 3]
        cv.rect(xx, y + 5, 4, 3, c)
        cv.px(xx, y + 5, lighten(c, 0.4))
    for xx in (x + 2, x + w - 4):
        cv.rect(xx, y + h - 8, 2, 6, darken(WOOD, 0.4))


# ================================================================ 便利店（夜间）
# 参考图的配色：冷蓝灰地砖、青白冷柜光、金属货架、深墨描边。
S_INK = "#131b2c"
S_FRAME = "#5a6a82"
S_FRAME_LT = "#93a6c0"
S_FRAME_DK = "#333e52"
S_TOP = "#a9b9cf"
S_TOP_LT = "#dde8f4"
S_LIT = "#e2f8fb"
S_CYAN = "#7fe6e0"
S_CYAN_DK = "#3f9fa8"
S_PAPER = "#f3f5ec"

# 货架商品配色（高对比，保证缩到 3 倍后仍能分辨）
CUP_COLS = ("#d0574a", "#3f74b8", "#4f9a5e", "#c8963f", "#8c5fb8")
SNACK_COLS = ("#d9704f", "#4f9ac0", "#e0b84a", "#6fbf7a", "#c86f9f", "#7f8fd0")
DRINK_COLS = ("#4f86b8", "#c0605a", "#5aa87f", "#d0a04a", "#8f7fc8")


def _shelf_lip(cv, x, w, ly):
    """层板：金属板 + 灯带高光 + 底部墨线，让货架层次一眼分明。"""
    cv.hline(x + 1, x + w - 2, ly, S_FRAME_LT)
    cv.hline(x + 1, x + w - 2, ly + 1, S_FRAME)
    cv.hline(x + 1, x + w - 2, ly + 2, S_INK)
    cv.hline(x + 3, x + w - 4, ly + 3, S_FRAME_DK)


def _item_cup(cv, ix, base_y, i):
    """杯面：白色杯身 + 彩色杯盖/标签带。"""
    wdt, hgt = 6, 9
    c = CUP_COLS[i % len(CUP_COLS)]
    cv.rect(ix, base_y - hgt, wdt, hgt, S_INK)
    cv.rect(ix + 1, base_y - hgt + 1, wdt - 2, hgt - 2, S_PAPER)
    cv.hline(ix + 1, ix + wdt - 2, base_y - hgt + 1, "#ffffff")     # 杯盖
    cv.hline(ix + 1, ix + wdt - 2, base_y - hgt + 2, "#b9b3a0")     # 盖沿
    cv.rect(ix + 1, base_y - hgt + 4, wdt - 2, 3, c)                # 标签色带
    cv.px(ix + 2, base_y - hgt + 5, lighten(c, 0.45))
    cv.px(ix + 2, base_y - hgt + 1, "#ffffff")
    cv.vline(ix + 1, base_y - hgt + 3, base_y - 2, "#cdc7b2")
    cv.px(ix + 1, base_y - 1, darken(c, 0.45))
    cv.px(ix + wdt - 2, base_y - 1, darken(c, 0.45))


def _item_snack(cv, ix, base_y, i):
    """零食袋：直立包装 + 斜向锡箔反光。"""
    wdt, hgt = 7, 8
    c = SNACK_COLS[i % len(SNACK_COLS)]
    cv.rect(ix, base_y - hgt, wdt, hgt, S_INK)
    cv.rect(ix + 1, base_y - hgt + 1, wdt - 2, hgt - 2, c)
    cv.px(ix + 2, base_y - hgt + 2, lighten(c, 0.55))
    cv.px(ix + 3, base_y - hgt + 3, lighten(c, 0.42))
    cv.px(ix + 4, base_y - hgt + 4, lighten(c, 0.3))
    cv.rect(ix + 2, base_y - hgt + 1, wdt - 4, 2, lighten(c, 0.62))  # 品牌色块
    cv.hline(ix + 1, ix + wdt - 2, base_y - 2, darken(c, 0.42))


def _item_drink(cv, ix, base_y, i):
    """瓶装饮料：细颈 + 瓶盖 + 标签。"""
    wdt, hgt = 5, 9
    c = DRINK_COLS[i % len(DRINK_COLS)]
    cv.rect(ix, base_y - hgt + 2, wdt, hgt - 2, S_INK)          # 瓶身
    cv.rect(ix + 1, base_y - hgt + 3, wdt - 2, hgt - 4, c)
    cv.rect(ix + 1, base_y - hgt + 5, wdt - 2, 2, S_PAPER)      # 标签
    cv.vline(ix + 2, base_y - hgt + 1, base_y - hgt + 2, S_INK)  # 瓶颈
    cv.px(ix + 2, base_y - hgt, lighten(c, 0.5))                # 瓶盖
    cv.px(ix + 2, base_y - hgt + 3, lighten(c, 0.5))


SHELF_ITEMS = {"cup": _item_cup, "snack": _item_snack, "drink": _item_drink}


def gondola_shelf(cv, x, y, w, h, rng, kind="cup"):
    """便利店货架：俯视台面 + 两层商品正面，层板带灯带。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    draw = SHELF_ITEMS.get(kind, _item_cup)
    cv.shadow_rect(x + 2, y + h - 3, w - 2, 5, 0.34)
    cv.rect(x, y, w, h, S_INK)
    cv.rect(x + 1, y + 1, w - 2, h - 2, S_FRAME_DK)
    # 顶部台面
    cv.rect(x + 1, y + 1, w - 2, 3, S_FRAME)
    cv.hline(x + 2, x + w - 3, y + 2, S_FRAME_LT)
    cv.hline(x + 2, x + w - 3, y + 4, S_INK)
    rows = 2
    band = (h - 7) // rows
    for r in range(rows):
        by = y + 5 + r * band
        lip = by + band - 2
        cv.rect(x + 2, by, w - 4, max(1, lip - by), "#39435a")       # 背板
        n = max(3, (w - 7) // 8)
        gap = (w - 8) / float(n)
        for i in range(n):
            ix = int(x + 4 + i * gap)
            draw(cv, ix, lip, i + r)
        _shelf_lip(cv, x, w, lip)
        # 层板上的价签
        for px_ in range(x + 6, x + w - 6, 13):
            cv.rect(px_, lip + 1, 4, 2, S_PAPER)
            cv.px(px_ + 1, lip + 1, CUP_COLS[(px_ // 13) % len(CUP_COLS)])
    # 底部踢脚 + 侧框
    cv.rect(x + 1, y + h - 4, w - 2, 3, S_FRAME_DK)
    cv.hline(x + 2, x + w - 3, y + h - 4, S_FRAME)
    cv.vline(x + 1, y + 1, y + h - 2, S_FRAME)
    cv.vline(x + w - 2, y + 1, y + h - 2, S_FRAME_DK)


def glass_fridge(cv, x, y, w, h, rng):
    """玻璃门冰柜：顶部发光招牌 + 冷光内胆 + 三层饮料 + 门框把手。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 3, w - 2, 5, 0.36)
    cv.rect(x, y, w, h, S_INK)
    # 顶部发光灯箱（参考图里冰柜上方那条青绿光带）
    cv.rect(x + 1, y + 1, w - 2, 8, "#17615f")
    cv.hline(x + 2, x + w - 3, y + 2, "#8ff0dc")
    cv.hline(x + 2, x + w - 3, y + 3, "#c8fbe8")
    cv.hline(x + 2, x + w - 3, y + 4, "#6fdcd0")
    cv.hline(x + 2, x + w - 3, y + 5, "#3fb8b0")
    cv.hline(x + 3, x + w - 4, y + 7, "#1b6f74")
    cv.rect(x + 4, y + 5, 12, 2, "#f2fff8")          # 灯箱上的招牌块
    cv.rect(x + w - 17, y + 5, 12, 2, "#d8fbee")
    cv.rect(x + 1, y + 8, w - 2, 1, S_INK)
    # 柜体
    by = y + 9
    bh = h - 10
    cv.rect(x + 1, by, w - 2, bh, S_INK)
    inner_x0, inner_x1 = x + 2, x + w - 3
    for row in range(bh - 4):
        cv.hline(inner_x0, inner_x1, by + 2 + row,
                 blend(S_LIT, "#5fa8c4", min(1.0, 0.15 + row / max(1.0, (bh - 5) * 1.15))))
    # 三层饮料：冷光下的深色剪影
    shelves = 3
    for r in range(shelves):
        sy = by + 6 + r * ((bh - 9) // shelves)
        cv.hline(inner_x0, inner_x1, sy + 5, blend("#7fc4d8", S_LIT, 0.35))
        cols = SNACK_COLS if r == 0 else DRINK_COLS
        for i, ix in enumerate(range(inner_x0 + 2, inner_x1 - 3, 5)):
            c = cols[(i + r * 3) % len(cols)]
            cv.rect(ix, sy, 4, 5, darken(c, 0.12))
            cv.px(ix, sy, lighten(c, 0.35))
            cv.vline(ix + 3, sy + 1, sy + 4, darken(c, 0.42))     # 瓶身分界
            cv.hline(ix, ix + 3, sy + 4, darken(c, 0.42))
    # 玻璃门：三分格 + 门框 + 把手 + 反光
    seg = (inner_x1 - inner_x0 + 1) / 3.0
    for k in range(1, 3):
        dx = int(inner_x0 + seg * k)
        cv.vline(dx, by + 2, by + bh - 3, S_FRAME)
        cv.vline(dx + 1, by + 2, by + bh - 3, S_INK)
    for k in range(3):
        hx = int(inner_x0 + seg * k + seg - 4)
        cv.vline(hx, by + 7, by + bh - 8, S_FRAME_LT)                 # 把手
        cv.vline(hx + 1, by + 7, by + bh - 8, S_FRAME)
        gx = int(inner_x0 + seg * k + 3)
        for d in range(4):
            cv.px(gx + d, by + 3 + d, S_LIT)
            cv.px(gx + d + 1, by + 3 + d, blend(S_LIT, "#8fd8e4", 0.5))
    # 底座
    cv.rect(x + 1, y + h - 4, w - 2, 3, S_FRAME_DK)
    cv.hline(x + 2, x + w - 3, y + h - 4, S_FRAME)
    cv.box(x, y, w, h, S_INK)


def checkout_counter(cv, x, y, w, h, rng):
    """收银台：金属台面 + 收银机（发光屏）+ 扫码器 + 购物篮（元素少而大，一眼看清）。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    cv.shadow_rect(x + 2, y + h - 1, w - 2, 5, 0.34)
    cv.rect(x, y, w, h, S_INK)
    cv.rect(x + 1, y + 1, w - 2, h - 2, S_TOP)                 # 台面
    cv.hline(x + 2, x + w - 3, y + 1, S_TOP_LT)
    cv.hline(x + 2, x + w - 3, y + 2, "#c3d2e4")
    cv.rect(x + 1, y + h - 5, w - 2, 4, S_FRAME)               # 前立面
    cv.hline(x + 2, x + w - 3, y + h - 5, S_FRAME_LT)
    cv.hline(x + 2, x + w - 3, y + h - 2, S_INK)
    cv.vline(x + 22, y + h - 4, y + h - 2, S_FRAME_DK)
    cv.vline(x + 44, y + h - 4, y + h - 2, S_FRAME_DK)

    # 收银机：大屏 + 冷光 + 键盘
    px0 = x + 4
    cv.rect(px0, y + 2, 17, 12, S_INK)
    cv.rect(px0 + 1, y + 3, 15, 10, "#2b3648")
    cv.rect(px0 + 2, y + 4, 13, 7, "#16202f")               # 屏幕
    for row in range(6):
        cv.hline(px0 + 3, px0 + 13 - (row > 4) * 2, y + 5 + row,
                 blend(S_CYAN, "#2f6f8a", 0.1 + row * 0.14))
    cv.hline(px0 + 3, px0 + 10, y + 6, S_LIT)
    cv.hline(px0 + 3, px0 + 13, y + 9, blend(S_CYAN, "#ffffff", 0.45))
    cv.hline(px0 + 2, px0 + 14, y + 10, "#4b5f7c")          # 屏幕下沿
    cv.rect(px0 + 3, y + 12, 11, 2, "#3d4b60")              # 键盘
    cv.px(px0 + 1, y + 11, "#ffe9a8")                       # 指示灯
    cv.px(px0 + 13, y + 3, "#8fa8c8")

    # 扫码器（收银台中间那台）
    sx = x + 26
    cv.rect(sx, y + 5, 10, 10, S_INK)
    cv.rect(sx + 1, y + 6, 8, 7, "#39465c")
    cv.rect(sx + 2, y + 7, 6, 3, "#2b3648")                  # 扫码头
    cv.hline(sx + 2, sx + 7, y + 7, "#5f7086")
    cv.px(sx + 4, y + 8, "#ff6a52")                          # 激光点
    cv.px(sx + 5, y + 8, "#ffb08a")
    cv.hline(sx + 1, sx + 8, y + 13, S_FRAME_LT)
    cv.rect(sx + 2, y + 12, 6, 1, "#4b5f7c")

    # 购物篮（含两件商品）
    bx = x + 40
    cv.rect(bx, y + 3, 16, 12, S_INK)
    cv.rect(bx + 1, y + 4, 14, 10, "#6f829c")
    for k in range(bx + 2, bx + 15, 2):
        cv.vline(k, y + 5, y + 13, "#4a5a72")
    cv.hline(bx + 1, bx + 14, y + 4, S_FRAME_LT)
    cv.rect(bx + 3, y + 1, 5, 3, "#d0574a")
    cv.hline(bx + 3, bx + 7, y + 1, "#e8846a")
    cv.rect(bx + 9, y + 1, 5, 3, "#e0b84a")
    cv.hline(bx + 9, bx + 13, y + 1, "#f2d488")


def store_shadow(cv, x, y, w, h, spread=6, t=0.5):
    """冷色接触阴影：让货架/冰柜/收银台从地面「立」起来。"""
    x, y, w, h = int(x), int(y), int(w), int(h)
    for k in range(spread):
        a = t * (1 - k / float(spread)) ** 1.6
        for xx in range(x + 1, x + w - 1):
            cv.tint(xx, y + h - 1 + k, "#0a1220", a)
    for k in range(3):
        a = t * 0.5 * (1 - k / 3.0)
        for yy in range(y + 2, y + h):
            cv.tint(x - 1 - k, yy, "#0a1220", a)
            cv.tint(x + w + k, yy, "#0a1220", a)
