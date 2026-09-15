(() => {
  const P = AquariumPuzzle, $ = id => document.getElementById(id);
  let index=0, level, cells, moves=0, history=[], flowing=false, won=false, timer=null, generation=0;
  let best={}; try {best=JSON.parse(localStorage.getItem('ily-aquarium-demo-best') || '{}') || {};} catch {}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const endpoints=[[50,0],[100,50],[50,100],[0,50]];
  function pipe(mask) {
    const path=endpoints.map(([x,y],d) => mask & (1<<d) ? `M50 50L${x} ${y}` : '').join(' ');
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="pipe-edge" d="${path}"/><path class="pipe-core" d="${path}"/><circle class="joint" cx="50" cy="50" r="14"/></svg>`;
  }
  function saveBest() {try {localStorage.setItem('ily-aquarium-demo-best',JSON.stringify(best));}catch{}}
  function stop() {generation++;clearTimeout(timer);flowing=false;}
  function clearFlow() {
    stop(); won=false; $('result').hidden=true;
    document.querySelectorAll('.wet,.leak').forEach(el=>el.classList.remove('wet','leak'));
    $('water').style.height='14%';$('tank-state').textContent='等待供水';$('system-state').textContent='STANDBY';
    $('flow').disabled=false;
  }
  function update() {
    $('moves').textContent=moves; $('undo').disabled=!history.length || flowing;
    $('flow').disabled=flowing || won;
    $('best').textContent=Number.isFinite(best[index]) ? `${best[index]} 次` : '—';
  }
  function turn(id,amount=1) {
    if(flowing || won || !cells[id] || level.locked.includes(id)) return;
    clearFlow();history.push({id,mask:cells[id]});cells[id]=P.rotate(cells[id],amount);moves++;
    drawCell(id);update();$('status').textContent='管道已旋转。准备好后，开启水泵检查路线。';
  }
  function drawCell(id) {
    const el=$('board').children[id];
    el.innerHTML=cells[id] ? pipe(cells[id]) : '<span class="rock">◆</span>';
    if(level.filters.includes(id)) el.insertAdjacentHTML('beforeend','<span class="filter-mark">✦</span>');
    if(level.locked.includes(id)) el.insertAdjacentHTML('beforeend','<span class="lock-mark">固定</span>');
    const names=['上','右','下','左'].filter((_,d)=>cells[id] & (1<<d)).join('、');
    el.setAttribute('aria-label',`第${Math.floor(id/level.size)+1}行第${id%level.size+1}列，${cells[id] ? '接口朝'+names : '岩石'}${level.filters.includes(id)?'，过滤器':''}${level.locked.includes(id)?'，固定':''}`);
  }
  function load(i) {
    stop(); index=i;level=P.createLevel(i);cells=[...level.initial];moves=0;history=[];won=false;
    $('title').textContent=level.name;$('level-number').textContent=`EXHIBIT 0${i+1} / 04`;
    $('description').textContent=level.text;$('target').textContent=`${level.target} 次以内`;
    const board=$('board');board.replaceChildren();board.style.setProperty('--n',level.size);
    board.style.setProperty('--source-row',Math.floor(level.start/level.size));
    for(let id=0;id<cells.length;id++) {
      const button=document.createElement('button');button.className='cell';button.type='button';
      if(level.locked.includes(id))button.classList.add('locked');
      if(!cells[id])button.classList.add('blocked');
      if(id===level.start)button.classList.add('inlet');if(id===level.end)button.classList.add('outlet');
      button.disabled=!cells[id] || level.locked.includes(id);
      button.onclick=e=>turn(id,e.shiftKey?-1:1);
      button.oncontextmenu=e=>{e.preventDefault();turn(id,-1);};board.append(button);drawCell(id);
    }
    document.querySelectorAll('#levels button').forEach((b,j)=>{b.classList.toggle('active',j===i);b.setAttribute('aria-current',j===i?'step':'false');});
    document.querySelector('.source-label').style.top=`${(Math.floor(level.start/level.size)+0.5)/level.size*100}%`;
    document.querySelector('.drain-label').style.top=`${(Math.floor(level.end/level.size)+0.5)/level.size*100}%`;
    clearFlow();update();$('status').textContent='点击一块管道开始。青色边框是入口，绿色边框是出口。';
  }
  function finish(result) {
    flowing=false;result.leaks.forEach(id=>$('board').children[id].classList.add('leak'));
    if(result.success) {
      won=true;$('water').style.height='78%';$('tank-state').textContent='循环正常';$('system-state').textContent='FLOWING';
      const stars=moves<=level.target ? 3 : moves<=level.target+5 ? 2 : 1;
      $('stars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
      $('result-text').textContent=`用了 ${moves} 次旋转。${stars===3?'漂亮！达成效率挑战。':'再次挑战，试试用更少的步数。'}`;
      $('result').hidden=false;$('next').textContent=index===P.count-1?'再玩第一关 ↻':'下一展区 →';
      best[index]=Math.min(Number.isFinite(best[index])?best[index]:Infinity,moves);saveBest();
      $('status').textContent='通水成功！所有过滤器正常工作，没有泄漏。';
    } else {
      $('tank-state').textContent='回路未连通';$('system-state').textContent='CHECK';
      $('status').textContent=result.leaks.length ? `发现 ${result.leaks.length} 处漏水位置（红色）。调整接口后可以再次试水。` : result.missing.length ? `还有 ${result.missing.length} 座过滤器未接通。请调整路线。` : '水还没有到达出口，请检查路线。';
    }
    update();
  }
  $('flow').onclick=()=>{
    if(flowing || won)return;
    clearFlow();flowing=true;update();$('status').textContent='水泵运行中，正在检查回路…';
    $('tank-state').textContent='正在供水';const result=P.evaluate(level,cells),token=generation;let step=0;
    const tick=()=>{if(token!==generation)return;if(step<result.visited.length){$('board').children[result.visited[step++]].classList.add('wet');timer=setTimeout(tick,reduced?0:85);}else finish(result);};tick();
  };
  $('undo').onclick=()=>{if(flowing || !history.length)return;clearFlow();const last=history.pop();cells[last.id]=last.mask;moves--;drawCell(last.id);update();$('status').textContent='已撤销上一步。';};
  $('reset').onclick=()=>load(index);$('next').onclick=()=>load((index+1)%P.count);
  for(let i=0;i<P.count;i++){const b=document.createElement('button');b.textContent=`0${i+1}  ${P.createLevel(i).name}`;b.onclick=()=>load(i);$('levels').append(b);}
  load(0);
})();
