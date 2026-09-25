(() => {
'use strict';
/* ---------- 真结局片尾曲（ED）----------
   真结局节点（ending_true）到达后，不走「直接摆结束卡」的老路，而是：

     结尾画面停留一拍 → 压黑（BGM 同步淡出）→ 淡入播放 game/I.L.Y.-ED.mp4
     → 视频结束或玩家跳过 → 收黑 → 在黑场里摆好结束卡 → 黑幕淡出，交还玩家

   为什么这样衔接才不露缝：
   · 视频本身是 1920×1080、与 1280×720 画布同为 16:9，object-fit:cover 就是满幅，
     既不会出现黑边，也不会有「画中画」的割裂感；
   · 视频开头几秒本身就是纯黑 + 字幕淡入，所以「压到全黑」再接视频，
     两段黑场叠在一起，看不出接缝，也就没有突兀的硬切；
   · 结束卡（标题 / 成就 / 按钮）在 ED 期间整块隐藏 —— 否则标题压在人声字幕上、
     按钮又点不到，两套文字会打架；播完才显形，顺序上正好是「尾声 → ED → ENDING」；
   · 玩家跳过时同样走「收黑 → 显形」的完整流程，不硬切；
   · 浮层铺满整块画布（含顶栏）并在捕获阶段吞掉键盘，免得 S（快进）/ PageUp（回滚）
     在片尾里把剧情切到别的节点。

   视频 228MB，已用 faststart 把 moov 前置，浏览器边下边播，不必等整包下完。 */
const { el, button } = ILY;
const t = (key, vars) => ILY.t(key, vars);

const SRC = 'I.L.Y.-ED.mp4';

/* 时间轴（毫秒）。CSS 的过渡时长也从这里下发（见 play 里的 --ed-*），
   别在样式里另写一份死值，否则两边会漂移。 */
const HOLD_MS = 1400;            // 结尾画面停留：给最后一句台词留一拍呼吸
const BLACK_MS = 1300;           // 压黑
const FADE_MS = 1400;            // 黑场 ↔ 视频的交叉淡入淡出
const CLOSE_BLACK_MS = 1100;     // 收黑：比开场紧一档，收尾更利落
const READY_TIMEOUT_MS = 20000;  // 本地文件正常是瞬时；超时按失败处理，别把玩家锁在黑屏里
const SKIP_AFTER_MS = 5000;      // 跳过按钮出现时机：不早于开场，免得一上来就被剧透

let layer = null;      // 同一时刻只允许一个 ED 浮层
let watched = false;   // 本次页面生命周期内是否已放过（回滚重进也不重播）

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const playing = () => Boolean(layer && layer.isConnected);

/* 目前只有真结局配了片尾曲（ending_just2 / ending_reality 等结局卡没有 ED，
   不该出现「重温片尾曲」）。以后要给别的结局也配 ED，在这里登记即可。 */
const ED_ENDINGS = new Set(['ENDING_TRUE']);
const canPlay = node => Boolean(node && ED_ENDINGS.has(node.ending));

/* 回滚后的刷新（restoringRollback）不算「新到达」，否则回滚一次就重播五分钟 ED。
   注意 state.flags 会被回滚快照退回去，所以另留一个模块级 watched 兜底。 */
function shouldPlay({ node, state, restoringRollback } = {}) {
  if (!canPlay(node) || restoringRollback || watched) return false;
  return !(state && state.flags && state.flags.ED_ONE_LAST_KISS);
}

/* 等视频可播。超时或解码失败都返回 false，由调用方决定怎么收场。 */
function whenReady(video) {
  if (video.readyState >= 3) return Promise.resolve(true);
  return new Promise(resolve => {
    let settled = false;
    const done = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
      resolve(ok);
    };
    const onCanPlay = () => done(true);
    const onError = () => done(false);
    const timer = setTimeout(() => done(false), READY_TIMEOUT_MS);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);
  });
}

