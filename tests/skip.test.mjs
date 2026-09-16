import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function createHarness(skipping = true) {
  const timers = new Map();
  const windowListeners = new Map();
  let timerId = 0;
  const element = (tag = '', className = '', textContent = '') => ({
    tag, className, textContent, hidden: false, children: [],
    append(...nodes) { this.children.push(...nodes); },
    querySelector(selector) { return this.children.find(child => child.className.split(' ').includes(selector.slice(1))) || null; },
    addEventListener(type, handler) { this.listeners ||= new Map(); this.listeners.set(type, handler); },
    removeEventListener() {},
    focus() {}
  });
  const context = vm.createContext({
    matchMedia: () => ({ matches: false }),
    setInterval: () => ++timerId,
    clearInterval() {},
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id)
  });
  context.window = context;
  context.document = { querySelector: () => null };
  context.addEventListener = (type, handler) => windowListeners.set(type, handler);
  context.removeEventListener = () => {};
  context.ILY = {
    t: key => key,
    el: element,
    button: (label, onClick) => Object.assign(element('button', '', label), { onClick }),
    mountScene() {}
  };
  const stage = element('section');
  return {
    context, stage, timers, windowListeners,
    isSkipping: () => skipping,
    setSkipping: value => { skipping = value; }
  };
}

test('剧情快进会加速普通对白，但不会自动越过选项', async () => {
  const harness = createHarness(true);
  vm.runInContext(await readFile(new URL('../game/src/modes/dialogue.js', import.meta.url), 'utf8'), harness.context);
  const nextNodes = [];
  const dialogue = { type: 'dialogue', speaker: '旁白', text: '很长的一段剧情。', next: 'choice' };
  const cleanup = harness.context.ILY.mountDialogue({
    stage: harness.stage, node: dialogue, state: { flags: {} }, assets: { setMusic() {} },
    go: id => nextNodes.push(id), isSkipping: harness.isSkipping, setSkipping: harness.setSkipping
  });
  assert.equal(harness.context.ILY.isDialogueSkippable(dialogue), true);
  assert.equal(harness.stage.children[0].children[1].textContent, dialogue.text, '开始跳过后应立即显示完整当前对白');
  const timer = [...harness.timers.values()][0];
  assert.equal(timer.delay, 140);
  timer.fn();
  assert.deepEqual(nextNodes, ['choice']);
  cleanup();

  const choiceHarness = createHarness(true);
  choiceHarness.context.ILY = harness.context.ILY;
  const choice = { type: 'choice', text: '要怎么做？', choices: [{ text: '留下', next: 'stay' }] };
  harness.context.ILY.mountDialogue({
    stage: choiceHarness.stage, node: choice, state: { flags: {} }, assets: { setMusic() {} },
    go: id => nextNodes.push(id), isSkipping: choiceHarness.isSkipping, setSkipping: choiceHarness.setSkipping
  });
  assert.equal(harness.context.ILY.isDialogueSkippable(choice), false);
  assert.equal(choiceHarness.timers.size, 0, '选项节点不能被跳过');
});

test('屏幕旁白支持播放中开启快进、零等待整段跳过以及点击停止', async () => {
  const harness = createHarness(false);
  vm.runInContext(await readFile(new URL('../game/src/modes/heroine.js', import.meta.url), 'utf8'), harness.context);
  const nextNodes = [];
  const cleanup = harness.context.ILY.mountHeroineMoment({
    stage: harness.stage, node: { type: 'monologue', text: '屏幕上的旁白', next: 'next' },
    assets: {}, go: id => nextNodes.push(id), isSkipping: harness.isSkipping,
    setSkipping: harness.setSkipping, getSkipDelay: () => 0
  });
  assert.equal(harness.timers.size, 0);
  harness.setSkipping(true);
  harness.windowListeners.get('ily:skipchange')();
  const timer = [...harness.timers.values()][0];
  assert.equal(timer.delay, 0);
  assert.equal(harness.stage.children[0].children[0].textContent, '屏幕上的旁白');
  harness.stage.listeners.get('click')({ target: { closest: () => null }, preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(harness.isSkipping(), false);
  timer.fn();
  assert.deepEqual(nextNodes, []);
  harness.setSkipping(true);
  harness.windowListeners.get('ily:skipchange')();
  [...harness.timers.values()][0].fn();
  assert.deepEqual(nextNodes, ['next']);
  cleanup();
});

test('整段跳过使用零等待连续推进', async () => {
  const harness = createHarness(true);
  vm.runInContext(await readFile(new URL('../game/src/modes/dialogue.js', import.meta.url), 'utf8'), harness.context);
  harness.context.ILY.mountDialogue({
    stage: harness.stage,
    node: { type: 'dialogue', text: '本段剧情', next: 'boundary' },
    state: { flags: {} }, assets: { setMusic() {} }, go() {},
    isSkipping: harness.isSkipping, setSkipping: harness.setSkipping, getSkipDelay: () => 0
  });
  assert.equal([...harness.timers.values()][0].delay, 0);
});

test('跳过状态可由点击画面立刻停止', async () => {
  const harness = createHarness(true);
  vm.runInContext(await readFile(new URL('../game/src/modes/dialogue.js', import.meta.url), 'utf8'), harness.context);
  let stopped = false;
  harness.context.ILY.mountDialogue({
    stage: harness.stage,
    node: { type: 'dialogue', text: '对白', next: 'next' },
    state: { flags: {} }, assets: { setMusic() {} }, go() {},
    isSkipping: () => !stopped, setSkipping: value => { stopped = !value; }
  });
  const click = harness.stage.listeners.get('click');
  let prevented = false, propagationStopped = false;
  click({
    target: { closest: () => null },
    preventDefault() { prevented = true; },
    stopImmediatePropagation() { propagationStopped = true; }
  });
  assert.equal(stopped, true);
  assert.equal(prevented, true);
  assert.equal(propagationStopped, true);
});

test('游戏顶栏同时提供快进和整段跳过入口', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../game/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../game/src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="skip"[^>]*>快进<\/button>/);
  assert.match(html, /id="skip-segment"[^>]*>整段跳过<\/button>/);
  assert.match(source, /skipMode === 'segment' \? 0 : 140/);
});
