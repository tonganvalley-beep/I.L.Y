import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');
async function harness() {
  const timers = new Map(), listeners = new Map();
  let serial = 0;
  const element = (tag, className = '', textContent = '') => ({
    tag, className, textContent, children: [], dataset: {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    remove() { this.removed = true; },
    setAttribute() {}, focus() {},
    querySelector(selector) { return this.children.find(child => child.className.includes(selector.slice(1))) || null; },
    addEventListener() {}, removeEventListener() {}
  });
  const context = vm.createContext({
    ILY: { data: { stories: {} }, el: element, mountScene(stage, node) { stage.append({ className: 'scene', node }); } },
    document: { hidden: false, querySelector: () => null },
    matchMedia: () => ({ matches: false }),
    setTimeout(fn, delay) { const id = ++serial; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }, clearInterval() {},
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); }
  });
  context.window = context;
  vm.runInContext(await read('game/data/story/heroine.js'), context);
  vm.runInContext(await read('game/src/modes/heroine.js'), context);
  const story = context.ILY.data.stories.heroine;
  const stage = element('main');
  const tick = () => {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id); timer.fn();
    return timer.delay;
  };
  return { context, story, stage, timers, tick, listeners };
}

test('store rewind follows edited links in reverse and keeps original character shots', async () => {
  const { context, story } = await harness();
  const frames = context.ILY.heroineRewindFrames(story, 'her_scene_01_01', 'her_scene_01_02');
  assert.deepEqual(Array.from(frames, frame => frame.id), ['her_0036', 'her_0035', 'her_0034', 'her_0033', 'her_0032', 'her_0031', 'her_0030']);
  assert.ok(frames.every(frame => frame.node.characters.some(character => character.position === 'right')));
  story.nodes.her_0031.type = 'cue';
  story.nodes.her_0032.next = 'inserted';
  story.nodes.inserted = { type: 'dialogue', text: '修改后的对白', next: 'her_0033' };
  const edited = context.ILY.heroineRewindFrames(story, 'her_scene_01_01', 'her_scene_01_02');
  assert.deepEqual(Array.from(edited, frame => frame.id), ['her_0036', 'her_0035', 'her_0034', 'her_0033', 'inserted', 'her_0032', 'her_0030']);
});

test('passerby scene stays grayscale, removes Airi and preserves Kio at the left', async () => {
  const { story } = await harness();
  for (const node of Object.values(story.nodes).filter(node => node.scene === '01-02')) {
    assert.deepEqual(Array.from(node.visualEffects), ['grayscale']);
    assert.ok(!(node.characters || []).some(character => /airi/.test(character.image)));
    assert.notEqual(node.speaker, 'ILY');
  }
  assert.equal(story.nodes.her_0037.characters[0].position, 'left');
  assert.equal(story.nodes.her_0038.characters[0].position, 'left');
  assert.ok(!story.nodes.her_scene_01_03.visualEffects?.includes('grayscale'));
});

test('automatic rewind pauses for menus, does not advance story, and cleans up timers', async () => {
  const { context, story, stage, timers, tick, listeners } = await harness();
  const go = [];
  const cleanup = context.ILY.mountHeroineMoment({ stage, story, assets: {},
    node: { ...story.nodes.her_scene_01_02, id: 'her_scene_01_02' }, go: id => go.push(id) });
  const reel = stage.children[0];
  tick(); assert.equal(reel.dataset.frame, 'her_0036');
  context.document.querySelector = () => ({});
  tick(); assert.equal(reel.dataset.frame, 'her_0036');
  context.document.querySelector = () => null;
  for (const id of ['her_0035', 'her_0034', 'her_0033', 'her_0032', 'her_0031', 'her_0030']) {
    tick(); assert.equal(reel.dataset.frame, id);
  }
  tick();
  assert.equal(reel.removed, true);
  assert.equal(stage.children.at(-1).className, 'heroine-moment heroine-card');
  assert.deepEqual(go, [], 'replayed lines never change story state or history');
  cleanup(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0);
  const cancel = context.ILY.mountHeroineMoment({ stage, story, assets: {}, node: story.nodes.her_scene_01_02, go() {} });
  tick(); cancel(); assert.equal(timers.size, 0);
});
