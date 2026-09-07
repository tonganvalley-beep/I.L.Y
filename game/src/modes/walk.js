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
  const left = button('◀ 左', () => { moving = -1; });
  const right = button('右 ▶', () => { moving = 1; });
  const inv = button('调查 (空格)', () => investigate());
  ctrl.append(left, right, inv);
  wrap.append(canvas, hud, prompt, ctrl);
  stage.append(wrap);

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
      if (!F.achievements.includes('tunnel-end')) { F.achievements.push('tunnel-end'); notify('成就解锁：隧道尽头'); }
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
      if (x >= exitX) { exiting = true; notify('你走出了隧道，眼前是月光下的海岸。'); exitTimer = setTimeout(() => go(cfg.exitNext), 900); }
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
    // 玩家
    const px = x - camX;
    ctx.save();
    if (playerImg.complete && playerImg.naturalWidth) ctx.drawImage(playerImg, px - 18, ground - 70, 36, 70);
    ctx.restore();
    // 出口提示
    const ex = exitX - camX;
    if (ex > 0 && ex < W) { ctx.fillStyle = 'rgba(180,210,255,0.8)'; ctx.font = '12px Zpix, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('出口 →', ex, ground - 80); }
    // HUD
    hud.textContent = `隧道 ${Math.round((x / length) * 100)}%  ·  调查 ${F.TUNNEL_CHECK_COUNT}/${hotspots.length}`;
    const near = nearest();
    prompt.textContent = near ? `〔${near.label}〕按空格调查` : (exiting ? '' : '按住 → 向海岸走去');
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf); clearTimeout(exitTimer);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', resize);
    stage.style.backgroundImage = '';
  };
}

Object.assign(ILY, { mountWalk });
})();
