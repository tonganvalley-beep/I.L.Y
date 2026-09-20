import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),c=vm.createContext({});c.window=c;
for(const file of ['src/bootstrap.js','data/assets.js','data/chapter-assets.js','data/map-assets.js','data/story/prologue.js','data/story/chapter1.js','data/story/chapter2.js','data/story/chapter3.js','data/story/heroine.js','data/story/final.js','data/maps/classroom.js','data/maps/chapter1-bundle.js','data/maps/chapters-bundle.js','src/core/state.js','src/core/chapter1.js'])vm.runInContext(await readFile(new URL('game/'+file,root),'utf8'),c);
const I=c.ILY,story=I.prepareChapter1(),maps={...I.data.maps,...I.data.chapter1Maps,...I.data.chapterMaps};
test('Embedded games preserve chapter text and survive story preparation and save roundtrips',()=>{
 const source=I.data.stories;
 const rebuilt=I.prepareChapter1();
 assert.equal(rebuilt.nodes.ch2_g2.next,'ch2_photo');
 assert.equal(rebuilt.nodes.ch2_photo.next,source.chapter2.nodes.ch2_g2.next);
 assert.equal(rebuilt.nodes.ch2_photo.chapter,'chapter2');
 assert.equal(rebuilt.nodes.ch1_battle.type,'computer');
 assert.equal(rebuilt.nodes.ch1_battle.next,'ch1_137');
 assert.equal(source.chapter1.nodes.ch1_battle.type,'battle');
 assert.equal(source.chapter2.nodes.ch2_g2.next,'ch2_119');
 for(const chapter of ['chapter1','chapter2','chapter3']){
  for(const [id,node]of Object.entries(source[chapter].nodes)){
   if(['ch1_end','ch1_c_end'].includes(id))continue;
   assert.equal(rebuilt.nodes[id].text,node.text,id+' preserves workspace dialogue');
  }
 }
 for(const id of ['ch1_battle','ch2_photo']){
  const state=I.createState(id);I.enterChapterNode(state,rebuilt.nodes[id]);
  state.flags.PHOTO_COMPLETED=true;state.flags.PHOTO_RESULT={score:42000,perfect:25,bestCombo:12,accuracy:.75};
  const saved=JSON.parse(JSON.stringify(state));I.validateSave(saved,rebuilt,maps);
  assert.equal(saved.node,id);assert.equal(saved.flags.PHOTO_RESULT.score,42000);
 }
});
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
test('Chapter-two handholding stays in Kio viewpoint without a player choice',()=>{
 const node=story.nodes.ch2_hand;
 assert.equal(node.type,'dialogue');
 assert.equal(node.speaker,'“爱理”');
 assert.equal(node.text,'……基生？她轻轻握住了他的手。');
 assert.equal(node.choices,undefined);
 assert.ok(!Object.values(story.nodes).some(node=>(node.choices||[]).some(choice=>choice.flag?.key==='CH2_HAND')));
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
 assert.equal(nodes.filter(node=>node.type==='monologue').length,96);
 assert.equal(nodes.filter(node=>node.type==='heroine-card').length,53);
 assert.equal(nodes.filter(node=>node.checkpoint&&node.type==='heroine-card').length,53);
 assert.ok(nodes.some(node=>node.type==='cue'));
 assert.ok(nodes.every(node=>!/(?:内心|心声)/.test(node.speaker||'')));
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
 assert.equal(supplied.length,17);
 for(const [id,path]of supplied){assert.ok(ids.has(id),'unused '+id);await access(new URL('game/'+path,root));}
 for(const id of ids)assert.ok(Object.hasOwn(I.data.assets.images,id),'unregistered '+id);
});
test('Ice-cream flavor routes to the matching full-screen CG',()=>{
 const pick=flavor=>{
  const state=I.createState('ch2_216');state.flags.CH2_ICE=flavor;
  let id='ch2_216';
  while(story.nodes[id].when&&state.flags[story.nodes[id].when.key]!==story.nodes[id].when.value)id=story.nodes[id].next;
  return story.nodes[id];
 };
 assert.equal(pick('草莓').cg,'ch2-ice');
 assert.equal(pick('香草').cg,'ch2-香草');
 assert.equal(pick('草莓').next,'ch2_216_vanilla');
 assert.equal(pick('香草').next,'ch2_s08');
 for(const id of ['ch2_216','ch2_216_vanilla'])assert.equal(story.nodes[id].backgroundFit,'cover');
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
