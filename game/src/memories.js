/* ============================================================
 * memories.js —— 游戏内「回忆」：成就 / 剧情 / 画廊
 *
 * 与主界面（sign&log/game.html）的「回忆」完全统一：
 *   · 单个大弹窗 + 三个内嵌标签（成就 / 剧情 / 画廊），点哪个就显示哪个，
 *     不再弹出独立窗口（与 sign&log/memories-interface.js 同一套结构）。
 *   · 保留当前工作区的全部章节，包括女主视角。
 *
 * 依赖（均在 index.html 中先于本文件加载）：
 *   ILY.t                 src/i18n.js
 *   ILY.data.stories.*    data/story/prologue.js / chapter1.js / ...
 *   ILY.data.phone.photos data/story/phone.js
 *   ILY.data.assets       data/assets.js
 *   window.ILY_GALLERY    ../sign&log/gallery-data.js（可选，图由用户自行添加）
 *
 * 用法（main.js 中调用一次）：
 *   ILY.initMemories({ saves, getState: () => state, resolveAsset: key => assets.image(key), stage });
 *   之后 ILY.openMemories() 即可打开。
 * ============================================================ */
(() => {
'use strict';

const t = (key, vars) => ILY.t(key, vars);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/* 剧情回忆收录的章节 */
const STORY_IDS = ['prologue', 'chapter1', 'chapter2', 'chapter3', 'heroine', 'final'];
/* 已知成就 ID（与发放处一致：walk.js / phone.js / prologue.js；与主界面一致） */
const ACH_IDS = ['tunnel-end', 'delete-key', 'daily', 'last-beach', 'door-letter', 'father-reply', 'Just two of us', '十年之后', 'One Last Kiss', 'ILY = I LOVE YOU'];
/* 每个成就解锁时所在的那一幕：填该成就实际发放节点 / 玩法所处的 background 资源 ID，
   作为成就方格的底图，等价于“获取时的游戏背景”。 */
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
/* v2 存档槽 key 的合法格式（与 src/core/saves.js 一致） */
const SAVE_KEY_RE = /^(?:[12]-[1-6]|auto-[1-3]|quick-1)$/;

let deps = { saves: null, getState: null, resolveAsset: null, stage: null };
let built = false;
let memDialog, memTabs, memSub, content, activeTab = 'achievements';

/* ---------- 成就 ----------
   来源：当前正在玩但未存档的进度（getState）+ 本账号全部 v2 存档槽 + 旧版 v1 存档。
   这样刚解锁成就、还没存档时也能在回忆里看到。 */
function collectAchievements() {
  const unlocked = new Set();
  const state = typeof deps.getState === 'function' ? deps.getState() : null;
  const live = state && state.flags && state.flags.achievements;
  if (Array.isArray(live)) live.forEach(id => unlocked.add(id));

  const saves = deps.saves;
  if (saves && saves.storage) {
    for (const page of ['1', '2', 'auto', 'quick']) {
      let items = [];
      try { items = saves.list(page); } catch { continue; }
      for (const item of items) {
        const list = item.status === 'ok' && item.record.state && item.record.state.flags && item.record.state.flags.achievements;
        if (Array.isArray(list)) list.forEach(id => unlocked.add(id));
      }
    }
    try {
      const legacy = JSON.parse(saves.storage.getItem(saves.legacyKey) || 'null');
      const list = legacy && legacy.flags && legacy.flags.achievements;
      if (Array.isArray(list)) list.forEach(id => unlocked.add(id));
    } catch { /* 旧档损坏则忽略 */ }
  } else {
    /* 没拿到 saves（例如在测试环境独立挂载）时退回直接扫 localStorage */
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index) || '';
        const at = key.indexOf(':');
        if (at < 0 || key.slice(0, at) !== 'ily-save-v2') continue;
        if (!SAVE_KEY_RE.test(key.slice(key.lastIndexOf(':') + 1))) continue;
        const record = JSON.parse(localStorage.getItem(key));
        const list = record && record.state && record.state.flags && record.state.flags.achievements;
        if (Array.isArray(list)) list.forEach(id => unlocked.add(id));
      }
    } catch { /* 存储不可用则忽略 */ }
  }
  return unlocked;
}

