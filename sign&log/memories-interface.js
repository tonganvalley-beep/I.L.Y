/* ============================================================
 * memories-interface.js —— 主界面（sign&log/game.html）「回忆」
 *
 * 单个大弹窗 + 三个选项（成就 / 剧情 / 画廊）：点哪个就在这个弹窗内显示哪个，
 * 不弹出独立窗口、不重复显示（每次切换只重渲染当前那一项）。
 * 结构与游戏内 src/memories.js 的三段内容一致。
 *
 * 自包含：不依赖游戏引擎，直接从 localStorage 存档 + window.ILY 数据读取。
 * 数据来源：
 *   · 成就 / 回忆进度：本地存档槽（v1 旧版 + v2 多槽），与游戏内完全一致
 *   · 剧情文本：window.ILY.data.stories（由 ../game/data/story/*.js 注入）
 *   · 画廊：window.ILY_GALLERY（gallery-data.js）+ 手机相册 window.ILY.data.phone.photos
 *
 * 用法（game.html 的菜单点击里调用一次全局函数）：
 *   openMemoriesMain()
 * ============================================================ */
(() => {
'use strict';

/* 收录的章节（与游戏内一致；不存在的章节自动跳过） */
const STORY_IDS = ['prologue', 'chapter1', 'chapter2', 'chapter3', 'heroine', 'final'];
/* 已知成就 ID（与发放处一致） */
const ACH_IDS = ['tunnel-end', 'delete-key', 'daily', 'last-beach', 'door-letter', 'father-reply', 'Just two of us', '十年之后', 'One Last Kiss', 'ILY = I LOVE YOU'];
/* 每个成就解锁时所在的那一幕：填该成就实际发放节点 / 玩法所处的 background 资源 ID，
   作为成就方格的底图，等价于“获取时的游戏背景”。与 game/src/memories.js 保持同一份。 */
const ACH_BG = {
  'tunnel-end':       'bg-tunnel',           // 隧道横版玩法走出隧道
  'delete-key':       'bg-apartment-dusk',   // 序章出租屋 黄昏（删联系人）
  'daily':            'bg-apartment-dusk',   // 序章出租屋 黄昏（读满三封邮件）
  'last-beach':       'bg-coast-blue',       // 序章终幕 蓝光海岸
  'door-letter':      'bg-apartment-night',  // 分支结局「门内的回信」出租屋 夜晚
  'father-reply':     'bg-apartment-dusk',   // 序章出租屋 黄昏（父亲的回信）
  'Just two of us':   'ch2-sunset',          // 第二章 END 夕阳
  '十年之后':           'ch2-beach',           // 第三章 END 海边
  'One Last Kiss':    'bg-coast-blue',       // 终章 S04 蓝光海岸
  'ILY = I LOVE YOU': 'bg-coast-blue'        // 终章 搜索演出 S05
};
/* v2 存档槽 key 的合法格式（与 game/src/core/saves.js 一致） */
const SAVE_KEY_RE = /^(?:[12]-[1-6]|auto-[1-3]|quick-1)$/;

/* ---------- 多语言 ---------- */
const LANG = {
  chinese: {
    'mem.title': '回忆',
    'mem.tab.achievements': '成就',
    'mem.tab.story': '剧情',
    'mem.tab.gallery': '画廊',
    'ach.subtitle': '汇总本账号所有存档（含旧版存档）中解锁的成就。',
    'ach.unlocked': '已解锁',
    'ach.locked': '未解锁',
    'story.subtitle': '按章节重读已经历的剧情文本。',
    'story.empty': '还没有解锁剧情回忆。',
    'gal.empty': '还没有解锁画廊图片。',
    'gal.imgMissing': '图片加载失败',
    'gal.phone': '手机相册',
    'common.close': '关闭',
    'menu.memories': 'Sub4 回忆'
  },
  english: {
    'mem.title': 'Memories',
    'mem.tab.achievements': 'Achievements',
    'mem.tab.story': 'Story',
    'mem.tab.gallery': 'Gallery',
    'ach.subtitle': 'Achievements unlocked across all saves of this account (legacy saves included).',
    'ach.unlocked': 'Unlocked',
    'ach.locked': 'Locked',
    'story.subtitle': 'Re-read story text you have already experienced.',
    'story.empty': 'No story memories have been unlocked yet.',
    'gal.empty': 'No gallery images have been unlocked yet.',
    'gal.imgMissing': 'Image failed to load',
    'gal.phone': 'Phone Album',
    'common.close': 'Close',
    'menu.memories': 'Sub4 Memories'
  }
};
const ACH_NAME = {
  'tunnel-end':        { chinese: '隧道尽头',     english: "Tunnel's End" },
  'delete-key':        { chinese: '删除键',       english: 'Delete Key' },
  'daily':             { chinese: '每日一封',     english: 'Daily Mail' },
  'last-beach':        { chinese: '最后一次海边', english: 'The Last Seaside' },
  'door-letter':       { chinese: '门内的回信',   english: 'The Reply Behind the Door' },
  'father-reply':      { chinese: '父亲的回信',   english: "Father's Reply" },
  'Just two of us':    { chinese: '只是我们俩',   english: 'Just Two of Us' },
  '十年之后':            { chinese: '十年之后',     english: 'Ten Years Later' },
  'One Last Kiss':     { chinese: '最后一个吻',   english: 'One Last Kiss' },
  'ILY = I LOVE YOU':  { chinese: 'ILY = I LOVE YOU', english: 'ILY = I LOVE YOU' }
};

function curLang() { return localStorage.getItem('mygame-lang') || 'chinese'; }
function T(key) { return (LANG[curLang()] || LANG.chinese)[key] || LANG.chinese[key] || key; }
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

/* ---------- 读存档：汇总成就与回忆进度 ---------- */
function getPlayer() { return localStorage.getItem('mygame-token') || 'guest'; }

function collectFromSaves() {
  const player = getPlayer();
  const prefix = `ily-save-v2:${encodeURIComponent(player)}:`;
  const achievements = new Set();
  const progress = { story: new Set(), gallery: new Set() };
  const merge = value => {
    if (!value || !value.flags) return;
    const f = value.flags;
    if (Array.isArray(f.achievements)) f.achievements.forEach(id => achievements.add(id));
    if (f.memories && typeof f.memories === 'object') {
      if (Array.isArray(f.memories.story)) f.memories.story.forEach(id => progress.story.add(id));
      if (Array.isArray(f.memories.gallery)) f.memories.gallery.forEach(id => progress.gallery.add(id));
    }
  };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || '';
    if (key.startsWith(prefix)) {
      if (!SAVE_KEY_RE.test(key.slice(prefix.length))) continue;
      try { merge(JSON.parse(localStorage.getItem(key)).state); } catch { /* 损坏忽略 */ }
    } else if (key === `ily-save-v1:${player}`) {
      try { merge(JSON.parse(localStorage.getItem(key))); } catch { /* 损坏忽略 */ }
    }
  }
  return { achievements, progress };
}

/* ---------- 成就 ---------- */
/* 把「解锁时的那一幕背景」解析成可用地址；资源清单路径相对 game/，主界面在 sign&log/ 需补 ../game/ */
function achBgSrc(img) {
  const images = (window.ILY && window.ILY.data && window.ILY.data.assets && window.ILY.data.assets.images) || {};
  let src = images[img] || '';
  if (!src) return '';
  if (src.startsWith('assets/')) src = '../game/' + src;
  try { src = new URL(src, location.href).href; } catch { /* 已是绝对地址 */ }
  return src;
}
function renderAchievements(list) {
  const { achievements } = collectFromSaves();
  const known = new Set(ACH_IDS);
  const extras = [...achievements].filter(id => !known.has(id));
  list.replaceChildren();
  [...ACH_IDS, ...extras].forEach(id => {
    const got = achievements.has(id);
    const li = el('li', 'ach-tile ' + (got ? 'unlocked' : 'locked'));

    /* 底图：解锁所在场景的背景；加载失败留占位而不是碎图 */
    if (got) {
      const src = achBgSrc(ACH_BG[id]);
      if (src) {
        const img = document.createElement('img');
        img.className = 'ach-bg';
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = () => { img.remove(); li.append(el('span', 'ach-missing')); };
        li.append(img);
      }
    }

    const info = ACH_NAME[id];
    const name = got ? (info ? info[curLang()] : id) : '？？？';
    li.append(el('span', 'ach-state', T(got ? 'ach.unlocked' : 'ach.locked')));
    li.append(el('span', 'ach-name', name));
    list.append(li);
  });
}

/* ---------- 剧情回忆 ---------- */
function renderStory(log) {
  const { progress } = collectFromSaves();
  log.replaceChildren();
  const frag = document.createDocumentFragment();
  let any = false;
  const stories = (window.ILY && window.ILY.data && window.ILY.data.stories) || {};
  // 使用工作区发布的文本与增删记录，避免新版画廊带回旧版台词。
  const current={nodes:Object.fromEntries(Object.values(stories).flatMap(s=>Object.entries(s.nodes).map(([key,node])=>[key,{...node}])))};
  if(window.ILYScriptReview)window.ILYScriptReview.create(current).apply(window.ILY_SCRIPT_EDITS||{});
  STORY_IDS.forEach(id => {
    const story = stories[id];
    if (!story || !story.nodes) return;
    let added = false;
    Object.keys(current.nodes).forEach(nid => {
      const node = current.nodes[nid];
      if((node.chapter||'prologue')!==id)return;
      if (!progress.story.has(nid) || !node || typeof node.text !== 'string' || !node.text.trim()) return;
      if (!added) { frag.append(el('div', 'story-chapter', story.title || id)); added = true; any = true; }
      const entry = el('div', 'story-entry');
      const isNarration = !node.speaker || node.speaker === '旁白';
      if (isNarration) entry.classList.add('plain');
      else entry.append(el('span', 'who', node.speaker));
      entry.append(el('span', 'say', node.text));
      frag.append(entry);
    });
  });
  if (!any) frag.append(el('p', 'story-entry plain', T('story.empty')));
  log.append(frag);
  log.scrollTop = 0;
}

/* ---------- 画廊 ---------- */
function galleryBaseUrl() {
  const tag = document.querySelector('script[src*="gallery-data.js"]');
  const raw = tag ? tag.getAttribute('src') : './gallery-data.js';
  try { return new URL(raw, location.href).href; } catch { return raw; }
}
function resolveAlbumImg(img) {
  const images = (window.ILY && window.ILY.data && window.ILY.data.assets && window.ILY.data.assets.images) || {};
  let src = images[img] || '';
  if (!src) return '';
  /* 资源清单路径相对 game/；主界面在 sign&log/，补 ../game/ 才能解析到 */
  if (src.startsWith('assets/')) src = '../game/' + src;
  return src;
}
function renderGallery(grid, empty) {
  const { progress } = collectFromSaves();
  const base = galleryBaseUrl();
  const entries = [];
  /* gallery-data.js 里用户添加的插图 */
  const gallery = Array.isArray(window.ILY_GALLERY) ? window.ILY_GALLERY : [];
  gallery.forEach(item => {
    if (!item || typeof item.src !== 'string' || !item.src || typeof item.unlock !== 'string') return;
    if (!progress.gallery.has(item.unlock)) return;
    let src = item.src;
    try { src = new URL(item.src, base).href; } catch { /* 已是绝对地址 */ }
    entries.push({ src, title: item.title || '', desc: item.note || item.desc || '', fromPhone: false });
  });
  /* 手机相册照片 */
  const photos = (window.ILY && window.ILY.data && window.ILY.data.phone && window.ILY.data.phone.photos) || {};
  Object.keys(photos).forEach(id => {
    const photo = photos[id] || {};
    if (!photo.img || !progress.gallery.has(photo.img)) return;
    let src = resolveAlbumImg(photo.img);
    if (!src) return;
    try { src = new URL(src, location.href).href; } catch { /* 原样保留 */ }
    entries.push({ src, title: photo.title || id, desc: photo.caption || '', fromPhone: true });
  });

  grid.replaceChildren();
  empty.hidden = entries.length > 0;
  empty.textContent = T('gal.empty');
  entries.forEach(item => {
    const card = el('div', 'flip-card'); card.tabIndex = 0;
    const inner = el('div', 'flip-inner');
    const front = el('div', 'flip-face flip-front');
    const img = document.createElement('img');
    img.src = item.src; img.alt = item.title; img.loading = 'lazy';
    img.onerror = () => { img.remove(); front.append(el('span', 'flip-missing', T('gal.imgMissing'))); };
    front.append(img);
    if (item.fromPhone) front.append(el('span', 'flip-tag', T('gal.phone')));
    const back = el('div', 'flip-face flip-back');
    back.append(el('strong', '', item.title));
    if (item.desc) back.append(el('p', '', item.desc));
    inner.append(front, back);
    card.append(inner);
    const flip = () => card.classList.toggle('flipped');
    card.addEventListener('click', flip);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    grid.append(card);
  });
}

/* ---------- 单个大弹窗 + 三个选项（点哪个显示哪个） ---------- */
let built = false;
let dialog, tabs, subEl, content, activeTab = 'achievements';

function heading(onClose) {
  const head = el('div', 'mem-head');
  const texts = el('div');
  texts.append(el('h2', '', T('mem.title')));
  const close = el('button', '', '×'); close.type = 'button';
  close.setAttribute('aria-label', T('common.close'));
  close.onclick = onClose;
  head.append(texts, close);
  return head;
}
function actionsBar(onClose) {
  const bar = el('div', 'dialog-actions');
  const c = el('button', '', T('common.close')); c.type = 'button';
  c.onclick = onClose;
  bar.append(c);
  return bar;
}

function renderContent() {
  tabs.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.tab === activeTab));
  content.replaceChildren();                 /* 每次只渲染当前一项，绝不重复显示 */
  if (activeTab === 'achievements') {
    subEl.textContent = T('ach.subtitle');
    const list = el('ul', 'ach-grid');
    renderAchievements(list);
    content.append(list);
  } else if (activeTab === 'story') {
    subEl.textContent = T('story.subtitle');
    const log = el('div', 'story-log'); log.id = 'storyLogMain';
    renderStory(log);
    content.append(log);
  } else {
    subEl.textContent = '';
    const grid = el('div', 'flip-grid'); grid.id = 'flipGridMain';
    const empty = el('p', 'hint');
    renderGallery(grid, empty);
    content.append(grid, empty);
  }
}

