# -*- coding: utf-8 -*-
"""校验去重结果：目录唯一、登记表齐全、剧本引用不落空。"""
import hashlib
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = os.path.join(ROOT, "game", "assets", "images", "uploads")
ASSETS_JS = os.path.join(ROOT, "game", "data", "uploaded-assets.js")
EDITS_JS = os.path.join(ROOT, "game", "data", "story", "script-edits.js")
ID_RE = re.compile(r"(?:bg|portrait)-upload-\d{8}-[0-9a-f]{6}")
PATH_RE = re.compile(r'"([^"]*uploads/[^"]+)"')

ok = True

# 1) 目录内是否还有重复
files = sorted(os.listdir(UP))
hashes = {}
dup = 0
for n in files:
    h = hashlib.sha256(open(os.path.join(UP, n), "rb").read()).hexdigest()
    if h in hashes:
        dup += 1
        print("  ! 仍重复:", n, "==", hashes[h])
        ok = False
    hashes.setdefault(h, n)
print("目录文件数: %d，重复: %d" % (len(files), dup))

# 2) 登记表
a = open(ASSETS_JS, encoding="utf-8").read()
reg = dict(re.findall(r'"([^"]+)":\s*"([^"]+)"', a))
missing_file = [k for k, v in reg.items()
                if not os.path.isfile(os.path.join(ROOT, "game", v))]
print("登记项: %d，指向缺失文件的: %d" % (len(reg), len(missing_file)))
if missing_file:
    ok = False
    print("  !", missing_file[:5])

# 3) 剧本引用
e = open(EDITS_JS, encoding="utf-8").read()
ids = set(ID_RE.findall(e))
bad = [i for i in ids if i not in reg]
bad2 = [i for i in ids if i in reg
        and not os.path.isfile(os.path.join(ROOT, 'game', reg[i]))]
print("剧本引用 id: %d，未登记: %d，文件缺失: %d" % (len(ids), len(bad), len(bad2)))
if bad or bad2:
    ok = False
    print("  !", bad[:5], bad2[:5])

# 4) 未被引用的保留文件
unused = sorted(set(reg) - ids)
print("保留但未被剧本引用: %d %s" % (len(unused), unused))

# 5) 备份目录里的重复文件是否都还在
bk = os.path.join(ROOT, "backups", "uploads-dup-20260916")
print("备份的重复文件数: %d" %
      (len(os.listdir(bk)) if os.path.isdir(bk) else 0))

print("\n结果:", "全部通过" if ok else "存在问题")
