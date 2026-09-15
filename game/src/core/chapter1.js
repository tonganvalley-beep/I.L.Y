(() => {
'use strict';
function prepareChapter1() {
  const prologue = ILY.data.stories.prologue, chapter = ILY.data.stories.chapter1;
  const story = {...prologue, chapters:['prologue','chapter1'], nodes:{...prologue.nodes,...chapter.nodes}};
  story.nodes.finale = {...story.nodes.finale,next:chapter.start};
  for (const id of ['chapter2','chapter3','heroine','final']) {
    const extra=ILY.data.stories[id];
    if(extra){story.chapters.push(id);Object.assign(story.nodes,extra.nodes);}
  }
  if(ILY.data.stories.chapter2) story.nodes.ch1_end={...story.nodes.ch1_end,next:'ch2_s01',nextLabel:'进入第二章',text:'“爱理”倒下了。那一晚之后，天光再次照进出租屋。'};
  if(ILY.data.stories.chapter3) story.nodes.ch1_c_end={...story.nodes.ch1_c_end,next:'ch3_s02',nextLabel:'进入第三章',text:'基生一遍遍告诉自己，那只是一个噩梦。自那之后，“爱理”再也没有出现。日子又回到了空荡荡的房间。'};
  return story;
}
function enterChapterNode(state,node) {
  state.chapter=node.chapter || 'prologue';
  Object.assign(state.flags,node.setFlags||{});
  for(const [key,values] of Object.entries({n2:['A','B'],n3:['buy','stay'],n4:['A','B']})) {
    for(const value of values)state.flags[key.toUpperCase()+'_'+value.toUpperCase()+'_FLAG']=state.flags[key]===value;
  }
  if(node.ending)state.flags[node.ending]=true;
  if(node.achievement&&!state.flags.achievements.includes(node.achievement))state.flags.achievements.push(node.achievement);
  if(node.achievement==='One Last Kiss')state.flags.ACH_ONE_LAST_KISS=true;
  for(const clue of node.clues||[])ILY.addClue(state,clue);
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
function interactRpg(state,task,event,node={}) {
  const p=rpgProgress(state,task), key=event.id;
  if(task.startsWith('CH')) {
    if(['collect','clue'].includes(event.kind)&&!p.collected.includes(key))p.collected.push(key);
    if(event.flag)state.flags[event.flag]=event.value || event.text;
    if(event.kind==='finish'||(node.required?.length&&node.required.every(id=>p.collected.includes(id))))p.done=true;
    if(p.done)state.flags[task+'_DONE']=true;
    return event.text||'继续向前吧。';
  }
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
function finishRpgAutomatically(state,task,node={}) {
  const p=rpgProgress(state,task);
  if(task.startsWith('CH')) {
    p.collected=[...new Set([...p.collected,...(node.required||[])])];
    if(task==='CH2_G4')state.flags.CH2_ICE ||= '香草';
  }
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
