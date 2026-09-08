(() => {
'use strict';
const { el, button } = ILY;

function mountBattle({stage, level, go, node}) {
  const panel = el('section', 'mode-panel');
  const hintText = el('p', 'hint', ILY.t('battle.hint', { s: level.duration }));
  panel.append(el('h1', '', level.name), hintText);
  const hud = el('div', 'battle-hud');
  const health = el('span'); const time = el('span'); hud.append(health,time);
  const canvas = el('canvas'); canvas.width = 720; canvas.height = 450;
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', ILY.t('battle.aria'));
  const ctx = canvas.getContext('2d');
  const result = el('div');
  let paused = true, done = false, disposed = false, elapsed = 0, last = 0, spawn = 0, invincible = 0, hp = level.hp, frame;
  let started = false;
  let bullets = [], target = null;
  const player = {x:360, y:390}; const keys = new Set();
  const toggleLabel = () => { toggle.textContent = ILY.t(!started ? 'battle.start' : paused ? 'battle.resume' : 'battle.pause'); };
  const toggle = button(ILY.t('battle.start'), () => { if (!done) { started = true; paused = !paused; toggleLabel(); canvas.focus(); } });
  panel.append(hud,canvas,toggle,result); stage.append(panel);
  function finish(won) {
    done = true; toggle.disabled = true; result.className = 'result';
    result.append(el('p','', ILY.t(won ? 'battle.won' : 'battle.lost')));
    result.append(button(ILY.t(won ? 'battle.continue' : 'battle.retry'), () => go(won ? node.next : null)));
  }
  /* 切换语言后更新界面文字 */
  const onLang = () => {
    hintText.textContent = ILY.t('battle.hint', { s: level.duration });
    canvas.setAttribute('aria-label', ILY.t('battle.aria'));
    if (!done) toggleLabel();
  };
  window.addEventListener('ily:langchange', onLang);
  function tick(now) {
    if (disposed) return;
    const dt = last ? Math.min((now-last)/1000,.04) : 0; last = now;
    if (!paused && !done) {
      elapsed += dt; spawn += dt; invincible = Math.max(0, invincible-dt);
      let dx = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
      let dy = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
      if (target) { dx = target.x-player.x; dy = target.y-player.y; }
      const length = Math.hypot(dx,dy);
      const speed = keys.has('shift') ? level.slowSpeed : level.playerSpeed;
      const distance = target ? Math.min(length, speed*dt) : speed*dt;
      if (length) { player.x += dx/length*distance; player.y += dy/length*distance; }
      player.x = Math.max(10,Math.min(710,player.x)); player.y = Math.max(10,Math.min(440,player.y));
      if (spawn >= level.spawnInterval) {
        spawn = 0;
        for (let i=0;i<level.bulletCount;i++) {
          const angle = Math.PI/2 + Math.sin(elapsed*1.4+i)*.5;
          bullets.push({x:(i+.5)*720/level.bulletCount,y:-8,vx:Math.cos(angle)*level.bulletSpeed,vy:Math.sin(angle)*level.bulletSpeed});
        }
      }
      for (const b of bullets) {
        b.x += b.vx*dt; b.y += b.vy*dt;
        if (!invincible && Math.hypot(b.x-player.x,b.y-player.y) < level.playerRadius+level.bulletRadius) { hp--; invincible = level.invulnerability; if (hp<=0) { finish(false); break; } }
      }
      bullets = bullets.filter(b => b.y<470 && b.x>-20 && b.x<740);
      if (!done && elapsed>=level.duration) finish(true);
    }
    ctx.fillStyle='#101c30';ctx.fillRect(0,0,720,450);
    ctx.strokeStyle='#20354c';for(let x=0;x<720;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,450);ctx.stroke();}
    ctx.fillStyle='#ef9dba'; for(const b of bullets){ctx.beginPath();ctx.arc(b.x,b.y,level.bulletRadius,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=invincible ? '#f8df92' : '#a5e5f5';ctx.beginPath();ctx.arc(player.x,player.y,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#102033';ctx.beginPath();ctx.arc(player.x,player.y,level.playerRadius,0,Math.PI*2);ctx.fill();
    health.textContent=ILY.t('battle.hp',{hp,max:level.hp});time.textContent=`${paused && !done ? ILY.t('battle.paused') : ''}${ILY.t('battle.seconds',{s:Math.max(0,level.duration-elapsed).toFixed(1)})}`;
    if (!done) frame = requestAnimationFrame(tick);
  }
  const controls = ['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','shift'];
  function keydown(e) {
    if (e.target.closest('button, a, input')) return;
    const key=e.key.toLowerCase();
    if (controls.includes(key)) {e.preventDefault();keys.add(key);}
    if (key==='p' && !e.repeat && !done) toggle.click();
  }
  const keyup=e=>keys.delete(e.key.toLowerCase());
  const pause=()=>{keys.clear();target=null;paused=true;if(!done)toggleLabel();};
  const visibility=()=>{if(document.hidden)pause();};
  function pointer(e) {const r=canvas.getBoundingClientRect();target={x:(e.clientX-r.left)*720/r.width,y:(e.clientY-r.top)*450/r.height};}
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointer(e);});
  canvas.addEventListener('pointermove',e=>{if(canvas.hasPointerCapture(e.pointerId))pointer(e);});
  canvas.addEventListener('pointerup',()=>target=null);canvas.addEventListener('pointercancel',()=>target=null);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',visibility);
  frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(frame);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('ily:langchange',onLang);};
}

Object.assign(ILY, { mountBattle });
})();
