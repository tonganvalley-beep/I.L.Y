import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../danmutest/game.js',import.meta.url),'utf8');
function setup(duration){
 const frames=new Map(),listeners=new Map(),fields=new Map();let now=0,id=0,seed=7;const results=[];
 const field=()=>({style:{},classList:{toggle(){},remove(){},add(){}},textContent:''});
 const root={querySelector:selector=>{if(!fields.has(selector))fields.set(selector,field());return fields.get(selector);}};
 const ctx=new Proxy({},{get:()=>()=>{}}),canvas={width:640,height:480,getContext:()=>ctx};
 const c=vm.createContext({document:{getElementById:()=>null,addEventListener(){},removeEventListener(){}},performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:i=>frames.delete(i)});
 c.window=c;c.addEventListener=(k,fn)=>listeners.set(k,fn);c.removeEventListener=k=>listeners.delete(k);
 vm.runInContext(source,c);vm.runInContext('Math.random = () => { return nextRandom(); }',Object.assign(c,{nextRandom:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)}));
 const engine=c.ILYDanmu.create({canvas,root,duration,onFinish:won=>results.push(won)});
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
