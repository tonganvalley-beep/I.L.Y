(() => {
'use strict';
const { el, mountScene } = ILY;

function mountHeroineMoment({stage, node, assets, go, isSkipping = () => false, getSkipDelay = () => 140}) {
  mountScene(stage, node, assets);
  const card = node.type === 'heroine-card';
  const panel = el('section', `heroine-moment ${card ? 'heroine-card' : 'heroine-monologue'}`);
  if (card) {
    panel.append(el('span', 'heroine-kicker', node.sectionLabel || '女主视角'), el('h1', '', node.text));
  } else {
    panel.append(el('p', 'heroine-full-text'));
  }
  const hint = el('span', 'heroine-advance', '点击画面 / SPACE');
  panel.append(hint);
  stage.append(panel);

  const text = panel.querySelector('.heroine-full-text');
  const chars = Array.from(node.text || '');
  let count = card ? chars.length : 0;
  let timer = 0;
  let skipTimer = 0;
  let disposed = false;
  const complete = () => {
    count = chars.length;
    if (text) text.textContent = chars.join('');
    clearInterval(timer);
  };
  const next = () => {
    if (count < chars.length) { complete(); return; }
    if (node.next) go(node.next);
  };

  if (text) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) complete();
    else timer = setInterval(() => {
      text.textContent = chars.slice(0, ++count).join('');
      if (count >= chars.length) clearInterval(timer);
    }, 38);
  }
  if (isSkipping() && node.next) {
    complete();
    skipTimer = setTimeout(() => { if (!disposed && isSkipping()) go(node.next); }, Math.max(0, Number(getSkipDelay()) || 140));
  }

  const click = event => {
    if (event.target.closest('button, a, dialog')) return;
    event.preventDefault();
    next();
  };
  const key = event => {
    if (document.querySelector('dialog[open]') || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); next(); }
  };
  stage.tabIndex = -1;
  stage.focus({preventScroll: true});
  stage.addEventListener('click', click, true);
  window.addEventListener('keydown', key);
  return () => {
    disposed = true;
    clearInterval(timer);
    clearTimeout(skipTimer);
    stage.removeEventListener('click', click, true);
    window.removeEventListener('keydown', key);
  };
}

ILY.mountHeroineMoment = mountHeroineMoment;
})();
