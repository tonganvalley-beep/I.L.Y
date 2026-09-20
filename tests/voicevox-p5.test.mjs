import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createProjectStore } from '../tools/voicevox/project-store.mjs';
import { parseDelimited, validateImport } from '../tools/voicevox/import-parser.mjs';
import { resolveStyle } from '../tools/voicevox/style-selection.mjs';
import { createVoicevoxApi } from '../tools/voicevox-api.mjs';
import { filterLines, pageLines } from '../tools/voicevox/worktable.mjs';

test('5,000-line project saves, reopens, backs up, and rejects corrupt data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ily-voicevox-p5-project-'));
  const filename = join(directory, 'voicevox-project.json');
  const store = createProjectStore({ filename });
  const lines = Array.from({ length: 5000 }, (_, index) => ({
    lineId: `line-${index}`,
    displayText: `中文 ${index}`,
    speechText: `テスト ${index}`,
    styleId: 2,
    translationStatus: 'proofread',
    tuning: { speedScale: 1 + (index % 5) / 100 },
    tuningHistory: [{ label: 'P5', value: { speedScale: 1 } }]
  }));
  const first = await store.saveProject({ lines, rolePresets: { 主角: { styleId: 2 } } });
  const reopened = await store.readProject();
  assert.equal(reopened.lines.length, 5000);
  assert.deepEqual(reopened.lines[4999].tuningHistory, lines[4999].tuningHistory);
  const second = await store.saveProject({ ...reopened, lines: reopened.lines.map((line, index) => index === 0 ? { ...line, speechText: '保存重开' } : line) }, first.projectRevision);
  assert.notEqual(second.projectRevision, first.projectRevision);
  assert.equal(JSON.parse(await readFile(`${filename}.bak`, 'utf8')).projectRevision, first.projectRevision);
  const concurrent = await Promise.allSettled([
    store.saveProject({ ...second, lines: second.lines.map((line, index) => index === 1 ? { ...line, speechText: '窗口 A' } : line) }, second.projectRevision),
    store.saveProject({ ...second, lines: second.lines.map((line, index) => index === 1 ? { ...line, speechText: '窗口 B' } : line) }, second.projectRevision)
  ]);
  assert.deepEqual(concurrent.map(result => result.status).sort(), ['fulfilled', 'rejected']);
  assert.equal(concurrent.find(result => result.status === 'rejected').reason.code, 'CONFLICT');
  await writeFile(filename, '{broken', 'utf8');
  await assert.rejects(() => store.readProject(), error => error.code === 'INVALID_PROJECT' && /\.bak/.test(error.message));
  await writeFile(filename, JSON.stringify({ lines: [{ lineId: 'same' }, { lineId: 'same' }] }), 'utf8');
  await assert.rejects(() => store.readProject(), error => error.code === 'INVALID_PROJECT' && /重复/.test(error.message));
});

test('import boundaries reject ragged rows, invalid status, and invalid style IDs', () => {
  assert.throws(() => parseDelimited('line_id,speech_text\na,ok,extra', ','), /字段数/);
  assert.throws(() => parseDelimited('line_id,line_id\na,b', ','), /重复字段名/);
  const result = validateImport([{ name: 'bad.tsv', rows: [
    { __row: 2, line_id: 'a', speech_text: 'あ', translation_status: 'done' },
    { __row: 3, line_id: 'b', speech_text: 'い', style_id: 'voice-two' }
  ] }], ['a', 'b']);
  assert.equal(result.updates.length, 0);
  assert.match(result.errors.join('\n'), /翻译状态无效/);
  assert.match(result.errors.join('\n'), /风格 ID 必须是整数/);
});

test('missing engine style is explicit and never remapped to another style', () => {
  const styles = [{ styleId: 2, styleName: 'Normal' }];
  assert.deepEqual(resolveStyle(styles, { styleId: 99, styleName: '旧风格' }), { style: null, missing: true, label: '旧风格' });
  assert.equal(resolveStyle(styles, { styleId: 2 }).style.styleId, 2);
});

test('5,000-line worktable filters and paginates the complete data set', () => {
  const lines = Array.from({ length: 5000 }, (_, index) => ({
    lineId: `line-${index}`,
    chapter: `chapter-${index % 5}`,
    speaker: `speaker-${index % 10}`,
    displayText: `中文正文 ${index}`,
    speechText: index % 3 ? `日本語 ${index}` : '',
    translationStatus: index % 2 ? 'proofread' : 'draft',
    audioQuery: index % 2 ? { accent_phrases: [] } : null
  }));
  assert.equal(filterLines(lines, {}).length, 5000);
  assert.equal(filterLines(lines, { chapter: 'chapter-2' }).length, 1000);
  assert.equal(filterLines(lines, { speaker: 'speaker-7' }).length, 500);
  assert.equal(filterLines(lines, { search: 'line-4999' })[0].lineId, 'line-4999');
  assert.ok(filterLines(lines, { status: 'ready' }).every(line => line.translationStatus === 'proofread' && line.audioQuery));
  const last = pageLines(lines, 99, 200);
  assert.equal(last.pages, 25);
  assert.equal(last.page, 24);
  assert.equal(last.visible.length, 200);
  assert.equal(last.visible[0].lineId, 'line-4800');
});

test('worktable groups aliases by voice role and follows integrated dubbing order', () => {
  const lines = [
    { lineId: 'second', speaker: '爱理', voiceRole: '百合沢爱理', voiceOrder: 2, displayText: '二' },
    { lineId: 'first', speaker: '“爱理”', voiceRole: '百合沢爱理', voiceOrder: 1, displayText: '一' },
    { lineId: 'stage', speaker: '百合沢爱理', voiceRole: '百合沢爱理', voiceOrder: 0, voiceEnabled: false, displayText: '动作描写' },
    { lineId: 'other', speaker: '主管', voiceRole: '主管', voiceOrder: 3, displayText: '三' }
  ];
  assert.deepEqual(filterLines(lines, { speaker: '百合沢爱理' }).map(line => line.lineId), ['first', 'second']);
  assert.equal(filterLines(lines, { search: '百合沢爱理' }).length, 3);
});

test('VOICEVOX API rejects cross-site/non-JSON writes and reports an offline engine', async t => {
  const queue = { init: async () => ({}), snapshot: () => ({ tasks: [], counts: {} }) };
  const offline = Object.assign(new Error('engine offline'), { code: 'ENGINE_OFFLINE' });
  const handler = createVoicevoxApi({
    root: await mkdtemp(join(tmpdir(), 'ily-voicevox-p5-api-')),
    engineClient: { status: async () => { throw offline; } },
    sourceLoader: async () => ({ lines: [] }),
    projectReader: async () => ({ projectRevision: null, lines: [] }),
    projectWriter: async project => project,
    queue
  });
  const server = http.createServer((request, response) => handler(request, response, new URL(request.url, 'http://127.0.0.1').pathname));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/voicevox/status`)).status, 503);
  assert.equal((await fetch(`${base}/api/voicevox/source`, { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal((await fetch(`${base}/api/voicevox/project`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
});
