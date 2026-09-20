import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, extname, join } from 'node:path';
import { loadVoiceLines } from './story-source.mjs';
import { parseImport } from './import-parser.mjs';
import { resolveVoiceRoles } from './voice-source.mjs';

export const TRANSLATION_STATUSES = new Set(['untranslated', 'draft', 'proofread']);
export const PRODUCTION_READY_STATUS = 'proofread';
export const TRANSLATION_COLUMNS = [
  'line_id', 'chapter', 'chapter_title', 'scene', 'route', 'order', 'speaker', 'kind',
  'display_text', 'context_before', 'context_after', 'speech_text', 'translation_status',
  'translation_note', 'pronunciation_note', 'source_fingerprint', 'source_revision'
];

function tsvCell(value) {
  const text = String(value ?? '');
  return /[\t\r\n"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeTsv(rows, columns = TRANSLATION_COLUMNS) {
  return '\ufeff' + [columns, ...rows.map(row => columns.map(column => row[column] ?? ''))]
    .map(row => row.map(tsvCell).join('\t')).join('\r\n') + '\r\n';
}

function contextValue(line, current) {
  if (!line) return '';
  const branch = (line.route || current.route) && line.route !== current.route
    ? `[分支候选 ${line.route || '公共'}] `
    : '';
  return `${branch}${line.lineId} | ${line.speaker || line.kind} | ${line.displayText}`;
}

export function buildTranslationRows(source, translations = {}, { includeNarration = false } = {}) {
  const selected = source.lines.filter(line => line.kind === 'dialogue' || includeNarration);
  return selected.map(line => {
    const sourceIndex = source.lines.indexOf(line);
    const existing = translations[line.lineId] || {};
    return {
      line_id: line.lineId,
      chapter: line.chapter,
      chapter_title: line.chapterTitle,
      scene: line.scene,
      route: line.route,
      order: line.order,
      speaker: line.speaker,
      kind: line.kind,
      display_text: line.displayText,
      context_before: contextValue(source.lines[sourceIndex - 1], line),
      context_after: contextValue(source.lines[sourceIndex + 1], line),
      speech_text: existing.speechText || '',
      translation_status: existing.translationStatus || 'untranslated',
      translation_note: existing.translationNote || '',
      pronunciation_note: existing.pronunciationNote || '',
      source_fingerprint: line.sourceFingerprint,
      source_revision: source.sourceRevision
    };
  });
}

function safeName(value) {
  const cleaned = String(value || '未命名角色').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 80);
  return cleaned || '未命名角色';
}

