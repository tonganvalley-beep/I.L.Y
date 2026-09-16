import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
export async function harness(seed=1){
  let now=0,id=0;
  const frames=new Map(),elements=new Map(),listeners={};
  const emitted=Array.from({length:7},()=>({words:0,ordinary:0}));
  const emissions=[];
  const noop=()=>{};
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
  function element(){return {width:960,height:540,textContent:'',style:{},disabled:false,
    classList:{add:noop,remove:noop},getContext:()=>ctx,setAttribute:noop,
    addEventListener(k,fn){this[k]=fn;},append:noop,querySelector:()=>element()};}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const context=vm.createContext({Math:math,console,
    recordSpawn:(b,idx,at)=>{
      if(b.isWord)emitted[idx].words++;else if(!b.heal)emitted[idx].ordinary++;
      emissions.push({act:idx,at,isWord:b.isWord,text:b.text,heal:b.heal,maxhpUp:b.maxhpUp,maxhpDown:b.maxhpDown});
    },
    document:{getElementById:get,createElement:element,fonts:{load:()=>Promise.resolve([])}},
    performance:{now:()=>now},addEventListener:(k,fn)=>listeners[k]=fn,
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:n=>frames.delete(n),
    Image:class{constructor(){this.width=960;this.height=540;}set src(v){this.onload();}}
  });
  context.window=context;context.matchMedia=()=>({matches:false});
  const expose='globalThis.TEST={G,heart,box,keys,bullets,lasers,routines,warnings,ACTS,STAGES,TOTAL_TIME,makeTimeline,spawn,spawnLaser,damage,hurt,reset,enterAct,beginTransition,startGame,draw,hitEllipse,mechanicBurst,run,'+
    'step(n=1,safe=false){for(let i=0;i<n;i++){if(safe)invc=60;update();}},'+
    'get act(){return currentAct},get wave(){return actWaveCount},get phrase(){return currentPhrase},get elapsed(){return totalElapsed},get actElapsed(){return actElapsed},get gameOver(){return gameOver},get transition(){return transitioning},get victory(){return victory},get finalEmit(){return finalEmit},get intro(){return introTimer},'+
    'get paused(){return paused},set paused(v){paused=v},get time(){return visualTime},set inv(v){invc=v}};';
  const measured=source.replace('Object.assign(b, o, { active: true });','Object.assign(b, o, { active: true }); recordSpawn(b,currentAct,actElapsed);');
  if(measured===source)throw new Error('Spawn measurement hook missing');
  vm.runInContext(measured.replace(/\}\)\(\);\s*$/,expose+'})();'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {api:context.TEST,frames,listeners,elements,emitted,emissions,
    tick(ms=34){now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}};
}
