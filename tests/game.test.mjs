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
await run('../game/src/core/saves.js');
const { createState, addClue, canWalk, canDeduce, validateSave, SaveManager } = context.ILY;
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
test('序章保留可执行剧本的完整主线段落与92个节点', () => {
  assert.equal(Object.keys(story.nodes).length, 92);
  const text = Object.values(story.nodes).map(node => node.text || '').join('\n');
  for (const excerpt of [
    '“都已经28了”啊',
    '每个月若无其事汇入我账户的6万日元',
    '入居者招募 0A-93MC-10N4',
    '我一直、一直发了十年的邮件',
    '这全部都是一场噩梦',
    '仿佛无数细小的蠕虫',
    '和我一样大啊',
    '最喜欢你了，基生'
  ]) assert.match(text, new RegExp(excerpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(story.nodes.s09.phone.onReveal, 's09_found');
  assert.equal(story.nodes.br02.choices[0].next, 's10a');
  assert.equal(story.nodes.br02.choices[1].next, 's09_close');
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

test('多存档按页槽独立保存，自动档循环且兼容旧单槽', () => {
  class MemoryStorage {
    constructor() { this.data = new Map(); }
    get length() { return this.data.size; }
    key(index) { return [...this.data.keys()][index] ?? null; }
    getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
    setItem(key, value) { this.data.set(key, String(value)); }
    removeItem(key) { this.data.delete(key); }
  }
  const storage = new MemoryStorage();
  let tick = 0;
  const manager = new SaveManager({storage,username:'tester',story,maps:{classroom:map},validateSave,now:()=>new Date(1700000000000 + tick++ * 1000)});
  const first = createState('s01_intro');
  const second = createState('s02a');
  manager.save('1', 1, first);
  manager.save('2', 6, second);
  assert.equal(manager.load('1', 1).node, 's01_intro');
  assert.equal(manager.load('2', 6).node, 's02a');
  assert.equal(manager.list('1').length, 6);
  assert.equal(manager.list('2').length, 6);

  for (const node of ['s01_intro', 's01_intro2', 's01_intro3', 's01_phone']) manager.autosave(createState(node));
  assert.equal(manager.load('auto', 1).node, 's01_phone');
  assert.equal(manager.load('auto', 2).node, 's01_intro3');
  assert.equal(manager.load('auto', 3).node, 's01_intro2');
  manager.quicksave(first);
  assert.equal(manager.load('quick', 1).node, 's01_intro');

  const legacyStorage = new MemoryStorage();
  legacyStorage.setItem('ily-save-v1:legacy', JSON.stringify(second));
  const legacyManager = new SaveManager({storage:legacyStorage,username:'legacy',story,maps:{classroom:map},validateSave});
  assert.equal(legacyManager.migrateLegacy(), true);
  assert.equal(legacyManager.load('1', 1).node, 's02a');
  assert.ok(legacyStorage.getItem('ily-save-v1:legacy'), '迁移时应保留旧存档作为回退');
  legacyManager.remove('1', 1);
  assert.equal(legacyManager.migrateLegacy(), false, '用户删除迁移档后不应在下次启动时复活');
  assert.equal(legacyManager.inspect('1', 1).status, 'empty');
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
  for (const name of ['mountDialogue','mountExploration','mountBattle','createState','SaveManager','Assets']) assert.equal(typeof fresh.ILY[name], 'function');
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

test('剧情图像 ID 全部登记，正式素材与占位图真实存在', async () => {
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

test('舞台支持多人物与 CG 分离，坏图按类型降级到占位图', async () => {
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

test('手机教学删除可按确认键继续，爱理拒绝删除且提示一秒', async () => {
  const timers = new Map(); let timerId = 0, keyHandler = null;
  const element = (tag='', className='', textContent='') => ({tag, className, textContent, children: [], dataset: {}, style: {},
    classList: {toggle() {}, add() {}},
    append(...nodes) { this.children.push(...nodes); }, prepend(...nodes) { this.children.unshift(...nodes); },
    replaceChildren(...nodes) {this.children = nodes;}, addEventListener() {}, removeEventListener() {}, scrollIntoView() {},
    querySelector(selector) { return selector === '.confirm' ? this.children.find(node => String(node.className).includes('confirm')) || null : null; }});
  const fresh = vm.createContext({matchMedia: () => ({matches:true}),
    setTimeout: (fn, delay) => {timers.set(++timerId, {fn, delay}); return timerId;}, clearTimeout: id => timers.delete(id)});
  fresh.window = fresh;
  fresh.document = {querySelector: () => null};
  fresh.addEventListener = (type, handler) => { if (type === 'keydown') keyHandler = handler; };
  fresh.removeEventListener = () => {};
  fresh.ILY = {data:{}, el:element, button:(label, onClick) => Object.assign(element('button', '', label), {onClick})};
  for (const path of ['../game/data/story/phone.js','../game/src/modes/phone.js']) {
    vm.runInContext(await readFile(new URL(path, import.meta.url), 'utf8'), fresh);
  }
  const press = key => keyHandler({key,target:{closest:()=>null},preventDefault(){}});

  const tutorialState = createState('s03_phone');
  tutorialState.flags.phone = {read:['F01'],deleted:[]};
  let nextNode = null;
  const tutorialCleanup = fresh.ILY.mountPhone({stage:element(),node:story.nodes.s03_phone,state:tutorialState,assets:{image:()=>''},go:id=>{nextNode=id;},notify:()=>{}});
  press('Enter'); press('d'); press('Enter');
  assert.deepEqual(Array.from(tutorialState.flags.phone.deleted), ['work']);
  assert.equal(nextNode, null, '删除完成后应等待玩家确认继续');
  press(' ');
  assert.equal(nextNode, 's03_family');
  tutorialCleanup();

  const airiState = createState('s04_phone');
  airiState.flags.phone = {read:[],deleted:[]};
  const notices = [];
  const airiCleanup = fresh.ILY.mountPhone({stage:element(),node:story.nodes.s04_phone,state:airiState,assets:{image:()=>''},go:()=>{},notify:message=>notices.push(message)});
  press('ArrowDown'); press('ArrowDown'); press('ArrowDown'); press('Enter'); press('d'); press('Enter');
  assert.equal(airiState.flags.phone.deleted.includes('airi'), false);
  assert.equal(notices.at(-1), '再看看其他人吧。');
  const oneSecondTimer = [...timers.values()].find(timer => timer.delay === 1000);
  assert.ok(oneSecondTimer, '爱理删除提示应设置约一秒的消失计时器');
  oneSecondTimer.fn();
  assert.equal(notices.at(-1), '');
  airiCleanup();
});

test('海岸回信下滚六次后显示蓝色链接，并等待玩家确认', async () => {
  let keyHandler = null;
  const element = (tag='', className='', textContent='') => ({tag, className, textContent, children: [], dataset: {}, style: {}, hidden:false,
    classList: {toggle() {}, add() {}},
    append(...nodes) { this.children.push(...nodes); }, prepend(...nodes) { this.children.unshift(...nodes); },
    replaceChildren(...nodes) {this.children = nodes;}, addEventListener() {}, removeEventListener() {}, scrollIntoView() {},
    querySelector() { return null; }});
  const fresh = vm.createContext({matchMedia: () => ({matches:true}), setTimeout: () => 1, clearTimeout() {}, clearInterval() {}});
  fresh.window = fresh;
  fresh.document = {querySelector: () => null};
  fresh.addEventListener = (type, handler) => { if (type === 'keydown') keyHandler = handler; };
  fresh.removeEventListener = () => {};
  fresh.ILY = {data:{}, el:element, button:(label, onClick) => Object.assign(element('button', '', label), {onClick})};
  for (const path of ['../game/data/story/phone.js','../game/src/modes/phone.js']) {
    vm.runInContext(await readFile(new URL(path, import.meta.url), 'utf8'), fresh);
  }
  const state = createState('s09');
  let nextNode = null;
  const stage = element();
  const cleanup = fresh.ILY.mountPhone({stage,node:story.nodes.s09,state,assets:{image:()=>''},go:id=>{nextNode=id;},notify:()=>{}});
  const press = key => keyHandler({key,target:{closest:()=>null},preventDefault(){}});
  press('Enter');
  for (let i = 0; i < 6; i++) press('ArrowDown');
  const body = stage.children[0].children[0].children[1];
  const detail = body.children[0];
  const link = detail.children.find(child => child.className === 'd-link');
  assert.ok(link);
  assert.equal(link.style.display, '');
  assert.equal(state.flags.FLAG_HIDDEN_LINK, 'found');
  assert.equal(nextNode, null, '链接出现后不应立刻跳走');
  press('Enter');
  assert.equal(nextNode, 's09_found');
  cleanup();
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
  assert.match(menuHtml, /ily-save-v2:/);
  assert.match(menuHtml, /hasPlayerSave\(\)/);
  assert.match(menuHtml, /new URL\('\.\.\/game\/index\.html'/);
  assert.match(mainSource, /launchParams\.get\('mode'\) === 'load'/);
  assert.match(mainSource, /new URL\('\.\.\/sign&log\/game\.html'/);
  const inlineScripts = [...menuHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.ok(inlineScripts.length);
  for (const source of inlineScripts) new vm.Script(source);
  assert.ok((await readFile(new URL('../game/I.L.Y.-OP.mp4', import.meta.url))).length > 0);
});
