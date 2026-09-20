import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEffectiveStory, loadVoiceLines } from '../tools/voicevox/story-source.mjs';
import { syncVoiceLines } from '../tools/voicevox/story-sync.mjs';
import { publishVoiceManifest } from '../tools/voicevox/voice-publication.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function wav() {
  const value = Buffer.alloc(44);
  value.write('RIFF', 0); value.writeUInt32LE(36, 4); value.write('WAVEfmt ', 8);
  value.writeUInt32LE(16, 16); value.writeUInt16LE(1, 20); value.writeUInt16LE(1, 22);
  value.writeUInt32LE(24000, 24); value.writeUInt32LE(48000, 28); value.writeUInt16LE(2, 32);
  value.writeUInt16LE(16, 34); value.write('data', 36); value.writeUInt32LE(0, 40);
  return value;
}

test('P4 source keeps stable review identity and excludes deleted/proxy cues', async () => {
  const effective = await loadEffectiveStory();
  const source = await loadVoiceLines();
  const before = Object.entries(effective.records).find(([, record]) => record.added && record.position === 'before');
  assert.ok(before);
  const [addedId, record] = before;
  assert.equal(source.lines.filter(line => line.lineId === addedId).length, 1);
  assert.ok(source.lines.findIndex(line => line.lineId === addedId) < source.lines.findIndex(line => line.lineId === record.anchor));
  assert.equal(source.lines.some(line => line.runtimeNodeId === `${record.anchor}__review_body` && line.lineId === record.anchor), true);
  for (const [id, edit] of Object.entries(effective.records).filter(([, value]) => value.deleted)) {
    assert.equal(source.lines.some(line => line.lineId === id), false, id);
  }
  assert.equal(new Set(source.lines.map(line => line.lineId)).size, source.lines.length);
});

test('incremental sync distinguishes changes and preserves manual production work', () => {
  const old = [{
    lineId: 'same', displayText: '旧文', speaker: '甲', kind: 'dialogue', sourceFingerprint: 'old',
    speechText: '手作業', styleId: 7, audioQuery: { speedScale: 0.9 }, tuningHistory: [{ label: '保存' }], voiceEnabled: true
  }, { lineId: 'gone', displayText: '删除', speaker: '乙', sourceFingerprint: 'gone' }];
  const source = [
    { lineId: 'same', displayText: '新文', speaker: '丙', kind: 'dialogue', sourceFingerprint: 'new', order: 1 },
    { lineId: 'new', displayText: '重复文本', speaker: '甲', kind: 'dialogue', sourceFingerprint: 'a', order: 2 },
    { lineId: 'new-2', displayText: '重复文本', speaker: '甲', kind: 'monologue', sourceFingerprint: 'b', order: 3 }
  ];
  const result = syncVoiceLines(old, source);
  assert.deepEqual(result.summary, { added: 2, modified: 1, deleted: 1, roleChanged: 1, kindChanged: 0, metadataChanged: 0 });
  const kept = result.lines[0];
  assert.equal(kept.speechText, '手作業');
  assert.equal(kept.styleId, 7);
  assert.deepEqual(kept.tuningHistory, [{ label: '保存' }]);
  assert.equal(kept.renderStale, true);
  assert.equal(result.lines[1].voiceEnabled, true);
  assert.equal(result.lines[2].voiceEnabled, false);
  assert.notEqual(result.lines[1].lineId, result.lines[2].lineId);
});

test('published classification changes update default inclusion but preserve explicit narration choice', () => {
  const defaultNarration = { lineId: 'default', displayText: '同文', speaker: '旁白', kind: 'monologue', sourceFingerprint: 'old', voiceEnabled: false, voiceSelection: 'default' };
  const manualNarration = { ...defaultNarration, lineId: 'manual', sourceFingerprint: 'old-2', voiceEnabled: true, voiceSelection: 'manual' };
  const source = [
    { ...defaultNarration, kind: 'dialogue', sourceFingerprint: 'new' },
    { ...manualNarration, voiceEnabled: undefined, voiceSelection: undefined, kind: 'monologue', sourceFingerprint: 'new-2' }
  ];
  const result = syncVoiceLines([defaultNarration, manualNarration], source);
  assert.equal(result.summary.kindChanged, 1);
  assert.equal(result.lines[0].voiceEnabled, true);
  assert.equal(result.lines[1].voiceEnabled, true);
});

