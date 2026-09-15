# 把「登录页面.png」画布向右加宽：
#   - 原图贴左边（人物自然落到新画面左侧约 1/3 处）
#   - 右侧扩展区用「原图右段来回镜像」填充（镜像接缝天然连续，像素风无违和感）
from PIL import Image

SRC = r"D:\personal\大二\小学期\登录注册\登录页面.png"
DST = r"D:\personal\大二\小学期\登录注册\登录页面-人物居左.png"

img = Image.open(SRC).convert("RGB")
W, H = img.size                       # 2559 x 1459
E = 1200                              # 右侧要扩展的宽度（像素）

# 镜像素材：取原图 x=1850 到右边缘这一段（人物光晕右缘约 1742，留 100px 余量避开光晕）
seg = img.crop((1850, 0, W, H))       # 宽约 709px
seg_flip = seg.transpose(Image.FLIP_LEFT_RIGHT)   # 水平镜像

# 扩展区：镜像段 + 原段 交替平铺，直到铺满 E 宽
# （相邻两段在接缝处内容相同 → 接缝天然连续，看不出拼接）
ext = Image.new("RGB", (E, H))
x, use_flip = 0, True
while x < E:
    piece = seg_flip if use_flip else seg
    ext.paste(piece, (x, 0))
    x += piece.size[0]
    use_flip = not use_flip

# 拼新画布：[原图][扩展区]
new = Image.new("RGB", (W + E, H))
new.paste(img, (0, 0))
new.paste(ext, (W, 0))
new.save(DST)

print(f"完成: {new.size[0]} x {new.size[1]}")
print(f"人物中心在新图 {(1292)/new.size[0]*100:.1f}% 处，右侧干净背景占 {(new.size[0]-1742)/new.size[0]*100:.1f}%")
