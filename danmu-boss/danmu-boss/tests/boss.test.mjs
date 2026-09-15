import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harness} from './harness.mjs';
test('all seven acts complete, advanced mechanisms appear, finale has healing words only',async()=>{
  for(const seed of [3,23,91]){
    const {api:a}=await harness(seed);a.startGame();a.G.maxhp=400;a.G.hp=400;
    const seen=Array.from({length:7},()=>new Set());let count=0;
    while(!a.victory&&count++<18000){
      a.step(1,true);
      for(const b of a.bullets)if(b.active){
        seen[a.act].add(b.type);
      if(a.act===6){
        assert.ok(!(b.heal>0&&!b.isWord),'finale must not emit normal healing bullets');
        if(b.isWord)seen[6].add(b.heal?'healWord':'attackWord');
      }
      }
      if(a.lasers.length)seen[a.act].add('laser');
      if(count%120===0)a.draw();
    }
    assert.ok(a.victory,'all stages must reach victory');
    assert.equal(a.finalEmit,48);
    assert.equal(count,9000,'a successful attempt lasts 300 seconds at 30Hz');
    assert.equal(a.elapsed,18000);
    assert.ok(seen[0].has('ring'));assert.ok(!seen[0].has('laser'));
    for(const kind of ['fire','bone','laser'])assert.ok(seen[2].has(kind),kind);
    for(const kind of ['ambush','bubble','laser'])assert.ok(seen[4].has(kind),kind);
    for(const kind of ['ring','healWord','attackWord'])assert.ok(seen[6].has(kind),kind);
  }
});
test('transition is smooth, harmless, preserves HP and clears hazards',async()=>{
  const {api:a}=await harness();a.reset();a.G.hp=17;a.inv=0;
  a.spawn({x:a.heart.x,y:a.heart.y,dmg:99});
  a.spawnLaser({x:a.box.x1,y:a.heart.y,angle:0,warn:0,fire:300});
  const old=a.heart.x;a.beginTransition();a.damage(99);a.step(27);
  assert.equal(a.G.hp,17);assert.ok(a.transition);assert.ok(a.heart.x<old&&a.heart.x>320);
  a.step(27);assert.equal(a.act,1);assert.equal(a.G.hp,17);
  assert.ok(!a.transition);assert.equal(a.bullets.filter(b=>b.active).length,0);
  assert.equal(a.lasers.length,0);assert.equal(a.warnings.length,0);
  a.step(30);assert.equal(a.bullets.filter(b=>b.active).length,0,'new act has preparation time');
});
test('restarting keeps one RAF chain, resets state, and pause freezes time',async()=>{
  const h=await harness(),a=h.api;a.startGame();h.tick();a.startGame();a.startGame();
  assert.equal(h.frames.size,1);a.paused=true;const t=a.time;h.tick(200);assert.equal(a.time,t);
  a.paused=false;h.tick();assert.ok(a.time>t);
  a.G.maxhp=75;a.G.hp=1;a.beginTransition();a.startGame();
  assert.equal(a.G.maxhp,40);assert.equal(a.G.hp,40);assert.equal(a.act,0);assert.ok(!a.transition);
  assert.equal(h.frames.size,1);
});
test('damage, healing, word hitbox and laser warning retain gameplay semantics',async()=>{
  const {api:a}=await harness();a.reset();a.inv=0;
  a.damage(5);assert.ok(a.G.hp<40);const hp=a.G.hp;a.damage(5);assert.equal(a.G.hp,hp);
  a.inv=0;a.hurt(a.spawn({x:0,y:0,heal:2,dmg:0}));assert.ok(a.G.hp>hp);
  const [x,y]=a.hitEllipse({isWord:true,wordBase:18,wordScale:2,text:'四字词条'});
  assert.ok(x>y*2);
  a.reset();a.inv=0;const start=a.G.hp;
  a.spawnLaser({x:a.box.x1,y:a.heart.y,angle:0,len:560,warn:60,fire:60});
  a.step(29);assert.equal(a.G.hp,start);a.step(2);assert.ok(a.G.hp<start);
});
test('portable entry uses local assets and source is valid UTF-8',()=>{
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for(const file of ['game.js','index.html','style.css','scene-media.js'])decoder.decode(fs.readFileSync(new URL('../'+file,import.meta.url)));
  const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
  assert.ok(css.includes("./fonts/zpix.ttf"));assert.ok(!css.includes('../sign'));
  assert.ok(fs.statSync(new URL('../fonts/zpix.ttf',import.meta.url)).size>1000000);
  for(let i=1;i<=7;i++)assert.ok(fs.existsSync(new URL('../background/p'+i+'.png',import.meta.url)));
});

