import test from 'node:test';
import assert from 'node:assert/strict';
import { SHIKOKU_STYLE, chooseShikokuStyle, applyPronunciationMicroTuning, tuneForContext } from '../tools/voicevox/production-voice-policy.mjs';

test('ILY 与爱理的默认语境落在四国甜美/性感主声线', () => {
  const samples = [
    '今日は一緒に帰ろう。', '大好きだよ、基生。', 'これは普通の文。',
    'うん！大丈夫だよ！', '忘れちゃったの？'
  ];
  const styles = samples.map(text => chooseShikokuStyle(text, 'ILY'));
  assert.ok(styles.some(style => style === SHIKOKU_STYLE.sweet));
  assert.ok(styles.some(style => style === SHIKOKU_STYLE.sexy));
  assert.equal(chooseShikokuStyle('……お願い。', '百合沢爱理'), SHIKOKU_STYLE.sweet);
  assert.notEqual(chooseShikokuStyle('……お願い。', '百合沢爱理'), SHIKOKU_STYLE.whisper);
  assert.equal(chooseShikokuStyle('基生！！ 生きてるの？！', '百合沢爱理'), SHIKOKU_STYLE.tsun);
});

test('字符级发音微调只改目标 mora 并返回可追踪记录', () => {
  const query = { accent_phrases: [{ moras: [
    { text: 'ダ', pitch: 5, vowel_length: 0.1 },
    { text: 'イ', pitch: 5, vowel_length: 0.1 },
    { text: 'ス', pitch: 5, vowel_length: 0.1 },
    { text: 'キ', pitch: 5, vowel_length: 0.1 }
  ], accent: 2 }] };
  const before = query.accent_phrases[0].moras.map(mora => ({ ...mora }));
  const applied = applyPronunciationMicroTuning(query, '大好きだよ。');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].id, 'affection');
  assert.ok(query.accent_phrases[0].moras[2].pitch > before[2].pitch);
  assert.equal(query.accent_phrases[0].moras[0].pitch, before[0].pitch);
});

test('情境微调保留 VOICEVOX 查询边界', () => {
  const query = { accent_phrases: [{ moras: [{ text: 'ネ', pitch: 5, vowel_length: 0.1 }], accent: 1 }] };
  const result = tuneForContext(query, 'ねえ、お願い。', 'ILY');
  assert.equal(result.tuning.speedScale, 0.88);
  assert.equal(result.tuning.pronunciation[0].id, 'soft-ending');
  assert.ok(query.accent_phrases[0].moras[0].pitch <= 10);
});
