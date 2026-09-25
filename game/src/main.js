(async () => {
'use strict';
const { createState, createRollbackHistory, validateSave, SaveManager } = ILY;
const { Assets } = ILY;
const { el, button } = ILY;
const { isDialogueSkippable, mountDialogue } = ILY;
const { mountPhone } = ILY;
const { mountWalk } = ILY;
const { mountPhoto } = ILY;
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
  const story = ILY.prepareChapter1();
  // 2026-09-21：语音的源指纹校验已取消，VoicePlayer 不再需要 getSource / voiceBase
  // （原先这里为它保存一份修订层应用前的节点快照）。
  ILY.initScriptEditor(story, (id, fallback) => {
    go(story.nodes[id] ? id : fallback, { autosave: false, recordRollback: false, refresh: true });
  });
  /* 修订层改写的文本也要跟着语言走（在 initScriptEditor 之后覆盖）；
     手机邮件 / 照片另外在 ILY.data.phone 上换一次。 */
  ILY.applyStoryLang(story, ILY.getLang());
  ILY.applyPhoneLang?.(ILY.data.phone, ILY.getLang());
  let chapterMaps = ILY.data.chapter1Maps;
  if (location.protocol !== 'file:') {
    const response = await fetch('data/maps/chapter1.json');
    if (!response.ok) throw new Error('第一章地图读取失败，请刷新重试。');
    chapterMaps = await response.json();
  }
  Object.assign(ILY.data.maps, chapterMaps);
  let laterMaps=ILY.data.chapterMaps||{};
  if(location.protocol!=='file:'){
    const response=await fetch('data/maps/chapters.json');
    if(!response.ok)throw new Error('后续章节地图读取失败，请刷新重试。');
    laterMaps=await response.json();
  }
  Object.assign(ILY.data.maps,laterMaps);
  const manifest = ILY.data.assets;
  const { maps, levels } = ILY.data;
  const assets = new Assets(manifest);
  // 音轨缺失 / 解码失败时给出可见提示，而不是静默无声。
  assets.onError = message => notify(message, 4000);
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
  if (launchParams.get('entry') === 'root') menu.searchParams.set('entry', 'root');
  menu.searchParams.set('player', username);
  document.querySelector('#return-menu').href = menu.href;

  const gameMenu = document.querySelector('#game-menu');
  const menuToggle = document.querySelector('#menu-toggle');
  const saveMenu = document.querySelector('#save-menu');
  const saveSlots = document.querySelector('#save-slots');
  const saveTitle = document.querySelector('#save-menu-title');
  const saveSubtitle = document.querySelector('#save-menu-subtitle');
  const saveStatus = document.querySelector('#save-status');
  const skipBtn = document.querySelector('#skip');
  const skipSegmentBtn = document.querySelector('#skip-segment');
  const rollbackBtn = document.querySelector('#rollback');
  /* 顶栏第一颗：隐藏文字与整条顶栏，只看背景 / CG。按钮本身常驻（保证右上固定五颗），
     具体收起谁由每一幕的 createHideChrome 控制器接管，不可用时保持 disabled。 */
  const hideBtn = document.querySelector('#hide-ui');
  const rollbackHistory = createRollbackHistory();
  let saveMode = 'save';
  let savePage = '1';
  let skipMode = '';
  /* mode=load 是玩家在主界面（sign&log/game.html）点「读取存档」进来的。
     这时底下已经 go() 出了一局新进度的第一句，存档弹窗只是盖在上面；
     如果玩家没读任何存档就把弹窗关掉，说明他放弃了读取，
     应当退回主界面，而不是把底下那局新游戏当成"开始游戏"直接玩下去。
     menuLoadNode 用来识别"剧情是否真的被推进过"：一旦推进到别的节点，
     就说明玩家已经开玩了，之后关弹窗不再把人弹回主界面。 */
  let awaitingMenuLoad = launchParams.get('mode') === 'load';
  let menuLoadNode = null;
  const voice = new ILY.VoicePlayer({
    manifest: window.ILY_VOICE_MANIFEST,
    storage,
    canPlay: () => !skipMode && !document.hidden && !document.querySelector('dialog[open]')
  });
  const voiceToggle = document.querySelector('#voice-toggle');
  const voiceVolume = document.querySelector('#voice-volume');
  const musicToggle = document.querySelector('#music-toggle');
  const musicVolume = document.querySelector('#music-volume');
  const masterVolume = document.querySelector('#master-volume');
  const updateVoiceControls = () => {
    document.querySelector('#voice-state').textContent = t(voice.enabled ? 'menu.volume.on' : 'menu.volume.off');
    voiceToggle.setAttribute('aria-pressed', String(voice.enabled));
    voiceVolume.value = Math.round(voice.volume * 100);
    document.querySelector('#voice-volume-value').textContent = voiceVolume.value + '%';
  };
  const updateMusicControls = () => {
    document.querySelector('#music-state').textContent = t(assets.enabled ? 'menu.volume.on' : 'menu.volume.off');
    musicToggle.setAttribute('aria-pressed', String(assets.enabled));
    musicVolume.value = Math.round(assets.musicVolume * 100);
    document.querySelector('#music-volume-value').textContent = musicVolume.value + '%';
  };
  const updateMasterControl = () => {
    masterVolume.value = Math.round(assets.masterVolume * 100);
    document.querySelector('#master-volume-value').textContent = masterVolume.value + '%';
  };
  voiceToggle.onclick = () => { voice.setEnabled(!voice.enabled); updateVoiceControls(); };
  voiceVolume.oninput = () => { voice.setVolume(Number(voiceVolume.value) / 100); updateVoiceControls(); };
  musicToggle.onclick = () => {
    assets.toggle();
    updateMusicControls();
    if (assets.enabled && !Object.keys(manifest.bgm).length) notify(t('notify.noBgm'));
  };
  musicVolume.oninput = () => { assets.setMusicVolume(Number(musicVolume.value) / 100); updateMusicControls(); };
  masterVolume.oninput = () => {
    const value = Number(masterVolume.value) / 100;
    assets.setMasterVolume(value);
    voice.setMasterVolume(value);
    updateMasterControl();
  };
  window.addEventListener('ily:langchange', () => { updateVoiceControls(); updateMusicControls(); updateMasterControl(); });
  window.addEventListener('blur', () => voice.stop());
  window.addEventListener('pagehide', () => voice.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.stop(); });
  // Includes menus owned by memories, the phone and the script editor.
  const voiceMenus = new MutationObserver(records => {
    if (records.some(record => record.target.tagName === 'DIALOG' && record.target.open)) voice.stop();
  });
  voiceMenus.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  updateVoiceControls();
  updateMusicControls();
  updateMasterControl();

  function updateSkipControl() {
    const available = isDialogueSkippable(story.nodes[state.node]);
    skipBtn.disabled = !available;
    skipSegmentBtn.disabled = !available;
    skipBtn.classList.toggle('is-active', skipMode === 'fast');
    skipBtn.setAttribute('aria-pressed', String(skipMode === 'fast'));
    skipBtn.textContent = t(skipMode === 'fast' ? 'menu.fastForwardActive' : 'menu.fastForward');
    skipBtn.title = t(skipMode === 'fast' ? 'menu.fastForwardStopTitle' : 'menu.fastForwardTitle');
    skipSegmentBtn.classList.toggle('is-active', skipMode === 'segment');
    skipSegmentBtn.setAttribute('aria-pressed', String(skipMode === 'segment'));
    skipSegmentBtn.title = t('menu.skipSegmentTitle');
  }

  function setSkipMode(value) {
    const nextValue = ['fast', 'segment'].includes(value) && isDialogueSkippable(story.nodes[state.node]) && !document.querySelector('dialog[open]') ? value : '';
    if (skipMode === nextValue) { updateSkipControl(); return; }
    skipMode = nextValue;
    if (skipMode) voice.stop();
    updateSkipControl();
    window.dispatchEvent(new Event('ily:skipchange'));
  }

  const setSkipping = value => setSkipMode(value ? 'fast' : '');
  skipBtn.onclick = () => setSkipMode(skipMode === 'fast' ? '' : 'fast');
  skipSegmentBtn.onclick = () => setSkipMode(skipMode === 'segment' ? '' : 'segment');

  menuToggle.onclick = () => {
    setSkipMode('');
    gameMenu.show();
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
  const updateFullscreenLabel = () => {
    fullscreenBtn.textContent = t(document.fullscreenElement ? 'menu.fullscreen.exit' : 'menu.fullscreen.enter');
  };
  document.addEventListener('fullscreenchange', updateFullscreenLabel);

  /* 语言切换：与开始界面共用 localStorage['mygame-lang'] */
  const langMenu = document.querySelector('#lang-menu');
  const langOptions = Array.from(document.querySelectorAll('#lang-menu .lang-option'));
  function updateLangControls() {
    const current = ILY.getLang();
    for (const option of langOptions) option.setAttribute('aria-pressed', String(option.dataset.lang === current));
  }
  function openLangMenu() {
    updateLangControls();
    if (gameMenu.open) gameMenu.close();
    langMenu.show();
    window.dispatchEvent(new Event('blur'));
  }
  document.querySelector('#lang').onclick = () => openLangMenu();
  document.querySelector('#lang-menu-close').onclick = () => langMenu.close();
  langMenu.addEventListener('close', () => stage.focus({ preventScroll: true }));
  for (const option of langOptions) {
    option.onclick = () => { ILY.setLang(option.dataset.lang); updateLangControls(); };
  }
  window.addEventListener('ily:langchange', () => {
    /* 剧情文本整层换语言：中文 -> 英文 / 英文 -> 中文（中文原值在 __zh 里） */
    ILY.applyStoryLang(story, ILY.getLang());
    ILY.applyPhoneLang?.(ILY.data.phone, ILY.getLang());
    /* 当前这段如果对白正在屏幕上，重挂一次让它立刻显示新语言 */
    const current = story.nodes[state.node];
    if (current && ['dialogue', 'monologue', 'heroine-card'].includes(current.type)) {
      go(state.node, { refresh: true, autosave: false, recordRollback: false });
    }
    document.querySelector('#chapter').textContent = story.nodes[state.node]?.chapterTitle || t('chapter.title');
    updateFullscreenLabel();
    updateSkipControl();
    rollbackBtn.title = t('menu.rollbackTitle');
    hideBtn.title = t('dlg.hideTitle');
    refreshClues();
    updateLangControls();
    if (saveMenu.open) {
      saveTitle.textContent = t(saveMode === 'save' ? 'save.title.save' : 'save.title.load');
      renderSaveSlots();
    }
  });
  /* 进游戏时同步一次语言（开始界面可能已选英文） */
  window.dispatchEvent(new CustomEvent('ily:langchange'));
  document.querySelector('#chapter').textContent = t('chapter.title');

  function refreshClues() {
    const list = document.querySelector('#clues');
    if (!list) return;
    list.replaceChildren();
    const spots = Object.values(maps).flatMap(map => map.hotspots||[]);
    for (const id of state.clues) {
      const spot = spots.find(item => item.clue === id);
      const chapterClues = {P1:'没有回家的记忆：海边到出租屋之间的空白。',P2:'十年前的口味：她还记得每天吃的巧克力螺。',P3:'暑假：她的时间仿佛停在高中。',P4:'她眼中的我：为什么如此自然地接受二十八岁的基生？'};
      list.append(el('li', '', spot ? `${spot.label}：${spot.description}` : chapterClues[id] || ILY.data.chapterClues?.[id] || id));
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
        const info = el('div', 'save-info save-info-empty');
        card.append(preview, info);
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
            rollbackHistory.reset();
            /* 真的读到存档了，之后关掉弹窗就留在游戏里（必须在 close() 之前清掉）。 */
            awaitingMenuLoad = false;
            saveMenu.close();
            go(state.node, { autosave: false, resyncMusic: true });
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
    saveMenu.show();
    window.dispatchEvent(new Event('blur'));
  }

  document.querySelectorAll('#save-pages [data-page]').forEach(tab => {
    tab.onclick = () => { savePage = tab.dataset.page; renderSaveSlots(); };
  });
  document.querySelector('#save-menu-close').onclick = () => saveMenu.close();
  saveMenu.addEventListener('close', () => {
    /* 从主界面「读取存档」进来、又没读任何存档就把弹窗关掉 = 放弃读取。
       此时底下停着刚 go() 出来的新游戏第一句，留在那儿会被当成"点了读取存档却直接开始了新游戏"，
       所以退回主界面。menu 就是游戏菜单里「返回开始菜单」用的那个地址（含 entry / player 参数）。
       用 replace 而不是直接赋值 href，避免返回键又回到这个带 mode=load 的页面重新弹一次。 */
    if (awaitingMenuLoad) {
      awaitingMenuLoad = false;
      window.location.replace(menu.href);
      return;
    }
    stage.focus({ preventScroll: true });
  });
  document.querySelector('#save').onclick = () => openSaveMenu('save');
  document.querySelector('#load').onclick = () => openSaveMenu('load');
  document.querySelector('#quick-save').onclick = () => {
    try { saves.quicksave(state); notify(t('notify.quickSaved')); }
    catch (error) { notify(t('notify.quickSaveFailed', { msg: error.message })); }
  };

  /* ---------- 回忆：成就 / 剧情 / 画廊 ----------
     成就 = 当前进度（可能还没存档）+ 本账号全部存档槽 + 旧版存档里解锁过的 ID；
     剧情 = ILY.data.stories（序章 / 第一章）文字剧本；
     画廊 = sign&log/gallery-data.js 的插图 + 手机相册照片。 */
  ILY.initMemories({
    getStory: () => story,
    saves,
    getState: () => state,
    resolveAsset: key => assets.image(key),
    stage
  });
  document.querySelector('#memories').onclick = () => ILY.openMemories();

  /* ---------- 序章：随时掏出的手机 ----------
     右下角常驻入口 + P 键，只在序章节点出现；打开的是只读自由手机，
     合上后回到原来的剧情节点，不改变进度。 */
  ILY.initFreePhone({
    getState: () => state,
    assets,
    notify: (message, duration) => notify(message, duration),
    inPrologue: () => !!ILY.data.stories.prologue.nodes[state.node]
  });

  let interactionsSinceAutosave = 0;
  function maybeAutosave(node, enabled) {
    if (!enabled) return;
    interactionsSinceAutosave++;
    const checkpoint = node.checkpoint || node.type === 'choice' || ['rpg', 'photo', 'computer', 'phone', 'walk', 'corridor', 'finale', 'branch', 'end'].includes(node.type);
    if (!checkpoint && interactionsSinceAutosave < 8) return;
    try { saves.autosave(state); } catch {}
    interactionsSinceAutosave = 0;
  }

  function go(id, options = {}) {
    let next = id || state.node;
    // Omitted script lines retain their IDs for saves and branch anchors, but
    // never mount a blank dialogue or introduce a click between spoken lines.
    try { next = ILY.resolveScriptCues(state, story, next); }
    catch { notify(t('notify.nodeMissing', { id: next })); return; }
    const node = story.nodes[next];
    if (!node) { notify(t('notify.nodeMissing', { id: next })); return; }
    /* 仍在等玩家从「读取存档」弹窗里选存档时，只要剧情推进到了别的节点，
       就说明玩家已经开始玩了，取消"关掉弹窗就退回主界面"的行为。 */
    if (awaitingMenuLoad && menuLoadNode && next !== menuLoadNode) awaitingMenuLoad = false;
    ILY.updateScriptEditor(Object.assign(node, { id: next }));
    if (node.route && state.flags.route !== node.route) { go(node.next, options); return; }
    if(node.when&&state.flags[node.when.key]!==node.when.value){go(node.next,options);return;}
    /* 音乐是"状态"，不是"节点属性"：一首曲子会沿剧情链一直延续到下一次显式切歌，
       所以光看当前节点根本不知道此刻在放什么。state.music 记下每次 go() 之后
       实际生效的那首（普通推进时不带 cue 就保持原值）。
       读档 / 回滚时优先按剧情图反推（musicCueAt 与真实链路已由 check-music-cues
       全节点校验一致）——这样坏图时代写进存档的脏值（例如当年 ch1_s02 被绕开、
       整章 state.music 存成 null）会被自动纠正；存档里的 music 只在反推不出
       任何结果时才作兜底。 */
    let musicCue;
    if (options.resyncMusic) {
      musicCue = ILY.musicCueAt?.(story, next);
      if (musicCue === undefined) {
        const recorded = state.music;
        musicCue = recorded === null ? null
          : typeof recorded === 'string' && manifest.bgm[recorded] ? recorded
          : undefined;
      }
    } else {
      musicCue = ILY.musicCueFor?.(next, node);
    }
    if (musicCue !== undefined) { assets.setMusic(musicCue); state.music = musicCue; }
    if (skipMode && !isDialogueSkippable(node)) setSkipMode('');
    const refreshing = options.refresh && next === state.node;
    voice.stop();
    cleanup(); cleanup = () => {}; state.node = next;
    if (!refreshing) ILY.activateMemory(state, next, node);
    if (options.recordRollback !== false) rollbackHistory.record(state);
    if (!refreshing) ILY.enterChapterNode(state,node);
    document.querySelector('#chapter').textContent = node.chapterTitle || t('chapter.title');
    stage.replaceChildren(); stage.style.backgroundImage = ''; stage.dataset.mode = node.type;
    stage.dataset.chapter = node.chapter || '';
    stage.dataset.palette = node.visualEffects?.includes('grayscale') ? 'grayscale' : '';
    notify(''); refreshClues();
    ILY.refreshFreePhone();
    const context = {stage, node, story, state, assets, voice, go, notify, refreshClues, rollback, restoringRollback: options.restoringRollback === true,
      canRollback: () => rollbackHistory.canRollback,
      checkpointRollback: () => { rollbackHistory.checkpoint(state); rollbackBtn.disabled = !rollbackHistory.canRollback; },
      isSkipping: () => Boolean(skipMode), setSkipping, getSkipDelay: () => skipMode === 'segment' ? 0 : 140};
    if (['phone', 'finale', 'branch', 'end'].includes(node.type)) ILY.mountScene(stage, node, assets);
    if (node.type === 'dialogue' || node.type === 'choice') cleanup = mountDialogue(context);
    else if (node.type === 'monologue' || node.type === 'heroine-card') cleanup = ILY.mountHeroineMoment(context);
    else if (node.type === 'phone') cleanup = mountPhone(context);
    else if (node.type === 'walk') cleanup = mountWalk(context);
    else if (node.type === 'photo') cleanup = mountPhoto(context);
    else if (node.type === 'computer') cleanup = ILY.mountComputer(context);
    else if (node.type === 'corridor') cleanup = mountCorridor(context);
    else if (node.type === 'rpg') cleanup = ILY.mountRpg(context);
    else if (node.type === 'boss') cleanup = ILY.mountBoss(context);
    else if (node.type === 'battery-montage') cleanup = ILY.mountBatteryMontage(context);
    else if (['fracture','search','letter'].includes(node.type)) cleanup = ILY.mountChapterMoment(context);
    else if (node.type === 'exploration') cleanup = mountExploration({...context, map:maps[node.map]});
    else if (node.type === 'battle') cleanup = mountBattle({...context, level:levels[node.level]});
    else if (node.type === 'finale' || node.type === 'branch' || node.type === 'end') {
      if (node.enter) node.enter(state, notify, assets);
      const end = el('section', 'mode-panel');
      end.append(el('h1', '', node.title || t('end.tbc')));
      if (node.text) end.append(el('p', '', node.text));
      if (node.subtitle) end.append(el('p', 'hint', node.subtitle));
      if (node.next) end.append(button(node.nextLabel||'进入第一章', () => go(node.next)));
      /* 真结局的片尾曲（ED）。ED 播放期间结束卡整块隐藏，收黑后才显形，
         所以按钮顺序按「看完片尾之后玩家想做什么」来排：重温 → 读档 → 重开。 */
      const ed = { node, state, endPanel: end, assets, notify };
      if (ILY.EndingVideo.canPlay(node)) {
        end.append(button(t('ed.replay'), () => { cleanup(); cleanup = ILY.EndingVideo.play(ed); }));
      }
      if(node.ending)end.append(button('读取存档，探索另一种选择',()=>openSaveMenu('load')));
      end.append(button(t('end.restart'), () => { state = createState(story.start); rollbackHistory.reset(); go(story.start); }));
      stage.append(end);
      if (ILY.EndingVideo.shouldPlay({ node, state, restoringRollback: options.restoringRollback === true })) {
        cleanup = ILY.EndingVideo.play(ed);
      }
    } else {
      const end = el('section', 'mode-panel');
      end.append(el('h1', '', t('end.tbc')), el('p', '', node.text), button(t('end.restart'), () => { state = createState(story.start); rollbackHistory.reset(); go(story.start); }));
      stage.append(end);
    }
    maybeAutosave(node, options.autosave !== false);
    updateSkipControl();
    rollbackBtn.disabled = !rollbackHistory.canRollback;
  }

  function rollback() {
    if (document.querySelector('dialog[open]')) return;
    setSkipMode('');
    const previous = rollbackHistory.back(state);
    if (!previous) return;
    const refresh = previous.node === state.node && story.nodes[previous.node]?.type === 'rpg';
    state = previous;
    /* 回溯可能跨回上一章，音乐同样要跟着回退到那一刻该放的曲子。 */
    go(state.node, { autosave: false, recordRollback: false, refresh, restoringRollback: true, resyncMusic: true });
    notify(t('notify.rolledBack'), 1200);
  }

  rollbackBtn.onclick = rollback;
  let lastWheelRollback = 0;
  window.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
        event.target.closest?.('button, a, input, textarea, select') || document.querySelector('dialog[open]')) return;
    if (event.code === 'KeyS') {
      if (!skipMode && !isDialogueSkippable(story.nodes[state.node])) return;
      event.preventDefault();
      setSkipMode(skipMode === 'fast' ? '' : 'fast');
    } else if (event.code === 'PageUp') {
      event.preventDefault();
      rollback();
    }
  });
  /* ESC 开 / 关游戏菜单：已开就关闭（等同点 ×），没开就打开（等同点右上「菜单 ☰」）。
     单独挂一条监听——上面那条快捷键在 dialog[open] 或焦点落在控件上时会直接 return，
     ESC 恰恰需要在菜单打开时依然生效。别的弹窗（存档 / 音量 / 语言）打开时不抢它们的 ESC。 */
  window.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code !== 'Escape') return;
    /* index.html 里已有一条捕获阶段的「Esc 关闭当前弹窗」，它关完会 preventDefault。
       这里必须让路，否则刚被关掉的菜单会被本函数立刻重新打开（表现为 ESC 关不掉）。 */
    if (event.defaultPrevented) return;
    if (event.target.closest?.('input, textarea, select')) return;
    const otherDialog = Array.from(document.querySelectorAll('dialog[open]')).some(d => d !== gameMenu);
    if (otherDialog) return;
    event.preventDefault();
    if (gameMenu.open) { gameMenu.close(); return; }
    setSkipMode('');
    gameMenu.show();
    window.dispatchEvent(new Event('blur'));
    menuToggle.setAttribute('aria-expanded', 'true');
  });
  stage.addEventListener('wheel', event => {
    if (event.deltaY >= 0 || event.ctrlKey || event.altKey || event.metaKey ||
        document.querySelector('dialog[open]') || !['dialogue', 'choice', 'rpg'].includes(stage.dataset.mode)) return;
    const now = performance.now();
    if (now - lastWheelRollback < 350) return;
    lastWheelRollback = now;
    event.preventDefault();
    rollback();
  }, { passive: false });

  const volumeMenu = document.querySelector('#volume-menu');
  function openVolumeMenu() {
    updateMusicControls();
    updateVoiceControls();
    updateMasterControl();
    if (gameMenu.open) gameMenu.close();
    volumeMenu.show();
    window.dispatchEvent(new Event('blur'));
  }
  document.querySelector('#volume-settings').onclick = () => openVolumeMenu();
  document.querySelector('#volume-menu-close').onclick = () => volumeMenu.close();
  volumeMenu.addEventListener('close', () => stage.focus({ preventScroll: true }));

  const chapterKey={'1':'chapter1','2':'chapter2','3':'chapter3','heroine':'heroine','final':'final'}[launchParams.get('chapter')];
  if(chapterKey&&!launchParams.get('slot')&&launchParams.get('mode')!=='load')state.node=ILY.data.stories[chapterKey].start;
  if(launchParams.get('player')==='scene-preview'&&Object.hasOwn(story.nodes,launchParams.get('scene')))state.node=launchParams.get('scene');
  /* 从开始界面的存档弹窗选槽进来（?slot=1-3）时，要先读档、再走第一次 go()。
     以前是先 go() 新游戏第一句再读档，于是序章 BGM 先响一声、再淡入这个存档
     真正该放的曲子 —— 玩家听到的就是"读档后音乐没马上切过来"。 */
  const loadSlot = launchParams.get('slot');
  const slotLoaded = Boolean(loadSlot && /^([12]|auto|quick)-[1-6]$/.test(loadSlot));
  if (slotLoaded) {
    const [page, number] = loadSlot.split('-');
    try {
      state = saves.load(page, Number(number));
      rollbackHistory.reset();
      awaitingMenuLoad = false;
    } catch (error) {
      // 读不出来就留在新游戏第一句（state 未被赋值，仍是上面的初始进度）。
      notify(t('save.loadFailed', { msg: error.message }));
    }
  }
  go(state.node, { autosave: false, resyncMusic: slotLoaded });
  /* 记下进场时停在哪一句：之后 go() 到了别的节点，就说明玩家已经开始玩了。 */
  menuLoadNode = state.node;
  if (slotLoaded) notify(t('notify.loaded'));
  else if (launchParams.get('mode') === 'load') openSaveMenu('load');
  else if (migratedLegacySave) notify(t('notify.migrated'));
} catch (error) {
  stage.append(el('p', 'mode-panel', t('error.load')));
  notify(error.message);
}

})();
