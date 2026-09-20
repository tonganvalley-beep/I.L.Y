import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../game/src/script-review-model.js', import.meta.url), 'utf8');
const cues = await readFile(new URL('../game/src/core/chapter1.js', import.meta.url), 'utf8');
function setup() {
  const context = vm.createContext({ ILY: {} }); context.window = context;
  vm.runInContext(source, context); vm.runInContext(cues, context);
  const story = { start: 'a', nodes: {
    a: { type: 'dialogue', text: '第一段', speaker: '基生', chapter: 'chapter2', scene: 'S01', background: 'room', next: 'b' },
    b: { type: 'monologue', text: '第二段', chapter: 'chapter2', scene: 'S01', setFlags: { checked: true }, next: 'choice' },
    choice: { type: 'choice', text: '选择', choices: [{ text: '回到开头', next: 'a' }] }
  } };
  const model = context.ILYScriptReview.create(story);
  const record = (anchor, position, text) => ({ added: true, anchor, position, node: context.ILYScriptReview.addition(story.nodes[anchor] || story.nodes.a), text, kind: '台词', speaker: '爱理' });
  const play = () => {
    const state = { flags: { achievements: [] }, clues: [] }, lines = [];
    let id = story.start;
    for (let step = 0; step < 20; step++) {
      id = context.ILY.resolveScriptCues(state, story, id);
      const node = story.nodes[id]; assert.ok(node, `Missing node ${id}`);
      if (node.type === 'choice') return { lines, state };
      lines.push(node.text); id = node.next;
    }
    assert.fail('Playback did not reach the choice');
  };
  return { context, story, model, record, play };
}

test('已有段落的旁白和内心分类控制播放类型，切回台词和清除修改可恢复', () => {
  const { story, model } = setup();
  model.apply({ a: { kind: '旁白', text: '新的旁白' }, b: { kind: '台词', speaker: '爱理' }, choice: { kind: '旁白' } });
  assert.equal(story.nodes.a.type, 'monologue');
  assert.equal(story.nodes.a.text, '新的旁白');
  assert.equal(story.nodes.a.background, 'room');
  assert.equal(story.nodes.a.next, 'b');
  assert.equal(story.nodes.b.type, 'dialogue');
  assert.equal(story.nodes.choice.type, 'choice');
  model.apply({ a: { kind: '内心' } });
  assert.equal(story.nodes.a.type, 'cue');
  model.apply({ a: { kind: '演出' } });
  assert.equal(story.nodes.a.type, 'cue');
  model.apply({});
  assert.equal(story.nodes.a.type, 'dialogue');
  assert.equal(story.nodes.b.type, 'monologue');
});

test('背景和立绘修改会覆盖实际渲染字段，清除记录后恢复原场景', () => {
  const { story, model } = setup();
  story.nodes.a.cg = 'old-cg';
  story.nodes.a.characters = [{ image: 'old-left', position: 'left' }, { image: 'old-right', position: 'right' }];
  model.base.a.cg = 'old-cg';
  model.base.a.characters = [{ image: 'old-left', position: 'left' }, { image: 'old-right', position: 'right' }];
  model.apply({ a: { background: 'new-background', portrait: 'new-portrait' } });
  assert.equal(story.nodes.a.background, 'new-background');
  assert.equal(story.nodes.a.portrait, 'new-portrait');
  assert.equal(story.nodes.a.cg, undefined);
  assert.equal(story.nodes.a.characters, undefined);
  model.apply({});
  assert.equal(story.nodes.a.background, 'room');
  assert.equal(story.nodes.a.cg, 'old-cg');
  assert.deepEqual(story.nodes.a.characters, [{ image: 'old-left', position: 'left' }, { image: 'old-right', position: 'right' }]);
});

test('多人物修改保留立绘列表和站位，空列表会明确清空，旧单立绘记录仍兼容', () => {
  const { story, model } = setup();
  story.nodes.a.portrait = 'old-center';
  model.base.a.portrait = 'old-center';
  const characters = [{ image: 'new-left', position: 'left' }, { image: 'new-right', position: 'right' }];
  model.apply({ a: { characters } });
  assert.equal(JSON.stringify(story.nodes.a.characters), JSON.stringify(characters));
  assert.equal(story.nodes.a.portrait, undefined);
  model.apply({ a: { characters: [] } });
  assert.deepEqual(story.nodes.a.characters, []);
  assert.equal(story.nodes.a.portrait, undefined);
  model.apply({ a: { portrait: 'legacy-center' } });
  assert.equal(story.nodes.a.portrait, 'legacy-center');
  assert.equal(story.nodes.a.characters, undefined);
});

