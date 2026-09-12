/* ============================================================
 * memories.js —— 游戏内「回忆」：成就 / 剧情 / 画廊
 *
 * 与开始界面（sign&log/game.html）的「回忆」保持一致的三段结构：
 *   回忆弹窗  → 成就列表 + 三个标签（成就 / 剧情 / 画廊）
 *   剧情弹窗  → 按章节重读文字剧情（独立窗口）
 *   画廊弹窗  → 翻转卡片（独立窗口）
 *
 * 依赖（均在 index.html 中先于本文件加载）：
 *   ILY.t                 src/i18n.js
 *   ILY.data.stories.*    data/story/prologue.js / chapter1.js
 *   ILY.data.phone.photos data/story/phone.js
 *   ILY.data.assets       data/assets.js
 *   window.ILY_GALLERY    ../sign&log/gallery-data.js（可选，图由用户自行添加）
 *
 * 用法（main.js 中调用一次）：
 *   ILY.initMemories({ saves, getState: () => state, resolveAsset: key => assets.image(key) });
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

/* 剧情回忆收录的章节（与 index.html 的加载顺序一致） */
const STORY_IDS = ['prologue', 'chapter1'];
/* 已知成就 ID（与发放处一致：walk.js / phone.js / prologue.js） */
const ACH_IDS = ['tunnel-end', 'delete-key', 'daily', 'last-beach', 'door-letter', 'father-reply'];
/* v2 存档槽 key 的合法格式（与 src/core/saves.js 一致） */
const SAVE_KEY_RE = /^(?:[12]-[1-6]|auto-[1-3]|quick-1)$/;

let deps = { saves: null, getState: null, resolveAsset: null, stage: null };
let built = false;
let memDialog, memTabs, memSub, achList;
let storyDialog, storyLog;
let galDialog, flipGrid, galEmpty;

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

function renderAchievements() {
  const unlocked = collectAchievements();
  const known = new Set(ACH_IDS);
  const extras = [...unlocked].filter(id => !known.has(id));   /* 存档里有但清单外的 ID 兜底显示 */
  achList.replaceChildren();
  [...ACH_IDS, ...extras].forEach(id => {
    const got = unlocked.has(id);
    const li = el('li', got ? '' : 'locked');
    const name = el('span');
    const translated = t('ach.' + id);
    name.textContent = translated === 'ach.' + id ? id : translated;
    const state = el('span', 'ach-state', t(got ? 'ach.unlocked' : 'ach.locked'));
    li.append(name, state);
    achList.append(li);
  });
}

/* ---------- 剧情回忆：按章节重读文字剧本 ----------
   数据来自 ILY.data.stories。逐节点输出带文字的节点；旁白不显示说话人名。 */
function renderStoryLog() {
  storyLog.replaceChildren();
  const frag = document.createDocumentFragment();
  let anyStory = false;
  STORY_IDS.forEach(id => {
    const story = ILY.data && ILY.data.stories && ILY.data.stories[id];
    if (!story || !story.nodes) return;
    anyStory = true;
    frag.append(el('div', 'story-chapter', story.title || id));
    Object.keys(story.nodes).forEach(nodeId => {
      const node = story.nodes[nodeId];
      if (!node || typeof node.text !== 'string' || !node.text.trim()) return;
      const entry = el('div', 'story-entry');
      const isNarration = !node.speaker || node.speaker === '旁白';
      if (isNarration) entry.classList.add('plain');
      else entry.append(el('span', 'who', node.speaker));
      entry.append(el('span', 'say', node.text));
      frag.append(entry);
    });
  });
  if (!anyStory) frag.append(el('p', 'story-entry plain', t('story.empty')));
  storyLog.append(frag);
  storyLog.scrollTop = 0;
}

function renderMemDialog() {
  /* 回忆弹窗只显示成就；剧情 / 画廊均为独立窗口 */
  memTabs.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === 'achievements');
  });
  memSub.textContent = t('ach.subtitle');
  renderAchievements();
}

/* ---------- 画廊：翻转卡片 ---------- */
/* gallery-data.js 里的图片路径是相对它自己所在目录（sign&log/）写的，
   而文档是 game/index.html，直接当相对路径用会解析到 game/ 下，故按脚本 src 还原基准。 */
function galleryBaseUrl() {
  const tag = document.querySelector('script[src*="gallery-data.js"]');
  const raw = tag ? tag.getAttribute('src') : '../sign&log/gallery-data.js';
  try { return new URL(raw, location.href).href; } catch { return raw; }
}

function galleryEntries() {
  const list = Array.isArray(window.ILY_GALLERY) ? window.ILY_GALLERY : [];
  const base = galleryBaseUrl();
  return list
    .filter(item => item && typeof item.src === 'string' && item.src)
    .map(item => {
      let src = item.src;
      try { src = new URL(item.src, base).href; } catch { /* 已经是绝对地址则原样保留 */ }
      return { ...item, src, fromPhone: false };
    });
}

/* 手机相册照片（data/story/phone.js 的 photos）也收入画廊：
   图片经资源清单 assets.images 解析路径，标题/说明取自相册数据。 */
