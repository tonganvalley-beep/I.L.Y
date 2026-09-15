(() => {
'use strict';
const { el, button, mountScene } = ILY;
function isDialogueSkippable(node) {
  return ['dialogue', 'monologue', 'heroine-card'].includes(node?.type) && typeof node.next === 'string' && node.next.length > 0;
}
function mountDialogue({stage, node, state, assets, go, isSkipping = () => false, setSkipping = () => {}, getSkipDelay = () => 140}) {
  mountScene(stage, node, assets);
  if(node.screenText){const impulse=el('div','chapter-impulse',node.screenText);stage.append(impulse);}
  if(node.sceneEffect)stage.querySelector('.scene')?.classList.add('chapter-'+node.sceneEffect);
  if (Object.hasOwn(node, 'bgm')) assets.setMusic(node.bgm);
  const box = el('section', 'dialogue');
  const text = el('p', 'dialogue-text');
  const actions = el('div', 'actions');
  const speaker = el('div', 'speaker', node.speaker || ILY.t('dlg.narrator'));
  box.append(speaker, text, actions);
  stage.append(box);
  const chars = Array.from(node.text || '');
  let count = 0, timer, skipTimer = 0, hidden = false;
  const complete = () => { count = chars.length; text.textContent = chars.join(''); clearInterval(timer); };
  const restore = () => { hidden = false; box.hidden = false; reveal.hidden = true; stage.focus({ preventScroll: true }); };
  const next = () => {
    if (hidden) { restore(); return; }
    if (count < chars.length) complete();
    else if (node.type !== 'choice' && node.next) go(node.next);
  };
  const scheduleSkip = () => {
    clearTimeout(skipTimer);
    if (!isSkipping() || !isDialogueSkippable(node)) return;
    complete();
    const configuredDelay = Number(getSkipDelay());
    const delay = Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 140;
    skipTimer = setTimeout(() => {
      if (!isSkipping()) return;
      if (document.querySelector('dialog[open]')) { setSkipping(false); return; }
      go(node.next);
    }, delay);
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
  const onSkipChange = () => scheduleSkip();
  window.addEventListener('ily:skipchange', onSkipChange);
  const click = event => {
    if (isSkipping()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setSkipping(false);
      return;
    }
    if (!event.target.closest('button, a')) next();
  };
  const key = event => {
    if (document.querySelector('dialog[open]') || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
    if (isSkipping() && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); setSkipping(false); return; }
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); next(); }
    if (event.code === 'KeyH' && node.type !== 'choice') { event.preventDefault(); if (hidden) restore(); else hide(); }
  };
  stage.tabIndex = -1;
  stage.focus({ preventScroll: true });
  stage.addEventListener('click', click, true);
  window.addEventListener('keydown', key);
  scheduleSkip();
  return () => { clearInterval(timer); clearTimeout(skipTimer); stage.removeEventListener('click', click, true); window.removeEventListener('keydown', key); window.removeEventListener('ily:langchange', onLang); window.removeEventListener('ily:skipchange', onSkipChange); };
}
Object.assign(ILY, { isDialogueSkippable, mountDialogue });
})();
