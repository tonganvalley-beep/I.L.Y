import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { loadStory, validateRecords, serializeRecords } from '../tools/import-script-review.mjs';

const publishedSource = await readFile(new URL('../game/data/story/script-edits.js', import.meta.url), 'utf8');
const editorSource = await readFile(new URL('../game/src/script-editor.js', import.meta.url), 'utf8');
const KEY = 'ily-script-review-v2';
async function start(local) {
  const { context, story } = await loadStory();
  const original = Object.fromEntries(Object.entries(story.nodes).map(([id, node]) => [id, { ...node }])), listeners = new Map(), storage = new Map();
  if (local) storage.set(KEY, JSON.stringify(local));
  context.addEventListener = (type, fn) => listeners.set(type, fn);
  context.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  context.document = { getElementById: () => ({}) };
  vm.runInContext(await readFile(new URL('../game/src/core/state.js', import.meta.url), 'utf8'), context);
  vm.runInContext(publishedSource, context);
  vm.runInContext(editorSource, context);
  context.ILY.initScriptEditor(story);
  return { context, story, original, storage, save: records => listeners.get('message')({ data: { type: 'ily-script-save', records } }) };
}

test('全新浏览器加载所有已发布文本、说话人、归类、新增与删除', async () => {
  const { context, story, original } = await start();
  const records = context.ILY_SCRIPT_EDITS;
  const summary = validateRecords(records, original);
  assert.deepEqual(summary, { records: 279, added: 17, deleted: 23, chapters: { prologue: 88, chapter1: 27, chapter2: 5, chapter3: 18, heroine: 38, final: 103 } });
  const beforeAnchors = new Set(Object.values(records).filter(r => r.added && r.position === 'before').map(r => r.anchor));
  for (const [id, record] of Object.entries(records)) {
    const node = story.nodes[!record.added && beforeAnchors.has(id) ? `${id}__review_body` : id];
    assert.ok(node, `未加载 ${id}`);
    if (record.deleted) {
      assert.equal(node.type, 'cue', id);
      assert.equal(node.text, '', id);
    } else {
      const source = record.added ? record.node : original[id];
      if (record.text != null) assert.equal(Object.hasOwn(source, 'text') || !Object.hasOwn(source, 'title') ? node.text : node.title, record.text, id);
      if (record.speaker != null) assert.equal(node.speaker, record.speaker, id);
      if (['dialogue', 'monologue', 'heroine-card', 'cue'].includes(source.type)) {
        if (record.kind === '台词') assert.equal(node.type, 'dialogue', id);
        if (record.kind === '旁白') assert.equal(node.type, source.type === 'heroine-card' ? 'heroine-card' : 'monologue', id);
        if (['内心', '演出'].includes(record.kind)) assert.equal(node.type, 'cue', id);
      }
    }
    if (node.next) assert.ok(story.nodes[node.next], `${id} 后续段落缺失`);
  }
  assert.equal(story.nodes.fin_116.text, '人们对于他人的牵挂之情，不应当被我们这群，在人类的儿戏之下诞生的怪物，肆意抹去。');
  for (const [id, node] of Object.entries(story.nodes)) {
    if (node.type === 'cue') assert.doesNotThrow(() => context.ILY.resolveScriptCues({ flags: { achievements: [] }, clues: [] }, story, id), id);
  }
});

test('原浏览器再次加载同一份记录不会重复新增或改变文本与连接', async () => {
  const fresh = await start();
  const existing = await start(fresh.context.ILY_SCRIPT_EDITS);
  assert.equal(JSON.stringify(existing.story.nodes), JSON.stringify(fresh.story.nodes));
  existing.save(existing.context.ILY_SCRIPT_EDITS);
  assert.equal(JSON.stringify(existing.story.nodes), JSON.stringify(fresh.story.nodes));
});

test('后续本地编辑覆盖指定字段，清除本地记录恢复已发布文本', async () => {
  const { context, story, save, storage } = await start({ fin_116: { text: '后续修改' } });
  assert.equal(story.nodes.fin_116.text, '后续修改');
  assert.equal(story.nodes.fin_116.speaker, 'ILY');
  assert.equal(story.nodes.fin_095.text, context.ILY_SCRIPT_EDITS.fin_095.text);
  save({});
  assert.equal(story.nodes.fin_116.text, context.ILY_SCRIPT_EDITS.fin_116.text);
  assert.equal(Object.keys(JSON.parse(storage.get(KEY))).length, 279);
});

test('导入导出完整保留文本和增删记录，并拒绝失效编号与循环插入', async () => {
  const { context, original } = await start();
  const output = vm.createContext({}); output.window = output;
  vm.runInContext(serializeRecords(context.ILY_SCRIPT_EDITS), output);
  assert.equal(JSON.stringify(output.ILY_SCRIPT_EDITS), JSON.stringify(context.ILY_SCRIPT_EDITS));
  assert.throws(() => validateRecords({ nonexistent: { text: '未定位文本' } }, original), /找不到原段落/);
  assert.throws(() => validateRecords({ fin_116: { background: 42 } }, original), /background 必须是文本/);
  assert.doesNotThrow(() => validateRecords({ fin_116: { background: 'bg-coast-blue', portrait: 'portrait-airi' } }, original));
  const node = { type: 'dialogue' };
  assert.throws(() => validateRecords({ x: { added: true, node, position: 'after', anchor: 'y' }, y: { added: true, node, position: 'after', anchor: 'x' } }, original), /循环/);
  for (const page of ['index.html', 'script-editor.html']) {
    const html = await readFile(new URL(`../game/${page}`, import.meta.url), 'utf8');
    assert.ok(html.indexOf('data/story/script-edits.js') > 0);
    assert.ok(html.indexOf('data/story/script-edits.js') < html.indexOf('src/script-review-model.js'));
  }
});
