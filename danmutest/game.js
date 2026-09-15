/* danmutest —— 极简弹幕原型
 * 参考：prework/knowledge/11-弹幕游戏与Web迁移.md
 *
 * 刻意保留的 6 个要点（对应 Undertale 的 GML 实现）：
 *   ① 固定步长主循环      ← 否则弹幕轨迹随刷新率漂移（知识 §5-1）
 *   ② 战斗框 idealborder  ← global.idealborder[0..3] = [左,右,上,下]
 *   ③ 判定点比贴图小      ← SOUL 贴图 16px，判定半径只有 5px
 *   ④ 对象池 + active     ← 绝不边遍历边 splice（知识 §5-4）
 *   ⑤ 生成器函数编排波次  ← 用 function* + yield N 帧 替代 GML 的 alarm[] 链
 *   ⑥ 伤害/无敌帧/震屏    ← dmg - (df+adef)/5，保底 1
 */
window.ILYDanmu = { create(options) {
'use strict';
options ||= {};
const listeners=[];
const on=(type,handler)=>{window.addEventListener(type,handler);listeners.push([type,handler]);};
let disposed=false, frameId=0, elapsed=0, pointerTarget=null;
const duration=options.duration || Infinity;

// ───────────────────────── ① 固定步长 ─────────────────────────
// 逻辑帧率可锁：默认 60，按 F 切 30（对应 GML 的 room_speed 减半）。
//
// ★ 关键：所有数值（速度/重力/无敌帧/波次间隔）都是按 60Hz 调好的。
//   降帧时每步代表的时间变长，所以要用 SCALE 把「每步的位移/增量」放大，
//   让【每秒的实际速度】保持不变 —— 这正是固定步长的意义所在：
//   30 帧和 60 帧玩起来完全一样，只是流畅度不同。
let FPS = 60;
let SCALE = 1;                          // 60 / FPS
const stepMs = () => 1000 / FPS;

function setFps(v) {
  FPS = v;
  SCALE = 60 / v;
  acc = 0;                              // 重置累加器，避免切换瞬间连补多步
  syncFpsLock();
}

const cv = options.canvas || document.getElementById('cv');
const ctx = cv.getContext('2d');

// ───────────────── ② 战斗框（[左, 右, 上, 下]） ─────────────────
const box = { x1: 84, y1: 128, x2: 556, y2: 352 };   // 已缩小一点

// ───────── 速度常量（对应「设现在子弹线速度为 v」） ─────────
const BASE_V    = 3.12;  // 基准线速度 v（px / 帧，×1.2）
const Vm        = 5.0;   // 追踪弹线速度上限：越快加速度越小，封顶 Vm
const HOMING_A0 = 0.12;  // 追踪弹基础加速度（px / 帧²）
const LEAD      = 12;    // 预判步数：朝 玩家.pos + 玩家.vel × LEAD 飞

// ───────────── 全局数值（对应 obj_battlecontroller） ─────────────
const G = {
  maxhp: 20, hp: 20,
  df: 9, adef: 0,        // 防御：伤害 = round(dmg - (df + adef) / 5)
  sp: 4,                 // 基础速度（px / 帧）
  inv: 30                // 无敌 30 帧 = 0.5s
};
let invc = 0;            // 当前无敌剩余帧
let shake = 0;           // 屏幕震动强度
let paused = false;
let gameOver = false;

// ────────────── 玩家 SOUL（对应 obj_heart） ──────────────
// ★ size=16 是贴图大小，r=5 才是判定半径 —— 弹幕游戏的灵魂
const heart = { x: 320, y: 330, size: 16, r: 5, vx: 0, vy: 0 };  // vx/vy = 玩家真实速度（px/帧，含方向，供追踪弹预判）

// ───────────────────────── ④ 对象池 ─────────────────────────
const MAX = 600;
const DEFAULT = {
  x: 0, y: 0, vx: 0, vy: 0,
  r: 4, dmg: 4,
  gravity: 0,            // 每帧加到 vy 上
  friction: 0,           // ★ 负值是加速：vx *= (1 - friction)
  homing: 0,             // >0：追踪强度（加速度初值）
  homingKind: '',        // '' | 'predict'（预判，封顶 Vm） | 'l1'（一级追踪：到触发距改向一次后直线 3v）
  lead: LEAD,            // 预判步数
  maxSpeed: Vm,          // 线速度上限
  burstDist: 0,          // l1 触发距离（≤ 此距改向）
  burstSpeed: 0,         // l1 触发后速度
  burstDone: false,      // l1 是否已触发
  telegraph: 0,          // >0：框外待机帧数（只显示不移动），归零瞬间朝玩家发射
  accel: 0,              // >0：发射后沿当前方向持续加速（直线「越来越快」）
  speedCap: 0,           // accel 的速度上限
  life: 0,               // >0：定时消失（帧），到 0 即销毁（泡泡弹用）
  diffusion: 0,          // >0：每帧随机扰动强度（泡泡随机扩散）
  inflate: 0,            // >0：充能帧数，倒计时结束膨胀为 2 倍半径
  inflated: false,       // 是否已膨胀
  ttl: 300,              // 全局寿命上限（60Hz 帧）：任意子弹存在 5s 即删除
  heal: 0,               // >0 则是回血弹（绿色）
  type: 'bone',
  active: false
};
const bullets = Array.from({ length: MAX }, () => ({ ...DEFAULT }));
let cursor = 0;

function spawn(opt) {
  for (let i = 0; i < MAX; i++) {
    const b = bullets[(cursor + i) % MAX];
    if (!b.active) {
      cursor = (cursor + i + 1) % MAX;
      Object.assign(b, DEFAULT, opt, { active: true });
      return b;
    }
  }
  return null;                          // 池满：直接丢弃（比卡帧好）
}

const aliveCount = () => bullets.reduce((n, b) => (b.active ? n + 1 : n), 0);

// ───────── 框外红点预警（环形弹生成前闪一下） ─────────
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
    if (Math.floor(w.t / 4) % 2 === 0) {            // 闪烁红点
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(w.x, w.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ───────── 影分身（诱饵）：随机位置出现玩家贴图，跟随输入移动，定时消失 ─────────
// 本体实体不变；分身只是贴图，参与碰撞（子弹命中分身会被吃掉）但不扣血，只有本体受伤。
const clones = [];
const clonePrev = { x: 0, y: 0 };
function spawnClones(n) {
  for (let i = 0; i < n; i++) {
    clones.push({
      x: box.x1 + 24 + Math.random() * (box.x2 - box.x1 - 48),
      y: box.y1 + 24 + Math.random() * (box.y2 - box.y1 - 48),
      life: 200 + Math.random() * 120,
      r: heart.r
    });
  }
}
function updateClones() {
  const dx = heart.x - clonePrev.x, dy = heart.y - clonePrev.y;   // 本帧玩家位移 = 输入规则
  for (let i = clones.length - 1; i >= 0; i--) {
    const c = clones[i];
    c.x = clamp(c.x + dx, box.x1 + heart.size / 2, box.x2 - heart.size / 2);
    c.y = clamp(c.y + dy, box.y1 + heart.size / 2, box.y2 - heart.size / 2);
    c.life -= SCALE;
    if (c.life <= 0) clones.splice(i, 1);
  }
  clonePrev.x = heart.x; clonePrev.y = heart.y;
}

// ───────────────────────── 输入 ─────────────────────────
const keys = new Set();
const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

on('keydown', e => {
  if(options.blocked?.() || e.target?.closest?.('button,a,input,textarea,select'))return;
  if(e.repeat && ['KeyR','KeyP','KeyF'].includes(e.code))return;
  keys.add(e.code);
  // ★ 阻止方向键滚页面、空格触发聚焦的按钮（知识 §5-6）
  if (BLOCK.has(e.code)) e.preventDefault();
  if (e.code === 'KeyR' && running) reset();
  if (e.code === 'KeyP') setPaused(!paused);
  if (e.code === 'KeyF') setFps(FPS === 60 ? 30 : 60);   // 锁 60 / 30 帧切换
});
on('keyup', e => keys.delete(e.code));

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ─────────────────── 玩家移动（对应 obj_heart） ───────────────────
function moveHeart() {
  // ★ SHIFT 半速 = 东方系列的「低速模式」，用来精确穿缝
  const slow = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 0.5 : 1;
  const sp = G.sp * slow * SCALE;         // ★ 乘 SCALE：锁 30 帧时每步走两倍距离

  let dx = ((keys.has('ArrowRight') || keys.has('KeyD')) ? 1 : 0) - ((keys.has('ArrowLeft') || keys.has('KeyA')) ? 1 : 0);
  let dy = ((keys.has('ArrowDown') || keys.has('KeyS'))  ? 1 : 0) - ((keys.has('ArrowUp') || keys.has('KeyW'))   ? 1 : 0);
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }   // 斜向不加速
  if(pointerTarget){const x=pointerTarget.x-heart.x,y=pointerTarget.y-heart.y,len=Math.hypot(x,y);const scale=len?Math.min(1,len/sp)/len:0;dx=x*scale;dy=y*scale;}

  const h = heart.size / 2;
  const px = heart.x, py = heart.y;
  heart.x = clamp(heart.x + dx * sp, box.x1 + h, box.x2 - h);
  heart.y = clamp(heart.y + dy * sp, box.y1 + h, box.y2 - h);
  // ★ 记录真实速度（px/帧，不含 SCALE）供追踪弹预判未来位置
  heart.vx = (heart.x - px) / SCALE;
  heart.vy = (heart.y - py) / SCALE;
}

// ─────────── ⑤ 波次编排：生成器函数替代 alarm[] 链 ───────────
// yield N  →  等 N 帧。整波写法是线性的，一眼能看懂节奏。
const routines = [];

function run(genFn, ...args) {
  routines.push({ it: genFn(...args), wait: 0 });
}

function updateRoutines() {
  for (let i = routines.length - 1; i >= 0; i--) {
    const r = routines[i];
    if (r.wait > 0) { r.wait -= SCALE; continue; }   // yield N 是 60Hz 帧，按 SCALE 折算
    const res = r.it.next();
    if (res.done) { routines.splice(i, 1); continue; }
    r.wait = res.value || 0;
  }
}

/** 波 1：环形 —— 不再固定在中心，而在【玩家周围随机角度、固定距离】生成；
 *         生成前闪烁一个红点预警（spawnWarn）。 */
function* wave_ring() {
  for (let w = 0; w < 3; w++) {
    const ang = Math.random() * Math.PI * 2;          // 玩家周围的随机角度
    const R = 96;                                      // 距离玩家约 96px
    const sx = clamp(heart.x + Math.cos(ang) * R, box.x1 + 16, box.x2 - 16);
    const sy = clamp(heart.y + Math.sin(ang) * R, box.y1 + 16, box.y2 - 16);
    spawnWarn(sx, sy, 42);                             // ★ 红点预警 42 帧
    yield 42;
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8 + w * 0.2;           // 每轮整体偏转一点，避免走同缝
      spawn({
        x: sx, y: sy,
        vx: Math.cos(a) * BASE_V, vy: Math.sin(a) * BASE_V,
        r: 4, dmg: 5, type: 'ring',
        inflate: Math.random() < 0.35 ? 48 : 0         // 部分环形弹：闪一段时间后膨胀为 2 倍
      });
    }
    yield 50;
  }
}

/** 波 2：追踪火弹（加强版）
 *   - 普通追踪：读取玩家速度预判未来位置，朝预测点飞；线速度越快加速度越小，封顶 Vm（无速度突变）。
 *   - 一级追踪(l1)：平时同样预判，当逼近到 1s×v 距离时，改向一次朝玩家当前位置、提速到 3v，之后直线。 */
function* wave_chase() {
  yield 30;
  for (let i = 0; i < 8; i++) {
    const l1 = (i % 3 === 2);                          // 每 3 发里 1 发是一级追踪
    spawn({
      x: box.x1 + 12 + Math.random() * (box.x2 - box.x1 - 24),
      y: box.y1 + 8,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.4 + Math.random() * 0.4,
      homing: l1 ? HOMING_A0 * 0.9 : HOMING_A0,
      homingKind: l1 ? 'l1' : 'predict',
      maxSpeed: Vm,
      lead: LEAD,
      burstDist: 60 * BASE_V,                          // 1 秒行程 = 60 帧 × BASE_V
      burstSpeed: 3 * BASE_V,
      r: 5, dmg: 4, type: 'fire'
    });
    yield 18;
  }
  yield 80;
}

/** 波 3：重力抛物线（每 5 发混入 1 发绿色回血弹） */
function* wave_gravity() {
  yield 20;
  for (let i = 0; i < 15; i++) {
    const green = i % 5 === 4;
    spawn({
      x: box.x1 + 24 + Math.random() * (box.x2 - box.x1 - 48),
      y: box.y1 - 8,                              // 从框上方落下
      vx: (Math.random() - 0.5) * 2,
      vy: -1.2 - Math.random() * 1.5,             // 先向上，再被重力拉回 → 抛物线
      gravity: 0.22,
      r: 5,
      dmg: green ? 0 : 4,
      heal: green ? 1 : 0,                        // ★ 弹幕不只是伤害，也可以回血
      type: green ? 'veggie' : 'bone'
    });
    yield 16;
  }
  yield 90;
}

/** 波新增：周围普通弹幕 —— 先在框外停留显示一会儿（telegraph），发射瞬间朝玩家此刻方向，
 *         方向锁定，之后沿直线持续加速（速度越来越快）。 */
function* wave_ambush() {
  yield 20;
  for (let k = 0; k < 3; k++) {                        // 3 批
    for (let i = 0; i < 7; i++) {
      const edge = Math.floor(Math.random() * 4);      // 上/下/左/右 随机一边
      let x, y;
      if (edge === 0)      { x = box.x1 + Math.random() * (box.x2 - box.x1); y = box.y1 - 26; }
      else if (edge === 1) { x = box.x1 + Math.random() * (box.x2 - box.x1); y = box.y2 + 26; }
      else if (edge === 2) { x = box.x1 - 26; y = box.y1 + Math.random() * (box.y2 - box.y1); }
      else                 { x = box.x2 + 26; y = box.y1 + Math.random() * (box.y2 - box.y1); }
      spawn({
        x, y, vx: 0, vy: 0,
        telegraph: 36 + Math.random() * 20,            // 框外待机
        accel: 0.05, speedCap: 9,                      // 发射后加速、封顶 9
        r: 5, dmg: 4, type: 'ambush'
      });
    }
    yield 70;
  }
}

/** 波新增：泡泡弹 —— 移动缓慢、随机扩散、定时消失 */
function* wave_bubble() {
  yield 20;
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 12; i++) {
      const fromTop = Math.random() < 0.5;
      spawn({
        x: box.x1 + 20 + Math.random() * (box.x2 - box.x1 - 40),
        y: fromTop ? box.y1 - 18 : box.y2 + 18,
        vx: (Math.random() - 0.5) * 0.5,
        vy: fromTop ? 0.3 + Math.random() * 0.3 : -(0.3 + Math.random() * 0.3),
        life: 200 + Math.random() * 120,               // 定时消失
        diffusion: 0.10,                               // 随机扩散强度
        r: 6, dmg: 4, type: 'bubble',
        inflate: Math.random() < 0.3 ? 60 : 0         // 部分泡泡也会膨胀
      });
      yield 8;
    }
    yield 60;
  }
}

