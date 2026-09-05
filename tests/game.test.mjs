import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({});
context.window = context;
const run = async file => vm.runInContext(await readFile(new URL(file, import.meta.url), 'utf8'), context, {filename:file});
await run('../game/src/bootstrap.js');
await run('../game/src/core/state.js');
await run('../game/data/story/prologue.js');
await run('../game/data/maps/classroom.js');
await run('../game/data/battles/first-trial.js');
const { createState, addClue, canWalk, canDeduce, validateSave } = context.ILY;
const story = context.ILY.data.stories.prologue;
const map = context.ILY.data.maps.classroom;

test('剧情所有分支都有目标，地图和弹幕配置均存在', async () => {
  const visited = new Set();
  async function visit(id) {
    assert.ok(Object.hasOwn(story.nodes,id),`节点不存在：${id}`);
    if(visited.has(id)) return; visited.add(id);
    const node=story.nodes[id];
    if(node.map) assert.ok(context.ILY.data.maps[node.map]);
    if(node.level) {const level=context.ILY.data.levels[node.level];assert.ok(level.duration>0 && level.hp>0);}
    if(node.next) await visit(node.next);
    for(const choice of node.choices || []) await visit(choice.next);
  }
  await visit(story.start); assert.equal(visited.size,Object.keys(story.nodes).length);
});
test('地图阻挡生效，每个线索都可从出生点走到', () => {
  assert.equal(canWalk(map,0,0),false);assert.equal(canWalk(map,-1,3),false);
  const queue=[map.spawn], seen=new Set();
  for(let i=0;i<queue.length;i++) {
    const {x,y}=queue[i]; const key=`${x},${y}`;if(seen.has(key))continue;seen.add(key);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(canWalk(map,x+dx,y+dy))queue.push({x:x+dx,y:y+dy});
  }
  for(const spot of map.hotspots)assert.ok(seen.has(`${spot.x},${spot.y}`),spot.id);
});
test('线索不重复，推理必须收集完整证据', () => {
  const state=createState();assert.equal(canDeduce(state,map.deduction),false);
  addClue(state,'letter');addClue(state,'letter');assert.equal(state.clues.length,1);assert.equal(canDeduce(state,map.deduction),false);
  addClue(state,'record');assert.equal(canDeduce(state,map.deduction),true);
});
test('存档往返保留位置和线索，拒绝损坏或不兼容的存档', () => {
  const state=createState('classroom');state.maps.classroom={...map.spawn};addClue(state,'letter');
  assert.equal(JSON.stringify(validateSave(JSON.parse(JSON.stringify(state)),story,{classroom:map})),JSON.stringify(state));
  for(const invalid of [null,{...state,version:99},{...state,node:'missing'},{...state,maps:{classroom:{x:0,y:0}}},{...state,clues:42}])assert.throws(()=>validateSave(invalid,story,{classroom:map}));
});

test('双击入口的所有脚本存在，普通脚本无需服务或模块加载', async () => {
  const html = await readFile(new URL('../game/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /type=["']module["']/);
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
  assert.equal(scripts[0], 'src/bootstrap.js');
  assert.equal(scripts.at(-1), 'src/main.js');
  const fresh = vm.createContext({}); fresh.window = fresh;
  for (const script of scripts) {
    const source = await readFile(new URL(`../game/${script}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /^\s*(import|export)\s|\bfetch\s*\(|XMLHttpRequest/m);
    new vm.Script(source, {filename:script});
    if (script !== 'src/main.js') vm.runInContext(source, fresh, {filename:script});
  }
  for (const name of ['mountDialogue','mountExploration','mountBattle','createState','Assets']) assert.equal(typeof fresh.ILY[name], 'function');
  assert.ok(fresh.ILY.data.assets);
  assert.ok(fresh.ILY.data.stories.prologue);
  const entry = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(entry, /sign&amp;log\/login.html/);
});
