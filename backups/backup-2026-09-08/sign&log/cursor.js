/* ============================================================
 * cursor.js —— 男主光标（login.html / index.html / game.html 共用）
 *
 * 效果：
 *   · 静止：正面立绘
 *   · 左右移动：对应朝向的走路两帧循环（右移朝右走，左移朝左走，
 *     纯竖直移动时保持上一次朝向）
 *   · 按住鼠标：显示背面立绘，松开或鼠标离开窗口后恢复
 *
 * 实现要点：
 *   · 所有光标图都是 48×48 画布、人物居中、热点 (24,24) 即人物中心
 *   · 本脚本给 <html> 设置内联 cursor，并注入一条
 *     "body 及其所有元素 cursor: inherit !important" 的样式，
 *     让按钮、输入框、菜单项等也统一显示主角光标，
 *     不会在悬停可点击元素时弹回系统默认光标
 *   · requestAnimationFrame 每帧检查：移动中每 80ms 换一帧走路图，
 *     停止 150ms 后恢复正面
 *
 * 素材（都在 ./photo&video/ 里，和三个页面同目录，相对路径通用）：
 *   cursor-hero-front.png      正面（静止）
 *   cursor-hero-back.png       背面（按住鼠标）
 *   cursor-walk-right-1/2.png  朝右走路两帧
 *   cursor-walk-left-1/2.png   朝左走路两帧（右帧水平镜像）
 * ============================================================ */
(function () {
  const BASE = './photo&video/';
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
  const STOP_DELAY = 150;     /* 停多久算“静止”（ms） */

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
    /* 根据横向移动方向决定人物朝向：右移朝右走，左移朝左走；
       纯竖直移动时保持上一次的朝向 */
    if (lastX !== null && e.clientX !== lastX) {
      facing = (e.clientX > lastX) ? 1 : -1;
    }
    lastX = e.clientX;
    lastMoveTime = performance.now();
  });

  function updateCursor(timestamp) {
    /* 按下鼠标时优先显示背面，覆盖走路/静止状态 */
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

  /* 进页面立刻显示正面光标，然后启动动画循环 */
  applyCursor(CURSOR_IDLE);
  requestAnimationFrame(updateCursor);
})();
