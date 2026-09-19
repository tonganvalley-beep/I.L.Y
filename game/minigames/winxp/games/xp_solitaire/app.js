// 纸牌（克朗代克接龙）/ Klondike Solitaire — WinXP 风格自包含小游戏（无 alert/prompt/confirm）
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 640, H = 460;
  canvas.width = W; canvas.height = H;

  const CW = 66, CH = 92;
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  const TOP_Y = 16, TAB_Y = 128;
  const FND_X = i => 330 + i * 76;
  const TAB_X = i => 16 + i * 74;
  const AVAIL = H - TAB_Y - 10;

  let stock = [], waste = [], foundations = [[], [], [], []], tableau = [[], [], [], [], [], [], []];
  let drag = null, won = false, moves = 0;

  function color(c) { return (c.s === 1 || c.s === 2) ? 1 : 0; }

  function buildDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s, faceUp: false });
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  function newGame() {
    const d = buildDeck();
    stock = []; waste = []; foundations = [[], [], [], []]; tableau = [[], [], [], [], [], [], []];
    drag = null; won = false; moves = 0;
    for (let i = 0; i < 7; i++) for (let k = 0; k <= i; k++) { const c = d.pop(); c.faceUp = (k === i); tableau[i].push(c); }
    while (d.length) { const c = d.pop(); c.faceUp = false; stock.push(c); }
  }

  function pileLayout(pile) {
    let nU = 0; for (const c of pile) if (c.faceUp) nU++;
    const nD = pile.length - nU;
    let offD = 7, offU = 20;
    const rawH = nD * offD + Math.max(0, nU - 1) * offU + CH;
    if (rawH > AVAIL) { const sc = (AVAIL - CH) / Math.max(1, rawH - CH); offD *= sc; offU *= sc; }
    return { offD, offU };
  }
  function cardY(pile, k) {
    const { offD, offU } = pileLayout(pile);
    let y = TAB_Y;
    for (let j = 0; j < k; j++) y += pile[j].faceUp ? offU : offD;
    return y;
  }
  function isMovableSeq(pile, k) {
    for (let j = k; j < pile.length; j++) {
      if (!pile[j].faceUp) return false;
      if (j > k) { const a = pile[j - 1], b = pile[j]; if (a.r !== b.r + 1 || color(a) === color(b)) return false; }
    }
    return true;
  }
  function canDropTableau(card, i) {
    const t = tableau[i];
    if (t.length === 0) return card.r === 13;
    const top = t[t.length - 1];
    return top.faceUp && top.r === card.r + 1 && color(top) !== color(card);
  }
  function canDropFoundation(card, i) {
    const f = foundations[i];
    if (f.length === 0) return card.r === 1;
    const top = f[f.length - 1];
    return top.s === card.s && card.r === top.r + 1;
  }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  function hit(p, x, y) { return p.x >= x && p.x <= x + CW && p.y >= y && p.y <= y + CH; }
  const newBtn = { x: 190, y: TOP_Y, w: 96, h: 32 };

  function pickUp(p) {
    for (let i = 3; i >= 0; i--) { const f = foundations[i]; if (f.length && hit(p, FND_X(i), TOP_Y)) return { cards: [f[f.length - 1]], src: 'foundation', pi: i, idx: f.length - 1, dx: p.x - FND_X(i), dy: p.y - TOP_Y }; }
    if (waste.length && hit(p, 94, TOP_Y)) return { cards: [waste[waste.length - 1]], src: 'waste', pi: 0, idx: waste.length - 1, dx: p.x - 94, dy: p.y - TOP_Y };
    for (let i = 0; i < 7; i++) {
      const pile = tableau[i];
      for (let k = pile.length - 1; k >= 0; k--) {
        const y = cardY(pile, k);
        if (hit(p, TAB_X(i), y)) {
          if (pile[k].faceUp && isMovableSeq(pile, k)) return { cards: pile.slice(k), src: 'tableau', pi: i, idx: k, dx: p.x - TAB_X(i), dy: p.y - y };
          return null;
        }
      }
    }
    return null;
  }
  function targetAt(p) {
    for (let i = 0; i < 4; i++) if (p.x >= FND_X(i) - 8 && p.x <= FND_X(i) + CW + 8 && p.y >= TOP_Y - 8 && p.y <= TOP_Y + CH + 8) return { type: 'foundation', i };
    for (let i = 0; i < 7; i++) if (p.x >= TAB_X(i) - 6 && p.x <= TAB_X(i) + CW + 6 && p.y >= TAB_Y - 30) return { type: 'tableau', i };
    return null;
  }
  function applyMove(d, tgt) {
    if (!tgt) return false;
    const card = d.cards[0];
    if (tgt.type === 'foundation') {
      if (d.cards.length !== 1 || !canDropFoundation(card, tgt.i)) return false;
    } else {
      if (!canDropTableau(card, tgt.i)) return false;
      if (d.src === 'tableau' && d.pi === tgt.i) return false;
    }
    // 从源移除
    if (d.src === 'tableau') tableau[d.pi].length = d.idx;
    else if (d.src === 'waste') waste.pop();
    else foundations[d.pi].pop();
    // 放入目标
    if (tgt.type === 'foundation') foundations[tgt.i].push(card);
    else for (const c of d.cards) tableau[tgt.i].push(c);
    // 源牌堆顶自动翻面
    if (d.src === 'tableau') { const pile = tableau[d.pi]; if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1].faceUp = true; }
    moves++;
    checkWin();
    return true;
  }
  function checkWin() { won = foundations.every(f => f.length === 13); }

  function drawFromStock() {
    if (stock.length) { const c = stock.pop(); c.faceUp = true; waste.push(c); }
    else if (waste.length) { while (waste.length) { const c = waste.pop(); c.faceUp = false; stock.push(c); } }
  }
  function autoToFoundation(d) {
    if (d.cards.length !== 1) return false;
    for (let i = 0; i < 4; i++) if (canDropFoundation(d.cards[0], i)) return applyMove(d, { type: 'foundation', i });
    return false;
  }

  canvas.addEventListener('mousedown', e => {
    const p = pointer(e);
    if (p.x >= newBtn.x && p.x <= newBtn.x + newBtn.w && p.y >= newBtn.y && p.y <= newBtn.y + newBtn.h) { newGame(); return; }
    if (hit(p, 16, TOP_Y)) { drawFromStock(); return; }
    drag = pickUp(p);
    if (drag) { drag.x = p.x; drag.y = p.y; }
  });
  canvas.addEventListener('mousemove', e => { if (drag) { const p = pointer(e); drag.x = p.x; drag.y = p.y; } });
  window.addEventListener('mouseup', e => {
    if (!drag) return;
    const p = pointer(e);
    const tgt = targetAt(p);
    applyMove(drag, tgt);
    drag = null;
  });
  canvas.addEventListener('dblclick', e => {
    const p = pointer(e);
    const d = pickUp(p);
    if (!d) return;
    if (autoToFoundation(d)) return;
    for (let i = 0; i < 7; i++) { if (d.src === 'tableau' && d.pi === i) continue; if (canDropTableau(d.cards[0], i)) { applyMove(d, { type: 'tableau', i }); return; } }
  });

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function slot(x, y, label) {
    roundRect(x, y, CW, CH, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (label) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '26px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + CW / 2, y + CH / 2 + 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
  }
  function drawCard(x, y, card, faceUp) {
    roundRect(x, y, CW, CH, 6);
    if (!faceUp) {
      ctx.fillStyle = '#2b5fbf'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
      for (let k = -CH; k < CW; k += 8) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + CH, y + CH); ctx.stroke(); }
      ctx.restore();
      roundRect(x, y, CW, CH, 6); ctx.strokeStyle = '#dfe8ff'; ctx.lineWidth = 2; ctx.stroke();
      roundRect(x + 4, y + 4, CW - 8, CH - 8, 4); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      return;
    }
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 1.2; ctx.stroke();
    const col = color(card) ? '#d21a1a' : '#161616';
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 19px Tahoma'; ctx.fillText(RANKS[card.r], x + 6, y + 4);
    ctx.font = '15px Tahoma'; ctx.fillText(SUITS[card.s], x + 7, y + 25);
    ctx.font = '32px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(SUITS[card.s], x + CW / 2, y + CH / 2 + 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function render() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e7a36'); g.addColorStop(1, '#0a5c27');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 牌库 / 废牌堆
    if (stock.length) drawCard(16, TOP_Y, stock[stock.length - 1], false); else slot(16, TOP_Y, '↻');
    if (waste.length) {
      const n = Math.min(3, waste.length);
      for (let k = n - 1; k >= 0; k--) drawCard(94 - k * 3, TOP_Y, waste[waste.length - 1 - k], true);
    } else slot(94, TOP_Y, null);

    // 新游戏按钮
    roundRect(newBtn.x, newBtn.y, newBtn.w, newBtn.h, 8);
    ctx.fillStyle = '#2f6bd0'; ctx.fill(); ctx.strokeStyle = '#bcd2ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '15px Tahoma,"Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('新游戏', newBtn.x + newBtn.w / 2, newBtn.y + newBtn.h / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px Tahoma';
    ctx.fillText('步数 ' + moves, newBtn.x, newBtn.y + newBtn.h + 18);

    // 基础堆
    for (let i = 0; i < 4; i++) {
      if (foundations[i].length) drawCard(FND_X(i), TOP_Y, foundations[i][foundations[i].length - 1], true);
      else slot(FND_X(i), TOP_Y, SUITS[i]);
    }
    // 列牌堆
    for (let i = 0; i < 7; i++) {
      const pile = tableau[i];
      if (!pile.length) { slot(TAB_X(i), TAB_Y, 'K'); continue; }
      for (let k = 0; k < pile.length; k++) drawCard(TAB_X(i), cardY(pile, k), pile[k], pile[k].faceUp);
    }
    // 拖拽中
    if (drag) for (let k = 0; k < drag.cards.length; k++) drawCard(drag.x - drag.dx, drag.y - drag.dy + k * 20, drag.cards[k], true);

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
  window.addEventListener('unload', () => {});
  newGame(); loop();
})();
