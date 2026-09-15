# -*- coding: utf-8 -*-
"""校验整个站点：UTF-8 编码、链接可解析、无外链、赏析页六要素齐全。"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SECTIONS = ['题目', '诗人', '内容', '译文及注释', '创作背景', '赏析']

bad_enc = []
dead_links = []
ext_links = []
missing_sec = []
bad_main = []

def walk_html_css():
    for dp, _, fns in os.walk(ROOT):
        for fn in fns:
            if fn.lower().endswith(('.htm', '.html', '.css')):
                yield os.path.join(dp, fn)

for path in walk_html_css():
    rel = os.path.relpath(path, ROOT)
    raw = open(path, 'rb').read()
    # 1) 编码
    try:
        txt = raw.decode('utf-8')
    except UnicodeDecodeError:
        try:
            txt = raw.decode('gb18030')
            bad_enc.append((rel, 'GBK'))
        except Exception:
            bad_enc.append((rel, 'NEITHER'))
        continue
    d = os.path.dirname(path)
    # 2) 外链（允许 mailto:）
    for m in re.finditer(r'(?:href|src)="([^"]+)"', txt):
        u = m.group(1)
        if u.startswith('mailto:'):
            continue
        if u.startswith('http://') or u.startswith('https://'):
            ext_links.append((rel, u))
            continue
        if u.startswith('#'):
            continue
        target = os.path.normpath(os.path.join(d, u))
        if not os.path.exists(target):
            dead_links.append((rel, u))
    # 3) 赏析页六要素
    if re.search(r'class="wrap analysis"', txt):
        for s in SECTIONS:
            if s not in txt:
                missing_sec.append((rel, s))
    # 4) 主页面：应去掉 shangxi，且 poem 被 poem-link 包裹
    if os.path.basename(path) in (
        'libai.htm','dufu.htm','baijuyi.htm','lishangyin.htm',
        'liqingzhao.htm','xinqiji.htm','sushi.htm','liuyong.htm'):
        if 'class="shangxi"' in txt:
            bad_main.append((rel, '仍含 .shangxi 块'))
        if 'class="poem-link"' not in txt:
            bad_main.append((rel, '缺少 .poem-link 包裹'))

print("== 编码问题 ==", bad_enc if bad_enc else "无")
print("== 外链(CDN等) ==", ext_links if ext_links else "无")
print("== 死链 ==", dead_links if dead_links else "无")
print("== 赏析页缺失要素 ==", missing_sec if missing_sec else "无")
print("== 主页面结构问题 ==", bad_main if bad_main else "无")

ok = not (bad_enc or ext_links or dead_links or missing_sec or bad_main)
print("\n总判定：", "全部通过 ✅" if ok else "存在问题 ❌")
