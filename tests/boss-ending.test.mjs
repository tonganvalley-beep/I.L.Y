import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const ENDING_SRC='minigames/boss/media/ending.mp4';

// 最小 DOM 桩：只提供 boss.js 真正用到的接口。
function makeEnv(){
  const sent=[],goCalls=[],videos=[],winL={};
  function makeNode(tag){
    const n={
      tagName:tag,className:'',textContent:'',hidden:false,type:'',
      children:[],parentNode:null,listeners:{},attrs:{},playCalls:0,pauseCalls:0,
      append(...kids){for(const c of kids){c.parentNode=n;n.children.push(c);}},
      prepend(...kids){for(const c of kids)c.parentNode=n;n.children.unshift(...kids);},
      replaceChildren(...kids){n.children=kids;},
      remove(){const p=n.parentNode;if(p){const i=p.children.indexOf(n);if(i>=0)p.children.splice(i,1);}n.parentNode=null;},
      setAttribute(k,v){n.attrs[k]=v;},
      removeAttribute(k){delete n.attrs[k];},
      addEventListener(t,f){(n.listeners[t]||(n.listeners[t]=[])).push(f);},
      dispatch(t,e={}){return (n.listeners[t]||[]).map(f=>f(e));},
      focus(){},pause(){n.pauseCalls++;},load(){},
      play(){n.playCalls++;return Promise.resolve();},
    };
    if(tag==='video')videos.push(n);
    if(tag==='iframe')n.contentWindow={postMessage:(d,o)=>sent.push({data:d,origin:o})};
    return n;
  }
  const body=makeNode('body');
  const document={
    createElement:makeNode,body,hidden:false,
    querySelector:()=>null,addEventListener:()=>{},removeEventListener:()=>{},
  };
  const window={
    addEventListener:(t,f)=>{(winL[t]||(winL[t]=[])).push(f);},
    removeEventListener:(t,f)=>{const a=winL[t]||[];const i=a.indexOf(f);if(i>=0)a.splice(i,1);},
  };
  const location={origin:'http://ily.test',protocol:'http:'};
  class MutationObserver{observe(){}disconnect(){}}
  const context=vm.createContext({ILY:{},document,window,location,MutationObserver,setTimeout,clearTimeout,console});
  return {context,document,window,location,sent,goCalls,videos,winL,body,makeNode};
}

async function mount(){
  const env=makeEnv();
  vm.runInContext(await readFile(new URL('../game/src/core/dom.js',import.meta.url),'utf8'),env.context);
  vm.runInContext(await readFile(new URL('../game/src/modes/boss.js',import.meta.url),'utf8'),env.context);
  const state={flags:{}};
  const storyNode={next:'AFTER_BOSS',text:'boss'};
  const go=id=>env.goCalls.push(id);
  const stage=env.makeNode('section');
  const assets={audio:{pauseCalls:0,pause(){this.pauseCalls++;}},playCalls:0,play(){this.playCalls++;}};
  const dispose=env.context.ILY.mountBoss({stage,node:storyNode,state,go,assets});
  const panel=stage.children[0];
  const intro=panel.children.find(c=>c.className==='boss-intro');
  const startBtn=intro.children.find(c=>c.textContent==='开始挑战');
  startBtn.dispatch('click');
  const frame=panel.children[0];
  const post=data=>env.winL.message[0]({source:frame.contentWindow,origin:env.location.origin,data});
  post({type:'boss:ready'});
  return {...env,dispose,state,storyNode,stage,assets,frame,post,panel,intro};
}

test('完全通关后先播 ending.mp4，不立刻推进剧情',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:true,hp:12,maxHp:40,timeMs:1000,reachedAct:7,reducedMotion:true,bossMode:'play'});
  assert.deepEqual(h.goCalls,[],'影片播放期间不应推进剧情');
  assert.equal(h.videos.length,1);
  assert.equal(h.videos[0].src,ENDING_SRC);
  assert.equal(h.videos[0].playCalls,1);
  assert.equal(h.body.children.length,1,'应挂上全屏影片层');
  assert.equal(h.assets.audio.pauseCalls,1,'播放期间暂停 BGM');
});

test('影片播完才推进后续剧情并结算通关标记',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:true,hp:12,maxHp:40,timeMs:1000,reachedAct:7,reducedMotion:true,bossMode:'play'});
  h.videos[0].dispatch('ended');
  assert.deepEqual(h.goCalls,['AFTER_BOSS']);
  assert.equal(h.state.flags.BOSS_ILY_CLEAR,true);
  assert.equal(h.state.flags.BATTLE_MODE,'play');
  assert.equal(h.state.flags.BOSS_ILY_HP,12);
  assert.equal(h.body.children.length,0,'影片层要被清理');
  assert.equal(h.assets.playCalls,1,'结束后恢复 BGM');
});

test('影片缺失或解码失败时兜底推进，不会卡死',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:true,hp:40,maxHp:40,timeMs:1000,reachedAct:7,reducedMotion:true,bossMode:'play'});
  h.videos[0].dispatch('error');
  assert.deepEqual(h.goCalls,['AFTER_BOSS']);
  assert.equal(h.body.children.length,0);
});

test('可以跳过影片直接进入后续剧情',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:true,hp:40,maxHp:40,timeMs:1000,reachedAct:7,reducedMotion:true,bossMode:'play'});
  const skip=h.videos[0].parentNode.children.find(c=>c.className==='boss-ending-skip');
  assert.ok(skip,'应提供跳过按钮');
  skip.dispatch('click');
  assert.deepEqual(h.goCalls,['AFTER_BOSS']);
});

test('剧情模式跳过战斗不播放影片',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:false,skip:true,hp:0,maxHp:40,timeMs:0,reachedAct:3,reducedMotion:true,bossMode:'story'});
  assert.equal(h.videos.length,0,'未真正通关不应播放 ending');
  assert.deepEqual(h.goCalls,['AFTER_BOSS']);
  assert.equal(h.state.flags.BOSS_ILY_CLEAR,false);
  assert.equal(h.state.flags.BATTLE_MODE,'story');
});

test('战斗失败不播放影片，保留重试入口',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:false,hp:0,maxHp:40,timeMs:5000,reachedAct:4,reducedMotion:true,bossMode:'play'});
  assert.equal(h.videos.length,0);
  assert.deepEqual(h.goCalls,[]);
  assert.equal(h.intro.hidden,false,'失败后应重新显示重试入口');
});

test('卸载时清理影片层与定时器',async()=>{
  const h=await mount();
  h.post({type:'boss:end',win:true,hp:40,maxHp:40,timeMs:1000,reachedAct:7,reducedMotion:true,bossMode:'play'});
  assert.equal(h.body.children.length,1);
  h.dispose();
  assert.equal(h.body.children.length,0);
  assert.equal(h.videos[0].pauseCalls,1);
});
