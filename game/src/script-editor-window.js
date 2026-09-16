(() => {
  'use strict';
  const KEY = 'ily-script-review-v2', model = ILYScriptReview;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ily-script-review') : null;
  const choices = ['台词', '旁白', '内心', '演出', '玩法/结构'];
  const people = ['旁白', '基生', '“爱理”', '爱理', 'ILY', '十屋', '小泪', '春', '八重', '若菜', '蝶', '优那', '无'];
  const $ = id => document.getElementById(id);
  let state = { nodes: [], current: null, records: {} }, dirty = false, saving = false, loading = true, revision = null;
  const status = text => { $('status').textContent = text; };
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
  function mediaSelect(kind, value, label) {
    const element = document.createElement('select');
    element.setAttribute('aria-label', label);
    const empty = document.createElement('option');
    empty.value = ''; empty.textContent = kind === 'backgrounds' ? '无背景' : '无立绘';
    element.append(empty);
    for (const id of [...new Set([value, ...(state.media?.[kind] || [])])].filter(Boolean)) {
      const option = document.createElement('option');
      option.value = id; option.textContent = id; option.selected = id === value;
      element.append(option);
    }
    return element;
  }
  function visualEditor(id, node, record) {
    const wrap = document.createElement('div'); wrap.className = 'visual-editor';
    const controls = document.createElement('div'); controls.className = 'visual-controls';
    const backgroundValue = record.background ?? node.cg ?? node.background ?? '';
    const stagedPortraits = node.characters?.map(character => character.image).filter(Boolean) || [];
    const portraitValue = record.portrait ?? node.portrait ?? (stagedPortraits.length === 1 ? stagedPortraits[0] : '');
    const background = mediaSelect('backgrounds', backgroundValue, `背景图片 ${id}`);
    const portrait = mediaSelect('portraits', portraitValue, `人物立绘 ${id}`);
    const field = (text, control) => {
      const label = document.createElement('label');
      const caption = document.createElement('span'); caption.textContent = text;
      label.append(caption, control); return label;
    };
    controls.append(field('背景图片', background), field('人物立绘', portrait));
    const preview = document.createElement('div'); preview.className = 'visual-preview';
    preview.setAttribute('aria-label', '场景图片预览');
    const bg = document.createElement('img'); bg.className = 'preview-background'; bg.alt = '';
    const person = document.createElement('img'); person.className = 'preview-portrait'; person.alt = '';
    const empty = document.createElement('span'); empty.textContent = '无图片';
    preview.append(bg, person, empty);
    const refresh = () => {
      const images = state.media?.images || {};
      const bgPath = images[background.value], personPath = images[portrait.value];
      bg.hidden = !bgPath; person.hidden = !personPath;
      if (bgPath) bg.src = bgPath; else bg.removeAttribute('src');
      if (personPath) person.src = personPath; else person.removeAttribute('src');
      empty.hidden = !bg.hidden || !person.hidden;
    };
    background.onchange = () => { change(id, { background: background.value }); refresh(); };
    portrait.onchange = () => { change(id, { portrait: portrait.value }); refresh(); };
    background.disabled = portrait.disabled = !!record.deleted;
    bg.onerror = () => { bg.hidden = true; empty.hidden = !person.hidden; };
    person.onerror = () => { person.hidden = true; empty.hidden = !bg.hidden; };
    refresh(); wrap.append(controls, preview); return wrap;
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
      status('已写入项目 game/data/story/script-edits.js。文本和图片修改已生效，下次运行自动使用此版本。');
    } catch (error) { dirty = true; status(`未确认保存到项目：${error.message} 草稿仍保留，可导出备份。`); }
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
  window.opener?.postMessage({ type: 'ily-script-editor-ready' }, '*');
  channel?.postMessage({ type: 'ily-script-editor-ready' });
  render(); sync(); setInterval(sync, 250);
  $('save').disabled = $('clear').disabled = true;
  (async () => {
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
    } catch (error) { status(`尚未连接项目保存：${error.message}`); }
    finally { loading = false; busy(false); }
  })();
})();
