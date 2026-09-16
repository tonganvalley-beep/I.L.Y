"""Restore the supplied comic's phone inserts using its pixels and exact dates.

Usage: python tools/prepare-ch3-battery.py path/to/reference.jpg
No generated artwork or external service is used.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(sys.argv[1]).convert('RGB')
out = ROOT / 'game/assets/images/cg'
out.mkdir(parents=True, exist_ok=True)
W, H = 350, 480
# Undo the angle of each screen before rebuilding the cropped screen edges.
def screen(origin):
    return source.transform((W, H), Image.Transform.AFFINE,
                            (.985, -.174, origin, .174, .985, 35),
                            Image.Resampling.BICUBIC)

low, mid, full = screen(45), screen(376), screen(666)
# Tile a clean patch of the original blue LCD, with a subdued vertical falloff.
patch = np.array(mid.crop((125, 62, 185, 112)), dtype=float)
texture = np.tile(patch, (10, 6, 1))[:H, :W]
texture *= np.linspace(1.0, .84, H)[:, None, None]
base = Image.fromarray(np.uint8(np.clip(texture, 0, 255)))
# Preserve the dark wallpaper strokes from the original (white text excluded).
arr = np.array(mid)
y, x = np.mgrid[:H, :W]
sx, sy = 376 + .985*x - .174*y, 35 + .174*x + .985*y
valid = (sx > 333) & (sx < 636) & (sy < 454) & (y > 205)
dark = (arr[:, :, 0] < 95) & (arr[:, :, 1] < 120) & (arr[:, :, 2] < 155)
mask = Image.fromarray(np.uint8(valid & dark)*180).filter(ImageFilter.GaussianBlur(.6))
base.paste(mid, (0, 0), mask)
# Reuse source lettering for the complete year and dates. This preserves the LCD
# raster edges; only the missing time is typeset to complete the bottom crop.
def letters(img, rect):
    crop = img.crop(rect).convert('RGBA')
    a = np.array(crop)
    a[:, :, 3] = np.uint8(np.clip((a[:, :, :3].min(axis=2).astype(float)-150)*2.45, 0, 255))
    return Image.fromarray(a)

year = letters(low, (20, 126, 246, 202))
date_low = letters(low, (19, 205, 252, 282))
date_mid = letters(mid, (19, 205, 252, 282))
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 76)
preview = Image.new('RGB', (1440, 760), 'black')
for index, (level, original, date, time) in enumerate([
    ('full', full, '08/03', '22:53'),
    ('medium', mid, '08/14', '20:38'),
    ('low', low, '08/31', '16:24'),
]):
    lcd = base.copy().convert('RGBA')
    # The status strip (battery and signal) is actual artwork from each panel.
    lcd.paste(original.crop((0, 0, 121, 60)), (0, 0))
    lcd.alpha_composite(year, (30, 135))
    if level == 'full':
        # Assemble 08/03 from the source's 08/31 and 2020 glyphs.
        lcd.alpha_composite(date_low.crop((0, 0, 138, 77)), (29, 214))
        lcd.alpha_composite(date_low.crop((20, 0, 73, 77)), (167, 214))
        lcd.alpha_composite(date_low.crop((147, 0, 196, 77)), (218, 214))
    else:
        lcd.alpha_composite(date_mid if level == 'medium' else date_low, (29, 214))
    draw = ImageDraw.Draw(lcd)
    draw.text((W/2, 365), time, font=font, fill=(249, 253, 255), anchor='mm', stroke_width=0)
    # Complete the casing all around the formerly cropped screen, then restore
    # the original slight clockwise tilt. Transparent exterior sits on black.
    phone = Image.new('RGBA', (402, 546))
    d = ImageDraw.Draw(phone)
    d.rounded_rectangle((0, 0, 401, 545), radius=23, fill='#090f22', outline='#29344c', width=3)
    d.rounded_rectangle((15, 18, 386, 517), radius=9, fill='#020610', outline='#34425e', width=2)
    phone.alpha_composite(lcd, (26, 28))
    d.rounded_rectangle((163, 526, 239, 530), radius=2, fill='#202b43')
    phone = phone.rotate(-10, Image.Resampling.BICUBIC, expand=True)
    phone.save(out / f'ch3-battery-{level}.png')
    preview.paste(phone, (index*480+(480-phone.width)//2, (760-phone.height)//2), phone)
preview.save(ROOT / 'outputs/ch3-battery-assets.png')
print('Restored full / medium / low phone screens.')
