// Adapter only: patterns, physics, collision and rendering come from src/engines/danmu.js.
(() => {
'use strict';
ILY.mountDanmu = function({stage,level,node,go}) {
  const {el,button}=ILY;
  const panel=el('section','mode-panel danmu-panel'),arena=el('div','danmu-arena');
  const title=el('h1','',level.name),canvas=el('canvas');
  canvas.width=640;canvas.height=480;canvas.tabIndex=0;
  const hud=el('div','danmu-hud');
  function field(id,label){const row=el('span','',label),value=el('b');value.dataset.danmu=id;row.append(value);hud.append(row);return row;}
  field('hpFill','').hidden=true;field('hpText','HP ');field('wave','进度 ');
  const count=field('count','弹幕 '),time=field('time','剩余秒数 ');
  for(const id of ['fps','lock'])field(id,'').hidden=true;
  const overlay=el('section','danmu-overlay show');overlay.dataset.danmu='overlay';
  const lessonText=el('p','danmu-lesson'),feedback=el('p','danmu-feedback');
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  let engine,started=false,blue=false,disposed=false,finished=false;
  const blocked=()=>document.hidden||!!window.ILY_HOST_PAUSED||!!document.querySelector('dialog[open]');
  const leave=()=>{if(disposed||finished)return;finished=true;engine.destroy();go(node.next);};
  const toggle=button('开始关卡',()=>{
    if(disposed||blocked())return;
    if(!started){started=true;engine.start();}else engine.setPaused(!engine.getSnapshot().paused);
    canvas.focus({preventScroll:true});
  });
  const skip=button('跳过练习 · 继续剧情',leave);
  const blueEntry=button('进入蓝心练习',()=>prepare(true));blueEntry.hidden=!level.blueTutorial;
  const jump=button('按住跳跃 ↑',()=>{});jump.hidden=true;
  jump.className='danmu-jump';jump.setAttribute('aria-label','按住跳跃，松开提早落下');
  function jumpDown(e){if(!blue||blocked())return;e.preventDefault();jump.setPointerCapture(e.pointerId);engine.setJump(true);}
  const jumpUp=()=>engine.setJump(false);
  const jumpKeyDown=e=>{if(['Space','Enter','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();engine.setJump(true);}};
  const jumpKeyUp=e=>{if(['Space','Enter','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();engine.setJump(false);}};
  jump.addEventListener('pointerdown',jumpDown);jump.addEventListener('pointerup',jumpUp);
  jump.addEventListener('pointercancel',jumpUp);jump.addEventListener('lostpointercapture',jumpUp);
  jump.addEventListener('keydown',jumpKeyDown);jump.addEventListener('keyup',jumpKeyUp);jump.addEventListener('blur',jumpUp);
  arena.append(canvas,hud,overlay);panel.append(title,lessonText,feedback,arena,toggle,jump,blueEntry,skip);stage.append(panel);
  function prepare(isBlue){
    if(disposed||finished)return;
    engine?.destroy();engine=null;started=false;blue=isBlue;panel.dataset.lesson=blue?'blue':'red';
    title.textContent=blue?'蓝心练习 · 重力与跳跃':level.name;
    canvas.setAttribute('aria-label',blue?'蓝心教学：左右移动，向上或 W 跳跃，按住跳得更高，P 暂停':'红心弹幕教学：方向键移动，Shift 慢速，P 暂停');
    lessonText.hidden=feedback.hidden=!blue;feedback.textContent='';
    lessonText.textContent=blue?'① 重力与跳跃：蓝心会落向地面，按 ↑ / W 跳起，再落地。':'';
    count.hidden=time.hidden=blue;jump.hidden=!blue;blueEntry.hidden=blue||!level.blueTutorial;
    toggle.disabled=false;toggle.textContent=blue?'开始蓝心练习':'开始关卡';
    overlay.replaceChildren(el('h2','',blue?'蓝心：先学会跳跃':'弹幕教学'),
      el('p','',blue?'蓝心会受重力影响，不能自由上下移动。← / → 或 A / D 左右移动，↑ / W 跳跃；按住跳得更高，松开提早落下。':'红心中的白点是判定中心。绿色弹幕可以回血；激光虚线是预警，亮起后要避开。'),
      el('p','',blue?'完成一次跳起落地，再越过低、高两根骨条。碰到不会扣血，会重试当前步骤。触屏可拖动左右移动，按住下方按钮跳跃。':`方向键 / WASD 移动 · Shift 慢速 · P 暂停 · R 重试。红心练习 ${level.duration} 秒，之后还有简短的蓝心练习。`));
    overlay.classList.add('show');
    engine=window.ILYDanmu.create({canvas,root:panel,duration:level.duration,tutorial:blue?'blue':undefined,blocked,
      onLesson:({step,title,hint,feedback:message})=>{panel.dataset.lessonStep=String(step);lessonText.textContent=title+'：'+hint;feedback.textContent=message;},
      onState:({paused,gameOver})=>{
        if(!started)return;
        toggle.textContent=paused?'继续练习':'暂停';
        if(!gameOver){jump.hidden=!blue;toggle.disabled=false;if(paused){overlay.replaceChildren(el('h2','','已暂停'));overlay.classList.add('show');}else overlay.classList.remove('show');}
      },
      onFinish:won=>{
        toggle.disabled=true;jump.hidden=true;
        overlay.replaceChildren(el('h2','',won?(blue?'蓝心练习完成':'红心练习完成'):'再试一次？'),
          el('p','',blue?'记住：按住跳得高，松开落得早。基生放下手柄，转头看向“爱理”。':level.blueTutorial?'下一步：让蓝心跳过地上的骨条。练习失败不会影响剧情。':'基生放下手柄，转头看向“爱理”。'));
        if(!won)overlay.append(button('重新练习',()=>{jump.hidden=!blue;engine.reset();canvas.focus({preventScroll:true});}));
        if(!blue&&level.blueTutorial)overlay.append(button('进入蓝心练习',()=>prepare(true)));
        overlay.append(button('继续剧情',leave));overlay.classList.add('show');
      }
    });
  }
  prepare(false);
  function pointer(e){const r=canvas.getBoundingClientRect();engine.setTarget({x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*480/r.height});}
  const down=e=>{if(e.button!==0||blocked())return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer(e);};
  const move=e=>{if(canvas.hasPointerCapture(e.pointerId))pointer(e);};
  const up=()=>engine.setTarget(null);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  return()=>{disposed=true;engine?.destroy();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
};
})();