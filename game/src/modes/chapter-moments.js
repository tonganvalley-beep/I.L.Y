(() => {
'use strict';
const {el,button}=ILY;
function mountChapterMoment({stage,node,state,assets,go}) {
  ILY.mountScene(stage,node,assets);
  let frame=0,last=0,elapsed=0,done=false,clicks=0,count=3,finishedAt=0;
  const blocked=()=>document.hidden||!!document.querySelector('dialog[open]');
  // 最终章「搜索」与「短信」演出：改用新款手机（与女主视角短信弹窗同一部智能机）作为 UI
  const isPhoneMoment=node.type==='search'||node.type==='letter';
  const panel=el('section',isPhoneMoment?'heroine-sms-scene moment-phone-scene':'chapter-moment '+node.type);stage.append(panel);
  // 新款手机外壳：状态栏 + 屏幕内容（外观类复用 heroine-sms-*，样式见 chapters.css 的 moment-* 段）
  function buildPhone(clock){
    const device=el('div','heroine-sms-device');
    const screen=el('div','heroine-sms-screen');
    const status=el('div','heroine-sms-status');
    status.append(el('span','heroine-sms-clock',clock||''),el('span','heroine-sms-status-icons','\u25b2  \u25cf'));
    screen.append(status);
    device.append(screen);
    panel.append(device);
    return screen;
  }
  function unlock(id){if(!state.flags.achievements.includes(id))state.flags.achievements.push(id);}
  if(node.type==='letter') {
    // 短信弹窗：ILY 的回信以短信气泡呈现在新款手机屏幕上
    const screen=buildPhone((node.date||'').split(' ').pop());
    const header=el('header','heroine-sms-header');
    const contact=el('div','heroine-sms-contact');
    contact.append(el('h1','','ILY'),el('span','','短信'));
    header.append(el('span','heroine-sms-back','\u2039'),el('span','heroine-sms-avatar'),contact);
    const thread=el('div','heroine-sms-thread');
    thread.append(el('div','heroine-sms-day',node.date||''));
    const bubble=el('div','heroine-sms-bubble');
    if(node.subject)bubble.append(el('span','moment-sms-subject',node.subject));
    bubble.append(el('span','heroine-sms-copy',node.text));
    thread.append(bubble);
    const footer=el('div','moment-phone-footer');
    footer.append(button('合上手机',()=>go(node.next)));
    screen.append(header,thread,footer);
  }
  let searchBtn=null,searchResults=null;
  function search(){
    if(done)return;done=true;state.flags.G3_SEARCHED=true;unlock('ILY = I LOVE YOU');
    searchResults.replaceChildren(el('h2','','ily 是什么的缩写？'),el('p','','ILY 是 I LOVE YOU 的首字母缩写。'),el('p','','我爱你。'),el('p','','我喜欢你。'),el('p','','也用来传达道别时的爱意。'));
    searchResults.append(button('继续',()=>go(node.next)));
    searchResults.hidden=false;
    if(searchBtn)searchBtn.disabled=true;
  }
  if(node.type==='search') {
    // 搜索弹窗：新款手机上的搜索引擎界面，输入框已填「ily」
    const screen=buildPhone('');
    screen.classList.add('moment-screen-search');
    const bar=el('div','moment-search-bar');
    searchBtn=button('搜索',search);
    bar.append(el('span','moment-search-query','ily'),searchBtn);
    searchResults=el('div','moment-search-results');
    searchResults.hidden=true;
    screen.append(bar,searchResults);
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
