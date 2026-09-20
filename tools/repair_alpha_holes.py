#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
修复「白底去背时误把人物内部白色区域（如白色头发）抠透明」的立绘 PNG。

背景：
  tools/remove_white_bg.py 用四角洪水填充清除白底，但如果人物轮廓有细小缺口
  （白头发高光与白底同色、发丝轮廓断裂），填充会漏进人物内部，把头发等内部
  白色区域也清成 alpha=0。颜色数据仍保留在 RGB 里，只是 alpha 被清零。

原理：
  1. 取 alpha==0 的透明掩码 T。
  2. 对 T 做腐蚀（MinFilter），切断细小的泄漏通道；从画面边缘洪水填充得到
     「真正的背景」（与边缘连通的大区域）。
  3. 把背景膨胀回去并与 T 求交 -> Bg。
  4. T - Bg = 被误抠的人物内部透明区 -> alpha 恢复 255（RGB 原样保留）。
  5. 顺带把被内部透明区包围的残留半透明像素也补成不透明。

用法：
    python tools/repair_alpha_holes.py [图片路径 ...]   # 缺省处理十屋两张
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter

ERODE = 9        # 腐蚀核（奇数）。越大越能切断更宽的泄漏通道
RESTORE_MIN = 200  # 只有 min(R,G,B) >= 此值的内部透明像素才恢复（防误伤）

DEFAULT = [
    r"game/assets/images/ui/十屋-开心.png",
    r"game/assets/images/ui/十屋-道歉.png",
]

PAD = 16


def repair(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size

    # 1) 透明掩码（外扩 PAD 圈，保证边缘洪水填充能启动）
    a = im.getchannel("A")
    T = Image.new("L", (w + PAD * 2, h + PAD * 2), 255)
    T.paste(a.point(lambda v: 255 if v == 0 else 0, mode="L"), (PAD, PAD))

    # 2) 腐蚀切断细泄漏通道，再从边缘洪水填充找真背景
    E = T.filter(ImageFilter.MinFilter(ERODE))
    ImageDraw.floodfill(E, (0, 0), 128, thresh=0)
    bgcore = E.point(lambda v: 255 if v == 128 else 0, mode="L")

    # 3) 膨胀回原范围并与 T 求交
    Bg = bgcore.filter(ImageFilter.MaxFilter(ERODE))
    Tc = T.crop((PAD, PAD, PAD + w, PAD + h))
    Bg = Bg.crop((PAD, PAD, PAD + w, PAD + h))
    Bg = ImageChops_min(Bg, Tc)

    # 4) 恢复内部透明区
    px = im.load()
    bgpx = Bg.load()
    restored = 0
    for y in range(h):
        for x in range(w):
            if bgpx[x, y]:
                continue
            r, g, b, al = px[x, y]
            if al == 0 and min(r, g, b) >= RESTORE_MIN:
                px[x, y] = (r, g, b, 255)
                restored += 1

    # 5) 清理被内部不透明区包围的残留半透明像素
    semi = 0
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, al = px[x, y]
            if 0 < al < 255 and min(r, g, b) >= RESTORE_MIN:
                if (px[x - 1, y][3] == 255 and px[x + 1, y][3] == 255
                        and px[x, y - 1][3] == 255 and px[x, y + 1][3] == 255):
                    px[x, y] = (r, g, b, 255)
                    semi += 1

    im.save(path, "PNG", optimize=True)
    print("%s: 恢复内部透明像素 %d, 补齐半透明 %d  (%dx%d)" %
          (os.path.basename(path), restored, semi, w, h))


def ImageChops_min(a, b):
    """逐像素取较小值（两个 L 掩码求交）。"""
    from PIL import ImageChops
    return ImageChops.darker(a, b)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = sys.argv[1:] or [os.path.join(root, p) for p in DEFAULT]
    for f in files:
        repair(f)


if __name__ == "__main__":
    main()
