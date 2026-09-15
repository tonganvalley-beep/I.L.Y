/* ============================================================
 * cursor.js —— 男主光标（about-us 全部页面共用）
 *
 * 与 sign&log/cursor.js、game/src/cursor.js 同一套效果：
 *   · 静止：正面立绘 · 左右移动：对应朝向走路两帧 · 按住：背面
 *
 * 与另两个版本的区别：about-us 页面层级不一（首页在 about-us/，
 * 成员页在 about-us/members/xxx/），内联 cursor 的相对 url 按
 * 页面地址解析会失效，因此这里用 document.currentScript.src
 * 推出脚本所在目录，拼出光标图的绝对 URL，任何深度都可用。
 *
 * 素材：about-us/cursor-imgs/（从 sign&log/photo&video/ 复制）
 * ============================================================ */
(function () {
  const BASE = new URL('cursor-imgs/', document.currentScript.src).href;
  const HOT  = '24 24, auto';   /* 热点 = 画布中心 = 人物中心 */

  const CURSOR_IDLE = "url('" + BASE + "cursor-hero-front.png') " + HOT;
  const CURSOR_BACK = "url('" + BASE + "cursor-hero-back.png') " + HOT;
  const CURSOR_WALK_RIGHT = [
    "url('" + BASE + "cursor-walk-right-1.png') " + HOT,
    "url('" + BASE + "cursor-walk-right-2.png') " + HOT
  ];
  const CURSOR_WALK_LEFT = [
    "url('" + BASE + "cursor-walk-left-1.png') " + HOT,
    "url('" + BASE + "cursor-walk-left-2.png') " + HOT
  ];

  const WALK_INTERVAL = 80;
  const STOP_DELAY = 150;

  const style = document.createElement('style');
  style.textContent = 'body, body * { cursor: inherit !important; }';
  document.head.appendChild(style);

  const root = document.documentElement;

  function applyCursor(cursor) {
    root.style.cursor = cursor;
  }

  let lastMoveTime = performance.now();
  let lastX = null;
  let facing = 1;
  let walkFrame = 0;
  let lastFrameSwitch = 0;
  let isMouseDown = false;

  window.addEventListener('mousedown', () => { isMouseDown = true; });
  window.addEventListener('mouseup',   () => { isMouseDown = false; });
  window.addEventListener('mouseleave', () => { isMouseDown = false; });

  window.addEventListener('mousemove', (e) => {
    if (lastX !== null && e.clientX !== lastX) {
      facing = (e.clientX > lastX) ? 1 : -1;
    }
    lastX = e.clientX;
    lastMoveTime = performance.now();
  });

  function updateCursor(timestamp) {
    if (isMouseDown) {
      applyCursor(CURSOR_BACK);
    } else if (timestamp - lastMoveTime < STOP_DELAY) {
      if (timestamp - lastFrameSwitch > WALK_INTERVAL) {
        walkFrame = (walkFrame + 1) % 2;
        lastFrameSwitch = timestamp;
      }
      const frames = (facing === 1) ? CURSOR_WALK_RIGHT : CURSOR_WALK_LEFT;
      applyCursor(frames[walkFrame]);
    } else {
      applyCursor(CURSOR_IDLE);
    }
    requestAnimationFrame(updateCursor);
  }

  applyCursor(CURSOR_IDLE);
  requestAnimationFrame(updateCursor);
})();
