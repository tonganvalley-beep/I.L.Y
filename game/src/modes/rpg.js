(() => {
'use strict';
const {el,button,rpgProgress,activeRpgEvents,interactRpg,finishRpgAutomatically,moveRpg}=ILY;
// Camera: uniform scaling only — the artwork is never stretched and world coordinates (tiles,
// events, interaction points) never move. 1 = the map just covers the panel; >1 zooms in further.
const CAMERA_ZOOM=1;
// Cap the zoom (screen pixels per native art pixel) so the view stays well below the old close-up.
const MAX_PIXELS=9;
// Backdrop shown on the rare edge where a map is narrower than the panel.
const STAGE='#0b1220';
// 交互点类型 → 颜色 + 图标。世界内徽章、屏幕边缘箭头、小地图圆点、气泡边框共用这一套色，
// 让玩家一眼分清「这是门还是线索」。图标由 tools/gen-marker-icons.py 生成（16×16 点阵，2 倍输出）。
const MARKER={
  collect :{color:'#eac983',icon:'marker-collect' ,verb:'调查',name:'调查'},
  transfer:{color:'#7fd1e8',icon:'marker-transfer',verb:'前往',name:'通行'},
  finish  :{color:'#ff9d5c',icon:'marker-finish'  ,verb:'使用',name:'目标'},
  clue    :{color:'#b79ce8',icon:'marker-clue'    ,verb:'查看',name:'线索'},
  shop    :{color:'#6fdb9a',icon:'marker-shop'    ,verb:'选购',name:'选购'},
  reunion :{color:'#ff8fb1',icon:'marker-reunion' ,verb:'呼唤',name:'汇合'},
  scream  :{color:'#ff6b6b',icon:'marker-scream'  ,verb:'倾听',name:'事件'}
};
const MARKER_DONE={color:'#7f8f96',icon:'marker-done',verb:'已完成',name:'已完成'};
const MARKER_OTHER={color:'#eac983',icon:'marker-collect',verb:'调查',name:'调查'};
const markerMeta=(kind,done)=>done?MARKER_DONE:(MARKER[kind]||MARKER_OTHER);
// Follow arc length, not a count of intermittently sampled frames. Keep every
// corner and interpolate the segment containing the fixed-distance target.
function createRpgFollower(leader,start=leader,gap=1.05){
  let total=Math.hypot(leader.x-start.x,leader.y-start.y),travel=0;
  const path=[{...start,d:0}];
  if(total)path.push({...leader,d:total});
  const actor={...start,facing:'front',stride:0,walking:false};
  actor.update=next=>{
    const tail=path[path.length-1],step=Math.hypot(next.x-tail.x,next.y-tail.y);
    if(step>1e-9){total+=step;path.push({...next,d:total});}
    const wanted=Math.max(0,total-gap),advance=wanted-travel;
    actor.walking=advance>1e-9;
    if(!actor.walking){actor.stride=0;return actor;}
    while(path.length>2&&path[1].d<=wanted)path.shift();
    const a=path[0],b=path[1],ratio=(wanted-a.d)/(b.d-a.d);
    actor.x=a.x+(b.x-a.x)*ratio;actor.y=a.y+(b.y-a.y)*ratio;
    const dx=b.x-a.x,dy=b.y-a.y;
    actor.facing=Math.abs(dx)>Math.abs(dy)*.4?(dx<0?'left':'right'):(dy<0?'back':'front');
    actor.stride+=advance;travel=wanted;
    return actor;
  };
  return actor;
}
function mountRpg({stage,node,state,assets,go,rollback=()=>{},canRollback=()=>false,checkpointRollback=()=>{},restoringRollback=false}) {
  const p=rpgProgress(state,node.task),maps=ILY.data.maps;
  let map=maps[p.map] || maps[node.map],position,frame,last=0,disposed=false,finishedFor=0;
  let target=null,facing='front',stride=0,walking=false,messageFor=5,idle=0;
  let follower=null,nearbyEvent=null,nearbyPoint=null;
  // 回滚可能落在触碰事件范围内，离开该范围后才重新允许自动触发；E 调查仍可主动重试。
  let touchReady=!restoringRollback;
  const keys=new Set(),images=new Map(),roomScenes=new Map(),camera={x:0,y:0,scale:1,width:1,height:1};
  let trashSprite;
  const panel=el('section','rpg-panel'),canvas=el('canvas','rpg-canvas');canvas.tabIndex=0;
  canvas.setAttribute('aria-label','操控成田基生：WASD 或方向键连续移动，也可按住画面引导移动。靠近物件后按 E 调查，PageUp 或向上滚轮回滚，Esc 打开菜单。');
  const ctx=canvas.getContext('2d');
  const inspect=el('dialog','rpg-inspect');panel.append(inspect);
  const message=el('p','rpg-message','WASD / 方向键移动 · 按住画面引导 · E 调查 · PageUp / 向上滚轮回滚 · Esc 菜单');message.setAttribute('aria-live','polite');
  const prompt=button('',()=>interact());prompt.className='rpg-interact';prompt.hidden=true;
  const menuToggle=button('☰',()=>document.querySelector('#menu-toggle').click());menuToggle.className='rpg-menu-toggle';menuToggle.setAttribute('aria-label','打开菜单');
  const rollbackControl=button(ILY.t('menu.rollback'),()=>{if(!blocked())rollback();});
  rollbackControl.className='rpg-rollback';rollbackControl.setAttribute('aria-keyshortcuts','PageUp');
  panel.append(canvas,message,prompt,menuToggle,rollbackControl);stage.append(panel);document.body.classList.add('rpg-active');
  // ---- 左上角小地图：展示同一移动区段内全部相连地图，并标出人物当前所在与定位 ----
  // 从起始地图沿 transfer 边做连通遍历，得到「区段」内所有地图；区段地图数 ≥ 2 才显示。
  function buildMapGroup(startId){
    const seen=new Set(),order=[],queue=[startId];
    while(queue.length){const id=queue.shift();if(seen.has(id)||!maps[id])continue;seen.add(id);order.push(id);
      for(const e of maps[id].events||[])if(e.kind==='transfer'&&e.to&&!seen.has(e.to))queue.push(e.to);}
    return order;
  }
  const MINIMAP_LABEL={'ch1-entry':'入口','ch1-gallery':'回廊','ch1-isopod':'具足虫','ch1-empty':'空水槽','ch1-panorama':'全景','ch1-restroom':'洗手间','ch1-room':'出租屋','ch1-store':'便利店','ch2-island':'上岛','ch2-flowers':'紫阳花','ch2-stairs':'长楼梯','ch2-shop':'冰淇淋','ch2-return':'夕阳','ch3-work':'夜路','ch3-coast':'夜海','ch3-mall':'商场'};
  let minimap=null,cells={};
  const group=buildMapGroup(node.map||p.map);
  if(group.length>=2){
    const isAquarium=group.includes('ch1-isopod');
    const mainSet=isAquarium?new Set(['ch1-entry','ch1-gallery','ch1-isopod']):new Set(group);
    minimap=el('div','rpg-minimap');
    const title=el('div','rpg-minimap-title',(isAquarium?'水族馆':'地图')+' · 导览');
    minimap.append(title);
    const row=el('div','rpg-minimap-maps');
    for(const id of group){
      const m=maps[id];if(!m)continue;
      const cell=el('div','rpg-minimap-cell');
      const thumb=el('div','rpg-minimap-thumb');
      const bg=assets.image(m.art&&m.art.background);
      if(bg)thumb.style.backgroundImage=`url("${bg}")`;
      if(mainSet.has(id))thumb.classList.add('is-main');
      const dot=el('div','rpg-minimap-dot');
      const layer=el('div','rpg-minimap-layer');
      thumb.append(layer,dot);
      const name=el('div','rpg-minimap-name',MINIMAP_LABEL[id]||m.name);
      cell.append(thumb,name);
      row.append(cell);
      cells[id]={cell,thumb,dot,layer,width:m.width,height:m.height};
    }
    minimap.append(row);
    panel.append(minimap);
  }
  let minimapKey='';
  function updateMinimap(){
    if(!minimap)return;
    // 交互点状态只在收集数 / 地图 / 剧情旗标变化时重建，玩家定位点仍每帧更新。
    const key=map.id+':'+p.collected.length+':'+(state.flags.G5_SCREAM?1:0);
    const stale=key!==minimapKey;minimapKey=key;
    for(const id of group){
      const c=cells[id];if(!c)continue;
      const on=id===map.id;
      c.cell.classList.toggle('is-current',on);
      if(!stale)continue;
      c.layer.replaceChildren();
      if(!on)continue;
      // 当前地图上未完成的交互点画成类型色小圆点，与世界内徽章同色。
      for(const e of activeRpgEvents(maps[id],node.task)){
        if(p.collected.includes(e.id)||(e.kind==='scream'&&state.flags.G5_SCREAM))continue;
        const d=el('div','rpg-minimap-mark');
        d.style.background=markerMeta(e.kind,false).color;
        d.style.left=((e.x+.5)/c.width*100)+'%';d.style.top=((e.y+.5)/c.height*100)+'%';
        c.layer.append(d);
      }
    }
    const cur=cells[map.id];
    if(cur){cur.dot.style.left=((position.x+.5)/cur.width*100)+'%';cur.dot.style.top=((position.y+.5)/cur.height*100)+'%';}
  }
  const menu=document.querySelector('#game-menu'),menuInfo=el('section','rpg-menu-info'),objective=el('p');
  const auto=button('自动完成当前探索',()=>{menu.close();completeAutomatically();});
  menuInfo.append(el('h3','','当前探索'),objective,el('p','','WASD / 方向键移动；按住画面引导；E / 空格 / Enter 调查；PageUp / 向上滚轮回滚。'),auto);menu.append(menuInfo);
  const blocked=()=>disposed || document.hidden || !!document.querySelector('dialog[open]');
  function say(text){message.textContent=text;messageFor=4;message.hidden=false;}
  function events(){return activeRpgEvents(map,node.task).filter(e=>(e.kind!=='scream' || !state.flags.G5_SCREAM) && !p.collected.includes(e.id));}
  function closest(){return events().filter(e=>Math.hypot(e.x-position.x,e.y-position.y)<=1.05).sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y))[0];}
  function refresh(){
    rollbackControl.disabled=!canRollback();
    rollbackControl.textContent=ILY.t('menu.rollback');rollbackControl.title=ILY.t('menu.rollbackTitle');
    const count=p.collected.length;
    objective.textContent=map.name+' · '+(p.done?'目标完成':node.task==='G1'?`整理房间 ${count}/3`:node.task==='G3'?`找到手柄 ${count}/2，回电脑前开局`:node.task==='G4'?`和“爱理”一起挑选食物 ${count}/${node.required?.length||3}`:node.task==='G5'?(p.collected.includes('photo')&&p.collected.includes('isopod')?'去空水槽前寻找“爱理”':'调查拍照点与大王具足虫展区'):node.text);
    const e=closest();prompt.hidden=p.done || !e;auto.hidden=p.done;
    if(e){
      const meta=markerMeta(e.kind,false);
      if(prompt.dataset.for!==e.id){                 // 只在目标切换时重建内容，位置每帧更新
        prompt.dataset.for=e.id;
        prompt.style.setProperty('--c',meta.color);
        prompt.replaceChildren();
        const img=document.createElement('img');img.className='rpg-marker-icon';img.alt='';img.src=assets.image(meta.icon)||'';
        prompt.append(img,el('span','rpg-marker-kind',meta.verb+' · '),el('b','',e.label));
        const k=document.createElement('kbd');k.textContent='E';prompt.append(k);
      }
    }else prompt.dataset.for='';
  }
  function useMap(next,arrival){
    map=next;p.map=map.id;position=state.maps[map.id] ||= {...map.spawn};if(arrival)Object.assign(position,arrival);target=null;idle=0;follower=null;
    if(node.follower){
      let start={...position};
      // Seed a short, collision-checked cardinal path so she is visible on entry.
      for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
        const candidate={...position};
        for(let i=0;i<21;i++)moveRpg(map,candidate,dx*.05,dy*.05);
        if(Math.hypot(candidate.x-position.x,candidate.y-position.y)>Math.hypot(start.x-position.x,start.y-position.y))start=candidate;
      }
      follower=createRpgFollower(position,start);
    }
    if(!p.visited.includes(map.id))p.visited.push(map.id);
    if(node.task==='G5')state.flags.G5_STAGE=map.id;
    if(map.id==='ch1-restroom'&&!state.flags.G5_SCREAM)say(interactRpg(state,node.task,{id:'scream',kind:'scream',text:'十屋：哇啊啊啊——！远处的惨叫突然中断。总觉得发生了什么……'}));
    refresh();
  }
  function completeAutomatically(){
    if(blocked()||p.done)return;checkpointRollback();finishRpgAutomatically(state,node.task,node);target=null;
    say(node.task==='G5'?'远处传来惨叫。手机也没了信号。基生一路寻找，终于在空水槽前看到了“爱理”。':node.task==='G4'?'两人看好了想吃的东西，继续在货架前商量。':'基生完成了眼前的事情。');refresh();
  }
  function act(e){
    if(blocked()||p.done)return;target=null;idle=0;
    if(e.kind==='transfer'){checkpointRollback();useMap(maps[e.to],e.arrival||maps[e.to].spawn);canvas.focus();return;}
    if(e.options){
      inspect.replaceChildren(el('h2','',e.label));
      for(const value of e.options)inspect.append(button(value,()=>{
        if(disposed)return;checkpointRollback();inspect.close();say(interactRpg(state,node.task,{...e,options:null,value,text:`${e.text} 基生接过了${value}${(e.item&&e.item[value])||'冰淇淋'}。`},node));refresh();canvas.focus();
      }));
      inspect.showModal();return;
    }
    checkpointRollback();say(interactRpg(state,node.task,e,node));
    if(e.preview){
      const photo=el('img');photo.src=assets.image(e.preview);photo.alt=e.label;
      inspect.replaceChildren(photo,el('p','',e.text),button('收起照片',()=>{inspect.close();canvas.focus();}));inspect.showModal();
    }
    if(p.done&&node.task==='G5'&&!state.flags.G5_SCREAM){state.flags.G5_SCREAM=true;say('远处，十屋的惨叫骤然中断。空水槽前，终于出现了熟悉的身影。');}
    refresh();canvas.focus();
  }
  function interact(){if(blocked())return;const e=closest();if(e)act(e);}
  function assetImage(id){
    const path=assets.image(id);if(!path)return null;
    if(!images.has(path)){const img=new Image();img.src=path;images.set(path,img);}
    const img=images.get(path);return (img.complete&&img.naturalWidth)?img:null;
  }
  function drawAsset(id,x,y,w,h,cell=null){
    const img=assetImage(id);if(!img)return false;
    if(cell===null)ctx.drawImage(img,x,y,w,h);
    else{const cw=img.naturalWidth/4,ch=img.naturalHeight/2;ctx.drawImage(img,(cell%4)*cw,Math.floor(cell/4)*ch,cw,ch,x,y,w,h);}
    return true;
  }
  function resize(){
    const r=panel.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    camera.width=Math.max(1,r.width);camera.height=Math.max(1,r.height);canvas.width=Math.round(camera.width*dpr);canvas.height=Math.round(camera.height*dpr);
  }
  // Same rule as cameraView() in core/room-art.js: fit the whole map, quantised to whole screen
  // pixels per native art pixel, never scaled past 1:1. Used when the classic module is absent.
  function fitCamera(t,w,h){
    const steps=t/((map.art&&map.art.nativeTileSize)||16);
    const fit=Math.max(camera.width/w,camera.height/h)*CAMERA_ZOOM;
    // Round up so the scaled map always covers the whole panel instead of leaving a bare strip.
    camera.scale=Math.max(1,Math.min(MAX_PIXELS,Math.ceil(fit*steps-1e-9)))/steps;
    const vw=camera.width/camera.scale,vh=camera.height/camera.scale;
    camera.x=vw>=w?(w-vw)/2:Math.max(0,Math.min(w-vw,(position.x+.5)*t-vw/2));
    camera.y=vh>=h?(h-vh)/2:Math.max(0,Math.min(h-vh,(position.y+.5)*t-vh/2));
  }
  // ---- 交互点标记：八边形徽章 + 类型图标 + 类型色，屏幕尺寸恒定（不随相机缩放变大变小）----
  // 世界锚点：人物类事件的标记抬到立绘头顶，其余落在格子中心。
  function markerAnchor(e,sprite){
    const t=map.tileSize||48;
    if(e.npc&&sprite)return{x:(e.x+.5)*t,y:sprite.y*t-6};
    return{x:(e.x+.5)*t,y:(e.y+.5)*t};
  }
  function drawMarker(ax,ay,meta,near,done,now){
    const px=1/camera.scale;                          // 1 屏幕像素对应的世界单位
    const beat=done?1:1+Math.sin(now/460+ax*.03+ay*.03)*0.05;
    const size=(done?18:near?26:22)*(near?1:beat)*px;
    const h=size/2,cy=ay-size-7*px,c=h*0.3;
    ctx.save();
    ctx.globalAlpha=done?0.5:near?1:0.9;
    // 指向锚点的小尾巴
    ctx.fillStyle=meta.color;
    ctx.beginPath();ctx.moveTo(ax,ay-px);ctx.lineTo(ax-4*px,cy+h-px);ctx.lineTo(ax+4*px,cy+h-px);ctx.closePath();ctx.fill();
    // 靠近时向外扩散的脉冲环
    if(near){
      const step=(now/1100)%1;
      ctx.globalAlpha=(1-step)*0.45;ctx.strokeStyle=meta.color;ctx.lineWidth=2*px;
      ctx.beginPath();ctx.arc(ax,cy,h*(1+step*1.2),0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }
    // 八边形徽章
    ctx.beginPath();
    ctx.moveTo(ax-h+c,cy-h);ctx.lineTo(ax+h-c,cy-h);ctx.lineTo(ax+h,cy-h+c);ctx.lineTo(ax+h,cy+h-c);
    ctx.lineTo(ax+h-c,cy+h);ctx.lineTo(ax-h+c,cy+h);ctx.lineTo(ax-h,cy+h-c);ctx.lineTo(ax-h,cy-h+c);
    ctx.closePath();
    ctx.fillStyle='#0b1622e8';ctx.fill();
    ctx.shadowColor=meta.color;ctx.shadowBlur=near?12:5;
    ctx.lineWidth=Math.max(1,2*px);ctx.strokeStyle=meta.color;ctx.stroke();
    ctx.shadowBlur=0;
    // 类型图标（素材没加载完时退化成一个实心点）
    const isz=size*0.58;
    ctx.imageSmoothingEnabled=false;
    if(!drawAsset(meta.icon,ax-isz/2,cy-isz/2,isz,isz)){
      ctx.fillStyle=meta.color;ctx.beginPath();ctx.arc(ax,cy,isz*0.16,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  // 提示气泡锚在最近那个点的头顶：提示与场景产生关联，不再是屏幕底部一条固定文案。
  function positionPrompt(){
    if(prompt.hidden||!nearbyPoint)return;
    const sx=(nearbyPoint.x-camera.x)*camera.scale,sy=(nearbyPoint.y-camera.y)*camera.scale;
    prompt.style.left=Math.max(80,Math.min(camera.width-80,sx))+'px';
    prompt.style.top=Math.max(54,sy-12)+'px';
  }
  function draw(){
    const t=map.tileSize||48,w=map.width*t,h=map.height*t;
    const classic=['classic-room','pixel-map'].includes(map.art.renderer)&&ILY.classicRoom;
    if(classic)Object.assign(camera,classic.cameraView(camera.width,camera.height,map,position));
    else fitCamera(t,w,h);
    const vw=camera.width/camera.scale,vh=camera.height/camera.scale;
    const dpr=canvas.width/camera.width;ctx.setTransform(dpr*camera.scale,0,0,dpr*camera.scale,-camera.x*dpr*camera.scale,-camera.y*dpr*camera.scale);
    // Stage: cover the area around the centred map so the canvas backdrop never shows through.
    if(vw>w||vh>h){ctx.fillStyle=(map.art&&map.art.outside)||STAGE;ctx.fillRect(camera.x-2,camera.y-2,vw+4,vh+4);}
    ctx.imageSmoothingEnabled=!classic;
    let paintedBackground=false;
    if(classic){
      // 正式房间图与逻辑地图保持同一宽高比；加载前仍用数据驱动像素房间兜底。
      // Downscaling a pixel map reads better interpolated; enlarging stays crisp.
      ctx.imageSmoothingEnabled=camera.scale<1||map.art.renderer==='classic-room';
      paintedBackground=!!(map.art.background&&drawAsset(map.art.background,0,0,w,h));
      if(!paintedBackground){
        ctx.imageSmoothingEnabled=false;
        if(!roomScenes.has(map.id))roomScenes.set(map.id,classic.createRoom(map));
        ctx.drawImage(roomScenes.get(map.id),0,0,w,h);paintedBackground=true;
      }
    }else paintedBackground=map.art.background&&drawAsset(map.art.background,0,0,w,h);
    ctx.imageSmoothingEnabled=false;
    if(!paintedBackground)for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
      const wall=map.tiles[y][x]==='#',furniture=map.tiles[y][x]==='F';ctx.fillStyle=wall?map.palette.wall:furniture?map.palette.furniture:map.palette.floor;ctx.fillRect(x*t,y*t,t,t);
      if(!furniture)drawAsset(wall?map.art.wall:map.art.floor,x*t,y*t,t,t);
    }
    ctx.font='13px Zpix';ctx.textAlign='center';
    if(!paintedBackground)for(const o of map.objects){drawAsset(o.image,o.x*t,o.y*t,o.w*t,o.h*t);ctx.fillStyle='#f7f0d8';ctx.fillText(o.label,(o.x+o.w/2)*t,(o.y+o.h/2)*t+5);}
    const nearby=closest();nearbyEvent=(nearby&&!p.done)?nearby:null;
    const now=performance.now();
    // 已完成的点也画出来（灰勾），玩家能看出「这里已经处理过」，而不是标记凭空消失。
    for(const e of activeRpgEvents(map,node.task)){
      const done=p.collected.includes(e.id)||(e.kind==='scream'&&state.flags.G5_SCREAM);
      let sprite=null;
      if(e.image&&!(done&&e.kind==='collect')){
        const v=e.visual||{x:e.x-.5,y:e.y-.5,w:1,h:1};
        sprite=v;
        // 站立的 NPC（e.npc）先铺一脚接触阴影，再画人，和主角的落地顺序一致。
        if(e.npc){
          ctx.fillStyle='#0004';
          ctx.beginPath();ctx.ellipse((v.x+v.w/2)*t,(v.y+v.h)*t-3,11,4,0,0,Math.PI*2);ctx.fill();
        }
        if(classic&&e.image==='ch1-trash-pile'){
          trashSprite ||= classic.createTrash();ctx.drawImage(trashSprite,v.x*t,v.y*t,v.w*t,v.h*t);
        }else{ctx.imageSmoothingEnabled=!classic;drawAsset(e.image,v.x*t,v.y*t,v.w*t,v.h*t);ctx.imageSmoothingEnabled=false;}
      }
      const a=markerAnchor(e,sprite);
      // 记下最近那个点的实际锚点，气泡要贴着它（NPC 的标记是抬到头顶的）。
      if(!done&&e===nearby)nearbyPoint=a;
      drawMarker(a.x,a.y,markerMeta(e.kind,done),!done&&e===nearby,done,now);
    }
    // Off-screen indicator: point the player toward uncollected interaction points that sit
    // outside the current view. This never moves the points — it only adds a screen-edge arrow.
    {const m=28;
      ctx.save();
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
      for(const e of events()){
        // 屏幕边缘箭头沿用同一套类型色，颜色和世界内的徽章对得上。
        const meta=markerMeta(e.kind,false),a=markerAnchor(e,null);
        const sx=(a.x-camera.x)*camera.scale,sy=(a.y-camera.y)*camera.scale;
        if(sx>=m&&sx<=camera.width-m&&sy>=m&&sy<=camera.height-m)continue;
        const cx=Math.max(m,Math.min(camera.width-m,sx)),cy=Math.max(m,Math.min(camera.height-m,sy));
        const ang=Math.atan2(sy-cy,sx-cx);
        ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);ctx.globalAlpha=0.92;
        ctx.fillStyle=meta.color;ctx.strokeStyle='#04090d99';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-7,-8);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    const x=(position.x+.5)*t,y=(position.y+.5)*t;
    // Constant on-screen character size. Cover-fit zooms the bigger ch2/ch3 maps OUT, which used to
    // shrink Kio/Airi to a speck there. Draw the sprite at world size = screenTarget / camera.scale
    // so it stays the same height on screen on every map. Only ever enlarges (max with the old
    // 64-units look) — ch1 is never shrunk. Map art scaling and interaction coords are untouched.
    const S=Math.max(88,64*camera.scale)/camera.scale;
    function drawFollower(){
      if(!follower)return;
      const fx=(follower.x+.5)*t,fy=(follower.y+.5)*t;
      const sx=classic?Math.round(fx*camera.scale)/camera.scale:fx,sy=classic?Math.round(fy*camera.scale)/camera.scale:fy;
      ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(sx,sy+20,10,4,0,0,Math.PI*2);ctx.fill();
      const side=follower.facing==='left'||follower.facing==='right';
      const cell=follower.walking&&side?(follower.facing==='left'?4:6)+Math.floor(follower.stride/.45)%2:{front:0,back:1,left:2,right:3}[follower.facing];
      drawAsset(node.followerSprite||'airi-rpg-sheet',sx-S/2,(sy+26)-S,S,S,cell);
    }
    if(follower&&follower.y<=position.y)drawFollower();
    // Keep Kio's original artwork and animation; the close camera supplies the enlargement.
    const sx=classic?Math.round(x*camera.scale)/camera.scale:x,sy=classic?Math.round(y*camera.scale)/camera.scale:y;
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(sx,sy+20,11,4,0,0,Math.PI*2);ctx.fill();
    const image=walking&&(facing==='left'||facing==='right')?`ch1-kio-${facing}-${1+Math.floor(stride/.12)%2}`:facing==='back'?'ch1-kio-back':map.art.player;
    if(!drawAsset(image,sx-S/2,(sy+22)-S,S,S))drawAsset(map.art.player,sx-S/2,(sy+22)-S,S,S);
    if(follower&&follower.y>position.y)drawFollower();
    positionPrompt();updateMinimap();
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
      follower?.update(position);
      if(walking){stride+=dt;facing=Math.abs(dx)>Math.abs(dy)*.4?(dx<0?'left':'right'):(dy<0?'back':'front');}else stride=0;
      const touch=events().find(e=>e.touch&&Math.hypot(e.x-position.x,e.y-position.y)<.5);
      if(!touch)touchReady=true;
      if(touch&&touchReady)act(touch);
      if(idle>(node.timeout||{G1:60,G2:10,G3:60,G4:90,G5:240}[node.task]||90))completeAutomatically();
    }else{keys.clear();target=null;walking=false;if(follower)follower.walking=false;if(p.done&&!blocked()){finishedFor+=dt;if(finishedFor>=2.5){go(node.next);return;}}}
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
Object.assign(ILY,{mountRpg,createRpgFollower});
})();
