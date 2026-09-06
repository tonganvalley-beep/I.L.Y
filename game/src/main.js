(() => {
'use strict';
const { createState, validateSave } = ILY;
const { Assets } = ILY;
const { el, button } = ILY;
const { mountDialogue } = ILY;
const { mountPhone } = ILY;
const { mountWalk } = ILY;
const { mountExploration } = ILY;
const { mountBattle } = ILY;

const stage = document.querySelector('#stage');
const notify = message => document.querySelector('#status').textContent = message;

try {
  const story = ILY.data.stories.prologue;
  const manifest = ILY.data.assets;
  const { maps, levels } = ILY.data;
  const assets = new Assets(manifest);
  let state = createState(story.start), cleanup = () => {};
  let username = 'guest';
  try { username = localStorage.getItem('mygame-token') || 'guest'; } catch { notify('浏览器存储不可用，仍可试玩。'); }
  // file: 页面之间的存储可能隔离，账号名称由入口显式传递，仅用于区分本地存档。
  const launchParams = new URLSearchParams(location.search);
  username = launchParams.get('player') || username;
  const menu = new URL('../sign&log/game.html', location.href);
  menu.searchParams.set('player', username);
  document.querySelector('#return-menu').href = menu.href;
  const gameMenu = document.querySelector('#game-menu');
  const menuToggle = document.querySelector('#menu-toggle');
  menuToggle.onclick = () => { gameMenu.showModal(); window.dispatchEvent(new Event('blur')); menuToggle.setAttribute('aria-expanded', 'true'); };
  document.querySelector('#menu-close').onclick = () => gameMenu.close();
  gameMenu.addEventListener('close', () => { menuToggle.setAttribute('aria-expanded', 'false'); stage.focus({ preventScroll: true }); });
  document.querySelector('#fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { notify('此浏览器未允许全屏；游戏仍铺满当前窗口。'); }
  };
  document.addEventListener('fullscreenchange', () => {
    document.querySelector('#fullscreen').textContent = document.fullscreenElement ? '退出全屏' : '进入全屏';
  });
  const saveKey = `ily-save-v1:${username}`;
  document.querySelector('#chapter').textContent = story.title;
  function refreshClues() {
    const list = document.querySelector('#clues'); list.replaceChildren();
    const spots = Object.values(maps).flatMap(map => map.hotspots);
    for (const id of state.clues) { const spot = spots.find(item => item.clue === id); list.append(el('li', '', spot ? `${spot.label}：${spot.description}` : id)); }
    if (!state.clues.length) list.append(el('li', '', '还没有发现线索。'));
  }
  function go(id) {
    const next = id || state.node;
    const node = story.nodes[next];
    if (!node) { notify(`找不到剧情节点：${next}`); return; }
    cleanup(); cleanup = () => {}; state.node = next;
    stage.replaceChildren(); stage.style.backgroundImage = ''; stage.dataset.mode = node.type; notify(''); refreshClues();
    const context = {stage, node, state, assets, go, notify, refreshClues};
    if (['phone', 'finale', 'branch', 'end'].includes(node.type)) ILY.mountScene(stage, node, assets);
    if (node.type === 'dialogue' || node.type === 'choice') cleanup = mountDialogue(context);
    else if (node.type === 'phone') cleanup = mountPhone(context);
    else if (node.type === 'walk') cleanup = mountWalk(context);
    else if (node.type === 'exploration') cleanup = mountExploration({...context, map:maps[node.map]});
    else if (node.type === 'battle') cleanup = mountBattle({...context, level:levels[node.level]});
    else if (node.type === 'finale' || node.type === 'branch' || node.type === 'end') {
      if (node.enter) node.enter(state, notify, assets);
      const end = el('section', 'mode-panel');
      end.append(el('h1', '', node.title || '未完待续'));
      if (node.text) end.append(el('p', '', node.text));
      if (node.subtitle) end.append(el('p', 'hint', node.subtitle));
      end.append(button('重新开始', () => { state = createState(story.start); go(story.start); }));
      stage.append(end);
      try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch {}
    }
    else {
      const end = el('section', 'mode-panel'); end.append(el('h1', '', '未完待续'),el('p', '', node.text),button('重新开始',()=>{state=createState(story.start);go(story.start);}));stage.append(end);
    }
  }
  document.querySelector('#save').onclick = () => {
    try {localStorage.setItem(saveKey,JSON.stringify(state));notify('已保存。弹幕关卡读取后会从本关开头开始。');}catch{notify('保存失败：浏览器存储不可用或空间不足。');}
  };
  function loadProgress(fallbackToStart = false) {
    try {
      const raw=localStorage.getItem(saveKey);if(!raw) throw new Error('当前账号还没有存档。');
      state=validateSave(JSON.parse(raw),story,maps);go(state.node);notify('已读取进度。');
    }catch(error){
      if (fallbackToStart) go(story.start);
      notify(error.message === '当前账号还没有存档。' ? error.message : '读取失败：存档损坏、不兼容或浏览器存储不可用。');
    }
  }
  document.querySelector('#load').onclick = loadProgress;
  document.querySelector('#sound').onclick = event => {
    event.target.textContent = assets.toggle() ? '关闭音乐' : '开启音乐';
    if (!Object.keys(manifest.bgm).length) notify('当前示例未添加音乐，可在素材清单中配置。');
  };
  if (launchParams.get('mode') === 'load') loadProgress(true);
  else go(state.node);
} catch (error) {
  stage.append(el('p','mode-panel','游戏数据加载失败。请检查 data 文件和 HTML 中的脚本加载顺序。'));
  notify(error.message);
}

})();
