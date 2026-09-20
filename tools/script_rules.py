"""Shared text grammar for chapter builders; see game/剧本文本编译规则.md."""
import json
import re
from pathlib import Path

RULES = json.loads(Path(__file__).with_name('script-rules.json').read_text(encoding='utf-8'))


def strip_asides(text):
    while True:
        clean = re.sub(RULES['asidePattern'], '', text).strip()
        if clean == text:
            return clean
        text = clean


def parse_line(line):
    """Return node fields, or None for the caller's legacy prose fallback."""
    line = line.strip()
    tag = re.match(RULES['asciiTagPattern'], line) or re.match(RULES['tagPattern'], line)
    if tag:
        name, body = tag.groups()
        if name in RULES['omitTags']:
            return dict(type='cue', text='', speaker='')
        if name in RULES['screenTags']:
            return dict(type='monologue', text=body.strip(), speaker='')
        if name == '台词':
            match = re.match(RULES['colonPattern'], body.strip())
            if not match or not match[2].strip():
                raise ValueError('[台词]必须写为：[台词]角色：台词正文')
            return normalize_node(dict(type='dialogue', speaker=match[1].strip(), text=match[2].strip()))
        if not name.startswith('疑点 '):
            raise ValueError(f'未知文本标签：[{name}]')
    screen = re.match(RULES['screenPattern'], line)
    if screen:
        return dict(type='monologue', text=screen[1].strip(), speaker='')
    inner = re.match(RULES['innerPattern'], line)
    if inner:
        return dict(type='cue', text='', speaker='')
    spoken = re.match(RULES['spokenPattern'], line) or re.match(RULES['colonPattern'], line)
    if spoken:
        return normalize_node(dict(type='dialogue', speaker=spoken[1].strip(), text=spoken[2].strip()))
    # Standalone acting cues never become a visible line, nor consume the next line.
    if re.match(RULES['cuePattern'], line):
        return dict(type='cue', text='', speaker='')
    return None


def normalize_node(node):
    """Also enforce policy for builder-authored dialogue, retaining IDs and flags."""
    if node.get('type') not in ('dialogue', 'choice'):
        return node
    speaker = node.get('speaker', '')
    if node['type'] == 'choice':
        node['speaker'] = '选择'
        return node
    if any(word in speaker for word in RULES['innerWords']):
        node.update(type='cue', text='', speaker='')
    elif node.get('screenText'):
        node.update(type='monologue', text=node.pop('screenText'), speaker='')
    elif speaker in RULES['narrators'] or not speaker:
        node.update(type='monologue', speaker='')
    else:
        node['speaker'] = strip_asides(speaker)
        node['text'] = strip_asides(node.get('text', ''))
        if not node['text']:
            node.update(type='cue', speaker='')
    return node
