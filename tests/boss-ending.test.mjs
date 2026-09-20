import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function mount(protocol='http:', origin='http://ily.test') {
  const sent=[],goCalls=[],videos=[],listeners={},timers=new Map(); let timerId=0,menuOpen=false,observe;
  function makeNode(tag){
    const n={tagName:tag,children:[],style:{},hidden:false,listeners:{},
      append(...kids){for(const c of kids){c.parentNode=n;n.children.push(c);}},
      replaceChildren(...kids){n.children=[];n.append(...kids);},
      remove(){if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(c=>c!==n);},
      setAttribute(){},addEventListener(t,f){(n.listeners[t]??=[]).push(f);},
      dispatch(t,e={}){for(const f of n.listeners[t]||[])f(e);}
    };
    if(tag==='video')videos.push(n);
    if(tag==='iframe')n.contentWindow={postMessage:(data,origin)=>sent.push({data,origin})};
    return n;
  }
  const document={body:makeNode('body'),hidden:false,createElement:makeNode,
    querySelector:()=>menuOpen?{}:null,addEventListener(){},removeEventListener(){}};
  const window={addEventListener(t,f){listeners[t]=f;},removeEventListener(t){delete listeners[t];}};
  const context=vm.createContext({ILY:{},document,window,location:{origin,protocol},console,
    MutationObserver:class{constructor(f){observe=f;}observe(){}disconnect(){}},
    setTimeout(f){timers.set(++timerId,f);return timerId;},clearTimeout(id){timers.delete(id);}});
  for(const file of ['core/dom.js','modes/boss.js'])vm.runInContext(await readFile(new URL('../game/src/'+file,import.meta.url),'utf8'),context);
  const state={flags:{}},stage=makeNode('section');
  const assets={enabled:true,musicVolume:.4,masterVolume:.5,audio:{pause(){}},playCalls:0,play(){this.playCalls++;}};
  const dispose=context.ILY.mountBoss({stage,state,node:{next:'fin_s04'},go:id=>goCalls.push(id),assets});
  const panel=stage.children[0],frame=panel.children[0],intro=panel.children[1];
  const post=(data,extra={})=>listeners.message?.({source:frame.contentWindow,origin:protocol==='file:'?'null':origin,data,...extra});
  return {sent,goCalls,videos,state,stage,assets,dispose,frame,intro,post,timers,
    menu(value){menuOpen=value;observe();}};
}

for(const [protocol,origin,target] of [['http:','http://ily.test','http://ily.test'],['file:','file://','*'],['file:','null','*']]){
  test(`${protocol} ${origin}: handshake hides fallback and configures audio`,async()=>{
    const h=await mount(protocol,origin);
    assert.equal(h.frame.src,'minigames/boss/final-release/index.html?embed=1');
    h.frame.dispatch('load');assert.equal(h.sent.at(-1).data.type,'boss:hello');assert.equal(h.sent.at(-1).origin,target);
    h.post({type:'boss:ready'});assert.equal(h.intro.hidden,true);assert.equal(h.timers.size,0);
    assert.equal(h.sent.at(-1).data.type,'boss:configure');assert.equal(h.sent.at(-1).data.musicVolume,.2);
    h.menu(true);assert.equal(h.sent.at(-1).data.paused,true);
    h.menu(false);assert.equal(h.sent.at(-1).data.paused,false);
    h.dispose();assert.equal(h.assets.playCalls,1);assert.equal(h.stage.children.length,0);
  });
  test(`${protocol} ${origin}: skip continues to fin_s04 exactly once`,async()=>{
    const h=await mount(protocol,origin);h.post({type:'boss:ready'});
    h.post({type:'boss:end',skip:true});h.post({type:'boss:end',skip:true});
    assert.deepEqual(h.goCalls,['fin_s04']);assert.equal(h.state.flags.BOSS_ILY_SKIPPED,true);
    assert.equal(h.state.flags.BOSS_ILY_CLEAR,false);assert.equal(h.videos.length,0);h.dispose();
  });
}
test('unrelated windows and foreign origins cannot ready or complete the battle',async()=>{
  const h=await mount('file:','file://');
  h.post({type:'boss:ready'},{source:{}});assert.equal(h.intro.hidden,false);
  h.post({type:'boss:ready'},{origin:'https://unrelated.test'});assert.equal(h.intro.hidden,false);
  h.post({type:'boss:ready'});h.post({type:'boss:end',win:true},{source:{}});assert.deepEqual(h.goCalls,[]);h.dispose();
});
test('child completion advances directly without replaying the old ending video',async()=>{
  const h=await mount();h.post({type:'boss:ready'});
  h.post({type:'boss:end',win:false});assert.deepEqual(h.goCalls,[]);
  h.post({type:'boss:end',win:true,hp:12,timeMs:445668,reachedAct:7,difficulty:'normal'});
  assert.deepEqual(h.goCalls,['fin_s04']);assert.equal(h.state.flags.BOSS_ILY_CLEAR,true);
  assert.equal(h.state.flags.BOSS_ILY_DIFFICULTY,'normal');assert.equal(h.state.flags.BOSS_ILY_TIME,445668);
  assert.equal(h.videos.length,0);h.dispose();
});
test('loading failure still offers direct story continuation',async()=>{
  const h=await mount();for(const f of [...h.timers.values()])f();
  assert.match(h.intro.children[0].textContent,/无法加载/);
  h.intro.children.at(-1).dispatch('click');assert.deepEqual(h.goCalls,['fin_s04']);h.dispose();
});