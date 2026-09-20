import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadVoiceLines } from './story-source.mjs';

async function readJson(filename, fallback) {
  try { return JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

/**
 * Assign production voice roles without changing the name displayed in the
 * script.  A range is bounded by stable line IDs, then evaluated against the
 * source order so that new dialogue inserted within the range inherits the
 * intended role.
 */
export function resolveVoiceRoles(lines, roleMap = {}) {
  const aliases = roleMap.aliases || {};
  const roleByLineId = new Map(lines.map(line => [
    line.lineId,
    aliases[line.speaker] || line.speaker || '未分配角色'
  ]));
  const orderByLineId = new Map(lines.map(line => [line.lineId, line.order]));

  for (const range of roleMap.rangeOverrides || []) {
    const from = orderByLineId.get(range.fromLineId);
    const to = orderByLineId.get(range.toLineId);
    if (!Number.isFinite(from) || !Number.isFinite(to) || !range.voiceRole) continue;
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const speakers = Array.isArray(range.speakers) ? new Set(range.speakers) : null;
    for (const line of lines) {
      if (line.order < start || line.order > end) continue;
      if (speakers && !speakers.has(line.speaker)) continue;
      roleByLineId.set(line.lineId, range.voiceRole);
    }
  }

  for (const [lineId, voiceRole] of Object.entries(roleMap.lineOverrides || {})) {
    if (roleByLineId.has(lineId) && voiceRole) roleByLineId.set(lineId, voiceRole);
  }

  return lines.map(line => ({ ...line, voiceRole: roleByLineId.get(line.lineId) }));
}

export async function loadVoicevoxSource({ root = process.cwd(), storyLoader = loadVoiceLines } = {}) {
  const [source, translations, roleMap] = await Promise.all([
    storyLoader(),
    readJson(join(root, 'game/data/voice/translations.json'), { lines: {} }),
    readJson(join(root, 'game/data/voice/speaker-role-map.json'), { aliases: {} })
  ]);
  const translated = translations.lines || {};
  return {
    ...source,
    lines: resolveVoiceRoles(source.lines, roleMap).map(line => {
      const draft = translated[line.lineId];
      const currentDraft = draft && (!draft.sourceFingerprint || draft.sourceFingerprint === line.sourceFingerprint);
      return {
        ...line,
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
