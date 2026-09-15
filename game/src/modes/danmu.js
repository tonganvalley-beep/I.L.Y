// Adapter only: patterns, physics, collision and rendering come from danmutest/game.js.
(() => {
'use strict';
ILY.mountDanmu = function({stage,level,node,go}) {
  const {el,button}=ILY;
  const panel=el('section','mode-panel danmu-panel'),arena=el('div','danmu-arena');
  const canvas=el('canvas');canvas.width=640;canvas.height=480;canvas.tabIndex=0;canvas.setAttribute('aria-label','红心弹幕教学：方向键移动，Shift 慢速，P 暂停');
  const hud=el('div','danmu-hud');
  function field(id,label){const row=el('span','',label),value=el('b');value.dataset.danmu=id;row.append(value);hud.append(row);return value;}
  const fill=field('hpFill','');fill.hidden=true;
  field('hpText','HP ');field('wave','波次 ');field('count','弹幕 ');field('time','剩余秒数 ');
  for(const id of ['fps','lock'])field(id,'').hidden=true;
  const overlay=el('section','danmu-overlay show');overlay.dataset.danmu='overlay';
  const toggle=button('开始关卡',()=>{if(!started){started=true;engine.start();}else engine.setPaused(!engine.getSnapshot().paused);canvas.focus({preventScroll:true});});
  const skip=button('自动演出 · 结束练习',()=>go(node.next));
  panel.append(el('h1','',level.name));arena.append(canvas,hud,overlay);panel.append(arena,toggle,skip);stage.append(panel);
  let started=false;
  function instructions(){overlay.replaceChildren(el('h2','','弹幕教学'),el('p','','红心中的白点是判定中心。绿色弹幕可以回血；激光虚线是预警，亮起后要避开。'),el('p','',`方向键 / WASD 移动 · Shift 慢速 · P 暂停 · R 重试。坚持 ${level.duration} 秒后继续剧情。`));}
  instructions();
  const engine=window.ILYDanmu.create({canvas,root:panel,duration:level.duration,
    blocked:()=>document.hidden||!!document.querySelector('dialog[open]'),
    onState:({paused,gameOver})=>{toggle.textContent=paused?'继续关卡':'暂停';if(!gameOver){toggle.disabled=false;if(paused){overlay.replaceChildren(el('h2','','已暂停'));overlay.classList.add('show');}else overlay.classList.remove('show');}},
    onFinish:won=>{
      toggle.disabled=true;overlay.replaceChildren(el('h2','',won?'练习完成':'再试一次？'),el('p','',won?'基生放下手柄，转头看向“爱理”。':'练习失败不会影响剧情。'));
      if(!won)overlay.append(button('重新练习',()=>{engine.reset();canvas.focus({preventScroll:true});}));
      overlay.append(button('继续剧情',()=>go(node.next)));overlay.classList.add('show');
    }
  });
  function pointer(e){const r=canvas.getBoundingClientRect();engine.setTarget({x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*480/r.height});}
  const down=e=>{if(e.button!==0||document.querySelector('dialog[open]'))return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer(e);};
  const move=e=>{if(canvas.hasPointerCapture(e.pointerId))pointer(e);};
  const up=()=>engine.setTarget(null);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  return()=>{engine.destroy();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
};
})();
