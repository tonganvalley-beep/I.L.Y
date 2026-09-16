# -*- coding: utf-8 -*-
"""用 tools/script-review-assets.mjs 的官方模板重写 uploaded-assets.js，
登记项 = uploads 目录当前实际存在的文件。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = os.path.join(ROOT, "game", "assets", "images", "uploads")
OUT = os.path.join(ROOT, "game", "data", "uploaded-assets.js")

names = sorted(n for n in os.listdir(UP) if os.path.isfile(os.path.join(UP, n)))
lst = {os.path.splitext(n)[0]: "assets/images/uploads/" + n for n in names}

header = ("// 剧本编辑器里从本地选择的图片（自动生成；删除某行即可取消该素材）\n"
          "// 图片存放在 assets/images/uploads/，登记后就能在“背景图片 / 人物立绘”中使用。\n\n")
body = (header
        + "(function (root) {\n"
        + "  const list = " + json.dumps(lst, ensure_ascii=False, indent=2) + ";\n"
        + "  root.ILY_UPLOADED_ASSETS = Object.assign(root.ILY_UPLOADED_ASSETS || {}, list);\n"
        + "  const ILY = root.ILY || (root.ILY = {});\n"
        + "  const data = ILY.data || (ILY.data = {});\n"
        + "  const assets = data.assets || (data.assets = {});\n"
        + "  assets.images = Object.assign(assets.images || {}, list);\n"
        + "})(typeof window !== 'undefined' ? window : globalThis);\n")
with open(OUT, "w", encoding="utf-8", newline="") as f:
    f.write(body)
print("已重写 %s，登记 %d 项" % (os.path.relpath(OUT, ROOT), len(lst)))
