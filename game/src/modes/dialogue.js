(() => {
'use strict';
const { el, button, mountScene } = ILY;
function mountDialogue({stage, node, assets, go}) {
  mountScene(stage, node, assets);
  if (Object.hasOwn(node, 'bgm')) assets.setMusic(node.bgm);
  const box = el('section', 'dialogue');
  const text = el('p', 'dialogue-text');
  const actions = el('div', 'actions');
  const speaker = el('div', 'speaker', node.speaker || '旁白');
  box.append(speaker, text, actions);
  stage.append(box);
  const chars = Array.from(node.text || '');
  let count = 0, timer, hidden = false;
  const complete = () => { count = chars.length; text.textContent = chars.join(''); clearInterval(timer); };
  const restore = () => { hidden = false; box.hidden = false; reveal.hidden = true; stage.focus({ preventScroll: true }); };
  const next = () => {
    if (hidden) { restore(); return; }
    if (count < chars.length) complete();
    else if (node.type !== 'choice' && node.next) go(node.next);
  };
  const reveal = button('显示对白', restore);
  reveal.className = 'reveal-dialogue'; reveal.hidden = true;
  stage.append(reveal);
  const hide = () => { hidden = true; box.hidden = true; reveal.hidden = false; reveal.focus(); };
  if (node.type === 'choice') {
    complete();
    for (const choice of node.choices) actions.append(button(choice.text, () => go(choice.next)));
  } else {
    actions.append(el('span', 'advance-hint', '点击画面 / SPACE'));
    actions.append(button('隐藏对白', hide), button('继续 ▸', next));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) complete();
    else timer = setInterval(() => {
      text.textContent = chars.slice(0, ++count).join('');
      if (count >= chars.length) clearInterval(timer);
    }, 32);
  }
  const click = event => { if (!event.target.closest('button, a')) next(); };
  const key = event => {
    if (document.querySelector('dialog[open]') || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); next(); }
    if (event.code === 'KeyH' && node.type !== 'choice') { event.preventDefault(); if (hidden) restore(); else hide(); }
  };
  stage.tabIndex = -1;
  stage.focus({ preventScroll: true });
  stage.addEventListener('click', click);
  window.addEventListener('keydown', key);
  return () => { clearInterval(timer); stage.removeEventListener('click', click); window.removeEventListener('keydown', key); };
}
Object.assign(ILY, { mountDialogue });
})();
