(() => {
'use strict';
const { createState, validateSave, SaveManager } = ILY;
const { Assets } = ILY;
const { el, button } = ILY;
const { mountDialogue } = ILY;
const { mountPhone } = ILY;
const { mountWalk } = ILY;
const { mountCorridor } = ILY;
const { mountExploration } = ILY;
const { mountBattle } = ILY;
const t = (key, vars) => ILY.t(key, vars);

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
  } catch { notify(t('notify.noStorage')); }

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
      // 全屏切换后关闭菜单，否则模态菜单一直盖在画面上，手机键盘操作也会被 dialog[open] 拦截
      if (gameMenu.open) gameMenu.close();
    } catch { notify(t('notify.noFullscreen')); }
  };
  const fullscreenBtn = document.querySelector('#fullscreen');
  const soundBtn = document.querySelector('#sound');
  const updateFullscreenLabel = () => {
    fullscreenBtn.textContent = t(document.fullscreenElement ? 'menu.fullscreen.exit' : 'menu.fullscreen.enter');
  };
  document.addEventListener('fullscreenchange', updateFullscreenLabel);

  /* 语言切换：与开始界面共用 localStorage['mygame-lang'] */
  document.querySelector('#lang').onclick = () => {
    ILY.setLang(ILY.getLang() === 'chinese' ? 'english' : 'chinese');
  };
  window.addEventListener('ily:langchange', () => {
    document.querySelector('#chapter').textContent = t('chapter.title');
    updateFullscreenLabel();
    soundBtn.textContent = t(assets.enabled ? 'menu.sound.off' : 'menu.sound.on');
    refreshClues();
    if (saveMenu.open) {
      saveTitle.textContent = t(saveMode === 'save' ? 'save.title.save' : 'save.title.load');
      renderSaveSlots();
    }
  });
  /* 进游戏时同步一次语言（开始界面可能已选英文） */
  window.dispatchEvent(new CustomEvent('ily:langchange'));
  document.querySelector('#chapter').textContent = t('chapter.title');

  function refreshClues() {
    const list = document.querySelector('#clues'); list.replaceChildren();
    const spots = Object.values(maps).flatMap(map => map.hotspots);
    for (const id of state.clues) {
      const spot = spots.find(item => item.clue === id);
      list.append(el('li', '', spot ? `${spot.label}：${spot.description}` : id));
    }
    if (!state.clues.length) list.append(el('li', '', t('clues.empty')));
  }

  function formatSaveTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('time.unknown');
    return new Intl.DateTimeFormat(ILY.getLang() === 'chinese' ? 'zh-CN' : 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function saveSlotLabel(page, slot) {
    if (page === 'auto') return t('slot.auto', { n: slot });
    if (page === 'quick') return t('slot.quick');
    return t('slot.manual', { p: page, n: slot });
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
    saveSubtitle.textContent = t(saveMode === 'save' && manualPage ? 'save.subtitle.save' : 'save.subtitle.load');

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
          image.alt = t('save.previewAlt', { name: record.meta.sceneName });
          image.onerror = () => image.remove();
          preview.append(image);
        }
        preview.append(el('span', 'save-slot-tag', label));
        const info = el('div', 'save-info');
        info.append(
          el('strong', '', record.meta.chapter || t('chapter.title')),
          el('span', '', record.meta.sceneName || t('save.progress')),
          el('span', 'save-summary', record.meta.summary || t('save.noSummary')),
          el('time', '', formatSaveTime(record.savedAt))
        );
        card.append(preview, info);
      } else {
        preview.append(el('span', 'save-slot-tag', label));
        preview.append(el('span', 'empty-label', inspected.status === 'corrupt' ? t('slot.corrupt') : inspected.status === 'unavailable' ? t('slot.unavailable') : t('slot.empty')));
        card.append(preview);
      }

      const actions = el('div', 'save-actions');
      const canWrite = saveMode === 'save' && manualPage;
      if (saveMode === 'save' && !manualPage) {
        /* 存档模式下自动/快速页原本只有一个灰掉的“读取”按钮，容易误解为“点了没反应”：
           自动页改为提示文字说明不可手存；快速页提供真正的一键快速存档。 */
        if (savePage === 'quick') {
          const quickBtn = button(t('save.quickSaveHere'), () => {
            if (occupied && !window.confirm(t('save.confirmOverwrite', { label }))) return;
            try {
              saves.quicksave(state);
              renderSaveSlots();
              saveStatus.textContent = t('save.quickSavedHere');
            } catch (error) { saveStatus.textContent = t('save.saveFailed', { msg: error.message }); }
          });
          actions.append(quickBtn);
        } else {
          actions.append(el('span', 'save-readonly-hint', t('save.autoReadonlyHint')));
        }
      } else {
        const primaryLabel = canWrite ? (occupied ? t('save.overwrite') : t('save.save')) : t('save.load');
        const primary = button(primaryLabel, () => {
          if (canWrite) {
            if (occupied && !window.confirm(t('save.confirmOverwrite', { label }))) return;
            try {
              saves.save(savePage, inspected.slot, state);
              renderSaveSlots();
              saveStatus.textContent = t('save.saved', { label });
            } catch (error) { saveStatus.textContent = t('save.saveFailed', { msg: error.message }); }
            return;
          }
          if (!occupied || !window.confirm(t('save.confirmLoad', { label }))) return;
          try {
            state = saves.load(savePage, inspected.slot);
            saveMenu.close();
            go(state.node, { autosave: false });
            notify(t('save.loaded', { label }));
          } catch (error) { saveStatus.textContent = t('save.loadFailed', { msg: error.message }); }
        });
        primary.disabled = !canWrite && !occupied;
        actions.append(primary);
      }

      if (occupied || inspected.status === 'corrupt') {
        const remove = button(t('save.delete'), () => {
          if (!window.confirm(t('save.confirmDelete', { label }))) return;
          try {
            saves.remove(savePage, inspected.slot);
            renderSaveSlots();
            saveStatus.textContent = t('save.deleted', { label });
          } catch (error) { saveStatus.textContent = t('save.deleteFailed', { msg: error.message }); }
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
    saveTitle.textContent = t(mode === 'save' ? 'save.title.save' : 'save.title.load');
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
    try { saves.quicksave(state); notify(t('notify.quickSaved')); }
    catch (error) { notify(t('notify.quickSaveFailed', { msg: error.message })); }
  };

  let interactionsSinceAutosave = 0;
  function maybeAutosave(node, enabled) {
    if (!enabled) return;
    interactionsSinceAutosave++;
    const checkpoint = node.type === 'choice' || ['phone', 'walk', 'corridor', 'finale', 'branch', 'end'].includes(node.type);
    if (!checkpoint && interactionsSinceAutosave < 8) return;
    try { saves.autosave(state); } catch {}
    interactionsSinceAutosave = 0;
  }

  function go(id, options = {}) {
    const next = id || state.node;
    const node = story.nodes[next];
    if (!node) { notify(t('notify.nodeMissing', { id: next })); return; }
    cleanup(); cleanup = () => {}; state.node = next;
    stage.replaceChildren(); stage.style.backgroundImage = ''; stage.dataset.mode = node.type; notify(''); refreshClues();
    const context = {stage, node, state, assets, go, notify, refreshClues};
    if (['phone', 'finale', 'branch', 'end'].includes(node.type)) ILY.mountScene(stage, node, assets);
    if (node.type === 'dialogue' || node.type === 'choice') cleanup = mountDialogue(context);
    else if (node.type === 'phone') cleanup = mountPhone(context);
    else if (node.type === 'walk') cleanup = mountWalk(context);
    else if (node.type === 'corridor') cleanup = mountCorridor(context);
    else if (node.type === 'exploration') cleanup = mountExploration({...context, map:maps[node.map]});
    else if (node.type === 'battle') cleanup = mountBattle({...context, level:levels[node.level]});
    else if (node.type === 'finale' || node.type === 'branch' || node.type === 'end') {
      if (node.enter) node.enter(state, notify, assets);
      const end = el('section', 'mode-panel');
      end.append(el('h1', '', node.title || t('end.tbc')));
      if (node.text) end.append(el('p', '', node.text));
      if (node.subtitle) end.append(el('p', 'hint', node.subtitle));
      end.append(button(t('end.restart'), () => { state = createState(story.start); go(story.start); }));
      stage.append(end);
    } else {
      const end = el('section', 'mode-panel');
      end.append(el('h1', '', t('end.tbc')), el('p', '', node.text), button(t('end.restart'), () => { state = createState(story.start); go(story.start); }));
      stage.append(end);
    }
    maybeAutosave(node, options.autosave !== false);
  }

  document.querySelector('#sound').onclick = event => {
    event.target.textContent = t(assets.toggle() ? 'menu.sound.off' : 'menu.sound.on');
    if (!Object.keys(manifest.bgm).length) notify(t('notify.noBgm'));
  };

  go(state.node, { autosave: false });
  const loadSlot = launchParams.get('slot');
  if (loadSlot && /^([12]|auto|quick)-[1-6]$/.test(loadSlot)) {
    // 开始界面存档弹窗选中的槽位：直接读取对应存档进入游戏
    const [page, number] = loadSlot.split('-');
    try {
      state = saves.load(page, Number(number));
      go(state.node, { autosave: false });
      notify(t('notify.loaded'));
    } catch (error) { notify(t('save.loadFailed', { msg: error.message })); }
  } else if (launchParams.get('mode') === 'load') openSaveMenu('load');
  else if (migratedLegacySave) notify(t('notify.migrated'));
} catch (error) {
  stage.append(el('p', 'mode-panel', t('error.load')));
  notify(error.message);
}

})();
