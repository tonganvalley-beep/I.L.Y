// 《I.L.Y.》序章 · 横版步行模式（场景07 隧道）
// 契约：mountWalk({stage, node, state, assets, go, notify})
//   node.walk 配置见序章节点。预留美术：背景图 / 基生行走图 / 三个调查点标识。
(() => {
'use strict';
const { el, button } = ILY;

function getFlags(state) {
  state.flags = state.flags || {};
  state.flags.tunnel = state.flags.tunnel || [];
  state.flags.TUNNEL_CHECK_COUNT = state.flags.TUNNEL_CHECK_COUNT || 0;
  state.flags.achievements = state.flags.achievements || [];
  return state.flags;
}

function mountWalk({ stage, node, state, assets, go, notify }) {
  const cfg = node.walk || {};
  const F = getFlags(state);
  const length = cfg.length || 2400;
  const exitX = cfg.exitX || length - 200;
  const speed = cfg.speed || 180;
  const hotspots = (cfg.hotspots || []).map(h => ({ ...h, done: F.tunnel.includes(h.id) }));
  let x = cfg.playerStartX || 60;
  let moving = 0;            // -1 左 / 0 / 1 右
  let exiting = false;

  const bg = assets.image(cfg.bg);
  stage.style.backgroundImage = bg ? `url("${bg}")` : '';
  stage.style.backgroundSize = 'cover';
  stage.style.backgroundPosition = 'center';

  const wrap = el('div', 'walk');
  const canvas = el('canvas', 'walk-canvas');
  const hud = el('div', 'walk-hud');
  const prompt = el('div', 'walk-prompt', '');
  const ctrl = el('div', 'walk-ctrl');
  const left = button(ILY.t('walk.left'), () => { moving = -1; });
  const right = button(ILY.t('walk.right'), () => { moving = 1; });
  const inv = button(ILY.t('walk.investigate'), () => investigate());
  ctrl.append(left, right, inv);
  wrap.append(canvas, hud, prompt, ctrl);
  stage.append(wrap);
  /* 切换语言后更新按钮文案（HUD/提示语在 draw 循环里逐帧重建，自动跟随） */
  const onLang = () => {
    left.textContent = ILY.t('walk.left');
    right.textContent = ILY.t('walk.right');
    inv.textContent = ILY.t('walk.investigate');
  };
  window.addEventListener('ily:langchange', onLang);

  const ctx = canvas.getContext('2d');
  function resize() {
    const r = stage.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
  }
  resize();
  window.addEventListener('resize', resize);

  const playerImg = new Image();
  const playerSource = assets.image(cfg.player || 'kio-walk');
  if (playerSource) playerImg.src = playerSource;

  // 隧道小人改用光标 UI 精灵（sign&log/photo&video）：站立正面 + 左右各两帧走路动画
  const SPRITE_DIR = '../sign&log/photo&video/';
  const sprites = {
    idle: [SPRITE_DIR + 'cursor-hero-front.png'],
    left: [SPRITE_DIR + 'cursor-walk-left-1.png', SPRITE_DIR + 'cursor-walk-left-2.png'],
    right: [SPRITE_DIR + 'cursor-walk-right-1.png', SPRITE_DIR + 'cursor-walk-right-2.png']
  };
  const spriteImgs = { idle: [], left: [], right: [] };
  for (const key of Object.keys(sprites)) {
    spriteImgs[key] = sprites[key].map(src => { const img = new Image(); img.src = src; return img; });
  }
  const SPRITE_SIZE = 104;       // 画布上的绘制尺寸（原图 48×48，放大显示）
  let walkAnimTime = 0;

  function nearest() {
    let best = null, bd = 70;
    for (const h of hotspots) {
      if (h.done) continue;
      const d = Math.abs(h.x - x);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  function investigate() {
    const h = nearest();
    if (!h) return;
    h.done = true;
    if (!F.tunnel.includes(h.id)) { F.tunnel.push(h.id); F.TUNNEL_CHECK_COUNT++; }
    notify(h.text || h.label);
    if (F.TUNNEL_CHECK_COUNT >= 3) {
      if (!F.achievements.includes('tunnel-end')) { F.achievements.push('tunnel-end'); notify(ILY.t('achieve.unlocked', { label: ILY.t('achieve.tunnelEnd') })); }
    }
  }

  function onKey(e) {
    if (document.querySelector('dialog[open]') || e.target.closest('button, a, input')) return;
    if (e.key === 'ArrowRight') { moving = 1; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { moving = -1; e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { if (nearest()) investigate(); e.preventDefault(); }
  }
  function onKeyUp(e) { if (e.key === 'ArrowRight' && moving === 1) moving = 0; if (e.key === 'ArrowLeft' && moving === -1) moving = 0; }

  let raf, exitTimer;
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.querySelector('dialog[open]') || document.hidden) moving = 0;
    if (!exiting) {
      x = Math.max(0, Math.min(length, x + moving * speed * dt));
      if (moving !== 0) walkAnimTime += dt; else walkAnimTime = 0;
      if (x >= exitX) { exiting = true; notify(ILY.t('walk.exitNotify')); exitTimer = setTimeout(() => go(cfg.exitNext), 900); }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // 摄像机：让玩家保持在画面 32% 处
    const camX = Math.max(0, Math.min(length - W, x - W * 0.32));
    // 地面线
    const ground = H * 0.78;
    ctx.fillStyle = 'rgba(20,30,45,0.55)';
    ctx.fillRect(0, ground, W, H - ground);
    // 调查点
    for (const h of hotspots) {
      const sx = h.x - camX;
      if (sx < -40 || sx > W + 40) continue;
      ctx.save();
      ctx.globalAlpha = h.done ? 0.35 : 0.9;
      ctx.fillStyle = h.done ? '#5b7' : '#e7c479';
      ctx.beginPath(); ctx.arc(sx, ground - 60, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cdd'; ctx.font = '13px Zpix, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(h.done ? '✓' : '?', sx, ground - 56);
      ctx.restore();
    }
    // 玩家：光标 UI 精灵，移动时播放两帧走路动画，静止显示正面
    const px = x - camX;
    ctx.save();
    ctx.imageSmoothingEnabled = false;      // 像素风放大保持锐利
    const dir = moving < 0 ? 'left' : moving > 0 ? 'right' : 'idle';
    const frames = spriteImgs[dir];
    const frame = frames[moving !== 0 ? Math.floor(walkAnimTime / 0.22) % frames.length : 0];
    if (frame && frame.complete && frame.naturalWidth) {
      ctx.drawImage(frame, px - SPRITE_SIZE / 2, ground - SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE);
    } else if (playerImg.complete && playerImg.naturalWidth) {
      ctx.drawImage(playerImg, px - 18, ground - 70, 36, 70);
    }
    ctx.restore();
    // 出口提示
    const ex = exitX - camX;
    if (ex > 0 && ex < W) { ctx.fillStyle = 'rgba(180,210,255,0.8)'; ctx.font = '12px Zpix, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ILY.t('walk.exitLabel'), ex, ground - 80); }
    // HUD
    hud.textContent = ILY.t('walk.hud', { pct: Math.round((x / length) * 100), done: F.TUNNEL_CHECK_COUNT, total: hotspots.length });
    const near = nearest();
    prompt.textContent = near ? ILY.t('walk.promptSpot', { label: near.label }) : (exiting ? '' : ILY.t('walk.promptGo'));
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf); clearTimeout(exitTimer);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', resize);
    window.removeEventListener('ily:langchange', onLang);
    stage.style.backgroundImage = '';
  };
}

Object.assign(ILY, { mountWalk });
})();
