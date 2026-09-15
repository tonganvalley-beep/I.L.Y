# -*- coding: utf-8 -*-
# 生成隧道场景像素风贴图：贩卖机 / 海岸海报 / 墙缝 / 可平铺墙裙
from PIL import Image
import random, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'game', 'assets', 'images', 'ui')
os.makedirs(OUT, exist_ok=True)
random.seed(42)

def img(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)

def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px(im, x, y, c)

# ============ 1. 隧道墙裙 tile（48×48，可横向平铺） ============
# 深蓝灰混凝土砖墙：顶部一条受光边，砖块错缝，水渍斑驳
t = img(48, 48)
BASE   = (38, 46, 66, 255)
BASE_D = (30, 37, 54, 255)
MORTAR = (18, 23, 36, 255)
EDGE_T = (78, 92, 122, 255)   # 墙裙上沿受光
STAIN  = (24, 30, 46, 255)
rect(t, 0, 0, 48, 48, BASE)
# 顶部 2px 亮边 + 1px 暗线（墙裙上沿）
rect(t, 0, 0, 48, 2, EDGE_T)
rect(t, 0, 2, 48, 3, MORTAR)
# 砖缝：每 12px 一条横缝，竖缝 16px 错开
for row in range(3):
    y = 15 + row * 12
    rect(t, 0, y, 48, y + 1, MORTAR)
for row in range(4):
    y0 = 3 + row * 12
    off = 0 if row % 2 == 0 else 8
    for x in range(off, 48, 16):
        rect(t, x, y0, x + 1, min(y0 + 12, 48), MORTAR)
# 砖面明暗抖动 + 水渍
for _ in range(140):
    x, y = random.randrange(48), random.randrange(3, 48)
    if t.getpixel((x, y)) == BASE:
        px(t, x, y, BASE_D if random.random() < 0.5 else (44, 53, 75, 255))
for _ in range(5):
    sx = random.randrange(4, 44)
    for k in range(random.randrange(8, 20)):
        px(t, sx + random.randrange(-1, 2), 3 + k * 2, STAIN)
# 底部贴地暗线
rect(t, 0, 46, 48, 48, MORTAR)
t.save(os.path.join(OUT, 'tunnel-wall-tile.png'))

# ============ 2. 故障自动贩卖机（48×72） ============
v = img(48, 72)
BODY   = (52, 62, 84, 255)
BODY_D = (36, 43, 60, 255)
TRIM   = (92, 106, 134, 255)
SCREEN = (112, 214, 235, 255)  # 广告屏青光
SCR_D  = (60, 150, 180, 255)
RED    = (214, 68, 68, 255)    # 售罄标
DARK   = (14, 18, 28, 255)
# 机身
rect(v, 4, 2, 44, 70, BODY)
rect(v, 4, 2, 44, 4, TRIM)          # 顶边
rect(v, 4, 2, 6, 70, TRIM)          # 左受光边
rect(v, 42, 2, 44, 70, BODY_D)      # 右暗边
rect(v, 4, 66, 44, 70, BODY_D)      # 底座
rect(v, 2, 70, 46, 72, DARK)        # 脚
# 广告屏（上部）：青光底 + 滚动条纹 + 红色汽水罐剪影
rect(v, 8, 6, 30, 26, SCREEN)
for y in (10, 15, 20):              # 滚动广告条纹
    rect(v, 9, y, 29, y + 2, SCR_D)
rect(v, 20, 12, 26, 22, RED)        # 汽水罐
rect(v, 21, 10, 25, 12, RED)
rect(v, 21, 13, 24, 21, (240, 130, 120, 255))  # 罐身高光
rect(v, 8, 6, 30, 8, (190, 240, 250, 255))     # 屏顶反光
# 屏周泛光
for x in range(7, 31):
    px(v, x, 5, (60, 120, 140, 160))
# 商品展示窗（中部，2 排×3 格，全部售罄）
rect(v, 8, 30, 34, 52, DARK)
for r in range(2):
    for c in range(3):
        gx, gy = 10 + c * 8, 32 + r * 11
        rect(v, gx, gy, gx + 6, gy + 8, (40, 48, 68, 255))   # 空货格
        rect(v, gx + 1, gy + 1, gx + 5, gy + 4, (58, 68, 92, 255))
        rect(v, gx, gy + 6, gx + 6, gy + 8, RED)             # 售罄条
        px(v, gx + 1, gy + 7, (255, 220, 220, 255))
