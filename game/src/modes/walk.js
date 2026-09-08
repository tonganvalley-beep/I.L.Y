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
  /* 操作改为键盘 A/D 移动（松开即停），不再提供左右按钮；调查仍可点按钮或按空格 */
  const inv = button(ILY.t('walk.investigate'), () => investigate());
  ctrl.append(inv);
  /* 交互弹窗：调查点文字用大面板展示，打开时人物背身面向物件 */
  const dialog = el('div', 'walk-dialog');
  dialog.hidden = true;
  const dlgTitle = el('h2', 'walk-dialog-title');
  const dlgText = el('p', 'walk-dialog-text');
  const dlgBtn = button('', () => closeDialog());
  dialog.append(dlgTitle, dlgText, dlgBtn);
  wrap.append(canvas, hud, prompt, dialog, ctrl);
  stage.append(wrap);
  let facingBack = false;      // 交互中背身（面向调查物件）
  /* 切换语言后更新按钮文案（HUD/提示语在 draw 循环里逐帧重建，自动跟随） */
  const onLang = () => {
    inv.textContent = ILY.t('walk.investigate');
    dlgBtn.textContent = ILY.t('walk.dialogContinue');
    if (!dialog.hidden) dlgTitle.textContent = dialog.dataset.title || '';
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

  // 隧道小人改用光标 UI 精灵（sign&log/photo&video）：站立正面 / 背身 + 左右各两帧走路动画
  const SPRITE_DIR = '../sign&log/photo&video/';
  const sprites = {
    idle: [SPRITE_DIR + 'cursor-hero-front.png'],
    back: [SPRITE_DIR + 'cursor-hero-back.png'],
    left: [SPRITE_DIR + 'cursor-walk-left-1.png', SPRITE_DIR + 'cursor-walk-left-2.png'],
    right: [SPRITE_DIR + 'cursor-walk-right-1.png', SPRITE_DIR + 'cursor-walk-right-2.png']
  };
  const spriteImgs = { idle: [], back: [], left: [], right: [] };
  for (const key of Object.keys(sprites)) {
    spriteImgs[key] = sprites[key].map(src => { const img = new Image(); img.src = src; return img; });
  }
  const SPRITE_SIZE = 168;       // 画布上的绘制尺寸（原图 48×48，放大显示）
  let walkAnimTime = 0;

  // 隧道调查点像素贴图（game/assets/images/ui/）：贩卖机立地面，海报 / 墙缝贴在半墙上
  const HOTSPOT_ART = {
    vending: { src: assets.image('vending'),      w: 158, h: 237, wall: 0  }, // 故障自动贩卖机
    poster:  { src: assets.image('coast-poster'), w: 158, h: 210, wall: 56 }, // 褪色海岸海报（挂墙）
    crack:   { src: assets.image('wall-crack'),   w: 105, h: 210, wall: 16 }  // 隧道墙缝（挂墙偏下）
  };
  for (const k of Object.keys(HOTSPOT_ART)) {
    const a = HOTSPOT_ART[k];
    if (a.src) { a.img = new Image(); a.img.src = a.src; }
  }
  // 像素墙裙：地面线以上半墙，可平铺 tile，随摄像机滚动
  const WALL_H = 168;
  const wallTile = new Image();
  const wallSrc = assets.image('tunnel-wall-tile');
  if (wallSrc) wallTile.src = wallSrc;

  function nearest() {
    let best = null, bd = 110;
    for (const h of hotspots) {
      if (h.done) continue;
      const d = Math.abs(h.x - x);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  function openDialog(title, text) {
    dialog.dataset.title = title;
    dlgTitle.textContent = title;
    dlgText.textContent = text;
    dlgBtn.textContent = ILY.t('walk.dialogContinue');
    dialog.hidden = false;
    facingBack = true;
    moving = 0;
  }
  function closeDialog() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    facingBack = false;
  }

  function investigate() {
    if (!dialog.hidden) { closeDialog(); return; }
    const h = nearest();
    if (!h) return;
    h.done = true;
    if (!F.tunnel.includes(h.id)) { F.tunnel.push(h.id); F.TUNNEL_CHECK_COUNT++; }
    openDialog(h.label, h.text || h.label);
    if (F.TUNNEL_CHECK_COUNT >= 3) {
      if (!F.achievements.includes('tunnel-end')) { F.achievements.push('tunnel-end'); notify(ILY.t('achieve.unlocked', { label: ILY.t('achieve.tunnelEnd') })); }
    }
  }

  /* 操作：A/D（及方向键）移动，松开即停；空格/回车调查或关闭交互弹窗 */
  function onKey(e) {
    if (document.querySelector('dialog[open]') || e.target.closest('button, a, input')) return;
    const key = e.key.toLowerCase();
    if (!dialog.hidden) {
      if (e.key === ' ' || e.key === 'Enter') { closeDialog(); e.preventDefault(); }
      return;
    }
    if (key === 'd' || e.key === 'ArrowRight') { moving = 1; e.preventDefault(); }
    else if (key === 'a' || e.key === 'ArrowLeft') { moving = -1; e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { if (nearest()) investigate(); e.preventDefault(); }
  }
  function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if ((key === 'd' || e.key === 'ArrowRight') && moving === 1) moving = 0;
    if ((key === 'a' || e.key === 'ArrowLeft') && moving === -1) moving = 0;
  }

  let raf, exitTimer;
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.querySelector('dialog[open]') || document.hidden || !dialog.hidden) moving = 0;
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
    // 半墙（像素墙裙）：地面线以上 WALL_H，随摄像机平铺滚动
    if (wallTile.complete && wallTile.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const offX = -(camX % WALL_H);
      for (let tx = offX - WALL_H; tx < W + WALL_H; tx += WALL_H) {
        ctx.drawImage(wallTile, tx, ground - WALL_H, WALL_H, WALL_H);
      }
      // 隧道氛围：墙裙顶部压暗渐变，融入背景的浓黑（入口/出口附近压暗更弱，显得更亮）
      const grad = ctx.createLinearGradient(0, ground - WALL_H, 0, ground);
      grad.addColorStop(0, 'rgba(8,10,18,0.45)');
      grad.addColorStop(1, 'rgba(8,10,18,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, ground - WALL_H, W, WALL_H);
      ctx.restore();
    }
    // 调查点：绘制对应像素贴图 + 状态标记
    for (const h of hotspots) {
      const sx = h.x - camX;
      if (sx < -160 || sx > W + 160) continue;
      const art = HOTSPOT_ART[h.id];
      ctx.save();
      ctx.globalAlpha = h.done ? 0.35 : 0.95;
      ctx.imageSmoothingEnabled = false;    // 像素风放大保持锐利
      let markerY = ground - 60;
      if (art && art.img && art.img.complete && art.img.naturalWidth) {
        const ay = ground - art.h - art.wall;
        ctx.drawImage(art.img, sx - art.w / 2, ay, art.w, art.h);
        markerY = ay - 14;
      }
      ctx.fillStyle = h.done ? '#5b7' : '#e7c479';
      ctx.beginPath(); ctx.arc(sx, markerY, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cdd'; ctx.font = '13px Zpix, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(h.done ? '✓' : '?', sx, markerY + 4);
      ctx.restore();
    }
    // 玩家：光标 UI 精灵，移动时播放两帧走路动画；交互弹窗打开时背身面向物件
    const px = x - camX;
    ctx.save();
    ctx.imageSmoothingEnabled = false;      // 像素风放大保持锐利
    const dir = facingBack ? 'back' : moving < 0 ? 'left' : moving > 0 ? 'right' : 'idle';
    const frames = spriteImgs[dir];
    const frame = frames[moving !== 0 ? Math.floor(walkAnimTime / 0.22) % frames.length : 0];
    if (frame && frame.complete && frame.naturalWidth) {
      ctx.drawImage(frame, px - SPRITE_SIZE / 2, ground - SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE);
    } else if (playerImg.complete && playerImg.naturalWidth) {
      ctx.drawImage(playerImg, px - 18, ground - 70, 36, 70);
    }
    ctx.restore();
    // 隧道口灯光：入口（路灯）与出口（月光）位置更亮，暖光洗在墙与人物之上
    for (const lx of [0, length]) {
      const sx = lx - camX;
      if (sx < -420 || sx > W + 420) continue;
      const glow = ctx.createRadialGradient(sx, ground - 110, 20, sx, ground - 110, 420);
      glow.addColorStop(0, 'rgba(255,240,200,0.42)');
      glow.addColorStop(0.45, 'rgba(255,240,200,0.16)');
      glow.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 420, 0, 840, H);
    }
    // 出口提示
    const ex = exitX - camX;
    if (ex > 0 && ex < W) { ctx.fillStyle = 'rgba(180,210,255,0.8)'; ctx.font = '12px Zpix, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ILY.t('walk.exitLabel'), ex, ground - 80); }
    // HUD
    hud.textContent = ILY.t('walk.hud', { pct: Math.round((x / length) * 100), done: F.TUNNEL_CHECK_COUNT, total: hotspots.length });
    const near = nearest();
    prompt.textContent = !dialog.hidden ? '' : near ? ILY.t('walk.promptSpot', { label: near.label }) : (exiting ? '' : ILY.t('walk.promptGo'));
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
