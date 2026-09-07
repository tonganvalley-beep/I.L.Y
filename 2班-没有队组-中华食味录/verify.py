from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import re

ROOT = Path(__file__).resolve().parent
HTML_FILES = sorted(ROOT.rglob("*.html"))
errors = []

class Checker(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.file = file
        self.ids = set()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if "id" in data:
            self.ids.add(data["id"])
        for key in ("href", "src"):
            if key in data:
                self.refs.append((tag, key, data[key]))
        if tag == "img" and not data.get("alt"):
            errors.append(f"{self.file.relative_to(ROOT)}: 图片缺少 alt")

parsed = {}
for file in HTML_FILES:
    try:
        text = file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        errors.append(f"{file.relative_to(ROOT)}: 不是 UTF-8")
        continue
    parser = Checker(file)
    parser.feed(text)
    parsed[file.resolve()] = parser

for file, parser in parsed.items():
    for tag, key, ref in parser.refs:
        if not ref or ref.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if re.match(r"^(https?:)?//", ref):
            errors.append(f"{file.relative_to(ROOT)}: 存在外链 {ref}")
            continue
        path_part, _, anchor = ref.partition("#")
        target = file if not path_part else (file.parent / unquote(path_part)).resolve()
        if path_part and not target.exists():
            errors.append(f"{file.relative_to(ROOT)}: 路径不存在 {ref}")
            continue
        if anchor and target.suffix.lower() in (".html", ".htm"):
            target_parser = parsed.get(target)
            if target_parser and unquote(anchor) not in target_parser.ids:
                errors.append(f"{file.relative_to(ROOT)}: 锚点不存在 {ref}")

css = ROOT / "css" / "style.css"
if css.exists():
    text = css.read_text(encoding="utf-8")
    for ref in re.findall(r"url\([\"']?([^\"')]+)", text):
        if re.match(r"^(https?:)?//", ref):
            errors.append(f"css/style.css: 存在外链 {ref}")
        elif not (css.parent / ref).resolve().exists():
            errors.append(f"css/style.css: 资源不存在 {ref}")

expected = {"index.html", "sichuan.html", "shandong.html", "cantonese.html", "hunan.html", "about.html"}
expected.update("dishes/" + name for name in [
    "dongpo-pork.html", "kung-pao-chicken.html", "maoxuewang.html",
    "sweet-sour-carp.html", "braised-sea-cucumber.html", "nine-turn-intestine.html",
    "char-siu.html", "white-cut-chicken.html", "har-gow.html",
    "chopped-chili-fish-head.html", "stir-fried-beef.html", "steamed-cured-meats.html"
])
actual = {p.relative_to(ROOT).as_posix() for p in HTML_FILES}
for missing in sorted(expected - actual):
    errors.append(f"缺少规定页面: {missing}")

print(f"HTML 页面：{len(HTML_FILES)}")
print(f"本地图片：{len(list((ROOT / 'images').iterdir()))}")
if errors:
    print(f"发现 {len(errors)} 个问题：")
    for error in errors:
        print("-", error)
    raise SystemExit(1)
print("检查通过：页面、链接、图片、脚本、样式和页内锚点均为有效本地路径。")
