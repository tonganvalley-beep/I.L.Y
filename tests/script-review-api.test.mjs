import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import vm from 'node:vm';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScriptReviewApi } from '../tools/script-review-api.mjs';
import { loadStory, serializeRecords } from '../tools/import-script-review.mjs';

async function fixture(t, load) {
  const directory = await mkdtemp(join(tmpdir(), 'ily-script-save-'));
  const filename = join(directory, 'script-edits.js');
  const original = await readFile(new URL('../game/data/story/script-edits.js', import.meta.url), 'utf8');
  await writeFile(filename, original);
  const server = http.createServer(createScriptReviewApi({ filename, ...(load ? { load } : {}) }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = () => fetch(base + '/api/script-review').then(r => r.json());
  const post = (data, headers = {}) => fetch(base + '/api/script-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(data) });
  return { directory, filename, original, get, post };
}

test('保存 API 实际写入正式 JS，重新加载后文本、图片与增删生效，并备份上一版', async t => {
  const { directory, filename, original, get, post } = await fixture(t);
  const before = await get();
  const records = structuredClone(before.records);
  records.s01_intro2 = { ...records.s01_intro2, text: '保存到项目的台词', background: 'bg-coast-night', portrait: 'portrait-airi' };
  records.review_api_test = { added: true, anchor: 's01_intro2', position: 'after', node: { type: 'dialogue', text: '', next: 's01_intro3' }, text: '新的一段', background: 'bg-coast-blue', portrait: '' };
  records.s01_intro3 = { ...records.s01_intro3, deleted: true };
  const response = await post({ revision: before.revision, records });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.notEqual(saved.revision, before.revision);
  assert.equal(saved.projectSaved, true);
  assert.deepEqual((await get()).records, records);
  assert.equal(await readFile(join(directory, 'script-edits.js.bak'), 'utf8'), original);
  assert.deepEqual((await readdir(directory)).sort(), ['script-edits.js', 'script-edits.js.bak']);
  const { context, story } = await loadStory();
  vm.runInContext(await readFile(filename, 'utf8'), context);
  context.ILYScriptReview.create(story).apply(context.ILY_SCRIPT_EDITS);
  assert.equal(story.nodes.s01_intro2.text, '保存到项目的台词');
  assert.equal(story.nodes.s01_intro2.background, 'bg-coast-night');
  assert.equal(story.nodes.s01_intro2.portrait, 'portrait-airi');
  assert.equal(story.nodes.s01_intro2.next, 'review_api_test');
  assert.equal(story.nodes.review_api_test.background, 'bg-coast-blue');
  assert.equal(story.nodes.s01_intro3.type, 'cue');
});

test('无效记录、跨站请求与并发旧版本都不能覆盖文件', async t => {
  const { filename, original, get, post } = await fixture(t);
  const before = await get();
  assert.equal((await post({ ...before, records: { missing: { text: '非法编号' } } })).status, 400);
  assert.equal((await post(before, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await post(before, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal(await readFile(filename, 'utf8'), original);
  // 重复提交同一份内容不会改写文件，属于幂等重写，不会丢更新。
  assert.deepEqual((await Promise.all([post(before), post(before)])).map(response => response.status), [200, 200]);
  // 两个不同修改并发提交时，后者必须被旧版本号挡住。
  const competing = { ...before, records: { ...before.records, s01_intro2: { ...before.records.s01_intro2, text: '并发的另一版台词' } } };
  const responses = await Promise.all([post(competing), post({ ...competing, records: { ...competing.records, s01_intro2: { ...competing.records.s01_intro2, text: '并发的第三版台词' } } })]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal((await post(before)).status, 409);
});

test('磁盘写入失败不会误报成功或损坏正式版本', async t => {
  const { mkdir } = await import('node:fs/promises');
  const { filename, directory, original, get, post } = await fixture(t);
  // A directory occupying the backup target simulates an unwritable destination.
  await mkdir(join(directory, 'script-edits.js.bak'));
  const response = await post(await get());
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /读写失败/);
  assert.equal(await readFile(filename, 'utf8'), original);
  assert.equal((await readdir(directory)).some(name => name.endsWith('.tmp')), false);
});

const editorSource = await readFile(new URL('../game/src/script-editor-window.js', import.meta.url), 'utf8');
const modelSource = await readFile(new URL('../game/src/script-review-model.js', import.meta.url), 'utf8');
async function editor(fetch, local = { s01_intro2: { text: '浏览器草稿', background: 'bg-coast-night' } }) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', disabled: false, children: [], replaceChildren() {}, querySelectorAll: () => [] });
    return elements.get(id);
  };
  const storage = new Map([['ily-script-review-v2', JSON.stringify(local)]]), messages = [], listeners = new Map();
  const context = vm.createContext({
    location: { protocol: 'http:' }, fetch, AbortSignal,
    document: { getElementById: element },
    localStorage: { getItem: key => storage.get(key), removeItem: key => storage.delete(key) },
    opener: { postMessage: message => messages.push(message) },
    addEventListener: (event, fn) => listeners.set(event, fn), setInterval() {},
    ILY_SCRIPT_EDITS: { s01_intro2: { text: '原版本' } }
  });
  context.window = context;
  vm.runInContext(modelSource, context); vm.runInContext(editorSource, context);
  await new Promise(resolve => setImmediate(resolve));
  return { element, messages, storage, context, listeners };
}
const jsonResponse = (data, status = 200) => ({ ok: status === 200, json: async () => data });
test('编辑器等待写盘成功才通知游戏；恢复按钮读取项目而不写入', async () => {
  let finish, postBody, posts = 0;
  const original = { s01_intro2: { text: '原版本' } };
  const ui = await editor(async (url, options) => {
    if (options.method === 'GET') return jsonResponse({ records: original, revision: 'r1', projectSaved: false });
    posts++; postBody = JSON.parse(options.body);
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = ui.element('save').onclick();
  assert.equal(ui.element('save').disabled, true);
  assert.equal(ui.messages.some(m => m.type === 'ily-script-save'), false);
  assert.equal(postBody.records.s01_intro2.background, 'bg-coast-night');
  finish(jsonResponse({ records: postBody.records, revision: 'r2', projectSaved: true }));
  await pending;
  assert.match(ui.element('status').textContent, /已写入项目/);
  assert.equal(ui.messages.at(-1).projectSaved, true);
  assert.equal(ui.storage.has('ily-script-review-v2'), false);
  await ui.element('clear').onclick();
  assert.equal(posts, 1);
  assert.equal(ui.messages.at(-1).records.s01_intro2.text, '原版本');
});

test('写盘失败保留草稿和离开提醒，不把未保存记录回传游戏', async () => {
  const ui = await editor(async (url, options) => options.method === 'GET'
    ? jsonResponse({ records: { s01_intro2: { text: '原版本' } }, revision: 'r1' })
    : jsonResponse({ error: '磁盘不可写' }, 500));
  await ui.element('save').onclick();
  assert.match(ui.element('status').textContent, /未确认保存到项目：磁盘不可写/);
  assert.equal(ui.messages.some(m => m.type === 'ily-script-save'), false);
  let prevented = false;
  ui.listeners.get('beforeunload')({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(ui.element('save').disabled, false);
});

test('已确认项目版本加载后忽略浏览器陈旧缓存', async () => {
  const records = { s01_intro2: { text: '项目最新版', background: 'bg-coast-blue', portrait: '' } };
  const ui = await editor(async () => jsonResponse({ records, revision: 'latest', projectSaved: true }));
  assert.equal(ui.messages.at(-1).records.s01_intro2.text, '项目最新版');
  // Exercise game startup in a different browser with stale legacy local edits.
  const { context, story } = await loadStory();
  vm.runInContext(serializeRecords(records) + 'window.ILY_SCRIPT_EDITS_PROJECT_SAVED = true;', context);
  context.localStorage = { getItem: () => JSON.stringify({ s01_intro2: { text: '旧缓存' } }) };
  context.document = { getElementById: () => ({}) };
  vm.runInContext(await readFile(new URL('../game/src/script-editor.js', import.meta.url), 'utf8'), context);
  context.ILY.initScriptEditor(story);
  assert.equal(story.nodes.s01_intro2.text, '项目最新版');
  assert.equal(story.nodes.s01_intro2.background, 'bg-coast-blue');
  assert.equal(story.nodes.s01_intro2.portrait, '');
});
