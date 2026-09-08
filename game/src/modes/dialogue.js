(() => {
'use strict';
const { el, button, mountScene } = ILY;
function mountDialogue({stage, node, state, assets, go}) {
  mountScene(stage, node, assets);
  if (Object.hasOwn(node, 'bgm')) assets.setMusic(node.bgm);
  const box = el('section', 'dialogue');
  const text = el('p', 'dialogue-text');
  const actions = el('div', 'actions');
  const speaker = el('div', 'speaker', node.speaker || ILY.t('dlg.narrator'));
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
  const reveal = button(ILY.t('dlg.show'), restore);
  reveal.className = 'reveal-dialogue'; reveal.hidden = true;
  stage.append(reveal);
  const hide = () => { hidden = true; box.hidden = true; reveal.hidden = false; reveal.focus(); };
  let hideBtn = null, nextBtn = null, advanceHint = null;
  if (node.type === 'choice') {
    complete();
    for (const choice of node.choices) actions.append(button(choice.text, () => {
      if (choice.flag?.key) state.flags[choice.flag.key] = choice.flag.value;
      go(choice.next);
    }));
  } else {
    advanceHint = el('span', 'advance-hint', ILY.t('dlg.advance'));
    hideBtn = button(ILY.t('dlg.hide'), hide);
    nextBtn = button(ILY.t('dlg.next'), next);
    actions.append(advanceHint, hideBtn, nextBtn);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) complete();
    else timer = setInterval(() => {
      text.textContent = chars.slice(0, ++count).join('');
      if (count >= chars.length) clearInterval(timer);
    }, 32);
  }
  /* 切换语言后更新界面按钮文案 */
  const onLang = () => {
    if (!node.speaker) speaker.textContent = ILY.t('dlg.narrator');
    reveal.textContent = ILY.t('dlg.show');
    if (hideBtn) { advanceHint.textContent = ILY.t('dlg.advance'); hideBtn.textContent = ILY.t('dlg.hide'); nextBtn.textContent = ILY.t('dlg.next'); }
  };
  window.addEventListener('ily:langchange', onLang);
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
  return () => { clearInterval(timer); stage.removeEventListener('click', click); window.removeEventListener('keydown', key); window.removeEventListener('ily:langchange', onLang); };
}
Object.assign(ILY, { mountDialogue });
})();
