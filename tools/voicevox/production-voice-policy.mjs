// I.L.Y / 爱理 的正式配音策略：四国めたん 的甜美、性感为主，
// 其它风格只在语境确实需要时使用。这里不改写 speechText，所有调整都落在
// AudioQuery 的可编辑字段和 line.tuning 记录中，方便人工听审后撤销。
export const SHIKOKU_STYLE = Object.freeze({
  normal: 2,
  sweet: 0,
  sexy: 4,
  tsun: 6,
  whisper: 36,
  hiss: 37
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function classifyContext(value) {
  const text = String(value || '');
  return {
    text,
    dramatic: /――|どうして|なぜ|怖|恐|嫌|無理|嘘|違う|消え|さよなら|死|死ん|忘れ|生きてる/.test(text),
    excited: /！|!|？|\?|やった|嬉|大好き|好き|えへ|うん！|わあ|すごい|生きてる/.test(text),
    quiet: /そっと|小声|囁|お願い|ごめん|ごめんなさい/.test(text) && [...text].length <= 42,
    intimate: /大好き|好き|愛して|ねえ|呼んで|一緒に|想い/.test(text),
    question: /？|\?/.test(text)
  };
}

function stableBucket(text) {
  let hash = 2166136261;
  for (const char of String(text || '')) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

/** Return a real style ID from the engine's Shikoku Matan style family. */
export function chooseShikokuStyle(text, role = '') {
  const context = classifyContext(text);
  // 不使用低语音色：轻声、请求和道歉只通过速度/抑扬/停顿表达，
  // 声线仍保持在用户指定的甜美/性感主范围内。
  if (context.quiet) return context.intimate ? SHIKOKU_STYLE.sexy : SHIKOKU_STYLE.sweet;
  if (context.dramatic && context.excited) return SHIKOKU_STYLE.tsun;
  if (context.dramatic) return SHIKOKU_STYLE.normal;
  if (context.intimate) return SHIKOKU_STYLE.sexy;
  if (context.excited) return SHIKOKU_STYLE.sweet;
  // The neutral bucket is deliberately split only between the two requested
  // primary colors. A stable hash prevents a whole chapter sounding identical.
  return stableBucket(`${role}\u0000${text}`) < 50 ? SHIKOKU_STYLE.sweet : SHIKOKU_STYLE.sexy;
}

const MICRO_RULES = [
  { id: 'airi-name', match: /愛理|あいり/, mora: /リ/i, pitch: 0.08, length: 1.08 },
  { id: 'kio-name', match: /基生|きお/i, mora: /キ|オ/i, pitch: 0.05, length: 1.05 },
  { id: 'affection', match: /大好き|好き/, mora: /ス|キ/i, pitch: 0.06, length: 1.06 },
  { id: 'soft-ending', match: /ねえ|ねぇ/, mora: /ネ|エ/i, pitch: 0.04, length: 1.12 }
];

/**
 * Apply small, bounded, character-targeted mora adjustments. The return value
 * is persisted in line.tuning.pronunciation so a producer can see what was
 * touched; no guessed kana replacement is performed.
 */
export function applyPronunciationMicroTuning(query, text) {
  const source = String(text || '');
  const applied = [];
  for (const rule of MICRO_RULES) {
    if (!rule.match.test(source)) continue;
    let found = false;
    for (const phrase of query.accent_phrases || []) {
      for (const mora of phrase.moras || []) {
        if (found || !rule.mora.test(String(mora.text || ''))) continue;
        if (Number.isFinite(mora.vowel_length)) mora.vowel_length = clamp(mora.vowel_length * rule.length, 0.035, 3);
        if (Number.isFinite(mora.pitch) && mora.pitch > 0) mora.pitch = clamp(mora.pitch + rule.pitch, 3, 10);
        applied.push({ id: rule.id, mora: mora.text, pitch: rule.pitch, length: rule.length });
        found = true;
      }
    }
  }
  return applied;
}

export function tuneForContext(query, text, role = '') {
  const context = classifyContext(text);
  const speedScale = context.quiet ? 0.88 : context.dramatic ? 0.94 : context.excited ? 1.03 : 0.98;
  const pitchScale = context.dramatic ? -0.04 : context.excited ? 0.08 : context.intimate ? 0.05 : 0.03;
  const intonationScale = context.quiet ? 0.88 : context.dramatic ? 1.05 : context.excited ? 1.12 : 1;
  const lengthScale = context.quiet ? 1.16 : context.dramatic ? 1.08 : context.excited ? 0.93 : 1;
  Object.assign(query, { speedScale, pitchScale, intonationScale, volumeScale: 1 });
  for (const phrase of query.accent_phrases || []) {
    const accent = Math.max(0, Number(phrase.accent || 1) - 1);
    for (const [index, mora] of (phrase.moras || []).entries()) {
      if (Number.isFinite(mora.vowel_length)) mora.vowel_length = clamp(mora.vowel_length * lengthScale * (index === accent ? 1.08 : 1), 0.035, 3);
      if (mora.consonant != null && Number.isFinite(mora.consonant_length)) mora.consonant_length = clamp(mora.consonant_length * (context.quiet ? 1.08 : context.dramatic ? 1.03 : 0.98), 0.01, 3);
      if (Number.isFinite(mora.pitch) && mora.pitch > 0) mora.pitch = clamp(mora.pitch + pitchScale + (context.question && index >= accent ? 0.06 : 0) + (index === accent ? 0.05 : 0), 3, 10);
    }
    if (phrase.pause_mora && Number.isFinite(phrase.pause_mora.vowel_length)) {
      const pauseScale = context.quiet ? 1.35 : context.dramatic ? 1.25 : context.excited ? 0.9 : 1.08;
      phrase.pause_mora.vowel_length = clamp(phrase.pause_mora.vowel_length * pauseScale, 0.08, 3);
    }
  }
  const pronunciation = applyPronunciationMicroTuning(query, text);
  return { tuning: { speedScale, pitchScale, intonationScale, volumeScale: 1, pronunciation }, context };
}
