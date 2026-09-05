# -*- coding: utf-8 -*-
"""
_clean_text.py —— 抹掉 intro-flip3.mp4 里内屏菜单上的乱码文字

原理（小白版）：
  1. 逐帧读视频，只处理第 53~90 帧（内屏乱码出现的时间段，
     前面的绿色 5:20 电子钟保留不动）；
  2. 在画面上半部找"又大又白又方"的区域 = 手机内屏白色内容区；
  3. 在这个区域里，文字 = 和周围背景颜色差异大的小斑块，
     用 cv2.inpaint（按周围颜色智能填补）把它们抹掉，
     大结构（深色标题栏、白色软键、行分隔线）会保留下来；
  4. 处理完的帧通过管道直接交给 ffmpeg 编码，
     同时把原视频的音轨原样拷过来（cv2 不会处理声音）。
"""
import cv2
import numpy as np
import subprocess
import imageio_ffmpeg

SRC = r'D:/personal/大二/小学期/登录注册/login/intro-flip3.mp4'   # 原视频
OUT = r'D:/personal/大二/小学期/登录注册/login/_frames/cleaned.mp4'  # 输出（先放临时目录）

FRAME_START = 53    # 从这一帧开始处理（之前是翻盖过程 + 5:20，保留）
FRAME_END   = 90    # 处理到这一帧为止（之后画面已渐变干净）

cap = cv2.VideoCapture(SRC)
fps    = cap.get(cv2.CAP_PROP_FPS)
W      = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
H      = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
N      = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f'fps={fps} size={W}x{H} frames={N}')

