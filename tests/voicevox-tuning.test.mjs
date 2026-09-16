import test from 'node:test';
import assert from 'node:assert/strict';
import { checkpoint, restore, editMora } from '../tools/voicevox/tuning.mjs';
const query = () => ({ accent_phrases: [{ accent: 1, moras: [{ text: 'ア', vowel: 'a', pitch: 5, vowel_length: .1 }, { text: 'ス', consonant: 's', consonant_length: .1, vowel: 'U', pitch: 0, vowel_length: .1 }], pause_mora: { text: '、', vowel: 'pau', pitch: 0, vowel_length: .2 } }] });
test('tuning history survives JSON project roundtrip and restores structural changes', () => {
  let line = { speechText: 'あす', styleId: 2, audioQuery: query(), renderStale: false };
  checkpoint(line, '文本'); line.speechText = '別の文'; line.renderStale = true; line.audioQuery = null;
  line = JSON.parse(JSON.stringify(line)); assert.ok(restore(line)); assert.equal(line.speechText, 'あす'); assert.equal(line.audioQuery.accent_phrases[0].moras[0].pitch, 5);
  assert.ok(restore(line, true)); assert.equal(line.audioQuery, null); assert.equal(line.renderStale, true);
});
test('mora edits respect unvoiced vowels, absent consonants, pauses and bounds', () => {
  const q = query(); editMora(q, 0, 0, 'pitch', 6); editMora(q, 0, -1, 'vowel_length', .5);
  assert.equal(q.accent_phrases[0].pause_mora.vowel_length, .5);
  assert.throws(() => editMora(q, 0, 1, 'pitch', 6)); assert.throws(() => editMora(q, 0, 0, 'consonant_length', .1));
  for (const n of [-1, Infinity, NaN, 4]) assert.throws(() => editMora(q, 0, 1, 'vowel_length', n));
});
