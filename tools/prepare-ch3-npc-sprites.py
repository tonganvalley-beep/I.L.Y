#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""第三章 地图 NPC 小人素材处理（同事 / 日日谷）。

把 AI 生成的「白底全身立绘」处理成与主角地图精灵同规格的 48x48 透明 PNG：
  - 纯白背景用「从边界洪水填充」抠掉（保证衣服上的白色不被误删）
  - 缩放到人物高度 = 48px（铺满整格，与 cursor-hero-front.png 一致）
  - 水平居中放入 48x48 画布
  - 缩放走「预乘 alpha + BOX」，避免边缘出现白边

用法：
  python tools/prepare-ch3-npc-sprites.py <输入PNG> <输出PNG> [--height 48] [--canvas 48]
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

BG_MIN_MEAN = 214.0   # 判定为「背景候选」的亮度下限
BG_MAX_SAT = 14       # 背景候选的最大通道极差（近似灰度）
ALPHA_SOFT = True     # 输出保留软边（与主角精灵一致，主角图也是软边）


def background_mask(rgb):
    """从四边洪水填充出与画布相连的浅色区域。"""
    h, w, _ = rgb.shape
    mean = rgb.mean(axis=2)
    sat = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    cand = (mean > BG_MIN_MEAN) & (sat < BG_MAX_SAT)
    mask = np.zeros((h, w), dtype=bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not mask[y, x]:
                mask[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not mask[y, x]:
                mask[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not mask[ny, nx]:
                mask[ny, nx] = True
                dq.append((ny, nx))
    return mask


def premultiplied(rgb, alpha):
    pm = rgb.astype(np.float32) * alpha[..., None]
    return pm


def resize_pm(pm, alpha, size):
    pm_img = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), 'RGB').resize(size, Image.BOX)
    a_img = Image.fromarray(np.clip(alpha * 255, 0, 255).astype(np.uint8), 'L').resize(size, Image.BOX)
    p = np.asarray(pm_img, dtype=np.float32)
    a = np.asarray(a_img, dtype=np.float32) / 255.0
    out_rgb = np.zeros_like(p)
    nz = a > 1e-4
    out_rgb[nz] = p[nz] / a[nz][:, None]
    return np.clip(out_rgb, 0, 255).astype(np.uint8), a


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(zip([a.lstrip('-') for a in sys.argv[1:] if a.startswith('--')],
                    [a for a in sys.argv[1:] if a.startswith('--')]))
    src, dst = args[0], args[1]
    canvas = 48
    height = 48

    im = Image.open(src).convert('RGB')
    rgb = np.asarray(im).astype(np.float32)
    bg = background_mask(rgb)
    alpha = (~bg).astype(np.float32)

    ys, xs = np.where(alpha > 0)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    print(f'  源图 {im.size} 人物框 {(x0, y0, x1, y1)} = {x1 - x0}x{y1 - y0}')

    pm = premultiplied(rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1])
    a = alpha[y0:y1, x0:x1]

    scale = height / (y1 - y0)
    tw = max(1, int(round((x1 - x0) * scale)))
    small_rgb, small_a = resize_pm(pm, a, (tw, height))
    if not ALPHA_SOFT:
        small_a = (small_a >= 0.5).astype(np.float32)

    out = np.zeros((canvas, canvas, 4), dtype=np.uint8)
    ox = (canvas - tw) // 2
    oy = canvas - height
    out[oy:oy + height, ox:ox + tw, :3] = small_rgb
    out[oy:oy + height, ox:ox + tw, 3] = np.clip(small_a * 255, 0, 255).astype(np.uint8)

    Image.fromarray(out, 'RGBA').save(dst)
    print(f'  → {dst}  人物 {tw}x{height} @ x={ox} y={oy}')


if __name__ == '__main__':
    main()
