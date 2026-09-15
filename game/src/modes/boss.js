(() => {
'use strict';
const {el,button}=ILY;
// The iframe owns the unchanged seven-act simulation. Only this adapter advances AVG.
function mountBoss({stage,node,state,go}) {
  const panel=el('section','boss-host'),intro=el('div','boss-intro');
  let frame=null,disposed=false,finished=false,ready=false,observer=null;
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
  function start(){
    ready=false;intro.hidden=true;
    if(frame)frame.remove();
    frame=el('iframe','boss-frame');frame.title='I.L.Y. · 七幕回响';
    frame.src='../danmu-boss/danmu-boss/index.html?embed=1';
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
      if(data.win)finish({...data,bossMode:'play'});
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
  return()=>{disposed=true;send({type:'boss:dispose'});frame?.remove();observer.disconnect();window.removeEventListener('message',message);document.removeEventListener('visibilitychange',pause);};
}
ILY.mountBoss=mountBoss;
})();
