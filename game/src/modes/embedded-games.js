// 独立小游戏的主线适配层。存档停在入口；离开、读档或回滚都会销毁 iframe。
(() => {
  'use strict';
  function mountEmbedded({stage,node,state,assets,go},kind){
    const photo=kind==='photo';
    const wrap=ILY.el('section','photo-embed');
    const frame=ILY.el('iframe');
    frame.title=photo?'一瞬留影 · 节拍摄影':'基生的 Windows XP 电脑';
    frame.src=photo?'minigames/photo-rhythm/index.html':'minigames/winxp/index.html';
    let disposed=false;
    function done(){
      if(disposed)return;
      state.flags[photo?'PHOTO_VISITED':'COMPUTER_VISITED']=true;
      go(node.next);
    }
    const bar=ILY.el('div','embedded-toolbar');
    const pause=ILY.button('暂停',()=>send('pause'));
    const exit=ILY.button(photo?'收起相机 · 继续散步':'离开电脑 · 继续剧情',done);
    bar.append(ILY.el('span','',photo?'D / F / J / K · 跟随节拍拍照':'双击 games 文件夹，选择游戏'),pause,exit);
    pause.hidden=!photo;
    wrap.append(frame,bar);stage.replaceChildren(wrap);
    assets.audio?.pause();
    const expectedOrigin=location.protocol==='file:'?'null':location.origin;
    const targetOrigin=expectedOrigin==='null'?'*':expectedOrigin;
    function send(action){frame.contentWindow?.postMessage({type:'ily-embed-control',action},targetOrigin)}
    function message(event){
      if(disposed||event.source!==frame.contentWindow||event.origin!==expectedOrigin)return;
      const data=event.data;
      if(data?.type==='ily-photo-result'&&photo){
        const result={};
        for(const key of ['score','perfect','bestCombo','accuracy']){
          if(typeof data[key]!=='number'||!Number.isFinite(data[key])||data[key]<0)return;
          result[key]=data[key];
        }
        state.flags.PHOTO_RESULT=result;state.flags.PHOTO_COMPLETED=true;
      }else if(data?.type==='ily-photo-continue'&&photo)done();
    }
    const suspend=()=>{
      const blocked=document.hidden||!!document.querySelector('dialog[open]');
      if(blocked)send('pause');else if(!photo)send('resume');
    };
    const observer=new MutationObserver(suspend);
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
    document.addEventListener('visibilitychange',suspend);
    window.addEventListener('message',message);
    return ()=>{
      disposed=true;observer.disconnect();
      document.removeEventListener('visibilitychange',suspend);window.removeEventListener('message',message);
      frame.src='about:blank';wrap.remove();assets.play();
    };
  }
  ILY.mountPhoto=context=>mountEmbedded(context,'photo');
  ILY.mountComputer=context=>mountEmbedded(context,'computer');
})();
