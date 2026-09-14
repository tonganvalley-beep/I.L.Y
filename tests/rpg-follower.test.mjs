import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({ILY:{}});
vm.runInContext(await readFile(new URL('../game/src/modes/rpg.js',import.meta.url),'utf8'),context);
const create=context.ILY.createRpgFollower;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('Follower moves every frame at the same speed and gap across frame rates',()=>{
  for(const fps of [25,30,60,120,144]){
    const f=create({x:0,y:0},{x:-1.05,y:0});
    for(let i=1;i<=fps*3;i++){
      const previous=f.x;f.update({x:i*3.8/fps,y:0});
      close(f.x-previous,3.8/fps);close(i*3.8/fps-f.x,1.05);
      assert.equal(f.walking,true);assert.equal(f.facing,'right');
    }
  }
});
test('Follower preserves corners instead of cutting diagonally through walls',()=>{
  const f=create({x:0,y:0});
  for(let i=1;i<=20;i++)f.update({x:i/10,y:0});
  for(let i=1;i<=20;i++){
    f.update({x:2,y:i/10});
    if(i/10<=1.05){close(f.y,0);close(f.x,2+i/10-1.05);}
    else{close(f.x,2);close(f.y,i/10-1.05);assert.equal(f.facing,'front');}
  }
});
test('Stopping and restarting never oscillates or teleports; map reset drops old trail',()=>{
  const f=create({x:0,y:0});
  for(let i=1;i<=100;i++)f.update({x:i/20,y:0});
  const x=f.x;
  for(let i=0;i<240;i++){f.update({x:5,y:0});close(f.x,x);assert.equal(f.walking,false);}
  f.update({x:5.03,y:0});close(f.x,x+.03);
  const next=create({x:30,y:20},{x:30,y:21.05});
  next.update({x:30.05,y:20});close(next.x,30);close(next.y,21);
});
test('Reversing follows recorded footsteps and returns to idle without jitter',()=>{
  const f=create({x:0,y:0},{x:-1.05,y:0});
  for(let i=1;i<=60;i++)f.update({x:i*.05,y:0});
  for(let i=1;i<=60;i++){
    const x=f.x;f.update({x:3-i*.05,y:0});assert.ok(Math.abs(f.x-x)<=.050000001);
  }
  assert.equal(f.facing,'left');f.update({x:0,y:0});assert.equal(f.walking,false);
});
