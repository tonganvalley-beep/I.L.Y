# 从 airi-sailor-rpg-sheet.png（4 列 × 2 行，64×64/格）裁出第一行第 2 格的背影待机帧，
# 按地图 NPC 素材规格输出 48×48：人物铺满整格高度、水平居中、脚底贴底。最近邻缩放。
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'game/assets/images/maps/airi-sailor-rpg-sheet.png'
DST = ROOT / 'game/assets/images/characters/npc-airi-back.png'
CELL = 64
OUT = 48

sheet = Image.open(SRC).convert('RGBA')
cell = sheet.crop((CELL * 1, 0, CELL * 2, CELL))  # 第一行第 2 格 = 背面待机

# 裁掉透明边，得到人物包围盒
bbox = cell.getbbox()
sprite = cell.crop(bbox)

# 铺满 48 行高度，最近邻放大，水平居中入 48×48 画布（脚底贴底）
scale = OUT / sprite.height
new_w = max(1, round(sprite.width * scale))
sprite = sprite.resize((new_w, OUT), Image.NEAREST)

canvas = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0))
canvas.paste(sprite, ((OUT - new_w) // 2, 0), sprite)
DST.parent.mkdir(parents=True, exist_ok=True)
canvas.save(DST)
print(f'OK {DST} size={canvas.size} content={new_w}x{OUT}')
