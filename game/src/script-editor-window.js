(() => {
  'use strict';
  const KEY = 'ily-script-review-v2', model = ILYScriptReview;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ily-script-review') : null;
  const choices = ['台词', '旁白', '内心', '演出', '玩法/结构'];
  const people = ['旁白', '基生', '“爱理”', '爱理', 'ILY', '十屋', '小泪', '春', '八重', '若菜', '蝶', '优那', '无'];
  const $ = id => document.getElementById(id);
  let state = { nodes: [], current: null, records: {} }, dirty = false, saving = false, loading = true, revision = null;
  const status = text => { $('status').textContent = text; };
  // 顶部横幅：保存/上传失败这类会让人以为“改了没生效”的情况必须醒目。
  const banner = (text, kind = 'info') => {
    const element = $('banner');
    if (!element) return;
    if (!text) { element.hidden = true; element.textContent = ''; return; }
    element.hidden = false;
    element.className = `banner banner-${kind}`;
    element.textContent = text;
  };
  const offlineHint = '请用 npm run chapters 启动章节调试，并使用终端打印的 HTTP 地址；改过 tools/ 下的服务器代码后要重启命令。';
  try {
    const referrer = document.referrer && new URL(document.referrer);
    if (referrer?.origin === location.origin) $('return-game').href = referrer.href;
  } catch {}
  function change(id, patch) {
    state.records[id] = { ...state.records[id], ...patch };
    dirty = true;
    status('有未保存的修改。');
  }
  function select(values, value, label) {
    const element = document.createElement('select');
    element.setAttribute('aria-label', label);
    for (const item of [...new Set([value, ...values])]) {
      const option = document.createElement('option');
      option.value = item; option.textContent = item || '旁白'; option.selected = item === value;
      element.append(option);
    }
    return element;
  }
  function mediaSelect(kind, value, label, emptyText) {
    const element = document.createElement('select');
    element.setAttribute('aria-label', label);
    const empty = document.createElement('option');
    empty.value = ''; empty.textContent = emptyText || (kind === 'backgrounds' ? '无背景' : '无立绘');
    element.append(empty);
    for (const id of [...new Set([value, ...(state.media?.[kind] || [])])].filter(Boolean)) {
      const option = document.createElement('option');
      option.value = id; option.textContent = id; option.selected = id === value;
      element.append(option);
    }
    element.value = value || '';
    return element;
  }
  const uploads = () => window.ILY_UPLOADED_ASSETS || {};
  // 本地选过的图片登记在 uploaded-assets.js；游戏推送的素材表可能还没包含，补进去。
  function mergeUploaded(media) {
    const ids = Object.keys(uploads());
    if (!ids.length) return media;
    const source = media || { images: {}, backgrounds: [], portraits: [] };
    const match = { backgrounds: /^(bg|background)-/i, portraits: /^portrait-/i };
    return {
      images: { ...(source.images || {}), ...uploads() },
      backgrounds: [...new Set([...(source.backgrounds || []), ...ids.filter(id => match.backgrounds.test(id))])].sort(),
      portraits: [...new Set([...(source.portraits || []), ...ids.filter(id => match.portraits.test(id))])].sort()
    };
  }
  function registerAsset(asset, kind) {
    window.ILY_UPLOADED_ASSETS = { ...uploads(), [asset.id]: asset.path };
    state.media = mergeUploaded(state.media);
    const list = state.media[kind];
    if (!list.includes(asset.id)) state.media[kind] = [...list, asset.id];
    try { window.opener?.postMessage({ type: 'ily-script-media-refresh' }, '*'); channel?.postMessage({ type: 'ily-script-media-refresh' }); } catch {}
  }
  async function uploadAsset(file, kind) {
    if (!['http:', 'https:'].includes(location.protocol)) throw new Error('请用 npm start 启动项目，再从服务器地址打开游戏，才能从本地选择图片。');
    const response = await fetch(`/api/script-review-asset?kind=${encodeURIComponent(kind)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
      body: file, cache: 'no-store', signal: AbortSignal.timeout(60000)
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('当前服务器不支持图片上传。请重启 npm start 后重试。'); }
    if (!response.ok || !data?.id || !data?.path) throw new Error(data?.error || '图片上传失败。');
    return data;
  }
  function ensureOption(element, value, text) {
    if ([...element.options].some(option => option.value === value)) return;
    const option = document.createElement('option');
    option.value = value; option.textContent = text || value;
    element.append(option);
  }
  // “选择本地图片…”按钮：直接打开系统文件窗口；下拉框保留，用来挑已有素材。
  function mediaField(kind, value, label, onPick, emptyText) {
    const wrap = document.createElement('div'); wrap.className = 'media-field';
    const element = mediaSelect(kind, value, label, emptyText);
    const picker = document.createElement('button');
    picker.type = 'button'; picker.className = 'pick-file'; picker.textContent = '选择本地图片…';
    picker.title = '打开本地文件夹挑选一张图片，选好后自动存入项目';
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
    input.setAttribute('aria-label', `${label}（从本地选择）`);
    picker.onclick = () => input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const caption = picker.textContent;
      picker.disabled = true; picker.textContent = '处理中…';
      status(`正在识别本地图片 ${file.name}…`);
      try {
        const asset = await uploadAsset(file, kind === 'backgrounds' ? 'background' : 'portrait');
        if (asset.register) registerAsset(asset, kind);
        ensureOption(element, asset.id, asset.reused ? `${asset.id}（项目已有）` : `${asset.id}（本地）`);
        element.value = asset.id;
        onPick(asset.id);
        const message = asset.reused
          ? `${asset.name} 与项目素材 ${asset.id} 内容一致，已直接引用，没有重复保存。`
          : `已选择本地图片 ${asset.name}，保存后生效。`;
        status(message);
        banner(message, 'ok');
      } catch (error) {
        status(error.message);
        banner(`本地图片没有存入项目：${error.message} ${offlineHint}`, 'error');
      } finally { picker.disabled = false; picker.textContent = caption; }
    };
    wrap.append(picker, element, input);
    return { wrap, element };
  }
  const cloneCharacters = characters => characters.map(character => ({ ...character }));
  function sourceCharacters(node) {
    if (Array.isArray(node.characters)) return cloneCharacters(node.characters);
    return node.portrait ? [{ image: node.portrait, position: 'center' }] : [];
  }
  function effectiveCharacters(node, record) {
    if (Array.isArray(record.characters)) return cloneCharacters(record.characters);
    if (record.portrait != null) return record.portrait ? [{ image: record.portrait, position: 'center' }] : [];
    return sourceCharacters(node);
  }
  function hasCharacterOverride(record) {
    return Object.hasOwn(record, 'characters') || Object.hasOwn(record, 'portrait');
  }
  function changeCharacters(id, characters) {
    const record = { ...(state.records[id] || {}) };
    delete record.portrait;
    record.characters = cloneCharacters(characters);
    state.records[id] = record;
    dirty = true;
    status('有未保存的修改。');
  }
  function restoreCharacters(id) {
    const record = { ...(state.records[id] || {}) };
    delete record.characters;
    delete record.portrait;
    if (Object.keys(record).length) state.records[id] = record;
    else delete state.records[id];
    dirty = true;
    status('已恢复此段的原始人物配置，保存后生效。');
  }
  function positionSelect(value, label) {
    const element = document.createElement('select');
    element.setAttribute('aria-label', label);
    for (const [id, text] of [['left', '左侧'], ['center', '中间'], ['right', '右侧']]) {
      const option = document.createElement('option');
      option.value = id; option.textContent = text; option.selected = id === value;
      element.append(option);
    }
    element.value = ['left', 'center', 'right'].includes(value) ? value : 'center';
    return element;
  }
  function visualEditor(id, node, record) {
    const wrap = document.createElement('div'); wrap.className = 'visual-editor';
    const controls = document.createElement('div'); controls.className = 'visual-controls';
    const backgroundValue = record.background ?? node.cg ?? node.background ?? '';
    const originalCharacters = sourceCharacters(node);
    let characters = effectiveCharacters(node, record);
    const background = mediaField('backgrounds', backgroundValue, `背景图片 ${id}`, value => { change(id, { background: value }); refresh(); });
    const field = (text, control) => {
      const label = document.createElement('label');
      const caption = document.createElement('span'); caption.textContent = text;
      label.append(caption, control.wrap); return label;
    };
    controls.append(field('背景图片', background));
    const characterEditor = document.createElement('section'); characterEditor.className = 'character-editor';
    const characterHead = document.createElement('div'); characterHead.className = 'character-head';
    const characterStatus = document.createElement('span');
    const characterActions = document.createElement('div'); characterActions.className = 'character-actions';
    const characterList = document.createElement('div'); characterList.className = 'character-list';
    const addCharacter = button('添加人物', () => {
      if (characters.length >= 12) return;
      const positions = ['center', 'right', 'left'];
      characters.push({ image: state.media?.portraits?.[0] || '', position: positions[characters.length % positions.length] });
      changeCharacters(id, characters); renderCharacterRows(); refresh();
    });
    const clearCharacters = button('清空全部', () => {
      characters = [];
      changeCharacters(id, characters); renderCharacterRows(); refresh();
    });
    const restoreOriginal = button('恢复原始配置', () => {
      restoreCharacters(id);
      characters = sourceCharacters(node); renderCharacterRows(); refresh();
    });
    characterActions.append(addCharacter, clearCharacters, restoreOriginal);
    characterHead.append(characterStatus, characterActions);
    characterEditor.append(characterHead, characterList);
    controls.append(characterEditor);
    const preview = document.createElement('div'); preview.className = 'visual-preview';
    preview.setAttribute('aria-label', '场景图片预览');
    const bg = document.createElement('img'); bg.className = 'preview-background'; bg.alt = '';
    const previewCharacters = document.createElement('div'); previewCharacters.className = 'preview-characters';
    const empty = document.createElement('span'); empty.textContent = '无图片';
    preview.append(bg, previewCharacters, empty);
    const refresh = () => {
      const images = state.media?.images || {};
      const bgPath = images[background.element.value];
      bg.hidden = !bgPath;
      if (bgPath) bg.src = bgPath; else bg.removeAttribute('src');
      previewCharacters.replaceChildren();
      for (const character of characters) {
        const path = images[character.image];
        if (!path) continue;
        const person = document.createElement('img');
        person.className = 'preview-portrait'; person.alt = ''; person.src = path;
        person.dataset.position = ['left', 'center', 'right'].includes(character.position) ? character.position : 'center';
        person.style.setProperty?.('--preview-scale', Math.min(1.4, Math.max(.5, Number(character.scale) || 1)));
        person.onerror = () => { person.hidden = true; empty.hidden = !bg.hidden || [...previewCharacters.children].some(image => !image.hidden); };
        previewCharacters.append(person);
      }
      empty.hidden = !bg.hidden || previewCharacters.children.length > 0;
    };
    function updateCharacterStatus() {
      const overridden = hasCharacterOverride(state.records[id] || {});
      characterStatus.textContent = overridden
        ? (characters.length ? `人物 ${characters.length} 人 · 已修改` : `人物 0 人 · 已清空（原始 ${originalCharacters.length} 人）`)
        : `人物 ${characters.length} 人 · 原始配置`;
      clearCharacters.disabled = !!record.deleted || characters.length === 0;
      restoreOriginal.disabled = !!record.deleted || !overridden;
      addCharacter.disabled = !!record.deleted || characters.length >= 12;
      addCharacter.title = characters.length >= 12 ? '每个场景最多添加 12 个人物' : '';
    }
    function renderCharacterRows() {
      characterList.replaceChildren();
      updateCharacterStatus();
      if (!characters.length) {
        const none = document.createElement('p'); none.className = 'character-empty'; none.textContent = '当前没有人物立绘';
        characterList.append(none);
        return;
      }
      characters.forEach((character, index) => {
        const row = document.createElement('div'); row.className = 'character-row';
        const media = mediaField('portraits', character.image || '', `人物 ${index + 1} 立绘 ${id}`, value => {
          characters[index] = { ...characters[index], image: value };
          changeCharacters(id, characters); updateCharacterStatus(); refresh();
        }, '选择立绘…');
        const assetLabel = document.createElement('label');
        const assetCaption = document.createElement('span'); assetCaption.textContent = `人物 ${index + 1}`;
        assetLabel.append(assetCaption, media.wrap);
        const position = positionSelect(character.position, `人物 ${index + 1} 站位 ${id}`);
        const positionLabel = document.createElement('label');
        const positionCaption = document.createElement('span'); positionCaption.textContent = '站位';
        positionLabel.append(positionCaption, position);
        const remove = button('移除', () => {
          characters.splice(index, 1);
          changeCharacters(id, characters); renderCharacterRows(); refresh();
        });
        remove.className = 'remove-character';
        media.element.onchange = () => {
          characters[index] = { ...characters[index], image: media.element.value };
          changeCharacters(id, characters); updateCharacterStatus(); refresh();
        };
        position.onchange = () => {
          characters[index] = { ...characters[index], position: position.value };
          changeCharacters(id, characters); updateCharacterStatus(); refresh();
        };
        media.element.disabled = position.disabled = remove.disabled = !!record.deleted;
        for (const control of media.wrap.querySelectorAll('button, input')) control.disabled = !!record.deleted;
        row.append(assetLabel, positionLabel, remove); characterList.append(row);
      });
    }
    background.element.onchange = () => { change(id, { background: background.element.value }); refresh(); };
    background.element.disabled = !!record.deleted;
    for (const control of background.wrap.querySelectorAll('button, input')) control.disabled = !!record.deleted;
    bg.onerror = () => { bg.hidden = true; empty.hidden = [...previewCharacters.children].some(image => !image.hidden); };
    renderCharacterRows(); refresh(); wrap.append(controls, preview); return wrap;
  }
  function button(label, action, disabled = false, title = '') {
    const element = document.createElement('button');
    element.type = 'button'; element.textContent = label; element.onclick = action;
    element.disabled = disabled; element.title = title;
    return element;
  }
  function add(anchor, node, position) {
    const id = `review_${crypto.randomUUID()}`;
    const record = state.records[anchor] || {}, added = model.addition(node);
    const kind = record.kind || model.kind(added);
    change(id, { added: true, anchor, position, node: added, kind: kind === '玩法/结构' ? '旁白' : kind, speaker: record.speaker ?? added.speaker, text: '' });
    render(id);
    status('已新增文本段，填写后点击“保存修改”。');
  }
  function render(focusId) {
    $('meta').textContent = state.current ? `${state.current.id} · ${state.current.chapterTitle || ''} · 场景 ${state.current.scene || '—'}` : '等待游戏连接……';
    const list = $('list'); list.replaceChildren();
    const nodes = model.ordered(state.nodes, state.records);
    let visible = 0;
    for (const [id, node] of nodes) {
      const record = state.records[id] || {};
      if (record.deleted && !$('show-deleted').checked) continue;
      if (!record.deleted) visible++;
      const row = document.createElement('article');
      row.className = 'row' + (id === state.current?.id ? ' current' : '') + (record.deleted ? ' deleted' : '');
      row.dataset.id = id;
      const head = document.createElement('div'); head.className = 'head';
      const small = document.createElement('small'); small.textContent = `${id}${record.added ? ' · 新增' : ''}${record.deleted ? ' · 已删除' : ''}`;
      const type = select(choices, record.kind || model.kind(node), '文本类型');
      const who = select(people, record.speaker ?? node.speaker ?? '旁白', '说话人');
      const area = document.createElement('textarea'); area.rows = 2;
      area.setAttribute('aria-label', `文本段 ${id}`);
      area.value = record.text ?? node.text ?? node.title ?? '';
      const edit = () => change(id, { kind: type.value, speaker: who.value, text: area.value });
      type.onchange = edit; who.onchange = edit; area.oninput = edit;
      type.disabled = who.disabled = area.disabled = !!record.deleted;
      head.append(small, type, who);
      const actions = document.createElement('div'); actions.className = 'row-actions';
      if (record.deleted) actions.append(button('恢复此段', () => { change(id, { deleted: false }); render(); }));
      else actions.append(
        button('前面新增', () => add(id, node, 'before')),
        button('后面新增', () => add(id, node, 'after'), !node.next, '在本段之后插入文本段'),
        button('删除此段', () => { change(id, { deleted: true }); render(); status('已删除文本段，可勾选“显示已删除段落”恢复；保存后生效。'); }, !record.added && !model.canDelete(node), '选项、玩法和结尾节点需保留；普通文本段可以删除')
      );
      row.append(head, area, visualEditor(id, node, record), actions); list.append(row);
      if (id === focusId) { area.focus(); area.scrollIntoView({ block: 'center' }); }
    }
    $('count').textContent = `当前场景 ${visible} 段 · 已删除 ${nodes.filter(([id]) => state.records[id]?.deleted).length} 段`;
    if (saving || loading) for (const input of list.querySelectorAll('button, select, textarea')) input.disabled = true;
  }
  async function projectRequest(method = 'GET', body) {
    if (!['http:', 'https:'].includes(location.protocol)) throw new Error('请用 npm start 启动项目，再从服务器地址进入游戏，才能直接保存项目文件。');
    const response = await fetch('/api/script-review', {
      method, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('当前服务器不支持项目保存。请重启 npm start 后重试。'); }
    if (!response.ok) throw new Error(data.error || '项目保存失败。');
    if (!data.revision || !data.records) throw new Error('服务器未返回有效的项目版本，请重启 npm start。');
    return data;
  }
  function publish(records) {
    window.ILY_SCRIPT_EDITS = records;
    window.ILY_SCRIPT_EDITS_PROJECT_SAVED = true;
    try { localStorage.removeItem(KEY); } catch {}
    const message = { type: 'ily-script-save', records, projectSaved: true };
    try { window.opener?.postMessage(message, '*'); channel?.postMessage(message); } catch {}
  }
  function busy(value) {
    saving = value;
    $('save').disabled = $('clear').disabled = value;
    $('save').textContent = value ? '处理中…' : '保存修改';
    render();
  }
  async function save() {
    if (saving || loading) return;
    busy(true);
    status('正在写入项目文件…');
    try {
      // If initial connection failed, fetch the current version before trying again.
      if (!revision) {
        const latest = await projectRequest();
        if (JSON.stringify(latest.records) !== JSON.stringify(window.ILY_SCRIPT_EDITS || {})) throw new Error('项目版本已改变，请先导出草稿备份，再恢复项目已保存版本。');
        revision = latest.revision;
      }
      const result = await projectRequest('POST', { records: state.records, revision });
      revision = result.revision;
      state.records = result.records;
      publish(result.records);
      dirty = false;
      const written = `已写入项目 game/data/story/script-edits.js（${new Date().toLocaleTimeString('zh-CN')}）。文本和图片修改已生效，刷新游戏后仍使用这一版。`;
      status(written);
      banner(written + '如果没有变化，请确认游戏页面是从 npm start 的地址打开的（不是双击 HTML）。', 'ok');
    } catch (error) {
      dirty = true;
      status(`未确认保存到项目：${error.message}`);
      banner(`保存没有写入项目：${error.message} ${offlineHint}`, 'error');
    }
    finally { busy(false); }
  }
  $('save').onclick = save;
  $('clear').onclick = async () => {
    if (saving || loading) return;
    busy(true);
    try {
      const result = await projectRequest();
      state.records = result.records; revision = result.revision; dirty = false;
      publish(result.records);
      status('已恢复项目中最后一次确认保存的版本。');
    } catch (error) { status(`恢复失败：${error.message}`); }
    finally { busy(false); }
  };
  $('show-deleted').onchange = () => render();
  $('export').onclick = () => {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.records, null, 2)], { type: 'application/json' }));
    a.href = url; a.download = 'ily-script-review.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('已导出文本、图片、归类及段落增删记录。');
  };
  $('export-js').onclick = () => {
    const a = document.createElement('a');
    const source = model.serializeRecords(state.records);
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    a.href = url; a.download = 'script-edits.js'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('已导出可发布的 script-edits.js，其中包含文本和图片修改。');
  };
  function apply(payload) {
    if (payload?.type !== 'ily-script-state' || payload.time === state.time) return;
    const records = dirty || saving || loading || revision ? state.records : (payload.records || {});
    const sameScene = state.current && payload.current?.chapter === state.current.chapter && payload.current?.scene === state.current.scene;
    state = { ...payload, records };
    state.media = mergeUploaded(state.media);
    if (sameScene && document.activeElement?.matches('textarea, select')) {
      // Keep the caret and unsaved edits while the game advances.
      for (const row of $('list').children) row.classList.toggle('current', row.dataset.id === state.current.id);
      $('meta').textContent = `${state.current.id} · ${state.current.chapterTitle || ''} · 场景 ${state.current.scene || '—'}`;
    } else render();
  }
  const sync = () => { try { apply(JSON.parse(localStorage.getItem('ily-script-live-state') || 'null')); } catch {} };
  addEventListener('message', event => apply(event.data));
  if (channel) channel.onmessage = event => apply(event.data);
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  if (!window.ILY_SCRIPT_EDITS_PROJECT_SAVED) try { state.records = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  state.records = model.mergeRecords(window.ILY_SCRIPT_EDITS, state.records);
  state.media = mergeUploaded(state.media);
  window.opener?.postMessage({ type: 'ily-script-editor-ready' }, '*');
  channel?.postMessage({ type: 'ily-script-editor-ready' });
  render(); sync(); setInterval(sync, 250);
  $('save').disabled = $('clear').disabled = true;
  const connect = async () => {
    loading = true;
    try {
      const result = await projectRequest();
      revision = result.revision;
      if (result.projectSaved) { state.records = result.records; publish(result.records); }
      else {
        // Keep pre-upgrade local work as a draft until its first project save.
        state.records = model.mergeRecords(result.records, state.records);
        dirty = JSON.stringify(state.records) !== JSON.stringify(result.records);
      }
      status(dirty ? '已保留旧版浏览器修改，点击“保存修改”写入项目。' : '已连接项目，点击“保存修改”直接写入正式 JS。');
      banner(dirty ? '已连接项目，但本地还有未写入的修改，点击“保存修改”写入。' : '', dirty ? 'info' : 'info');
      render();
    } catch (error) {
      status(`尚未连接项目保存：${error.message}`);
      banner(`尚未连接项目保存：${error.message} 此时只能查看，保存和选择本地图片都不会生效。${offlineHint}`, 'error');
    } finally { loading = false; busy(false); }
  };
  const reconnect = $('reconnect');
  if (reconnect) reconnect.onclick = () => { if (!saving) connect(); };
  connect();
})();
