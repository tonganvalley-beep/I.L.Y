(() => {
'use strict';
function prepareChapter1() {
  const prologue = ILY.data.stories.prologue, chapter = ILY.data.stories.chapter1;
  const story = {...prologue, chapters:['prologue','chapter1'], nodes:{...prologue.nodes,...chapter.nodes}};
  story.nodes.finale = {...story.nodes.finale,next:chapter.start};
  return story;
}
function enterChapterNode(state,node) {
  state.chapter=node.chapter || 'prologue';
  if (state.chapter!=='chapter1') return;
  for (const route of ['A','B','C']) state.flags[route+'_FLAG']=state.flags.route===route;
  if(node.clue && state.flags.B_FLAG) ILY.addClue(state,node.clue);
  if(node.continuation) state.flags.nextChapter=node.continuation;
}
function rpgProgress(state,task) {
  state.flags.rpg ||= {};
  return state.flags.rpg[task] ||= {collected:[],visited:[],elapsed:0,done:false};
}
function activeRpgEvents(map,task) { return map.events.filter(e=>!e.task || e.task===task); }
function interactRpg(state,task,event) {
  const p=rpgProgress(state,task), key=event.id;
  if (event.kind==='collect' || event.kind==='clue') {
    if(!p.collected.includes(key)) p.collected.push(key);
    if(task==='G1') {state.flags.CLEAN_NUM=p.collected.length; if(p.collected.length>=3) p.done=true;}
    if(task==='G3') state.flags.HANDLE_NUM=p.collected.length;
    if(task==='G5') state.flags.G5_CLUE=[...p.collected];
  }
  if(event.kind==='shop') {state.flags.G4_CHOICE=event.text;p.choice=event.text;}
  if(event.kind==='scream') {state.flags.G5_SCREAM=true;}
  if(event.kind==='finish') {
    if(task==='G3' && p.collected.length<2) return '手柄还没找齐。再看看抽屉和床底。';
    if(task==='G4' && !p.choice) return '先在货架或冰柜挑选想吃的东西吧。';
    p.done=true;
  }
  if(event.kind==='reunion') {
    if(!p.collected.includes('photo') || !p.collected.includes('isopod')) return '先找找拍照的地方和大王具足虫展区。';
    p.done=true;
  }
  if(p.done) state.flags[task+'_DONE']=true;
  if(task==='G2' && p.done) state.flags.G2_TRIGGER=true;
  return event.text || (task==='G4' ? `买好了${p.choice}。“爱理”抱紧了购物袋。` : '可以继续了。');
}
function finishRpgAutomatically(state,task) {
  const p=rpgProgress(state,task);
  if(task==='G1') p.collected=['floor','desk','shelf'];
  if(task==='G3') p.collected=['handle1','handle2'];
  if(task==='G4') {p.choice ||= '海鲜杯面';state.flags.G4_CHOICE=p.choice;}
  if(task==='G5') {p.collected=[...new Set([...p.collected,'photo','isopod','phone'])];state.flags.G5_SCREAM=true;state.flags.G5_CLUE=[...p.collected];}
  if(task==='G1') state.flags.CLEAN_NUM=3;
  if(task==='G2') state.flags.G2_TRIGGER=true;
  if(task==='G3') state.flags.HANDLE_NUM=2;
  p.done=true;state.flags[task+'_DONE']=true;
}
Object.assign(ILY,{prepareChapter1,enterChapterNode,rpgProgress,activeRpgEvents,interactRpg,finishRpgAutomatically});
})();