async function readTranslationProject(filename) {
  if (!filename) return {};
  try {
    const value = JSON.parse(await readFile(filename, 'utf8'));
    return value.lines || {};
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function readRoleMap(filename = join(process.cwd(), 'game/data/voice/speaker-role-map.json')) {
  try {
    return JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { aliases: {} };
    throw error;
  }
}

export async function exportTranslationBundle(outputDirectory, options = {}) {
  const source = await loadVoiceLines();
  const translations = options.translations || await readTranslationProject(options.projectFile);
  const roleMap = options.roleMap || (options.aliases ? { aliases: options.aliases } : await readRoleMap(options.roleMapFile));
  const voiceRoleByLineId = new Map(resolveVoiceRoles(source.lines, roleMap).map(line => [line.lineId, line.voiceRole]));
  const rows = buildTranslationRows(source, translations, options);
  const speakersDirectory = join(outputDirectory, 'speakers');
  let previousSpeakerFiles = [];
  try {
    const previousManifest = JSON.parse(await readFile(join(outputDirectory, 'manifest.json'), 'utf8'));
    previousSpeakerFiles = (previousManifest.speakers || [])
      .map(entry => String(entry.file || ''))
      .filter(file => /^speakers\/[^/\\]+\.tsv$/i.test(file));
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  await mkdir(speakersDirectory, { recursive: true });
  await writeFile(join(outputDirectory, 'all-lines.tsv'), serializeTsv(rows), 'utf8');

  const groups = new Map();
  for (const row of rows) {
    const voiceRole = voiceRoleByLineId.get(row.line_id) || row.speaker || '未分配角色';
    if (!groups.has(voiceRole)) groups.set(voiceRole, []);
    groups.get(voiceRole).push(row);
  }
  const usedNames = new Set();
  const speakerFiles = [];
  for (const [voiceRole, speakerRows] of groups) {
    speakerRows.sort((a, b) => a.order - b.order);
    let stem = safeName(voiceRole);
    let suffix = 2;
    while (usedNames.has(stem.toLowerCase())) stem = `${safeName(voiceRole)}_${suffix++}`;
    usedNames.add(stem.toLowerCase());
    const filename = `${stem}.tsv`;
    await writeFile(join(speakersDirectory, filename), serializeTsv(speakerRows), 'utf8');
    speakerFiles.push({
      speaker: voiceRole,
      voiceRole,
      sourceSpeakers: [...new Set(speakerRows.map(row => row.speaker))],
      file: `speakers/${filename}`,
      count: speakerRows.length
    });
  }
  const manifest = {
    schemaVersion: 1,
    sourceMode: 'effective-javascript',
    authoritativeSources: [
      'game/data/story/prologue.js',
      'game/data/story/chapter1.js',
      'game/data/story/chapter2.js',
      'game/data/story/chapter3.js',
      'game/data/story/heroine.js',
      'game/data/story/final.js',
      'game/data/story/script-edits.js'
    ],
    sourceRevision: source.sourceRevision,
    includeNarration: !!options.includeNarration,
    total: rows.length,
    speakers: speakerFiles
  };
  const currentSpeakerFiles = new Set(speakerFiles.map(entry => entry.file.toLowerCase()));
  for (const oldFile of previousSpeakerFiles) {
    if (!currentSpeakerFiles.has(oldFile.toLowerCase())) {
      await rm(join(outputDirectory, oldFile), { force: true });
    }
  }
  await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

async function collectInputFiles(paths) {
  const result = [];
  async function visit(path) {
    const info = await stat(path);
    if (info.isDirectory()) {
      const names = await readdir(path);
      // An export bundle contains the same rows in a master file and per-speaker
      // files. Import the edited speaker files when the complete bundle is given.
      if (names.includes('all-lines.tsv') && names.includes('speakers')) {
        await visit(join(path, 'speakers'));
        return;
      }
      for (const name of names) await visit(join(path, name));
    } else if (['.tsv', '.csv', '.json'].includes(extname(path).toLowerCase()) && basename(path) !== 'manifest.json') {
      result.push(path);
    }
  }
  for (const path of paths) await visit(path);
  return result.sort();
}

function issue(code, message, details = {}) {
  return { code, message, ...details };
}

export async function validateTranslationFiles(paths, { allowMissing = false, includeNarration = false } = {}) {
  const source = await loadVoiceLines();
  const current = buildTranslationRows(source, {}, { includeNarration });
  const currentById = new Map(current.map(row => [row.line_id, row]));
  const files = await collectInputFiles(paths);
  if (!files.length) throw new Error('没有找到可导入的 TSV、CSV 或 JSON 文件。');
  const errors = [];
  const warnings = [];
  const accepted = [];
  const seen = new Map();

  for (const file of files) {
    const rows = parseImport(await readFile(file, 'utf8'), file);
    for (const row of rows) {
      const rowNumber = row.__row || '?';
      const location = `${file}:${rowNumber}`;
      const lineId = String(row.line_id ?? row.lineId ?? '').trim();
      if (!lineId) {
        errors.push(issue('MISSING_ID', `${location} 缺少 line_id。`, { location }));
        continue;
      }
      if (seen.has(lineId)) {
        errors.push(issue('DUPLICATE_ID', `${location} 与 ${seen.get(lineId)} 重复 ID：${lineId}`, { lineId, location }));
        continue;
      }
      seen.set(lineId, location);
      const expected = currentById.get(lineId);
      if (!expected) {
        errors.push(issue('UNKNOWN_ID', `${location} 未知或当前不可配音的 ID：${lineId}`, { lineId, location }));
        continue;
      }
      const sourceFingerprint = String(row.source_fingerprint ?? row.sourceFingerprint ?? '').trim();
      const sourceRevision = String(row.source_revision ?? row.sourceRevision ?? '').trim();
      const changedFields = [];
      for (const [input, expectedKey] of [['display_text', 'display_text'], ['chapter', 'chapter'], ['scene', 'scene'], ['speaker', 'speaker']]) {
        if (row[input] != null && String(row[input]) !== String(expected[expectedKey])) changedFields.push(input);
      }
      if (!sourceFingerprint || sourceFingerprint !== expected.source_fingerprint) changedFields.push('source_fingerprint');
      if (!sourceRevision || sourceRevision !== source.sourceRevision) changedFields.push('source_revision');
      if (changedFields.length) {
        errors.push(issue('SOURCE_CHANGED', `${location} 源剧本已变化（${[...new Set(changedFields)].join(', ')}）：${lineId}`, { lineId, location, fields: [...new Set(changedFields)] }));
        continue;
      }
      const speechText = String(row.speech_text ?? row.speechText ?? '').trim();
      if (!speechText) {
        errors.push(issue('EMPTY_SPEECH_TEXT', `${location} 日文 speech_text 为空：${lineId}`, { lineId, location }));
        continue;
      }
      const translationStatus = String(row.translation_status ?? row.translationStatus ?? 'draft').trim().toLowerCase();
      if (!TRANSLATION_STATUSES.has(translationStatus) || translationStatus === 'untranslated') {
        errors.push(issue('INVALID_STATUS', `${location} translation_status 无效：${translationStatus || '(空)'}`, { lineId, location }));
        continue;
      }
      if (translationStatus !== PRODUCTION_READY_STATUS) {
        warnings.push(issue('NOT_PRODUCTION_READY', `${location} 尚未批准，不能进入正式批量合成：${lineId}`, { lineId, location }));
      }
      accepted.push({
        lineId,
        chapter: expected.chapter,
        scene: expected.scene,
        route: expected.route,
        order: expected.order,
        speaker: expected.speaker,
        kind: expected.kind,
        displayText: expected.display_text,
        speechText,
        translationStatus,
        translationNote: String(row.translation_note ?? row.translationNote ?? ''),
        pronunciationNote: String(row.pronunciation_note ?? row.pronunciationNote ?? ''),
        sourceFingerprint: expected.source_fingerprint,
        sourceRevision: source.sourceRevision
      });
    }
  }
  const missing = current.filter(row => !seen.has(row.line_id)).map(row => row.line_id);
  if (missing.length) {
    const target = allowMissing ? warnings : errors;
    target.push(issue('MISSING_IDS', `缺少 ${missing.length} 个当前有效 ID。`, { lineIds: missing }));
  }
  return { source, files, accepted, errors, warnings, missing };
}

export async function importTranslationFiles(paths, outputFile, options = {}) {
  const validation = await validateTranslationFiles(paths, options);
  if (validation.errors.length) return { ...validation, written: false };
  const existing = await readTranslationProject(outputFile);
  const currentById = new Map(validation.source.lines.map(line => [line.lineId, line]));
  const lines = {};
  for (const [lineId, value] of Object.entries(existing)) {
    if (currentById.get(lineId)?.sourceFingerprint === value.sourceFingerprint) lines[lineId] = value;
  }
  for (const value of validation.accepted) lines[value.lineId] = value;
  const project = { schemaVersion: 1, sourceRevision: validation.source.sourceRevision, lines };
  await mkdir(dirname(outputFile), { recursive: true });
  const temporary = join(dirname(outputFile), `.${basename(outputFile)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(project, null, 2) + '\n', 'utf8');
    await rename(temporary, outputFile);
  } finally {
    await rm(temporary, { force: true });
  }
  return { ...validation, project, written: true };
}

export async function importGeneratedDraft(draftFile, outputFile) {
  const source = await loadVoiceLines();
  const current = new Map(source.lines.filter(line => line.kind === 'dialogue').map(line => [line.lineId, line]));
  const input = JSON.parse((await readFile(draftFile, 'utf8')).replace(/^\ufeff/, ''));
  const entries = Array.isArray(input) ? input : input.lines;
  if (!Array.isArray(entries) || !entries.length) throw new Error('生成稿必须包含非空 lines 数组。');
  const seen = new Set();
  for (const entry of entries) {
    const lineId = String(entry.line_id ?? entry.lineId ?? '').trim();
    const speechText = String(entry.speech_text ?? entry.speechText ?? '').trim();
    if (!lineId || !speechText) throw new Error('生成稿存在缺少 line_id 或 speech_text 的记录。');
    if (seen.has(lineId)) throw new Error(`生成稿存在重复 ID：${lineId}`);
    if (!current.has(lineId)) throw new Error(`生成稿包含未知或不可配音的 ID：${lineId}`);
    seen.add(lineId);
  }
  const existing = await readTranslationProject(outputFile);
  const lines = {};
  for (const [lineId, value] of Object.entries(existing)) {
    if (current.get(lineId)?.sourceFingerprint === value.sourceFingerprint) lines[lineId] = value;
  }
  for (const entry of entries) {
    const lineId = String(entry.line_id ?? entry.lineId).trim();
    const line = current.get(lineId);
    lines[lineId] = {
      lineId,
      chapter: line.chapter,
      scene: line.scene,
      route: line.route,
      order: line.order,
      speaker: line.speaker,
      kind: line.kind,
      displayText: line.displayText,
      speechText: String(entry.speech_text ?? entry.speechText).trim(),
      translationStatus: 'draft',
      translationNote: String(entry.translation_note ?? entry.translationNote ?? 'AI 批量翻译初稿，需人工校对角色口吻与专名。'),
      pronunciationNote: String(entry.pronunciation_note ?? entry.pronunciationNote ?? ''),
      sourceFingerprint: line.sourceFingerprint,
      sourceRevision: source.sourceRevision
    };
  }
  const project = { schemaVersion: 1, sourceRevision: source.sourceRevision, lines };
  await mkdir(dirname(outputFile), { recursive: true });
  const temporary = join(dirname(outputFile), `.${basename(outputFile)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(project, null, 2) + '\n', 'utf8');
    await rename(temporary, outputFile);
  } finally {
    await rm(temporary, { force: true });
  }
  return { imported: entries.length, total: Object.keys(lines).length, sourceRevision: source.sourceRevision };
}

export async function exportApprovedScripts(projectFile, outputDirectory, roleMapFile) {
  const source = await loadVoiceLines();
  const translations = await readTranslationProject(projectFile);
  const roleMap = await readRoleMap(roleMapFile);
  const current = new Map(resolveVoiceRoles(source.lines, roleMap).map(line => [line.lineId, line]));
  const groups = new Map();
  for (const value of Object.values(translations)) {
    const line = current.get(value.lineId);
    if (!line || value.sourceFingerprint !== line.sourceFingerprint || value.translationStatus !== PRODUCTION_READY_STATUS || !String(value.speechText || '').trim()) continue;
    const voiceRole = line.voiceRole || line.speaker || '未分配角色';
    if (!groups.has(voiceRole)) groups.set(voiceRole, []);
    groups.get(voiceRole).push({ ...value, speaker: line.speaker, order: line.order });
  }
  await mkdir(outputDirectory, { recursive: true });
  const files = [];
  for (const [voiceRole, values] of groups) {
    values.sort((a, b) => a.order - b.order);
    const stem = safeName(voiceRole);
    await writeFile(join(outputDirectory, `${stem}.txt`), '\ufeff' + values.map(value => value.speechText).join('\r\n') + '\r\n', 'utf8');
    await writeFile(join(outputDirectory, `${stem}.ids.tsv`), serializeTsv(values.map(value => ({ line_id: value.lineId, order: value.order, source_speaker: value.speaker, speech_text: value.speechText })), ['line_id', 'order', 'source_speaker', 'speech_text']), 'utf8');
    files.push({ speaker: voiceRole, voiceRole, sourceSpeakers: [...new Set(values.map(value => value.speaker))], count: values.length, textFile: `${stem}.txt`, idFile: `${stem}.ids.tsv` });
  }
  await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify({ schemaVersion: 1, sourceRevision: source.sourceRevision, requiredStatus: PRODUCTION_READY_STATUS, files }, null, 2) + '\n', 'utf8');
  return { files, count: files.reduce((sum, file) => sum + file.count, 0) };
}

export async function exportVoiceRoleBatches(projectFile, outputDirectory, roleMapFile) {
  const project = JSON.parse(await readFile(projectFile, 'utf8'));
  const config = roleMapFile ? await readRoleMap(roleMapFile) : { aliases: {} };
  const source = await loadVoiceLines();
  const sourceRoleByLineId = new Map(resolveVoiceRoles(source.lines, config).map(line => [line.lineId, line.voiceRole]));
  const groups = new Map();
  for (const value of resolveVoiceRoles(Object.values(project.lines || {}), config)) {
    if (!String(value.speechText || '').trim()) continue;
    const voiceRole = sourceRoleByLineId.get(value.lineId) || value.voiceRole || value.speaker || '未分配角色';
    if (!groups.has(voiceRole)) groups.set(voiceRole, []);
    groups.get(voiceRole).push({ ...value, voiceRole });
  }
  await mkdir(outputDirectory, { recursive: true });
  const files = [];
  for (const [voiceRole, values] of groups) {
    values.sort((a, b) => a.order - b.order);
    const filename = `${safeName(voiceRole)}.tsv`;
    const rows = values.map(value => ({
      line_id: value.lineId,
      speech_text: value.speechText,
      translation_status: value.translationStatus,
      voice_role: voiceRole,
      source_speaker: value.speaker,
      chapter: value.chapter,
      scene: value.scene,
      order: value.order,
      display_text: value.displayText
    }));
    await writeFile(join(outputDirectory, filename), serializeTsv(rows, [
      'line_id', 'speech_text', 'translation_status', 'voice_role', 'source_speaker',
      'chapter', 'scene', 'order', 'display_text'
    ]), 'utf8');
    files.push({ voiceRole, file: filename, count: values.length, sourceSpeakers: [...new Set(values.map(value => value.speaker))] });
  }
  const manifest = {
    schemaVersion: 1,
    purpose: 'voicevox-character-batch-import',
    sourceRevision: project.sourceRevision,
    total: files.reduce((sum, file) => sum + file.count, 0),
    files
  };
  await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}
