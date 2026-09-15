/* ============================================================
 * cursor.js —— 男主光标（游戏页 game/index.html 用）
 *
 * 与 sign&log/cursor.js 同一套效果，让鼠标指针从登录页、开始界面
 * 到游戏内贯穿始终：
 *   · 静止：正面立绘
 *   · 左右移动：对应朝向的走路两帧循环（纯竖直移动保持上次朝向）
 *   · 按住鼠标：显示背面立绘，松开或鼠标离开窗口后恢复
 *
 * 实现要点：
 *   · 所有光标图都是 48×48 画布、人物居中、热点 (24,24) 即人物中心
 *   · 注入 "body 及其所有元素 cursor: inherit !important"，
 *     让按钮、对话框、canvas 等也统一显示主角光标
 *   · requestAnimationFrame 每帧检查：移动中每 80ms 换一帧，
 *     停止 150ms 后恢复正面
 *
 * 素材：assets/images/ui/cursor/（从 sign&log/photo&video/ 复制，
 *       保证游戏目录自包含）
 * ============================================================ */
(function () {
  const BASE = 'assets/images/ui/cursor/';
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

  const WALK_INTERVAL = 80;   /* 走路帧切换间隔（ms） */
  const STOP_DELAY = 150;     /* 停多久算"静止"（ms） */

  /* 注入样式：body 及所有子元素的光标一律跟随 <html> 的内联设置 */
  const style = document.createElement('style');
  style.textContent = 'body, body * { cursor: inherit !important; }';
  document.head.appendChild(style);

  const root = document.documentElement;

  function applyCursor(cursor) {
    root.style.cursor = cursor;
  }

  let lastMoveTime = performance.now();
  let lastX = null;
  let facing = 1;             /* 1 = 朝右，-1 = 朝左 */
  let walkFrame = 0;
  let lastFrameSwitch = 0;
  let isMouseDown = false;    /* 按下鼠标时显示背面 */

  window.addEventListener('mousedown', () => { isMouseDown = true; });
  window.addEventListener('mouseup',   () => { isMouseDown = false; });
  /* 鼠标离开窗口也视为抬起，避免松开后仍停留在背面 */
  window.addEventListener('mouseleave', () => { isMouseDown = false; });

  window.addEventListener('mousemove', (e) => {
    if (lastX !== null && e.clientX !== lastX) {
      facing = (e.clientX > lastX) ? 1 : -1;
    }
    lastX = e.clientX;
    lastMoveTime = performance.now();
  });

  function updateCursor(timestamp) {
    if (document.body.classList.contains('rpg-active')) {
      applyCursor('default');
    } else if (isMouseDown) {
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

  /* 进页面立刻显示正面光标，然后启动动画循环 */
  applyCursor(CURSOR_IDLE);
  requestAnimationFrame(updateCursor);
})();
