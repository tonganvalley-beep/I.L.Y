import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../game/src/engines/danmu.js',import.meta.url),'utf8');
function setup(duration,options={}){
 const frames=new Map(),listeners=new Map(),fields=new Map();let now=0,id=0,seed=7;const results=[];
 const field=()=>({style:{},classList:{toggle(){},remove(){},add(){}},textContent:''});
 const root={querySelector:selector=>{if(!fields.has(selector))fields.set(selector,field());return fields.get(selector);}};
 const ctx=new Proxy({},{get:()=>()=>{}}),canvas={width:640,height:480,getContext:()=>ctx};
 const c=vm.createContext({document:{getElementById:()=>null,addEventListener(){},removeEventListener(){}},performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:i=>frames.delete(i)});
 c.window=c;c.addEventListener=(k,fn)=>listeners.set(k,fn);c.removeEventListener=k=>listeners.delete(k);
 vm.runInContext(source,c);vm.runInContext('Math.random = () => { return nextRandom(); }',Object.assign(c,{nextRandom:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)}));
 const engine=c.ILYDanmu.create({canvas,root,duration,...options,onFinish:won=>results.push(won)});
 function tick(n){for(let i=0;i<n;i++){now+=1000/60;const jobs=[...frames.values()];frames.clear();for(const f of jobs)f(now);}}
 return {engine,tick,results,frames,listeners};
}
test('Shared danmutest engine wins once at duration, resets cleanly, and disposes RAF/input',()=>{
 const x=setup(.5);x.engine.start();x.tick(40);assert.deepEqual(x.results,[true]);x.tick(50);assert.deepEqual(x.results,[true]);
 x.engine.reset();assert.equal(x.engine.getSnapshot().elapsed,0);assert.equal(x.engine.getSnapshot().hp,20);assert.equal(x.engine.getSnapshot().bullets,0);
 x.engine.destroy();assert.equal(x.frames.size,0);assert.equal(x.listeners.size,0);
});
test('Paused time does not count toward tutorial completion',()=>{
 const x=setup(1);x.engine.start();x.tick(10);x.engine.setPaused(true);const elapsed=x.engine.getSnapshot().elapsed;x.tick(120);assert.equal(x.engine.getSnapshot().elapsed,elapsed);assert.deepEqual(x.results,[]);
 x.engine.setPaused(false);x.tick(70);assert.deepEqual(x.results,[true]);x.engine.destroy();
});
test('Original waves spawn and can lose; restart recovers HP and clears hazards',()=>{
 const x=setup(120);x.engine.start();x.tick(150);assert.ok(x.engine.getSnapshot().wave>0);assert.ok(x.engine.getSnapshot().bullets+x.engine.getSnapshot().lasers>0);
 x.tick(7200);assert.deepEqual(x.results,[false]);assert.equal(x.engine.getSnapshot().hp,0);
 x.engine.reset();assert.equal(x.engine.getSnapshot().gameOver,false);assert.equal(x.engine.getSnapshot().lasers,0);x.engine.destroy();
});

function blue(){return setup(1,{tutorial:'blue'});}
function settle(x){x.engine.start();x.tick(90);assert.equal(x.engine.getSnapshot().heart.grounded,true);}
function firstJump(x){x.engine.setJump(true);x.tick(15);x.engine.setJump(false);x.tick(80);assert.equal(x.engine.getSnapshot().lesson.step,1);}
function clearHurdle(x){
 let jumped=false;
 for(let i=0;i<1000;i++){
  const s=x.engine.getSnapshot(),o=s.lesson.obstacle;
  if(s.gameOver)return;
  if(o&&o.warn<=0&&!jumped&&o.x-s.heart.x<36&&o.x>s.heart.x){x.engine.setJump(true);jumped=true;}
  x.tick(1);
  if(jumped&&x.engine.getSnapshot().lesson.obstacle===null){x.engine.setJump(false);return;}
 }
 assert.fail('hurdle did not clear');
}
test('Blue lesson starts with gravity, waits for an actual jump and cannot be completed by waiting',()=>{
 const x=blue();settle(x);x.tick(600);let s=x.engine.getSnapshot();
 assert.equal(s.heart.mode,'blue');assert.equal(s.lesson.step,0);assert.equal(s.lesson.jumps,0);assert.deepEqual(x.results,[]);
 x.engine.setTarget({x:400,y:140});x.tick(100);s=x.engine.getSnapshot();assert.equal(s.heart.x,400);assert.equal(s.heart.y,344);
 x.engine.setTarget(null);firstJump(x);assert.equal(x.engine.getSnapshot().bullets,0);assert.equal(x.engine.getSnapshot().lasers,0);x.engine.destroy();
});
test('Blue short tap jumps lower than a held jump and cannot jump again in midair',()=>{
 function height(hold){const x=blue();settle(x);let top=344;x.engine.setJump(true);for(let i=0;i<60;i++){if(i===hold)x.engine.setJump(false);x.tick(1);top=Math.min(top,x.engine.getSnapshot().heart.y);}x.engine.destroy();return 344-top;}
 assert.ok(height(25)>55);assert.ok(height(2)<30);
 const x=blue();settle(x);x.engine.setJump(true);x.tick(8);x.engine.setJump(false);x.tick(2);x.engine.setJump(true);x.tick(2);assert.equal(x.engine.getSnapshot().lesson.jumps,1);x.engine.destroy();
});
test('Blue warning is harmless and a missed hurdle repeats without HP loss or advancement',()=>{
 const x=blue();settle(x);firstJump(x);x.tick(600);const s=x.engine.getSnapshot();
 assert.equal(s.hp,20);assert.equal(s.lesson.step,1);assert.equal(s.lesson.cleared,0);assert.deepEqual(x.results,[]);x.engine.destroy();
});
test('Blue low then high hurdles require jumps and complete once at 60 and 30 Hz',()=>{
 for(const fps of [60,30]){
  const x=blue();settle(x);if(fps===30)x.listeners.get('keydown')({code:'KeyF',preventDefault(){}});
  firstJump(x);clearHurdle(x);assert.equal(x.engine.getSnapshot().lesson.step,2);clearHurdle(x);
  assert.deepEqual(x.results,[true]);assert.equal(x.engine.getSnapshot().lesson.cleared,2);x.tick(120);assert.deepEqual(x.results,[true]);
  x.engine.reset();assert.equal(x.engine.getSnapshot().lesson.step,0);assert.equal(x.engine.getSnapshot().lesson.obstacle,null);assert.equal(x.engine.getSnapshot().lesson.jumps,0);assert.equal(x.engine.getSnapshot().gameOver,false);x.engine.destroy();
 }
});
test('Blue pauses freeze movement and hazards and release held jump input',()=>{
 const x=blue();settle(x);firstJump(x);x.tick(180);x.engine.setJump(true);x.engine.setPaused(true);
 const before=x.engine.getSnapshot();x.tick(180);assert.deepEqual(x.engine.getSnapshot(),before);
 x.engine.setPaused(false);x.tick(1);assert.equal(x.engine.getSnapshot().lesson.jumps,before.lesson.jumps);x.engine.destroy();assert.equal(x.frames.size,0);assert.equal(x.listeners.size,0);
});
