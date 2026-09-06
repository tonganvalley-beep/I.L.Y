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
    for (const target of [node.phone?.exitNext, node.phone?.onReveal, node.walk?.exitNext]) if (target) await visit(target);
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
  const state=createState(story.start);state.maps.classroom={...map.spawn};addClue(state,'letter');
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


test('两个结局可从新状态进入，成就不重复，旧存档补齐成就数组', () => {
  for (const [nodeId, achievement] of [['finale', 'last-beach'], ['ne_ending', 'door-letter']]) {
    const state = createState(nodeId);
    story.nodes[nodeId].enter(state, () => {});
    story.nodes[nodeId].enter(state, () => {});
    assert.deepEqual(Array.from(state.flags.achievements), [achievement]);
    if (nodeId === 'finale') assert.equal(state.flags.FLAG_BLUE_CALL, 'unlocked');
  }
  const old = createState(story.start); old.flags = {};
  assert.ok(Array.isArray(validateSave(old, story, {classroom: map}).flags.achievements));
});

test('剧情图像 ID 全部登记，当前占位与兜底文件真实存在', async () => {
  await run('../game/data/assets.js');
  const { images, fallbacks } = context.ILY.data.assets;
  for (const node of Object.values(story.nodes)) {
    for (const id of [node.background, node.portrait, node.cg, node.overlay, node.walk?.bg, ...(node.characters || []).map(c => c.image)]) {
      if (id) assert.ok(images[id], `未登记图像: ${id}`);
    }
  }
  for (const path of new Set([...Object.values(images), ...Object.values(fallbacks)])) {
    assert.ok((await readFile(new URL(`../game/${path}`, import.meta.url))).length, path);
  }
});

test('舞台支持多人物与 CG 分离，图片加载失败只降级一次', async () => {
  const element = tag => ({tag, children: [], dataset: {}, style: {setProperty() {}}, classList: {add() {}},
    setAttribute() {}, append(...nodes) {this.children.push(...nodes);} });
  const fresh = vm.createContext({}); fresh.window = fresh;
  fresh.ILY = {el: (tag, className) => Object.assign(element(tag), {className})};
  vm.runInContext(await readFile(new URL('../game/src/core/scene.js', import.meta.url), 'utf8'), fresh);
  const assets = {image: id => id ? `assets/${id}.png` : '', manifest: {fallbacks: {background: 'bg.svg', character: 'char.svg', prop: 'prop.svg'}}};
  const stage = element('section');
  fresh.ILY.mountScene(stage, {background:'room', characters:[{image:'a',position:'left'},{image:'b',position:'right'}], overlay:'photo'}, assets);
  const layers = stage.children[0].children;
  assert.equal(layers.length, 4);
  assert.equal(layers[1].dataset.position, 'left');
  assert.equal(layers[2].dataset.position, 'right');
  layers[1].onerror(); assert.equal(layers[1].src, 'char.svg');
  layers[1].onerror(); assert.equal(layers[1].hidden, true);
  const cgStage = element('section');
  fresh.ILY.mountScene(cgStage, {cg:'memory',portrait:'a',overlay:'photo',backgroundFit:'contain'}, assets);
  assert.equal(cgStage.children[0].children.length, 1);
  assert.equal(cgStage.children[0].children[0].src, 'assets/memory.png');
  assert.equal(cgStage.children[0].children[0].style.objectFit, 'contain');
});

test('手机不会跳过通讯录/发信流程，已读邮件退出计时器可在切场时清理', async () => {
  const timers = new Map(); let timerId = 0;
  const element = () => ({children: [], dataset: {}, classList: {toggle() {}, add() {}},
    append(...nodes) { this.children.push(...nodes); }, replaceChildren(...nodes) {this.children = nodes;},
    addEventListener() {}, scrollIntoView() {}});
  const fresh = vm.createContext({matchMedia: () => ({matches:true}),
    setTimeout: fn => {timers.set(++timerId, fn); return timerId;}, clearTimeout: id => timers.delete(id)});
  fresh.window = fresh; fresh.addEventListener = () => {}; fresh.removeEventListener = () => {};
  fresh.ILY = {data:{}, el:element, button:element};
  for (const path of ['../game/data/story/phone.js','../game/src/modes/phone.js']) {
    vm.runInContext(await readFile(new URL(path, import.meta.url), 'utf8'), fresh);
  }
  for (const nodeId of ['s03_phone','s04_phone']) {
    const state = createState(nodeId); state.flags.phone = {read:['F01'],deleted:[]};
    const cleanup = fresh.ILY.mountPhone({stage:element(),node:story.nodes[nodeId],state,assets:{image:()=>''},go:()=>{},notify:()=>{}});
    assert.equal(timers.size, 0, `${nodeId} 不应自动略过`); cleanup();
  }
  const state = createState('s01_phone'); state.flags.phone = {read:['A01','A02','A03','A04'],deleted:[]};
  const cleanup = fresh.ILY.mountPhone({stage:element(),node:story.nodes.s01_phone,state,assets:{image:()=>''},go:()=>{},notify:()=>{}});
  assert.equal(timers.size, 1); cleanup(); assert.equal(timers.size, 0);
});

test('全游戏保留 Zpix 像素字体，手机和舞台不被新主题覆盖', async () => {
  const [baseCss, stageCss, prologueCss, walkSource] = await Promise.all([
    readFile(new URL('../game/styles/game.css', import.meta.url), 'utf8'),
    readFile(new URL('../game/styles/stage.css', import.meta.url), 'utf8'),
    readFile(new URL('../game/styles/prologue.css', import.meta.url), 'utf8'),
    readFile(new URL('../game/src/modes/walk.js', import.meta.url), 'utf8')
  ]);
  assert.match(baseCss, /@font-face\{font-family:Zpix/);
  assert.match(stageCss, /:root\{font-family:Zpix/);
  assert.doesNotMatch(stageCss, /Microsoft YaHei|PingFang SC/);
  assert.match(prologueCss, /\.phone-tabs button[^}]*font:inherit/s);
  assert.match(walkSource, /ctx\.font = '13px Zpix, sans-serif'/);
});

test('开始菜单接入游戏、OP 跳过与读取存档启动参数', async () => {
  const [menuHtml, mainSource] = await Promise.all([
    readFile(new URL('../sign&log/game.html', import.meta.url), 'utf8'),
    readFile(new URL('../game/src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(menuHtml, /src="\.\.\/game\/I\.L\.Y\.-OP\.mp4"/);
  assert.match(menuHtml, /event\.key === 'Escape'/);
  assert.match(menuHtml, /enterGame\('load'\)/);
  assert.match(menuHtml, /new URL\('\.\.\/game\/index\.html'/);
  assert.match(mainSource, /launchParams\.get\('mode'\) === 'load'/);
  assert.match(mainSource, /new URL\('\.\.\/sign&log\/game\.html'/);
  const inlineScripts = [...menuHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.ok(inlineScripts.length);
  for (const source of inlineScripts) new vm.Script(source);
  assert.ok((await readFile(new URL('../game/I.L.Y.-OP.mp4', import.meta.url))).length > 0);
});
