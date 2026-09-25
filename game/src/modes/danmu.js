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
    releasePad();                       // 引擎已清空按键，手柄按下态同步复位
  });
  const skip=button('跳过练习 · 继续剧情',leave);
  const blueEntry=button('进入蓝心教学',()=>prepare(true));blueEntry.hidden=!level.blueTutorial;

  // ── 虚拟手柄：只在手机 / 平板上出现（电脑端有键盘，不需要）。 ──
  //    按下时把键码注入引擎的同一个 keys 集合，方向键 / Shift 慢速 / ↑ 跳跃
  //    全部复用键盘那套逻辑，引擎一行都不用为手柄分叉。
  const padOn=ILY.device?.phone?.()===true;
  const padButtons=[];
  const padBtn=(cls,label,title,code)=>{
    const b=button(label,()=>{});
    b.className='pad-btn '+cls;b.setAttribute('aria-label',title);
    b.addEventListener('contextmenu',e=>e.preventDefault());
    b.addEventListener('pointerdown',e=>{
      if(disposed||blocked()||b.disabled)return;   // disabled 的键即使收到事件也不注入按键
      e.preventDefault();
      b.classList.add('is-down');
      try{b.setPointerCapture(e.pointerId);}catch{}
      engine?.setVirtual(code,true);
    });
    const up=()=>{b.classList.remove('is-down');engine?.setVirtual(code,false);};
    for(const t of ['pointerup','pointercancel','lostpointercapture','blur'])b.addEventListener(t,up);
    padButtons.push(b);return b;
  };
  const padGrid=el('div','pad-grid'),padAct=el('div','pad-act'),pad=el('div','danmu-pad');
  // 跳跃不单设按钮：蓝心时 ▲ 就是跳跃键（↑ / W 本来就是引擎里跳跃的键码）。
  // 两种课程的按键布局完全一致，只在蓝心把用不到的 ▼ 置灰禁用，不做显隐切换。
  const padUp=padBtn('pad-up','▲','上键；蓝心时是跳跃，按住跳得更高','ArrowUp');
  const padLeft=padBtn('pad-left','◀','向左','ArrowLeft');
  const padDown=padBtn('pad-down','▼','向下；蓝心用不到，会置灰','ArrowDown');
  const padRight=padBtn('pad-right','▶','向右','ArrowRight');
  padGrid.append(padUp,padLeft,padDown,padRight);
  padAct.append(
    padBtn('pad-slow','慢速','按住进入慢速模式','ShiftLeft')
  );
  pad.append(padGrid,padAct);
  if(padOn)panel.dataset.pad='on';
  // 握把容器：竖屏是「游戏区在上、手柄在下」的一列；横屏靠 CSS 改成
  // 「方向键 | 游戏区 | 慢速」的一行（见 .danmu-stage 的 @media），把稀缺的高度让给游戏区
  const board=el('div','danmu-stage');board.append(arena,pad);
  // 暂停 / 重开时引擎会 keys.clear()，手柄的按下态必须跟着复位，否则会「卡住一直走」
  const releasePad=()=>{
    for(const b of padButtons)b.classList.remove('is-down');
    for(const c of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'])engine?.setVirtual(c,false);
  };
  arena.append(canvas,hud,overlay);
  // 按钮收进一行容器：.danmu-panel 是纵向 flex，按钮若直接做子元素会各占一行、
  // 白白吃掉约 100px 高度（游戏区会小一大截）。收成一行后主线与游戏窗口表现一致。
  const actions=el('div','danmu-actions');actions.append(toggle,blueEntry,skip);
  panel.append(title,lessonText,feedback,board,actions);stage.append(panel);

  // ── 游戏区尺寸 ──
  // 首选：CSS 容器查询。本项目的画面适配走的是容器查询体系（主线 #game-frame，
  //        游戏窗口 .danmu-stage），浏览器支持的话 cqh 直接就是「留给游戏区的高度」，
  //        宽度 = 高度×4/3，不需要任何常数，也不受浏览器地址栏影响。
  // 兜底：老浏览器不支持 container-type 时，用实测法代替 —— 面板总高减游戏区高 = 其余内容的
  //        真实高度，剩下的全给游戏区，避免退回到「视口高度减固定像素」那种猜法。
  const containerQueryOK=()=>{
    try{return typeof CSS!=='undefined'&&CSS.supports&&CSS.supports('container-type','size');}
    catch{return false;}
  };
  const inRowLayout=()=>matchMedia('(orientation:landscape)').matches;
  function fitArena(){
    if(!padOn||disposed||containerQueryOK())return;
    const aH=arena.offsetHeight,pH=panel.offsetHeight;         // 量不到（含无布局引擎的环境）就交给 CSS
    if(!aH||!pH||!stage.clientWidth)return;
    const vv=window.visualViewport;
    const viewH=(vv&&vv.height?vv.height:window.innerHeight||0)-2;
    if(!viewH)return;
    const row=inRowLayout();
    const chrome=Math.max(0,pH-aH);                            // 非游戏区内容的真实高度
    const padsW=row?(padGrid.offsetWidth||0)+(padAct.offsetWidth||0)+22:0;
    const availW=Math.max(140,stage.clientWidth-padsW-(row?4:14));
    const availH=Math.max(110,viewH-chrome-(row?4:8));
    const w=Math.max(140,Math.min(800,availW,availH*4/3));      // canvas 是 4:3
    arena.style.width=Math.round(w)+'px';
  }
  let fitTimer=0;
  const refit=()=>{clearTimeout(fitTimer);fitTimer=setTimeout(fitArena,80);};
  // 字体加载完、转屏、地址栏收放都会改变可用高度，都要重量一次
  if(padOn){
    addEventListener('resize',refit);addEventListener('orientationchange',refit);
    window.visualViewport?.addEventListener('resize',refit);
    document.fonts?.ready?.then(()=>fitArena());
  }
  function prepare(isBlue){
    if(disposed||finished)return;
    engine?.destroy();engine=null;started=false;blue=isBlue;panel.dataset.lesson=blue?'blue':'red';
    releasePad();                     // 换课程时清掉可能还按着的手柄键
    padDown.disabled=blue;            // 蓝心不能向下移动：置灰禁用，但不移除、不换位
    title.textContent=blue?'蓝心教学 · 重力与跳跃':(level.training?'红心教学 · 弹幕基础':level.name);
    canvas.setAttribute('aria-label',blue?'蓝心教学：左右移动，向上或 W 跳跃，按住跳得更高，P 暂停':'红心弹幕教学：方向键移动，Shift 慢速，P 暂停');
    lessonText.hidden=feedback.hidden=false;feedback.textContent='';
    lessonText.textContent=blue?'① 重力与跳跃　蓝心会落向地面。左右移动，按 ↑ / W 跳起，再落地。目标：完成 2 次跳跃。'
      :'① 移动与判定　方向键 / WASD 移动，Shift 慢速微调；白色小点才是真正的判定中心。目标：碰到 3 个金色光点。';
    count.hidden=blue;time.hidden=blue||!!level.training;blueEntry.hidden=blue||!level.blueTutorial;
    toggle.disabled=false;toggle.textContent=blue?'开始蓝心教学':'开始红心教学';
    // 操作提示按设备给：手机平板用虚拟手柄，电脑用键盘，触屏设备也能直接拖
    const ctrl=padOn
      ?(blue?'手机端请用下方虚拟手柄：◀ ▶ 左右移动，按住 ▲ 跳得更高（▲ 就是跳跃键）；「慢速」照常可用，▼ 在蓝心用不到、会置灰。':'手机端请用下方虚拟手柄：方向键移动，按住「慢速」微调穿缝。')
      :(blue?'触屏可直接拖动蓝心左右移动；电脑端鼠标不起作用，请用键盘。':'触屏可直接拖动红心；电脑端鼠标不起作用，请用键盘。');
    const keyHint=blue?'← / → 左右移动 · ↑ / W 跳跃（按住跳更高，松开提早落下）· P 暂停 · R 重试。'
      :'方向键 / WASD 移动 · Shift 慢速 · P 暂停 · R 重试。';
    overlay.replaceChildren(el('h2','',blue?'蓝心教学 · 重力与跳跃（5 关）':'红心教学 · 弹幕基础（8 关）'),
      el('p','',blue?'蓝心会受重力影响，不能自由上下移动。课程：重力与跳跃 → 跳过矮骨条 → 按住跳更高 → 空隙屏障 → 连续骨条。碰到不会扣血，会重试当前这一根。'
        :'按顺序把 Boss 战里出现过的元素练一遍：移动与判定 → 环形弹幕 → 骨头与追踪弹 → 绿色回血弹 → 区域预警 → 激光预警 → 花型旋转弹幕 → 综合演练。做完每一关的目标才会进入下一关。'),
      el('p','',keyHint+ctrl+(blue?'':'红心部分完成后会进入蓝心教学。')));
    overlay.classList.add('show');
    engine=window.ILYDanmu.create({canvas,root:panel,duration:level.duration,tutorial:blue?'blue':(level.training?'red':undefined),blocked,
      onLesson:({step,total,title,hint,feedback:message})=>{panel.dataset.lessonStep=String(step);panel.dataset.lessonTotal=String(total);lessonText.textContent=title+'　'+hint;feedback.textContent=message;},
      onState:({paused,gameOver})=>{
        if(!started)return;
        if(paused)releasePad();
        toggle.textContent=paused?'继续练习':'暂停';
        if(!gameOver){toggle.disabled=false;if(paused){overlay.replaceChildren(el('h2','','已暂停'));overlay.classList.add('show');}else overlay.classList.remove('show');}
      },
      onFinish:won=>{
        toggle.disabled=true;
        overlay.replaceChildren(el('h2','',won?(blue?'蓝心教学完成':'红心教学完成'):'再试一次？'),
          el('p','',won?(blue?'记住：按住跳得高，松开落得早。基生放下手柄，转头看向“爱理”。'
            :'红心部分全部练完了——接下来是蓝心：同一双手柄，换成会被重力拉扯的心。')
            :'练习失败不会影响剧情，可以从头再来一次。'));
        if(!won)overlay.append(button('重新练习',()=>{engine.reset();canvas.focus({preventScroll:true});}));
        else if(!blue&&level.blueTutorial)overlay.append(button('进入蓝心教学',()=>prepare(true)));
        if(won)overlay.append(button(blue?'重玩蓝心教学':'重玩红心教学',()=>{engine.reset();canvas.focus({preventScroll:true});}));
        overlay.append(button('继续剧情',leave));overlay.classList.add('show');
      }
    });
    fitArena();                        // 文案长度会变，量一次真实布局再定游戏区尺寸
  }
  prepare(false);
  // ★ 只有手指 / 手写笔能拖动红蓝心，鼠标一律不接管位置（电脑端纯键盘操作）。
  //   这里判 pointerType 而不是「检测是不是手机」：触摸屏笔记本上「用鼠标就键盘、
  //   用手指就拖动」，也不会把「平板外接鼠标」误判成电脑。
  const draggable=e=>e.pointerType==='touch'||e.pointerType==='pen';
  function pointer(e){const r=canvas.getBoundingClientRect();engine.setTarget({x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*480/r.height});}
  const down=e=>{
    if(e.button!==0||blocked())return;
    canvas.focus({preventScroll:true});            // 点一下也把焦点交给画布，键盘随即可用
    if(!draggable(e)){                             // 鼠标：只聚焦，并顺手提示改用键盘
      if(started)feedback.textContent=blue?'电脑端请用键盘：← / → 左右移动 · ↑ / W 跳跃（按住跳更高）。'
        :'电脑端请用键盘：方向键 / WASD 移动 · Shift 慢速。鼠标点不出反应是正常的。';
      return;
    }
    canvas.setPointerCapture(e.pointerId);pointer(e);
  };
  const move=e=>{if(draggable(e)&&canvas.hasPointerCapture(e.pointerId))pointer(e);};
  const up=()=>engine.setTarget(null);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  return()=>{disposed=true;clearTimeout(fitTimer);removeEventListener('resize',refit);removeEventListener('orientationchange',refit);
    window.visualViewport?.removeEventListener('resize',refit);engine?.destroy();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
};
})();


