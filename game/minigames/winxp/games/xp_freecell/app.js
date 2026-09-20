// 空当接龙 / FreeCell — WinXP 风格自包含小游戏（无 alert/prompt/confirm）
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 700, H = 460;
  canvas.width = W; canvas.height = H;

  const CW = 70, CH = 98, GAP = 8;
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  const ROW_Y = 16, TAB_Y = 130;
  const FREE_X = i => 16 + i * (CW + GAP);
  const FND_X = i => 380 + i * (CW + GAP);
  const COL_X = i => 16 + i * (CW + GAP);
  const AVAIL = H - TAB_Y - 10;
  const newBtn = { x: 292, y: 16, w: 76, h: 32 };

  let free = [null, null, null, null];
  let foundations = [[], [], [], []];
  let cols = [[], [], [], [], [], [], [], []];
  let drag = null, won = false, moves = 0;

  function color(c) { return (c.s === 1 || c.s === 2) ? 1 : 0; }
  function buildDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s });
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  function newGame() {
    const d = buildDeck();
    free = [null, null, null, null]; foundations = [[], [], [], []]; cols = [[], [], [], [], [], [], [], []];
    drag = null; won = false; moves = 0;
    for (let k = 0; k < d.length; k++) cols[k % 8].push(d[k]);
  }

  function colLayout(pile) {
    let off = 22;
    const rawH = Math.max(0, pile.length - 1) * off + CH;
    if (rawH > AVAIL) off = (AVAIL - CH) / Math.max(1, pile.length - 1);
    return off;
  }
  function cardY(pile, k) { const off = colLayout(pile); return TAB_Y + k * off; }
  function isSeq(pile, k) {
    for (let j = k; j < pile.length; j++) {
      if (j > k) { const a = pile[j - 1], b = pile[j]; if (a.r !== b.r + 1 || color(a) === color(b)) return false; }
    }
    return true;
  }
  function canDropCol(card, i) {
    const c = cols[i];
    if (c.length === 0) return true;
    const top = c[c.length - 1];
    return top.r === card.r + 1 && color(top) !== color(card);
  }
  function canDropFnd(card, i) {
    const f = foundations[i];
    if (f.length === 0) return card.r === 1;
    const top = f[f.length - 1];
    return top.s === card.s && card.r === top.r + 1;
  }
  function freeCellsEmpty() { let n = 0; for (const f of free) if (!f) n++; return n; }
  function emptyCols() { let n = 0; for (const c of cols) if (!c.length) n++; return n; }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  function hit(p, x, y) { return p.x >= x && p.x <= x + CW && p.y >= y && p.y <= y + CH; }

  function pickUp(p) {
    for (let i = 0; i < 4; i++) if (free[i] && hit(p, FREE_X(i), ROW_Y)) return { cards: [free[i]], src: 'free', pi: i, dx: p.x - FREE_X(i), dy: p.y - ROW_Y };
    for (let i = 3; i >= 0; i--) { const f = foundations[i]; if (f.length && hit(p, FND_X(i), ROW_Y)) return { cards: [f[f.length - 1]], src: 'fnd', pi: i, dx: p.x - FND_X(i), dy: p.y - ROW_Y }; }
    for (let i = 0; i < 8; i++) {
      const pile = cols[i];
      for (let k = pile.length - 1; k >= 0; k--) {
        const y = cardY(pile, k);
        if (hit(p, COL_X(i), y)) {
          if (isSeq(pile, k)) return { cards: pile.slice(k), src: 'col', pi: i, idx: k, dx: p.x - COL_X(i), dy: p.y - y };
          return null;
        }
      }
    }
    return null;
  }
  function targetAt(p) {
    for (let i = 0; i < 4; i++) if (p.x >= FREE_X(i) - 6 && p.x <= FREE_X(i) + CW + 6 && p.y >= ROW_Y - 6 && p.y <= ROW_Y + CH + 6) return { type: 'free', i };
    for (let i = 0; i < 4; i++) if (p.x >= FND_X(i) - 6 && p.x <= FND_X(i) + CW + 6 && p.y >= ROW_Y - 6 && p.y <= ROW_Y + CH + 6) return { type: 'fnd', i };
    for (let i = 0; i < 8; i++) if (p.x >= COL_X(i) - 6 && p.x <= COL_X(i) + CW + 6 && p.y >= TAB_Y - 30) return { type: 'col', i };
    return null;
  }
  function seqCapacity(exceptSrc, destCol) {
    let f = freeCellsEmpty(), e = 0;
    for (let i = 0; i < 8; i++) { if (i === exceptSrc || i === destCol) continue; if (!cols[i].length) e++; }
    return (f + 1) * Math.pow(2, e);
  }

  function applyMove(d, tgt) {
    if (!tgt) return false;
    const card = d.cards[0];
    if (tgt.type === 'free') {
      if (d.cards.length !== 1 || free[tgt.i]) return false;
      if (d.src === 'free' && d.pi === tgt.i) return false;
    } else if (tgt.type === 'fnd') {
      if (d.cards.length !== 1 || !canDropFnd(card, tgt.i)) return false;
      if (d.src === 'fnd' && d.pi === tgt.i) return false;
    } else {
      if (!canDropCol(card, tgt.i)) return false;
      if (d.src === 'col' && d.pi === tgt.i) return false;
      if (d.cards.length > 1 && d.cards.length > seqCapacity(d.src === 'col' ? d.pi : -1, tgt.i)) return false;
    }
    // 移除
    if (d.src === 'free') free[d.pi] = null;
    else if (d.src === 'fnd') foundations[d.pi].pop();
    else cols[d.pi].length = d.idx;
    // 放置
    if (tgt.type === 'free') free[tgt.i] = card;
    else if (tgt.type === 'fnd') foundations[tgt.i].push(card);
    else for (const c of d.cards) cols[tgt.i].push(c);
    moves++; checkWin(); return true;
  }
  function checkWin() { won = foundations.every(f => f.length === 13); }
  function autoToFoundation(d) {
    if (d.cards.length !== 1) return false;
    for (let i = 0; i < 4; i++) if (canDropFnd(d.cards[0], i)) return applyMove(d, { type: 'fnd', i });
    return false;
  }

  canvas.addEventListener('mousedown', e => {
    const p = pointer(e);
    if (p.x >= newBtn.x && p.x <= newBtn.x + newBtn.w && p.y >= newBtn.y && p.y <= newBtn.y + newBtn.h) { newGame(); return; }
    drag = pickUp(p);
    if (drag) { drag.x = p.x; drag.y = p.y; }
  });
  canvas.addEventListener('mousemove', e => { if (drag) { const p = pointer(e); drag.x = p.x; drag.y = p.y; } });
  window.addEventListener('mouseup', e => {
    if (!drag) return;
    applyMove(drag, targetAt(pointer(e)));
    drag = null;
  });
  canvas.addEventListener('dblclick', e => {
    const d = pickUp(pointer(e));
    if (!d) return;
    if (autoToFoundation(d)) return;
    for (let i = 0; i < 8; i++) { if (d.src === 'col' && d.pi === i) continue; if (d.cards.length === 1 && canDropCol(d.cards[0], i)) { applyMove(d, { type: 'col', i }); return; } }
  });

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function slot(x, y, label) {
    roundRect(x, y, CW, CH, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (label) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '26px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + CW / 2, y + CH / 2 + 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
  }
  function drawCard(x, y, card) {
    roundRect(x, y, CW, CH, 6);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 1.2; ctx.stroke();
    const col = color(card) ? '#d21a1a' : '#161616';
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 20px Tahoma'; ctx.fillText(RANKS[card.r], x + 6, y + 4);
    ctx.font = '16px Tahoma'; ctx.fillText(SUITS[card.s], x + 7, y + 27);
    ctx.font = '34px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(SUITS[card.s], x + CW / 2, y + CH / 2 + 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function render() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e7a36'); g.addColorStop(1, '#0a5c27');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 4; i++) { if (free[i]) drawCard(FREE_X(i), ROW_Y, free[i]); else slot(FREE_X(i), ROW_Y, null); }
    for (let i = 0; i < 4; i++) { if (foundations[i].length) drawCard(FND_X(i), ROW_Y, foundations[i][foundations[i].length - 1]); else slot(FND_X(i), ROW_Y, SUITS[i]); }

    roundRect(newBtn.x, newBtn.y, newBtn.w, newBtn.h, 8);
    ctx.fillStyle = '#2f6bd0'; ctx.fill(); ctx.strokeStyle = '#bcd2ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '14px Tahoma,"Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('新游戏', newBtn.x + newBtn.w / 2, newBtn.y + newBtn.h / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px Tahoma';
    ctx.fillText('步数 ' + moves, newBtn.x, newBtn.y + newBtn.h + 18);

    for (let i = 0; i < 8; i++) {
      const pile = cols[i];
      if (!pile.length) { slot(COL_X(i), TAB_Y, null); continue; }
      for (let k = 0; k < pile.length; k++) drawCard(COL_X(i), cardY(pile, k), pile[k]);
    }
    if (drag) for (let k = 0; k < drag.cards.length; k++) drawCard(drag.x - drag.dx, drag.y - drag.dy + k * 22, drag.cards[k]);

    if (won) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffe27a'; ctx.font = 'bold 34px Tahoma,"Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('恭喜通关！', W / 2, H / 2 - 6);
      ctx.fillStyle = '#fff'; ctx.font = '16px Tahoma,"Microsoft YaHei",sans-serif';
      ctx.fillText('点「新游戏」再开一局', W / 2, H / 2 + 34);
      ctx.textAlign = 'left';
    }
  }

  function loop() { requestAnimationFrame(loop); render(); }
  newGame(); loop();
})();
