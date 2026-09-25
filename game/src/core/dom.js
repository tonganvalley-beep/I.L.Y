(() => {
'use strict';
// 文本统一通过 textContent 写入，剧情里不混入 HTML。
function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
function button(text, handler) {
  const node = el('button', '', text);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}

// ── 设备 / 输入能力检测（纯运行时，iframe 内也有效） ──
// 刻意不用 UA 字符串：UA 可伪造、手机与平板的 UA 又常常混在一起，
// 而媒体查询反映的是浏览器实测到的输入能力。
// 注意区分「有没有触摸屏」和「是不是手机/平板」——触摸屏笔记本属于前者、不属于后者。
const mq = q => typeof matchMedia === 'function' && matchMedia(q).matches;
const device = {
  coarse: () => mq('(pointer: coarse)'),                     // 主指针是手指（触摸屏）
  noHover: () => mq('(hover: none)'),                        // 没有悬停能力
  touch: () => (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || mq('(pointer: coarse)'),
  phone: () => mq('(pointer: coarse) and (hover: none)')     // 手机 / 平板；触摸屏笔记本不算
};

// ── 顶栏「隐藏」控制器 ──
// 隐藏 = 把传入的文字区（对白框 / 旁白面板…）连同左上章标题、右上整排按钮一起
// display:none —— 不加半透明，画面上只剩背景或 CG。
// 顶栏那颗「隐藏」按钮自己也属于右上那一排，所以隐藏后会一起消失；
// 复原靠点画面 / SPACE / 再按一次 H（各玩法在自己的输入处理里接 isHidden 即可）。
// 每个 mount 只在自己那一幕里持有控制器，cleanup 调 dispose() 复原并交还按钮。
function createHideChrome(targets = []) {
  const header = document.querySelector('.game-header');
  const actions = header?.querySelector('.game-header-actions') || null;
  const toggleBtn = actions?.querySelector('#hide-ui') || null;
  /* 隐藏的是整条 .game-header（含它的渐变底），不是只藏两个子元素——
     否则顶栏那条 linear-gradient 会留在画面上，做不到「只剩背景 / CG」。 */
  const parts = [...targets, header].filter(Boolean);
  let hidden = false;
  const apply = value => {
    hidden = value;
    for (const part of parts) part.hidden = value;
    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', String(value));
    if (!value) return;
    /* 隐藏后排/widget 里那个刚被点掉的按钮已经消失，焦点会掉到 <body>，
       键盘操作（SPACE / H）随之失效。这里把焦点收回舞台，输入链路才不断。 */
    const stage = document.querySelector('#stage');
    const active = document.activeElement;
    if (!stage || !active) return;
    const lost = active === document.body || !active.isConnected || parts.some(part => part.contains?.(active));
    if (lost) stage.focus({ preventScroll: true });
  };
  const api = {
    get isHidden() { return hidden; },
    hide: () => apply(true),
    restore: () => apply(false),
    toggle: () => apply(!hidden),
    /* 切节点时必须交还按钮：下一幕可能 another 不支持隐藏（只能禁用，不能留着可点）。 */
    dispose: () => {
      apply(false);
      if (toggleBtn) { toggleBtn.disabled = true; toggleBtn.onclick = null; toggleBtn.setAttribute('aria-pressed', 'false'); }
    }
  };
  if (toggleBtn) {
    toggleBtn.disabled = false;
    toggleBtn.onclick = () => api.toggle();
  }
  return api;
}

Object.assign(ILY, { el, button, device, createHideChrome });
})();
