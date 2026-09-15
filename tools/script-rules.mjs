import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('./script-rules.json', import.meta.url), 'utf8'));
const match = (key, text) => text.match(new RegExp(rules[key], 'u'));

export function stripAsides(text) {
  for (;;) {
    const clean = text.replace(new RegExp(rules.asidePattern, 'gu'), '').trim();
    if (clean === text) return clean;
    text = clean;
  }
}

export function normalizeNode(node) {
  if (!['dialogue', 'choice'].includes(node.type)) return node;
  const speaker = node.speaker || '';
  if (node.type === 'choice') { node.speaker = '选择'; return node; }
  if (rules.innerWords.some(word => speaker.includes(word))) {
    Object.assign(node, { type: 'cue', text: '', speaker: '' });
  } else if (node.screenText) {
    Object.assign(node, { type: 'monologue', text: node.screenText, speaker: '' });
    delete node.screenText;
  } else if (!speaker || rules.narrators.includes(speaker)) {
    Object.assign(node, { type: 'monologue', speaker: '' });
  } else {
    node.speaker = stripAsides(speaker);
    node.text = stripAsides(node.text || '');
    if (!node.text) Object.assign(node, { type: 'cue', speaker: '' });
  }
  return node;
}

export function parseLine(value) {
  const line = value.trim();
  const tag = match('asciiTagPattern', line) || match('tagPattern', line);
  if (tag) {
    const [, name, body] = tag;
    if (rules.omitTags.includes(name)) return { type: 'cue', text: '', speaker: '' };
    if (rules.screenTags.includes(name)) return { type: 'monologue', text: body.trim(), speaker: '' };
    if (name === '台词') {
      const spoken = match('colonPattern', body.trim());
      if (!spoken || !spoken[2].trim()) throw new Error('[台词]必须写为：[台词]角色：台词正文');
      return normalizeNode({ type: 'dialogue', speaker: spoken[1].trim(), text: spoken[2].trim() });
    }
    if (!name.startsWith('疑点 ')) throw new Error(`未知文本标签：[${name}]`);
  }
  const screen = match('screenPattern', line);
  if (screen) return { type: 'monologue', text: screen[1].trim(), speaker: '' };
  if (match('innerPattern', line)) return { type: 'cue', text: '', speaker: '' };
  const spoken = match('spokenPattern', line) || match('colonPattern', line);
  if (spoken) return normalizeNode({ type: 'dialogue', speaker: spoken[1].trim(), text: spoken[2].trim() });
  if (match('cuePattern', line)) return { type: 'cue', text: '', speaker: '' };
  return null;
}
