/* ============================================================
 * story-lang.js —— 剧情文本的语言叠加层
 *
 * 不在中文原数据上动手：英文时按 window.ILY_ZH2EN（中文原串 -> 英文）
 * 把 story.nodes 上的文本字段整串替换；中文原值存进 node.__zh，
 * 所以「中文 -> 英文 -> 中文」完全可逆。说话人的中文原值额外存
 * node.__speakerZh，供 stage.css 按 data-speaker 上色。
 *
 * 只替换整条字段值，URL / 资源名 / when.value 等程序逻辑字段不碰。
 * ============================================================ */
(() => {
  'use strict';

  /* 节点身上的文本字段 */
  const FIELDS = ['text', 'speaker', 'label', 'title', 'chapterTitle', 'sceneTitle',
    'sectionLabel', 'body', 'subject', 'caption', 'note', 'from', 'name', 'time',
    'subtitle', 'achievement', 'credit'];

  /* 数组里的小对象：哪些字段要跟着换（choices / hotspots / frames …） */
  const LIST_KEYS = {
    choices: ['text', 'label'],
    hotspots: ['label', 'text'],
    frames: ['label', 'text'],
    options: ['text', 'label'],
    items: ['label', 'text']
  };

  /* 手机（ILY.data.phone）里的文本字段 */
  const PHONE_FIELDS = {
    mails: ['from', 'time', 'subject', 'body', 'note'],
    contacts: ['name', 'note', 'from'],
    photos: ['title', 'caption', 'note', 'time']
  };

  /** 递归替换一个字符串字段；返回是否发生变化 */
  function swap(node, field, table) {
    const value = node[field];
    if (typeof value !== 'string') return false;
    const en = table[value];
    if (en === undefined || en === value) return false;
    node.__zh ||= {};
    node.__zh[field] = value;
    node[field] = en;
    if (field === 'speaker') node.__speakerZh = value;   // CSS 上色按中文原名
    return true;
  }

  /** 先还原成中文（__zh 里有快照），保证来回切换可逆 */
  function restore(node, fields) {
    if (!node || typeof node !== 'object' || !node.__zh) return;
    const zh = node.__zh;
    for (const f of fields) {
      if (zh[f] !== undefined && typeof node[f] === 'string') node[f] = zh[f];
    }
    node.__zh = { ...zh };
  }

  function patchOne(node, fields, table) {
    if (!node || typeof node !== 'object') return;
    restore(node, fields);
    if (!table) return;
    let changed = false;
    for (const f of fields) if (swap(node, f, table)) changed = true;
    if (!changed) delete node.__zh;
  }

  function patchNode(node, table) {
    if (!node || typeof node !== 'object') return;
    patchOne(node, FIELDS, table);
    if (!table) return;
    /* walk 之类嵌套容器里的数组（hotspots 在 node.walk.hotspots） */
    if (node.walk && typeof node.walk === 'object') patchList(node.walk, table);
    patchList(node, table);
    function patchList(owner, tbl) {
      for (const [key, fields] of Object.entries(LIST_KEYS)) {
        const list = owner[key];
        if (!Array.isArray(list)) continue;
        for (const item of list) patchOne(item, fields, tbl);
      }
    }
  }

  /** 手机数据：mails / contacts / photos（既可能是数组，也可能是 {A01:…} 字典） */
  function patchPhone(phone, table) {
    if (!phone || typeof phone !== 'object') return;
    for (const [key, fields] of Object.entries(PHONE_FIELDS)) {
      const list = phone[key];
      if (!list) continue;
      const arr = Array.isArray(list) ? list : Object.values(list);
      for (const item of arr) patchOne(item, fields, table);
    }
  }

  function applyStoryLang(story, lang) {
    if (!story || typeof story !== 'object') return;
    const table = lang === 'english' ? (window.ILY_ZH2EN || {}) : null;
    /* 有些数据没有 nodes（例如手机），整块也当节点列表处理 */
    const nodes = story.nodes && typeof story.nodes === 'object' ? story.nodes : null;
    if (nodes) {
      for (const node of Object.values(nodes)) patchNode(node, table);
    } else {
      (Array.isArray(story) ? story : [story]).forEach(o => patchOne(o, FIELDS.concat(...Object.values(LIST_KEYS).flat()), table));
    }
    if (typeof story.title === 'string' && table) story.title = table[story.title] ?? story.title;
    if (story.phone) patchPhone(story.phone, table);
  }

  function applyPhoneLang(phone, lang) {
    patchPhone(phone, lang === 'english' ? (window.ILY_ZH2EN || {}) : null);
  }

  window.ILY = window.ILY || {};
  Object.assign(window.ILY, { applyStoryLang, applyPhoneLang });
})();
