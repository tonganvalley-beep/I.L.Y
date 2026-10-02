// Windows XP 风格桌面：纯 HTML/CSS/JS，无外部资源、无原生弹窗（alert/prompt/confirm）。
// 功能：桌面和嵌套文件夹中的文件可拖放、剪切/粘贴；删除进入回收站，可还原或彻底删除。
(() => {
  const desktop = document.getElementById('desktop');
  const iconsEl  = document.getElementById('icons');
  const windowsEl = document.getElementById('windows');
  const ctx      = document.getElementById('ctxmenu');
  const winMenu  = document.getElementById('winMenu');
  const itemMenu = document.getElementById('itemMenu');
  const startMenu = document.getElementById('startMenu');
  const startButton = document.getElementById('startButton');
  const taskButtons = document.getElementById('taskButtons');
  const trayClock = document.getElementById('trayClock');
  const taskbarMenu = document.getElementById('taskbarMenu');
  const taskWindowMenu = document.getElementById('taskWindowMenu');
  const taskbar = document.getElementById('taskbar');
  try { document.querySelector('.start-user strong').textContent = localStorage.getItem('mygame-token') || '用户'; } catch (_) {}
  let shellSettings = { theme: 'blue', separateFolders: false, showClock: true, autoHide: false };
  try { shellSettings = { ...shellSettings, ...JSON.parse(localStorage.getItem('ily-winxp-settings-v1') || '{}') }; } catch (_) {}
  desktop.dataset.theme = shellSettings.theme;
  taskbar.classList.toggle('autohide', shellSettings.autoHide);
  trayClock.hidden = !shellSettings.showClock;
  function saveShellSettings() { try { localStorage.setItem('ily-winxp-settings-v1', JSON.stringify(shellSettings)); } catch (_) {} }

  let zCounter = 10;
  let hostPaused=false;
  const expectedHostOrigin=location.protocol==='file:'?'null':location.origin;
  const targetHostOrigin=expectedHostOrigin==='null'?'*':expectedHostOrigin;
  function syncGame(win){
    const paused=hostPaused||document.hidden||win.style.display==='none';
    win.querySelector('iframe')?.contentWindow?.postMessage({type:'ily-embed-control',action:paused?'pause':'resume'},targetHostOrigin);
  }
  addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==expectedHostOrigin||event.data?.type!=='ily-embed-control')return;
    if(!['pause','resume'].includes(event.data.action))return;
    hostPaused=event.data.action==='pause';
    for(const win of windowsEl.querySelectorAll('.game-win'))syncGame(win);
  });
  document.addEventListener('visibilitychange',()=>{for(const win of windowsEl.querySelectorAll('.game-win'))syncGame(win);});


  // 游戏注册表：每个游戏是 games/<游戏名>/ 下的子文件夹，固定含 4 个文件
  //   index.html(主入口) / app.js(逻辑) / styles.css(样式) / ico.webp(图标)
  // 新增游戏：在 games/ 下新建同名子文件夹并放入这 4 个文件，再到此处添加一条记录即可。
  // 也可在 games/manifest.json（{"games":[...]}）集中登记，加载时优先读取、失败时回退到下方内置列表。
  let GAMES = [
    { name: '红心弹幕', dir: 'games/heart', icon: 'games/heart/ico.svg', launch: 'games/heart/index.html', w: 720, h: 540 },
    { name: '三维弹球', dir: 'games/space_pinball', icon: 'games/space_pinball/ico.webp', launch: 'games/space_pinball/index.html' },
    { name: '扫雷', dir: 'games/xp_minesweeper', icon: 'games/xp_minesweeper/ico.webp', launch: 'games/xp_minesweeper/index.html', w: 516, h: 380 },
    { name: '纸牌', dir: 'games/xp_solitaire', icon: 'games/xp_solitaire/ico.webp', launch: 'games/xp_solitaire/index.html', w: 656, h: 500 },
    { name: '空当接龙', dir: 'games/xp_freecell', icon: 'games/xp_freecell/ico.webp', launch: 'games/xp_freecell/index.html', w: 716, h: 500 },
    { name: '红心大战', dir: 'games/xp_hearts', icon: 'games/xp_hearts/ico.webp', launch: 'games/xp_hearts/index.html', w: 656, h: 540 },
  ];
  const ORIGINAL_GAME_LAUNCHES = new Set(GAMES.map(game => game.launch));
  let noGameAchievementSent = false;

  // 桌面默认图标与游戏入口
  let rootItems = [
    { id: 'computer', type: 'computer', name: '我的电脑', glyph: '💻', x: 24, y: 16, children: [] },
    { id: 'docs',     type: 'docs',     name: '我的文档', glyph: '📁', x: 24, y: 108, children: [] },
    { id: 'recycle',  type: 'recycle',  name: '回收站',   glyph: '🗑️', x: 24, y: 200, children: [] },
    { id: 'games',    type: 'games',    name: 'games',    glyph: '📁', x: 24, y: 292,
      children: GAMES.map(g => ({ id: 'game-' + g.name, type: 'game', name: g.name, iconSrc: g.icon, launch: g.launch, w: g.w, h: g.h })) },
  ];
  let knownGames = GAMES.map(game => 'game-' + game.name);
  try {
    const saved = JSON.parse(localStorage.getItem('ily-winxp-desktop-v1') || 'null');
    if (saved?.version === 1 && Array.isArray(saved.items) &&
        ['computer', 'docs', 'recycle'].every(id => saved.items.some(item => item?.id === id))) {
      rootItems = saved.items;
      knownGames = Array.isArray(saved.knownGames) ? saved.knownGames : knownGames;
    }
  } catch (_) { /* Storage may be disabled in private browsing. */ }
  function saveDesktop() {
    try { localStorage.setItem('ily-winxp-desktop-v1', JSON.stringify({ version: 1, items: rootItems, knownGames })); }
    catch (_) { /* Desktop stays usable when storage is unavailable. */ }
  }

  // 优先从 games/manifest.json 读取游戏列表；失败（如 file:// 直接打开）则保留内置 GAMES，并同步到 games 文件夹子项
  async function loadGames() {
    try {
      const r = await fetch('games/manifest.json', { cache: 'no-store' });
      if (r.ok) {
        const m = await r.json();
        if (Array.isArray(m.games) && m.games.length) GAMES = m.games;
      }
    } catch (e) { /* 非标准服务 / 本地文件：保留内置 GAMES */ }
    const gf = findById('games');
    if (gf && !locate(gf)?.inRecycle) for (const g of GAMES) {
      const id = 'game-' + g.name;
      if (!knownGames.includes(id)) {
        gf.children.push({ id, type: 'game', name: g.name, iconSrc: g.icon, launch: g.launch, w: g.w, h: g.h });
        knownGames.push(id);
      }
    }
    saveDesktop();
    renderPrograms();
    checkNoGamesAchievement();
  }
  function checkNoGamesAchievement() {
    if (noGameAchievementSent) return;
    const active = (items, inRecycle = false) => items.some(item => {
      if (item === recycle) return false;
      if (!inRecycle && item.type === 'game' && ORIGINAL_GAME_LAUNCHES.has(item.launch)) return true;
      return item.children ? active(item.children, inRecycle || item === recycle) : false;
    });
    if (active(rootItems)) return;
    noGameAchievementSent = true;
    if (parent !== window) parent.postMessage({ type: 'ily-winxp-achievement', id: 'There Is No Game!!' }, targetHostOrigin);
  }
  function renderPrograms() {
    const list = document.getElementById('allPrograms');
    list.replaceChildren();
    let gamesHeading = null;
    for (const game of GAMES) {
      const entry = findById('game-' + game.name);
      if (!entry || locate(entry)?.inRecycle) continue;
      if (!gamesHeading) { gamesHeading = document.createElement('div'); gamesHeading.textContent = '游戏'; gamesHeading.className = 'program-heading'; list.appendChild(gamesHeading); }
      const button = document.createElement('button');
      const icon = document.createElement('img'); icon.className = 'start-program-glyph'; icon.src = entry.iconSrc || game.icon; icon.alt = '';
      const name = document.createElement('span'); name.textContent = entry.name; button.append(icon, name);
      button.addEventListener('click', event => { event.stopPropagation(); toggleStart(false); openGame(entry); });
      list.appendChild(button);
    }
    const accessory = document.createElement('div'); accessory.className = 'program-heading'; accessory.textContent = '附件'; list.appendChild(accessory);
    const notepad = document.createElement('button');
    const notepadIcon = document.createElement('span'); notepadIcon.className = 'start-icon notepad'; notepadIcon.setAttribute('aria-hidden', 'true');
    const notepadName = document.createElement('span'); notepadName.textContent = '记事本'; notepad.append(notepadIcon, notepadName);
    notepad.addEventListener('click', event => { event.stopPropagation(); toggleStart(false); openNotepad(); }); list.appendChild(notepad);
  }

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function clampPos(x, y) {
    const w = desktop.clientWidth, h = desktop.clientHeight - 40;
    return [Math.max(4, Math.min(x, w - 90)), Math.max(4, Math.min(y, h - 90))];
  }

  // 同级内唯一命名：base 已占用则 base(2), base(3)… 依次递增（不出现 (1)）
  function nextFreeName(base, siblings, self) {
    const taken = new Set(siblings.filter(s => s !== self).map(s => s.name.toLocaleLowerCase()));
    if (!taken.has(base.toLocaleLowerCase())) return base;
    const dot = base.lastIndexOf('.');
    const extension = dot > 0 ? base.slice(dot) : '';
    const stem = extension ? base.slice(0, dot) : base;
    let n = 2;
    while (taken.has(`${stem} (${n})${extension}`.toLocaleLowerCase())) n++;
    return `${stem} (${n})${extension}`;
  }
  const validFileName = name => !!name && !/[\\/:*?"<>|]/.test(name) && !/[. ]$/.test(name);

  const recycle = rootItems.find(item => item.type === 'recycle');
  const computer = rootItems.find(item => item.type === 'computer');
  let drive = computer.children?.find(item => item.id === 'drive-c');
  if (!drive) {
    drive = { id: 'drive-c', type: 'drive', name: '本地磁盘 (C:)', glyph: '💽', children: [
      { id: 'documents-settings', type: 'folder', name: 'Documents and Settings', glyph: '📁', children: [
        { id: 'user-profile', type: 'folder', name: '用户', glyph: '📁', children: [
          { id: 'desktop-folder', type: 'desktop-folder', name: 'Desktop', glyph: '📁', children: [] },
          { id: 'docs-link', type: 'link', name: 'My Documents', glyph: '📁', targetId: 'docs' }
        ] }
      ] },
      { id: 'program-files', type: 'folder', name: 'Program Files', glyph: '📁', children: [] },
      { id: 'windows-folder', type: 'folder', name: 'WINDOWS', glyph: '📁', children: [] }
    ] };
    computer.children = [drive];
  }
  const desktopFolder = findById('desktop-folder');
  const userProfile = findById('user-profile');
  const iconItems = new WeakMap();
  let cutItem = null;
  let copiedItem = null;
  let cutItems = [];
  let copiedItems = [];
  let textClipboard = '';
  function selectedItems() { return [...new Set([...document.querySelectorAll('.icon.selected')].map(icon => iconItems.get(icon)).filter(Boolean))]; }
  function setClipboard(items, mode) {
    const allowed = items.filter(item => !isProtected(item));
    cutItems = mode === 'cut' ? allowed : [];
    copiedItems = mode === 'copy' ? allowed : [];
    cutItem = cutItems[0] || null; copiedItem = copiedItems[0] || null;
    refreshFolders();
  }
  const isFolder = item => item && ['folder', 'docs', 'games', 'recycle', 'computer', 'drive', 'desktop-folder'].includes(item.type);
  const isProtected = item => item === recycle || item === computer || item === drive || item === desktopFolder || item?.type === 'docs' || item?.type === 'link' || ['documents-settings', 'user-profile', 'program-files', 'windows-folder'].includes(item?.id);
  function containsItem(folder, item) {
    return folder === item || (folder.children || []).some(child => containsItem(child, item));
  }
  function locate(item, items = rootItems, parent = null, inRecycle = false) {
    const index = items.indexOf(item);
    if (index >= 0) return { items, parent, index, inRecycle };
    for (const folder of items) {
      if (!folder.children) continue;
      const found = locate(item, folder.children, folder, inRecycle || folder === recycle);
      if (found) return found;
    }
    return null;
  }
  function findById(id, items = rootItems) {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) { const found = findById(id, item.children); if (found) return found; }
    }
    return null;
  }
  function nextDesktopPosition() {
    for (let y = 16; y < desktop.clientHeight - 80; y += 92) {
      for (let x = 24; x < desktop.clientWidth - 84; x += 96) {
        if (rootItems.every(item => Math.abs((item.x || 0) - x) >= 80 || Math.abs((item.y || 0) - y) >= 80)) return [x, y];
      }
    }
    return [120, 16];
  }
  function refreshFolders() {
    saveDesktop();
    renderDesktop();
    renderPrograms();
    for (const win of [...windowsEl.querySelectorAll('.folder-win')]) {
      const location = win._item === drive ? { inRecycle: false } : locate(win._item);
      if (!location || (win._item !== recycle && location.inRecycle)) { win._task?.remove(); win.remove(); refreshTaskManagers(); continue; }
      setWindowTitle(win, win._item.name);
      renderWindowBody(win, win._item);
    }
    checkNoGamesAchievement();
  }
  function canMove(item, target) {
    const source = locate(item);
    return !!source && !isProtected(item) && target !== computer && (!target ||
      (isFolder(target) && target !== item && !containsItem(item, target) && source.parent !== target && !(target === desktopFolder && !source.parent)));
  }
  function moveItem(item, target, point) {
    if (!canMove(item, target)) return false;
    const source = locate(item);
    const destination = target && target !== desktopFolder ? (target.children ||= []) : rootItems;
    if (destination.some(other => other !== item && other.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())) {
      showInfoDialog('文件替换', `此位置已包含名为“${item.name}”的项目。`); return false;
    }
    if (target === recycle) {
      item.recycleOrigin = { parentId: source.parent?.id || null, index: source.index, x: item.x, y: item.y };
      item.deletedAt = new Date().toISOString();
    }
    source.items.splice(source.index, 1);
    destination.push(item);
    if (!target || target === desktopFolder) [item.x, item.y] = point ? clampPos(...point) : nextDesktopPosition();
    if (source.parent === recycle && target !== recycle) { delete item.recycleOrigin; delete item.deletedAt; }
    if (cutItem === item) cutItem = null;
    refreshFolders();
    return true;
  }
  function cloneItem(item) {
    return { ...item, id: 'copy-' + Date.now() + Math.random().toString(16).slice(2),
      children: item.children?.map(cloneItem) };
  }
  function pasteInto(target, point) {
    if (cutItems.length) {
      const batch = [...cutItems];
      if (!batch.every(item => canMove(item, target))) return false;
      let moved = false;
      for (const item of batch) moved = moveItem(item, target, point) || moved;
      cutItems = []; cutItem = null; refreshFolders(); return moved;
    }
    if (!copiedItem || target === recycle || target === computer) return false;
    const destination = target && target !== desktopFolder ? (target.children ||= []) : rootItems;
    for (const source of copiedItems) {
      const copy = cloneItem(source);
      delete copy.recycleOrigin; delete copy.deletedAt;
      const sameFolder = locate(source)?.items === destination;
      const base = sameFolder ? '复件 ' + copy.name : copy.name;
      copy.name = nextFreeName(base, destination);
      if (!target || target === desktopFolder) [copy.x, copy.y] = point ? clampPos(...point) : nextDesktopPosition();
      destination.push(copy);
    }
    refreshFolders(); return true;
  }
  function confirmAction(message, onConfirm) {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = `<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title">确认文件删除 <button aria-label="关闭">✕</button></div><p></p><div class="xp-dialog-buttons"><button data-answer="yes">是(Y)</button><button data-answer="no">否(N)</button></div></div>`;
    cover.querySelector('p').textContent = message;
    desktop.appendChild(cover);
    const close = yes => { cover.remove(); if (yes) onConfirm(); };
    cover.querySelector('[aria-label="关闭"]').addEventListener('click', () => close(false));
    cover.querySelector('[data-answer="yes"]').addEventListener('click', () => close(true));
    cover.querySelector('[data-answer="no"]').addEventListener('click', () => close(false));
    cover.querySelector('[data-answer="no"]').focus();
  }
  function deleteItems(items, permanent = false) {
    const valid = items.filter(item => !isProtected(item) && locate(item));
    if (!valid.length) return;
    const erase = () => {
      for (const item of valid) {
        const location = locate(item);
        if (!location) continue;
        if (permanent || location.inRecycle) location.items.splice(location.index, 1);
        else moveItem(item, recycle);
      }
      refreshFolders();
    };
    const names = valid.length === 1 ? `“${valid[0].name}”` : `这 ${valid.length} 个项目`;
    confirmAction(permanent || valid.every(item => locate(item)?.inRecycle)
      ? `确实要永久删除${names}吗？`
      : `确实要将${names}放入回收站吗？`, erase);
  }
  function deleteItem(item, permanent = false) { deleteItems([item], permanent); }
  function restoreItem(item) {
    const source = locate(item);
    if (!source?.inRecycle) return;
    const origin = item.recycleOrigin;
    const originParent = origin?.parentId && findById(origin.parentId);
    const parent = originParent && locate(originParent) && !locate(originParent).inRecycle ? originParent : null;
    const destination = parent ? (parent.children ||= []) : rootItems;
    if (destination.some(other => other.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())) {
      showInfoDialog('还原项目', `原位置已包含名为“${item.name}”的项目。`); return;
    }
    source.items.splice(source.index, 1);
    destination.splice(Math.min(origin?.index ?? destination.length, destination.length), 0, item);
    if (!parent) [item.x, item.y] = origin?.x != null ? clampPos(origin.x, origin.y) : nextDesktopPosition();
    delete item.recycleOrigin;
    delete item.deletedAt;
    refreshFolders();
  }
  function permanentDelete(item) {
    const source = locate(item);
    if (!source?.inRecycle) return;
    source.items.splice(source.index, 1);
    refreshFolders();
  }
  function emptyRecycle() {
    if (!recycle.children.length) return;
    confirmAction('确实要删除回收站中的所有项目吗？', () => { recycle.children = []; refreshFolders(); });
  }

  // ── 桌面图标渲染 ──
  function renderDesktop() {
    iconsEl.innerHTML = '';
    rootItems.forEach(it => iconsEl.appendChild(makeIcon(it)));
  }

  function makeIcon(item, parentArray) {
    const el = document.createElement('div');
    el.className = 'icon' + (cutItems.includes(item) ? ' cut' : '');
    iconItems.set(el, item);
    [el.style.left, el.style.top] = [item.x + 'px', item.y + 'px'];
    const glyph = item.iconSrc
      ? `<img class="glyph-img" src="${escapeHtml(item.iconSrc)}" alt="">`
      : `<div class="glyph">${escapeHtml(item.glyph || '📄')}</div>`;
    el.innerHTML = glyph + `<div class="label">${escapeHtml(item.name)}</div>`;
    el.addEventListener('click', e => { e.stopPropagation(); selectIcon(el, e.ctrlKey); });
    el.addEventListener('dblclick', e => { e.stopPropagation(); item.type === 'game' ? openGame(item) : openItem(item); });
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      showItemMenu(e.clientX, e.clientY, el, item, parentArray || rootItems, null);
    });
    enableIconDrag(el, item);
    return el;
  }

  // ── 拖到文件夹 / 回收站 / 桌面空白处移动；桌面空白处仍可摆放图标 ──
  function enableIconDrag(el, item) {
    el.addEventListener('mousedown', e => {
      if (e.button !== 0 || e.target.closest('input') || isProtected(item) && el.classList.contains('small')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      const rect = el.getBoundingClientRect();
      const grabX = sx - rect.left, grabY = sy - rect.top;
      const onDesktop = !el.classList.contains('small');
      const dragItems = el.classList.contains('selected') ? selectedItems() : [item];
      let moved = false, preview = null, hint = null, highlighted = null;
      const dropAt = ev => {
        const hit = document.elementFromPoint(ev.clientX, ev.clientY);
        const iconTarget = hit?.closest('.icon');
        const folderTarget = iconTarget && iconItems.get(iconTarget);
        const windowTarget = hit?.closest('.folder-win');
        const destination = folderTarget && isFolder(folderTarget) ? folderTarget : windowTarget?._item;
        const valid = destination && dragItems.every(entry => ev.ctrlKey && destination !== recycle
          ? isFolder(destination) && destination !== computer && !containsItem(entry, destination)
          : canMove(entry, destination));
        return { hit, folderTarget, destination: valid ? destination : null,
          highlight: valid ? folderTarget && isFolder(folderTarget) ? iconTarget : windowTarget : null };
      };
      const clearPreview = () => {
        highlighted?.classList.remove('drop-target');
        preview?.remove(); hint?.remove();
        el.classList.remove('dragging');
        el.style.pointerEvents = '';
      };
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 3) {
          moved = true;
          el.classList.add('dragging');
          el.style.pointerEvents = 'none';
          preview = el.cloneNode(true);
          preview.classList.remove('dragging', 'selected', 'cut');
          preview.classList.add('drag-preview');
          preview.style.width = rect.width + 'px';
          document.body.appendChild(preview);
          hint = document.createElement('div');
          hint.className = 'drag-hint';
          document.body.appendChild(hint);
        }
        if (!moved) return;
        preview.style.left = ev.clientX - grabX + 'px';
        preview.style.top = ev.clientY - grabY + 'px';
        const target = dropAt(ev);
        if (highlighted !== target.highlight) {
          highlighted?.classList.remove('drop-target');
          highlighted = target.highlight;
          highlighted?.classList.add('drop-target');
        }
        hint.hidden = !target.destination;
        if (target.destination) {
          hint.textContent = `${ev.ctrlKey && target.destination !== recycle ? '复制到' : '移动到'}“${target.destination.name}”${dragItems.length > 1 ? `（${dragItems.length} 个项目）` : ''}`;
          hint.style.left = Math.min(ev.clientX + 18, innerWidth - hint.offsetWidth - 8) + 'px';
          hint.style.top = Math.min(ev.clientY + 18, innerHeight - hint.offsetHeight - 8) + 'px';
        }
      };
      const up = ev => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        const target = moved ? dropAt(ev) : null;
        clearPreview();
        if (!moved) return;
        if (target.destination) {
          if (ev.ctrlKey && target.destination !== recycle) {
            setClipboard(dragItems, 'copy');
            if (pasteInto(target.destination)) return;
          } else {
            let movedAny = false;
            for (const entry of dragItems) movedAny = moveItem(entry, target.destination) || movedAny;
            if (movedAny) return;
          }
        }
        if (target.hit?.closest('#desktop') && !target.hit.closest('.win') && !target.folderTarget) {
          if (onDesktop && ev.ctrlKey) {
            setClipboard(dragItems, 'copy');
            pasteInto(null, [ev.clientX - desktop.getBoundingClientRect().left, ev.clientY - desktop.getBoundingClientRect().top]);
          } else if (onDesktop) {
            for (const entry of dragItems) [entry.x, entry.y] = clampPos((entry.x || ox) + ev.clientX - sx, (entry.y || oy) + ev.clientY - sy);
            renderDesktop();
            saveDesktop();
          }
          else if (ev.ctrlKey) { setClipboard(dragItems, 'copy'); pasteInto(null, [ev.clientX - desktop.getBoundingClientRect().left, ev.clientY - desktop.getBoundingClientRect().top]); }
          else for (const entry of dragItems) moveItem(entry, null, [ev.clientX - desktop.getBoundingClientRect().left, ev.clientY - desktop.getBoundingClientRect().top]);
        }
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  function selectIcon(el, additive = false) {
    const container = el?.closest('#icons, .folder-grid');
    document.querySelectorAll('.icon.selected').forEach(i => {
      if (!additive || i.closest('#icons, .folder-grid') !== container) i.classList.remove('selected');
    });
    if (el) el.classList.toggle('selected', additive ? !el.classList.contains('selected') : true);
  }

  // ── 原位可编辑命名（Enter 提交 / Esc 取消 / 失焦提交；可传入 dedupe 保证同级不重名） ──
  function editLabel(iconEl, item, dedupe) {
    const label = iconEl.querySelector('.label');
    if (!label) return;
    const input = document.createElement('input');
    input.className = 'rename';
    input.value = item.name;
    label.textContent = '';
    label.appendChild(input);
    input.focus();
    input.select();
    let done = false;
    const finish = commit => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      if (commit && v) {
        const siblings = locate(item)?.items || rootItems;
        if (!validFileName(v)) showInfoDialog('重命名', '文件名不能包含 \\ / : * ? " < > |，也不能以空格或句点结尾。');
        else if (siblings.some(other => other !== item && other.name.toLocaleLowerCase() === v.toLocaleLowerCase()))
          showInfoDialog('重命名', '此位置已存在同名文件或文件夹。');
        else { item.name = v; saveDesktop(); }
      }
      label.textContent = item.name;
      if (input.parentNode) input.remove();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('dblclick', e => e.stopPropagation());
  }

  // ── 新建文件或文件夹，并立即原地命名 ──
  function addDesktopItem(type, x, y) {
    const [px, py] = clampPos(x, y);
    const item = { id: 'f' + Date.now() + Math.random().toString(16).slice(2),
                   type, name: nextFreeName(type === 'file' ? '新建文本文档.txt' : '新建文件夹', rootItems, null),
                   glyph: type === 'file' ? '📄' : '📁', x: px, y: py };
    if (type === 'folder') item.children = [];
    rootItems.push(item);
    saveDesktop();
    const el = makeIcon(item);
    iconsEl.appendChild(el);
    selectIcon(el);
    editLabel(el, item);
  }

  function addChildItem(type, parent, win) {
    if (!isFolder(parent) || parent === recycle) return;
    if (parent === desktopFolder) { addDesktopItem(type, ...nextDesktopPosition()); renderWindowBody(win, parent); return; }
    parent.children = parent.children || [];
    const child = { id: 'f' + Date.now() + Math.random().toString(16).slice(2),
                    type, name: nextFreeName(type === 'file' ? '新建文本文档.txt' : '新建文件夹', parent.children, null),
                    glyph: type === 'file' ? '📄' : '📁' };
    if (type === 'folder') child.children = [];
    parent.children.push(child);
    saveDesktop();
    renderWindowBody(win, parent);
    const grid = win.querySelector('.folder-grid');
    const els = grid.querySelectorAll('.icon.small');
    if (els.length) editLabel(els[els.length - 1], child);
  }

  // ── 创建窗口通用外壳：标题栏 + 最小化/最大化/关闭 + 八向缩放手柄 ──
  function createWindow({ cls = '', title, width = '300px', height = '200px', left, top, iconType = 'run', iconSrc = null }) {
    const win = document.createElement('div');
    win.className = 'win' + (cls ? ' ' + cls : '');
    win.style.zIndex = ++zCounter;
    const off = (zCounter % 6) * 26;
    win.style.left = (left != null ? left : 90 + off) + 'px';
    win.style.top  = (top != null ? top : 50 + off) + 'px';
    win.style.width = width;
    win.style.height = height;
    win.innerHTML = `
      <div class="win-title">
        <span class="win-title-text">${escapeHtml(title)}</span>
        <span class="win-btns">
          <button class="win-min" title="最小化">_</button>
          <button class="win-max" title="最大化">□</button>
          <button class="win-close" title="关闭">✕</button>
        </span>
      </div>
      <div class="win-body"></div>`;
    ['n','s','e','w','ne','nw','se','sw'].forEach(dir => {
      const h = document.createElement('div');
      h.className = 'resize-handle ' + dir;
      win.appendChild(h);
      enableResize(win, h, dir);
    });
    windowsEl.appendChild(win);
    const task = document.createElement('button');
    task.className = 'task-button active';
    if (iconSrc) {
      const icon = document.createElement('img'); icon.src = iconSrc; icon.alt = ''; task.appendChild(icon);
    } else {
      const icon = document.createElement('span'); icon.className = 'start-icon ' + iconType; icon.setAttribute('aria-hidden', 'true'); task.appendChild(icon);
    }
    task.title = title; task.setAttribute('aria-label', title);
    taskButtons.appendChild(task);
    win._task = task;
    task.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); showTaskWindowMenu(event, win); });
    task.addEventListener('click', () => {
      if (win.style.display === 'none') { win.style.display = ''; activateWindow(win); syncGame(win); }
      else if (win.style.zIndex === String(zCounter)) { win.style.display = 'none'; task.classList.remove('active'); syncGame(win); }
      else activateWindow(win);
      refreshTaskManagers();
    });
    refreshTaskManagers();
    return win;
  }

  function setWindowTitle(win, title) {
    win.querySelector('.win-title-text').textContent = title;
    win._task.title = title;
    win._task.setAttribute('aria-label', title);
    refreshTaskManagers();
  }

  function activateWindow(win) {
    win.style.zIndex = ++zCounter;
    taskButtons.querySelectorAll('.task-button').forEach(button => button.classList.remove('active'));
    win._task?.classList.add('active');
  }

  // 通用窗口交互：拖拽标题 / 置顶 / 最小化 / 最大化 / 关闭
  function wireChrome(win) {
    const title = win.querySelector('.win-title');
    enableDrag(win, title);
    win.addEventListener('mousedown', () => activateWindow(win));
    win.querySelector('.win-close').addEventListener('click', () => { win._task?.remove(); win.remove(); refreshTaskManagers(); });
    win.querySelector('.win-min').addEventListener('click', () => { win.style.display = 'none'; win._task?.classList.remove('active'); syncGame(win); refreshTaskManagers(); });
    const maxBtn = win.querySelector('.win-max');
    enableMaximize(win, maxBtn);
    win._maxBtn = maxBtn;
  }

  function explorerParent(item) {
    if (item === computer) return null;
    if (item === recycle) return computer;
    if (item.id === 'docs') return userProfile;
    return locate(item)?.parent || desktopFolder;
  }
  function explorerChildren(item) {
    if (item === desktopFolder) return rootItems.filter(entry => !['computer', 'docs', 'recycle'].includes(entry.id));
    return item.children || [];
  }
  function explorerAddress(item) {
    if (item === computer) return '我的电脑';
    if (item === drive) return 'C:\\';
    if (item === recycle) return '回收站';
    const names = [];
    for (let current = item; current && current !== computer; current = explorerParent(current)) names.unshift(current.name);
    return (names.includes('本地磁盘 (C:)') ? 'C:\\' + names.slice(names.indexOf('本地磁盘 (C:)') + 1).join('\\') : '桌面\\' + names.join('\\'));
  }
  function addExplorerChrome(win) {
    const bar = document.createElement('div');
    bar.className = 'explorer-chrome';
    bar.innerHTML = `<div class="explorer-menu"><button data-menu="file">文件(F)</button><button data-menu="edit">编辑(E)</button><button data-menu="view">查看(V)</button><button data-menu="tools">工具(T)</button><button data-menu="help">帮助(H)</button></div>
      <div class="explorer-toolbar"><button data-nav="back">◀ 后退</button><button data-nav="forward">前进 ▶</button><button data-nav="up">⬆ 向上</button><button data-nav="folders">📁 文件夹</button><button data-nav="view">▦ 查看</button></div>
      <div class="explorer-address"><label>地址(D)</label><input aria-label="地址"><button data-nav="go">转到</button></div>`;
    win.insertBefore(bar, win.querySelector('.win-body'));
    win._history = [win._item]; win._historyIndex = 0; win._view = 'icons';
    bar.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.nav;
      if (action === 'back' && win._historyIndex > 0) navigateWindow(win, win._history[--win._historyIndex], false);
      if (action === 'forward' && win._historyIndex < win._history.length - 1) navigateWindow(win, win._history[++win._historyIndex], false);
      if (action === 'up') { const parent = explorerParent(win._item); if (parent) navigateWindow(win, parent); }
      if (action === 'view') { win._view = win._view === 'icons' ? 'details' : 'icons'; renderWindowBody(win, win._item); }
      if (action === 'folders') { win.classList.toggle('show-folders'); renderWindowBody(win, win._item); }
      if (action === 'go') goToAddress(win);
    });
    bar.querySelector('.explorer-address input').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); goToAddress(win); }
    });
    bar.querySelectorAll('[data-menu]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation(); showExplorerMenu(button, win);
    }));
  }
  function goToAddress(win) {
    const text = win.querySelector('.explorer-address input').value.trim();
    const aliases = { '我的电脑': computer, '回收站': recycle, 'C:': drive, 'C:\\': drive, '桌面': desktopFolder };
    let target = aliases[text];
    if (!target && /^C:\\/i.test(text)) {
      target = drive;
      for (const segment of text.slice(3).split('\\').filter(Boolean)) {
        target = explorerChildren(target).find(entry => entry.name.toLocaleLowerCase() === segment.toLocaleLowerCase());
        if (!target) break;
      }
    }
    if (!target && /^桌面\\/.test(text)) {
      target = desktopFolder;
      for (const segment of text.slice(3).split('\\').filter(Boolean)) {
        target = explorerChildren(target).find(entry => entry.name.toLocaleLowerCase() === segment.toLocaleLowerCase());
        if (!target) break;
      }
    }
    if (!target) target = rootItems.find(entry => entry.name === text);
    if (target?.type === 'link') target = findById(target.targetId);
    if (target && isFolder(target)) navigateWindow(win, target);
    else showInfoDialog('地址', `Windows 找不到“${text}”。请检查拼写，然后重试。`);
  }
  const shellMenu = document.createElement('ul'); shellMenu.className = 'ctxmenu hidden'; desktop.appendChild(shellMenu);
  function showShellMenu(button, entries) {
    shellMenu.replaceChildren();
    for (const [label, action] of entries) {
      if (!label) { const sep = document.createElement('li'); sep.className = 'sep'; shellMenu.appendChild(sep); continue; }
      const li = document.createElement('li'); li.textContent = label;
      li.addEventListener('click', event => { event.stopPropagation(); shellMenu.classList.add('hidden'); action(); });
      shellMenu.appendChild(li);
    }
    const rect = button.getBoundingClientRect();
    shellMenu.style.left = Math.min(rect.left, innerWidth - 180) + 'px';
    shellMenu.style.top = rect.bottom + 'px'; shellMenu.classList.remove('hidden');
  }
  function showExplorerMenu(button, win) {
    const current = win._item;
    const selected = win.querySelector('.icon.small.selected');
    const item = selected && iconItems.get(selected);
    const selection = [...win.querySelectorAll('.icon.small.selected')].map(icon => iconItems.get(icon)).filter(Boolean);
    const editable = current !== computer && current !== recycle;
    const command = button.dataset.menu;
    let entries = [];
    if (command === 'file') entries = [
      ...(editable ? [['新建文件夹', () => addChildItem('folder', current, win)], ['新建文本文档', () => addChildItem('file', current, win)]] : []),
      ...(item && !isProtected(item) ? [['重命名', () => editLabel(selected, item)], ['删除', () => deleteItems(selection)]] : []),
      [null], ['关闭', () => win.querySelector('.win-close').click()]
    ];
    else if (command === 'edit') entries = [
      ...(item && !isProtected(item) ? [['剪切', () => setClipboard(selection, 'cut')]] : []),
      ...(item ? [['复制', () => setClipboard(selection, 'copy')]] : []),
      ...((cutItem || copiedItem) && editable ? [['粘贴', () => pasteInto(current)]] : []),
      ['全选', () => { selectIcon(null); win.querySelectorAll('.icon.small').forEach(icon => icon.classList.add('selected')); }]
    ];
    else if (command === 'view') entries = [
      ['图标', () => { win._view = 'icons'; renderWindowBody(win, current); }],
      ['详细信息', () => { win._view = 'details'; renderWindowBody(win, current); }],
      ['文件夹', () => { win.classList.toggle('show-folders'); renderWindowBody(win, current); }],
      [null], ['刷新', () => refreshFolders()]
    ];
    else if (command === 'tools') entries = [['文件夹选项', () => showFolderOptions()]];
    else if (command === 'help') entries = [['关于 Windows', () => showInfoDialog('关于 Windows', 'Microsoft Windows XP')]];
    showShellMenu(button, entries);
  }
  function showInfoDialog(title, message) {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = `<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title"></div><p></p><div class="xp-dialog-buttons"><button>确定</button></div></div>`;
    cover.querySelector('.xp-dialog-title').textContent = title;
    cover.querySelector('p').textContent = message;
    desktop.appendChild(cover);
    cover.querySelector('button').addEventListener('click', () => cover.remove());
  }
  function showFolderOptions() {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = '<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title">文件夹选项</div><p>浏览文件夹时：</p><label class="settings-option"><input type="radio" name="folder-mode" value="same">在同一窗口中打开每个文件夹</label><label class="settings-option"><input type="radio" name="folder-mode" value="separate">在不同窗口中打开每个文件夹</label><div class="xp-dialog-buttons"><button data-answer="ok">确定</button><button data-answer="cancel">取消</button></div></div>';
    desktop.appendChild(cover);
    cover.querySelector(`[value="${shellSettings.separateFolders ? 'separate' : 'same'}"]`).checked = true;
    cover.querySelector('[data-answer="ok"]').addEventListener('click', () => {
      shellSettings.separateFolders = cover.querySelector('[name="folder-mode"]:checked').value === 'separate';
      saveShellSettings(); cover.remove();
    });
    cover.querySelector('[data-answer="cancel"]').addEventListener('click', () => cover.remove());
  }
  function openDisplayProperties() {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = '<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title">显示 属性</div><p>Windows 和按钮：</p><label class="settings-option"><input type="radio" name="theme" value="blue">Windows XP 蓝色</label><label class="settings-option"><input type="radio" name="theme" value="olive">Windows XP 橄榄绿</label><label class="settings-option"><input type="radio" name="theme" value="silver">Windows XP 银色</label><div class="xp-dialog-buttons"><button data-answer="ok">确定</button><button data-answer="cancel">取消</button></div></div>';
    desktop.appendChild(cover); cover.querySelector(`[value="${shellSettings.theme}"]`).checked = true;
    cover.querySelector('[data-answer="ok"]').addEventListener('click', () => {
      shellSettings.theme = cover.querySelector('[name="theme"]:checked').value;
      desktop.dataset.theme = shellSettings.theme; saveShellSettings(); cover.remove();
    });
    cover.querySelector('[data-answer="cancel"]').addEventListener('click', () => cover.remove());
  }
  function openControlPanel() {
    const win = createWindow({ cls: 'control-win', title: '控制面板', width: '480px', height: '330px', iconType: 'control' }); wireChrome(win);
    const body = win.querySelector('.win-body'); body.classList.add('control-grid');
    for (const [name, action] of [['显示', openDisplayProperties], ['文件夹选项', showFolderOptions]]) {
      const button = document.createElement('button'); button.textContent = name;
      button.addEventListener('dblclick', action); body.appendChild(button);
    }
  }
  function navigateWindow(win, item, record = true) {
    if (item?.type === 'link') item = findById(item.targetId);
    if (!isFolder(item)) { if (item.type === 'game') openGame(item); else openItem(item); return; }
    win._item = item;
    if (record) { win._history.splice(win._historyIndex + 1); win._history.push(item); win._historyIndex++; }
    setWindowTitle(win, item.name);
    renderWindowBody(win, item);
  }

  // ── 打开文件夹 / 我的文档 / games 窗口（可拖拽标题栏、可拖边缘缩放） ──
  function openItem(item) {
    if (item?.type === 'link') item = findById(item.targetId);
    if (item.type === 'game') { openGame(item); return; }
    if (item.type === 'file') { openNotepad(item); return; }
    const iconType = item === computer || item === drive ? 'computer' : item === recycle ? 'recycle' : 'folder';
    const win = createWindow({ cls: 'folder-win', title: item.name, width: '580px', height: '420px', iconType });
    win._item = item;
    wireChrome(win);
    // 窗口空白处右键；回收站只提供清空操作。
    if (isFolder(item)) win.addEventListener('contextmenu', e => {
      if (e.target.closest('.icon.small')) return;
      e.preventDefault(); e.stopPropagation();
      showWinMenu(e.clientX, e.clientY, item, win);
    });
    if (isFolder(item)) addExplorerChrome(win);
    renderWindowBody(win, item);
  }

  function openNotepad(item = null) {
    const title = item ? `${item.name} - 记事本` : '无标题 - 记事本';
    const win = createWindow({ cls: 'notepad-win', title, width: '520px', height: '360px', iconType: 'notepad' });
    win._item = item; wireChrome(win);
    const body = win.querySelector('.win-body');
    body.innerHTML = '<div class="notepad-menu"><button data-notepad="file">文件(F)</button><button data-notepad="edit">编辑(E)</button><button data-notepad="format">格式(O)</button><button data-notepad="view">查看(V)</button><button data-notepad="help">帮助(H)</button></div><textarea spellcheck="false" aria-label="文本文档内容"></textarea><div class="notepad-status">第 1 行，第 1 列</div>';
    const area = body.querySelector('textarea'); area.value = item?.content || '';
    area.addEventListener('input', () => { if (item) { item.content = area.value; saveDesktop(); } });
    const status = body.querySelector('.notepad-status');
    const updateStatus = () => { const before = area.value.slice(0, area.selectionStart).split('\n'); status.textContent = `第 ${before.length} 行，第 ${before.at(-1).length + 1} 列`; };
    area.addEventListener('click', updateStatus); area.addEventListener('keyup', updateStatus); area.addEventListener('input', updateStatus);
    function save(as = false) {
      if (item && !as) { item.content = area.value; saveDesktop(); return; }
      askFileName(item?.name || '无标题.txt', name => {
        if (!validFileName(name)) { showInfoDialog('另存为', '请输入有效的文件名。'); return; }
        const existing = rootItems.find(entry => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        if (existing && existing !== item) { showInfoDialog('另存为', `已存在名为“${name}”的文件。`); return; }
        if (!item || as) {
          const [x, y] = nextDesktopPosition();
          item = { id: 'f' + Date.now(), type: 'file', name, glyph: '📄', content: area.value, x, y };
          rootItems.push(item);
        } else { item.name = name; item.content = area.value; }
        win._item = item; setWindowTitle(win, `${name} - 记事本`); saveDesktop(); refreshFolders();
      });
    }
    body.querySelectorAll('[data-notepad]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      let entries = [];
      if (button.dataset.notepad === 'file') entries = [
        ['新建', () => openNotepad()], ['保存', () => save()], ['另存为', () => save(true)], [null], ['退出', () => win.querySelector('.win-close').click()]
      ];
      if (button.dataset.notepad === 'edit') entries = [
        ['撤消', () => { area.focus(); document.execCommand('undo'); }],
        ['剪切', () => {
          textClipboard = area.value.slice(area.selectionStart, area.selectionEnd);
          navigator.clipboard?.writeText(textClipboard).catch(() => {});
          area.setRangeText('', area.selectionStart, area.selectionEnd, 'start'); area.dispatchEvent(new Event('input'));
        }],
        ['复制', () => {
          textClipboard = area.value.slice(area.selectionStart, area.selectionEnd);
          navigator.clipboard?.writeText(textClipboard).catch(() => {});
        }],
        ['粘贴', async () => {
          let value = textClipboard;
          try { value = await navigator.clipboard.readText(); } catch (_) {}
          area.setRangeText(value, area.selectionStart, area.selectionEnd, 'end'); area.dispatchEvent(new Event('input')); area.focus();
        }],
        ['全选', () => { area.focus(); area.select(); }]
      ];
      if (button.dataset.notepad === 'format') entries = [['自动换行', () => area.classList.toggle('wrap')]];
      if (button.dataset.notepad === 'view') entries = [['状态栏', () => status.classList.toggle('hidden')]];
      if (button.dataset.notepad === 'help') entries = [['关于记事本', () => showInfoDialog('关于记事本', '记事本')]];
      showShellMenu(button, entries);
    }));
  }
  function askFileName(initial, callback) {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = '<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title">另存为</div><p>文件名：<input aria-label="文件名"></p><div class="xp-dialog-buttons"><button data-answer="save">保存</button><button data-answer="cancel">取消</button></div></div>';
    const input = cover.querySelector('input'); input.value = initial; desktop.appendChild(cover); input.focus(); input.select();
    const close = yes => { const name = input.value.trim(); cover.remove(); if (yes) callback(name); };
    cover.querySelector('[data-answer="save"]').addEventListener('click', () => close(true));
    cover.querySelector('[data-answer="cancel"]').addEventListener('click', () => close(false));
    input.addEventListener('keydown', event => { if (event.key === 'Enter') close(true); if (event.key === 'Escape') close(false); });
  }
  function openSearch() {
    const win = createWindow({ cls: 'search-win', title: '搜索结果', width: '620px', height: '420px', iconType: 'search' }); wireChrome(win);
    const body = win.querySelector('.win-body');
    body.innerHTML = '<div class="search-panel"><label>全部或部分文件名：<input aria-label="搜索文件名"></label><button>搜索</button></div><div class="search-results"></div>';
    const input = body.querySelector('input'), results = body.querySelector('.search-results');
    const search = () => {
      const query = input.value.trim().toLocaleLowerCase(); results.replaceChildren();
      if (!query) return;
      const seen = new Set();
      const visit = items => items.forEach(item => {
        if (seen.has(item.id)) return; seen.add(item.id);
        if (!['computer', 'drive', 'link'].includes(item.type) && item.name.toLocaleLowerCase().includes(query)) {
          const row = document.createElement('button'); row.textContent = item.name;
          row.addEventListener('dblclick', () => openItem(item)); results.appendChild(row);
        }
        if (item.children && item !== recycle) visit(item.children);
      });
      visit(rootItems);
      if (!results.children.length) results.textContent = '搜索完成，没有找到文件。';
    };
    body.querySelector('.search-panel button').addEventListener('click', search);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') search(); }); input.focus();
  }
  function openRun() {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = '<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title">运行</div><p>输入程序、文件夹或文档的名称：<input aria-label="打开"></p><div class="xp-dialog-buttons"><button data-run="ok">确定</button><button data-run="cancel">取消</button></div></div>';
    desktop.appendChild(cover);
    const input = cover.querySelector('input'); input.focus();
    const run = () => {
      const name = input.value.trim().toLocaleLowerCase(); cover.remove();
      if (name === 'notepad' || name === 'notepad.exe') openNotepad();
      else if (name === 'explorer' || name === 'explorer.exe' || name === '我的电脑') openItem(computer);
      else if (name === 'c:' || name === 'c:\\') openItem(drive);
      else {
        const found = findNamedItem(name, rootItems);
        if (found) openItem(found); else showInfoDialog('运行', `Windows 找不到“${input.value.trim()}”。请检查拼写，然后重试。`);
      }
    };
    cover.querySelector('[data-run="ok"]').addEventListener('click', run);
    cover.querySelector('[data-run="cancel"]').addEventListener('click', () => cover.remove());
    input.addEventListener('keydown', event => { if (event.key === 'Enter') run(); if (event.key === 'Escape') cover.remove(); });
  }
  function findNamedItem(name, items) {
    for (const item of items) {
      if (item.name.toLocaleLowerCase() === name) return item;
      if (item.children) { const found = findNamedItem(name, item.children); if (found) return found; }
    }
    return null;
  }

  // ── 打开游戏：XP 窗口外壳内嵌 iframe 加载游戏主页面（大小可调 / 可最大化） ──
  function openGame(entry) {
    const existing = [...windowsEl.children].find(w => w.dataset.game === entry.launch);
    if (existing) { existing.style.display = ''; activateWindow(existing); syncGame(existing); existing.querySelector('iframe')?.focus(); return; }
    // 支持在 manifest 里为单个游戏指定窗口尺寸（entry.w / entry.h，单位 px），默认 480×360
    const gw = (entry && entry.w ? entry.w : 480) + 'px';
    const gh = (entry && entry.h ? entry.h : 360) + 'px';
    const win = createWindow({ cls: 'game-win', title: entry.name, width: gw, height: gh, iconSrc: entry.iconSrc });
    win.dataset.game=entry.launch;
    const body = win.querySelector('.win-body');
    body.innerHTML =
      `<iframe class="game-frame" src="${escapeHtml(entry.launch)}" title="${escapeHtml(entry.name)}"></iframe>`;
    wireChrome(win);

    // The teaching controls must stay reachable on phone-sized desktops.
    if(entry.launch==='games/heart/index.html'&&(desktop.clientWidth<820||desktop.clientHeight<600))setMaximized(win,win._maxBtn,true);

    const iframe = body.querySelector('iframe');
    const focusGame = () => { try { iframe.focus(); } catch (e) {} };
    // 标题栏按钮移出 tab 顺序；点击（最小化/最大化/关闭）后立即 blur 自身并把焦点交还游戏，
    // 否则焦点停留在按钮上，空格会再次触发该按钮（如切换最大化）而非进入游戏。
    win.querySelectorAll('.win-btns button').forEach(b => {
      b.setAttribute('tabindex', '-1');
      b.addEventListener('click', () => { b.blur(); focusGame(); });
    });
    iframe.addEventListener('load', focusGame);
    iframe.addEventListener('load', () => syncGame(win));
    focusGame();
    // 点击窗口内任意非按钮区域都把焦点交给游戏
    win.addEventListener('mousedown', e => { if (!e.target.closest('button')) focusGame(); });
  }

  function renderWindowBody(win, item) {
    const body = win.querySelector('.win-body');
    body.innerHTML = '';
    if (isFolder(item)) {
      const address = win.querySelector('.explorer-address input');
      if (address) address.value = explorerAddress(item);
      win.querySelector('[data-nav="back"]')?.toggleAttribute('disabled', win._historyIndex <= 0);
      win.querySelector('[data-nav="forward"]')?.toggleAttribute('disabled', win._historyIndex >= win._history.length - 1);
      win.querySelector('[data-nav="up"]')?.toggleAttribute('disabled', !explorerParent(item));
      const grid = document.createElement('div');
      grid.className = 'folder-grid' + (win._view === 'details' ? ' details' : '');
      if (win._view === 'details') {
        const header = document.createElement('div'); header.className = 'details-header';
        header.innerHTML = item === recycle ? '<span>名称</span><span>原位置</span><span>删除日期</span>' : '<span>名称</span><span>类型</span>';
        grid.appendChild(header);
      }
      explorerChildren(item).forEach(ch => {
        const c = document.createElement('div');
        c.className = 'icon small' + (cutItems.includes(ch) ? ' cut' : '');
        iconItems.set(c, ch);
        const glyphHtml = ch.iconSrc
          ? `<img class="glyph-img" src="${escapeHtml(ch.iconSrc)}" alt="">`
          : `<div class="glyph">${escapeHtml(ch.glyph || '📁')}</div>`;
        c.innerHTML = glyphHtml + `<div class="label">${escapeHtml(ch.name)}</div>`;
        if (item === recycle) {
          const origin = ch.recycleOrigin?.parentId && findById(ch.recycleOrigin.parentId);
          c.title = `原位置：${origin?.name || '桌面'}\n删除日期：${ch.deletedAt ? new Date(ch.deletedAt).toLocaleString('zh-CN') : ''}`;
        }
        if (win._view === 'details') {
          const type = document.createElement('span'); type.className = 'details-type';
          type.textContent = item === recycle ? (ch.recycleOrigin?.parentId && findById(ch.recycleOrigin.parentId)?.name || '桌面') : ch.type === 'file' ? '文本文档' : ch.type === 'game' ? '应用程序' : ch === drive ? '本地磁盘' : '文件夹';
          c.appendChild(type);
          if (item === recycle) { const date = document.createElement('span'); date.className = 'details-date'; date.textContent = ch.deletedAt ? new Date(ch.deletedAt).toLocaleString('zh-CN') : ''; c.appendChild(date); }
        }
        c.addEventListener('click', e => { e.stopPropagation(); selectIcon(c, e.ctrlKey); });
        c.addEventListener('dblclick', () => ch.type === 'game' ? openGame(ch) : shellSettings.separateFolders ? openItem(ch) : navigateWindow(win, ch));
        c.addEventListener('contextmenu', e => {
          e.preventDefault(); e.stopPropagation();
          showItemMenu(e.clientX, e.clientY, c, ch, item, win);
        });
        enableIconDrag(c, ch);
        grid.appendChild(c);
      });
      if (win.classList.contains('show-folders')) {
        const sidebar = document.createElement('div');
        sidebar.className = 'folder-sidebar';
        [computer, drive, ...rootItems.filter(entry => entry !== computer && entry !== recycle), recycle].forEach(entry => {
          const link = document.createElement('button'); link.textContent = entry.name;
          link.addEventListener('click', () => navigateWindow(win, entry)); sidebar.appendChild(link);
        });
        body.appendChild(sidebar);
      }
      body.appendChild(grid);
      const status = document.createElement('div'); status.className = 'explorer-status';
      status.textContent = `${explorerChildren(item).length} 个对象`;
      body.appendChild(status);
    }
  }

  // ── 菜单：子项重命名/删除（桌面图标与窗口子项通用） ──
  let itemMenuTarget = null;
  function showItemMenu(x, y, el, ch, parent, win) {
    if (!el.classList.contains('selected')) selectIcon(el);
    itemMenuTarget = { el, ch, parent, win };
    const trashed = !!locate(ch)?.inRecycle;
    const actions = ch === recycle ? ['open', 'empty'] : trashed ? ['restore', 'permanentDelete'] :
      isProtected(ch) ? ['open', 'paste'] : ['open', 'rename', 'cut', 'copy', 'paste', 'delete'];
    itemMenu.querySelectorAll('li[data-action]').forEach(entry => {
      entry.hidden = !actions.includes(entry.dataset.action) ||
        entry.dataset.action === 'paste' && (!isFolder(ch) || (!cutItem && !copiedItem) || ch === computer || cutItem && !canMove(cutItem, ch)) ||
        entry.dataset.action === 'empty' && !recycle.children.length;
    });
    itemMenu.style.left = x + 'px';
    itemMenu.style.top  = y + 'px';
    itemMenu.classList.remove('hidden');
  }

  // ── 菜单：窗口空白处新建文件夹 ──
  let winMenuTarget = null;
  function showWinMenu(x, y, item, win) {
    if (item === computer || item === recycle && !recycle.children.length) { winMenu.classList.add('hidden'); return; }
    winMenuTarget = { item, win };
    winMenu.querySelector('.submenu-parent').hidden = item === recycle;
    winMenu.querySelectorAll('li[data-action]').forEach(entry => {
      entry.hidden = item === recycle ? entry.dataset.action !== 'empty' || !recycle.children.length :
        item === computer ? true :
        entry.dataset.action === 'empty' || entry.dataset.action === 'paste' && ((!cutItem && !copiedItem) || cutItem && !canMove(cutItem, item));
    });
    winMenu.style.left = x + 'px';
    winMenu.style.top  = y + 'px';
    winMenu.classList.remove('hidden');
  }

  // ── 窗口缩放 ──
  function enableResize(win, handle, dir) {
    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      const ow = win.offsetWidth, oh = win.offsetHeight, ol = win.offsetLeft, ot = win.offsetTop;
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let nw = ow, nh = oh;
        if (dir.includes('e')) nw = ow + dx;
        if (dir.includes('w')) nw = ow - dx;
        if (dir.includes('s')) nh = oh + dy;
        if (dir.includes('n')) nh = oh - dy;
        nw = Math.max(220, nw); nh = Math.max(140, nh);
        if (dir.includes('e')) win.style.width = nw + 'px';
        if (dir.includes('w')) { win.style.width = nw + 'px'; win.style.left = (ol + ow - nw) + 'px'; }
        if (dir.includes('s')) win.style.height = nh + 'px';
        if (dir.includes('n')) { win.style.height = nh + 'px'; win.style.top = (ot + oh - nh) + 'px'; }
      };
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  // ── 窗口最大化 / 还原 ──
  function setMaximized(win, btn, on) {
    if (on && !win._max) {
      win._restore = { left: win.offsetLeft, top: win.offsetTop, width: win.offsetWidth, height: win.offsetHeight };
      win.style.left = '0px'; win.style.top = '0px';
      win.style.width = desktop.clientWidth + 'px';
      win.style.height = desktop.clientHeight - 38 + 'px';
      win._max = true; btn.textContent = '▣'; btn.title = '还原';
      win.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
    } else if (!on && win._max) {
      const r = win._restore;
      win.style.left = r.left + 'px'; win.style.top = r.top + 'px';
      win.style.width = r.width + 'px'; win.style.height = r.height + 'px';
      win._max = false; btn.textContent = '□'; btn.title = '最大化';
      win.querySelectorAll('.resize-handle').forEach(h => h.style.display = '');
    }
  }
  function enableMaximize(win, btn) {
    btn.addEventListener('click', e => { e.stopPropagation(); setMaximized(win, btn, !win._max); });
  }

  // ── 窗口拖拽 ──
  function enableDrag(win, handle) {
    let sx, sy, ox, oy, drag = false;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      if (win._max && win._maxBtn) setMaximized(win, win._maxBtn, false);
      drag = true; sx = e.clientX; sy = e.clientY; ox = win.offsetLeft; oy = win.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      win.style.left = (ox + e.clientX - sx) + 'px';
      win.style.top  = (oy + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', () => { drag = false; });
  }

  // ── 右键菜单：桌面空白处新建文件夹 ──
  desktop.addEventListener('contextmenu', e => {
    if (e.target.closest('.icon, .win, #taskbar, #startMenu, .ctxmenu')) return; // 仅桌面空白区
    e.preventDefault();
    const rect = desktop.getBoundingClientRect();
    ctx.dataset.x = e.clientX - rect.left;
    ctx.dataset.y = e.clientY - rect.top;
    ctx.querySelector('[data-action="paste"]').hidden = (!cutItem && !copiedItem) || cutItem && !canMove(cutItem, null);
    ctx.style.left = e.clientX + 'px';
    ctx.style.top  = e.clientY + 'px';
    ctx.classList.remove('hidden');
  });
  document.addEventListener('click', () => { ctx.classList.add('hidden'); winMenu.classList.add('hidden'); itemMenu.classList.add('hidden'); shellMenu.classList.add('hidden'); taskbarMenu.classList.add('hidden'); taskWindowMenu.classList.add('hidden'); });

  ctx.addEventListener('click', e => {
    const li = e.target.closest('li[data-action]');
    if (!li) return;
    e.stopPropagation();
    const action = li.dataset.action;
    if (action === 'newfolder') addDesktopItem('folder', +ctx.dataset.x, +ctx.dataset.y);
    else if (action === 'newfile') addDesktopItem('file', +ctx.dataset.x, +ctx.dataset.y);
    else if (action === 'paste') pasteInto(null, [+ctx.dataset.x, +ctx.dataset.y]);
    else if (action === 'refresh') renderDesktop();
    else if (action === 'sortname') {
      const ordered = [...rootItems].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      ordered.forEach((item, index) => { item.x = 24 + Math.floor(index / Math.max(1, Math.floor((desktop.clientHeight - 50) / 92))) * 96; item.y = 16 + index % Math.max(1, Math.floor((desktop.clientHeight - 50) / 92)) * 92; });
      saveDesktop(); renderDesktop();
    }
    ctx.classList.add('hidden');
  });
  winMenu.addEventListener('click', e => {
    const li = e.target.closest('li[data-action]');
    if (!li) return;
    e.stopPropagation();
    const t = winMenuTarget;
    if (t && li.dataset.action === 'newfolder') addChildItem('folder', t.item, t.win);
    else if (t && li.dataset.action === 'newfile') addChildItem('file', t.item, t.win);
    else if (t && li.dataset.action === 'paste') pasteInto(t.item);
    else if (t && li.dataset.action === 'empty' && t.item === recycle) emptyRecycle();
    winMenu.classList.add('hidden');
  });
  itemMenu.addEventListener('click', e => {
    const li = e.target.closest('li[data-action]');
    if (!li) return;
    e.stopPropagation();
    const action = li.dataset.action, t = itemMenuTarget;
    if (t) {
      if (action === 'open') t.ch.type === 'game' ? openGame(t.ch) : openItem(t.ch);
      else if (action === 'rename' && !isProtected(t.ch)) editLabel(t.el, t.ch, v => nextFreeName(v, locate(t.ch)?.items || rootItems, t.ch));
      else if (action === 'cut' && !isProtected(t.ch)) setClipboard(selectedItems(), 'cut');
      else if (action === 'copy') setClipboard(selectedItems(), 'copy');
      else if (action === 'paste') pasteInto(t.ch);
      else if (action === 'delete') deleteItems(selectedItems());
      else if (action === 'restore') restoreItem(t.ch);
      else if (action === 'permanentDelete') deleteItem(t.ch, true);
      else if (action === 'empty' && t.ch === recycle) emptyRecycle();
    }
    itemMenu.classList.add('hidden');
  });

  // 点击桌面空白取消选中并隐藏菜单
  desktop.addEventListener('click', () => selectIcon(null));

  function updateClock() {
    const now = new Date();
    trayClock.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    trayClock.title = now.toLocaleDateString('zh-CN');
  }
  updateClock(); setInterval(updateClock, 30000);
  function showTaskWindowMenu(event, win) {
    taskWindowMenu._win = win;
    taskWindowMenu.querySelectorAll('[data-window-action]').forEach(entry => {
      const action = entry.dataset.windowAction;
      const disabled = action === 'restore' ? win.style.display !== 'none' && !win._max
        : action === 'minimize' ? win.style.display === 'none'
        : action === 'maximize' ? !!win._max
        : action === 'move' || action === 'size' ? !!win._max : false;
      entry.classList.toggle('disabled', disabled); entry.setAttribute('aria-disabled', String(disabled));
    });
    taskbarMenu.classList.add('hidden');
    taskWindowMenu.classList.remove('hidden');
    taskWindowMenu.style.left = Math.min(event.clientX, innerWidth - taskWindowMenu.offsetWidth - 4) + 'px';
    taskWindowMenu.style.top = Math.max(0, event.clientY - taskWindowMenu.offsetHeight - 3) + 'px';
  }
  function keyboardWindowCommand(win, mode) {
    if (win.style.display === 'none') win.style.display = '';
    activateWindow(win);
    const original = { left: win.offsetLeft, top: win.offsetTop, width: win.offsetWidth, height: win.offsetHeight };
    win.classList.add('keyboard-command');
    const handle = event => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); document.removeEventListener('keydown', handle, true);
        win.classList.remove('keyboard-command');
        if (event.key === 'Escape') Object.assign(win.style, { left: original.left + 'px', top: original.top + 'px', width: original.width + 'px', height: original.height + 'px' });
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      if (mode === 'move') { win.style.left = win.offsetLeft + dx + 'px'; win.style.top = win.offsetTop + dy + 'px'; }
      else { win.style.width = Math.max(220, win.offsetWidth + dx) + 'px'; win.style.height = Math.max(140, win.offsetHeight + dy) + 'px'; }
    };
    document.addEventListener('keydown', handle, true);
  }
  taskWindowMenu.addEventListener('click', event => {
    const entry = event.target.closest('[data-window-action]');
    if (!entry || entry.classList.contains('disabled')) return;
    event.stopPropagation(); taskWindowMenu.classList.add('hidden');
    const win = taskWindowMenu._win;
    if (!win?.isConnected) return;
    const action = entry.dataset.windowAction;
    if (action === 'close') win.querySelector('.win-close').click();
    else if (action === 'minimize') win.querySelector('.win-min').click();
    else if (action === 'maximize') { if (win.style.display === 'none') win.style.display = ''; setMaximized(win, win._maxBtn, true); activateWindow(win); syncGame(win); }
    else if (action === 'restore') { if (win._max) setMaximized(win, win._maxBtn, false); win.style.display = ''; activateWindow(win); syncGame(win); }
    else if (action === 'move' || action === 'size') keyboardWindowCommand(win, action);
    refreshTaskManagers();
  });
  taskbar.addEventListener('contextmenu', event => {
    event.preventDefault(); event.stopPropagation();
    taskbarMenu.style.left = Math.min(event.clientX, innerWidth - 175) + 'px';
    taskbarMenu.style.top = Math.max(0, event.clientY - 220) + 'px';
    taskbarMenu.classList.remove('hidden');
  });
  taskbarMenu.addEventListener('click', event => {
    const action = event.target.closest('[data-task]')?.dataset.task;
    if (!action) return; event.stopPropagation(); taskbarMenu.classList.add('hidden');
    const wins = [...windowsEl.children].filter(win => win.style.display !== 'none');
    if (action === 'desktop') {
      for (const win of wins) { win.style.display = 'none'; win._task?.classList.remove('active'); syncGame(win); }
    } else if (action === 'cascade') wins.forEach((win, index) => {
      if (win._max) setMaximized(win, win._maxBtn, false);
      win.style.left = 50 + index * 26 + 'px'; win.style.top = 30 + index * 26 + 'px'; activateWindow(win);
    });
    else if (action === 'tile-h' || action === 'tile-v') wins.forEach((win, index) => {
      if (win._max) setMaximized(win, win._maxBtn, false);
      if (action === 'tile-h') { win.style.left = '0px'; win.style.top = index * (desktop.clientHeight - 38) / wins.length + 'px'; win.style.width = desktop.clientWidth + 'px'; win.style.height = (desktop.clientHeight - 38) / wins.length + 'px'; }
      else { win.style.left = index * desktop.clientWidth / wins.length + 'px'; win.style.top = '0px'; win.style.width = desktop.clientWidth / wins.length + 'px'; win.style.height = desktop.clientHeight - 38 + 'px'; }
    });
    else if (action === 'manager') openTaskManager();
    else if (action === 'properties') showTaskbarProperties();
  });
  function refreshTaskManagers() {
    for (const win of windowsEl.querySelectorAll('.manager-win')) win._refreshManager?.();
  }
  function processName(win) {
    if (win.classList.contains('manager-win')) return 'taskmgr.exe';
    if (win.classList.contains('notepad-win')) return 'notepad.exe';
    if (win.classList.contains('game-win')) return 'game.exe';
    return 'explorer.exe';
  }
  function openTaskManager() {
    const existing = windowsEl.querySelector('.manager-win');
    if (existing) { existing.style.display = ''; activateWindow(existing); existing._refreshManager?.(); return; }
    const win = createWindow({ cls: 'manager-win', title: 'Windows 任务管理器', width: '470px', height: '350px', iconType: 'taskmgr' }); wireChrome(win);
    const body = win.querySelector('.win-body');
    body.innerHTML = '<div class="manager-tabs"><button data-manager-tab="applications">应用程序</button><button data-manager-tab="processes">进程</button></div><div class="manager-header"></div><div class="manager-list"></div><div class="manager-footer"><span class="manager-status"></span><button data-manager-action="switch">切换至</button><button data-manager-action="end">结束任务</button><button data-manager-action="new">新建任务...</button></div>';
    let tab = 'applications', selected = null;
    const list = body.querySelector('.manager-list');
    const header = body.querySelector('.manager-header');
    const status = body.querySelector('.manager-status');
    const render = () => {
      if (!win.isConnected) return;
      const windows = [...windowsEl.children].filter(other => other.classList.contains('win'));
      body.querySelectorAll('[data-manager-tab]').forEach(button => button.classList.toggle('active', button.dataset.managerTab === tab));
      header.innerHTML = tab === 'applications' ? '<span>任务</span><span>状态</span>' : '<span>映像名称</span><span>用户名</span>';
      list.replaceChildren();
      const entries = tab === 'applications'
        ? windows.map(other => ({ name: other.querySelector('.win-title-text')?.textContent || '', win: other, status: other.style.display === 'none' ? '已最小化' : '正在运行' }))
        : [{ name: 'explorer.exe', win: null, status: '用户' }, ...windows.filter(other => !other.classList.contains('folder-win')).map(other => ({ name: processName(other), win: other, status: '用户' }))];
      for (const entry of entries) {
        const row = document.createElement('button'); row.className = 'manager-row';
        row.innerHTML = `<span>${escapeHtml(entry.name)}</span><span>${escapeHtml(entry.status)}</span>`;
        if (entry.win && entry.win === selected) row.classList.add('selected');
        row.addEventListener('click', () => { selected = entry.win; render(); });
        row.addEventListener('dblclick', () => {
          if (!entry.win) return;
          entry.win.style.display = ''; activateWindow(entry.win); syncGame(entry.win); render();
        });
        list.appendChild(row);
      }
      status.textContent = tab === 'applications' ? `${entries.length} 个任务` : `${entries.length} 个进程`;
      body.querySelector('[data-manager-action="switch"]').hidden = tab !== 'applications';
      const end = body.querySelector('[data-manager-action="end"]');
      end.textContent = tab === 'applications' ? '结束任务' : '结束进程';
      end.disabled = !selected || selected === win;
    };
    win._refreshManager = render;
    body.querySelectorAll('[data-manager-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.managerTab; selected = null; render(); }));
    body.querySelector('[data-manager-action="switch"]').addEventListener('click', () => {
      if (!selected || !selected.isConnected) return;
      selected.style.display = ''; activateWindow(selected); syncGame(selected); render();
    });
    body.querySelector('[data-manager-action="end"]').addEventListener('click', () => {
      if (!selected || selected === win || !selected.isConnected) return;
      selected.querySelector('.win-close').click(); selected = null; render();
    });
    body.querySelector('[data-manager-action="new"]').addEventListener('click', openRun);
    render();
  }
  function showTaskbarProperties() {
    const cover = document.createElement('div'); cover.className = 'xp-dialog-cover';
    cover.innerHTML = '<div class="xp-dialog" role="dialog" aria-modal="true"><div class="xp-dialog-title">任务栏和「开始」菜单属性</div><label class="settings-option"><input type="checkbox" data-setting="autoHide">自动隐藏任务栏</label><label class="settings-option"><input type="checkbox" data-setting="showClock">显示时钟</label><div class="xp-dialog-buttons"><button data-answer="ok">确定</button><button data-answer="cancel">取消</button></div></div>';
    desktop.appendChild(cover);
    cover.querySelector('[data-setting="autoHide"]').checked = shellSettings.autoHide;
    cover.querySelector('[data-setting="showClock"]').checked = shellSettings.showClock;
    cover.querySelector('[data-answer="ok"]').addEventListener('click', () => {
      shellSettings.autoHide = cover.querySelector('[data-setting="autoHide"]').checked;
      shellSettings.showClock = cover.querySelector('[data-setting="showClock"]').checked;
      taskbar.classList.toggle('autohide', shellSettings.autoHide); trayClock.hidden = !shellSettings.showClock;
      saveShellSettings(); cover.remove();
    });
    cover.querySelector('[data-answer="cancel"]').addEventListener('click', () => cover.remove());
  }
  function toggleStart(force) {
    const show = force ?? startMenu.classList.contains('hidden');
    startMenu.classList.toggle('hidden', !show); startButton.setAttribute('aria-expanded', String(show));
    if (!show) document.getElementById('allPrograms').classList.add('hidden');
  }
  startButton.addEventListener('click', event => { event.stopPropagation(); toggleStart(); });
  startMenu.querySelector('[data-start="all-programs"]').addEventListener('mouseenter', () => document.getElementById('allPrograms').classList.remove('hidden'));
  startMenu.addEventListener('mouseleave', () => document.getElementById('allPrograms').classList.add('hidden'));
  startMenu.addEventListener('click', event => {
    const action = event.target.closest('[data-start]')?.dataset.start;
    if (!action) return;
    event.stopPropagation();
    if (action === 'all-programs') {
      document.getElementById('allPrograms').classList.toggle('hidden'); return;
    }
    toggleStart(false);
    if (action === 'computer') openItem(computer);
    else if (action === 'docs') openItem(rootItems.find(item => item.id === 'docs'));
    else if (action === 'recycle') openItem(recycle);
    else if (action === 'games') { const games = findById('games'); if (games && !locate(games)?.inRecycle) openItem(games); }
    else if (action === 'notepad') openNotepad();
    else if (action === 'control') openControlPanel();
    else if (action === 'search') openSearch();
    else if (action === 'run') openRun();
    else if (action === 'logoff' || action === 'shutdown') showPowerScreen(action);
  });
  function showPowerScreen(action) {
    const overlay = document.createElement('div');
    overlay.className = 'power-overlay';
    overlay.innerHTML = `<div class="power-panel"><h2>Windows XP</h2><p>${action === 'logoff' ? '注销 Windows' : '关闭计算机'}</p><div class="power-actions">${action === 'logoff' ? '<button data-power="switch">切换用户</button><button data-power="logoff">注销</button>' : '<button data-power="standby">待机</button><button data-power="off">关闭</button><button data-power="restart">重新启动</button>'}</div><button data-power="cancel">取消</button></div>`;
    desktop.appendChild(overlay);
    overlay.addEventListener('click', event => {
      const choice = event.target.closest('[data-power]')?.dataset.power;
      if (!choice) return;
      if (choice === 'cancel') overlay.remove();
      else if (choice === 'restart') location.reload();
      else if (choice === 'switch' || choice === 'logoff') {
        if (choice === 'logoff') for (const win of [...windowsEl.children]) { win._task?.remove(); win.remove(); }
        overlay.innerHTML = '<div class="power-panel"><h2>Windows XP</h2><p>用户</p><button data-power="login">登录</button></div>';
      } else if (choice === 'standby') { overlay.classList.add('power-off'); overlay.innerHTML = '<div class="power-panel"><button data-power="wake">唤醒</button></div>'; }
      else if (choice === 'off') { overlay.classList.add('power-off'); overlay.innerHTML = '<div class="power-panel"><button data-power="restart">启动计算机</button></div>'; }
      else if (choice === 'login' || choice === 'wake') overlay.remove();
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('#startMenu, #startButton')) toggleStart(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { toggleStart(false); ctx.classList.add('hidden'); winMenu.classList.add('hidden'); itemMenu.classList.add('hidden'); shellMenu.classList.add('hidden'); taskWindowMenu.classList.add('hidden'); return; }
    if ((event.key === 'Meta' || event.ctrlKey && event.key === 'Escape') && !event.repeat) { event.preventDefault(); toggleStart(); return; }
    if (event.target instanceof Element && (event.target.matches('input, textarea, [contenteditable]') || event.target.closest('iframe'))) return;
    const selected = document.querySelector('.icon.selected');
    const item = selected && iconItems.get(selected);
    const activeWin = [...windowsEl.querySelectorAll('.folder-win')].filter(win => win.style.display !== 'none').sort((a, b) => +b.style.zIndex - +a.style.zIndex)[0];
    const target = activeWin?._item || null;
    if (event.ctrlKey && event.key.toLowerCase() === 'a') {
      event.preventDefault(); selectIcon(null);
      (activeWin?.querySelectorAll('.icon.small') || iconsEl.querySelectorAll('.icon')).forEach(icon => icon.classList.add('selected'));
      return;
    }
    if (event.key === 'F2' && item && !isProtected(item)) { event.preventDefault(); editLabel(selected, item, name => nextFreeName(name, locate(item)?.items || rootItems, item)); }
    if (event.key === 'Delete' && item) { event.preventDefault(); deleteItems(selectedItems(), event.shiftKey); }
    if (event.ctrlKey && event.key.toLowerCase() === 'x' && item && !isProtected(item)) { event.preventDefault(); setClipboard(selectedItems(), 'cut'); }
    if (event.ctrlKey && event.key.toLowerCase() === 'c' && item) { event.preventDefault(); setClipboard(selectedItems(), 'copy'); }
    if (event.ctrlKey && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteInto(target === computer || target === recycle ? null : target); }
    if (event.key === 'Enter' && item) { event.preventDefault(); openItem(item); }
  });

  loadGames().finally(renderDesktop);
})();
