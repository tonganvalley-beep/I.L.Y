import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const c=vm.createContext({});c.window=c;
for(const file of ['src/bootstrap.js','src/core/state.js','src/core/saves.js','data/story/prologue.js','data/story/chapter1.js','data/maps/classroom.js','data/maps/chapter1-bundle.js','src/core/chapter1.js']) vm.runInContext(await readFile(new URL('../game/'+file,import.meta.url),'utf8'),c);
const I=c.ILY,story=I.prepareChapter1();Object.assign(I.data.maps,I.data.chapter1Maps);
const make=()=>{const s=I.createState('ch1_s01');I.enterChapterNode(s,story.nodes[s.node]);return s;};
test('Continuous movement is frame-rate independent, slides along walls, and cannot tunnel',()=>{
 const map=I.data.maps['ch1-room'];
 const a={x:8,y:8},b={...a};
 for(let i=0;i<60;i++)I.moveRpg(map,a,-3.8/60,0);
 for(let i=0;i<120;i++)I.moveRpg(map,b,-3.8/120,0);
 assert.ok(Math.abs(a.x-b.x)<1e-8);assert.ok(Math.abs(a.x-4.2)<1e-8);
 const c={x:8,y:8};I.moveRpg(map,c,100,0);assert.ok(c.x<16.32);assert.ok(I.canStandRpg(map,c.x,c.y));
 const d={x:13,y:5};I.moveRpg(map,d,2,1);assert.ok(d.x<13.7);assert.ok(d.y>5.9);
 const e={x:8,y:8};I.moveRpg(map,e,.04,.03);assert.equal(e.x,8.04);assert.equal(e.y,8.03);
});
test('Fractional positions survive saves; legacy integer positions stay valid',()=>{
 const s=make();s.maps['ch1-room']={x:13.125,y:12.8125};
 const saved=JSON.parse(JSON.stringify(s));I.validateSave(saved,story,I.data.maps);assert.equal(saved.maps['ch1-room'].x,13.125);
 s.maps['ch1-room']={x:13,y:13};assert.doesNotThrow(()=>I.validateSave(s,story,I.data.maps));
 for(const position of [{x:NaN,y:8},{x:Infinity,y:8},{x:11.49,y:5}])assert.throws(()=>I.validateSave({...s,maps:{'ch1-room':position}},story,I.data.maps));
});
test('JSON source equals the file preview bundle, and every event is reachable',async()=>{
 const maps=JSON.parse(await readFile(new URL('../game/data/maps/chapter1.json',import.meta.url),'utf8'));
 assert.deepEqual(JSON.parse(JSON.stringify(I.data.chapter1Maps)),maps);
 for(const map of Object.values(maps)){
  assert.equal(map.tiles.length,map.height);assert.ok(map.tiles.every(row=>row.length===map.width));
  const queue=[map.spawn],seen=new Set();
  for(let n=0;n<queue.length;n++){const p=queue[n],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);for(const [x,y]of [[p.x+1,p.y],[p.x-1,p.y],[p.x,p.y+1],[p.x,p.y-1]])if(I.canWalk(map,x,y))queue.push({x,y});}
  for(const e of map.events){assert.ok(seen.has(e.x+','+e.y),map.id+':'+e.id);if(e.to)assert.ok(maps[e.to]);}
 }
});
test('A/B/C routes terminate correctly; only B collects P1-P4; gameplay and content reachable',()=>{
 const all=new Set();
 for(const route of ['A','B','C']){
  const s=make(),visited=new Set();let id=story.nodes.finale.next;
  while(id){assert.ok(story.nodes[id],id);assert.ok(!visited.has(id),'cycle '+id);visited.add(id);all.add(id);const n=story.nodes[id];
   if(n.route && n.route!==route){id=n.next;continue;}
   s.node=id;I.enterChapterNode(s,n);
   if(n.type==='choice'){const ch=n.choices[['A','B','C'].indexOf(route)];s.flags.route=route;id=ch.next;}else id=n.next;
  }
  assert.equal(s.node,route==='C'?'ch1_c_end':'ch1_end');
  assert.deepEqual([...s.clues],route==='B'?['P1','P2','P3','P4']:[]);
  assert.equal(s.flags[route+'_FLAG'],true);
  if(route!=='C')for(const g of ['g1','g2','g3','g4','g5','battle'])assert.ok(visited.has('ch1_'+g));
 }
 assert.equal(all.size,Object.keys(I.data.stories.chapter1.nodes).length);
 const text=Object.values(I.data.stories.chapter1.nodes).map(n=>n.text||'').join('\n');
 for(const word of ['呼唤了我','LIME','最喜欢没有改变的基生','一直一直','跌倒在地'])assert.ok(text.includes(word),word);
 assert.ok(!text.includes('可玩化建议'));assert.ok(!text.includes('事件蓝图'));
});
test('Tasks gate progression, collect once, and automatic fallback persists complete state',()=>{
 const s=make(),room=I.data.maps['ch1-room'];
 assert.equal(room.art.background,'ch1-room-map');
 assert.ok(room.events.filter(e=>e.task==='G1').every(e=>e.image==='ch1-trash-pile'));
 for(const id of ['floor','floor','desk'])I.interactRpg(s,'G1',room.events.find(e=>e.id===id));
 assert.equal(s.flags.CLEAN_NUM,2);assert.equal(I.rpgProgress(s,'G1').done,false);
 I.interactRpg(s,'G1',room.events.find(e=>e.id==='shelf'));assert.equal(s.flags.G1_DONE,true);
 const pc=room.events.find(e=>e.id==='computer');I.interactRpg(s,'G3',pc);assert.equal(I.rpgProgress(s,'G3').done,false);
 for(const id of ['handle1','handle1','handle2'])I.interactRpg(s,'G3',room.events.find(e=>e.id===id));
 assert.equal(s.flags.HANDLE_NUM,2);I.interactRpg(s,'G3',pc);assert.equal(s.flags.G3_DONE,true);
 I.interactRpg(s,'G5',{id:'airi',kind:'reunion'});assert.equal(I.rpgProgress(s,'G5').done,false);
 for(const id of ['photo','isopod'])I.interactRpg(s,'G5',{id,kind:'clue'});
 I.interactRpg(s,'G5',{id:'airi',kind:'reunion'});assert.equal(s.flags.G5_DONE,true);
 for(const task of ['G1','G2','G3','G4','G5']){I.finishRpgAutomatically(s,task);assert.equal(s.flags[task+'_DONE'],true);}
 assert.equal(s.flags.G2_TRIGGER,true);assert.equal(s.flags.G5_SCREAM,true);
});
test('Chapter-one saves roundtrip map and progress; old prologue saves remain valid',()=>{
 const s=make();s.node='ch1_g3';s.maps['ch1-room']={x:13,y:13};I.interactRpg(s,'G3',{id:'handle1',kind:'collect'});
 const storage=new Map(),manager=new I.SaveManager({storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},username:'chapter-test',story,maps:I.data.maps,validateSave:I.validateSave});
 manager.save('1',1,s);const restored=manager.load('1',1);assert.equal(restored.flags.HANDLE_NUM,1);assert.equal(restored.maps['ch1-room'].x,13);
 assert.match(manager.inspect('1',1).record.meta.chapter,/第一章/);
 manager.save('1',2,I.createState('finale'));assert.equal(manager.load('1',2).node,'finale');
 assert.throws(()=>I.validateSave({...s,maps:{'ch1-room':{x:0,y:0}}},story,I.data.maps));
 assert.throws(()=>I.validateSave({...s,flags:{rpg:{G3:{collected:null}}}},story,I.data.maps));
});
