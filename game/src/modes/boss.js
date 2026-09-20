(() => {
'use strict';
const {el,button}=ILY;
// The iframe owns the unchanged seven-act simulation. Only this adapter advances AVG.
// 实战模式完全通关后，先全屏播放 ending.mp4，播完（或失败/跳过）再推进后续剧情。
const ENDING_SRC='minigames/boss/media/ending.mp4';
function mountBoss({stage,node,state,go,assets}) {
  const panel=el('section','boss-host'),intro=el('div','boss-intro');
  let frame=null,disposed=false,finished=false,ready=false,observer=null;
  let endingLayer=null,endingVideo=null,endingGuard=0;
  const expected=location.origin;
  const allowedOrigin=origin=>origin===expected||(location.protocol==='file:'&&origin==='null');
  const send=data=>frame?.contentWindow?.postMessage(data,expected==='null'?'*':expected);
  const paused=()=>document.hidden||!!document.querySelector('dialog[open]');
  const pause=()=>send({type:'boss:pause',paused:paused()});
  function finish(result) {
    if(disposed||finished)return;
    finished=true;
    const played=result.bossMode==='play';
    state.flags.BOSS_ILY_CLEAR=played&&result.win===true;
    state.flags.BOSS_ILY_HP=Number.isFinite(result.hp)?Math.max(0,result.hp):0;
    state.flags.BOSS_ILY_TIME=Number.isFinite(result.timeMs)?Math.max(0,result.timeMs):0;
    state.flags.BOSS_ILY_ACT=Number.isFinite(result.reachedAct)?Math.min(7,Math.max(1,result.reachedAct)):1;
    state.flags.BATTLE_MODE=played?'play':'story';
    go(node.next);
  }
  function storyMode(){finish({win:true,hp:0,timeMs:0,reachedAct:1,bossMode:'story'});}
  function stopEnding(){
    if(endingGuard){clearTimeout(endingGuard);endingGuard=0;}
    if(endingVideo){
      try{endingVideo.pause();endingVideo.removeAttribute('src');endingVideo.load();}catch{}
      endingVideo=null;
    }
    if(endingLayer){try{endingLayer.remove();}catch{}endingLayer=null;}
  }
  // 播放通关影片：播完 / 出错 / 跳过都会回调一次，绝不卡住剧情。
  function playEnding(done){
    if(disposed){done();return;}
    stopEnding();
    let settled=false;
    const settle=()=>{
      if(settled)return;
      settled=true;
      stopEnding();
      try{assets?.play?.();}catch{}
      done();
    };
    const layer=el('div','boss-ending');
    const video=document.createElement('video');
    video.className='boss-ending-video';
    video.src=ENDING_SRC;
    video.preload='auto';
    video.playsInline=true;
    video.setAttribute('playsinline','');
    video.muted=false;
    const skip=button('跳过 ▶',settle);
    skip.className='boss-ending-skip';
    layer.append(video,skip);
    (document.body||stage).append(layer);
    endingLayer=layer;endingVideo=video;
    video.addEventListener('ended',settle,{once:true});
    video.addEventListener('error',()=>settle(),{once:true});
    video.addEventListener('loadedmetadata',()=>{
      if(endingGuard){clearTimeout(endingGuard);endingGuard=0;}
    },{once:true});
    // 素材缺失或长时间无法解码时兜底，直接进入后续剧情。
    endingGuard=setTimeout(()=>settle(),6000);
    try{assets?.audio?.pause();}catch{}
    send({type:'boss:dispose'});           // 影片期间停掉战斗循环，避免后台占用
    const pr=video.play();
    if(pr&&pr.catch){
      // 自动播放受限：先静音重试，仍失败则跳过影片继续剧情。
      pr.catch(()=>{
        if(settled)return;
        video.muted=true;
        const again=video.play();
        if(again&&again.catch)again.catch(()=>settle());
      });
    }
  }
  function start(){
    ready=false;intro.hidden=true;
    if(frame)frame.remove();
    frame=el('iframe','boss-frame');frame.title='I.L.Y. · 七幕回响';
    frame.src='minigames/boss/index.html?embed=1';
    frame.setAttribute('allow','fullscreen');panel.prepend(frame);
    frame.addEventListener('load',()=>send({type:'boss:hello'}));
  }
  function message(e){
    if(disposed||e.source!==frame?.contentWindow||!allowedOrigin(e.origin))return;
    const data=e.data;
    if(!data||typeof data!=='object')return;
    if(data.type==='boss:ready'&&!ready){
      ready=true;send({type:'boss:start',bossMode:'play',reducedMotion:state.flags.AID_MODE??true,paused:paused()});
      if(!paused())frame.focus();
    }
    if(data.type==='boss:end'&&ready&&typeof data.win==='boolean'){
      if(data.skip){ finish({win:false,hp:0,timeMs:0,reachedAct:1,bossMode:'story'}); }
      else if(data.win){ playEnding(()=>finish({...data,bossMode:'play'})); }
      else {
        intro.replaceChildren(el('h1','','再试一次，或继续听完她的故事。'),button('重新挑战',start),button('剧情模式通过',storyMode));intro.hidden=false;
      }
    }
  }
  const motion=button('',()=>{state.flags.AID_MODE=!(state.flags.AID_MODE??true);motion.textContent=state.flags.AID_MODE?'动态效果：简化':'动态效果：完整';});
  motion.textContent=(state.flags.AID_MODE??true)?'动态效果：简化':'动态效果：完整';
  intro.append(el('h1','','I.L.Y. · 七幕回响'),el('p','',node.text),el('p','','方向键移动 · Shift 慢速 · P 暂停 · R 重试。七幕约五分钟，也可以选择剧情模式继续。'),motion,button('开始挑战',start),button('剧情模式 · 继续故事',storyMode));
  const bar=el('div','boss-host-bar');bar.append(button('菜单',()=>document.querySelector('#menu-toggle').click()),button('结束挑战 · 剧情模式',storyMode));
  panel.append(intro,bar);stage.append(panel);
  window.addEventListener('message',message);document.addEventListener('visibilitychange',pause);
  observer=new MutationObserver(pause);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  return()=>{disposed=true;stopEnding();send({type:'boss:dispose'});frame?.remove();observer.disconnect();window.removeEventListener('message',message);document.removeEventListener('visibilitychange',pause);};
}
ILY.mountBoss=mountBoss;
})();
