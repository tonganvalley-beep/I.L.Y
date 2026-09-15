import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),c=vm.createContext({});c.window=c;
for(const file of ['src/bootstrap.js','data/assets.js','data/chapter-assets.js','data/map-assets.js','data/story/prologue.js','data/story/chapter1.js','data/story/chapter2.js','data/story/chapter3.js','data/story/heroine.js','data/story/final.js','data/maps/classroom.js','data/maps/chapter1-bundle.js','data/maps/chapters-bundle.js','src/core/state.js','src/core/chapter1.js'])vm.runInContext(await readFile(new URL('game/'+file,root),'utf8'),c);
const I=c.ILY,story=I.prepareChapter1(),maps={...I.data.maps,...I.data.chapter1Maps,...I.data.chapterMaps};
function traverse(route,n2,n3,n4){
 const state=I.createState('ch1_s01'),seen=new Set();let id=state.node;
 while(id){
  assert.ok(story.nodes[id],id);assert.ok(!seen.has(id),'cycle '+id);seen.add(id);const n=story.nodes[id];
  if((n.route&&state.flags.route!==n.route)||(n.when&&state.flags[n.when.key]!==n.when.value)){id=n.next;continue;}
  state.node=id;I.enterChapterNode(state,n);
  if(n.type==='choice'){
   const value={route,n2,n3,n4}[n.choices[0].flag.key];
   const ch=n.choices.find(ch=>ch.flag.value===value)||n.choices[0];state.flags[ch.flag.key]=ch.flag.value;id=ch.next;
  }else id=n.next;
 }
 return {state,seen};
}
test('Every chapter node and gameplay target resolves; no document production notes reach dialogue',()=>{
 for(const [id,n]of Object.entries(story.nodes)){
  for(const target of [n.next,...(n.choices||[]).map(ch=>ch.next)].filter(Boolean))assert.ok(story.nodes[target],id+' -> '+target);
  if(n.type==='rpg')assert.ok(maps[n.map],id);
  if(['chapter2','chapter3','heroine','final'].includes(n.chapter))assert.doesNotMatch(n.text||'',/可玩化建议|事件蓝图|策划注|制作注|待评审|接口段|兜底|存活变量|网页直连|女主视角重述/);
 }
});
test('All branch combinations reach the correct ending without leaking other ending scenes',()=>{
 for(const route of ['A','B','C'])for(const n2 of ['A','B'])for(const n3 of ['buy','stay'])for(const n4 of ['A','B']){
  const {state,seen}=traverse(route,n2,n3,n4);
  const expected=route!=='C'&&n3==='stay'?'ENDING_JUST2':n4==='B'?'ENDING_REALITY':'ENDING_TRUE';
  assert.equal(state.flags[expected],true);
  assert.equal(!!seen.has('fin_s03'),expected==='ENDING_TRUE');
  if(expected==='ENDING_JUST2'){assert.ok(!seen.has('ch2_s08'));assert.ok(!seen.has('ch3_s01'));}
  if(expected==='ENDING_REALITY'){assert.ok(!seen.has('her_chapter_prologue'));assert.ok(!seen.has('fin_s01'));}
  if(expected==='ENDING_TRUE'){
    assert.ok(seen.has('her_chapter_prologue'));
    assert.ok(seen.has('her_scene_07_01'));
    assert.equal(state.flags.HEROINE_POV_STARTED,true);
    assert.equal(state.flags.HEROINE_POV_COMPLETE,true);
  }
  if(route==='C')assert.ok(!seen.has('ch2_s01'));
  I.validateSave(JSON.parse(JSON.stringify(state)),story,maps);
 }
});

