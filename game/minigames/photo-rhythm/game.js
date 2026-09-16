
(() => {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const BPM=134.88,BEAT=60/BPM,OFFSET=.413,DURATION=222.027,BASE_APPROACH=1.72;
  // 从用户提供的 30fps 全谱面录像中，以判定圈黄色 PERFECT 爆光逐帧提取。
  const REF_HITS=[11.766667,16.466667,24.3,25.2,26.033333,26.933333,29.4,29.666667,31.466667,32.366667,35,35.9,36.833333,37.266667,38.633333,39.5,44.433333,52.066667,52.5,54.733333,55.2,55.633333,56.5,58.233333,58.466667,58.766667,59.233333,60.1,65.566667,67.266667,69.2,69.466667,78.666667,78.9,79.766667,80.266667,80.666667,81.6,82.066667,82.5,84.866667,85.166667,85.833333,86.033333,90.633333,99.5,101.433333,107.333333,107.533333,108.933333,110.233333,110.666667,113.533333,113.8,114.5,114.7,119.166667,119.666667,120.066667,121.9,122.366667,123.366667,125.033333,129.966667,130.866667,132.2,133.633333,133.866667,134.066667,137.433333,138.966667];
  const keys=['D','F','J','K'],icons=['◇','◉','✦','⬡'],keyMap={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
  const colors=['#76d7ff','#a9f2db','#ff9fc0','#c8aeff'];
  const poses=['../../assets/images/characters/aili/微笑 (1).png','../../assets/images/characters/aili/困惑 (2).png','../../assets/images/characters/aili/歪头翘皮.png','../../assets/images/characters/aili/羞红.png'];
  const game=$('#game'),bgm=$('#bgm'),airi=$('#airi'),airiImg=$('#airiImg'),notesLayer=$('#notes'),fx=$('#fx'),flash=$('#flash'),focus=$('#focus'),judge=$('#judgement');
  const scoreEl=$('#score'),comboEl=$('#combo'),filmCount=$('#filmCount'),filmTotal=$('#filmTotal'),progress=$('#progress'),film=$('#film'),speaker=$('#speaker'),line=$('#line'),hint=$('#hint'),speedInput=$('#noteSpeed'),speedValue=$('#speedValue');
  let audioCtx=null,state='idle',beats=[],chart=[],beatIndex=-1,spawnIndex=0,missIndex=0,raf=0,score=0,combo=0,bestCombo=0,perfect=0,great=0,good=0,quality=0,totalPhotos=0,judgedPhotos=0;
  const visible=new Map(),activeHolds=new Map(),keysDown=new Set();

  function audio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}
  function shutterSound(){if(!audioCtx)return;const now=audioCtx.currentTime,b=audioCtx.createBuffer(1,audioCtx.sampleRate*.09,audioCtx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(audioCtx.sampleRate*.015));const s=audioCtx.createBufferSource(),g=audioCtx.createGain();s.buffer=b;g.gain.value=.12;s.connect(g).connect(audioCtx.destination);s.start(now)}

  function approachTime(){return BASE_APPROACH/Number(speedInput.value)}
  function addNote(time,lane,photo=false,source='support',hold=0){
    if(time<.6||time>DURATION-.5)return;
    if(chart.some(n=>Math.abs(n.time-time)<.035&&n.lane===lane))return;
    chart.push({id:chart.length,time,lane,photo,source,hold,judged:false})
  }
  function buildChart(duration){
    beats=[];chart=[];const count=Math.floor((duration-OFFSET)/BEAT),lanePattern=[0,2,1,3,1,2,0,3];
    for(let i=0;i<count;i++){const time=OFFSET+i*BEAT,phase=time/duration<.31?0:time/duration<.67?1:2;beats.push({time,index:i,phase})}
    const quant=t=>OFFSET+Math.round((t-OFFSET)/(BEAT/4))*(BEAT/4);
    const mapVideoTime=t=>t<87.5?t-8.825:t<107.5?t+48.475:t+80.725;
    const reference=REF_HITS.map(mapVideoTime).map(quant).filter(t=>t>.6&&t<duration-.5);
    reference.forEach((time,i)=>{
      const lane=lanePattern[i%lanePattern.length],photo=i%4===0,hold=i%10===5?BEAT*(i%20===5?3:2):0;addNote(time,lane,photo,'reference',hold);
      // 参考谱面的重点拍前补一枚准备音，形成“追焦 → 快门”的摄影动作。
      if(i>0&&time-reference[i-1]>BEAT*1.55)addNote(quant(time-BEAT),(lane+3)%4,false,'lead-in');
      // 保留原谱强拍，同时少量转为双押，让四轨玩法更有层次。
      if(i>0&&i%15===0)addNote(time,(lane+2)%4,false,'chord');
    });
    // 录像使用短版歌曲，两个被剪掉的原曲段落用同一节奏语言补谱。
    [[78.0,136.0],[157.0,189.0]].forEach(([start,end],section)=>{
      let n=0;for(let time=quant(start);time<end;time+=BEAT){
        if(n%3!==1)addNote(time,lanePattern[(n+section*3)%lanePattern.length],n%16===0,'filled-section',n%20===6?BEAT*2:0);
        if(n%8===5)addNote(quant(time+BEAT/2),lanePattern[(n+5)%lanePattern.length],false,'filled-section');n++
      }
    });
    chart.sort((a,b)=>a.time-b.time||a.lane-b.lane);chart.forEach((n,i)=>{const next=chart.slice(i+1).find(x=>x.lane===n.lane);if(n.hold&&next)n.hold=Math.max(0,Math.min(n.hold,next.time-n.time-BEAT*.35));if(n.hold<BEAT*.7)n.hold=0;n.id=i});totalPhotos=chart.filter(n=>n.photo).length;
  }
  function pulseBeat(ev){
    game.classList.remove('music-beat');void game.offsetWidth;game.classList.add('music-beat');
    airi.className=`airi-wrap dance-${ev.index%4}`;
    if(ev.index%8===0)airiImg.src=poses[(ev.index/8)%poses.length|0];
    if(ev.index===16){speaker.textContent='爱理';line.textContent='“来了哦——先从慢一点的左右跟拍开始。”'}
    else if(ev.phase===1&&beats[beatIndex-1]?.phase===0){speaker.textContent='基生';line.textContent='开始出现半拍……视线别离开判定线。'}
    else if(ev.phase===2&&beats[beatIndex-1]?.phase===1){speaker.textContent='爱理';line.textContent='“跟得不错嘛。那最后就别眨眼啦！”'}
  }
  function targetGeometry(){const h=document.querySelector("#highway").getBoundingClientRect();return [...document.querySelectorAll(".receptor-shape")].map(r=>{const b=r.getBoundingClientRect();return{x:(b.left+b.width/2-h.left)/h.width*100,y:(b.top+b.height/2-h.top)/h.height*100}})}
  function pointFor(time,lane,now,approach,targets){const far=[48.4,49.45,50.55,51.6],p=1-(time-now)/approach,e=Math.max(0,Math.min(1,p)),depth=e*e,t=targets[lane];return{x:far[lane]+(t.x-far[lane])*depth,y:10+(t.y-10)*depth,depth,e}}
  function spawn(note){const el=document.createElement("div");el.className=`note lane-${note.lane}${note.photo?" photo":""}${note.hold?" long":""}`;el.innerHTML=`<span class="note-icon">${note.photo?"✦":icons[note.lane]}</span>`;el.dataset.id=note.id;if(note.hold){const tail=document.createElement("div");tail.className=`hold-tail lane-${note.lane}`;notesLayer.appendChild(tail);note.tailEl=tail}notesLayer.appendChild(el);visible.set(note.id,el)}
  function positionNotes(now){const approach=approachTime(),targets=targetGeometry(),ready=[false,false,false,false],hw=document.querySelector("#highway").clientWidth,hh=document.querySelector("#highway").clientHeight;for(const note of chart){const el=visible.get(note.id);if(!el||note.judged&&!note.holding)continue;const head=note.holding?{...targets[note.lane],depth:1,e:1}:pointFor(note.time,note.lane,now,approach,targets);el.style.left=`${head.x}%`;el.style.top=`${head.y}%`;el.style.opacity=Math.min(1,.12+head.e*1.35);el.style.transform=`translate(-50%,-50%) scale(${.28+head.depth*.72}) rotate(${(note.lane-1.5)*(1-head.depth)*8}deg)`;if(!note.judged&&Math.abs(note.time-now)<=.09)ready[note.lane]=true;if(note.hold&&note.tailEl){const end=pointFor(note.time+note.hold,note.lane,now,approach,targets),dx=head.x-end.x,dy=head.y-end.y,length=Math.hypot(dx/100*hw,dy/100*hh),angle=Math.atan2(dx/100*hw,dy/100*hh)*180/Math.PI;note.tailEl.style.left=`${end.x}%`;note.tailEl.style.top=`${end.y}%`;note.tailEl.style.height=`${length}px`;note.tailEl.style.width=`${8+head.depth*12}px`;note.tailEl.style.transform=`translateX(-50%) rotate(${-angle}deg)`}}[...document.querySelectorAll(".receptor")].forEach((r,i)=>r.classList.toggle("ready",ready[i]))}
  function showJudge(text,kind){judge.textContent=text;judge.className=`judgement ${kind}`;void judge.offsetWidth;judge.classList.add('show')}
  function particles(lane,strong=false){
    const x=[18.5,39.5,60.5,81.5][lane];for(let i=0;i<(strong?20:10);i++){const p=document.createElement('i');p.className='particle';p.style.left=`${x}%`;p.style.top='89%';p.style.setProperty('--pc',strong?'#ffe18e':colors[lane]);p.style.setProperty('--dx',`${(Math.random()-.5)*(strong?210:120)}px`);p.style.setProperty('--dy',`${-25-Math.random()*(strong?150:85)}px`);fx.appendChild(p);setTimeout(()=>p.remove(),520)}
    const r=$(`.receptor[data-lane="${lane}"]`);r.classList.remove('burst');void r.offsetWidth;r.classList.add('burst')
  }
  function addPhoto(note,kind){
    const shot=document.createElement('div');shot.className='shot';shot.style.setProperty('--r',`${((note.id%3)-1)*2.2}deg`);shot.innerHTML=`<img src="${airiImg.src}"><span>${kind==='perfect'?'BEST':'GOOD'}</span>`;film.prepend(shot);while(film.children.length>5)film.lastElementChild.remove();flash.classList.remove('fire');void flash.offsetWidth;flash.classList.add('fire');focus.classList.add('ready');setTimeout(()=>focus.classList.remove('ready'),240);shutterSound()
  }
  function removeNote(note,klass){const el=visible.get(note.id);if(note.tailEl){note.tailEl.classList.add("tail-hit");setTimeout(()=>note.tailEl?.remove(),260)}if(!el)return;el.classList.remove("holding");el.classList.add(klass);setTimeout(()=>{el.remove();visible.delete(note.id)},260)}
  function finishHold(note){if(!note?.holding)return;note.holding=false;activeHolds.delete(note.lane);showJudge("HOLD OK","perfect");particles(note.lane,note.photo);removeNote(note,"hit")}
  function breakHold(note){if(!note?.holding)return;note.holding=false;activeHolds.delete(note.lane);combo=0;quality=Math.max(0,quality-.5);showJudge("HOLD BREAK","miss");removeNote(note,"missed");updateHud()}
  function releaseLane(lane){keysDown.delete(lane);const note=activeHolds.get(lane);if(note&&bgm.currentTime<note.time+note.hold-.035)breakHold(note)}
  function hitLane(lane){if(state!=="playing")return;audio();const now=bgm.currentTime;let best=null,err=Infinity;for(const n of chart){if(n.judged||n.lane!==lane)continue;const e=Math.abs(n.time-now);if(e<err){err=e;best=n}if(n.time>now+.23)break}if(!best||err>.20){combo=0;showJudge("空拍","miss");updateHud();return}best.judged=true;let kind,pts,label;if(err<=.065){kind="perfect";pts=1000;label="PERFECT";perfect++;quality+=1}else if(err<=.12){kind="good";pts=720;label="GREAT";great++;quality+=.75}else{kind="good";pts=420;label=now<best.time?"EARLY":"LATE";good++;quality+=.45}combo++;bestCombo=Math.max(bestCombo,combo);score+=pts+Math.min(combo,100)*8;showJudge(label,kind);if(best.hold){best.holding=true;activeHolds.set(lane,best);visible.get(best.id)?.classList.add("holding")}else removeNote(best,"hit");particles(lane,best.photo);if(best.photo)addPhoto(best,kind);game.classList.remove("big-hit");void game.offsetWidth;game.classList.add("big-hit");updateHud()}
  function miss(note){if(note.judged)return;note.judged=true;combo=0;if(note.photo)judgedPhotos++;removeNote(note,'missed');showJudge('MISS','miss');updateHud()}
  function updateHud(){scoreEl.textContent=String(score).padStart(7,'0');comboEl.textContent=combo;judgedPhotos=chart.filter(n=>n.photo&&n.judged).length;filmCount.textContent=Math.max(0,totalPhotos-judgedPhotos);filmTotal.textContent=totalPhotos||'--'}
  function frame(){
    if(state!=='playing')return;const now=bgm.currentTime;
    while(beatIndex+1<beats.length&&now>=beats[beatIndex+1].time){beatIndex++;pulseBeat(beats[beatIndex])}
    while(spawnIndex<chart.length&&chart[spawnIndex].time-now<=approachTime()){spawn(chart[spawnIndex]);spawnIndex++}
    while(missIndex<chart.length&&chart[missIndex].time<now-.20){miss(chart[missIndex]);missIndex++}for(const note of [...activeHolds.values()])if(now>=note.time+note.hold)finishHold(note)
    positionNotes(now);progress.style.width=`${Math.min(100,now/(bgm.duration||DURATION)*100)}%`;raf=requestAnimationFrame(frame)
  }
  async function start(){
    if(state==='starting')return;state='starting';audio();cancelAnimationFrame(raf);bgm.pause();bgm.currentTime=0;bgm.volume=.84;notesLayer.innerHTML='';fx.innerHTML='';film.innerHTML='';visible.clear();activeHolds.clear();keysDown.clear();buildChart(bgm.duration||DURATION);beatIndex=-1;spawnIndex=missIndex=0;score=combo=bestCombo=perfect=great=good=quality=judgedPhotos=0;progress.style.width='0';updateHud();$('#intro').classList.add('hidden');$('#result').classList.add('hidden');speaker.textContent='基生';line.textContent='先听前奏。音符落到四个按键上时再按。';hint.textContent='图案重合时按键 · 长条从头按住，尾部过线后可随时松开';
    try{await bgm.play();state='playing';raf=requestAnimationFrame(frame)}catch(e){state='idle';$('#intro').classList.remove('hidden');line.textContent='音乐没有成功播放，请再点一次“开始跟拍”。'}
  }
  function finish(){
    if(state==='result')return;state='result';cancelAnimationFrame(raf);bgm.pause();const accuracy=chart.length?quality/chart.length:0;let rank,resultLine,talk;
    if(accuracy>.82){rank='心跳与快门重合';resultLine='每一次追焦都紧紧咬住了她的动作。';talk='<b>爱理：</b>“这么多动作都跟上了……你到底看了我多久呀？”<br><b>基生：</b>“从你跑进镜头开始，就没办法移开了。”'}
    else if(accuracy>.55){rank='被微风吹动的相册';resultLine='偶尔失焦，却留下了最自然的笑容。';talk='<b>爱理：</b>“这几张很好看。失误的那些……也有一点点可爱。”<br><b>基生：</b>“可爱的是照片，还是拍照的人？”'}
    else{rank='追不上她的镜头';resultLine='爱理的动作比预想中更快，不过她似乎玩得很开心。';talk='<b>爱理：</b>“基生，再来一次吧？下一次我会稍微——只稍微慢一点。”<br><b>基生：</b>“你刚才也这么说。”'}
    $('#rank').textContent=rank;$('#resultLine').textContent=resultLine;$('#rScore').textContent=score;$('#rPerfect').textContent=perfect;$('#rBest').textContent=bestCombo;$('#afterTalk').innerHTML=talk;$('#result').classList.remove('hidden');parent.postMessage({type:'ily-photo-result',score,perfect,bestCombo,accuracy},location.origin==='null'?'*':location.origin)
  }
  function pauseGame(){
    if(state!=='playing')return;
    state='paused';cancelAnimationFrame(raf);bgm.pause();
    keysDown.clear();$$('.receptor').forEach(r=>r.classList.remove('down'));
    $('#pause').classList.remove('hidden');
  }
  $('#resume').addEventListener('click',async()=>{
    try{await bgm.play();state='playing';$('#pause').classList.add('hidden');raf=requestAnimationFrame(frame)}
    catch{ $('#resume').textContent='点击重试播放'; }
  });
  addEventListener('message',event=>{
    if(event.source===parent&&event.origin===location.origin&&event.data?.type==='ily-embed-control'&&event.data.action==='pause')pauseGame();
  });
  addEventListener('blur',pauseGame);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});
  $('#continue').addEventListener('click',()=>parent.postMessage({type:'ily-photo-continue'},location.origin==='null'?'*':location.origin));
  addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();pauseGame()}});
  addEventListener('keydown',e=>{const lane=keyMap[e.code];if(lane===undefined||e.repeat)return;e.preventDefault();keysDown.add(lane);const r=$(`.receptor[data-lane="${lane}"]`);r.classList.add('down');hitLane(lane)});
  addEventListener('keyup',e=>{const lane=keyMap[e.code];if(lane!==undefined){$(`.receptor[data-lane="${lane}"]`).classList.remove('down');releaseLane(lane)}});
  $$('.receptor').forEach(r=>{r.addEventListener('pointerdown',e=>{e.preventDefault();r.setPointerCapture?.(e.pointerId);const lane=+r.dataset.lane;keysDown.add(lane);r.classList.add('down');hitLane(lane)});const release=()=>{r.classList.remove('down');releaseLane(+r.dataset.lane)};r.addEventListener('pointerup',release);r.addEventListener('pointercancel',release);r.addEventListener('pointerleave',e=>{if(e.buttons===0)release()})});
  speedInput.addEventListener('input',()=>{speedValue.textContent=`${Number(speedInput.value).toFixed(2)}×`;try{localStorage.setItem('ily-note-speed',speedInput.value)}catch{}});let savedSpeed=null;try{savedSpeed=localStorage.getItem('ily-note-speed')}catch{};if(savedSpeed){speedInput.value=savedSpeed;speedValue.textContent=`${Number(savedSpeed).toFixed(2)}×`}$('#start').addEventListener('click',start);$('#again').addEventListener('click',start);bgm.addEventListener('ended',finish);poses.forEach(src=>{const im=new Image();im.src=src});
})();
