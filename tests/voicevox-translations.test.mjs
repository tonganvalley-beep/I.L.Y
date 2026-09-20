import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEffectiveStory, loadVoiceLines } from '../tools/voicevox/story-source.mjs';
import { loadVoicevoxSource } from '../tools/voicevox/voice-source.mjs';
import {
  buildTranslationRows,
  exportApprovedScripts,
  exportTranslationBundle,
  exportVoiceRoleBatches,
  importTranslationFiles,
  serializeTsv,
  validateTranslationFiles
} from '../tools/voicevox/translation-workflow.mjs';

test('effective source applies published additions, deletions, classification, and before-proxy order', async () => {
  const effective = await loadEffectiveStory();
  const source = await loadVoiceLines();
  const added = Object.entries(effective.records).filter(([, record]) => record.added);
  const deleted = Object.entries(effective.records).filter(([, record]) => record.deleted);
  assert.equal(added.length, 20);
  assert.equal(deleted.length, 30);
  for (const [id] of deleted) assert.equal(source.lines.some(line => line.lineId === id), false, id);
  for (const [id, record] of added.filter(([, value]) => value.position === 'before')) {
    assert.ok(source.lines.findIndex(line => line.lineId === id) < source.lines.findIndex(line => line.lineId === record.anchor), id);
  }
  assert.equal(source.lines.filter(line => line.lineId === 's05a').length, 1);
  assert.ok(source.lines.every(line => line.chapter !== 'unknown' && line.scene));
  assert.equal(source.lines.find(line => line.lineId === 's01_intro').kind, 'monologue');
});

test('translation export defaults to dialogue and preserves contextual sequence in role files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-export-'));
  await mkdir(join(directory, 'speakers'), { recursive: true });
  await writeFile(join(directory, 'speakers', '基生.tsv'), 'stale');
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({ speakers: [{ file: 'speakers/基生.tsv' }] }));
  const manifest = await exportTranslationBundle(directory);
  const source = await loadVoiceLines();
  const expected = source.lines.filter(line => line.kind === 'dialogue');
  assert.equal(manifest.total, expected.length);
  assert.ok(manifest.speakers.length > 1);
  const master = await readFile(join(directory, 'all-lines.tsv'), 'utf8');
  assert.ok(master.startsWith('\ufeffline_id\tchapter'));
  assert.match(master, /context_before\tcontext_after/);
  const kio = manifest.speakers.find(file => file.speaker === '成田基生');
  assert.deepEqual(kio.sourceSpeakers, ['成田基生', '基生']);
  const roleFile = await readFile(join(directory, kio.file), 'utf8');
  assert.match(roleFile, /review_815b6be0-12e6-41d8-8f1b-676b70e1965c/);
  assert.match(roleFile, /s03a\tprologue/);
  assert.match(roleFile, /s01_photo \| 旁白/);
  assert.equal(manifest.speakers.some(file => file.speaker === '基生'), false);
  await assert.rejects(readFile(join(directory, 'speakers', '基生.tsv')), error => error.code === 'ENOENT');
  const orders = roleFile.trim().split(/\r?\n/).slice(1).map(row => Number(row.split('\t')[5]));
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
});

test('translation export includes existing drafts while grouping speaker aliases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-export-drafts-'));
  const source = await loadVoiceLines();
  const kio = source.lines.find(line => line.kind === 'dialogue' && (line.speaker === '成田基生' || line.speaker === '基生'));
  const projectFile = join(directory, 'translations.json');
  await writeFile(projectFile, JSON.stringify({ lines: {
    [kio.lineId]: { lineId: kio.lineId, speechText: 'テストです。', translationStatus: 'draft' }
  } }));
  const manifest = await exportTranslationBundle(join(directory, 'out'), { projectFile });
  const role = manifest.speakers.find(file => file.voiceRole === '成田基生');
  const content = await readFile(join(directory, 'out', role.file), 'utf8');
  assert.match(content, /テストです。\tdraft/);
});

