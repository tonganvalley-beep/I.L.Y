import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadVoiceLines } from './story-source.mjs';

async function readJson(filename, fallback) {
  try { return JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

export async function loadVoicevoxSource({ root = process.cwd(), storyLoader = loadVoiceLines } = {}) {
  const [source, translations, roleMap] = await Promise.all([
    storyLoader(),
    readJson(join(root, 'game/data/voice/translations.json'), { lines: {} }),
    readJson(join(root, 'game/data/voice/speaker-role-map.json'), { aliases: {} })
  ]);
  const aliases = roleMap.aliases || {};
  const translated = translations.lines || {};
  return {
    ...source,
    lines: source.lines.map(line => {
      const draft = translated[line.lineId];
      const currentDraft = draft && (!draft.sourceFingerprint || draft.sourceFingerprint === line.sourceFingerprint);
      return {
        ...line,
        voiceRole: aliases[line.speaker] || line.speaker || '未分配角色',
        voiceOrder: currentDraft && Number.isFinite(draft.order) ? draft.order : line.order,
        ...(currentDraft && String(draft.speechText || '').trim() ? {
          speechText: draft.speechText,
          translationStatus: draft.translationStatus || 'draft',
          translationNote: draft.translationNote || '',
          pronunciationNote: draft.pronunciationNote || ''
        } : {})
      };
    })
  };
}