const WAVES = [wave_ring, wave_chase, wave_gravity, wave_ambush, wave_bubble, wave_laser];

// ───────────────── 回合调度（对应 turntimer） ─────────────────
// ★ 不固定顺序：每波随机选（避免背板）；同时最多 2 种弹幕（MAX_WAVES）。
const MAX_WAVES = 2;
let waveNo = 0;             // 已发射波次计数（HUD 显示）
let lastWave = -1;          // 上一波索引，避免连续重复
let waveGap = 0;            // 下一波发射间隔（小 → 可与当前波重叠）

function updateWaves() {
  if (routines.length === 0) {
    // 两波都结束：清场喘息一下，再随机发下一波
    for (const b of bullets) b.active = false;
    lasers.length = 0;
  }
  if (waveGap > 0) waveGap -= SCALE;
  if (routines.length < MAX_WAVES && waveGap <= 0) {
    let idx;
    do { idx = Math.floor(Math.random() * WAVES.length); }
    while (WAVES.length > 1 && idx === lastWave);          // 不与上一波重复
    lastWave = idx;
    waveNo++;
    run(WAVES[idx]);
    // 小间隔：让下一波很快接上（甚至与当前波重叠 → 同时两种）
    waveGap = 24 + Math.random() * 36;
    // 影分身：偶尔出现一次（误导玩家判断自身位置），不频繁；且场上无分身时才可能再生成
    if (clones.length === 0 && Math.random() < 0.15) spawnClones(3 + Math.floor(Math.random() * 3));
  }
}