test('新增段继承图片且发布 JS 序列化完整保留图片修改', () => {
  const { context, story } = setup();
  story.nodes.a.portrait = 'portrait-kio';
  const added = context.ILYScriptReview.addition(story.nodes.a);
  assert.equal(added.background, 'room');
  assert.equal(added.portrait, 'portrait-kio');
  const records = { a: { background: 'bg-next', portrait: '' } };
  const output = vm.createContext({}); output.window = output;
  vm.runInContext(context.ILYScriptReview.serializeRecords(records), output);
  assert.equal(JSON.stringify(output.ILY_SCRIPT_EDITS), JSON.stringify(records));
});

test('新增段落继承多人物配置且不共享人物对象', () => {
  const { context, story } = setup();
  story.nodes.a.characters = [{ image: 'left', position: 'left' }, { image: 'right', position: 'right' }];
  const added = context.ILYScriptReview.addition(story.nodes.a);
  assert.equal(JSON.stringify(added.characters), JSON.stringify(story.nodes.a.characters));
  added.characters[0].image = 'changed';
  assert.equal(story.nodes.a.characters[0].image, 'left');
});

test('序章原有旁白默认全屏显示，明确的台词覆盖与女主标题卡保持有效', async () => {
  const { context } = setup();
  context.ILY.data = { stories: {} };
  vm.runInContext(await readFile(new URL('../game/data/story/prologue.js', import.meta.url), 'utf8'), context);
  const story = context.ILY.data.stories.prologue;
  story.nodes.card = { type: 'heroine-card', text: '标题', next: 's01_intro' };
  const model = context.ILYScriptReview.create(story);
  assert.equal(context.ILYScriptReview.kind(story.nodes.s01_intro), '旁白');
  model.apply({});
  assert.equal(story.nodes.s01_intro.type, 'monologue');
  assert.equal(story.nodes.s01_intro2.type, 'dialogue');
  assert.equal(story.nodes.s01_phone.type, 'phone');
  assert.equal(story.nodes.card.type, 'heroine-card');
  model.apply({ card: { kind: '旁白', text: '修改后的标题' } });
  assert.equal(story.nodes.card.type, 'heroine-card');
  model.apply({ s01_intro: { kind: '台词' } });
  assert.equal(story.nodes.s01_intro.type, 'dialogue');
});

test('编辑器保存立即通知当前段刷新，重复同步不刷新，清除后恢复', async () => {
  const { context, story } = setup();
  const listeners = new Map(), storage = new Map(), refreshes = [];
  context.addEventListener = (type, handler) => listeners.set(type, handler);
  context.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  context.document = { getElementById: () => ({}) };
  vm.runInContext(await readFile(new URL('../game/src/script-editor.js', import.meta.url), 'utf8'), context);
  context.ILY.initScriptEditor(story, (...args) => {
    refreshes.push(args);
    context.ILY.updateScriptEditor(Object.assign(story.nodes.a, { id: 'a' }));
  });
  context.ILY.updateScriptEditor(Object.assign(story.nodes.a, { id: 'a' }));
  const save = records => listeners.get('message')({ data: { type: 'ily-script-save', records } });
  save({ a: { kind: '旁白', text: '保存后立即显示' } });
  assert.equal(story.nodes.a.type, 'monologue');
  assert.deepEqual(refreshes, [['a', 'b']]);
  save({ a: { kind: '旁白', text: '保存后立即显示' } });
  assert.equal(refreshes.length, 1);
  save({});
  assert.equal(refreshes.length, 2);
  assert.equal(story.nodes.a.type, 'dialogue');
});

test('剧本编辑入口提供独立窗口链接', async () => {
  const html = await readFile(new URL('../game/index.html', import.meta.url), 'utf8');
  assert.match(html, /<a id="script-editor-toggle" href="script-editor\.html" target="ily-script-editor" role="button"/);
});

test('剧本编辑器成功弹窗并保留当前游戏页', async () => {
  const { context, story } = setup();
  const listeners = new Map(), storage = new Map(), button = {};
  const opened = [], popupMessages = [];
  let prevented = false;
  context.URL = URL;
  context.location = { href: 'http://127.0.0.1:8080/game/index.html?entry=chapters&chapter=1' };
  context.addEventListener = (type, handler) => listeners.set(type, handler);
  context.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  context.document = { getElementById: () => button };
  context.open = (...args) => { opened.push(args); return { closed: false, postMessage: message => popupMessages.push(message) }; };
  vm.runInContext(await readFile(new URL('../game/src/script-editor.js', import.meta.url), 'utf8'), context);
  context.ILY.initScriptEditor(story);
  context.ILY.updateScriptEditor(Object.assign(story.nodes.a, { id: 'a' }));
  button.onclick({ preventDefault: () => { prevented = true; } });
  assert.deepEqual(opened, [[
    'http://127.0.0.1:8080/game/script-editor.html',
    'ily-script-editor',
    'popup=yes,width=960,height=800,resizable=yes,scrollbars=yes'
  ]]);
  assert.equal(prevented, true);
  assert.equal(JSON.parse(storage.get('ily-script-live-state')).current.id, 'a');
  assert.equal(popupMessages.at(-1).current.id, 'a');
});