/* 剧情与画廊和成就一样按账号汇总，但只收集实际进入节点时写入的激活记录。 */
function collectMemoryProgress() {
  const progress = { story: new Set(), gallery: new Set() };
  const merge = value => {
    const memories = value && value.flags && value.flags.memories;
    if (!memories || typeof memories !== 'object') return;
    for (const type of ['story', 'gallery']) {
      if (Array.isArray(memories[type])) memories[type].forEach(id => progress[type].add(id));
    }
  };
  merge(typeof deps.getState === 'function' ? deps.getState() : null);

  const saves = deps.saves;
  if (saves && saves.storage) {
    for (const page of ['1', '2', 'auto', 'quick']) {
      let items = [];
      try { items = saves.list(page); } catch { continue; }
      items.forEach(item => { if (item.status === 'ok') merge(item.record.state); });
    }
    try { merge(JSON.parse(saves.storage.getItem(saves.legacyKey) || 'null')); } catch { /* 忽略损坏旧档 */ }
  }
  return progress;
}

/* 把「解锁时的那一幕背景」解析成可用的图片地址 */
function achBgSrc(id) {
  const key = ACH_BG[id];
  if (!key) return '';
  let src = '';
  if (typeof deps.resolveAsset === 'function') src = deps.resolveAsset(key) || '';
  if (!src) src = (ILY.data.assets && ILY.data.assets.images && ILY.data.assets.images[key]) || '';
  if (!src) return '';
  try { src = new URL(src, location.href).href; } catch { /* 已是绝对地址则原样保留 */ }
  return src;
}

function renderAchievements(list) {
  const unlocked = collectAchievements();
  const known = new Set(ACH_IDS);
  const extras = [...unlocked].filter(id => !known.has(id));   /* 存档里有但清单外的 ID 兜底显示 */
  list.replaceChildren();
  [...ACH_IDS, ...extras].forEach(id => {
    const got = unlocked.has(id);
    const li = el('li', 'ach-tile ' + (got ? 'unlocked' : 'locked'));

    /* 底图：解锁所在场景的背景；加载失败留占位而不是碎图 */
    if (got) {
      const src = achBgSrc(id);
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

    const translated = t('ach.' + id);
    li.append(el('span', 'ach-state', t(got ? 'ach.unlocked' : 'ach.locked')));
    li.append(el('span', 'ach-name', got ? (translated === 'ach.' + id ? id : translated) : '？？？'));
    list.append(li);
  });
}

/* ---------- 剧情回忆：按章节重读文字剧本 ----------
   数据来自 ILY.data.stories。逐节点输出带文字的节点；旁白不显示说话人名。 */
function renderStoryLog(log) {
  const unlocked = collectMemoryProgress().story;
  log.replaceChildren();
  const frag = document.createDocumentFragment();
  let anyStory = false;
  STORY_IDS.forEach(id => {
    const story = ILY.data && ILY.data.stories && ILY.data.stories[id];
    if (!story || !story.nodes) return;
    let chapterAdded = false;
    const nodes=deps.getStory?.().nodes||story.nodes;
    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      if((node.chapter||'prologue')!==id)return;
      if (!unlocked.has(nodeId) || !node || typeof node.text !== 'string' || !node.text.trim()) return;
      if (!chapterAdded) {
        frag.append(el('div', 'story-chapter', story.title || id));
        chapterAdded = true;
        anyStory = true;
      }
      const entry = el('div', 'story-entry');
      const isNarration = !node.speaker || node.speaker === '旁白';
      if (isNarration) entry.classList.add('plain');
      else entry.append(el('span', 'who', node.speaker));
      entry.append(el('span', 'say', node.text));
      frag.append(entry);
    });
  });
  if (!anyStory) frag.append(el('p', 'story-entry plain', t('story.empty')));
  log.append(frag);
  log.scrollTop = 0;
}

/* ---------- 画廊：翻转卡片 ---------- */
/* gallery-data.js 里的图片路径是相对它自己所在目录（sign&log/）写的，
   而文档是 game/index.html，直接当相对路径用会解析到 game/ 下，故按脚本 src 还原基准。 */
