(() => {
'use strict';
const { createState, validateSave, SaveManager } = ILY;
const { Assets } = ILY;
const { el, button } = ILY;
const { mountDialogue } = ILY;
const { mountPhone } = ILY;
const { mountWalk } = ILY;
const { mountExploration } = ILY;
const { mountBattle } = ILY;

const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
let notifyTimer = 0;
const notify = (message, duration = 0) => {
  status.textContent = message;
  clearTimeout(notifyTimer);
  if (message && duration > 0) notifyTimer = setTimeout(() => {
    if (status.textContent === message) status.textContent = '';
  }, duration);
};

try {
  const story = ILY.data.stories.prologue;
  const manifest = ILY.data.assets;
  const { maps, levels } = ILY.data;
  const assets = new Assets(manifest);
  let state = createState(story.start), cleanup = () => {};
  let username = 'guest', storage = null;
  try {
    storage = window.localStorage;
    username = storage.getItem('mygame-token') || 'guest';
  } catch { notify('浏览器存储不可用，仍可试玩。'); }

  // file: 页面之间的存储可能隔离，账号名称由入口显式传递，仅用于区分本地存档。
  const launchParams = new URLSearchParams(location.search);
  username = launchParams.get('player') || username;
  const saves = new SaveManager({ storage, username, story, maps, validateSave });
  const migratedLegacySave = saves.migrateLegacy();
  const menu = new URL('../sign&log/game.html', location.href);
  menu.searchParams.set('player', username);
  document.querySelector('#return-menu').href = menu.href;

  const gameMenu = document.querySelector('#game-menu');
  const menuToggle = document.querySelector('#menu-toggle');
  const saveMenu = document.querySelector('#save-menu');
  const saveSlots = document.querySelector('#save-slots');
  const saveTitle = document.querySelector('#save-menu-title');
  const saveSubtitle = document.querySelector('#save-menu-subtitle');
  const saveStatus = document.querySelector('#save-status');
  let saveMode = 'save';
  let savePage = '1';

  menuToggle.onclick = () => {
    gameMenu.showModal();
    window.dispatchEvent(new Event('blur'));
    menuToggle.setAttribute('aria-expanded', 'true');
  };
  document.querySelector('#menu-close').onclick = () => gameMenu.close();
  gameMenu.addEventListener('close', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    if (!saveMenu.open) stage.focus({ preventScroll: true });
  });
  document.querySelector('#fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { notify('此浏览器未允许全屏；游戏仍铺满当前窗口。'); }
  };
  document.addEventListener('fullscreenchange', () => {
    document.querySelector('#fullscreen').textContent = document.fullscreenElement ? '退出全屏' : '进入全屏';
  });
  document.querySelector('#chapter').textContent = story.title;

  function refreshClues() {
    const list = document.querySelector('#clues'); list.replaceChildren();
    const spots = Object.values(maps).flatMap(map => map.hotspots);
    for (const id of state.clues) {
      const spot = spots.find(item => item.clue === id);
      list.append(el('li', '', spot ? `${spot.label}：${spot.description}` : id));
    }
    if (!state.clues.length) list.append(el('li', '', '还没有发现线索。'));
  }

  function formatSaveTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function saveSlotLabel(page, slot) {
    if (page === 'auto') return `自动存档 ${slot}`;
    if (page === 'quick') return '快速存档';
    return `手动存档 ${page}-${slot}`;
  }

  function renderSaveSlots() {
    saveSlots.replaceChildren();
    saveStatus.textContent = '';
    document.querySelectorAll('#save-pages [data-page]').forEach(tab => {
      const active = tab.dataset.page === savePage;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-current', active ? 'page' : 'false');
    });
    const manualPage = savePage === '1' || savePage === '2';
    saveSubtitle.textContent = saveMode === 'save' && manualPage
      ? '选择槽位保存；已有存档会先询问是否覆盖。'
      : '选择已有存档读取；读取前会进行确认。';

    for (const inspected of saves.list(savePage)) {
      const card = el('article', `save-slot ${inspected.status}`);
      const preview = el('div', 'save-preview');
      const label = saveSlotLabel(savePage, inspected.slot);
      let occupied = false;

      if (inspected.status === 'ok') {
        occupied = true;
        const { record } = inspected;
        const imagePath = assets.image(record.meta.preview);
        if (imagePath) {
          const image = el('img');
          image.src = imagePath;
          image.alt = `${record.meta.sceneName}场景预览`;
          image.onerror = () => image.remove();
          preview.append(image);
        }
        preview.append(el('span', 'save-slot-tag', label));
        const info = el('div', 'save-info');
        info.append(
          el('strong', '', record.meta.chapter || story.title),
          el('span', '', record.meta.sceneName || '剧情进度'),
          el('span', 'save-summary', record.meta.summary || '无对白摘要'),
          el('time', '', formatSaveTime(record.savedAt))
        );
        card.append(preview, info);
      } else {
        preview.append(el('span', 'save-slot-tag', label));
        preview.append(el('span', 'empty-label', inspected.status === 'corrupt' ? '存档损坏' : inspected.status === 'unavailable' ? '存储不可用' : '空槽位'));
        card.append(preview);
      }

      const actions = el('div', 'save-actions');
      const canWrite = saveMode === 'save' && manualPage;
      const primaryLabel = canWrite ? (occupied ? '覆盖' : '保存') : '读取';
      const primary = button(primaryLabel, () => {
        if (canWrite) {
          if (occupied && !window.confirm(`确定覆盖${label}吗？`)) return;
          try {
            saves.save(savePage, inspected.slot, state);
            renderSaveSlots();
            saveStatus.textContent = `已保存到${label}。`;
          } catch (error) { saveStatus.textContent = `保存失败：${error.message}`; }
          return;
        }
        if (!occupied || !window.confirm(`读取${label}后，尚未保存的当前进度会丢失。继续吗？`)) return;
        try {
          state = saves.load(savePage, inspected.slot);
          saveMenu.close();
          go(state.node, { autosave: false });
          notify(`已读取${label}。`);
        } catch (error) { saveStatus.textContent = `读取失败：${error.message}`; }
      });
      primary.disabled = !canWrite && !occupied;
      actions.append(primary);

      if (occupied || inspected.status === 'corrupt') {
        const remove = button('删除', () => {
          if (!window.confirm(`确定删除${label}吗？此操作无法撤销。`)) return;
          try {
            saves.remove(savePage, inspected.slot);
            renderSaveSlots();
            saveStatus.textContent = `已删除${label}。`;
          } catch (error) { saveStatus.textContent = `删除失败：${error.message}`; }
        });
        remove.classList.add('danger');
        actions.append(remove);
      }
      card.append(actions);
      saveSlots.append(card);
    }
  }

  function openSaveMenu(mode) {
    saveMode = mode;
    if (mode === 'save' && !['1', '2'].includes(savePage)) savePage = '1';
    saveTitle.textContent = mode === 'save' ? '保存游戏' : '读取游戏';
    if (gameMenu.open) gameMenu.close();
    renderSaveSlots();
    saveMenu.showModal();
    window.dispatchEvent(new Event('blur'));
  }

  document.querySelectorAll('#save-pages [data-page]').forEach(tab => {
    tab.onclick = () => { savePage = tab.dataset.page; renderSaveSlots(); };
  });
  document.querySelector('#save-menu-close').onclick = () => saveMenu.close();
  saveMenu.addEventListener('close', () => stage.focus({ preventScroll: true }));
  document.querySelector('#save').onclick = () => openSaveMenu('save');
  document.querySelector('#load').onclick = () => openSaveMenu('load');
  document.querySelector('#quick-save').onclick = () => {
    try { saves.quicksave(state); notify('已快速保存。'); }
    catch (error) { notify(`快速保存失败：${error.message}`); }
  };

  let interactionsSinceAutosave = 0;
  function maybeAutosave(node, enabled) {
    if (!enabled) return;
    interactionsSinceAutosave++;
    const checkpoint = node.type === 'choice' || ['phone', 'walk', 'finale', 'branch', 'end'].includes(node.type);
    if (!checkpoint && interactionsSinceAutosave < 8) return;
    try { saves.autosave(state); } catch {}
    interactionsSinceAutosave = 0;
  }

  function go(id, options = {}) {
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
    } else {
      const end = el('section', 'mode-panel');
      end.append(el('h1', '', '未完待续'), el('p', '', node.text), button('重新开始', () => { state = createState(story.start); go(story.start); }));
      stage.append(end);
    }
    maybeAutosave(node, options.autosave !== false);
  }

  document.querySelector('#sound').onclick = event => {
    event.target.textContent = assets.toggle() ? '关闭音乐' : '开启音乐';
    if (!Object.keys(manifest.bgm).length) notify('当前示例未添加音乐，可在素材清单中配置。');
  };

  go(state.node, { autosave: false });
  if (launchParams.get('mode') === 'load') openSaveMenu('load');
  else if (migratedLegacySave) notify('旧版单槽存档已复制到手动存档 1-1。');
} catch (error) {
  stage.append(el('p', 'mode-panel', '游戏数据加载失败。请检查 data 文件和 HTML 中的脚本加载顺序。'));
  notify(error.message);
}

})();