// ─────────────────── ⑥ 子弹更新 + 伤害 ───────────────────
const OUT = 36;   // 出框容差：重力弹要从框外落下，所以不能一出框就销毁

function updateBullets() {
  for (const b of bullets) {
    if (!b.active) continue;

    // 全局寿命上限：任意子弹存在 5s（300 帧@60Hz）即删除
    b.ttl -= SCALE;
    if (b.ttl <= 0) { b.active = false; continue; }

    // ★ 框外待机（telegraph）：只显示、不移动、不判定、不销毁
    if (b.telegraph > 0) {
      b.telegraph -= SCALE;
      if (b.telegraph <= 0) {                            // 发射瞬间：朝玩家此刻方向，方向锁定
        const a = Math.atan2(heart.y - b.y, heart.x - b.x);
        b.vx = Math.cos(a) * BASE_V;
        b.vy = Math.sin(a) * BASE_V;
      }
      continue;
    }

    // 定时消失（泡泡弹）
    if (b.life > 0) {
      b.life -= SCALE;
      if (b.life <= 0) { b.active = false; continue; }
    }
    // 随机扩散（泡泡弹）：每帧小幅扰动 + 限速（缓慢）
    if (b.diffusion) {
      b.vx += (Math.random() - 0.5) * b.diffusion * 2;
      b.vy += (Math.random() - 0.5) * b.diffusion * 2;
      const ms = Math.hypot(b.vx, b.vy), cap = 1.4;
      if (ms > cap) { const f = cap / ms; b.vx *= f; b.vy *= f; }
    }
    // 膨胀：充能倒计时结束 → 半径翻倍（命中判定同步变大）
    if (b.inflate > 0) {
      b.inflate -= SCALE;
      if (b.inflate <= 0) { b.r *= 2; b.inflated = true; }
    }

    if (b.homing) {                                      // 追踪弹
      const sp = Math.hypot(b.vx, b.vy);

      if (b.homingKind === 'l1' && !b.burstDone) {       // 一级追踪：到触发距改向一次 + 提速 3v
        const d = Math.hypot(heart.x - b.x, heart.y - b.y);
        if (d <= b.burstDist) {
          const a = Math.atan2(heart.y - b.y, heart.x - b.x);
          b.vx = Math.cos(a) * b.burstSpeed;
          b.vy = Math.sin(a) * b.burstSpeed;
          b.burstDone = true;
          b.homing = 0;                                  // 之后直线，不再追踪
          continue;
        }
      }

      // 预判玩家未来位置：pos + 真实速度 × lead
      const tx = heart.x + (heart.vx || 0) * b.lead;
      const ty = heart.y + (heart.vy || 0) * b.lead;
      const a = Math.atan2(ty - b.y, tx - b.x);
      // 加速度随线速度增大而减小，封顶 Vm（无速度突变）
      const acc = b.homing * Math.max(0, 1 - sp / b.maxSpeed);
      if (acc > 0) {
        b.vx += Math.cos(a) * acc * SCALE;
        b.vy += Math.sin(a) * acc * SCALE;
      }
      const ns = Math.hypot(b.vx, b.vy);                 // 限速
      if (ns > b.maxSpeed) { const f = b.maxSpeed / ns; b.vx *= f; b.vy *= f; }
    }

    if (b.accel) {                                       // 直线持续加速（非追踪「越来越快」）
      const sp = Math.hypot(b.vx, b.vy);
      const ns = Math.min(b.speedCap || 9, sp + b.accel * SCALE);
      if (sp > 0) { const f = ns / sp; b.vx *= f; b.vy *= f; }
    }

    b.vy += b.gravity * SCALE;
    // 摩擦是「每帧乘一次 (1-f)」，跨多帧要乘方才等价（f 为负时仍然是加速）
    if (b.friction) {
      const f = Math.pow(1 - b.friction, SCALE);
      b.vx *= f; b.vy *= f;
    }

    b.x += b.vx * SCALE; b.y += b.vy * SCALE;

    if (b.x < box.x1 - OUT || b.x > box.x2 + OUT ||
        b.y < box.y1 - OUT || b.y > box.y2 + OUT) {
      b.active = false; continue;
    }

    // ★ 命中判定用半径，不是整张贴图
    const dx = b.x - heart.x, dy = b.y - heart.y;
    if (dx * dx + dy * dy < (b.r + heart.r) ** 2) { hurt(b); continue; }
    // 影分身：命中分身会被吃掉（参与交互），但不扣血；只有本体受伤
    for (const c of clones) {
      const cdx = b.x - c.x, cdy = b.y - c.y;
      if (cdx * cdx + cdy * cdy < (b.r + c.r) ** 2) { b.active = false; break; }
    }
  }
}