function galleryBaseUrl() {
  const tag = document.querySelector('script[src*="gallery-data.js"]');
  const raw = tag ? tag.getAttribute('src') : '../sign&log/gallery-data.js';
  try { return new URL(raw, location.href).href; } catch { return raw; }
}

/* 特殊 CG 的展示标题（中文 / 英文）。未登记 id 时回退到资源 id 的美化版。 */
const CG_META = {
  'bankbook':          { title: '银行存折', titleEn: 'Bankbook' },
  'parcel-label':      { title: '快递单', titleEn: 'Parcel Label' },
  'ch1-cg-blue':       { title: '蓝光中的爱理', titleEn: 'Airi in the Blue' },
  'ch1-cg-mirror':     { title: '镜中的她', titleEn: 'Her in the Mirror' },
  'ch1-cg-collapse':   { title: '崩塌', titleEn: 'Collapse' },
  'ch1-cg-reflection': { title: '海面倒影', titleEn: 'Reflection on the Sea' },
  'ch2-hug':           { title: '相拥', titleEn: 'Embrace' },
  'ch2-hug-close':     { title: '贴近的体温', titleEn: 'Close Embrace' },
  'ch2-hand':          { title: '交握的手', titleEn: 'Held Hands' },
  'ch2-couple':        { title: '并肩', titleEn: 'Side by Side' },
  'ch2-flowers':       { title: '夏日花径', titleEn: 'Summer Flowers' },
  'ch2-ice':           { title: '香草冰淇淋', titleEn: 'Vanilla Ice Cream' },
  'ch2-smile':         { title: '她的笑颜', titleEn: 'Her Smile' },
  'ch2-blush':         { title: '泛红的面颊', titleEn: 'Blushing Cheeks' },
  'ch2-adult':         { title: '十年后的她', titleEn: 'Her, Ten Years Later' },
  'ch2-香草':            { title: '香草', titleEn: 'Vanilla' }
};

/* 资源 id → 可用于 <img src> 的地址：优先走资源清单，再退回相对地址 */
function cgSrc(id) {
  let src = '';
  if (typeof deps.resolveAsset === 'function') src = deps.resolveAsset(id) || '';
  if (!src) src = (ILY.data.assets && ILY.data.assets.images && ILY.data.assets.images[id]) || '';
  if (!src) return '';
  try { src = new URL(src, location.href).href; } catch { /* 已是绝对地址则原样保留 */ }
  return src;
}