# 启动 ffmpeg：左边输入是我们管道喂进去的原始帧，右边输入是原视频（只取它的声音）
ff = imageio_ffmpeg.get_ffmpeg_exe()
cmd = [ff, '-y',
       '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', 'pipe:',
       '-i', SRC,
       '-map', '0:v', '-map', '1:a?',          # 视频用我们的，音频用原视频的（没有音频也不报错）
       '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p',
       '-c:a', 'copy', '-movflags', '+faststart', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

last_box = None     # 上一帧成功检测到的屏幕框（检测失败时沿用，防止闪烁）

def find_screen(gray, idx):
    """在画面上半部找内屏内容区：先找所有"屏幕碎片"（白色行/状态栏/软键
       会被深色标题栏和行缝切成好几块），再把和最大块水平重叠的碎片
       合并成一个整框。返回 (x0,y0,x1,y1)，找不到返回 None"""
    y_top, y_bot = int(0.03 * H), int(0.62 * H)   # 只在上半部找（避开键盘背光和水印）
    roi = gray[y_top:y_bot, :]
    bright = (roi > 195).astype(np.uint8) * 255
    bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 收集所有"像屏幕一部分"的碎片（单条白行也可能很小，所以尺寸下限放宽）
    parts = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        if not (100 <= w <= 700 and 15 <= h <= 800):    continue
        if area / (w * h) < 0.55:                       continue  # 填充率低的是人脸/字母
        m = np.zeros_like(roi)
        cv2.drawContours(m, [c], -1, 255, -1)
        if cv2.mean(roi, mask=m)[0] < 218:              continue  # 不够白（排除粉色的脸）
        cy = y + h / 2 + y_top
        if cy > 0.58 * H:                               continue
        cx = x + w / 2
        if idx >= 80 and cx < 0.5 * W:                  continue  # 渐变阶段手机已移到右侧
        parts.append((x, y + y_top, x + w, y + h + y_top, area))
    if not parts:
        return None

    # 最大块 = 主参照物（通常是菜单白行区）
    parts.sort(key=lambda p: p[4], reverse=True)
    mx0, my0, mx1, my1, _ = parts[0]
    # 合并所有和主参照物水平方向重叠超过一半的碎片（竖向摞在一起的屏幕块）
    ux0, uy0, ux1, uy1 = mx0, my0, mx1, my1
    for (px0, py0, px1, py1, _a) in parts[1:]:
        overlap = min(mx1, px1) - max(mx0, px0)
        if overlap > 0.5 * min(mx1 - mx0, px1 - px0):
            ux0, uy0 = min(ux0, px0), min(uy0, py0)
            ux1, uy1 = max(ux1, px1), max(uy1, py1)
    # 合并后的整框必须还像一块屏幕（防止把不相关的东西并进来）
    uw, uh = ux1 - ux0, uy1 - uy0
    if not (120 <= uw <= 760 and 200 <= uh <= 900 and 0.8 <= uh / uw <= 3.2):
        return (mx0, my0, mx1, my1)                     # 不像就退回只用最大块
    return (ux0, uy0, ux1, uy1)

def clean_region(frame, box):
    """把屏幕内容区按"行类型"分别处理：
       - 普通亮行（菜单白行、状态栏）→ 用大核中值背景整行替换，
         乱码文字/图标全部抹掉，但保留屏幕本身的明暗渐变和泛光；
       - 深色横带（标题栏，整行几乎都是深色）→ 保留该行，
         只把上面的白色乱码抹成该行的深色（结尾主界面也有这条栏，首尾不跳变）；
       - 结构行（底部软键：白色按键+深色缝隙相间）→ 原样保留。"""
    x0, y0, x1, y1 = box
    # 框向外扩几像素，盖住白边；上下不再额外扩（联合框已含状态栏和软键）
    x0e = max(0, x0 - 3); x1e = min(W, x1 + 3)
    y0e = max(0, y0 - 3); y1e = min(H, y1 + 3)
    region = frame[y0e:y1e, x0:x1].copy()
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)

    # 核 81：比标题栏/白行都高，中值滤波后只剩平滑的屏幕泛光
    k = 81
    if min(region.shape[:2]) <= k:          # 区域太小时收敛核大小（必须为奇数）
        k = max(3, (min(region.shape[:2]) // 2) * 2 - 1)
    bg = cv2.medianBlur(region, k)

    out = bg.copy()
    row_dark_frac = (gray < 120).mean(axis=1)
    for yy in range(region.shape[0]):
        row_src = region[yy]
        row_g = gray[yy]
        frac = row_dark_frac[yy]
        if frac > 0.5:
            # 深色标题栏行：保留，但把白色乱码/图标抹成该行的深色
            dark_px = row_g < 130
            if dark_px.sum() > 10:
                fill = np.median(row_src[dark_px], axis=0).astype(np.uint8)
                row_out = row_src.copy()
                row_out[~dark_px] = fill
                out[yy] = row_out
        elif frac > 0.15:
            # 区分"软键行"和"带文字的亮行"：
            # 软键的深色缝隙是几段又宽又连续的暗块；文字笔画是大量细碎暗点
            d = np.concatenate(([0], (row_g < 120).astype(np.int8), [0]))
            changes = np.diff(d)
            runs = np.where(changes == -1)[0] - np.where(changes == 1)[0]
            longest = runs.max() if runs.size else 0
            if longest > region.shape[1] * 0.08 and yy > region.shape[0] * 0.6:
                out[yy] = row_src        # 底部 + 有宽暗缝 → 软键行，原样保留
            # 否则是带文字的亮行/标题栏边缘行 → 保持 bg（已抹平）
        # 其余亮行：保持 bg（已抹平）

    frame[y0e:y1e, x0:x1] = out
    return frame

idx = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    if FRAME_START <= idx <= FRAME_END:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        box = find_screen(gray, idx)
        if box is None:
            box = last_box            # 检测偶尔失败时沿用上一帧，避免一闪一闪
        elif last_box is not None:
            # 帧间平滑：新框采纳 50%，兼顾防抖和跟踪速度（手机在渐变期会移动）
            box = tuple(round(last_box[i] * 0.5 + box[i] * 0.5) for i in range(4))
        if box is not None:
            last_box = box
            frame = clean_region(frame, box)
    proc.stdin.write(frame.tobytes())
    idx += 1
    if idx % 20 == 0:
        print(f'processed {idx}/{N}')

cap.release()
proc.stdin.close()
proc.wait()
print('done ->', OUT, 'ffmpeg exit =', proc.returncode)
