const clone = value => structuredClone(value);
const fields = ['speechText', 'styleId', 'audioQuery', 'tuning', 'renderStale'];
export function snapshot(line) {
  return Object.fromEntries(fields.map(key => [key, clone(line[key] ?? null)]));
}
export function checkpoint(line, label) {
  line.tuningHistory ||= [];
  line.tuningHistory.push({ label, value: snapshot(line) });
  if (line.tuningHistory.length > 30) line.tuningHistory.shift();
  line.tuningRedo = [];
}
export function restore(line, redo = false) {
  const from = redo ? 'tuningRedo' : 'tuningHistory', to = redo ? 'tuningHistory' : 'tuningRedo';
  const item = line[from]?.pop(); if (!item) return false;
  (line[to] ||= []).push({ label: item.label, value: snapshot(line) });
  Object.assign(line, item.value); return true;
}
export function editMora(query, phraseIndex, moraIndex, key, value) {
  const phrase = query.accent_phrases[phraseIndex];
  const mora = moraIndex === -1 ? phrase.pause_mora : phrase.moras[moraIndex];
  if (!mora || !['pitch', 'vowel_length', 'consonant_length'].includes(key)) throw new Error('无效音节字段');
  if (key === 'consonant_length' && mora.consonant == null) throw new Error('此音节没有辅音');
  if (key === 'pitch' && (mora.pitch === 0 || /^[AIUEO]$|^pau$|^cl$/.test(mora.vowel))) throw new Error('无声音节不能修改音高');
  const n = Number(value), max = key === 'pitch' ? 10 : 3;
  if (!Number.isFinite(n) || n < (key === 'pitch' ? 3 : 0) || n > max) throw new Error(`数值超出范围：${key === 'pitch' ? 3 : 0}–${max}`);
  mora[key] = n;
}
