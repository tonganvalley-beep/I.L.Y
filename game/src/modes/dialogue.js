(() => {
'use strict';
const { el, button } = ILY;

function mountDialogue({stage, node, assets, go}) {
  const background = assets.image(node.background);
  stage.style.backgroundImage = background ? `url("${background}")` : '';
  if (Object.hasOwn(node, 'bgm')) assets.setMusic(node.bgm);
  stage.append(el('div', 'scene-label', 'PROLOGUE / 雨后的教室'));
  const portrait = assets.image(node.portrait);
  if (portrait) {
    const img = el('img', 'portrait'); img.src = portrait; img.alt = node.speaker || ''; stage.append(img);
  }
  const box = el('section', 'dialogue');
  const text = el('p');
  const actions = el('div', 'actions');
  box.append(el('div', 'speaker', node.speaker || '旁白'), text, actions);
  stage.append(box);
  const chars = Array.from(node.text);
  let count = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer;
  const complete = () => { count = chars.length; text.textContent = node.text; clearInterval(timer); };
  const next = () => { if (count < chars.length) complete(); else go(node.next); };
  if (node.type === 'choice') {
    complete();
    for (const choice of node.choices) actions.append(button(choice.text, () => go(choice.next)));
  } else {
    const advance = button('继续 ▸', next);
    actions.append(advance);
    advance.focus();
    if (reduced) complete();
    else timer = setInterval(() => {
      text.textContent = chars.slice(0, ++count).join('');
      if (count >= chars.length) clearInterval(timer);
    }, 32);
  }
  return () => clearInterval(timer);
}

Object.assign(ILY, { mountDialogue });
})();
