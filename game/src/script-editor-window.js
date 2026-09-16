(() => {
  'use strict';
  const KEY = 'ily-script-review-v2', model = ILYScriptReview;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ily-script-review') : null;
  const choices = ['台词', '旁白', '内心', '演出', '玩法/结构'];
  const people = ['旁白', '基生', '“爱理”', '爱理', 'ILY', '十屋', '小泪', '春', '八重', '若菜', '蝶', '优那', '无'];
  const $ = id => document.getElementById(id);
  let state = { nodes: [], current: null, records: {} }, dirty = false;
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
      row.append(head, area, actions); list.append(row);
      if (id === focusId) { area.focus(); area.scrollIntoView({ block: 'center' }); }
    }
    $('count').textContent = `当前场景 ${visible} 段 · 已删除 ${nodes.filter(([id]) => state.records[id]?.deleted).length} 段`;
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.records));
      const message = { type: 'ily-script-save', records: state.records };
      window.opener?.postMessage(message, '*'); channel?.postMessage(message);
      dirty = false;
      status('已保存到本机浏览器并回传游戏，当前文本已刷新；旁白直接显示在画面中。');
    } catch { status('保存失败，请导出 JSON 备份后重试。'); }
  }
  $('save').onclick = save;
  $('clear').onclick = () => { state.records = {}; save(); render(); status('已清除本地修改并恢复原始段落。'); };
  $('show-deleted').onchange = () => render();
  $('export').onclick = () => {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.records, null, 2)], { type: 'application/json' }));
    a.href = url; a.download = 'ily-script-review.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('已导出文本、归类及段落增删记录。');
  };
  function apply(payload) {
    if (payload?.type !== 'ily-script-state' || payload.time === state.time) return;
    const records = dirty ? state.records : (payload.records || {});
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
  try { state.records = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  window.opener?.postMessage({ type: 'ily-script-editor-ready' }, '*');
  channel?.postMessage({ type: 'ily-script-editor-ready' });
  render(); sync(); setInterval(sync, 250);
})();