test('import reports duplicate, unknown, empty, missing, and changed source without writing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-invalid-'));
  const source = await loadVoiceLines();
  const rows = buildTranslationRows(source);
  const first = { ...rows[0], speech_text: 'テスト', translation_status: 'proofread' };
  const input = join(directory, 'invalid.tsv');
  await writeFile(input, serializeTsv([
    { ...first, display_text: '旧原文' },
    first,
    { ...rows[1], speech_text: '', translation_status: 'draft' },
    { ...first, line_id: 'does-not-exist' }
  ]), 'utf8');
  const validation = await validateTranslationFiles([input]);
  const codes = new Set(validation.errors.map(error => error.code));
  for (const code of ['SOURCE_CHANGED', 'DUPLICATE_ID', 'EMPTY_SPEECH_TEXT', 'UNKNOWN_ID', 'MISSING_IDS']) assert.ok(codes.has(code), code);
  const result = await importTranslationFiles([input], join(directory, 'translations.json'));
  assert.equal(result.written, false);
});

test('valid partial import preserves Chinese source and only proofread rows reach ready scripts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-valid-'));
  const source = await loadVoiceLines();
  const rows = buildTranslationRows(source).slice(0, 2).map((row, index) => ({
    ...row,
    speech_text: index ? '二番目のテストです。' : '最初のテストです。',
    translation_status: index ? 'draft' : 'proofread'
  }));
  const input = join(directory, 'role.tsv');
  const projectFile = join(directory, 'translations.json');
  await writeFile(input, serializeTsv(rows), 'utf8');
  const imported = await importTranslationFiles([input], projectFile, { allowMissing: true });
  assert.equal(imported.written, true);
  assert.equal(imported.project.lines[rows[0].line_id].displayText, rows[0].display_text);
  assert.equal(imported.warnings.filter(value => value.code === 'NOT_PRODUCTION_READY').length, 1);
  rows[0].speech_text = '更新したテストです。';
  await writeFile(input, serializeTsv(rows), 'utf8');
  const replaced = await importTranslationFiles([input], projectFile, { allowMissing: true });
  assert.equal(replaced.project.lines[rows[0].line_id].speechText, '更新したテストです。');
  const ready = await exportApprovedScripts(projectFile, join(directory, 'ready'));
  assert.equal(ready.count, 1);
  const idFile = await readFile(join(directory, 'ready', ready.files[0].idFile), 'utf8');
  assert.match(idFile, new RegExp(rows[0].line_id));
  assert.doesNotMatch(idFile, new RegExp(rows[1].line_id));
});

test('VOICEVOX batch export groups explicit speaker aliases into one character file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-role-'));
  const projectFile = join(directory, 'translations.json');
  const roleMapFile = join(directory, 'roles.json');
  await writeFile(projectFile, JSON.stringify({ sourceRevision: 'test', lines: {
    a: { lineId: 'a', speaker: '成田基生', speechText: '一', translationStatus: 'draft', order: 1 },
    b: { lineId: 'b', speaker: '基生', speechText: '二', translationStatus: 'draft', order: 2 },
    c: { lineId: 'c', speaker: '“爱理”', speechText: '三', translationStatus: 'draft', order: 3 }
  } }));
  await writeFile(roleMapFile, JSON.stringify({ aliases: { '成田基生': '成田基生', '基生': '成田基生' } }));
  const result = await exportVoiceRoleBatches(projectFile, join(directory, 'out'), roleMapFile);
  assert.equal(result.total, 3);
  assert.deepEqual(result.files.map(file => [file.voiceRole, file.count]), [['成田基生', 2], ['“爱理”', 1]]);
  const kio = await readFile(join(directory, 'out', '成田基生.tsv'), 'utf8');
  assert.match(kio, /a\t一\tdraft\t成田基生\t成田基生/);
  assert.match(kio, /b\t二\tdraft\t成田基生\t基生/);
});

test('VOICEVOX batch export applies source-defined voice ranges to translated lines', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-adult-airi-batch-'));
  const projectFile = join(directory, 'translations.json');
  const roleMapFile = join(directory, 'roles.json');
  await writeFile(projectFile, JSON.stringify({ lines: {
    ch2_251: { lineId: 'ch2_251', speaker: '成年“爱理”', speechText: 'あの', translationStatus: 'draft', order: 624 },
    ch3_002: { lineId: 'ch3_002', speaker: '爱理', speechText: 'ひさしぶり', translationStatus: 'draft', order: 634 },
    ch3_425: { lineId: 'ch3_425', speaker: '“爱理”', speechText: '基生', translationStatus: 'draft', order: 988 }
  } }));
  await writeFile(roleMapFile, JSON.stringify({
    aliases: { '爱理': '百合沢爱理', '“爱理”': '百合沢爱理', '成年“爱理”': '成年爱理' },
    rangeOverrides: [{
      fromLineId: 'ch2_251', toLineId: 'ch3_150',
      speakers: ['成年“爱理”', '爱理'], voiceRole: '成年爱理'
    }]
  }));
  const result = await exportVoiceRoleBatches(projectFile, join(directory, 'out'), roleMapFile);
  assert.deepEqual(result.files.map(file => [file.voiceRole, file.count]), [
    ['成年爱理', 2], ['百合沢爱理', 1]
  ]);
});

