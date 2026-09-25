(() => {
'use strict';
const { el, button, mountScene } = ILY;
function isDialogueSkippable(node) {
  return ['dialogue', 'monologue', 'heroine-card'].includes(node?.type) && typeof node.next === 'string' && node.next.length > 0;
}
function mountDialogue({stage, node, state, assets, voice, go, isSkipping = () => false, setSkipping = () => {}, getSkipDelay = () => 140}) {
  mountScene(stage, node, assets);
  void voice?.play(node);
  if(node.screenText){const impulse=el('div','chapter-impulse',node.screenText);stage.append(impulse);}
  if(node.sceneEffect)stage.querySelector('.scene')?.classList.add('chapter-'+node.sceneEffect);
  if (Object.hasOwn(node, 'bgm')) assets.setMusic(node.bgm);
  const box = el('section', 'dialogue');
  const text = el('p', 'dialogue-text');
  const actions = el('div', 'actions');
  /* 不显示说话人标签的三种情况：没有 speaker 字段、剧本里写成「旁白」、
     以及剧本编辑器遗留的占位值「无」。
     必须整体隐藏而不是清空文本——.speaker 带 border-left 与 padding-left，
     只清空文本会在对白框里留下一条竖线和一段缩进。 */
  /* 英文模式下 speaker 会被换成英文，于是按中文原值 __speakerZh 判断：
     中文原值是「旁白 / 无」时仍然整体隐藏标签（stage.css 也按中文原值上色）。 */
  const speakerZh = node.__speakerZh || node.speaker;
  const noLabel = !speakerZh || ['旁白', '无'].includes(speakerZh);
  const speaker = el('div', 'speaker', noLabel ? '' : node.speaker);
  if (!noLabel) speaker.dataset.speaker = speakerZh; // 供 CSS 按角色上色（见 stage.css .speaker[data-speaker=…]）
  speaker.hidden = noLabel;
  box.append(speaker, text, actions);
  stage.append(box);
  const chars = Array.from(node.text || '');
  let count = 0, timer, skipTimer = 0;
  /* 顶栏「隐藏」：统一走 core/dom.js 的 createHideChrome 控制器 ——
     收起当前这一幕的文字区、左上章标题、右上整排按钮（连它自己），画面只剩背景 / CG。
     不是半透明淡出，是真的 display:none。 */
  const veil = ILY.createHideChrome([box]);
  const complete = () => { count = chars.length; text.textContent = chars.join(''); clearInterval(timer); };
  const restore = () => { veil.restore(); stage.focus({ preventScroll: true }); };
  const next = () => {
    if (veil.isHidden) { restore(); return; }
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
  /* 「隐藏」按钮常驻顶栏右上第一颗（index.html 里 #hide-ui），由 createHideChrome
     按幕接管 / 交还，所以这里不再临时挂按钮。 */
  if (node.type === 'choice') {
    complete();
    for (const choice of node.choices) actions.append(button(choice.text, () => {
      if (choice.flag?.key) state.flags[choice.flag.key] = choice.flag.value;
      go(choice.next);
    }));
  } else {
    /* 对白框底部那一行现在只剩选项（普通对白没有选项了），空着就收回，不留空白。 */
    actions.hidden = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) complete();
    else timer = setInterval(() => {
      text.textContent = chars.slice(0, ++count).join('');
      if (count >= chars.length) clearInterval(timer);
    }, 32);
  }
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
    if (event.code === 'KeyH') { event.preventDefault(); veil.toggle(); }
  };
  stage.tabIndex = -1;
  stage.focus({ preventScroll: true });
  stage.addEventListener('click', click, true);
  window.addEventListener('keydown', key);
  scheduleSkip();
  /* 切节点 / 换玩法时必须复原显隐、把隐藏控制权交还顶栏，否则隐藏状态会残留到下一幕。 */
  return () => { voice?.stop(); clearInterval(timer); clearTimeout(skipTimer); veil.dispose(); stage.removeEventListener('click', click, true); window.removeEventListener('keydown', key); window.removeEventListener('ily:skipchange', onSkipChange); };
}
Object.assign(ILY, { isDialogueSkippable, mountDialogue });
})();