test('stage durations stay fixed across collection and bullet collisions',async()=>{
  const {api:a}=await harness(72);a.startGame();a.G.maxhp=400;a.G.hp=400;
  const counts=Array(7).fill(0),peaks=Array(7).fill(0);
  while(!a.victory){
    const idx=a.act;counts[idx]++;
    peaks[idx]=Math.max(peaks[idx],a.bullets.filter(b=>b.active&&!b.heal).length);
    // Simulate all bullets collected/avoided; this must not shorten or extend any act.
    for(const b of a.bullets)b.active=false;
    a.step(1,true);
    assert.ok(counts.reduce((n,v)=>n+v,0)<=9000);
  }
  assert.deepEqual(counts,[1314,774,1584,774,1854,774,1926]);
});
test('dangerous density rises by attack stage with bounded overlap',async()=>{
  const {api:a}=await harness(91);a.startGame();a.G.maxhp=400;a.G.hp=400;
  const peaks=Array(7).fill(0);
  while(!a.victory){
    const n=a.bullets.filter(b=>b.active&&!b.heal).length;
    peaks[a.act]=Math.max(peaks[a.act],n);
    assert.ok(n<=a.STAGES[a.act].cap);
    a.step(1,true);
  }
  assert.ok(peaks[0]<peaks[2]&&peaks[2]<peaks[4]&&peaks[4]<peaks[6],peaks.join(','));
});
test('word warning is harmless and curtain keeps its advertised opening',async()=>{
  const {api:a}=await harness();a.reset();a.inv=0;
  a.spawn({x:a.heart.x,y:a.heart.y,vx:0,vy:0,isWord:true,text:'warning',type:'word',
    arming:24,wordBase:14,wordScale:1,dmg:5});
  a.step(12);assert.equal(a.G.hp,40);a.step();assert.ok(a.G.hp<40);
  a.reset();a.enterAct(4);a.run(a.mechanicBurst,'curtain',1);a.step(1,true);
  const warn=a.warnings.find(w=>w.kind==='lane');assert.ok(warn);assert.ok(warn.gapHalf*2>=100);
  const gap=warn.x,half=warn.gapHalf;
  a.step(30,true);
  const row=a.bullets.filter(b=>b.active&&b.type==='ring');
  assert.ok(row.length>8);
  for(const b of row)assert.ok(Math.abs(b.x-gap)>=half+6);
});
test('finale has three sections and enough time for its last attacks to expire',async()=>{
  const {api:a}=await harness();a.reset();a.enterAct(6);a.G.maxhp=400;a.G.hp=400;
  let remainingAtEnd;
  for(let i=0;i<1926;i++){
    if(i===1925)remainingAtEnd={bullets:a.bullets.filter(b=>b.active).length,lasers:a.lasers.length,routines:a.routines.length};
    a.step(1,true);
  }
  assert.equal(a.finalEmit,48);assert.ok(a.victory);
  assert.deepEqual(remainingAtEnd,{bullets:0,lasers:0,routines:0});
  const events=a.makeTimeline(6);assert.equal(events.length,48);
  assert.ok(events.at(-1).at<60*58);
});

test('late hits have weight and the clock stays stable across display refresh rates',async()=>{
  const {api:a}=await harness();a.reset();a.enterAct(4);a.G.hp=10;a.inv=0;
  a.damage(4);assert.equal(a.G.hp,8);
  for(const fps of [15,60,144]){
    const h=await harness();h.api.startGame();
    for(let i=0;i<fps*10;i++)h.tick(1000/fps);
    assert.ok(Math.abs(h.api.elapsed-600)<=2,'clock at '+fps+' FPS');
    h.api.paused=true;const before=h.api.elapsed;
    for(let i=0;i<fps;i++)h.tick(1000/fps);
    assert.equal(h.api.elapsed,before);
  }
});