test('publication validates current source and writes stable-ID WAV manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-p4-'));
  const renderDir = join(directory, 'renders');
  const outputDir = join(directory, 'published');
  const manifestFile = join(directory, 'voice-manifest.js');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(renderDir, { recursive: true });
  await writeFile(join(renderDir, 'cache.wav'), wav());
  const query = { speedScale: 1, accent_phrases: [] };
  const line = { lineId: 'review/same text', displayText: '中文', speaker: '爱理', kind: 'dialogue', sourceFingerprint: 'source', voiceEnabled: true, speechText: 'テスト', translationStatus: 'proofread', styleId: 2, audioQuery: query, renderStale: false };
  const queue = { renderDir, state: { tasks: [{ lineId: line.lineId, status: 'completed', speechText: 'テスト', styleId: 2, queryHash: hash(query), cacheKey: 'render', outputFile: 'cache.wav', engineIdentity: { uuid: 'engine' } }] } };
  const args = { project: { projectRevision: 'project', lines: [line] }, source: { sourceRevision: 'story', lines: [line] }, queue, outputDir, manifestFile, lineIds: [line.lineId] };
  const first = await publishVoiceManifest(args);
  const script = await readFile(manifestFile, 'utf8');
  assert.equal(first.count, 1);
  assert.match(script, /^\/\/ Generated/);
  assert.match(script, /sourceFingerprint/);
  const filename = first.manifest.entries[line.lineId].file.split('/').at(-1);
  assert.match(filename, /^[a-f0-9]{20}\.wav$/);
  const second = await publishVoiceManifest(args);
  assert.equal(second.manifest.entries[line.lineId].file, first.manifest.entries[line.lineId].file);
  // A previously synthesized line can later lose proofreading approval.
  for (const translationStatus of ['draft', 'untranslated', undefined]) {
    await assert.rejects(() => publishVoiceManifest({ ...args, project: { ...args.project, lines: [{ ...line, translationStatus }] } }), error => error.code === 'TRANSLATION_NOT_READY');
    assert.equal(await readFile(manifestFile, 'utf8'), `// Generated by the VOICEVOX editor. Consumed by the game VoicePlayer; publish only reviewed, current audio.\nwindow.ILY_VOICE_MANIFEST = ${JSON.stringify(second.manifest, null, 2)};\n`);
  }
  await assert.rejects(() => publishVoiceManifest({ ...args, source: { sourceRevision: 'changed', lines: [{ ...line, sourceFingerprint: 'changed' }] } }), error => error.code === 'SOURCE_STALE');
});

test('publication adds selected lines without dropping other current published dialogue', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-p4-merge-'));
  const renderDir = join(directory, 'renders');
  const outputDir = join(directory, 'published');
  const manifestFile = join(directory, 'voice-manifest.js');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(renderDir, { recursive: true });
  const lines = ['first', 'second'].map((lineId, index) => ({
    lineId, displayText: lineId, speaker: '角色', kind: 'dialogue', sourceFingerprint: `source-${lineId}`,
    voiceEnabled: true, speechText: `テスト${index}`, translationStatus: 'proofread', styleId: 2,
    audioQuery: { speedScale: 1, accent_phrases: [], index }, renderStale: false
  }));
  const tasks = [];
  for (const line of lines) {
    const outputFile = `${line.lineId}.wav`;
    await writeFile(join(renderDir, outputFile), wav());
    tasks.push({ lineId: line.lineId, status: 'completed', speechText: line.speechText, styleId: line.styleId,
      queryHash: hash(line.audioQuery), cacheKey: `render-${line.lineId}`, outputFile, engineIdentity: { uuid: 'engine' } });
  }
  const args = {
    project: { projectRevision: 'project', lines }, source: { sourceRevision: 'story', lines },
    queue: { renderDir, state: { tasks } }, outputDir, manifestFile
  };
  const first = await publishVoiceManifest({ ...args, lineIds: ['first'] });
  assert.deepEqual(Object.keys(first.manifest.entries), ['first']);
  const editedProject = { ...args.project, lines: [{ ...lines[0], translationStatus: 'draft', renderStale: true }, lines[1]] };
  const second = await publishVoiceManifest({ ...args, project: editedProject, lineIds: ['second'] });
  assert.equal(second.count, 1);
  assert.equal(second.totalCount, 2);
  assert.deepEqual(new Set(Object.keys(second.manifest.entries)), new Set(['first', 'second']));
  const recovered = await publishVoiceManifest({ ...args, project: editedProject, lineIds: [], recoverOnly: true });
  assert.equal(recovered.count, 0);
  assert.equal(recovered.totalCount, 2);
});