// 纯伤害入口：子弹和激光共用，无敌帧在这里统一挡住
function damage(dmg) {
  if (invc > 0) return;
  const d = Math.max(1, Math.round(dmg - (G.df + G.adef) / 5));   // 保底 1
  G.hp = Math.max(0, G.hp - d);
  invc = G.inv;
  shake = 7;
  syncHUD();
  if (G.hp === 0) endGame();
}

function hurt(b) {
  if (invc > 0) return;                                   // 无敌帧内：子弹穿过去，不消失

  if (b.heal) {                                           // 绿弹：回血
    G.hp = Math.min(G.maxhp, G.hp + b.heal);
    b.active = false;
    syncHUD();
    return;
  }

  damage(b.dmg);
  b.active = false;                                       // 普通弹命中即消失
}

// ─────────── 激光：不是子弹，是「有生命周期的线段」 ───────────
// 数量只有个位数，所以不走对象池，直接增删数组即可。
const lasers = [];

function spawnLaser(o) {
  lasers.push({
    x: 0, y: 0, angle: 0, len: 900,
    half: 0, maxHalf: 14,             // 当前半宽 / 最大半宽
    warn: 40, fire: 60, fade: 15,     // 三段时长（单位是 60Hz 帧）
    t: 0,                             // 已过帧数
    spin: 0,                          // 每帧自转弧度
    track: 0,                         // 每帧最多转向玩家的弧度（0 = 不追踪）
    dmg: 6,
    ...o
  });
}

