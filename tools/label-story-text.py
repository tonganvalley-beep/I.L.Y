"""Label existing compiler-consumed prose without guessing dialogue ownership.

One-time migration: trace the current Python builders in memory; preserve
structural lines and the originals in the supplied snapshot directory.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from script_rules import RULES, parse_line, strip_asides

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    'chapter1': 'tools/chapter1/source.txt',
    'chapter2': 'tools/chapters/第二章游戏剧情脚本.txt',
    'chapter3': 'tools/chapters/第三章游戏剧情脚本.txt',
    'final': 'tools/chapters/最终章游戏剧情脚本.txt',
    'heroine': 'tools/chapters/女主视角_Galgame演出脚本.txt',
    'reference': 'tools/chapters/第一章游戏剧情脚本 v1.1（RPG化补充） (1).txt',
}


def trace_builders():
    records = {key: {} for key in FILES}

    def record(key, index, text):
        records[key][index] = text

    for key, builder in [('chapter1', 'tools/chapter1/build.py'),
                         ('reference', 'tools/chapter1/build.py'),
                         ('later', 'tools/chapters/build.py')]:
        file = ROOT / builder
        code = file.read_text(encoding='utf-8')
        if key == 'later':
            code = code.replace('for line in self.lines:', 'for source_index, line in enumerate(self.lines):')
            code = code.replace('parsed = parse_line(line)', "record(self.key, source_index, line); parsed = parse_line(line)")
        else:
            if key == 'reference':
                code = code.replace("(Path(__file__).parent / 'source.txt')", f"(root / {FILES[key]!r})")
            code = code.replace('for line in lines:', 'for source_index, line in enumerate(lines):')
            code = code.replace('parsed = parse_line(line)', f"record({key!r}, source_index, line); parsed = parse_line(line)")
        # Building for observation must not overwrite the current game or assets.
        with patch.object(Path, 'write_text', lambda self, data, **kwargs: len(data)):
            exec(compile(code, str(file), 'exec'), {'__file__': str(file), 'record': record})

    active = False
    cues = {'基生', 'ILY', '春', '八重', '若菜', '蝶', '优那', '十屋君', '十屋后辈', '小泪', '成年爱理', '主管', '？'}
    for index, raw in enumerate((ROOT / FILES['heroine']).read_text(encoding='utf-8').splitlines()):
        line = raw.strip()
        if line == '序章｜青': active = True
        if not active or not line: continue
        if line == '——此处接回最终章——': break
        if re.match(r'^(序章|第[一二三四五六]章|终章前)｜', line): continue
        if re.match(r'^(?:序|\d{2})－\d{2}　', line): continue
        if line.startswith(('※', '【')) or re.fullmatch('——.*——', line) or line in cues: continue
        records['heroine'][index] = line
    return records


def inner_text(line, key):
    tag = re.match(RULES['asciiTagPattern'], line) or re.match(RULES['tagPattern'], line)
    if tag and tag[1] in ('内心', '心声'):
        body = tag[2].strip()
        role = 'ILY' if key == 'final' and tag[1] == '心声' else '基生'
        if re.match(RULES['colonPattern'], body): return strip_asides(body)
        return role + '：' + strip_asides(body)
    inner = re.match(RULES['innerPattern'], line)
    if inner:
        role = inner[1].split('·')[0]
        return strip_asides(role) + '：' + strip_asides(inner[2])
    spoken = re.match(RULES['spokenPattern'], line) or re.match(RULES['colonPattern'], line)
    if spoken and any(word in spoken[1] for word in RULES['innerWords']):
        return strip_asides(spoken[1]) + '：' + strip_asides(spoken[2])
    return None


def label(raw, processed, key):
    prefix = ''
    original = raw.strip()
    if key in ('chapter1', 'reference'):
        control = re.match(r'^【[^】]+】', original)
        if control:
            prefix += control[0]; original = original[len(control[0]):]
        clue = re.search(r'〔疑点 P\d 记录〕', original)
        if clue:
            prefix += clue[0]; original = original.replace(clue[0], '')
    parsed = parse_line(processed)
    # Keep the exact existing chapter-one alternating assignment, even if wrong.
    body = parsed['text'] if parsed else processed
    if key in ('chapter1', 'reference') and '｜' in body and not processed.startswith(('〔', '[')):
        parts = body.split('｜')
        lines = []
        for index, part in enumerate(parts):
            role = ('基生' if index % 2 == 0 else '“爱理”') if len(parts) > 3 else ('“爱理”' if index % 2 == 0 else '基生')
            lines.append(prefix + '[台词]' + role + '：' + strip_asides(part))
        return lines
    inner = inner_text(original, key)
    if inner is not None: return [prefix + '[内心]' + inner]
    if parsed and parsed['type'] == 'dialogue':
        return [prefix + '[台词]' + parsed['speaker'] + '：' + parsed['text']]
    if parsed and parsed['type'] == 'cue':
        return [prefix + '[演出]' + original]
    if parsed and parsed['type'] == 'monologue':
        tag = '[画面]' if re.match(RULES['screenPattern'], original) else '[旁白]'
        return [prefix + tag + parsed['text']]
    return [prefix + '[旁白]' + original]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', required=True)
    args = parser.parse_args()
    snapshot = ROOT / args.snapshot
    records = trace_builders()
    report = {}
    for key, name in FILES.items():
        file = ROOT / name
        before = file.read_bytes()
        if before != (snapshot / name).read_bytes():
            raise ValueError(f'原文件与快照不一致，停止修改：{name}')
        content = before.decode('utf-8')
        newline = '\r\n' if '\r\n' in content else '\n'
        output = []
        counts = Counter()
        for index, raw in enumerate(content.splitlines()):
            if index not in records[key]: output.append(raw); continue
            labeled = label(raw, records[key][index], key)
            output.extend(labeled)
            for line in labeled:
                tag = re.search(r'\[(旁白|台词|内心|演出|画面)\]', line)
                counts[tag[1]] += 1
        file.write_bytes((newline.join(output) + (newline if content.endswith('\n') else '')).encode('utf-8'))
        report[name] = dict(counts)
    (snapshot / 'labeling-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