test('弹窗接口缺失或被拦截时保留原生第二标签页行为', async () => {
  for (const blocked of [false, true]) {
    const { context, story } = setup();
    const storage = new Map(), button = {};
    let prevented = false;
    context.URL = URL;
    context.location = { href: 'http://127.0.0.1:8080/game/index.html?entry=chapters&chapter=1' };
    context.addEventListener = () => {};
    context.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
    context.document = { getElementById: () => button };
    if (blocked) context.open = () => null;
    vm.runInContext(await readFile(new URL('../game/src/script-editor.js', import.meta.url), 'utf8'), context);
    context.ILY.initScriptEditor(story);
    context.ILY.updateScriptEditor(Object.assign(story.nodes.a, { id: 'a' }));
    button.onclick({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, false, '应允许带 target 的链接继续默认导航');
    assert.equal(JSON.parse(storage.get('ily-script-live-state')).current.id, 'a');
  }
});

test('新增首段、连续新增和删除原段后，播放与编辑器顺序一致且保留分支入口', () => {
  const { story, model, record, play, context } = setup();
  const records = {
    first: record('a', 'before', '新首段'),
    after: record('a', 'after', '新增段'),
    nested: record('after', 'before', '连续新增'),
    a: { deleted: true }, b: { text: '修改后的第二段' }
  };
  model.apply(records);
  assert.deepEqual(play().lines, ['新首段', '连续新增', '新增段', '修改后的第二段']);
  assert.equal(story.nodes.choice.choices[0].next, 'a');
  assert.equal(context.ILY.resolveScriptCues({ flags: { achievements: [] } }, story, 'a'), 'first');
  const order = context.ILYScriptReview.ordered(Object.entries(model.base), records).filter(([id]) => !records[id]?.deleted).map(([id]) => records[id]?.text || model.base[id]?.text);
  assert.equal(JSON.stringify(order.slice(0, -1)), JSON.stringify(play().lines));
});

test('保存记录往返后不会重复新增；删除仍执行原段标记，清除恢复文本和链接', () => {
  const { story, model, record, play } = setup();
  const records = { x: record('a', 'after', '补充'), b: { deleted: true } };
  model.apply(records); model.apply(JSON.parse(JSON.stringify(records)));
  assert.deepEqual(play().lines, ['第一段', '补充']);
  assert.equal(play().state.flags.checked, true);
  assert.equal(Object.keys(story.nodes).length, 4);
  const fresh = setup(); fresh.model.apply(JSON.parse(JSON.stringify(records)));
  assert.deepEqual(fresh.play().lines, play().lines);
  model.apply({});
  assert.deepEqual(play().lines, ['第一段', '第二段']);
  assert.equal(story.nodes.a.next, 'b'); assert.equal(story.nodes.x, undefined);
});

test('新增段删除与恢复不丢失其子段；旧文本修改记录兼容', () => {
  const { model, record, play } = setup();
  const records = { a: { text: '旧记录', speaker: 'ILY', kind: '台词' }, x: record('a', 'after', '父段'), y: record('x', 'after', '子段') };
  records.x.deleted = true; model.apply(records);
  assert.deepEqual(play().lines, ['旧记录', '子段', '第二段']);
  records.x.deleted = false; model.apply(records);
  assert.deepEqual(play().lines, ['旧记录', '父段', '子段', '第二段']);
});

test('新增段继承场景但不复制奖励；保存和清除时已挂载段落仍能继续', () => {
  const { story, model, record, context } = setup();
  const added = context.ILYScriptReview.addition(story.nodes.b);
  assert.equal(added.chapter, 'chapter2'); assert.equal(added.setFlags, undefined);
  const mounted = story.nodes.a;
  model.apply({ x: record('a', 'after', '一'), y: record('x', 'after', '二') });
  assert.equal(mounted.next, 'x');
  const mountedAdded = story.nodes.x;
  model.apply({});
  assert.equal(mountedAdded.next, 'b');
  assert.equal(context.ILYScriptReview.canDelete(story.nodes.choice), false);
});