// 点到【线段】的距离 —— 不是点到直线，否则线段两端之外也会误判
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;                          // 夹在线段内
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function updateLasers() {
  for (let i = lasers.length - 1; i >= 0; i--) {
    const L = lasers[i];
    L.t += SCALE;                                          // 帧数按 60Hz 计

    if (L.track) {                                         // 追踪：限转速，否则必中
      const want = Math.atan2(heart.y - L.y, heart.x - L.x);
      let diff = ((want - L.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      const lim = L.track * SCALE;
      L.angle += Math.max(-lim, Math.min(lim, diff));
    }
    L.angle += L.spin * SCALE;                             // 旋转

    // 三段状态机
    if (L.t < L.warn) {
      L.half = 0;                                          // ① 预警：无伤害
    } else if (L.t < L.warn + L.fire) {
      L.half = L.maxHalf;                                  // ② 发射：有伤害
    } else if (L.t < L.warn + L.fire + L.fade) {
      L.half = L.maxHalf * (1 - (L.t - L.warn - L.fire) / L.fade);   // ③ 消散
    } else {
      lasers.splice(i, 1); continue;
    }

    // ★ 只在发射段判定
    if (L.half > 0) {
      const d = distToSegment(heart.x, heart.y, L.x, L.y,
        L.x + Math.cos(L.angle) * L.len, L.y + Math.sin(L.angle) * L.len);
      if (d < L.half + heart.r) damage(L.dmg);             // 只扣血，不消耗激光
    }
  }
}

function drawLasers() {
  for (const L of lasers) {
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(L.angle);

    if (L.half > 0) {
      // 外层半透明 + 中间白芯，两层才像「光」
      ctx.fillStyle = 'rgba(226, 75, 74, .35)';
      ctx.fillRect(0, -L.half, L.len, L.half * 2);
      ctx.fillStyle = 'rgba(255, 238, 238, .95)';
      ctx.fillRect(0, -L.half * 0.35, L.len, L.half * 0.7);
    } else if (Math.floor(L.t / 4) % 2 === 0) {
      // 预警：闪烁虚线，明确告诉玩家「待会儿这里会打」
      ctx.strokeStyle = 'rgba(226, 75, 74, .9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(L.len, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** 波 4：激光三连 —— 横扫 → 追踪 → 旋转 */
function* wave_laser() {
  const cx = (box.x1 + box.x2) / 2, cy = (box.y1 + box.y2) / 2;
  yield 20;
  spawnLaser({ x: box.x1, y: box.y1 + 55, angle: 0, len: box.x2 - box.x1, dmg: 6 });
  yield 130;
  spawnLaser({ x: cx, y: box.y1, angle: Math.PI / 2, len: 320, track: 0.010, dmg: 6 });
  yield 150;
  for (let i = 0; i < 3; i++) {
    spawnLaser({ x: cx, y: cy, angle: (i * Math.PI) / 3, len: 760, spin: 0.0055, dmg: 5 });
    yield 34;
  }
  yield 100;
}

// ───────────────────────── 渲染 ─────────────────────────
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);

  ctx.save();
  if (shake > 0) {                                        // 屏幕震动
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= Math.pow(0.88, SCALE);                      // 衰减也要按 SCALE 折算
    if (shake < 0.3) shake = 0;
  }

  drawBox();
  drawWarnings();                                        // 红点预警（不裁剪，框外也看得见）
  for (const b of bullets) if (b.active && b.telegraph > 0) drawTelegraph(b);  // 框外待机弹

  // 弹幕与激光都裁剪到战斗框内（框外的重力弹不会提前露脸）
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
  ctx.clip();
  drawLasers();                                          // 激光垫在弹幕下面
  for (const b of bullets) if (b.active && b.telegraph <= 0) drawBullet(b);
  ctx.restore();

  drawClones();                                          // 影分身（半透明诱饵）
  drawHeart();
  ctx.restore();
}

function drawBox() {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
}

function drawBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  // 膨胀充能中：闪烁 + 红色预警圈（提示即将变大）
  if (b.inflate > 0 && Math.floor(b.inflate / 4) % 2 === 1) {
    ctx.strokeStyle = 'rgba(255, 110, 110, .95)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    return;                                       // 这一帧实体不画（闪烁效果）
  }

  if (b.type === 'bone') {                 // 骨头：朝运动方向旋转的白色长条
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = ifHeal(b) ? '#7bd88f' : '#f2f2f7';
    roundRect(-9, -3, 18, 6, 3);
    ctx.fill();
  } else if (b.type === 'fire') {          // 火弹：橙色发光圆
    ctx.shadowColor = '#ff9a3c';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffb14d';
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
  } else if (b.type === 'veggie') {        // 绿弹：回血
    ctx.shadowColor = '#7bd88f';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#7bd88f';
    ctx.beginPath(); ctx.ellipse(0, 0, b.r * 0.8, b.r * 1.3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (b.type === 'ambush') {       // 周围伏击弹：紫色
    ctx.fillStyle = '#b478ff';
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e7d2ff'; ctx.lineWidth = 1; ctx.stroke();
  } else if (b.type === 'bubble') {       // 泡泡：半透明蓝圆
    ctx.fillStyle = 'rgba(150, 210, 255, .5)';
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220, 240, 255, .85)'; ctx.lineWidth = 1; ctx.stroke();
  } else {                                 // ring：青色小圆
    ctx.fillStyle = '#8fd6ff';
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e6f7ff'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}

function drawTelegraph(b) {                // 框外待机弹：脉冲紫色，提示即将发射
  const a = 0.35 + 0.45 * Math.abs(Math.sin(b.telegraph * 0.25));
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = `rgba(180, 120, 255, ${a})`;
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(225, 195, 255, .95)';
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function ifHeal(b) { return b.heal > 0; }

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function drawHeartShape(x, y) {
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 5, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 2, 5, 0, Math.PI * 2);
  ctx.moveTo(x - 9, y + 1);
  ctx.lineTo(x, y + 9);
  ctx.lineTo(x + 9, y + 1);
  ctx.closePath();
  ctx.fill();

  // ★ 白色小点 = 真正的判定点（半径 5）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y + 1, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeart() {
  // 无敌帧闪烁（对应 GML 的 image_speed 闪烁）
  if (invc > 0 && Math.floor(invc / 4) % 2 === 1) return;
  drawHeartShape(heart.x, heart.y);
}

function drawClones() {                       // 影分身：与本体一模一样，用来误导玩家判断自己的位置（命中吃弹不扣血）
  for (const c of clones) drawHeartShape(c.x, c.y);
}

// ───────────────────────── HUD ─────────────────────────
const $ = id => options.root ? options.root.querySelector('[data-danmu=' + id + ']') : document.getElementById(id);

function syncHUD() {
  const pct = (G.hp / G.maxhp) * 100;
  const fill = $('hpFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('low', G.hp <= G.maxhp * 0.3);
  $('hpText').textContent = `${G.hp} / ${G.maxhp}`;
  $('wave').textContent = waveNo;
  $('count').textContent = aliveCount();
  if($('time'))$('time').textContent=Math.max(0,duration-elapsed).toFixed(1);
}

function syncFpsLock() {
  const el = $('lock');
  if (el) el.textContent = FPS;
}

// ───────────────────────── 主循环 ─────────────────────────
let acc = 0, last = 0, frames = 0, fpsTime = 0, running = false;

function update() {
  if (gameOver) return;
  elapsed+=SCALE/60;
  if(elapsed>=duration){endGame(true);return;}
  moveHeart();
  updateClones();                        // 分身跟随玩家输入移动
  updateRoutines();
  updateWarnings();
  updateBullets();
  updateLasers();
  updateWaves();
  if (invc > 0) invc -= SCALE;         // 无敌时长按 60Hz 帧计，同样要折算
}

function frame(now) {
  if (!running || disposed) return;
  if(options.blocked?.())setPaused(true);

  acc += now - last;
  last = now;
  if (acc > 200) acc = 200;                    // 切后台回来别炸

  if (!paused && !gameOver) {
    const step = stepMs();
    while (acc >= step) { update(); acc -= step; }
  } else acc=0;
  syncHUD();
  draw();

  // FPS 统计
  frames++;
  if (now - fpsTime >= 1000) {
    $('fps').textContent = frames;
    $('count').textContent = aliveCount();
    frames = 0; fpsTime = now;
  }

  frameId = requestAnimationFrame(frame);
}

// ───────────────────────── 生命周期 ─────────────────────────
function reset() {
  if(disposed)return;
  elapsed=0;acc=0;keys.clear();warnings.length=0;pointerTarget=null;
  $('overlay').classList.remove('show');
  G.hp = G.maxhp;
  invc = 0; shake = 0;
  gameOver = false; paused = false;
  waveNo = 0; lastWave = -1; waveGap = 0;   // 随机调度初始化
  // 出生点放在框的下部中央，不要放在正中心：
  // 环形弹幕正是从中心生成的，站中心等于开局必吃一发。
  heart.x = (box.x1 + box.x2) / 2;
  heart.y = box.y2 - 40;
  heart.vx = 0; heart.vy = 0;
  for (const b of bullets) b.active = false;
  lasers.length = 0;
  routines.length = 0;
  clones.length = 0;
  clonePrev.x = heart.x; clonePrev.y = heart.y;
  syncHUD();
  options.onState?.({paused,gameOver});
}

function endGame(won=false) {
  gameOver = true;
  if(options.onFinish){options.onFinish(won);return;}
  const ov = $('overlay');
  ov.innerHTML = '';
  const h = document.createElement('h1');
  h.textContent = 'GAME OVER';
  const p = document.createElement('p');
  p.textContent = `撑到了第 ${waveNo} 波。按 R 或点下面重开。`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '再来一次';
  btn.addEventListener('click', () => { ov.classList.remove('show'); reset(); });
  ov.append(h, p, btn);
  ov.classList.add('show');
}

function start() {
  if(disposed || running)return;
  $('overlay').classList.remove('show');
  reset();
  running = true;
  last = performance.now();
  fpsTime = last;
  frameId = requestAnimationFrame(frame);
}

if(!options.canvas)$('start').addEventListener('click', start);
function setPaused(value){paused=value;acc=0;keys.clear();pointerTarget=null;options.onState?.({paused,gameOver});}
on('blur',()=>setPaused(true));
const visibility=()=>{if(document.hidden)setPaused(true);};
document.addEventListener('visibilitychange',visibility);

// 先画一帧静态画面，让开始遮罩背后不是纯黑
drawBox();
drawHeart();
syncHUD();
syncFpsLock();
return {start,reset,setPaused,setTarget:value=>{pointerTarget=value;},getSnapshot:()=>({hp:G.hp,elapsed,wave:waveNo,paused,gameOver,bullets:aliveCount(),lasers:lasers.length}),
destroy(){disposed=true;running=false;cancelAnimationFrame(frameId);keys.clear();for(const [type,handler]of listeners)window.removeEventListener(type,handler);document.removeEventListener('visibilitychange',visibility);routines.length=0;lasers.length=0;warnings.length=0;clones.length=0;}};
}};
if(document.getElementById?.('cv'))window.ILYDanmu.create();