# 右侧：投币面板 + 取货口
rect(v, 35, 30, 42, 44, BODY_D)
rect(v, 37, 33, 40, 36, DARK)      # 投币口
px(v, 38, 39, RED)                 # 故障红灯
rect(v, 35, 47, 42, 48, TRIM)
rect(v, 10, 56, 38, 63, DARK)      # 取货口
rect(v, 12, 57, 36, 62, (24, 30, 44, 255))
v.save(os.path.join(OUT, 'ui-vending.png'))

# ============ 3. 褪色海岸海报（48×64） ============
p = img(48, 64)
FRAME  = (216, 208, 188, 255)  # 褪色米白边框
SKY1   = (96, 178, 232, 255)   # 蓝天
SKY2   = (140, 206, 244, 255)
SEA    = (52, 152, 208, 255)   # 海
SEA_D  = (36, 120, 178, 255)
SAND   = (240, 232, 208, 255)  # 白沙
CLOUD  = (250, 250, 248, 255)
FADE   = (120, 122, 118, 90)   # 褪色灰斑
# 海报主体 + 边框
rect(p, 2, 2, 46, 60, FRAME)
rect(p, 4, 4, 44, 58, SKY1)
# 天空上下渐变
rect(p, 4, 4, 44, 24, SKY1)
rect(p, 4, 24, 44, 34, SKY2)
# 云
for (cx, cy, w) in [(9, 10, 10), (26, 16, 12), (14, 21, 7)]:
    rect(p, cx, cy, cx + w, cy + 3, CLOUD)
    rect(p, cx + 2, cy - 2, cx + w - 2, cy, CLOUD)
# 海平线 + 海
rect(p, 4, 34, 44, 36, (220, 240, 250, 255))
rect(p, 4, 36, 44, 46, SEA)
for y in range(38, 46, 3):
    rect(p, 6, y, 20 + (y % 5), y + 1, SEA_D)
rect(p, 24, 40, 36, 41, (160, 220, 240, 255))  # 海面反光
# 沙滩
rect(p, 4, 46, 44, 58, SAND)
rect(p, 4, 46, 44, 48, (208, 222, 226, 255))   # 浪边
for _ in range(20):
    px(p, random.randrange(5, 44), random.randrange(48, 58), (214, 202, 176, 255))
# 褪色：随机灰斑 + 整体做旧点
for _ in range(90):
    px(p, random.randrange(4, 44), random.randrange(4, 58), FADE)
# 中间折痕
for x in range(4, 44):
    px(p, x, 31, (190, 186, 170, 140))
# 右下角翘起（暗三角 + 投影）
for i in range(12):
    rect(p, 46 - i, 60 - i, 46, 60, (16, 20, 32, 255))
for i in range(10):
    rect(p, 44 - i, 58 - i, 44, 58, (150, 142, 122, 255))
# 四角图钉
for (tx, ty) in [(3, 3), (43, 3), (3, 57)]:
    px(p, tx, ty, (60, 66, 80, 255))
    px(p, tx, ty - 1 if ty > 3 else ty, (160, 166, 180, 255))
p.save(os.path.join(OUT, 'ui-coast-poster.png'))

# ============ 4. 隧道墙缝（32×64，透明底） ============
c = img(32, 64)
CRACK  = (10, 13, 22, 255)
EDGE   = (70, 84, 112, 255)
WIND   = (140, 210, 235, 150)
# 锯齿主裂缝（自上而下）
x = 16
for y in range(4, 60):
    w = 2 if 20 < y < 42 else 1
    rect(c, x, y, x + w, y + 1, CRACK)
    px(c, x + w, y, EDGE)                    # 裂缝受光边
    x += random.choice([-2, -1, 0, 1, 2])
    x = max(8, min(22, x))
# 中部主裂口（海风穿出处，稍宽）
rect(c, 13, 28, 21, 38, CRACK)
rect(c, 21, 28, 22, 38, EDGE)
px(c, 14, 29, (26, 34, 52, 255))
px(c, 17, 33, (30, 60, 80, 255))             # 裂口里一点海的青光
px(c, 16, 35, (36, 74, 96, 255))
# 风线（从裂口向右飘出的细线）
for (wy, ln) in [(24, 8), (31, 10), (44, 7)]:
    for i in range(ln):
        px(c, 22 + i, wy + (1 if i % 3 == 2 else 0), WIND)
# 周围墙皮剥落
for (bx, by, s) in [(6, 12, 3), (24, 50, 4), (10, 44, 2), (22, 8, 2)]:
    rect(c, bx, by, bx + s, by + s, (26, 32, 48, 255))
c.save(os.path.join(OUT, 'ui-wall-crack.png'))

print('done:', os.listdir(OUT))
