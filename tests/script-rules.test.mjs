import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseLine } from '../tools/script-rules.mjs';

test('统一符号：台词、画面旁白、心声、括号说明与错误标签', async () => {
  const cases = JSON.parse(await readFile(new URL('./script-rule-cases.json', import.meta.url), 'utf8'));
  for (const sample of cases) {
    if (sample.error) assert.throws(() => parseLine(sample.line), sample.line);
    else assert.deepEqual(parseLine(sample.line), sample.expected, sample.line);
  }
});

test('编译章节不把旁白、心声和括号说明送进对话框', async () => {
  const context = vm.createContext({ ILY: { data: { stories: {} } } });
  for (const chapter of ['chapter1', 'chapter2', 'chapter3', 'heroine', 'final']) {
    vm.runInContext(await readFile(new URL(`../game/data/story/${chapter}.js`, import.meta.url), 'utf8'), context);
    const nodes = Object.values(context.ILY.data.stories[chapter].nodes);
    assert.ok(nodes.some(node => node.type === 'monologue'), chapter);
    assert.ok(nodes.some(node => node.type === 'cue'), chapter);
    for (const node of nodes) {
      assert.doesNotMatch(node.speaker || '', /内心|心声/);
      if (node.type === 'cue') { assert.equal(node.text, ''); assert.ok(node.next); }
      if (node.type === 'dialogue') {
        assert.notEqual(node.speaker, '旁白');
        assert.ok(node.text);
        assert.doesNotMatch(node.text + node.speaker, /[（）()]/);
      }
    }
  }
});

test('连续省略内容直接跳到台词，保留正确分支线索和章节结束标记', async () => {
  const context = vm.createContext({ ILY: { addClue: (state, clue) => state.clues.push(clue) } });
  vm.runInContext(await readFile(new URL('../game/src/core/chapter1.js', import.meta.url), 'utf8'), context);
  const story = { nodes: {
    a: { type: 'cue', chapter: 'chapter1', route: 'A', clue: 'wrong', next: 'b' },
    b: { type: 'cue', chapter: 'chapter1', route: 'B', clue: 'P1', next: 'c' },
    c: { type: 'cue', when: { key: 'n2', value: 'A' }, setFlags: { WRONG: true }, next: 'd' },
    d: { type: 'cue', setFlags: { HEROINE_POV_COMPLETE: true }, next: 'spoken' },
    spoken: { type: 'dialogue', speaker: '基生', text: '你还好吗？' }
  } };
  const state = { flags: { route: 'B', n2: 'B', achievements: [] }, clues: [] };
  assert.equal(context.ILY.resolveScriptCues(state, story, 'a'), 'spoken');
  assert.deepEqual(state.clues, ['P1']);
  assert.equal(state.flags.WRONG, undefined);
  assert.equal(state.flags.HEROINE_POV_COMPLETE, true);
  story.nodes.d.next = 'a';
  assert.throws(() => context.ILY.resolveScriptCues(state, story, 'a'), /cycle/);
});

test('旁白渲染在场景文字层，无底部对话框，保留演出并支持推进', async () => {
  const listeners = new Map();
  const makeElement = (tag, className = '', textContent = '') => ({
    tag, className, textContent, children: [],
    append(...nodes) { this.children.push(...nodes); },
    querySelector(selector) { return this.children.find(child => child.className === selector.slice(1)) || null; },
    addEventListener(type, handler) { listeners.set(type, handler); },
    removeEventListener() {}, focus() {}
  });
  const effects = [], music = [], visited = [];
  const context = vm.createContext({
    ILY: { el: makeElement, mountScene: () => {} },
    document: { querySelector: () => null }, matchMedia: () => ({ matches: true }),
    clearInterval() {}, clearTimeout() {}
  });
  context.window = { addEventListener() {}, removeEventListener() {} };
  vm.runInContext(await readFile(new URL('../game/src/modes/heroine.js', import.meta.url), 'utf8'), context);
  const stage = makeElement('main');
  stage.querySelector = () => ({ classList: { add: effect => effects.push(effect) } });
  const cleanup = context.ILY.mountHeroineMoment({ stage,
    node: { type: 'monologue', text: '海风停了。', sceneEffect: 'kiss', bgm: 'sea', next: 'next' },
    assets: { setMusic: value => music.push(value) }, go: id => visited.push(id)
  });
  assert.equal(stage.children.length, 1);
  assert.equal(stage.children[0].className, 'heroine-moment heroine-monologue');
  assert.equal(stage.children[0].children[0].textContent, '海风停了。');
  assert.deepEqual(effects, ['chapter-kiss']);
  assert.deepEqual(music, ['sea']);
  listeners.get('click')({ target: { closest: () => null }, preventDefault() {} });
  assert.deepEqual(visited, ['next']);
  cleanup();
});
