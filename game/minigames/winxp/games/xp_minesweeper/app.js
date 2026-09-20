// 扫雷 / Minesweeper — WinXP 风格自包含桌面小游戏（无 alert/prompt/confirm）
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 500, H = 340;
  canvas.width = W; canvas.height = H;

  const LEVELS = [
    { name: '初级', cols: 9, rows: 9, mines: 10 },
    { name: '中级', cols: 16, rows: 16, mines: 40 },
    { name: '高级', cols: 30, rows: 16, mines: 99 }
  ];
  const NUMCOL = ['', '#0000FF', '#008000', '#FF0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
  const GRAY = '#c0c0c0', LIGHT = '#ffffff', DARK = '#808080', LINE = '#808080';

  let level = 0;
  let cols, rows, mineCount, grid, cell, bx, by;
  let started = false, over = false, won = false;
  let flagsUsed = 0, revealedCount = 0, timeElapsed = 0, running = false;
  let face = 'happy', pressFace = false;
  let badMine = null, raf = 0, last = 0;

  const BTN = { y: 5, h: 22, w: 78, x0: 8, gap: 6 };
  function levelBtnRect(i) { return { x: BTN.x0 + i * (BTN.w + BTN.gap), y: BTN.y, w: BTN.w, h: BTN.h }; }
  function restartBtnRect() { return { x: BTN.x0 + 3 * (BTN.w + BTN.gap), y: BTN.y, w: 88, h: BTN.h }; }
  const smileyRect = { x: W / 2 - 15, y: 32, w: 30, h: 30 };

  function idx(r, c) { return r * cols + c; }
  function cellAt(px, py) {
    const c = Math.floor((px - bx) / cell), r = Math.floor((py - by) / cell);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
    return { r, c };
  }
  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push({ r: nr, c: nc });
    }
    return out;
  }

  function newGame(lv) {
    if (lv != null) level = lv;
    const cfg = LEVELS[level];
    cols = cfg.cols; rows = cfg.rows; mineCount = cfg.mines;
    cell = Math.floor(Math.min(30, (W - 24) / cols, (H - 74) / rows));
    bx = Math.floor((W - cols * cell) / 2);
    by = 48 + Math.floor((H - 48 - 8 - rows * cell) / 2);
    grid = [];
    for (let i = 0; i < cols * rows; i++) grid.push({ mine: false, revealed: false, flag: 0, adj: 0 });
    started = false; over = false; won = false;
    flagsUsed = 0; revealedCount = 0; timeElapsed = 0; running = false;
    face = 'happy'; badMine = null;
    last = performance.now();
  }

  function placeMines(safeR, safeC) {
    const safe = new Set();
    safe.add(idx(safeR, safeC));
    for (const n of neighbors(safeR, safeC)) safe.add(idx(n.r, n.c));
    const pool = [];
    for (let i = 0; i < cols * rows; i++) if (!safe.has(i)) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (let k = 0; k < Math.min(mineCount, pool.length); k++) grid[pool[k]].mine = true;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let n = 0; for (const nb of neighbors(r, c)) if (grid[idx(nb.r, nb.c)].mine) n++;
      grid[idx(r, c)].adj = n;
    }
    started = true; running = true;
  }

  function reveal(r, c) {
    const g = grid[idx(r, c)];
    if (g.revealed || g.flag === 1) return;
    if (!started) placeMines(r, c);
    if (g.mine) { lose(r, c); return; }
    // 迭代洪泛
    const stack = [{ r, c }];
    while (stack.length) {
      const cur = stack.pop();
      const cg = grid[idx(cur.r, cur.c)];
      if (cg.revealed || cg.flag === 1) continue;
      cg.revealed = true; revealedCount++;
      if (cg.adj === 0) for (const nb of neighbors(cur.r, cur.c)) { const ng = grid[idx(nb.r, nb.c)]; if (!ng.revealed && ng.flag !== 1 && !ng.mine) stack.push(nb); }
    }
    checkWin();
  }
  function lose(r, c) {
    over = true; running = false; face = 'dead'; badMine = { r, c };
    for (const g of grid) if (g.mine) g.revealed = true;
  }
  function checkWin() {
    if (revealedCount === cols * rows - mineCount) {
      over = true; won = true; running = false; face = 'win';
      for (const g of grid) if (g.mine) g.flag = 1;
      flagsUsed = mineCount;
    }
  }
  function toggleFlag(r, c) {
    const g = grid[idx(r, c)];
    if (g.revealed || over) return;
    g.flag = (g.flag + 1) % 3;
    flagsUsed += g.flag === 1 ? 1 : (g.flag === 2 ? -1 : 0);
  }
  function chord(r, c) {
    const g = grid[idx(r, c)];
    if (!g.revealed || g.adj === 0) return;
    let f = 0;
    for (const nb of neighbors(r, c)) if (grid[idx(nb.r, nb.c)].flag === 1) f++;
    if (f !== g.adj) return;
    for (const nb of neighbors(r, c)) { const ng = grid[idx(nb.r, nb.c)]; if (!ng.revealed && ng.flag !== 1) reveal(nb.r, nb.c); }
  }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  function inRect(p, b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', e => {
    const p = pointer(e);
    // 难度按钮 / 笑脸 / 重开
    for (let i = 0; i < LEVELS.length; i++) if (inRect(p, levelBtnRect(i))) { newGame(i); return; }
    if (inRect(p, restartBtnRect())) { newGame(); return; }
    if (inRect(p, smileyRect)) { newGame(); return; }
    if (over) return;
    const cc = cellAt(p.x, p.y);
    if (!cc) return;
    if (e.button === 2) { toggleFlag(cc.r, cc.c); return; }
    if (e.button === 1) { chord(cc.r, cc.c); return; }
    // 左键
    if (grid[idx(cc.r, cc.c)].revealed) { chord(cc.r, cc.c); return; }
    pressFace = true; face = over ? face : 'surprised';
    reveal(cc.r, cc.c);
    if (!over) face = 'happy';
  });
  window.addEventListener('mouseup', () => { pressFace = false; if (face === 'surprised') face = 'happy'; });

  // ── 绘制 ──
  function raised(x, y, w, h) {
    ctx.fillStyle = GRAY; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = LIGHT; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = DARK; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
  }
  function sunken(x, y, w, h) {
    ctx.fillStyle = GRAY; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = DARK; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = LIGHT; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
  }
  function ledBox(x, y) {
    sunken(x, y, 54, 28);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 3, y + 3, 48, 22);
  }
  function ledText(x, y, n) {
    let s;
    if (n >= 0) s = ('00' + Math.min(999, n)).slice(-3);
    else s = '-' + ('0' + Math.min(99, -n)).slice(-2);
    ctx.fillStyle = '#ff2020'; ctx.font = 'bold 20px "Consolas","Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x + 27, y + 15);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function drawSmiley() {
    const s = smileyRect; raised(s.x, s.y, s.w, s.h);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2, r = 10;
    ctx.fillStyle = '#ffe000'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    if (face === 'dead') {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      [[-4, -3], [4, -3]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(cx + dx - 2, cy + dy - 2); ctx.lineTo(cx + dx + 2, cy + dy + 2); ctx.moveTo(cx + dx + 2, cy + dy - 2); ctx.lineTo(cx + dx - 2, cy + dy + 2); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(cx, cy + 3, 4, 0.15 * Math.PI, 0.85 * Math.PI, true); ctx.stroke();
    } else if (face === 'win') {
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - 8, cy - 4, 6, 3); ctx.fillRect(cx + 2, cy - 4, 6, 3);
      ctx.fillRect(cx - 7, cy - 5, 2, 5); ctx.fillRect(cx + 5, cy - 5, 2, 5);
      ctx.beginPath(); ctx.arc(cx, cy + 2, 4, 0, Math.PI); ctx.stroke();
    } else {
      const surprise = pressFace;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 3, surprise ? 1.8 : 1.3, 0, 6.28); ctx.arc(cx + 4, cy - 3, surprise ? 1.8 : 1.3, 0, 6.28); ctx.fill();
      ctx.beginPath();
      if (surprise) { ctx.arc(cx, cy + 4, 2.4, 0, 6.28); ctx.fill(); }
      else { ctx.arc(cx, cy + 2, 4.5, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); }
    }
  }
  function drawFlag(x, y, s) {
    const cx = x + s / 2, cy = y + s / 2;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx + 1, cy - s * 0.3); ctx.lineTo(cx + 1, cy + s * 0.3); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.fillRect(cx - s * 0.3, cy + s * 0.3 - 1, s * 0.55, 2);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.moveTo(cx + 1, cy - s * 0.3); ctx.lineTo(cx - s * 0.32, cy - s * 0.12); ctx.lineTo(cx + 1, cy + s * 0.02); ctx.closePath(); ctx.fill();
  }
  function drawMine(x, y, s, exploded) {
    const cx = x + s / 2, cy = y + s / 2, r = s * 0.26;
    ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(1, s * 0.06);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r * 1.7); ctx.stroke(); }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - r * 0.5, cy - r * 0.5, r * 0.35, r * 0.35);
    if (exploded) { ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, s - 2, s - 2); }
  }

  function render() {
    ctx.fillStyle = GRAY; ctx.fillRect(0, 0, W, H);
    // 外框
    raised(4, 0, W - 8, H);
    // 难度按钮
    for (let i = 0; i < LEVELS.length; i++) {
      const b = levelBtnRect(i);
      (i === level ? sunken : raised)(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#000'; ctx.font = '13px Tahoma,"Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(LEVELS[i].name, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    const rb = restartBtnRect();
    raised(rb.x, rb.y, rb.w, rb.h);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', rb.x + rb.w / 2, rb.y + rb.h / 2 + 1);
    // 笑脸
    drawSmiley();
    // LED
    ledBox(12, 30); ledText(12, 30, mineCount - flagsUsed);
    ledBox(W - 66, 30); ledText(W - 66, 30, Math.floor(timeElapsed));

    // 雷区
    if (grid) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const g = grid[idx(r, c)];
        const x = bx + c * cell, y = by + r * cell;
        if (!g.revealed) { raised(x, y, cell, cell); if (g.flag === 1) drawFlag(x, y, cell); else if (g.flag === 2) { ctx.fillStyle = '#000'; ctx.font = 'bold ' + Math.round(cell * 0.6) + 'px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x + cell / 2, y + cell / 2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; } }
        else {
          ctx.fillStyle = GRAY; ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
          if (g.mine) drawMine(x, y, cell, badMine && badMine.r === r && badMine.c === c);
          else if (g.adj > 0) {
            ctx.fillStyle = NUMCOL[g.adj]; ctx.font = 'bold ' + Math.round(cell * 0.62) + 'px Tahoma';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(g.adj), x + cell / 2, y + cell / 2 + 1);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          }
        }
      }
      // 输局：标错的旗打叉
      if (over && !won) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const g = grid[idx(r, c)];
        if (g.flag === 1 && !g.mine) {
          const x = bx + c * cell, y = by + r * cell;
          ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + cell - 4, y + cell - 4);
          ctx.moveTo(x + cell - 4, y + 4); ctx.lineTo(x + 4, y + cell - 4); ctx.stroke();
        }
      }
    }
    if (over) {
      ctx.fillStyle = won ? 'rgba(0,120,0,0.0)' : 'rgba(0,0,0,0.0)';
      ctx.fillStyle = '#000'; ctx.font = 'bold 15px Tahoma,"Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(won ? '♪ 胜利！点笑脸或按钮重来' : '踩雷了…点笑脸重来', W / 2, H - 8);
      ctx.textAlign = 'left';
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (running && !over) timeElapsed = Math.min(999, timeElapsed + dt);
    render();
  }
  window.addEventListener('unload', () => { if (raf) cancelAnimationFrame(raf); raf = 0; });
  newGame(0); loop(performance.now());
})();
