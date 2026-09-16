/* danmu-boss —— 弹幕 Boss 关引擎
 * 七幕连续战斗：ILY 攻击(奇数) / 爱理 治疗(偶数) / 终篇(攻击词 / 治疗词 / 攻击弹)
 * 固定 30 帧，Zpix 像素字体，背景图覆盖，HP 跨幕连续。 */
(() => {
'use strict';
// Embedded mode only changes entry/exit; standalone gameplay and its ending stay intact.
const embedded=!!(window.location&&window.parent!==window&&new URLSearchParams(window.location.search).get('embed')==='1');
const hostOrigin=window.location?.origin;
const hostSend=data=>{if(embedded)window.parent.postMessage(data,hostOrigin==='null'?'*':hostOrigin);};
let hostPaused=false;

// ──────────────── ① 固定步长（固定 30 帧） ────────────────
let FPS = 30;
let SCALE = 60 / FPS;                   // = 2
const stepMs = () => 1000 / FPS;

const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');

// ───────── ② 战斗框（每幕重定位） ─────────
const BOXES = {
  right: {x1:360,y1:108,x2:920,y2:506},
  left: {x1:40,y1:108,x2:600,y2:506},
  center: {x1:200,y1:108,x2:760,y2:506}
};
const box = {...BOXES.right};
function setBox(side) { Object.assign(box, BOXES[side] || BOXES.center); }

// ───────── 速度常量 ─────────
const BASE_V    = 3.12;
const Vm        = 5.0;
const HOMING_A0 = 0.48;          // ★ 追踪强度（用户再次翻倍）
const LEAD      = 12;
const SPEED_MUL = 1.25;              // ★ 所有子弹移速 ×1.25
const WORD_SPEED_MUL = 0.5;          // ★ 词条飞行速度 ×0.5（用户要求减半）

// ───────── 全局数值 ─────────
const G = {
  maxhp: 40, hp: 40,           // ★ Boss 关 HP 更多，跨 7 幕共享
  df: 9, adef: 0,
  sp: 4,
  inv: 6                     // ★ 受击无敌帧（用户要求 6）
};
let invc = 0, shake = 0, paused = false, gameOver = false, victory = false;

// ───────── 玩家 SOUL ─────────
const heart = { x: 0, y: 0, size: 16, r: 5, vx: 0, vy: 0 };

// ───────── ④ 对象池 ─────────
const MAX = 600;
const DEFAULT = {
  x:0,y:0,vx:0,vy:0, r:4,dmg:4,
  gravity:0,friction:0,
  homing:0,homingKind:'',lead:LEAD,
  maxSpeed:Vm,burstDist:0,burstSpeed:0,burstDone:false,
  telegraph:0,accel:0,speedCap:0,
  life:0,diffusion:0,inflate:0,inflated:false,
  ttl:300,heal:0,maxhpUp:0,maxhpDown:0,wordMax:2,type:'bone',active:false,arming:0,
  isWord:false,text:'',wordBase:14,wordScale:1,grow:0,bounce:false
};
const bullets = Array.from({ length: MAX }, () => ({ ...DEFAULT }));
let cursor = 0;

function spawn(opt) {
  // 限制危险弹的叠加量；时间线不受碰撞、随机数量或对象池回收影响。
  if(!opt.heal&&!opt.maxhpUp&&!opt.maxhpDown&&bullets.reduce((n,b)=>n+(b.active&&!b.heal?1:0),0)>=stage().cap)return null;
  for (let i = 0; i < MAX; i++) {
    const b = bullets[(cursor + i) % MAX];
    if (!b.active) {
      cursor = (cursor + i + 1) % MAX;
      const o = { ...DEFAULT, ...opt };
      o.ttl=Math.min(o.ttl,Math.max(2,stage().seconds*60-actElapsed));
      o.vx *= SPEED_MUL; o.vy *= SPEED_MUL;        // ★ 所有子弹移速 ×1.25
      if (o.maxSpeed)   o.maxSpeed   *= SPEED_MUL;
      if (o.speedCap)   o.speedCap   *= SPEED_MUL;
      if (o.burstSpeed) o.burstSpeed *= SPEED_MUL;
      Object.assign(b, o, { active: true });
      return b;
    }
  }
  return null;
}
const aliveCount = () => bullets.reduce((n, b) => (b.active ? n + 1 : n), 0);

// ───────── 预警红点 ─────────
const warnings = [];
function spawnWarn(x, y, life) { warnings.push({ x, y, t: life }); }
function updateWarnings() {
  for (let i = warnings.length - 1; i >= 0; i--) {
    warnings[i].t -= SCALE;
    if (warnings[i].t <= 0) warnings.splice(i, 1);
  }
}
function drawWarnings() {
  for (const w of warnings) {
    if(w.kind==='lane'){
      ctx.save();ctx.strokeStyle='#ff7b98';ctx.lineWidth=2;ctx.setLineDash([7,6]);
      ctx.beginPath();ctx.moveTo(box.x1+8,w.y);ctx.lineTo(w.x-w.gapHalf,w.y);
      ctx.moveTo(w.x+w.gapHalf,w.y);ctx.lineTo(box.x2-8,w.y);ctx.stroke();
      ctx.strokeStyle='#9bdfff';ctx.setLineDash([]);
      ctx.strokeRect(w.x-w.gapHalf,w.y-5,w.gapHalf*2,22);ctx.restore();continue;
    }
    if (Math.floor(w.t / 4) % 2 === 0) {
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(w.x, w.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ───────── 输入 ─────────
const keys = new Set();
const BLOCK = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
addEventListener('keydown', e => {
  keys.add(e.code);
  if (BLOCK.has(e.code)) e.preventDefault();
  if (e.code === 'KeyR' && !e.repeat && assetsReady) startGame();          // 重开整个 Boss 关
  if (e.code === 'KeyP' && !e.repeat && running) { paused = !paused; acc=0; }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if(running&&!gameOver&&!victory)paused=true; });
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function moveHeart() {
  const slow = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 0.5 : 1;
  const sp = G.sp * slow * SCALE;
  let dx = (keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
  let dy = (keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
  if (dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2;}
  const h=heart.size/2, px=heart.x, py=heart.y;
  heart.x=clamp(heart.x+dx*sp,box.x1+h,box.x2-h);
  heart.y=clamp(heart.y+dy*sp,box.y1+h,box.y2-h);
  heart.vx=(heart.x-px)/SCALE;
  heart.vy=(heart.y-py)/SCALE;
}

// ───────── ⑤ 波次编排系统 ─────────
const routines = [];
function run(genFn,...args){routines.push({it:genFn(...args),wait:0});}
function updateRoutines(){
  for(let i=routines.length-1;i>=0;i--){
    const r=routines[i];
    if(r.wait>0){r.wait-=SCALE;continue;}
    const res=r.it.next();
    if(res.done){routines.splice(i,1);continue;}
    r.wait=res.value||0;
  }
}



// ═══════════════════ 激光 ═══════════════════
const lasers=[];
function spawnLaser(o){
  lasers.push({x:0,y:0,angle:0,len:900,half:0,maxHalf:14,
    warn:40,fire:60,fade:15,t:0,spin:0,track:0,dmg:6,...o});
}
function distToSegment(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy;
  let t=len2?((px-x1)*dx+(py-y1)*dy)/len2:0;
  t=t<0?0:t>1?1:t;
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function updateLasers(){
  for(let i=lasers.length-1;i>=0;i--){
    const L=lasers[i];L.t+=SCALE;
    if(L.track){
      const want=Math.atan2(heart.y-L.y,heart.x-L.x);
      let diff=((want-L.angle+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
      L.angle+=Math.max(-L.track*SCALE,Math.min(L.track*SCALE,diff));
    }
    L.angle+=L.spin*SCALE;
    if(L.t<L.warn)L.half=0;
    else if(L.t<L.warn+L.fire)L.half=L.maxHalf;
    else if(L.t<L.warn+L.fire+L.fade)L.half=L.maxHalf*(1-(L.t-L.warn-L.fire)/L.fade);
    else{lasers.splice(i,1);continue;}
    if(L.half>0){
      const d=distToSegment(heart.x,heart.y,L.x,L.y,
        L.x+Math.cos(L.angle)*L.len,L.y+Math.sin(L.angle)*L.len);
      if(d<L.half+heart.r)damage(L.dmg);
    }
  }
}
function drawLasers(){
  for(const L of lasers){
    ctx.save();ctx.translate(L.x,L.y);ctx.rotate(L.angle);
    if(L.half>0){
      ctx.fillStyle='rgba(226,75,74,.35)';
      ctx.fillRect(0,-L.half,L.len,L.half*2);
      ctx.fillStyle='rgba(255,238,238,.95)';
      ctx.fillRect(0,-L.half*.35,L.len,L.half*.7);
    }else if(Math.floor(L.t/4)%2===0){
      ctx.strokeStyle='rgba(226,75,74,.9)';ctx.lineWidth=2;
      ctx.setLineDash([10,8]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(L.len,0);ctx.stroke();
    }
    ctx.restore();
  }
}


/** 全屏闪屏激光的预警（红框脉冲）与亮闪（全屏红）渲染。 */
function drawFlash(){
  if(flashWarn>0){
    const a=0.25+0.35*Math.abs(Math.sin(flashWarn*0.3));
    ctx.save();
    ctx.strokeStyle='rgba(255,60,60,'+a.toFixed(3)+')';ctx.lineWidth=14;ctx.strokeRect(7,7,946,526);
    ctx.fillStyle='rgba(255,40,40,'+(a*0.22).toFixed(3)+')';ctx.fillRect(0,0,960,540);
    ctx.fillStyle='#ffd0d0';ctx.font='20px Zpix, monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('全屏激光预警',480,46);ctx.restore();
  }
  if(flashFire>0){
    const a=Math.min(1,flashFire/16);
    ctx.save();ctx.fillStyle='rgba(255,40,40,'+(0.55+0.4*a).toFixed(3)+')';ctx.fillRect(0,0,960,540);
    ctx.fillStyle='#fff';ctx.globalAlpha=a;ctx.font='40px Zpix, monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('全屏激光命中',480,270);ctx.restore();
  }
}

// ═══════════════════ 七幕配置与流程控制 ═══════════════════

const ACTS=[
  {bg:'p1.png',side:'right', mode:'attack', label:'ILY 攻击', waves:16, words:['你能','再一次','喊我的','名字吗']},
  {bg:'p2.png',side:'left',  mode:'heal',   label:'爱理 治疗', waves:12, words:['不要','不对','不是这样']},
  {bg:'p3.png',side:'right', mode:'attack', label:'ILY 攻击', waves:24, words:['喜欢','到底','是什么']},
  {bg:'p4.png',side:'left',  mode:'heal',   label:'爱理 治疗', waves:12, words:['现在这样','不是的','这不是我']},
  {bg:'p5.png',side:'right', mode:'attack', label:'ILY 攻击', waves:33, words:['告诉我','你最','喜欢我了']},
  {bg:'p6.png',side:'left',  mode:'heal',   label:'爱理 治疗', waves:12, words:['求你','什么都','不要说']},
  {bg:'p7.png',side:'center',mode:'final',  label:'终篇',     waves:48, words:[]}
];

let currentAct = 0;
let actWaveCount = 0;
let transitioning = false;        // 幕间平滑过渡中
let transitionTimer = 0;           // 过渡倒计时帧
let actElapsed=0,totalElapsed=0,eventIndex=0,actEvents=[],currentPattern='',currentPhrase=0;
let capEvents=[],capIndex=0,flashWarn=0,flashFire=0;   // ★ 血量上限波次 / 全屏闪屏激光计时

// 台词段与终篇发射次数；实际发射由绝对时间线控制。
let finalEmit = 0;

const GROW_FRAMES = 120;           // 词条放大到 2× 所需 60Hz 时间单位（2s）

// 终篇词条池
const FINAL_ATTACK_WORDS = ['妄想','病毒','感染','遗忘','侵蚀','喜欢','执念'];
const FINAL_HEAL_WORDS   = ['温暖','温柔','热情','痛苦','愉快','感情'];

/** 生成一颗词条子弹（字体不变，用 Zpix） */
function spawnWord(text, mode, opts){
  opts = opts || {};
  const cx=(box.x1+box.x2)/2, cy=(box.y1+box.y2)/2;
  let x,y,vx,vy;
  if(opts.wave){
    // 词条弹幕：由边缘→中心 或 中心→边缘（随机），慢速、整波存在
    const fromEdge = Math.random()<0.5 || Math.hypot(heart.x-cx,heart.y-cy)<100;
    const sp = BASE_V*0.5*WORD_SPEED_MUL;
    if(fromEdge){
      const e=Math.floor(Math.random()*4);
      if(e===0){x=box.x1+Math.random()*(box.x2-box.x1);y=box.y1;}
      else if(e===1){x=box.x1+Math.random()*(box.x2-box.x1);y=box.y2;}
      else if(e===2){x=box.x1;y=box.y1+Math.random()*(box.y2-box.y1);}
      else{x=box.x2;y=box.y1+Math.random()*(box.y2-box.y1);}
      const a=Math.atan2(cy-y,cx-x); vx=Math.cos(a)*sp; vy=Math.sin(a)*sp;
    }else{
      x=cx;y=cy;
      const e=Math.floor(Math.random()*4);
      let tx,ty;
      if(e===0){tx=cx;ty=box.y1;}else if(e===1){tx=cx;ty=box.y2;}
      else if(e===2){tx=box.x1;ty=cy;}else{tx=box.x2;ty=cy;}
      const a=Math.atan2(ty-y,tx-x); vx=Math.cos(a)*sp; vy=Math.sin(a)*sp;
    }
  }else{
    // 终篇普通词弹：从随机边缘朝框内发射，正常速度
    const e=Math.floor(Math.random()*4);
    if(e===0){x=box.x1+Math.random()*(box.x2-box.x1);y=box.y1;}
    else if(e===1){x=box.x1+Math.random()*(box.x2-box.x1);y=box.y2;}
    else if(e===2){x=box.x1;y=box.y1+Math.random()*(box.y2-box.y1);}
    else{x=box.x2;y=box.y1+Math.random()*(box.y2-box.y1);}
    // 治疗词落向玩家附近，留出主动迎接的距离，不自动送到判定点上。
    const offset=Math.random()*Math.PI*2;
    const tx=mode==='heal'?clamp(heart.x+Math.cos(offset)*110,box.x1+35,box.x2-35):box.x1+Math.random()*(box.x2-box.x1);
    const ty=mode==='heal'?clamp(heart.y+Math.sin(offset)*110,box.y1+35,box.y2-35):box.y1+Math.random()*(box.y2-box.y1);
    const a=Math.atan2(ty-y,tx-x); const sp=BASE_V*0.9*WORD_SPEED_MUL;
    vx=Math.cos(a)*sp; vy=Math.sin(a)*sp;
  }
  const b=spawn({x,y,vx,vy, type:'word', isWord:true, text,
    wordBase: opts.wave?18:14, wordScale:1, grow:0, wordMax: STAGES[currentAct].wordMax||2,
    r: opts.wave?9:6, dmg: mode==='attack'?4:0, heal: mode==='heal'?2:0,
    ttl: opts.wave?180:300, arming:24, bounce: !!opts.wave});   // 波词条 3s，前 0.4s 显示预告但不碰撞，波间自然叠加。
  return b;
}

// 每幕的攻击语言固定可辨认；参数以 60Hz 时间单位计。
const STAGES = [
  {seconds:42,tier:1,waveEvery:144,speed:1.00,ring:16,wordGap:12,cap:110,color:'#90cfff',
    hint:'初遇 · 环形间隙 / 定向扇形 / 留缝弹墙',
    motifs:[['ring','ring','fan'],['ring','fan','ring'],['fan','ring','curtain'],['ring','fan','curtain']]},
  {seconds:24,tier:0,waveEvery:104,speed:.60,ring:10,wordGap:12,cap:110,color:'#89efbd',
    hint:'回应 · 主动接住绿色光点，恢复体力',
    motifs:[['healArc','healRain','healArc'],['healRain','healArc','healRain'],['healArc','healRain','healArc']]},
  {seconds:51,tier:2,waveEvery:114,speed:1.10,ring:20,wordGap:12,cap:170,wordMax:3,color:'#d9a4ff',
    hint:'追问 · 先引开追踪，再穿过弹墙',
    motifs:[['chase','ring','curtain','chase','fan'],['laser','fan','ring','laser','curtain'],['gravity','curtain','chase','gravity','ring']]},
  {seconds:24,tier:0,waveEvery:104,speed:.60,ring:10,wordGap:12,cap:110,color:'#89efbd',
    hint:'迟疑 · 沿着绿光轨迹恢复',
    motifs:[['healRain','healArc','healRain'],['healArc','healRain','healArc'],['healRain','healArc','healRain']]},
  {seconds:60,tier:3,waveEvery:100,speed:1.20,ring:24,wordGap:10,cap:230,wordMax:5,color:'#ff86af',
    hint:'失控 · 观察预警，寻找弹墙空隙',
    motifs:[['ambush','fan','curtain','ambush','chase','ring'],['bubble','curtain','fan','bubble','gravity','ring'],['spin','fan','ambush','spin','curtain','ring']]},
  {seconds:24,tier:0,waveEvery:104,speed:.60,ring:10,wordGap:12,cap:110,color:'#89efbd',
    hint:'恳求 · 接住最后的温柔，准备终篇',
    motifs:[['healArc','healRain','healArc'],['healRain','healArc','healRain'],['healArc','healRain','healArc']]},
  {seconds:64.2,tier:4,speed:1.24,ring:26,wordGap:10,cap:290,color:'#f3c4ff',
    hint:'终篇 · 引导 / 交织 / 决意',
    motifs:[]}
];
const stage = () => STAGES[currentAct];
const PREP_TIME=78, TRANSITION_TIME=108; // 各幕准备 1.3s，幕间转场 1.8s
const TOTAL_TIME=Math.round(STAGES.reduce((n,c)=>n+c.seconds*60,0)+(ACTS.length-1)*TRANSITION_TIME);
const PATTERN_NAMES={ring:'环形回响',fan:'定向扇形',curtain:'留缝弹墙',chase:'追踪火弹',laser:'预警光束',gravity:'重力雨',ambush:'边缘伏击',bubble:'膨胀泡泡',spin:'旋转光束',healArc:'汇聚绿光',healRain:'治愈流星'};
function makeTimeline(idx){
  const act=ACTS[idx],cfg=STAGES[idx],events=[];
  if(act.mode==='final'){
    // 48 个真实词波，每波约 1.19 秒；末波提前 7 秒发出，给弹幕自然退场。
    const interval=(cfg.seconds*60-PREP_TIME-420)/(act.waves-1);
    for(let i=0;i<act.waves;i++)events.push({at:Math.round(PREP_TIME+i*interval),final:i});
  }else{
    // 前几波依次说完台词；后续波只出普通弹，保持原来的出波节奏。
    const dialogueWaves=act.words.length,bulletWaves=act.waves-dialogueWaves;
    for(let wave=0;wave<act.waves;wave++){
      const words=wave<dialogueWaves,bulletWave=wave-dialogueWaves;
      const group=words?wave:Math.floor(bulletWave*cfg.motifs.length/bulletWaves);
      const beat=words?0:bulletWave-Math.ceil(group*bulletWaves/cfg.motifs.length);
      const motif=cfg.motifs[group];
      events.push({at:PREP_TIME+wave*cfg.waveEvery,
        wave,phrase:words?wave:-1,kind:motif[beat%motif.length],words});
    }
  }
  return events;
}


/** ★ 血量上限波次调度：插入在已有波次之间（heal=升上限 / attack=降上限 / final=升降交替）。 */
function buildCapEvents(idx){
  const act=ACTS[idx],cfg=STAGES[idx],out=[];
  if(act.mode==='heal'){                       // 2/4/6 幕：3 波升上限，每波 10 弹
    const span=(act.waves-1)*cfg.waveEvery;
    for(const f of [0.28,0.5,0.72]) out.push({at:Math.round(PREP_TIME+span*f),up:true,count:10});
  }else if(act.mode==='attack'){               // 3/5 幕：3 波降上限，每波 5 弹
    const span=(act.waves-1)*cfg.waveEvery;
    for(const f of [0.28,0.5,0.72]) out.push({at:Math.round(PREP_TIME+span*f),up:false,count:5});
  }else{                                       // 终篇：升/降上限交替各 3 波 + 全屏闪屏激光
    const dur=cfg.seconds*60;
    for(let i=0;i<6;i++) out.push({at:Math.round(PREP_TIME+dur*(0.14+i*0.14)),up:i%2===0,count:i%2===0?10:5});
    out.push({at:PREP_TIME,flash:true});                     // 最开始
    out.push({at:Math.round(PREP_TIME+dur*0.5),flash:true}); // 中间
    out.push({at:Math.round(PREP_TIME+dur*0.93),flash:true});// 结尾
  }
  return out;
}
/** ★ 升/降血量上限子弹波：up=绿(升) / down=红(降)，每波 count 颗自上而下飘落，玩家接/避。 */
function* capBurst(up,count){
  for(let i=0;i<count;i++){
    const x=box.x1+(box.x2-box.x1)*(i+0.5)/count;
    spawn({x,y:box.y1+6,vx:0,vy:up?1.1:1.5,r:7,dmg:0,
      ...(up?{maxhpUp:5,type:'cap'}:{maxhpDown:5,type:'capdown'}),
      ttl:300,arming:24});
    yield up?8:6;
  }
}
/** ★ 全屏闪屏激光：预警后强制命中角色并扣除 40 滴血量（无视无敌帧）。 */
function* flashLaserBurst(){
  flashWarn=54;yield 54;                       // 预警 ~0.9s
  flashWarn=0;flashFire=16;                    // 亮闪
  forceDamage(40);
  yield 16;
  flashFire=0;
}
/** 强制扣血（绕过锁血与无敌帧），用于全屏闪屏激光。 */
function forceDamage(n){
  G.hp=Math.max(0,G.hp-n);triggerCue('hit',heart.x,heart.y);
  invc=G.inv;shake=reducedMotion?0:14;syncHUD();
  if(G.hp===0)endGame(false);
}

function clockText(ticks){
  const s=Math.floor(Math.max(0,ticks)/60);
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}


/** 短促环形齐射；保持完整弹速，通过波数、密度和组合递进。 */
function* oneNormalBurst(mode,variation=0){
  const cfg=stage(),heal=mode==='heal',R=155;
  let sx,sy;
  for(let attempt=0;attempt<8;attempt++){
    const ang=Math.random()*Math.PI*2;
    sx=clamp(heart.x+Math.cos(ang)*R,box.x1+30,box.x2-30);
    sy=clamp(heart.y+Math.sin(ang)*R,box.y1+30,box.y2-30);
    if(Math.hypot(sx-heart.x,sy-heart.y)>112)break;
  }
  const warn=heal?32:(cfg.tier===1?42:36);
  spawnWarn(sx,sy,warn);yield warn;
  const count=cfg.ring,speed=BASE_V*(heal?.58:cfg.speed);
  triggerCue(heal?'heal':'attack',sx,sy);
  // 花瓣式环形保留一个可辨认的缺口；高难度增加密度而不封死整圈。
  const angle=Math.atan2(heart.y-sy,heart.x-sx)+.5+variation*.27;
  for(let i=1;i<count;i++){
    const a=i*Math.PI*2/count+angle;
    spawn({x:sx,y:sy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4,
      dmg:heal?0:5,heal:heal?1:0,type:'ring',
      inflate:!heal&&cfg.tier>=3&&i%6===0?54:0});
  }
  yield 24;
}

/** 有预告的扇形与弹墙，后者始终留出至少 100px 的空隙。 */
function* fanBurst(variation=0){
  const cfg=stage(),sx=box.x1+(box.x2-box.x1)*(.25+(variation%3)*.25),sy=box.y1+12;
  const aim=Math.atan2(heart.y-sy,heart.x-sx);
  spawnWarn(sx,sy,54);yield 54;
  const count=cfg.tier>=3?9:cfg.tier===2?7:5,speed=BASE_V*cfg.speed;
  triggerCue('attack',sx,sy);
  for(let volley=0;volley<(cfg.tier>=2?2:1);volley++){
    for(let i=0;i<count;i++){
      const a=aim+(i-(count-1)/2)*.15+volley*.065;
      spawn({x:sx,y:sy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4,dmg:4,type:'ring'});
    }
    yield 22;
  }
}
function* curtainBurst(variation=0){
  const cfg=stage(),gapX=box.x1+(box.x2-box.x1)*[.28,.5,.72][variation%3];
  const gapHalf=cfg.tier<=1?68:cfg.tier===2?60:50;
  warnings.push({kind:'lane',x:gapX,y:box.y1+12,gapHalf,t:54});
  yield 54;triggerCue('attack',box.x1,box.y1);
  for(let row=0;row<(cfg.tier>=2?2:1);row++){
    for(let x=box.x1+12;x<box.x2;x+=24){
      if(Math.abs(x-gapX)<gapHalf+6)continue;
      spawn({x,y:box.y1+8,vx:0,vy:2.15+cfg.tier*.25,r:4,dmg:4,type:'ring'});
    }
    yield 28;
  }
}


/** 复用教学关机制，以短组合穿插，避免整条旧波次拖长词波。 */
function* mechanicBurst(kind,variation=0){
  const cfg=stage(), cx=(box.x1+box.x2)/2, cy=(box.y1+box.y2)/2;
  if(kind==='ring'){yield* oneNormalBurst('attack',variation);return;}
  if(kind==='fan'){yield* fanBurst(variation);return;}
  if(kind==='curtain'){yield* curtainBurst(variation);return;}
  triggerCue('attack',cx,box.y1+12);
  if(kind==='chase'){
    for(let i=0;i<(cfg.tier>=3?5:3);i++){
      spawn({x:box.x1+48+i*102,y:box.y1+10,vx:0,vy:1.4,
        homing:HOMING_A0*(cfg.tier>=3?1:.85),homingKind:'predict',maxSpeed:cfg.tier>=3?4.4:3.8,
        lead:8,r:5,dmg:4,type:'fire',ttl:240,arming:24});
      yield 20;
    }
  }else if(kind==='gravity'){
    for(let i=0;i<14;i++){
      spawn({x:box.x1+32+Math.random()*(box.x2-box.x1-64),y:box.y1-8,
        vx:(Math.random()-.5)*1.4,vy:-1,gravity:.13,r:5,dmg:4,type:'bone'});
      yield 10;
    }
  }else if(kind==='ambush'){
    // 两侧出现可见待机弹，预警结束才锁定玩家方向。
    for(let i=0;i<8;i++){
      spawn({x:i%2?box.x1-14:box.x2+14,y:box.y1+38+Math.floor(i/2)*100,
        telegraph:60+i*5,accel:.05,speedCap:7,r:5,dmg:4,type:'ambush'});
    }
  }else if(kind==='bubble'){
    for(let i=0;i<12;i++){
      spawn({x:box.x1+26+i*46,y:i%2?box.y1+8:box.y2-8,
        vx:(Math.random()-.5)*.4,vy:i%2?1:-1,diffusion:.035,
        life:240,ttl:270,r:6,dmg:4,type:'bubble',inflate:i%3===0?60:0});
      yield 8;
    }
  }else if(kind==='laser'){
    spawnLaser({x:box.x1,y:clamp(heart.y,box.y1+70,box.y2-70),angle:0,
      len:box.x2-box.x1,warn:66,fire:54,fade:18,maxHalf:10,dmg:15});
    yield 138;
  }else if(kind==='spin'){
    spawnLaser({x:cx,y:box.y1+8,angle:Math.PI/2-.32,len:510,
      warn:72,fire:90,fade:18,maxHalf:9,spin:.0028,dmg:15});
    yield 180;
  }
  yield 28;
}
function* healingBurst(kind,variation=0){
  const cx=(box.x1+box.x2)/2,cy=(box.y1+box.y2)/2;
  triggerCue('heal',cx,cy);
  if(kind==='healRain'){
    const lane=box.x1+(box.x2-box.x1)*[.28,.72,.5][variation%3];
    for(let i=0;i<8;i++){
      spawn({x:lane+Math.sin(i*.8)*44,y:box.y1+8,vx:Math.sin(i)*.12,vy:1.55,
        r:6,dmg:0,heal:1,type:'bubble',ttl:270});
      yield 12;
    }
  }else{
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5+variation*.25;
      spawn({x:cx+Math.cos(a)*205,y:cy+Math.sin(a)*155,
        vx:-Math.cos(a)*.95,vy:-Math.sin(a)*.85,r:6,dmg:0,heal:1,type:'ring',ttl:270});
    }
    yield 40;
  }
}
/** 词条之间的三次弹幕；台词结束后追加一次齐射，接住后半幕的压力。 */
function* bulletWave(mode,kind,variation=0,reinforce=false){
  const cfg=stage();
  run(oneNormalBurst,mode,variation);
  yield cfg.wordGap;
  run(mode==='heal'?healingBurst:mechanicBurst,kind,variation);
  yield cfg.wordGap*2+2;
  run(oneNormalBurst,mode,variation+1);
  if(reinforce){
    yield 30;
    run(oneNormalBurst,mode,variation+2);
  }
}
function startWordWave(act,phrase,kind,variation=0){
  const n=4+Math.floor(Math.random()*3),cfg=stage();
  run(bulletWave,act.mode,kind,variation);
  run(function*(){
    // 每个词条只占一波：短促连发后接齐射，下一波直接进入下一个词条。
    for(let i=0;i<n;i++){
      spawnWord(act.words[phrase],act.mode,{wave:true});
      yield cfg.wordGap;
    }
  });
}


/** 终篇每次 2～4 个词条，至少一个治疗词与一个攻击词；普通弹始终为攻击。 */
function* act7Burst(index=finalEmit-1){
  const section=Math.min(2,Math.floor(index/(ACTS[6].waves/3)));
  const n=2+Math.floor(Math.random()*3),healIndex=Math.floor(Math.random()*n);
  const attackIndex=(healIndex+1)%n;
  for(let i=0;i<n;i++){
    const heal=i===healIndex||(i!==attackIndex&&Math.random()<.4);
    const words=heal?FINAL_HEAL_WORDS:FINAL_ATTACK_WORDS;
    spawnWord(words[Math.floor(Math.random()*words.length)],heal?'heal':'attack',{});
    // 每一颗词条均穿插攻击齐射，持续出弹。
    run(oneNormalBurst,'attack',index+i);
    yield stage().wordGap;
  }
  const patterns=section===0?['fan','curtain','chase']:section===1?['laser','gravity','ambush']:['spin','curtain','bubble'];
  if(index%3===2)run(mechanicBurst,patterns[Math.floor(index/3)%3],index);
  yield 24;
}



let transition=null, introTimer=0, visualTime=0, characterPulse=0;
let reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const effects=[];
function triggerCue(mode,x,y){
  characterPulse=1;
  if(!reducedMotion)effects.push({x,y,age:0,mode});
  if(effects.length>30)effects.shift();
}
function clearField(){
  for(const b of bullets)b.active=false;
  warnings.length=0;lasers.length=0;routines.length=0;effects.length=0;
}
function enterAct(idx,keepPosition=false){
  clearField();
  currentAct=idx;
  setBox(ACTS[idx].side);
  if(!keepPosition){heart.x=(box.x1+box.x2)/2;heart.y=box.y2-44;}
  heart.vx=0;heart.vy=0;
  actWaveCount=0;finalEmit=0;currentPhrase=0;
  transitioning=false;transition=null;transitionTimer=0;
  actElapsed=0;eventIndex=0;actEvents=makeTimeline(idx);capEvents=buildCapEvents(idx);capIndex=0;currentPattern='准备';
  introTimer=PREP_TIME;invc=PREP_TIME;
  $('actLabel').textContent='第 '+(idx+1)+' 幕 · '+ACTS[idx].label;
}
function beginTransition(){
  transitioning=true;transitionTimer=TRANSITION_TIME;
  const to={...BOXES[ACTS[currentAct+1].side]};
  const nx=clamp((heart.x-box.x1)/(box.x2-box.x1),.08,.92);
  const ny=clamp((heart.y-box.y1)/(box.y2-box.y1),.08,.92);
  transition={from:currentAct,to:currentAct+1,box:{...box},target:to,
    hx:heart.x,hy:heart.y,tx:to.x1+nx*(to.x2-to.x1),ty:to.y1+ny*(to.y2-to.y1)};
  routines.length=0;
}
function updateTransition(){
  transitionTimer=Math.max(0,transitionTimer-SCALE);
  const t=1-transitionTimer/TRANSITION_TIME, e=t*t*(3-2*t),tr=transition;
  for(const k of ['x1','y1','x2','y2'])box[k]=tr.box[k]+(tr.target[k]-tr.box[k])*e;
  heart.x=tr.hx+(tr.tx-tr.hx)*e;heart.y=tr.hy+(tr.ty-tr.hy)*e;
  if(transitionTimer===0)enterAct(tr.to,true);
}
function updateBossWaves(){
  const act=ACTS[currentAct],duration=Math.round(stage().seconds*60);
  if(actElapsed>=duration){
    if(act.mode==='final'){clearField();endGame(true);}
    else beginTransition();
    return;
  }
  while(eventIndex<actEvents.length&&actElapsed>=actEvents[eventIndex].at){
    const ev=actEvents[eventIndex++];
    if(act.mode==='final'){
      finalEmit=ev.final+1;
      const section=Math.floor(ev.final/(act.waves/3));
      currentPattern=section===0?'引导 · 混合词条':section===1?'交织 · 组合攻击':'决意 · 最后回响';
      run(act7Burst,ev.final);
    }else{
      actWaveCount=ev.wave+1;currentPhrase=ev.phrase;
      currentPattern=PATTERN_NAMES[ev.kind];
      if(ev.words)startWordWave(act,ev.phrase,ev.kind,ev.wave);
      else run(bulletWave,act.mode,ev.kind,ev.wave,true);
    }
  }
  while(capIndex<capEvents.length&&actElapsed>=capEvents[capIndex].at){
    const c=capEvents[capIndex++];
    if(c.flash)run(flashLaserBurst);
    else run(capBurst,c.up,c.count);
  }
}


// ═══════════════════ 子弹更新 + 伤害（同 danmutest） ═══════════════════
const OUT=36;
// ★ 碰撞箱：词条子弹覆盖整个文字（椭圆）；普通子弹用圆形小圈
function hitEllipse(b){
  const hr=heart.r;
  if(b.isWord){
    const fp=Math.round(b.wordBase*b.wordScale);
    return [b.text.length*fp/2 + hr, fp/2 + hr];   // 覆盖整个词条文字
  }
  return [b.r+hr, b.r+hr];                          // 普通弹：小圆判定
}

function updateBullets(){
  for(const b of bullets){
    if(!b.active)continue;
    b.ttl-=SCALE;if(b.ttl<=0){b.active=false;continue;}
    const arming=b.arming>0;b.arming=Math.max(0,b.arming-SCALE);

    if(b.telegraph>0){
      b.telegraph-=SCALE;
      if(b.telegraph<=0){const a=Math.atan2(heart.y-b.y,heart.x-b.x);b.vx=Math.cos(a)*BASE_V*SPEED_MUL;b.vy=Math.sin(a)*BASE_V*SPEED_MUL;}
      continue;
    }
    if(b.life>0){b.life-=SCALE;if(b.life<=0){b.active=false;continue;}}
    if(b.diffusion){
      b.vx+=(Math.random()-0.5)*b.diffusion*2;b.vy+=(Math.random()-0.5)*b.diffusion*2;
      const ms=Math.hypot(b.vx,b.vy),cap=1.4*SPEED_MUL;if(ms>cap){const f=cap/ms;b.vx*=f;b.vy*=f;}
    }
    if(b.inflate>0){b.inflate-=SCALE;if(b.inflate<=0){b.r*=2;b.inflated=true;}}

    if(b.homing){
      const sp=Math.hypot(b.vx,b.vy);
      if(b.homingKind==='l1'&&!b.burstDone){
        const d=Math.hypot(heart.x-b.x,heart.y-b.y);
        if(d<=b.burstDist){
          const a=Math.atan2(heart.y-b.y,heart.x-b.x);
          b.vx=Math.cos(a)*b.burstSpeed;b.vy=Math.sin(a)*b.burstSpeed;
          b.burstDone=true;b.homing=0;continue;
        }
      }
      const tx=heart.x+(heart.vx||0)*b.lead,ty=heart.y+(heart.vy||0)*b.lead;
      const a=Math.atan2(ty-b.y,tx-b.x);
      const acc=b.homing*Math.max(0,1-sp/b.maxSpeed);
      if(acc>0){b.vx+=Math.cos(a)*acc*SCALE;b.vy+=Math.sin(a)*acc*SCALE;}
      const ns=Math.hypot(b.vx,b.vy);if(ns>b.maxSpeed){const f=b.maxSpeed/ns;b.vx*=f;b.vy*=f;}
    }
    if(b.accel){
      const sp=Math.hypot(b.vx,b.vy);
      const ns=Math.min(b.speedCap||9,sp+b.accel*SCALE);
      if(sp>0){const f=ns/sp;b.vx*=f;b.vy*=f;}
    }
    b.vy+=b.gravity*SCALE;
    if(b.friction){const f=Math.pow(1-b.friction,SCALE);b.vx*=f;b.vy*=f;}
    if(b.isWord){ b.grow=Math.min(1,b.grow+SCALE/GROW_FRAMES); b.wordScale=1+b.grow*(b.wordMax-1); }
    b.x+=b.vx*SCALE;b.y+=b.vy*SCALE;
    if(b.isWord){
      // 词条弹幕反弹保持在战斗框内（持续整波）
      if(b.x<box.x1){b.x=box.x1;b.vx=Math.abs(b.vx);}
      else if(b.x>box.x2){b.x=box.x2;b.vx=-Math.abs(b.vx);}
      if(b.y<box.y1){b.y=box.y1;b.vy=Math.abs(b.vy);}
      else if(b.y>box.y2){b.y=box.y2;b.vy=-Math.abs(b.vy);}
    }else if(b.x<box.x1-OUT||b.x>box.x2+OUT||b.y<box.y1-OUT||b.y>box.y2+OUT){b.active=false;continue;}

    const dx=b.x-heart.x,dy=b.y-heart.y;
    const [hx,hy]=hitEllipse(b);
    if(!arming&&(dx*dx)/(hx*hx)+(dy*dy)/(hy*hy)<1){hurt(b);continue;}
  }
}

function damage(dmg){
  if(invc>0||transitioning)return;
  const ratio=G.hp/G.maxhp;
  const dmgMul=0.4+0.6*ratio;            // ★ 锁血：血越低伤害越少（最低 0.4×）
  // 后两段主战斗至少扣 2 HP，低血量仍减伤，但不能靠站桩硬吃通关。
  const d=Math.max(stage().tier>=3?2:1,Math.round(dmg*dmgMul-(G.df+G.adef)/5));
  G.hp=Math.max(0,G.hp-d);invc=G.inv;shake=reducedMotion?0:7;triggerCue('hit',heart.x,heart.y);syncHUD();
  if(G.hp===0)endGame(false);
}
function hurt(b){
  if(invc>0||transitioning)return;
  if(b.maxhpUp){                          // ★ 增加血量上限（仅治疗关出现）
    G.maxhp+=b.maxhpUp;G.hp=Math.min(G.maxhp,G.hp+b.maxhpUp);
    b.active=false;syncHUD();return;
  }
  if(b.maxhpDown){                        // ★ 降低血量上限（仅攻击关出现）
    G.maxhp=Math.max(10,G.maxhp-b.maxhpDown);
    if(G.hp>G.maxhp)G.hp=G.maxhp;
    b.active=false;syncHUD();return;
  }
  if(b.heal){
    const ratio=G.hp/G.maxhp;
    const healMul=1+0.6*(1-ratio);        // ★ 锁血：血越低治疗越多（最高 1.6×）
    G.hp=Math.min(G.maxhp,G.hp+b.heal*healMul);triggerCue('heal',heart.x,heart.y);b.active=false;syncHUD();return;
  }
  damage(b.dmg);b.active=false;
}

// ═══════════════════ 渲染 ═══════════════════

// 静态图预缩放一次；可选视频只在对应幕播放，失败则回退图片。
const bgImages={},sceneVideos={};
let assetsReady=false;
function preloadBgs(cb){
  let n=ACTS.length;
  ACTS.forEach((a,idx)=>{
    const img=new Image();
    const finish=()=>{if(--n===0)cb();};
    img.onload=()=>{
      const surface=document.createElement('canvas');surface.width=960;surface.height=540;
      const c=surface.getContext('2d'),scale=Math.max(960/img.width,540/img.height);
      c.drawImage(img,(960-img.width*scale)/2,(540-img.height*scale)/2,img.width*scale,img.height*scale);
      bgImages[a.bg]=surface;finish();
    };
    img.onerror=finish;
    img.src='background/'+a.bg;
    const src=(window.BOSS_MEDIA||{})[idx+1];
    if(src){
      const v=document.createElement('video');
      v.muted=true;v.loop=true;v.playsInline=true;v.preload='auto';
      v.addEventListener('error',()=>{v._failed=true;});
      v.src=src;sceneVideos[idx]=v;
    }
  });
}
function syncSceneVideos(){
  for(const [key,v] of Object.entries(sceneVideos)){
    const wanted=running&&!paused&&!gameOver&&!victory&&!reducedMotion&&
      (+key===currentAct||(transitioning&&+key===transition.to));
    if(wanted===v._wanted)continue;
    v._wanted=wanted;
    if(wanted&&!v._failed){
      const play=v.play();
      if(play)play.then(()=>{if(!v._wanted)v.pause();}).catch(()=>{v._failed=true;});
    }else v.pause();
  }
}
function drawScene(idx,alpha=1){
  if(alpha<=0)return;
  const act=ACTS[idx],img=bgImages[act.bg],video=sceneVideos[idx];
  ctx.save();ctx.globalAlpha*=alpha;
  ctx.fillStyle=act.mode==='heal'?'#72bde5':'#303c91';ctx.fillRect(0,0,960,540);
  if(video&&!video._failed&&video.readyState>=2&&!reducedMotion){
    const z=Math.max(960/video.videoWidth,540/video.videoHeight);
    ctx.drawImage(video,(960-video.videoWidth*z)/2,(540-video.videoHeight*z)/2,video.videoWidth*z,video.videoHeight*z);
  }else if(img){
    if(reducedMotion)ctx.drawImage(img,0,0);
    else{
      // 12fps 微动：按角色所在位置渐变形变，平坦背景基本不动。
      const t=Math.floor(visualTime/5)/12;
      for(let x=0;x<960;x+=8){
        const left=Math.max(0,1-x/370),right=Math.max(0,1-(960-x)/370);
        const l=act.side==='right'||act.side==='center'?left:0;
        const r=act.side==='left'||act.side==='center'?right:0;
        const w=l+r,phase=l>r?0:1.4;
        const breath=Math.sin(t*1.8+phase);
        const dy=w*(breath*1.7-characterPulse*2.5);
        const stretch=1+w*(.0035*(1+breath)+characterPulse*.004);
        ctx.drawImage(img,x,0,8,540,x,-3+dy,8.5,546*stretch);
      }
    }
  }
  const shade=ctx.createLinearGradient(0,0,0,540);
  shade.addColorStop(0,'rgba(4,8,25,.48)');shade.addColorStop(.3,'rgba(4,8,25,0)');
  shade.addColorStop(1,'rgba(4,8,25,.28)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,960,540);ctx.restore();
}
function drawBackground(){
  if(transitioning){
    const t=1-transitionTimer/TRANSITION_TIME,e=t*t*(3-2*t);
    drawScene(transition.from);drawScene(transition.to,e);
  }else drawScene(currentAct);
}
function drawEffects(){
  if(reducedMotion)return;
  for(const e of effects){
    ctx.save();ctx.globalAlpha=.55*(1-e.age/36);
    ctx.strokeStyle=e.mode==='heal'?'#88ffcb':e.mode==='hit'?'#ff697e':stage().color;
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,10+e.age*1.6,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
}

/** 战斗框上方 HP 条（跨幕连续） */
function drawBossHP(){
  const bx=box.x1,by=box.y1-28,bw=box.x2-box.x1;
  // 底
  ctx.fillStyle='rgba(10,10,15,.88)';
  ctx.fillRect(bx,by,bw,24);
  ctx.strokeStyle='#55556a';ctx.lineWidth=1;
  ctx.strokeRect(bx,by,bw,24);
  // 填充
  const pct=Math.max(0,G.hp/G.maxhp);
  ctx.fillStyle=pct>0.3?'#ffe14d':'#ff5f5f';
  ctx.fillRect(bx+2,by+2,(bw-4)*pct,20);
  // 文字
  ctx.fillStyle=pct>.55?'#17203a':'#f2f3ff';
  ctx.font='13px Zpix, monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(`${Math.ceil(G.hp)} / ${G.maxhp}`,bx+bw/2,by+12);
}

/** 幕号标签（Canvas 内，HP 条上方） */
function drawActLabel(){
  const idx=transitioning&&transitionTimer<TRANSITION_TIME/2?transition.to:currentAct;
  const act=ACTS[idx],cfg=STAGES[idx];
  ctx.fillStyle=cfg.color;ctx.font='bold 15px Zpix, monospace';
  ctx.textAlign='left';ctx.textBaseline='bottom';
  ctx.fillText('0'+(idx+1)+' / 07   '+act.label,box.x1,box.y1-37);
  ctx.font='11px Zpix, monospace';ctx.textAlign='right';
  const progress=act.mode==='final'?finalEmit:Math.min(act.waves,actWaveCount);
  ctx.fillText(transitioning?'下一幕':(act.mode==='heal'?'恢复阶段':'强度 '+cfg.tier)+'  ·  波次 '+progress+' / '+act.waves,box.x2,box.y1-37);
}
function draw(){
  ctx.clearRect(0,0,cv.width,cv.height);
  drawBackground();
  ctx.save();
  if(shake>0&&!reducedMotion)ctx.translate(Math.sin(visualTime*2)*shake*.45,Math.cos(visualTime*3)*shake*.35);
  drawBossHP();drawActLabel();
  const color=stage().color;
  ctx.fillStyle='rgba(5,7,20,.82)';
  ctx.fillRect(box.x1,box.y1,box.x2-box.x1,box.y2-box.y1);
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;
  ctx.shadowColor=color;ctx.shadowBlur=reducedMotion?0:12;
  ctx.strokeRect(box.x1,box.y1,box.x2-box.x1,box.y2-box.y1);
  ctx.restore();
  // 加重四角，放大竞技场轮廓。
  ctx.strokeStyle=color;ctx.lineWidth=3;
  for(const [x,y,dx,dy] of [[box.x1,box.y1,1,1],[box.x2,box.y1,-1,1],[box.x1,box.y2,1,-1],[box.x2,box.y2,-1,-1]]){
    ctx.beginPath();ctx.moveTo(x+dx*20,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*20);ctx.stroke();
  }
  ctx.save();
  if(transitioning)ctx.globalAlpha=Math.max(0,1-(1-transitionTimer/TRANSITION_TIME)*4);
  drawWarnings();
  for(const b of bullets)if(b.active&&b.telegraph>0)drawTelegraph(b);
  ctx.beginPath();ctx.rect(box.x1,box.y1,box.x2-box.x1,box.y2-box.y1);ctx.clip();
  drawEffects();drawLasers();
  for(const b of bullets)if(b.active&&b.telegraph<=0)drawBullet(b);
  ctx.restore();
  drawHeart();
  ctx.fillStyle=color;ctx.font='11px Zpix, monospace';ctx.textAlign='center';ctx.textBaseline='top';
  const shown=transitioning?transition.to:currentAct;
  const detail=transitioning?STAGES[shown].hint:ACTS[currentAct].mode==='final'?currentPattern:
    currentPhrase<0?(ACTS[currentAct].mode==='heal'?'绿光回响':'连续弹幕')+'  ·  '+currentPattern:
    currentPattern+'  ·  '+ACTS[currentAct].words[currentPhrase];
  ctx.fillText(detail,(box.x1+box.x2)/2,box.y2+11);
  // 七段时间进度；计时只计算实际游玩，暂停不扣时。
  ctx.fillStyle='#c1cbe4';ctx.font='11px Zpix, monospace';ctx.textAlign='right';
  ctx.fillText(clockText(totalElapsed)+' / '+clockText(TOTAL_TIME),box.x2,36);
  const segment=(box.x2-box.x1-6*5)/7;
  for(let i=0;i<7;i++){
    const x=box.x1+i*(segment+5);
    ctx.fillStyle='rgba(10,15,35,.6)';ctx.fillRect(x,44,segment,3);
    ctx.fillStyle=STAGES[i].color;
    const p=i<currentAct?1:i===currentAct?Math.min(1,actElapsed/(stage().seconds*60)):0;
    ctx.fillRect(x,44,segment*p,3);
  }
  if(introTimer>0&&!transitioning){
    ctx.save();ctx.globalAlpha=Math.min(1,introTimer/22);
    ctx.fillStyle='rgba(9,13,30,.92)';ctx.fillRect(box.x1+30,box.y1+25,box.x2-box.x1-60,58);
    ctx.fillStyle=color;ctx.font='20px Zpix, monospace';ctx.textBaseline='middle';ctx.textAlign='center';
    ctx.fillText(ACTS[currentAct].label+' · 准备', (box.x1+box.x2)/2,box.y1+54);ctx.restore();
  }
  ctx.restore();
  drawFlash();
  if(paused&&!gameOver&&!victory){
    ctx.fillStyle='rgba(5,7,20,.7)';ctx.fillRect(0,0,960,540);
    ctx.fillStyle='#f5edff';ctx.textAlign='center';ctx.font='26px Zpix, monospace';
    ctx.fillText('已暂停',480,250);ctx.font='14px Zpix, monospace';ctx.fillText('按 P 或点击继续',480,285);
  }
}



function drawWord(b){
  const fontPx=Math.round(b.wordBase*b.wordScale);
  let color='#ff9a9a',glow='#ff5f5f';
  if(b.maxhpUp){color='#b6ff6b';glow='#b6ff6b';}        // 加血量上限：青柠
  else if(b.heal>0){color='#7bd88f';glow='#7bd88f';}    // 治疗：绿
  else{color='#ff9a9a';glow='#ff5f5f';}                 // 攻击词：红
  ctx.font=`bold ${fontPx}px Zpix, monospace`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=12;}
  ctx.fillStyle=color;
  ctx.fillText(b.text,0,0);
}

function drawBullet(b){
  ctx.save();ctx.translate(b.x,b.y);
  ctx.globalAlpha*=Math.min(1,b.ttl/18)*(b.arming>0?.4+.25*Math.sin(b.arming):1);
  if(!reducedMotion&&stage().tier>=2&&!b.isWord&&!b.heal){
    ctx.strokeStyle=b.type==='fire'?'rgba(255,169,92,.45)':'rgba(171,177,255,.3)';
    ctx.lineWidth=b.r;ctx.beginPath();ctx.moveTo(-b.vx*5,-b.vy*5);ctx.lineTo(0,0);ctx.stroke();
  }
  // 膨胀预警脉冲圈（所有类型通用）
  if(b.inflate>0&&Math.floor(b.inflate/4)%2===1){
    ctx.strokeStyle='rgba(255,110,110,.95)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,b.r+4,0,Math.PI*2);ctx.stroke();
    ctx.restore();return;
  }
  // 词条子弹（字体不变，用 Zpix）
  if(b.type==='word'){ drawWord(b); ctx.restore(); return; }
  // 气泡子弹：保留圆形模型
  if(b.type==='bubble'){
    ctx.fillStyle=b.heal?'rgba(123,235,172,.7)':'rgba(150,210,255,.5)';ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(220,240,255,.85)';ctx.lineWidth=1;ctx.stroke();
    ctx.restore();return;
  }
  // 治疗变种：统一绿色
  if(b.heal>0){
    ctx.shadowColor='#7bd88f';ctx.shadowBlur=10;ctx.fillStyle='#7bd88f';
    ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
    ctx.restore();return;
  }
  // 加血量上限：青柠色 + 白描边
  if(b.type==='cap'){
    ctx.shadowColor='#b6ff6b';ctx.shadowBlur=10;ctx.fillStyle='#b6ff6b';
    ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();return;
  }
  if(b.type==='capdown'){                 // 降低血量上限（红，需躲避）
    ctx.shadowColor='#ff5f5f';ctx.shadowBlur=10;ctx.fillStyle='#ff5f5f';
    ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();return;
  }
  // 其余普通弹：恢复原始形状
  if(b.type==='bone'){
    ctx.rotate(Math.atan2(b.vy,b.vx));
    ctx.fillStyle='#f2f2f7';roundRect(-9,-3,18,6,3);ctx.fill();
  }else if(b.type==='fire'){
    ctx.shadowColor='#ff9a3c';ctx.shadowBlur=12;ctx.fillStyle='#ffb14d';
    ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
  }else if(b.type==='veggie'){
    ctx.shadowColor='#7bd88f';ctx.shadowBlur=10;ctx.fillStyle='#7bd88f';
    ctx.beginPath();ctx.ellipse(0,0,b.r*.8,b.r*1.3,0,0,Math.PI*2);ctx.fill();
  }else if(b.type==='ambush'){
    ctx.fillStyle='#b478ff';ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e7d2ff';ctx.lineWidth=1;ctx.stroke();
  }else{
    ctx.fillStyle='#8fd6ff';ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e6f7ff';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.restore();
}
function drawTelegraph(b){
  const a=0.35+0.45*Math.abs(Math.sin(b.telegraph*.25));
  ctx.save();ctx.translate(b.x,b.y);
  ctx.fillStyle=`rgba(180,120,255,${a})`;
  ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(225,195,255,.95)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function drawHeartShape(x,y){
  ctx.fillStyle='#ff3b3b';ctx.beginPath();
  ctx.arc(x-4,y-2,5,0,Math.PI*2);ctx.arc(x+4,y-2,5,0,Math.PI*2);
  ctx.moveTo(x-9,y+1);ctx.lineTo(x,y+9);ctx.lineTo(x+9,y+1);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y+1,2.2,0,Math.PI*2);ctx.fill();
}
function drawHeart(){if(invc>0&&Math.floor(invc/4)%2===1)return;drawHeartShape(heart.x,heart.y);}

// ═══════════════════ HUD / 主循环 / 生命周期 ═══════════════════
const $=id=>document.getElementById(id);

function syncHUD(){ $('actLabel').textContent='第 '+(currentAct+1)+' 幕 · '+ACTS[currentAct].label; }
let acc=0,last=0,frames=0,fpsTime=0,running=false,rafId=0;
function update(){
  if(gameOver||victory)return;
  visualTime+=SCALE;totalElapsed=Math.min(TOTAL_TIME,totalElapsed+SCALE);
  characterPulse=Math.max(0,characterPulse-.045*SCALE);
  shake*=.82; if(shake<.2)shake=0;
  for(let i=effects.length-1;i>=0;i--){effects[i].age+=SCALE;if(effects[i].age>=36)effects.splice(i,1);}
  if(transitioning){updateTransition();return;}
  actElapsed+=SCALE;
  if(introTimer>0)introTimer-=SCALE;
  moveHeart();updateRoutines();updateWarnings();updateBullets();
  if(gameOver)return;
  updateLasers();if(gameOver)return;
  updateBossWaves();
  if(invc>0)invc-=SCALE;
  if(flashWarn>0)flashWarn-=SCALE;
  if(flashFire>0)flashFire-=SCALE;
}
function frame(now){
  if(!running)return;
  const delta=Math.min(200,Math.max(0,now-last));last=now;
  if(!paused&&!gameOver&&!victory){
    acc+=delta;
    while(acc>=stepMs()){update();acc-=stepMs();}
  }else acc=0;
  syncSceneVideos();draw();
  frames++;
  if(now-fpsTime>=1000){$('fps').textContent=frames;frames=0;fpsTime=now;}
  $('pause').textContent=paused?'继续':'暂停';
  rafId=requestAnimationFrame(frame);
}
function reset(){
  G.maxhp=40;G.hp=40;invc=0;shake=0;
  gameOver=false;victory=false;paused=false;acc=0;keys.clear();
  visualTime=0;totalElapsed=0;characterPulse=0;enterAct(0);syncHUD();
}


let endingLayer=null, endingVideo=null;
function endGame(win){
  if(embedded){
    if(gameOver||victory)return;
    victory=!!win;gameOver=!win;keys.clear();
    hostSend({type:'boss:end',win:!!win,hp:G.hp,maxHp:G.maxhp,timeMs:Math.round(totalElapsed/60*1000),reachedAct:currentAct+1,reducedMotion,bossMode:'play'});
    return;
  }
  if(win){victory=true;showEnding();return;}
  gameOver=true;
  const ov=$('overlay');ov.innerHTML='';
  const h=document.createElement('h1');h.textContent='GAME OVER';
  const p=document.createElement('p');p.textContent=`撑到了第 ${currentAct+1} 幕 · ${clockText(totalElapsed)}。再试一次？`;
  const btn=document.createElement('button');btn.type='button';btn.textContent='再来一次';
  btn.addEventListener('click',()=>{ov.classList.remove('show');startGame();});
  ov.append(h,p,btn);ov.classList.add('show');
}
// 通关：全屏播放 ending.mp4。文件缺失 / 解码失败 / 自动播放受限时回退文字界面。
function showEnding(){
  const src=(window.BOSS_ENDING)||null;
  $('overlay').classList.remove('show');
  const layer=document.createElement('div');layer.id='endingLayer';
  let video=null;
  if(src){
    video=document.createElement('video');
    video.src=src;video.muted=true;video.loop=false;video.playsInline=true;video.preload='auto';
    video.setAttribute('playsinline','');
    video.addEventListener('error',()=>{if(video)video.style.display='none';});
    layer.append(video);endingVideo=video;
  }
  const content=document.createElement('div');content.className='ending-content';
  const h=document.createElement('h1');h.textContent='挑战成功！';
  const p=document.createElement('p');p.textContent=`七幕完成 · ${clockText(totalElapsed)} · HP ${Math.ceil(G.hp)}/${G.maxhp}。`;
  const btn=document.createElement('button');btn.type='button';btn.textContent='再来一次';
  btn.addEventListener('click',()=>{stopEnding();startGame();});
  content.append(h,p,btn);layer.append(content);endingLayer=layer;
  if(document.body)document.body.append(layer);
  if(video&&typeof video.play==='function'){
    const pr=video.play();
    if(pr&&pr.catch)pr.catch(()=>{});
  }
}
function stopEnding(){
  if(endingVideo){try{endingVideo.pause();}catch{}endingVideo=null;}
  if(endingLayer){try{if(endingLayer.parentNode)endingLayer.parentNode.removeChild(endingLayer);}catch{}endingLayer=null;}
}

function startGame(){
  if(!assetsReady)return;
  cancelAnimationFrame(rafId);
  $('overlay').classList.remove('show');
  stopEnding();
  reset();running=true;last=performance.now();fpsTime=last;frames=0;
  if(embedded&&hostPaused)paused=true;
  syncSceneVideos();rafId=requestAnimationFrame(frame);
}
$('start').addEventListener('click',startGame);
$('pause').addEventListener('click',()=>{if(running&&!gameOver&&!victory){paused=!paused;acc=0;}});
$('motion').addEventListener('click',()=>{
  reducedMotion=!reducedMotion;
  $('motion').textContent=reducedMotion?'动态：关':'动态：开';
  $('motion').setAttribute('aria-pressed',String(!reducedMotion));
  if(reducedMotion){effects.length=0;shake=0;}
  if(!running)draw();
});
$('motion').textContent=reducedMotion?'动态：关':'动态：开';
$('motion').setAttribute('aria-pressed',String(!reducedMotion));
$('fullscreen').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await $('wrap').requestFullscreen();
  }catch{$('status').textContent='浏览器未允许全屏，可放大窗口游玩。';}
});
$('start').disabled=true;
Promise.all([
  new Promise(resolve=>preloadBgs(resolve)),
  document.fonts?document.fonts.load('18px Zpix').catch(()=>[]):Promise.resolve()
]).then(()=>{
  assetsReady=true;$('start').disabled=false;$('start').textContent='开始挑战';
  setBox(ACTS[0].side);heart.x=(box.x1+box.x2)/2;heart.y=box.y2-44;draw();syncHUD();
  hostSend({type:'boss:ready'});
});

if(embedded){
  document.body.classList.add('embedded');
  addEventListener('message',e=>{
    if(e.source!==window.parent||e.origin!==hostOrigin)return;
    const data=e.data;if(!data||typeof data!=='object')return;
    if(data.type==='boss:hello'&&assetsReady)hostSend({type:'boss:ready'});
    if(data.type==='boss:start'&&assetsReady){
      reducedMotion=!!data.reducedMotion;hostPaused=!!data.paused;
      $('motion').textContent=reducedMotion?'动态：关':'动态：开';
      $('motion').setAttribute('aria-pressed',String(!reducedMotion));startGame();
    }
    if(data.type==='boss:pause'){
      hostPaused=!!data.paused;paused=hostPaused;keys.clear();acc=0;last=performance.now();syncSceneVideos();
    }
    if(data.type==='boss:dispose'){
      running=false;paused=true;keys.clear();cancelAnimationFrame(rafId);syncSceneVideos();stopEnding();
    }
  });
  // Pointer dragging gives touch screens access to the same heart and collision rules.
  cv.style.touchAction='none';
  const drag=e=>{if(!running||paused||gameOver||victory)return;const r=cv.getBoundingClientRect();heart.x=Math.max(box.x1+heart.r,Math.min(box.x2-heart.r,(e.clientX-r.left)*960/r.width));heart.y=Math.max(box.y1+heart.r,Math.min(box.y2-heart.r,(e.clientY-r.top)*540/r.height));};
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);drag(e);});
  cv.addEventListener('pointermove',e=>{if(cv.hasPointerCapture(e.pointerId))drag(e);});
  cv.addEventListener('pointerup',e=>{if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);});
}


})();
