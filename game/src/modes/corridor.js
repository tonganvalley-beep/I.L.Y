// 《I.L.Y.》序章 · 走廊声控灯模式（场景07 公寓走廊）
// 契约：mountCorridor({stage, node, state, assets, go, notify})
//   node.corridor 配置：
//     bgOn / bgOff  开灯 / 关灯背景的资源 ID（默认 bg-hallway / bg-hallway-dark）
//     steps         需要前进（切换）的次数，默认 2；完成后跳 next
//     next          目标节点 ID
//     hint          操作提示文案（缺省用 i18n corridor.hint）
//     texts         每次前进时展示的旁白文本数组（可选）
// 操作：空格 / Enter / 点击画面 前进一步：灯明暗切换 + 屏幕抖动。
(() => {
'use strict';
const { el } = ILY;

function mountCorridor({ stage, node, state, assets, go, notify }) {
  const cfg = node.corridor || {};
  const steps = Math.max(1, cfg.steps || 2);
  const bgOn = assets.image(cfg.bgOn || node.background || 'bg-hallway');
  const bgOff = assets.image(cfg.bgOff || 'bg-hallway-dark');
  let toggled = 0;          // 已前进步数
  let shaking = false;      // 抖动动画进行中（忽略输入）
  let shakeTimer = 0;
  let exitTimer = 0;

  /* 双层背景：上层为关灯图，用透明度过渡模拟声控灯明灭 */
  const wrap = el('div', 'corridor');
  const bgOnEl = el('div', 'corridor-bg');
  bgOnEl.style.backgroundImage = bgOn ? `url("${bgOn}")` : '';
  const bgOffEl = el('div', 'corridor-bg corridor-bg-off');
  bgOffEl.style.backgroundImage = bgOff ? `url("${bgOff}")` : '';
  bgOffEl.style.opacity = '1';   // 初始关灯：走廊一片漆黑，声控灯尚未触发
  const panel = el('div', 'corridor-panel');
  const text = el('p', 'corridor-text', node.text || '');
  const hint = el('p', 'corridor-hint', cfg.hint || ILY.t('corridor.hint'));
  const count = el('p', 'corridor-count', '');
  panel.append(text, hint, count);
  wrap.append(bgOnEl, bgOffEl, panel);
  stage.append(wrap);

  function refreshHint() {
    hint.textContent = exitTimer ? ILY.t('corridor.leaving')
      : (cfg.hint || ILY.t('corridor.hint'));
    count.textContent = ILY.t('corridor.count', { done: Math.min(toggled, steps), total: steps });
  }
  refreshHint();

  /* 切换语言后更新提示文案 */
  const onLang = () => refreshHint();
  window.addEventListener('ily:langchange', onLang);

  function step() {
    if (shaking || exitTimer) return;
    toggled += 1;
    if (Array.isArray(cfg.texts) && cfg.texts[toggled - 1]) text.textContent = cfg.texts[toggled - 1];
    /* 声控灯：脚步触发亮起，停留后自动熄灭（一次空格 = 一次灯亮 + 灯灭） */
    bgOffEl.style.opacity = '0';   // 灯亮
    shaking = true;
    wrap.classList.add('corridor-shake');
    shakeTimer = setTimeout(() => {
      wrap.classList.remove('corridor-shake');
      bgOffEl.style.opacity = '1'; // 灯灭
      shaking = false;
    }, 500);
    if (toggled >= steps) {
      /* 抖动平息后离开走廊 */
      exitTimer = setTimeout(() => go(cfg.next), 1100);
    }
    refreshHint();
  }

  /* 操作：空格 / Enter 前进一步；点击画面同样有效。忽略模态菜单与控件焦点。 */
  function onKey(e) {
    if (document.querySelector('dialog[open]') || e.target.closest('button, a, input')) return;
    if (e.key === ' ' || e.key === 'Enter') { step(); e.preventDefault(); }
  }
  function onPointer() { step(); }
  window.addEventListener('keydown', onKey);
  wrap.addEventListener('click', onPointer);

  return () => {
    clearTimeout(shakeTimer); clearTimeout(exitTimer);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('ily:langchange', onLang);
    wrap.removeEventListener('click', onPointer);
  };
}

Object.assign(ILY, { mountCorridor });
})();
