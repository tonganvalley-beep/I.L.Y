#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
把「纯白底」的 AI 立绘抠成透明 PNG，只依赖 Pillow（无需 numpy / rembg）。

用法：
    python tools/remove_white_bg.py                      # 处理默认三张（十屋/小泪）
    python tools/remove_white_bg.py <图片路径> [<更多>...] # 处理指定图片
    python tools/remove_white_bg.py --maxh 1200 <图片>    # 同时限制输出高度

原理：
  1. 以「min(R,G,B) >= WHITE」为白底候选，做一次从四角出发的洪水填充（PIL 的
     ImageDraw.floodfill，C 实现，很快），只清除与画面边缘连通的白色区域，
     人物内部的眼白 / 高光因为不连通会被保留。
  2. 白底与人物之间的抗锯齿过渡带（灰度 202~242）按灰度给渐变 alpha，
     并用「去预乘」反算出真实颜色，消除一圈白边。
  3. 按 alpha 包围盒裁掉多余留白，输出透明 PNG（原地同名 .png）。

可调参数在文件顶部。
"""
import os
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

WHITE = 235      # 判定为「白底」的最小通道值（min(R,G,B) >= 此值）
LO = 202         # 灰度 <= LO 视为完全不透明
HI = 242         # 灰度 >= HI 视为完全透明（LO~HI 之间渐变）
BAND = 3         # 只在白底外扩 BAND 像素的过渡带里做渐变，避免人物内部被打洞
PAD = 8          # 裁剪后四周留白像素
MAXH = 0         # 输出最大高度（0 = 不缩放）

DEFAULT = [
    r"game/assets/images/ui/十屋-开心.jpg",
    r"game/assets/images/ui/十屋-道歉.jpg",
    r"game/assets/images/ui/小泪-冷漠.jpg",
]


def build_alpha(rgb, band_dilated, bg):
    """逐像素生成 alpha（纯 Python，1.5M 像素约几秒）。"""
    w, h = rgb.size
    r = rgb.getchannel("R")
    g = rgb.getchannel("G")
    b = rgb.getchannel("B")
    minc = ImageChops.darker(ImageChops.darker(r, g), b)   # min(R,G,B)
    src = list(zip(minc.getdata(), bg.getdata(), band_dilated.getdata()))
    out = bytearray(len(src))
    span = float(HI - LO)
    for i, (mv, bgv, dv) in enumerate(src):
        if bgv:                       # 与边缘连通的白底 -> 全透明
            out[i] = 0
        elif dv:                      # 白底外扩带内的抗锯齿像素 -> 渐变
            if mv >= HI:
                out[i] = 0
            elif mv <= LO:
                out[i] = 255
            else:
                out[i] = int(255 * (HI - mv) / span)
        else:                         # 人物内部 -> 不透明白
            out[i] = 255
    a = Image.frombytes("L", (w, h), bytes(out))
    return a, minc


def unpremultiply(rgb, alpha):
    """背景是纯白，观察色 = a*C + (1-a)*255，反算真实颜色去掉白边。"""
    w, h = rgb.size
    r_, g_, b_ = rgb.split()
    ad = alpha.getdata()
    chan = [r_.getdata(), g_.getdata(), b_.getdata()]
    res = []
    for ci, data in enumerate(chan):
        buf = bytearray(len(ad))
        for i, (c, a) in enumerate(zip(data, ad)):
            if a == 255:
                buf[i] = c
            elif a == 0:
                buf[i] = c
            else:
                v = (c - (1 - a / 255.0) * 255.0) / (a / 255.0)
                buf[i] = 0 if v < 0 else (255 if v > 255 else int(v + 0.5))
        res.append(Image.frombytes("L", (w, h), bytes(buf)))
    return Image.merge("RGB", res)


def remove_bg(path, maxh=0):
    im = Image.open(path).convert("RGB")
    w, h = im.size

    # 1) 白底候选 -> 洪水填充（只清与边缘连通的部分）
    minc = ImageChops.darker(ImageChops.darker(im.getchannel("R"), im.getchannel("G")),
                             im.getchannel("B"))
    mask = minc.point(lambda v: 255 if v >= WHITE else 0, mode="L")
    dr = ImageDraw.Draw(mask)
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if mask.getpixel(xy) == 255:
            ImageDraw.floodfill(mask, xy, 128, thresh=0)
    bg = mask.point(lambda v: 255 if v == 128 else 0, mode="L")
    dilated = bg.filter(ImageFilter.MaxFilter(BAND * 2 + 1))

    # 2) alpha + 去白边
    alpha, _ = build_alpha(im, dilated, bg)
    rgb = unpremultiply(im, alpha)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)

    # 3) 裁掉多余留白
    bbox = alpha.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - PAD); y0 = max(0, y0 - PAD)
        x1 = min(w, x1 + PAD); y1 = min(h, y1 + PAD)
        out = out.crop((x0, y0, x1, y1))

    # 4) 可选缩放
    if maxh and out.height > maxh:
        nh = maxh
        nw = max(1, round(out.width * nh / out.height))
        out = out.resize((nw, nh), Image.LANCZOS)

    dst = os.path.splitext(path)[0] + ".png"
    out.save(dst, "PNG", optimize=True)
    px = out.getchannel("A").getdata()
    clear = sum(1 for v in px if v == 0)
    print("%s -> %s  %dx%d  透明占比 %.1f%%  %.0f KB" %
          (os.path.basename(path), os.path.basename(dst), out.width, out.height,
           100.0 * clear / (out.width * out.height), os.path.getsize(dst) / 1024.0))
    return dst


def main():
    args = sys.argv[1:]
    maxh = MAXH
    if args and args[0] == "--maxh":
        maxh = int(args[1]); args = args[2:]
    files = args or [os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), p) for p in DEFAULT]
    for f in files:
        remove_bg(f, maxh)


if __name__ == "__main__":
    main()
