# -*- coding: utf-8 -*-
"""整理 game/assets/images/uploads：同一张图片只保留一份，并把引用统一改到保留文件。

默认 dry-run（只报告）。加 --apply 才真正执行。
重复文件不会直接删除，而是移动到 backups/uploads-dup-<日期>/ 以便回滚。
"""
import hashlib
import json
import os
import re
import shutil
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = os.path.join(ROOT, "game", "assets", "images", "uploads")
ASSETS_JS = os.path.join(ROOT, "game", "data", "uploaded-assets.js")
EDITS_JS = os.path.join(ROOT, "game", "data", "story", "script-edits.js")
BACKUP = os.path.join(ROOT, "backups", "uploads-dup-20260916")
ID_RE = re.compile(r"(?:bg|portrait)-upload-\d{8}-[0-9a-f]{6}")


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def stem(name):
    return os.path.splitext(name)[0]


def main():
    apply = "--apply" in sys.argv
    names = sorted(n for n in os.listdir(UP) if os.path.isfile(os.path.join(UP, n)))

    by_hash = defaultdict(list)
    for n in names:
        by_hash[sha256(os.path.join(UP, n))].append(n)

    # script-edits.js 中的引用顺序（用于挑选“最早被剧本用到”的那一份）
    edits = open(EDITS_JS, encoding="utf-8").read()
    order = {}
    for i, m in enumerate(ID_RE.finditer(edits)):
        order.setdefault(m.group(0), i)

    # 决定每组的保留者
    mapping = {}          # 旧 id -> 保留 id
    keep_names = []
    move_names = []
    for h, group in by_hash.items():
        group = sorted(group)
        used = [n for n in group if stem(n) in order]
        if used:
            keep = min(used, key=lambda n: (order[stem(n)], n))
        else:
            keep = group[0]
        keep_names.append(keep)
        for n in group:
            if n != keep:
                move_names.append(n)
                mapping[stem(n)] = stem(keep)

    keep_names.sort()
    print("文件总数 %d -> 保留 %d，移除重复 %d" %
          (len(names), len(keep_names), len(move_names)))

    # 保留者之间的重名/孤儿统计
    orphan = [n for n in keep_names if stem(n) not in order]
    print("保留文件中未被剧本引用的(孤儿): %d" % len(orphan))

    if not apply:
        sample = sorted(mapping.items())[:10]
        print("映射示例(旧 -> 保留):")
        for k, v in sample:
            print("   %s -> %s" % (k, v))
        print("\n(dry-run 未改动任何文件；加 --apply 执行)")
        return

    os.makedirs(BACKUP, exist_ok=True)
    moved = 0
    for n in move_names:
        src = os.path.join(UP, n)
        dst = os.path.join(BACKUP, n)
        shutil.move(src, dst)
        moved += 1
    print("已移动 %d 个重复文件到 %s" % (moved, os.path.relpath(BACKUP, ROOT)))

    # 1) 改写 script-edits.js 的引用（一次性替换，避免链式污染）
    def repl(m):
        old = m.group(0)
        return mapping.get(old, old)

    new_edits, cnt = ID_RE.subn(repl, edits)
    with open(EDITS_JS, "w", encoding="utf-8", newline="") as f:
        f.write(new_edits)
    print("script-edits.js：替换了 %d 处引用" %
          sum(1 for k in mapping if k in edits))

    # 2) 重写 uploaded-assets.js
    lines = [
        "// 剧本编辑器里从本地选择的图片（自动生成；删除某行即可取消该素材）",
        "// 图片存放在 assets/images/uploads/，登记后就能在“背景图片 / 人物立绘”中使用。",
        "// 2026-09-16 已去重：同一张图片只保留一份，重复的引用已统一指向保留文件。",
        "(function (root) {",
        "  const list = {",
    ]
    for i, n in enumerate(keep_names):
        rel = "assets/images/uploads/" + n
        comma = "," if i < len(keep_names) - 1 else ""
        lines.append('  "%s": "%s"%s' % (stem(n), rel, comma))
    tail = open(ASSETS_JS, encoding="utf-8").read()
    tstart = tail.find("  };")
    if tstart == -1:
        tstart = tail.find("  }")
    if tstart != -1:
        lines.append(tail[tstart:].rstrip() + "\n")
    else:
        lines += ["  };", "  root.__uploadedAssets = list;", "})(window);", ""]
    with open(ASSETS_JS, "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(lines) + "\n")
    print("uploaded-assets.js：登记项 %d -> %d" % (len(names), len(keep_names)))

    # 3) 保存映射表备查
    mp = os.path.join(ROOT, "tools", "_uploads_dedupe_map.json")
    json.dump({"keep": keep_names, "moved": move_names, "mapping": mapping},
              open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("映射表：%s" % os.path.relpath(mp, ROOT))


if __name__ == "__main__":
    main()