test('Heroine-view labels retain their distinct presentation and production semantics',()=>{
 const heroine=I.data.stories.heroine,entries=Object.entries(heroine.nodes),nodes=entries.map(([,node])=>node);
 assert.equal(heroine.start,'her_chapter_prologue');
 assert.equal(nodes.length,514);
 assert.equal(nodes.filter(node=>node.type==='monologue').length,48);
 assert.equal(nodes.filter(node=>node.type==='heroine-card').length,53);
 assert.equal(nodes.filter(node=>node.checkpoint&&node.type==='heroine-card').length,53);
 assert.ok(nodes.some(node=>node.speaker==='ILY（心声）'));
 assert.ok(nodes.some(node=>node.production?.direction?.length));
 assert.ok(nodes.some(node=>node.production?.bgm?.length));
 assert.ok(nodes.some(node=>node.production?.sfx?.length));
 for(const [id,node] of entries){
  assert.ok(node.background,id+' background');
  assert.doesNotMatch(node.text||'',/^【(?:背景|立绘|BGM|SE|特效|演出)】|^※|^——/);
  for(const image of [node.background,node.portrait,...(node.characters||[]).map(item=>item.image)].filter(Boolean))assert.ok(Object.hasOwn(I.data.assets.images,image),id+' image '+image);
 }
 assert.equal(nodes.at(-1).next,'fin_s01');
});
test('Chapter-two shared clues are collected on every route that reaches the scene',()=>{
 for(const route of ['A','B'])for(const n2 of ['A','B']){
  const {state,seen}=traverse(route,n2,'buy','A');
  assert.ok(seen.has('ch2_082'));
  for(const clue of ['P15','P13'])assert.ok(state.clues.includes(clue),`${route}/${n2}: ${clue}`);
  I.enterChapterNode(state,story.nodes.ch2_082);
  for(const clue of ['P15','P13'])assert.equal(state.clues.filter(id=>id===clue).length,1);
 }
});

test('All supplied chapter-two images are used by dialogue or investigations and exist',async()=>{
 const ids=new Set();
 for(const n of Object.values(story.nodes))for(const id of [n.background,n.cg,n.portrait,n.overlay].filter(Boolean))ids.add(id);
 for(const m of Object.values(maps))for(const e of m.events||[])if(e.preview)ids.add(e.preview);
 const supplied=Object.entries(I.data.assets.images).filter(([,path])=>/^assets\/images\/(?:backgrounds|cg)\/ch2-.*\.jpg$/.test(path));
 assert.equal(supplied.length,16);
 for(const [id,path]of supplied){assert.ok(ids.has(id),'unused '+id);await access(new URL('game/'+path,root));}
 for(const id of ids)assert.ok(Object.hasOwn(I.data.assets.images,id),'unregistered '+id);
});
test('Every new JSON event is walkable and reachable; scenery footprints match collision blocks',async()=>{
 const source=JSON.parse(await readFile(new URL('game/data/maps/chapters.json',root),'utf8'));
 assert.deepEqual(JSON.parse(JSON.stringify(I.data.chapterMaps)),source);
 for(const m of Object.values(source)){
  assert.ok(I.canStandRpg(m,m.spawn.x,m.spawn.y));const q=[m.spawn],seen=new Set();
  for(let i=0;i<q.length;i++){const p=q[i],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);for(const [x,y]of [[p.x+1,p.y],[p.x-1,p.y],[p.x,p.y+1],[p.x,p.y-1]])if(I.canWalk(m,x,y))q.push({x,y});}
  for(const e of m.events)assert.ok(seen.has(e.x+','+e.y),m.id+':'+e.id);
  for(const o of m.objects)for(let y=o.y;y<o.y+o.h;y++)for(let x=o.x;x<o.x+o.w;x++)assert.equal(m.tiles[y][x],'F');
 }
});
test('New RPG tasks are independently saved, gated, idempotent and support automatic completion',()=>{
 const state=I.createState('ch2_g2');I.enterChapterNode(state,story.nodes.ch2_g2);
 const n=story.nodes.ch2_g2,events=maps[n.map].events;
 I.interactRpg(state,n.task,events[0],n);I.interactRpg(state,n.task,events[0],n);
 assert.equal(I.rpgProgress(state,n.task).collected.length,1);assert.equal(I.rpgProgress(state,n.task).done,false);
 for(const e of events.slice(1))I.interactRpg(state,n.task,e,n);
 assert.equal(I.rpgProgress(state,n.task).done,true);
 assert.equal(I.rpgProgress(state,'G2').done,false);
 for(const n of Object.values(story.nodes).filter(n=>n.type==='rpg'&&n.task.startsWith('CH'))){I.finishRpgAutomatically(state,n.task,n);assert.equal(I.rpgProgress(state,n.task).done,true);}
 state.maps['ch2-flowers']={x:10.2,y:15.1};
 assert.doesNotThrow(()=>I.validateSave(JSON.parse(JSON.stringify(state)),story,maps));
});
