(() => {
'use strict';
const {el,button,rpgProgress,activeRpgEvents,interactRpg,finishRpgAutomatically,moveRpg}=ILY;
function mountRpg({stage,node,state,assets,go}) {
  const p=rpgProgress(state,node.task),maps=ILY.data.maps;
  let map=maps[p.map] || maps[node.map],position,frame,last=0,disposed=false,finishedFor=0;
  let target=null,facing='front',stride=0,walking=false,messageFor=5,idle=0;
  const keys=new Set(),images=new Map(),roomScenes=new Map(),camera={x:0,y:0,scale:1,width:1,height:1};
  let trashSprite;
  const panel=el('section','rpg-panel'),canvas=el('canvas','rpg-canvas');canvas.tabIndex=0;
  canvas.setAttribute('aria-label','操控成田基生：WASD 或方向键连续移动，也可按住画面引导移动。靠近物件后按 E 调查，Esc 打开菜单。');
  const ctx=canvas.getContext('2d');
  const message=el('p','rpg-message','WASD / 方向键移动 · 按住画面引导 · E 调查 · Esc 菜单');message.setAttribute('aria-live','polite');
  const prompt=button('',()=>interact());prompt.className='rpg-interact';prompt.hidden=true;
  const menuToggle=button('☰',()=>document.querySelector('#menu-toggle').click());menuToggle.className='rpg-menu-toggle';menuToggle.setAttribute('aria-label','打开菜单');
  panel.append(canvas,message,prompt,menuToggle);stage.append(panel);document.body.classList.add('rpg-active');
  const menu=document.querySelector('#game-menu'),menuInfo=el('section','rpg-menu-info'),objective=el('p');
  const auto=button('自动完成当前探索',()=>{menu.close();completeAutomatically();});
  menuInfo.append(el('h3','','当前探索'),objective,el('p','','WASD / 方向键移动；按住画面引导；E / 空格 / Enter 调查。'),auto);menu.append(menuInfo);
  const blocked=()=>disposed || document.hidden || !!document.querySelector('dialog[open]');
  function say(text){message.textContent=text;messageFor=4;message.hidden=false;}
  function events(){return activeRpgEvents(map,node.task).filter(e=>(e.kind!=='scream' || !state.flags.G5_SCREAM) && !p.collected.includes(e.id));}
  function closest(){return events().filter(e=>Math.hypot(e.x-position.x,e.y-position.y)<=1.05).sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y))[0];}
  function refresh(){
    const count=p.collected.length;
    objective.textContent=map.name+' · '+(p.done?'目标完成':node.task==='G1'?`整理房间 ${count}/3`:node.task==='G3'?`找到手柄 ${count}/2，回电脑前开局`:node.task==='G4'?`采购：${p.choice||'尚未选择'}，到收银台结账`:node.task==='G5'?(p.collected.includes('photo')&&p.collected.includes('isopod')?'去空水槽前寻找“爱理”':'调查拍照点与大王具足虫展区'):node.text);
    const e=closest();prompt.hidden=p.done || !e;if(e)prompt.textContent='E · '+e.label;auto.hidden=p.done;
  }
  function useMap(next,arrival){
    map=next;p.map=map.id;position=state.maps[map.id] ||= {...map.spawn};if(arrival)Object.assign(position,arrival);target=null;idle=0;
    if(!p.visited.includes(map.id))p.visited.push(map.id);
    if(node.task==='G5')state.flags.G5_STAGE=map.id;
    if(map.id==='ch1-restroom'&&!state.flags.G5_SCREAM)say(interactRpg(state,node.task,{id:'scream',kind:'scream',text:'十屋：哇啊啊啊——！远处的惨叫突然中断。总觉得发生了什么……'}));
    refresh();
  }
  function completeAutomatically(){
    if(blocked()||p.done)return;finishRpgAutomatically(state,node.task);target=null;
    say(node.task==='G5'?'远处传来惨叫。手机也没了信号。基生一路寻找，终于在空水槽前看到了“爱理”。':node.task==='G4'?`买好了${p.choice}。“爱理”抱紧了购物袋。`:'基生完成了眼前的事情。');refresh();
  }
  function act(e){
    if(blocked()||p.done)return;target=null;idle=0;
    if(e.kind==='transfer'){useMap(maps[e.to],{x:e.id==='east'?2:15,y:6});canvas.focus();return;}
    say(interactRpg(state,node.task,e));
    if(p.done&&node.task==='G5'&&!state.flags.G5_SCREAM){state.flags.G5_SCREAM=true;say('远处，十屋的惨叫骤然中断。空水槽前，终于出现了熟悉的身影。');}
    refresh();canvas.focus();
  }
  function interact(){if(blocked())return;const e=closest();if(e)act(e);}
  function drawAsset(id,x,y,w,h){
    const path=assets.image(id);if(!path)return false;
    if(!images.has(path)){const img=new Image();img.src=path;images.set(path,img);}
    const img=images.get(path);if(!img.complete||!img.naturalWidth)return false;
    ctx.drawImage(img,x,y,w,h);
    return true;
  }
  function resize(){
    const r=panel.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    camera.width=Math.max(1,r.width);camera.height=Math.max(1,r.height);canvas.width=Math.round(camera.width*dpr);canvas.height=Math.round(camera.height*dpr);
  }
  function draw(){
    const t=map.tileSize||48,w=map.width*t,h=map.height*t;
    const classic=map.art.renderer==='classic-room'&&ILY.classicRoom;
    if(classic){
      Object.assign(camera,classic.cameraView(camera.width,camera.height,map,position));
    }else{
      camera.scale=Math.max(camera.width/w,camera.height/h);
      const vw=camera.width/camera.scale,vh=camera.height/camera.scale;
      camera.x=Math.max(0,Math.min(w-vw,(position.x+.5)*t-vw/2));camera.y=Math.max(0,Math.min(h-vh,(position.y+.5)*t-vh/2));
    }
    const dpr=canvas.width/camera.width;ctx.setTransform(dpr*camera.scale,0,0,dpr*camera.scale,-camera.x*dpr*camera.scale,-camera.y*dpr*camera.scale);
    ctx.imageSmoothingEnabled=!classic;
    let paintedBackground=false;
    if(classic){
      if(!roomScenes.has(map.id))roomScenes.set(map.id,classic.createRoom(map));
      ctx.drawImage(roomScenes.get(map.id),0,0,w,h);paintedBackground=true;
    }else paintedBackground=map.art.background&&drawAsset(map.art.background,0,0,w,h);
    ctx.imageSmoothingEnabled=false;
    if(!paintedBackground)for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
      const wall=map.tiles[y][x]==='#',furniture=map.tiles[y][x]==='F';ctx.fillStyle=wall?map.palette.wall:furniture?map.palette.furniture:map.palette.floor;ctx.fillRect(x*t,y*t,t,t);
      if(!furniture)drawAsset(wall?map.art.wall:map.art.floor,x*t,y*t,t,t);
    }
    ctx.font='13px Zpix';ctx.textAlign='center';
    if(!paintedBackground)for(const o of map.objects){drawAsset(o.image,o.x*t,o.y*t,o.w*t,o.h*t);ctx.fillStyle='#f7f0d8';ctx.fillText(o.label,(o.x+o.w/2)*t,(o.y+o.h/2)*t+5);}
    const nearby=closest();
    for(const e of events()){
      if(e.image){
        const v=e.visual||{x:e.x-.5,y:e.y-.5,w:1,h:1};
        if(classic&&e.image==='ch1-trash-pile'){
          trashSprite ||= classic.createTrash();ctx.drawImage(trashSprite,v.x*t,v.y*t,v.w*t,v.h*t);
        }else{ctx.imageSmoothingEnabled=!classic;drawAsset(e.image,v.x*t,v.y*t,v.w*t,v.h*t);ctx.imageSmoothingEnabled=false;}
      }
      const ex=(e.x+.5)*t,ey=(e.y+.5)*t;
      ctx.fillStyle=e===nearby?'#fff0be':'#eac98399';
      if(classic){ctx.fillRect(ex-3,ey-6,6,12);ctx.fillRect(ex-6,ey-3,12,6);}
      else{ctx.beginPath();ctx.arc(ex,ey,e===nearby?5:3,0,Math.PI*2);ctx.fill();}
    }
    const x=(position.x+.5)*t,y=(position.y+.5)*t;
    // Keep Kio's original artwork and animation; the close camera supplies the enlargement.
    const sx=classic?Math.round(x*camera.scale)/camera.scale:x,sy=classic?Math.round(y*camera.scale)/camera.scale:y;
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(sx,sy+4,11,4,0,0,Math.PI*2);ctx.fill();
    const image=walking&&(facing==='left'||facing==='right')?`ch1-kio-${facing}-${1+Math.floor(stride/.12)%2}`:facing==='back'?'ch1-kio-back':map.art.player;
    if(!drawAsset(image,sx-32,sy-42,64,64))drawAsset(map.art.player,sx-32,sy-42,64,64);
  }
  const directions={arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0],arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1]};
  function keydown(e){
    if(blocked()||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('button,a,input,textarea,select'))return;
    const key=e.key.toLowerCase();
    if(directions[key]){e.preventDefault();keys.add(key);target=null;idle=0;}
    if(['e',' ','enter'].includes(key)&&!e.repeat){e.preventDefault();p.done?go(node.next):interact();}
    if(key==='escape'){e.preventDefault();document.querySelector('#menu-toggle').click();}
  }
  function pointer(e){
    const r=canvas.getBoundingClientRect(),t=map.tileSize||48;
    target={x:((e.clientX-r.left)/camera.scale+camera.x)/t-.5,y:((e.clientY-r.top)/camera.scale+camera.y)/t-.5};idle=0;
  }
  function pointerdown(e){if(blocked()||e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);pointer(e);}
  function pointermove(e){if(canvas.hasPointerCapture(e.pointerId)&&!blocked())pointer(e);}
  function pointerup(e){if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);target=null;}
  const keyup=e=>keys.delete(e.key.toLowerCase()),clear=()=>{keys.clear();target=null;last=0;walking=false;};
  function tick(now){
    if(disposed)return;const dt=last?Math.min((now-last)/1000,.04):0;last=now;
    if(!blocked()&&!p.done){
      p.elapsed+=dt;idle+=dt;
      let dx=0,dy=0;for(const key of keys){dx+=directions[key][0];dy+=directions[key][1];}
      if(target){dx=target.x-position.x;dy=target.y-position.y;}
      const length=Math.hypot(dx,dy),distance=Math.min(3.8*dt,target?length:Infinity),before={...position};
      if(length>.02){moveRpg(map,position,dx/length*distance,dy/length*distance);idle=0;}
      walking=Math.hypot(position.x-before.x,position.y-before.y)>.0001;
      if(walking){stride+=dt;facing=Math.abs(dx)>Math.abs(dy)*.4?(dx<0?'left':'right'):(dy<0?'back':'front');}else stride=0;
      const touch=events().find(e=>e.touch&&Math.hypot(e.x-position.x,e.y-position.y)<.5);if(touch)act(touch);
      if(idle>({G1:60,G2:10,G3:60,G4:90,G5:240}[node.task]))completeAutomatically();
    }else{keys.clear();target=null;walking=false;if(p.done&&!blocked()){finishedFor+=dt;if(finishedFor>=2.5){go(node.next);return;}}}
    if(!blocked()){messageFor-=dt;message.hidden=messageFor<=0;}
    refresh();draw();frame=requestAnimationFrame(tick);
  }
  useMap(map);resize();canvas.focus();
  const observer=new ResizeObserver(resize);observer.observe(panel);
  canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointercancel',pointerup);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  frame=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();clear();menuInfo.remove();document.body.classList.remove('rpg-active');window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointermove',pointermove);canvas.removeEventListener('pointerup',pointerup);canvas.removeEventListener('pointercancel',pointerup);};
}
Object.assign(ILY,{mountRpg});
})();