function build() {
  if (built) return;
  built = true;

  dialog = el('dialog', 'mem-dialog');
  dialog.id = 'memoriesDialog';
  dialog.setAttribute('aria-labelledby', 'memTitleMain');
  const head = heading(() => dialog.close());
  head.querySelector('h2').id = 'memTitleMain';
  subEl = el('p', 'hint');
  tabs = el('nav', 'mem-tabs'); tabs.setAttribute('aria-label', T('mem.title'));
  [['achievements', 'mem.tab.achievements'], ['story', 'mem.tab.story'], ['gallery', 'mem.tab.gallery']].forEach(([tab, key]) => {
    const b = el('button', '', T(key)); b.type = 'button'; b.dataset.tab = tab; tabs.append(b);
  });
  content = el('div', 'mem-content');
  dialog.append(head, subEl, tabs, content, actionsBar(() => dialog.close()));
  document.body.append(dialog);

  tabs.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => { activeTab = b.dataset.tab; renderContent(); });
  });
  dialog.addEventListener('close', () => {
    const menu = document.getElementById('phoneMenu');
    if (menu) try { menu.focus({ preventScroll: true }); } catch {}
  });

  injectStyles();
}

function open() {
  build();
  activeTab = 'achievements';
  renderContent();
  dialog.showModal();
}