/* 资源 id 转成好看一点的默认标题 */
function prettyCgTitle(id) {
  return String(id).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* 用户在 gallery-data.js（window.ILY_GALLERY）手动添加的插画。
   可只填 unlock + 标题，src 缺省时按资源 id 反查资源清单。 */
function galleryEntries(unlocked) {
  const list = Array.isArray(window.ILY_GALLERY) ? window.ILY_GALLERY : [];
  const base = galleryBaseUrl();
  return list
    .filter(item => item && typeof item.unlock === 'string' && unlocked.has(item.unlock) &&
      (typeof item.src === 'string' ? item.src : true))
    .map(item => {
      let src = '';
      if (typeof item.src === 'string' && item.src) {
        src = item.src;
        try { src = new URL(item.src, base).href; } catch { /* 已是绝对地址则原样保留 */ }
      } else {
        src = cgSrc(item.unlock);
      }
      if (!src) return null;
      const meta = CG_META[item.unlock] || {};
      return {
        src,
        title: item.title || meta.title || item.unlock,
        titleEn: item.titleEn || meta.titleEn || item.title || item.unlock,
        desc: item.note || item.desc || '',
        descEn: item.noteEn || item.descEn || item.note || item.desc || '',
        fromPhone: false
      };
    })
    .filter(Boolean);
}

/* 剧本里所有“特殊 CG”（节点 cg / overlay / gallery 字段）自动收录进画廊，
   不再需要手动在 gallery-data.js 逐一登记；已手动登记的（同 unlock）优先、不会重复。
   说明文字取自首次出现该 CG 的节点正文。 */
function storyCgEntries(unlocked) {
  const curated = new Set((Array.isArray(window.ILY_GALLERY) ? window.ILY_GALLERY : [])
    .map(item => item && item.unlock).filter(Boolean));
  const stories = ILY.data && ILY.data.stories;
  const seen = new Map();                 // unlock -> 首次出现该 CG 的节点正文
  if (stories) {
    for (const sid of Object.keys(stories)) {
      const story = stories[sid];
      if (!story || !story.nodes) continue;
      for (const nid of Object.keys(story.nodes)) {
        const node = story.nodes[nid];
        if (!node || typeof node !== 'object') continue;
        for (const key of ['cg', 'overlay', 'gallery']) {
          const id = node[key];
          if (typeof id !== 'string' || !id || curated.has(id)) continue;
          if (!seen.has(id) && typeof node.text === 'string' && node.text.trim()) {
            seen.set(id, node.text.trim());
          }
        }
      }
    }
  }
  const out = [];
  for (const [id, firstText] of seen) {
    if (!unlocked.has(id)) continue;
    const src = cgSrc(id);
    if (!src) continue;
    const meta = CG_META[id] || {};
    out.push({
      src,
      title: meta.title || prettyCgTitle(id),
      titleEn: meta.titleEn || prettyCgTitle(id),
      desc: firstText || '',
      descEn: firstText || '',
      fromPhone: false
    });
  }
  return out;
}

/* 手机相册照片（data/story/phone.js 的 photos）也收入画廊：
   图片经资源清单 assets.images 解析路径，标题/说明取自相册数据。 */
function phoneAlbumEntries(unlocked) {
  const photos = (ILY.data.phone && ILY.data.phone.photos) || {};
  const images = (ILY.data.assets && ILY.data.assets.images) || {};
  return Object.keys(photos).map(id => {
    const photo = photos[id] || {};
    if (!unlocked.has(photo.img)) return null;
    let src = '';
    if (typeof deps.resolveAsset === 'function') src = deps.resolveAsset(photo.img) || '';
    if (!src && images[photo.img]) src = images[photo.img];
    if (!src) return null;
    try { src = new URL(src, location.href).href; } catch { /* 原样保留 */ }
    return {
      src,
      title: photo.title || id,
      titleEn: photo.title || id,        /* 相册数据暂无英文，两种语言都显示原标题 */
      desc: photo.caption || '',
      descEn: photo.caption || '',
      fromPhone: true
    };
  }).filter(Boolean);
}

/* 按图片地址去重，避免手动插画 / 剧本 CG / 相册照片出现重复卡片 */
function dedupeGallery(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || !item.src || seen.has(item.src)) continue;
    seen.add(item.src);
    out.push(item);
  }
  return out;
}

function renderFlipGallery(grid, empty) {
  grid.replaceChildren();
  const unlocked = collectMemoryProgress().gallery;
  /* 顺序：手动插画 → 剧本特殊 CG → 手机相册照片；按 src 去重 */
  const entries = dedupeGallery([
    ...galleryEntries(unlocked),
    ...storyCgEntries(unlocked),
    ...phoneAlbumEntries(unlocked)
  ]);
  empty.hidden = entries.length > 0;
  empty.textContent = t('gal.empty');
  entries.forEach(item => {
    const english = ILY.getLang() === 'english';
    const title = (english ? (item.titleEn || item.title) : item.title) || '';
    const desc = (english ? (item.descEn || item.desc) : item.desc) || '';

    const card = el('div', 'flip-card');
    card.tabIndex = 0;                        /* 允许键盘 Tab 聚焦 */
    const inner = el('div', 'flip-inner');

    /* 正面：图片（手机相册的照片带角标） */
    const front = el('div', 'flip-face flip-front');
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = title;
    img.loading = 'lazy';
    img.onerror = () => {
      img.remove();
      front.append(el('span', 'flip-missing', t('gal.imgMissing')));
    };
    front.append(img);
    if (item.fromPhone) front.append(el('span', 'flip-tag', t('gal.phone')));

    /* 背面：标题 + 说明（rotateY 180°，翻转后正好朝向玩家） */
    const back = el('div', 'flip-face flip-back');
    back.append(el('strong', '', title));
    if (desc) back.append(el('p', '', desc));

    inner.append(front, back);
    card.append(inner);
    /* 点击 / 回车 / 空格 翻转 */
    const flip = () => card.classList.toggle('flipped');
    card.addEventListener('click', flip);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); }
    });
    grid.append(card);
  });
}

