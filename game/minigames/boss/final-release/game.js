/* Standalone release host: bundled chart only, no editor or legacy battle mode. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('cv'),ctx=canvas.getContext('2d');
  const audio=document.createElement('audio');audio.id='bgm';audio.preload='auto';audio.src='assets/ily-bgm.mp3';audio.hidden=true;document.body.append(audio);
  const assets=new ChartMedia.Assets(),backgrounds=[],keys=new Set(),touchKeys=new Map();
  const phaseSides=['right','left','right','left','right','left','center'];
  let state='loading',difficulty='story',session=null,ready=false,reducedMotion=false;
  let epoch=0,startAt=0,raf=0,gameFade=null;
  const embedded=window.parent!==window&&new URLSearchParams(location.search).get('embed')==='1';
  // Local HTML files have opaque postMessage origins.
  const expectedParentOrigin=location.protocol==='file:'?'null':location.origin;
  const parentOrigin=expectedParentOrigin==='null'?'*':expectedParentOrigin;
  document.body.dataset.embedded=String(embedded);
  let hostBlocked=false,reported=false,outputVolume=1,priming=false;
  function hostSend(data){if(embedded)window.parent.postMessage(data,parentOrigin);}
  function report(win,skip=false){
    if(reported)return;reported=true;
    hostSend({type:'boss:end',win,skip,bossMode:skip?'story':'play',difficulty,
      hp:session?.stats.hp??0,maxHp:session?.stats.maxhp??40,timeMs:(session?.time??0)*1000,
      reachedAct:session?ChartRuntime.sceneAt(session.time).phaseIndex+1:1,endingIncluded:true});
  }
  function skipBattle(){
    if(state==='disposed'||reported)return;
    ++epoch;cancelAnimationFrame(raf);stopSound();clearInput();
    for(const animation of document.getAnimations())animation.cancel();
    hideScreens();playControls(false);showCanvas(0);blackCanvas();setState('skipped');report(false,true);
    if(!embedded){$('endTitle').textContent='已跳过战斗';$('endMessage').textContent='在主游戏中，此操作会直接继续后续剧情。';$('endScreen').hidden=false;}
  }
  function dispose(){
    if(state==='disposed')return;
    ++epoch;cancelAnimationFrame(raf);stopSound();clearInput();setState('disposed');
    for(const animation of document.getAnimations())animation.cancel();
    assets.stopVideos(true);audio.removeAttribute('src');audio.load();
    window.removeEventListener('message',hostMessage);
  }
  function hostMessage(event){
    if(!embedded||state==='disposed'||event.source!==window.parent||event.origin!==expectedParentOrigin)return;
    const data=event.data;if(!data||typeof data!=='object')return;
    if(data.type==='boss:hello'&&ready)hostSend({type:'boss:ready'});
    if(data.type==='boss:dispose'){dispose();return;}
    if(data.type==='boss:configure'){
      if(typeof data.reducedMotion==='boolean'){reducedMotion=data.reducedMotion;updateMotion();}
      if(typeof data.musicMuted==='boolean')audio.muted=data.musicMuted;
      if(Number.isFinite(data.musicVolume))outputVolume=Math.max(0,Math.min(1,data.musicVolume));
      if(!priming)audio.volume=outputVolume;
    }
    if((data.type==='boss:pause'||data.type==='boss:configure')&&typeof data.paused==='boolean'){
      hostBlocked=data.paused;if(hostBlocked)pause('主游戏菜单已打开，关闭后点击继续。');else if(state==='paused')resume();
    }
  }
  window.addEventListener('message',hostMessage);
  window.addEventListener('pagehide',dispose);
  $('hostMenu').hidden=!embedded;
  $('hostMenu').addEventListener('click',()=>hostSend({type:'boss:menu'}));
  const screens=['startScreen','headphoneScreen','pauseScreen','endScreen'];
  const setState=value=>{state=value;document.body.dataset.state=value;};
  const hideScreens=()=>screens.forEach(id=>{$(id).hidden=true;});
  const playControls=visible=>{for(const id of ['toolbar','footer','touchControls'])$(id).hidden=!visible;};
  const clearInput=()=>{keys.clear();touchKeys.clear();};
  const showCanvas=alpha=>{canvas.style.opacity=String(alpha);};
  function stopSound(){audio.pause();assets.stopVideos();}
  function blackCanvas(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,960,540);ctx.fillStyle='#000';ctx.fillRect(0,0,960,540);}
  function setDifficulty(value){
    difficulty=value==='normal'?'normal':'story';$('difficulty').value=difficulty;
    $('difficultyWarning').classList.toggle('visible',difficulty==='normal');
    $('difficultyLabel').textContent=difficulty==='story'?'剧情难度':'普通难度';
    session?.setDifficulty(difficulty);
  }
  async function fade(node,from,to,duration){
    node.style.opacity=String(from);
    const animation=node.animate([{opacity:from},{opacity:to}],{duration,easing:'ease-in-out',fill:'forwards'});
    try{await animation.finished;node.style.opacity=String(to);}catch{/* cancelled by return to menu */}
    animation.cancel();
  }
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function returnToMenu(){
    ++epoch;cancelAnimationFrame(raf);gameFade?.cancel();stopSound();clearInput();
    for(const animation of document.getAnimations())animation.cancel();
    hideScreens();playControls(false);showCanvas(0);blackCanvas();
    $('startScreen').style.opacity='1';$('startScreen').hidden=false;$('startScreen').inert=false;reported=false;
    $('headphoneContent').style.opacity='0';setState(ready?'menu':'loading');
    if(ready)$('start').focus({preventScroll:true});
  }
  function paintBackground(index,alpha,time){
    if(alpha<=0)return;const image=backgrounds[index];ctx.save();ctx.globalAlpha=alpha;
    ctx.fillStyle=index%2?'#72bde5':'#303c91';ctx.fillRect(0,0,960,540);
    if(image){
      if(reducedMotion)ctx.drawImage(image,0,0);
      else{
        const t=Math.floor(time*12)/12,side=phaseSides[index];
        for(let x=0;x<960;x+=8){
          const left=Math.max(0,1-x/370),right=Math.max(0,1-(960-x)/370);
          const l=side==='right'||side==='center'?left:0,r=side==='left'||side==='center'?right:0;
          const w=l+r,breath=Math.sin(t*1.8+(l>r?0:1.4));
          ctx.drawImage(image,x,0,8,540,x,-3+w*breath*1.7,8.5,546*(1+w*.0035*(1+breath)));
        }
      }
    }
    const shade=ctx.createLinearGradient(0,0,0,540);shade.addColorStop(0,'rgba(4,8,25,.48)');shade.addColorStop(.3,'rgba(4,8,25,0)');shade.addColorStop(1,'rgba(4,8,25,.28)');
    ctx.fillStyle=shade;ctx.fillRect(0,0,960,540);ctx.restore();
  }
  function render(){
    if(!session||['loading','menu','intro'].includes(state)){blackCanvas();return;}
    blackCanvas();const time=session.time,layout=ChartRuntime.sceneAt(time);
    paintBackground(layout.fromPhase,1,time);
    if(layout.phaseTransition)paintBackground(layout.phaseIndex,layout.blend,time);
    session.draw(ctx,{reducedMotion});session.drawHud(ctx,{reducedMotion});
    if(session.cinematic.battleVisible){
      ctx.save();ctx.font='16px Zpix,monospace';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText(`攻击力 ${Number(session.stats.attackDamage.toFixed(2))}`,28,25);
      const bonus=ChartRuntime.damageBonusNotice(session.stats,time);if(bonus)ctx.fillText(bonus,28,47);ctx.restore();
    }
    ChartMedia.drawScreenEffects(ctx,session.cinematic);
    assets.drawAnimations(ctx,session.cinematic,{playing:state==='playing'&&!audio.paused,onFrame:()=>{if(state==='paused'||state==='ended')render();}});
    ChartMedia.drawSubtitles(ctx,session.cinematic);ChartMedia.drawEffects(ctx,session.player.events,time);
  }
  function input(){
    const has=(...names)=>names.some(k=>keys.has(k)||[...touchKeys.values()].includes(k));
    return {left:has('ArrowLeft','KeyA'),right:has('ArrowRight','KeyD'),up:has('ArrowUp','KeyW'),down:has('ArrowDown','KeyS'),slow:has('ShiftLeft','ShiftRight'),confirm:has('KeyZ','Enter'),fire:has('KeyJ','Space')};
  }
  function finish(win){
    setState('ended');stopSound();clearInput();gameFade?.cancel();showCanvas(1);
    $('pause').disabled=true;$('touchControls').hidden=true;
    if(win&&embedded){report(true);return;}
    $('endTitle').textContent=win?'回响之后':'GAME OVER';
    $('endMessage').textContent=win?'谢谢你，听到了最后。':`故事停在 ${formatTime(session.time)}。再试一次吧。`;
    $('endScreen').hidden=false;$('restart').focus({preventScroll:true});
  }
  function frame(){
    if(state!=='playing')return;
    if(!audio.paused&&audio.readyState>=2){
      session.advance(Math.max(session.time,Math.min(audio.currentTime,session.duration)),input());
      if(session.dead){render();finish(false);return;}
      if(session.finished||audio.ended){render();finish(true);return;}
    }
    render();raf=requestAnimationFrame(frame);
  }
  function pause(message='准备好了，再继续。'){
    if(state!=='playing')return;
    setState('paused');cancelAnimationFrame(raf);stopSound();clearInput();
    gameFade?.cancel();showCanvas(1);render();$('pause').textContent='继续';
    $('pauseMessage').textContent=message;$('pauseScreen').hidden=false;$('resume').focus({preventScroll:true});
  }
  async function resume(){
    if(state!=='paused'||hostBlocked)return;
    const ticket=epoch;$('resume').disabled=true;
    try{
      await audio.play();
      if(ticket!==epoch||state!=='paused'){if(state!=='playing')stopSound();return;}
      if(document.hidden){stopSound();return;}
      $('pauseScreen').hidden=true;setState('playing');$('pause').textContent='暂停';raf=requestAnimationFrame(frame);
    }catch{$('pauseMessage').textContent='音乐暂时未能播放，请再次点击继续。';}
    finally{$('resume').disabled=false;}
  }
  async function begin(){
    const time=0;
    if(!ready||state==='intro'||state==='disposed'||hostBlocked)return;
    reported=false;
    const ticket=++epoch;startAt=time;cancelAnimationFrame(raf);stopSound();clearInput();
    session.reset();session.setDifficulty(difficulty);
    hideScreens();playControls(false);showCanvas(0);blackCanvas();setState('intro');
    // Prime the SAME media element under the initial click, silently, for autoplay policies.
    priming=true;audio.volume=0;audio.currentTime=time;
    const unlocked=audio.play().then(()=>true,()=>false).then(ok=>{if(ticket===epoch){audio.pause();audio.currentTime=time;priming=false;audio.volume=outputVolume;}return ok;});
    $('startScreen').hidden=false;$('startScreen').inert=true;
    await fade($('startScreen'),1,0,650);
    if(ticket!==epoch)return;
    $('startScreen').hidden=true;$('startScreen').inert=false;
    $('headphoneScreen').hidden=false;$('headphoneContent').style.opacity='0';
    await fade($('headphoneContent'),0,1,650);
    if(ticket!==epoch)return;
    await delay(1700);
    if(ticket!==epoch)return;
    await fade($('headphoneContent'),1,0,650);
    if(ticket!==epoch)return;
    await unlocked;
    if(ticket!==epoch)return;
    audio.currentTime=time;priming=false;audio.volume=outputVolume;
    $('headphoneScreen').hidden=true;playControls(true);$('pause').disabled=false;$('pause').textContent='暂停';
    // Draw behind opacity zero. Music and the scene reveal begin together.
    setState('playing');render();
    gameFade=canvas.animate([{opacity:0},{opacity:1}],{duration:850,easing:'ease-in-out',fill:'forwards'});
    gameFade.finished.then(()=>{if(ticket===epoch)showCanvas(1);},()=>{});
    if(document.hidden||hostBlocked){pause('已暂停。关闭主游戏菜单后点击继续。');return;}
    try{
      await audio.play();
      if(ticket!==epoch||state!=='playing'){if(state!=='playing')stopSound();return;}
      raf=requestAnimationFrame(frame);
    }catch{pause('点击继续以播放音乐并开始战斗。');}
  }
  function formatTime(time){return `${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;}
  $('difficulty').addEventListener('change',e=>setDifficulty(e.target.value));
  $('start').addEventListener('click',()=>begin());
  $('skip').addEventListener('click',skipBattle);
  for(const button of document.querySelectorAll('[data-story-skip]'))button.addEventListener('click',skipBattle);
  $('pause').addEventListener('click',()=>state==='paused'?resume():pause());
  $('resume').addEventListener('click',resume);
  for(const id of ['menu','pauseMenu','endMenu'])$(id).addEventListener('click',returnToMenu);
  $('restart').addEventListener('click',()=>begin());
  $('motion').addEventListener('click',()=>{reducedMotion=!reducedMotion;updateMotion();render();});
  function updateMotion(){$('motion').textContent=reducedMotion?'动态：关':'动态：开';$('motion').setAttribute('aria-pressed',String(!reducedMotion));}
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('wrap').requestFullscreen();}catch{$('status').textContent='浏览器未允许全屏，可放大窗口游玩。';}});
  addEventListener('keydown',e=>{
    if(['SELECT','INPUT','BUTTON'].includes(e.target.tagName))return;
    if(state!=='playing'&&state!=='paused')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code))e.preventDefault();
    /* 2026-09-25：Esc 不再映射暂停（Esc 交给外层游戏主菜单），暂停只用 P。 */
    if(!e.repeat&&e.code==='KeyP'){state==='paused'?resume():pause();return;}
    if(!e.repeat&&e.code==='KeyR'){begin();return;}
    if(state==='playing')keys.add(e.code);
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;button.setPointerCapture(e.pointerId);touchKeys.set(e.pointerId,button.dataset.key);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>touchKeys.delete(e.pointerId));
  }
  addEventListener('blur',()=>{clearInput();pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
  audio.addEventListener('error',()=>{if(state==='playing')pause('音乐无法读取，请确认成品文件夹完整后重新打开。');});
  audio.addEventListener('ended',()=>{if(state==='playing'){session.advance(session.duration,input());render();finish(!session.dead);}});
  async function loadBackground(n){
    const image=new Image();image.src=`background/p${n}.webp`;await image.decode();
    const surface=document.createElement('canvas');surface.width=960;surface.height=540;
    const c=surface.getContext('2d'),scale=Math.max(960/image.width,540/image.height);
    c.drawImage(image,(960-image.width*scale)/2,(540-image.height*scale)/2,image.width*scale,image.height*scale);backgrounds[n-1]=surface;
  }
  function audioReady(){return new Promise((resolve,reject)=>{
    if(audio.readyState>=2){resolve();return;}
    const timer=setTimeout(()=>done(Error('音乐加载超时')),30000);
    function done(error){clearTimeout(timer);audio.removeEventListener('loadeddata',ok);audio.removeEventListener('error',fail);error?reject(error):resolve();}
    const ok=()=>done(),fail=()=>done(Error('无法读取内置音乐'));audio.addEventListener('loadeddata',ok);audio.addEventListener('error',fail);audio.load();
  });}
  async function initialize(){
    try{
      if(!window.ILY_FINAL_CHART)throw Error('缺少内置谱面文件');
      // Difficulty is a release preference, not a modification to the author's chart.
      session=new ChartRuntime.Session(window.ILY_FINAL_CHART,assets);setDifficulty('story');
      await Promise.all([assets.load(window.ILY_FINAL_CHART.assets||{},document.baseURI),...Array.from({length:7},(_,i)=>loadBackground(i+1)),document.fonts.load('24px Zpix'),audioReady()]);
      if(state==='disposed'||state==='skipped')return;
      ready=true;setState('menu');$('start').disabled=false;$('skip').disabled=false;
      $('start').textContent='开始';$('loadStatus').textContent='剧情难度可完整体验故事 · 全程约 7 分 26 秒';
      hostSend({type:'boss:ready'});
    }catch(error){if(state==='disposed'||state==='skipped')return;hostSend({type:'boss:error',message:error.message});$('loadStatus').textContent=`加载失败：${error.message}。请完整解压成品后重新打开。`;$('start').textContent='资源未就绪';}
  }
  // Read-only diagnostics for verification; production never imports files or rewrites the chart.
  window.ILYGame={inspect:()=>({state,ready,difficulty,embedded,hostBlocked,startAt,time:session?.time??0,audioTime:audio.currentTime,audioPaused:audio.paused,stats:session?{...session.stats}:null,heart:session?{...session.soul}:null,cinematic:session?{white:session.cinematic.white,battleVisible:session.cinematic.battleVisible,animations:session.cinematic.animations.length}:null,events:session?.rows.length??0})};
  blackCanvas();updateMotion();setDifficulty('story');initialize();
})();
