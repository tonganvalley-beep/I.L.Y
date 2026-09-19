// 红心大战 / Hearts — WinXP 风格自包含小游戏（无 alert/prompt/confirm）
// 1 人 + 3 AI；传牌 / 首攻梅花2 / 跟色 / 红心破冰 / 射月 / 累计到 100 结束。
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 640, H = 500;
  canvas.width = W; canvas.height = H;

  const SUITS = ['♠', '♥', '♦', '♣'];              // 0黑桃 1红心 2方块 3梅花
  const LABEL = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A' };
  const NAMES = ['你', '东', '北', '西'];            // 0南 1东 2北 3西（逆时针出牌 0→1→2→3）
  const QS = c => c.s === 0 && c.r === 12;
  const color = c => (c.s === 1 || c.s === 2) ? '#d21a1a' : '#161616';

  let hands = [[], [], [], []];
  let scores = [0, 0, 0, 0];
  let roundPts = [0, 0, 0, 0];
  let phase = 'pass';                 // pass | play | trickDone | roundEnd | gameOver
  let round = 0, passDir = 'left';
  let selected = [];
  let trick = [], turn = 0, leader = 0;
  let heartsBroken = false, firstTrick = true;
  let delay = 0, msg = '', moon = false;
  let raf = 0, last = 0;

  const step = { left: 1, right: -1, across: 2 };
  const passBtn = { x: W / 2 - 55, y: 250, w: 110, h: 36 };
  const nextBtn = { x: W / 2 - 60, y: 300, w: 120, h: 36 };
  const restartBtn = { x: W / 2 - 60, y: 330, w: 120, h: 36 };

  function buildDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  function sortHand(h) { h.sort((a, b) => a.s !== b.s ? a.s - b.s : a.r - b.r); }
  function deal() {
    const d = buildDeck();
    hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) hands[i % 4].push(d[i]);
  }
  function setupLeader() {
    trick = []; heartsBroken = false; firstTrick = true;
    for (let p = 0; p < 4; p++) if (hands[p].some(c => c.s === 3 && c.r === 2)) { leader = p; break; }
    turn = leader;
  }
  function newGame() { scores = [0, 0, 0, 0]; round = 0; moon = false; startRound(); }
  function startRound() {
    deal();
    passDir = ['left', 'right', 'across', 'hold'][round % 4];
    selected = []; trick = []; roundPts = [0, 0, 0, 0]; msg = ''; moon = false;
    for (let i = 0; i < 4; i++) sortHand(hands[i]);
    if (passDir === 'hold') { setupLeader(); phase = 'play'; if (turn !== 0) delay = 0.8; }
    else phase = 'pass';
  }

  // ── 合法出牌 ──
  function legalMoves(hand, tr, first) {
    const led = tr.length ? tr[0].card.s : null;
    if (led === null) {
      if (first) return hand.filter(c => c.s === 3 && c.r === 2);
      if (!heartsBroken) { const nh = hand.filter(c => c.s !== 1); if (nh.length) return nh; }
      return hand.slice();
    }
    if (hand.some(c => c.s === led)) return hand.filter(c => c.s === led);
    if (first) { const safe = hand.filter(c => c.s !== 1 && !QS(c)); if (safe.length) return safe; }
    return hand.slice();
  }
  // ── AI ──
  function aiPick(p, tr, first) {
    const hand = hands[p];
    const legal = legalMoves(hand, tr, first);
    if (!legal.length) return hand[0];
    if (tr.length === 0) {
      let cand = legal.slice().sort((a, b) => a.r - b.r);
      const noQ = cand.filter(c => !QS(c)); if (noQ.length) cand = noQ;
      return cand[0];
    }
    const ledSuit = tr[0].card.s;
    if (hand.some(c => c.s === ledSuit)) return legal.slice().sort((a, b) => a.r - b.r)[0];
    const q = legal.find(QS); if (q) return q;
    const hs = legal.filter(c => c.s === 1).sort((a, b) => b.r - a.r); if (hs.length) return hs[0];
    return legal.slice().sort((a, b) => a.r - b.r)[0];
  }
  function aiPass(hand) {
    const danger = c => QS(c) ? 100 : (c.s === 0 && c.r === 13) ? 70 : (c.s === 0 && c.r === 14) ? 65 : (c.s === 1 ? 30 + c.r : c.r);
    return hand.slice().sort((a, b) => danger(b) - danger(a)).slice(0, 3);
  }
  function doPass() {
    const st = step[passDir] || 1;
    const srcOf = p => (p - st + 4) % 4;
    const giving = [selected.slice(), null, null, null];
    for (let p = 1; p < 4; p++) giving[p] = aiPass(hands[p]);
    const nh = [[], [], [], []];
    for (let p = 0; p < 4; p++) nh[p] = hands[p].filter(c => !giving[p].includes(c)).concat(giving[srcOf(p)]);
    hands = nh;
    for (let i = 0; i < 4; i++) sortHand(hands[i]);
    selected = []; setupLeader(); phase = 'play';
    if (turn !== 0) delay = 0.8;
  }
  function playCard(p, card) {
    const i = hands[p].indexOf(card); if (i < 0) return;
    hands[p].splice(i, 1);
    if (card.s === 1) heartsBroken = true;
    trick.push({ p, card });
    if (trick.length === 4) resolveTrick();
    else { turn = (turn + 1) % 4; if (turn !== 0) delay = 0.8; }
  }
  function resolveTrick() {
    const led = trick[0].card.s;
    let best = trick[0];
    for (const t of trick) if (t.card.s === led && t.card.r > best.card.r) best = t;
    let pts = 0;
    for (const t of trick) { if (t.card.s === 1) pts++; if (QS(t.card)) pts += 13; }
    roundPts[best.p] += pts; leader = best.p;
    phase = 'trickDone'; delay = 1.5;
  }
  function endRound() {
    const mo = roundPts.findIndex(v => v === 26);
    if (mo >= 0) { for (let i = 0; i < 4; i++) scores[i] += (i === mo ? 0 : 26); moon = true; }
    else for (let i = 0; i < 4; i++) scores[i] += roundPts[i];
    if (scores.some(s => s >= 100)) phase = 'gameOver'; else phase = 'roundEnd';
  }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.clientX != null ? e.clientX : e.touches[0].clientX) - r.left;
    const cy = (e.clientY != null ? e.clientY : e.touches[0].clientY) - r.top;
    return { x: cx * (W / r.width), y: cy * (H / r.height) };
  }
  function inRect(p, b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
  function handLayout() {
    const n = hands[0].length;
    const sp = Math.min(32, (W - 60) / Math.max(1, n));
    const total = (n - 1) * sp;
    return { sp, startX: (W - total) / 2 - 26, y: H - 92 };
  }
  function handCardAt(p) {
    const { sp, startX, y } = handLayout();
    for (let i = hands[0].length - 1; i >= 0; i--) {
      const x = startX + i * sp;
      const sel = selected.includes(hands[0][i]);
      const yy = y - (sel ? 16 : 0);
      if (p.x >= x && p.x <= x + 52 && p.y >= yy && p.y <= yy + 74) return hands[0][i];
    }
    return null;
  }
  function handleClick(p) {
    if (phase === 'pass') {
      if (passDir === 'hold') return;
      if (selected.length === 3 && inRect(p, passBtn)) { doPass(); return; }
      const c = handCardAt(p);
      if (c) { const k = selected.indexOf(c); if (k >= 0) selected.splice(k, 1); else if (selected.length < 3) selected.push(c); }
      return;
    }
    if (phase === 'play' && turn === 0) {
      const c = handCardAt(p); if (!c) return;
      const legal = legalMoves(hands[0], trick, firstTrick);
      if (legal.includes(c)) playCard(0, c);
      return;
    }
    if (phase === 'roundEnd') { if (inRect(p, nextBtn)) { round++; startRound(); } return; }
    if (phase === 'gameOver') { if (inRect(p, restartBtn)) newGame(); return; }
  }
  canvas.addEventListener('mousedown', e => handleClick(pointer(e)));
  canvas.addEventListener('touchstart', e => { e.preventDefault(); handleClick(pointer(e)); }, { passive: false });

  function update(dt) {
    if (phase === 'play' && turn !== 0) {
      delay -= dt;
      if (delay <= 0) playCard(turn, aiPick(turn, trick, firstTrick));
    } else if (phase === 'trickDone') {
      delay -= dt;
      if (delay <= 0) {
        trick = []; firstTrick = false;
        if (!hands[0].length) endRound();
        else { turn = leader; phase = 'play'; if (turn !== 0) delay = 0.8; }
      }
    }
  }

  // ── 绘制 ──
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function back(x, y, w, h) {
    roundRect(x, y, w, h, Math.max(2, w * 0.08));
    ctx.fillStyle = '#2b5fbf'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    for (let k = -h; k < w; k += 6) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); ctx.stroke(); }
    ctx.restore();
    roundRect(x, y, w, h, Math.max(2, w * 0.08)); ctx.strokeStyle = '#dfe8ff'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  function face(x, y, w, h, card) {
    roundRect(x, y, w, h, Math.max(2, w * 0.08));
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 1; ctx.stroke();
    const fs = w * 0.34;
    ctx.fillStyle = color(card); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold ' + fs + 'px Tahoma'; ctx.fillText(LABEL[card.r], x + w * 0.10, y + h * 0.06);
    ctx.font = (fs * 0.8) + 'px Tahoma'; ctx.fillText(SUITS[card.s], x + w * 0.12, y + h * 0.06 + fs * 0.95);
    ctx.font = (w * 0.62) + 'px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(SUITS[card.s], x + w / 2, y + h * 0.58);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  const playPos = p => [[320, 300], [466, 248], [320, 196], [174, 248]][p];

  function drawOpponents() {
    // 北：顶部一排
    let n = hands[2].length;
    if (n) { const w = 30, h = 44, sp = Math.min(18, (300) / Math.max(1, n)); const total = (n - 1) * sp; const sx = 320 - total / 2 - w / 2; for (let i = 0; i < n; i++) back(sx + i * sp, 8, w, h); }
    // 西：左列
    n = hands[3].length;
    if (n) { const w = 30, h = 44, sp = Math.min(18, (240) / Math.max(1, n)); const total = (n - 1) * sp; const sy = 248 - total / 2 - h / 2; for (let i = 0; i < n; i++) back(8, sy + i * sp, w, h); }
    // 东：右列
    n = hands[1].length;
    if (n) { const w = 30, h = 44, sp = Math.min(18, (240) / Math.max(1, n)); const total = (n - 1) * sp; const sy = 248 - total / 2 - h / 2; for (let i = 0; i < n; i++) back(W - 38, sy + i * sp, w, h); }
  }
  function drawHand() {
    const { sp, startX, y } = handLayout();
    for (let i = 0; i < hands[0].length; i++) {
      const c = hands[0][i];
      const sel = selected.includes(c);
      face(startX + i * sp, y - (sel ? 16 : 0), 52, 74, c);
    }
  }
  function drawPlays() {
    const [w, h] = [50, 72];
    for (const t of trick) { const [px, py] = playPos(t.p); face(px - w / 2, py - h / 2, w, h, t.card); }
  }
  function scoreText(p) { return NAMES[p] + ' ' + scores[p] + (phase !== 'gameOver' ? '（+' + roundPts[p] + '）' : ''); }
  function drawScores() {
    ctx.font = '13px Tahoma,"Microsoft YaHei",sans-serif'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.fillText(scoreText(2), 320, 20);
    ctx.textAlign = 'left'; ctx.fillText(scoreText(3), 10, 232); ctx.fillText(scoreText(0), 10, H - 8);
    ctx.textAlign = 'right'; ctx.fillText(scoreText(1), W - 10, 232);
    ctx.textAlign = 'left';
  }
  function button(b, label) {
    roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fillStyle = '#2f6bd0'; ctx.fill(); ctx.strokeStyle = '#bcd2ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '15px Tahoma,"Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function centerMsg(lines, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = color || '#ffe27a'; ctx.font = 'bold 22px Tahoma,"Microsoft YaHei",sans-serif';
    lines.forEach((t, i) => { ctx.fillStyle = i === 0 ? (color || '#ffe27a') : '#fff'; ctx.font = i === 0 ? 'bold 22px Tahoma,"Microsoft YaHei",sans-serif' : '15px Tahoma,"Microsoft YaHei",sans-serif'; ctx.fillText(t, W / 2, H / 2 - 60 + i * 28); });
    ctx.textAlign = 'left';
  }

  function render() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e7a36'); g.addColorStop(1, '#0a5c27');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    drawOpponents();
    drawPlays();
    drawHand();
    drawScores();

    // 状态条
    ctx.font = '13px Tahoma,"Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = heartsBroken ? '#ff9ec4' : '#cfe6ff';
    ctx.fillText(heartsBroken ? '♥ 红心已破' : '♥ 红心未破', W / 2, H / 2 - 4);
    ctx.textAlign = 'left';

    if (phase === 'pass') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 150, W, 130);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe27a'; ctx.font = 'bold 20px Tahoma,"Microsoft YaHei",sans-serif';
      ctx.fillText('选 3 张牌传给' + ({ left: '左家（东）', right: '右家（西）', across: '对家（北）' }[passDir] || ''), W / 2, 185);
      ctx.fillStyle = '#fff'; ctx.font = '14px Tahoma,"Microsoft YaHei",sans-serif';
      ctx.fillText('已选 ' + selected.length + ' / 3 —— 点自己的牌选择', W / 2, 212);
      ctx.textAlign = 'left';
      if (selected.length === 3) button(passBtn, '传球');
    } else if (phase === 'play') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '14px Tahoma,"Microsoft YaHei",sans-serif';
      ctx.fillText(turn === 0 ? '轮到你出牌' : NAMES[turn] + '家思考中…', W / 2, H / 2 + 24);
      ctx.textAlign = 'left';
    } else if (phase === 'roundEnd') {
      centerMsg(['第 ' + (round + 1) + ' 局结束' + (moon ? '（射月！）' : ''), '你本局 +' + roundPts[0] + ' 分', '当前总分：你 ' + scores[0] + ' / 东 ' + scores[1] + ' / 北 ' + scores[2] + ' / 西 ' + scores[3]], moon ? '#ff9ec4' : null);
      button(nextBtn, '下一局');
    } else if (phase === 'gameOver') {
      const best = Math.min(...scores);
      const win = scores[0] === best;
      centerMsg([win ? '你赢了！' : '本局结束', '总分：你 ' + scores[0] + ' · 东 ' + scores[1] + ' · 北 ' + scores[2] + ' · 西 ' + scores[3], '（分数最低者获胜）'], win ? '#8cff9e' : '#ffe27a');
      button(restartBtn, '再来一局');
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); render();
  }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  window.addEventListener('unload', stopLoop);
  newGame(); last = performance.now(); loop(last);
})();
