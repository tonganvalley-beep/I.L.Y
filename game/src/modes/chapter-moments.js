(() => {
'use strict';
const {el,button}=ILY;
function mountChapterMoment({stage,node,state,assets,go}) {
  ILY.mountScene(stage,node,assets);
  let frame=0,last=0,elapsed=0,done=false,clicks=0,count=3,finishedAt=0;
  const blocked=()=>document.hidden||!!document.querySelector('dialog[open]');
  const panel=el('section','chapter-moment '+node.type);stage.append(panel);
  function unlock(id){if(!state.flags.achievements.includes(id))state.flags.achievements.push(id);}
  if(node.type==='letter') {
    panel.append(el('p','letter-date',node.date),el('h2','','发件人：ILY'),el('p','',node.subject),el('p','letter-body',node.text),button('合上手机',()=>go(node.next)));
  }
  function search(){
    if(done)return;done=true;state.flags.G3_SEARCHED=true;unlock('ILY = I LOVE YOU');
    panel.append(el('h2','','ily 是什么的缩写？'),el('p','','ILY 是 I LOVE YOU 的首字母缩写。'),el('p','','我爱你。'),el('p','','我喜欢你。'),el('p','','也用来传达道别时的爱意。'),button('继续',()=>go(node.next)));
    panel.querySelector('button').disabled=true;
  }
  function fracture(timeout){
    if(done)return;done=true;finishedAt=elapsed;state.flags.CRACK_CLICKS=clicks;state.flags.CRACK_TIMEOUT=timeout;
    panel.replaceChildren(el('span','fracture-last','ILY'));
  }
  function populate(){
    panel.replaceChildren();
    for(let i=0;i<count;i++){
      const b=button('我喜欢你',()=>{if(blocked()||done)return;clicks++;count*=2;populate();if(clicks>=3)fracture(false);});
      b.style.left=(8+(i*29)%67)+'%';b.style.top=(13+(i*19)%60)+'%';b.style.transform=`rotate(${i%3*3-3}deg)`;panel.append(b);
    }
  }
  if(node.type==='fracture')populate();
  if(node.type==='search')panel.append(el('p','search-query','ily'),button('搜索',search));
  function tick(now){
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    if(!blocked()){
      elapsed+=dt;
      if(node.type==='search'&&elapsed>=6)search();
      if(node.type==='fracture'){
        if(!done&&elapsed>=3)fracture(true);
        else if(!done&&count<3*2**Math.floor(elapsed)){count=3*2**Math.floor(elapsed);populate();}
        if(done&&elapsed-finishedAt>=.5){go(node.next);return;}
      }
    }
    frame=requestAnimationFrame(tick);
  }
  if(node.type!=='letter')frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
}
ILY.mountChapterMoment=mountChapterMoment;

// A single image slot prevents overlapping battery states, including on slow loads.
function mountBatteryMontage({stage, node, assets, go}) {
  const panel = el('section', 'battery-montage');
  panel.setAttribute('aria-label', '八月，手机电量逐渐耗尽');
  const image = el('img', 'battery-montage-image');
  image.draggable = false;
  image.hidden = true;
  panel.append(image);
  stage.append(panel);
  const frames = node.frames || [];
  const phases = [-1];
  frames.forEach((entry, index) => phases.push(index, -1));
  let phase = 0, disposed = false;
  const preload = frames.map((entry, index) => {
    const img = new Image();
    const ready = () => {
      if (!disposed && phases[phase] === index) show();
    };
    img.onload = ready;
    img.onerror = ready; // A missing asset must never trap story progression.
    img.src = assets.image(entry.image);
    return img;
  });
  const blocked = () => document.hidden || !!document.querySelector('dialog[open]');
  function show() {
    const index = phases[phase];
    image.hidden = true;
    if (index < 0) return;
    image.alt = frames[index].label;
    image.src = preload[index].src;
    image.hidden = !preload[index].naturalWidth;
  }
  function advance() {
    if (disposed || blocked()) return;
    phase++;
    if (phase >= phases.length) {
      disposed = true;
      go(node.next);
      return;
    }
    show();
  }
  const click = event => {
    event.preventDefault();
    advance();
  };
  const key = event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      advance();
    }
  };
  stage.tabIndex = -1;
  stage.focus({preventScroll: true});
  panel.addEventListener('click', click);
  window.addEventListener('keydown', key);
  return () => {
    disposed = true;
    panel.removeEventListener('click', click);
    window.removeEventListener('keydown', key);
    preload.forEach(img => { img.onload = img.onerror = null; });
  };
}
ILY.mountBatteryMontage = mountBatteryMontage;
})();