function injectStyles() {
  if (document.getElementById('memoriesInterfaceStyle')) return;
  const style = document.createElement('style');
  style.id = 'memoriesInterfaceStyle';
  style.textContent = [
    /* 弹窗自身样式（含铺满屏幕）统一由 ../game/styles/memories.css 提供，这里只补 dialog 内联元素的配色 */
    '#memoriesDialog .dialog-actions { margin-top: 18px; }',
    '#memoriesDialog .dialog-actions button { padding: 9px 16px; color: #e5edf2; background: #173d79;',
    '  border: 1px solid #83b9ce; border-radius: 5px; font: inherit; cursor: pointer; }',
    '#memoriesDialog .dialog-actions button:hover { background: #1d526c; }',
    '#memoriesDialog .mem-tabs button { color: #cfe0ea; cursor: pointer; }'
  ].join('\n');
  document.head.append(style);
}

/* 暴露给 game.html 的菜单点击处理（全局函数） */
window.openMemoriesMain = open;

/* 切语言时若弹窗开着，按新语言重绘当前选项 */
window.addEventListener('DOMContentLoaded', () => {
  const lb = document.getElementById('langBtn');
  if (!lb) return;
  lb.addEventListener('click', () => {
    if (!built || !dialog.open) return;
    dialog.querySelector('h2').textContent = T('mem.title');
    dialog.querySelector('.mem-head > button').setAttribute('aria-label', T('common.close'));
    dialog.querySelector('.dialog-actions button').textContent = T('common.close');
    tabs.querySelectorAll('button').forEach(b => { b.textContent = T({ achievements: 'mem.tab.achievements', story: 'mem.tab.story', gallery: 'mem.tab.gallery' }[b.dataset.tab]); });
    renderContent();
  });
});
})();
