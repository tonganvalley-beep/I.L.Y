(() => {
  'use strict';
  const {el,button}=ILY;
  // fin_s03 -> fin_s04. The child owns the full score AND its ending movie.
  function mountBoss({stage,node,state,go,assets}) {
    const panel=el('section','boss-host boss-host-final'),frame=el('iframe','boss-frame');
    if(panel.style)panel.style.background='#000';frame.title='I.L.Y. · 七幕回响';
    frame.src='minigames/boss/final-release/index.html?embed=1';
    frame.setAttribute('allow','fullscreen; autoplay');
    const fallback=el('div','boss-intro');
    fallback.append(el('p','','正在准备七幕回响…'),button('跳过战斗 · 继续剧情（skip）',storyMode));
    panel.append(frame,fallback);stage.append(panel);
    let disposed=false,finished=false,ready=false,guard=0;
    // file: messages serialize their origin as null, even when location.origin is file://.
    const expected=location.protocol==='file:'?'null':location.origin;
    const targetOrigin=expected==='null'?'*':expected;
    const storyAudio=assets?.audio;
    const silence=()=>storyAudio?.pause();silence();storyAudio?.addEventListener?.('play',silence);
    const send=data=>frame.contentWindow?.postMessage(data,targetOrigin);
    const paused=()=>document.hidden||!!document.querySelector('dialog[open]');
    const clamp=(v,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
    function configure(){
      if(disposed||!ready)return;
      silence();
      send({type:'boss:configure',paused:paused(),
        musicMuted:assets?.enabled===false,musicVolume:clamp(assets?.musicVolume,1)*clamp(assets?.masterVolume,1)});
    }
    function suspend(){if(disposed)return;send({type:'boss:pause',paused:paused()});configure();}
    function finish(result){
      if(disposed||finished)return;finished=true;
      const skipped=result.skip===true,played=!skipped&&result.win===true;
      state.flags.BOSS_ILY_CLEAR=played;
      state.flags.BOSS_ILY_SKIPPED=skipped;
      state.flags.BOSS_ILY_HP=Number.isFinite(result.hp)?Math.max(0,result.hp):0;
      state.flags.BOSS_ILY_TIME=Number.isFinite(result.timeMs)?Math.max(0,result.timeMs):0;
      state.flags.BOSS_ILY_ACT=Number.isFinite(result.reachedAct)?Math.min(7,Math.max(1,result.reachedAct)):1;
      state.flags.BOSS_ILY_DIFFICULTY=result.difficulty==='normal'?'normal':'story';
      state.flags.BATTLE_MODE=played?'play':'story';
      send({type:'boss:dispose'});
      go(node.next);
    }
    function storyMode(){finish({skip:true,win:false,hp:0,timeMs:0,reachedAct:1,difficulty:'story'});}
    function loadError(){
      if(disposed||finished||ready)return;
      fallback.replaceChildren(el('p','','战斗暂时无法加载，可以重试或继续剧情。'),
        button('重新加载',()=>{fallback.hidden=false;frame.src='minigames/boss/final-release/index.html?embed=1';}),
        button('跳过战斗 · 继续剧情（skip）',storyMode));fallback.hidden=false;
    }
    function message(event){
      if(disposed||finished||event.source!==frame.contentWindow||event.origin!==expected)return;
      const data=event.data;if(!data||typeof data!=='object')return;
      if(data.type==='boss:ready'){
        ready=true;clearTimeout(guard);fallback.hidden=true;configure();
      }else if(data.type==='boss:error'){
        loadError();
      }else if(data.type==='boss:menu'){
        document.querySelector('#menu-toggle')?.click();
      }else if(data.type==='boss:end'&&ready){
        if(data.skip===true||data.win===true)finish(data);
      }
    }
    frame.addEventListener('load',()=>send({type:'boss:hello'}));
    window.addEventListener('message',message);
    document.addEventListener('visibilitychange',suspend);
    const observer=new MutationObserver(suspend);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
    const settingsChanged=event=>{if(['music-toggle','music-volume','master-volume'].includes(event.target?.id))configure();};
    document.addEventListener('input',settingsChanged);document.addEventListener('click',settingsChanged);
    guard=setTimeout(loadError,20000);
    return ()=>{
      if(disposed)return;disposed=true;clearTimeout(guard);send({type:'boss:dispose'});
      observer.disconnect();window.removeEventListener('message',message);document.removeEventListener('visibilitychange',suspend);
      document.removeEventListener('input',settingsChanged);document.removeEventListener('click',settingsChanged);
      storyAudio?.removeEventListener?.('play',silence);frame.src='about:blank';frame.remove();panel.remove();assets?.play?.();
    };
  }
  ILY.mountBoss=mountBoss;
})();