test('five minutes contain real additional waves with continuous firing and higher density',async()=>{
  const {api:a,emitted}=await harness(23);a.startGame();a.G.maxhp=400;a.G.hp=400;
  const expected=[16,12,24,12,33,12,48],waves=Array(7).fill(0);
  const pressure=Array(7).fill(0),frames=Array(7).fill(0);
  while(!a.victory){
    if(!a.transition){
      pressure[a.act]+=a.bullets.filter(b=>b.active&&!b.heal).length;
      frames[a.act]++;
    }
    a.step(1,true);
    waves[a.act]=Math.max(waves[a.act],a.act===6?a.finalEmit:a.wave);
  }
  assert.deepEqual(waves,expected,'every counted wave must actually run');
  for(let i=0;i<7;i++){
    assert.equal(a.makeTimeline(i).length,expected[i]);
    const wordWaves=i===6?expected[i]:a.ACTS[i].words.length;
    const minWords=wordWaves*(i===6?2:4),maxWords=wordWaves*(i===6?4:6);
    assert.ok(emitted[i].words>=minWords&&emitted[i].words<=maxWords,'full word bursts in act '+(i+1));
  }
  for(const [idx,minimum,oldAverage,factor] of [[0,600,9.1,2.5],[2,1200,9.3,3],[4,1900,14,3],[6,3300,27,2]]){
    assert.ok(emitted[idx].ordinary>=minimum,'real projectile emissions in act '+(idx+1));
    assert.ok(pressure[idx]/frames[idx]>=oldAverage*factor,'sustained pressure in act '+(idx+1));
    assert.ok(a.STAGES[idx].speed>=1,'no slow-motion attack speed');
    assert.ok(a.STAGES[idx].wordGap<=12,'continuous word firing');
  }
  for(const [idx,maxGap] of [[0,144],[2,114],[4,100],[6,72]]){
    const events=a.makeTimeline(idx);
    for(let i=1;i<events.length;i++)assert.ok(events[i].at-events[i-1].at<=maxGap);
  }
});

test('each act delivers its sentence up front, alternates with bullets, then sustains bullet-only waves',async()=>{
  for(const seed of [3,23,91]){
    const {api:a,emissions}=await harness(seed);a.startGame();a.G.maxhp=400;a.G.hp=400;
    a.step(9000,true);
    assert.ok(a.victory);
    for(let idx=0;idx<6;idx++){
      const act=a.ACTS[idx],events=a.makeTimeline(idx),log=emissions.filter(e=>e.act===idx);
      const words=log.filter(e=>e.isWord),ordinary=log.filter(e=>!e.isWord);
      const phrases=words.filter((e,i)=>i===0||e.text!==words[i-1].text);
      assert.deepEqual(phrases.map(e=>e.text),Array.from(act.words),'sentence order, once per phrase');
      assert.ok(words.at(-1).at<600,'all phrases finish within the first ten seconds');
      for(let i=0;i<phrases.length;i++){
        const next=phrases[i+1]?.at??events[act.words.length].at;
        assert.ok(next-phrases[i].at<=144,'next phrase or bullet section starts within 2.4 seconds');
        const cluster=words.filter(e=>e.text===phrases[i].text);
        assert.ok(cluster.length>=4&&cluster.length<=6,'one complete word cluster per phrase');
        assert.ok(ordinary.some(e=>e.at>phrases[i].at&&e.at<next),'real bullets between different phrases');
      }
      const continuation=events.slice(act.words.length);
      assert.ok(continuation.length>=8);
      for(const ev of continuation){
        assert.equal(ev.words,false);
        assert.equal(ev.phrase,-1);
        assert.ok(ordinary.filter(e=>e.at>=ev.at&&e.at<ev.at+a.STAGES[idx].waveEvery).length>=a.STAGES[idx].ring*2,
          'continued volleys after the dialogue in act '+(idx+1));
      }
      assert.ok(words.every(e=>e.at<continuation[0].at),'no late repeated dialogue');
      assert.ok(ordinary.every(e=>act.mode==='heal'?(e.heal>0||e.maxhpUp>0):e.heal===0),'preserve healing and attack identities');
    }
    a.startGame();a.G.maxhp=400;a.G.hp=400;
    assert.equal(a.phrase,0);assert.equal(a.wave,0);
    a.step(39,true);assert.equal(a.phrase,0);assert.equal(a.wave,1);
  }
});