test('VOICEVOX source uses the integrated Japanese draft order and voice-role aliases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-t1-source-'));
  const voiceDirectory = join(directory, 'game/data/voice');
  await mkdir(voiceDirectory, { recursive: true });
  const sourceLines = [
    { lineId: 'later', speaker: '爱理', order: 20, sourceFingerprint: 'later-source' },
    { lineId: 'first', speaker: '“爱理”', order: 10, sourceFingerprint: 'first-source' },
    { lineId: 'other', speaker: '主管', order: 30, sourceFingerprint: 'other-source' }
  ];
  await writeFile(join(voiceDirectory, 'translations.json'), JSON.stringify({ lines: {
    later: { lineId: 'later', order: 20, speechText: 'あと', translationStatus: 'draft', sourceFingerprint: 'later-source' },
    first: { lineId: 'first', order: 10, speechText: 'さき', translationStatus: 'draft', sourceFingerprint: 'first-source' }
  } }));
  await writeFile(join(voiceDirectory, 'speaker-role-map.json'), JSON.stringify({ aliases: {
    '爱理': '百合沢爱理', '“爱理”': '百合沢爱理'
  } }));
  const result = await loadVoicevoxSource({ root: directory, storyLoader: async () => ({ sourceRevision: 'story', lines: sourceLines }) });
  assert.deepEqual(result.lines.map(line => [line.lineId, line.voiceRole, line.voiceOrder, line.speechText || '']), [
    ['later', '百合沢爱理', 20, 'あと'],
    ['first', '百合沢爱理', 10, 'さき'],
    ['other', '主管', 30, '']
  ]);
});

test('VOICEVOX source keeps the adult Airi story interval in the adult voice role', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-airi-role-'));
  const voiceDirectory = join(directory, 'game/data/voice');
  await mkdir(voiceDirectory, { recursive: true });
  const sourceLines = [
    { lineId: 'before', speaker: '爱理', order: 10, sourceFingerprint: 'before' },
    { lineId: 'adult-start', speaker: '成年“爱理”', order: 20, sourceFingerprint: 'adult-start' },
    { lineId: 'adult-middle', speaker: '爱理', order: 30, sourceFingerprint: 'adult-middle' },
    { lineId: 'adult-end', speaker: '爱理', order: 40, sourceFingerprint: 'adult-end' },
    { lineId: 'after', speaker: '爱理', order: 50, sourceFingerprint: 'after' }
  ];
  await writeFile(join(voiceDirectory, 'speaker-role-map.json'), JSON.stringify({
    aliases: { '爱理': '百合沢爱理', '成年“爱理”': '成年爱理' },
    rangeOverrides: [{
      fromLineId: 'adult-start', toLineId: 'adult-end',
      speakers: ['成年“爱理”', '爱理'], voiceRole: '成年爱理'
    }]
  }));
  const result = await loadVoicevoxSource({ root: directory, storyLoader: async () => ({ sourceRevision: 'story', lines: sourceLines }) });
  assert.deepEqual(result.lines.map(line => [line.lineId, line.voiceRole]), [
    ['before', '百合沢爱理'],
    ['adult-start', '成年爱理'],
    ['adult-middle', '成年爱理'],
    ['adult-end', '成年爱理'],
    ['after', '百合沢爱理']
  ]);
});

test('published story maps the two screenshot boundaries to adult Airi only', async () => {
  const source = await loadVoicevoxSource();
  const byId = new Map(source.lines.map(line => [line.lineId, line]));
  for (const lineId of ['ch2_251', 'ch2_255', 'ch3_002', 'ch3_150']) {
    assert.equal(byId.get(lineId)?.voiceRole, '成年爱理', lineId);
  }
  assert.equal(byId.get('ch3_425')?.voiceRole, '百合沢爱理');
});