/* ---------- 构建：单个大弹窗 + 三个内嵌标签 ---------- */
function heading(titleKey, closeLabelKey, onClose) {
  const head = el('div', 'mem-head');
  const texts = el('div');
  texts.append(el('h2', '', t(titleKey)));
  const close = el('button', '', '×');
  close.type = 'button';
  close.setAttribute('aria-label', t(closeLabelKey));
  close.onclick = onClose;
  head.append(texts, close);
  return head;
}

function actions(onClose) {
  const bar = el('div', 'dialog-actions');
  const close = el('button', '', t('common.close'));
  close.type = 'button';
  close.onclick = onClose;
  bar.append(close);
  return bar;
}

/* 每次只渲染当前那一项，绝不弹出独立窗口、不重复显示 */
function renderContent() {
  memTabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
  content.replaceChildren();
  if (activeTab === 'achievements') {
    memSub.textContent = t('ach.subtitle');
    const list = el('ul', 'ach-grid');
    renderAchievements(list);
    content.append(list);
  } else if (activeTab === 'story') {
    memSub.textContent = t('story.subtitle');
    const log = el('div', 'story-log');
    log.id = 'storyLog';
    renderStoryLog(log);
    content.append(log);
  } else {
    memSub.textContent = '';
    const grid = el('div', 'flip-grid');
    grid.id = 'flipGrid';
    const empty = el('p', 'hint');
    empty.hidden = true;
    renderFlipGallery(grid, empty);
    content.append(grid, empty);
  }
}

function build() {
  if (built) return;
  built = true;

  /* 回忆弹窗：单个大弹窗 + 三个内嵌标签（成就 / 剧情 / 画廊） */
  memDialog = el('dialog', 'mem-dialog');
  memDialog.id = 'memDialog';
  memDialog.setAttribute('aria-labelledby', 'memTitle');
  const head = heading('mem.title', 'menu.close', () => memDialog.close());
  head.querySelector('h2').id = 'memTitle';
  memSub = el('p', 'hint');
  memTabs = el('nav', 'mem-tabs');
  memTabs.setAttribute('aria-label', t('mem.title'));
  [['achievements', 'mem.tab.achievements'], ['story', 'mem.tab.story'], ['gallery', 'mem.tab.gallery']].forEach(([tab, key]) => {
    const btn = el('button', '', t(key));
    btn.type = 'button';
    btn.dataset.tab = tab;
    memTabs.append(btn);
  });
  content = el('div', 'mem-content');
  memDialog.append(head, memSub, memTabs, content, actions(() => memDialog.close()));

  document.body.append(memDialog);

  memTabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { activeTab = btn.dataset.tab; renderContent(); });
  });

  /* 关闭后把焦点还给舞台（与存档菜单一致，避免键盘被 dialog 吃掉） */
  memDialog.addEventListener('close', () => {
    const stage = deps.stage || document.querySelector('#stage');
    if (stage) {
      try { stage.focus({ preventScroll: true }); } catch { /* 舞台不可聚焦时忽略 */ }
    }
  });

  /* 弹窗开着时切语言，立即按新语言重绘当前标签 */
  window.addEventListener('ily:langchange', () => {
    if (!built) return;
    head.querySelector('h2').textContent = t('mem.title');
    head.querySelector('.mem-head > button').setAttribute('aria-label', t('menu.close'));
    memTabs.querySelectorAll('button').forEach(btn => {
      btn.textContent = t({ achievements: 'mem.tab.achievements', story: 'mem.tab.story', gallery: 'mem.tab.gallery' }[btn.dataset.tab]);
    });
    const actBtn = memDialog.querySelector('.dialog-actions button');
    if (actBtn) actBtn.textContent = t('common.close');
    if (memDialog.open) renderContent();
  });
}

function openMemories() {
  build();
  activeTab = 'achievements';
  renderContent();
  memDialog.showModal();
}

/* main.js 启动时调用一次，注入存档管理器 / 当前进度 / 资源解析器 */
function initMemories(options = {}) {
  deps = { ...deps, ...options };
  build();
}

Object.assign(ILY, { initMemories, openMemories });
})();