function phoneAlbumEntries() {
  const photos = (ILY.data.phone && ILY.data.phone.photos) || {};
  const images = (ILY.data.assets && ILY.data.assets.images) || {};
  return Object.keys(photos).map(id => {
    const photo = photos[id] || {};
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

function renderFlipGallery() {
  flipGrid.replaceChildren();
  /* 用户在 gallery-data.js 添加的图在前，手机相册的照片在后 */
  const entries = [...galleryEntries(), ...phoneAlbumEntries()];
  galEmpty.hidden = entries.length > 0;
  galEmpty.textContent = t('gal.empty');
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
    flipGrid.append(card);
  });
}

/* ---------- 构建弹窗 ---------- */
function heading(titleKey, subtitleKey, closeLabelKey, onClose) {
  const head = el('div', 'mem-head');
  const texts = el('div');
  texts.append(el('h2', '', t(titleKey)));
  if (subtitleKey) texts.append(el('p', 'hint', t(subtitleKey)));
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

function build() {
  if (built) return;
  built = true;

  /* 回忆弹窗：成就列表 + 三个标签 */
  memDialog = el('dialog', 'mem-dialog');
  memDialog.id = 'memDialog';
  memDialog.setAttribute('aria-labelledby', 'memTitle');
  const memHead = heading('mem.title', null, 'menu.close', () => memDialog.close());
  memHead.querySelector('h2').id = 'memTitle';
  memSub = el('p', 'hint');
  memTabs = el('nav', 'mem-tabs');
  memTabs.setAttribute('aria-label', t('mem.title'));
  [['achievements', 'mem.tab.achievements'], ['story', 'mem.tab.story'], ['gallery', 'mem.tab.gallery']].forEach(([tab, key]) => {
    const btn = el('button', '', t(key));
    btn.type = 'button';
    btn.dataset.tab = tab;
    memTabs.append(btn);
  });
  achList = el('ul', 'ach-list');
  memDialog.append(memHead, memSub, memTabs, achList, actions(() => memDialog.close()));

  /* 剧情弹窗：独立窗口 */
  storyDialog = el('dialog', 'story-dialog');
  storyDialog.id = 'storyDialog';
  storyLog = el('div', 'story-log');
  storyLog.id = 'storyLog';
  storyDialog.append(
    heading('story.title', 'story.subtitle', 'menu.close', () => storyDialog.close()),
    storyLog,
    actions(() => storyDialog.close())
  );

  /* 画廊弹窗：独立窗口 */
  galDialog = el('dialog', 'gal-dialog');
  galDialog.id = 'galDialog';
  flipGrid = el('div', 'flip-grid');
  flipGrid.id = 'flipGrid';
  galEmpty = el('p', 'hint');
  galEmpty.hidden = true;
  galDialog.append(
    heading('gal.title', 'gal.subtitle', 'menu.close', () => galDialog.close()),
    flipGrid,
    galEmpty,
    actions(() => galDialog.close())
  );

  document.body.append(memDialog, storyDialog, galDialog);

  memTabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'story') openStoryDialog();
      else if (btn.dataset.tab === 'gallery') openGalDialog();
      else renderMemDialog();
    });
  });

  /* 关闭后把焦点还给舞台（与存档菜单一致，避免键盘被 dialog 吃掉） */
  [memDialog, storyDialog, galDialog].forEach(dialog => {
    dialog.addEventListener('close', () => {
      const stage = deps.stage || document.querySelector('#stage');
      if (stage && memDialog.open === false && storyDialog.open === false && galDialog.open === false) {
        try { stage.focus({ preventScroll: true }); } catch { /* 舞台不可聚焦时忽略 */ }
      }
    });
  });

  /* 弹窗开着时切语言，立即按新语言重绘 */
  window.addEventListener('ily:langchange', () => {
    if (!built) return;
    memHead.querySelector('h2').textContent = t('mem.title');
    memHead.querySelector('button').setAttribute('aria-label', t('menu.close'));
    memTabs.querySelectorAll('button').forEach(btn => {
      btn.textContent = t({ achievements: 'mem.tab.achievements', story: 'mem.tab.story', gallery: 'mem.tab.gallery' }[btn.dataset.tab]);
    });
    memDialog.querySelector('.dialog-actions button').textContent = t('common.close');
    storyDialog.querySelector('h2').textContent = t('story.title');
    storyDialog.querySelector('.hint').textContent = t('story.subtitle');
    storyDialog.querySelector('.dialog-actions button').textContent = t('common.close');
    galDialog.querySelector('h2').textContent = t('gal.title');
    galDialog.querySelector('.hint').textContent = t('gal.subtitle');
    galDialog.querySelector('.dialog-actions button').textContent = t('common.close');
    if (memDialog.open) renderMemDialog();
    if (storyDialog.open) renderStoryLog();
    if (galDialog.open) renderFlipGallery();
  });
}

function openStoryDialog() {
  renderStoryLog();
  storyDialog.showModal();     /* 原生 dialog 自动叠在回忆弹窗之上 */
}

function openGalDialog() {
  renderFlipGallery();
  galDialog.showModal();
}

function openMemories() {
  build();
  renderMemDialog();
  memDialog.showModal();
}

/* main.js 启动时调用一次，注入存档管理器 / 当前进度 / 资源解析器 */
function initMemories(options = {}) {
  deps = { ...deps, ...options };
  build();
}

Object.assign(ILY, { initMemories, openMemories });
})();