function play({ state, node, endPanel, assets } = {}) {
  if (playing()) return () => {};
  const frame = document.querySelector('#game-frame');
  if (!frame) return () => {};

  watched = true;
  if (state && state.flags) state.flags.ED_ONE_LAST_KISS = true;
  if (endPanel) endPanel.hidden = true;   // ED 期间藏起结束卡，收黑后再显形

  const box = el('div', 'ed-layer');
  box.style.setProperty('--ed-black', `${BLACK_MS}ms`);
  box.style.setProperty('--ed-fade', `${FADE_MS}ms`);
  box.style.setProperty('--ed-close', `${CLOSE_BLACK_MS}ms`);

  const video = document.createElement('video');
  video.className = 'ed-video';
  video.preload = 'auto';
  video.playsInline = true;
  video.controls = false;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-label', t('ed.label'));
  // 立刻挂上 src 开始缓冲：压黑的这 2.7 秒正好用来把片头几 MB 拉下来。
  video.src = SRC;
  video.load();

  const curtain = el('div', 'ed-curtain');
  const note = el('p', 'ed-note', t('ed.loading'));
  note.hidden = true;                     // 压黑之前不露字，先让结尾画面自己说完
  const skip = button(t('ed.skip'), () => close());
  skip.classList.add('ed-skip');
  skip.title = t('ed.skipHint');

  box.append(video, curtain, note, skip);
  frame.append(box);
  layer = box;

  let finished = false;   // 已经进过收场流程
  let torn = false;       // 浮层已经拆掉
  let timer = 0;
  let onKey = null;

  /* ED 期间键盘全部拦下：main.js 在 window 上挂着 S（快进）/ PageUp（回滚），
     在片尾里生效会把剧情切走。在 document 捕获阶段 stopPropagation，
     整条传播链（window → document → … → window）都会被截断。 */
  onKey = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    event.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);

  /* 收场：先把幕布收到全黑盖住视频最后一帧 → 在黑场里摆好结束卡 → 黑幕淡出。
     重复调用安全；拆层由 teardown 收尾。 */
  function close() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { video.pause(); } catch {}
    box.classList.add('is-closing');
    setTimeout(() => {
      if (!box.isConnected) return;
      if (endPanel) endPanel.hidden = false;
      requestAnimationFrame(() => box.classList.add('is-gone'));
    }, CLOSE_BLACK_MS);
    setTimeout(teardown, CLOSE_BLACK_MS + FADE_MS + 80);
  }

  /* 交给 main.js 当本节点的 cleanup：go() 每次切节点都会先调它。
     幂等 —— 既会被正常收场调用，也会被切节点时的 cleanup() 调用。 */
  function teardown() {
    if (torn) return;
    torn = true;
    finished = true;
    clearTimeout(timer);
    if (onKey) { document.removeEventListener('keydown', onKey, true); onKey = null; }
    try { video.pause(); } catch {}
    video.removeAttribute('src');
    try { video.load(); } catch {}
    box.remove();
    if (layer === box) layer = null;
    if (endPanel) endPanel.hidden = false;
  }

  video.addEventListener('ended', close);
  video.addEventListener('error', () => {
    note.hidden = false;
    note.textContent = t('ed.failed');
  });

  /* 自动播放被拦（少见，file:// 下会遇到）时不静默卡黑：给一个明确的播放按钮。 */
  async function start() {
    try {
      await video.play();
    } catch {
      if (finished || torn) return;
      const manual = button(t('ed.play'), () => {
        manual.remove();
        start();
      });
      manual.classList.add('ed-manual');
      box.append(manual);
      manual.focus({ preventScroll: true });
    }
  }

  timer = setTimeout(() => skip.classList.add('is-visible'), SKIP_AFTER_MS);

  (async () => {
    // 1. 结尾画面留一拍，再压黑，同时把 BGM 淡出去给 ED 歌让位
    await sleep(HOLD_MS);
    if (!box.isConnected) return;
    try { assets?.setMusic(null, { fadeMs: BLACK_MS + 250 }); } catch {}
    if (state) state.music = null;   // 同步给存档：ED 结束后此刻就是静音，别让读档又把片尾曲放回来
    box.classList.add('is-black');
    await sleep(BLACK_MS);
    if (!box.isConnected || finished) return;

    // 2. 全黑里等视频就绪。本地是秒开，所以提示压后 700ms 才出 ——
    //    免得「片尾曲加载中」在压黑的画面上一闪而过，反而打断情绪。
    const hint = setTimeout(() => { note.hidden = false; }, 700);
    const ready = await whenReady(video);
    clearTimeout(hint);
    if (!box.isConnected || finished) return;
    if (!ready) {
      note.hidden = false;
      note.textContent = t('ed.failed');
      skip.classList.add('is-visible');   // 播不了也得让玩家走得掉
      return;
    }

    // 3. 从黑场交叉淡入视频，同时开声
    note.hidden = true;
    box.classList.add('is-playing');
    skip.classList.add('is-visible');
    await start();
  })();

  return teardown;
}

Object.assign(ILY, { EndingVideo: { play, shouldPlay, canPlay, playing, SRC } });
})();
