// Windows XP 风格桌面：纯 HTML/CSS/JS，无外部资源、无原生弹窗（alert/prompt/confirm）。
// 功能：桌面图标（可拖动摆放、右键重命名/删除）、右键桌面新建文件夹（原位命名）、
//       双击打开可拖拽且可缩放的窗口、文件夹内可嵌套子文件夹、右键空白处新建/子项重命名删除。
(() => {
  const desktop = document.getElementById('desktop');
  const iconsEl  = document.getElementById('icons');
  const windowsEl = document.getElementById('windows');
  const ctx      = document.getElementById('ctxmenu');
  const winMenu  = document.getElementById('winMenu');
  const itemMenu = document.getElementById('itemMenu');

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

  // 桌面根级默认图标（不含「我的电脑」）
  let rootItems = [
    { id: 'docs',     type: 'docs',     name: '我的文档', glyph: '📁', x: 24, y: 16 },
    { id: 'recycle',  type: 'recycle',  name: '回收站',   glyph: '🗑️', x: 24, y: 108 },
    { id: 'games',    type: 'games',    name: 'games',    glyph: '📁', x: 24, y: 200,
      children: GAMES.map(g => ({ id: 'game-' + g.name, type: 'game', name: g.name, iconSrc: g.icon, launch: g.launch, w: g.w, h: g.h })) },
  ];

  // 优先从 games/manifest.json 读取游戏列表；失败（如 file:// 直接打开）则保留内置 GAMES，并同步到 games 文件夹子项
  async function loadGames() {
    try {
      const r = await fetch('games/manifest.json', { cache: 'no-store' });
      if (r.ok) {
        const m = await r.json();
        if (Array.isArray(m.games) && m.games.length) GAMES = m.games;
      }
    } catch (e) { /* 非标准服务 / 本地文件：保留内置 GAMES */ }
    const gf = rootItems.find(it => it.id === 'games');
    if (gf) gf.children = GAMES.map(g => ({ id: 'game-' + g.name, type: 'game', name: g.name, iconSrc: g.icon, launch: g.launch, w: g.w, h: g.h }));
  }

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function clampPos(x, y) {
    const w = desktop.clientWidth, h = desktop.clientHeight;
    return [Math.max(4, Math.min(x, w - 90)), Math.max(4, Math.min(y, h - 90))];
  }

  // 同级内唯一命名：base 已占用则 base(2), base(3)… 依次递增（不出现 (1)）
  function nextFreeName(base, siblings, self) {
    const taken = new Set(siblings.filter(s => s !== self).map(s => s.name));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(base + '(' + n + ')')) n++;
    return base + '(' + n + ')';
  }

  // ── 桌面图标渲染 ──
  function renderDesktop() {
    iconsEl.innerHTML = '';
    rootItems.forEach(it => iconsEl.appendChild(makeIcon(it)));
  }

  function makeIcon(item, parentArray) {
    const el = document.createElement('div');
    el.className = 'icon';
    [el.style.left, el.style.top] = [item.x + 'px', item.y + 'px'];
    el.innerHTML = `<div class="glyph">${item.glyph}</div><div class="label">${escapeHtml(item.name)}</div>`;
    el.addEventListener('click', e => { e.stopPropagation(); selectIcon(el); });
    el.addEventListener('dblclick', e => { e.stopPropagation(); openItem(item); });
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      showItemMenu(e.clientX, e.clientY, el, item, parentArray || rootItems, null);
    });
    enableIconDrag(el, item);
    return el;
  }

  // ── 桌面图标拖拽摆放 ──
  function enableIconDrag(el, item) {
    let sx, sy, ox, oy, moved = false;
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop; moved = false;
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 3) moved = true;
        if (moved) { const [nx, ny] = clampPos(ox + dx, oy + dy); el.style.left = nx + 'px'; el.style.top = ny + 'px'; }
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        if (moved) { item.x = el.offsetLeft; item.y = el.offsetTop; }
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  function selectIcon(el) {
    document.querySelectorAll('.icon.selected').forEach(i => i.classList.remove('selected'));
    if (el) el.classList.add('selected');
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
      if (commit && v) item.name = dedupe ? dedupe(v) : v;
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

  // ── 新建文件夹（落到桌面指定位置，并立即原地命名） ──
  function addDesktopFolder(x, y) {
    const [px, py] = clampPos(x, y);
    const item = { id: 'f' + Date.now() + Math.random().toString(16).slice(2),
                   type: 'folder', name: nextFreeName('新建文件夹', rootItems, null), glyph: '📁', x: px, y: py, children: [] };
    rootItems.push(item);
    const el = makeIcon(item);
    iconsEl.appendChild(el);
    selectIcon(el);
    editLabel(el, item);
  }

  // ── 在文件夹内新建子文件夹（窗口空白处右键 → 新建文件夹） ──
  function addChildFolder(parent, win) {
    parent.children = parent.children || [];
    const child = { id: 'f' + Date.now() + Math.random().toString(16).slice(2),
                    type: 'folder', name: nextFreeName('新建文件夹', parent.children, null), glyph: '📁', children: [] };
    parent.children.push(child);
    renderWindowBody(win, parent);
    const grid = win.querySelector('.folder-grid');
    const els = grid.querySelectorAll('.icon.small');
    if (els.length) editLabel(els[els.length - 1], child);
  }

  // ── 创建窗口通用外壳：标题栏 + 最小化/最大化/关闭 + 八向缩放手柄 ──
  function createWindow({ cls = '', title, width = '300px', height = '200px', left, top }) {
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
    return win;
  }

  // 通用窗口交互：拖拽标题 / 置顶 / 最小化 / 最大化 / 关闭
  function wireChrome(win) {
    const title = win.querySelector('.win-title');
    enableDrag(win, title);
    win.addEventListener('mousedown', () => { win.style.zIndex = ++zCounter; });
    win.querySelector('.win-close').addEventListener('click', () => win.remove());
    win.querySelector('.win-min').addEventListener('click', () => { win.style.display = 'none'; syncGame(win); });
    const maxBtn = win.querySelector('.win-max');
    enableMaximize(win, maxBtn);
    win._maxBtn = maxBtn;
  }

  // ── 打开文件夹 / 我的文档 / games 窗口（可拖拽标题栏、可拖边缘缩放） ──
  function openItem(item) {
    const win = createWindow({ title: item.name });
    wireChrome(win);
    // 窗口空白处右键 → 新建文件夹（子项右键由 itemMenu 处理）
    win.addEventListener('contextmenu', e => {
      if (e.target.closest('.icon.small')) return;
      e.preventDefault(); e.stopPropagation();
      showWinMenu(e.clientX, e.clientY, item, win);
    });
    renderWindowBody(win, item);
  }

  // ── 打开游戏：XP 窗口外壳内嵌 iframe 加载游戏主页面（大小可调 / 可最大化） ──
  function openGame(entry) {
    const existing = [...windowsEl.children].find(w => w.dataset.game === entry.launch);
    if (existing) { existing.style.display = ''; existing.style.zIndex = ++zCounter; syncGame(existing); existing.querySelector('iframe')?.focus(); return; }
    // 支持在 manifest 里为单个游戏指定窗口尺寸（entry.w / entry.h，单位 px），默认 480×360
    const gw = (entry && entry.w ? entry.w : 480) + 'px';
    const gh = (entry && entry.h ? entry.h : 360) + 'px';
    const win = createWindow({ cls: 'game-win', title: entry.name, width: gw, height: gh });
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
    if (item.type === 'folder' || item.type === 'docs' || item.type === 'games') {
      const grid = document.createElement('div');
      grid.className = 'folder-grid';
      (item.children || []).forEach(ch => {
        const c = document.createElement('div');
        c.className = 'icon small';
        const glyphHtml = ch.iconSrc
          ? `<img class="glyph-img" src="${escapeHtml(ch.iconSrc)}" alt="">`
          : `<div class="glyph">${escapeHtml(ch.glyph || '📁')}</div>`;
        c.innerHTML = glyphHtml + `<div class="label">${escapeHtml(ch.name)}</div>`;
        c.addEventListener('click', e => { e.stopPropagation(); selectIcon(c); });
        if (ch.type === 'game') {
          // 游戏入口：双击打开游戏窗口（不提供删除菜单，避免误删真实游戏文件夹）
          c.addEventListener('dblclick', () => openGame(ch));
        } else {
          c.addEventListener('dblclick', () => openItem(ch));
          c.addEventListener('contextmenu', e => {
            e.preventDefault(); e.stopPropagation();
            showItemMenu(e.clientX, e.clientY, c, ch, item, win);
          });
        }
        grid.appendChild(c);
      });
      body.appendChild(grid);
    } else {
      const msg = document.createElement('div');
      msg.className = 'win-msg';
      msg.textContent = item.type === 'recycle' ? '（回收站是空的）' : '（空）';
      body.appendChild(msg);
    }
  }

  // ── 菜单：子项重命名/删除（桌面图标与窗口子项通用） ──
  let itemMenuTarget = null;
  function showItemMenu(x, y, el, ch, parent, win) {
    itemMenuTarget = { el, ch, parent, win };
    itemMenu.style.left = x + 'px';
    itemMenu.style.top  = y + 'px';
    itemMenu.classList.remove('hidden');
  }

  // ── 菜单：窗口空白处新建文件夹 ──
  let winMenuTarget = null;
  function showWinMenu(x, y, item, win) {
    winMenuTarget = { item, win };
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
      win.style.height = desktop.clientHeight + 'px';
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
    if (e.target.closest('.icon') || e.target.closest('.win')) return; // 仅桌面空白区
    e.preventDefault();
    const rect = desktop.getBoundingClientRect();
    ctx.dataset.x = e.clientX - rect.left;
    ctx.dataset.y = e.clientY - rect.top;
    ctx.style.left = e.clientX + 'px';
    ctx.style.top  = e.clientY + 'px';
    ctx.classList.remove('hidden');
  });
  document.addEventListener('click', () => { ctx.classList.add('hidden'); winMenu.classList.add('hidden'); itemMenu.classList.add('hidden'); });

  ctx.addEventListener('click', e => {
    const li = e.target.closest('li[data-action]');
    if (!li) return;
    e.stopPropagation();
    const action = li.dataset.action;
    if (action === 'newfolder') addDesktopFolder(+ctx.dataset.x, +ctx.dataset.y);
    else if (action === 'refresh') renderDesktop();
    ctx.classList.add('hidden');
  });
  winMenu.addEventListener('click', e => {
    const li = e.target.closest('li[data-action]');
    if (!li) return;
    e.stopPropagation();
    const t = winMenuTarget;
    if (t && li.dataset.action === 'newfolder') addChildFolder(t.item, t.win);
    winMenu.classList.add('hidden');
  });
  itemMenu.addEventListener('click', e => {
    const li = e.target.closest('li[data-action]');
    if (!li) return;
    e.stopPropagation();
    const action = li.dataset.action, t = itemMenuTarget;
    if (t) {
      if (action === 'rename') {
        editLabel(t.el, t.ch, v => nextFreeName(v, t.win ? t.parent.children : rootItems, t.ch));
      } else if (action === 'delete') {
        if (t.win) {
          t.parent.children = (t.parent.children || []).filter(x => x !== t.ch);
          renderWindowBody(t.win, t.parent);
        } else {
          const i = rootItems.indexOf(t.ch);
          if (i >= 0) { rootItems.splice(i, 1); renderDesktop(); }
        }
      }
    }
    itemMenu.classList.add('hidden');
  });

  // 点击桌面空白取消选中并隐藏菜单
  desktop.addEventListener('click', () => selectIcon(null));

  loadGames().finally(renderDesktop);
})();
