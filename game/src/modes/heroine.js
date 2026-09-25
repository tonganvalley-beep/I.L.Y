(() => {
'use strict';
const { el, mountScene } = ILY;

// Walk the edited story links, so deleted cues are omitted and inserted lines rewind too.
function heroineRewindFrames(story, start, end) {
  const frames = [], seen = new Set();
  let id = story?.nodes[start]?.next;
  while (id && id !== end && !seen.has(id)) {
    seen.add(id);
    const frame = story.nodes[id];
    if (!frame || frame.rewindScene) break;
    if (['dialogue', 'monologue'].includes(frame.type)) frames.push({ id, node: frame });
    id = frame.next;
  }
  return frames.reverse();
}

function mountHeroineRewind(context) {
  const { stage, node, story, assets, isSkipping = () => false, setSkipping = () => {} } = context;
  const frames = heroineRewindFrames(story, node.rewindScene, node.id);
  const reel = el('div', 'heroine-rewind');
  reel.setAttribute('aria-hidden', 'true');
  stage.append(reel);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0, timer = 0, disposed = false, finished = false, cleanupCard = () => {};
  const finish = () => {
    if (disposed || finished) return;
    finished = true;
    clearTimeout(timer);
    reel.remove();
    cleanupCard = mountHeroineMoment({ ...context, node: { ...node, rewindScene: null } });
  };
  const step = () => {
    if (disposed || finished) return;
    // Menus and background tabs must not consume the reveal while it is unseen.
    if (document.hidden || document.querySelector('dialog[open]')) {
      timer = setTimeout(step, 100);
      return;
    }
    if (isSkipping() || index >= frames.length) { finish(); return; }
    const frame = frames[index++];
    reel.replaceChildren();
    reel.dataset.frame = frame.id;
    mountScene(reel, { ...frame.node, visualEffects: [], transition: '' }, assets);
    if (frame.node.type === 'dialogue') {
      const box = el('section', 'dialogue');
      const speaker = el('div', 'speaker', frame.node.speaker || '');
      if (frame.node.speaker) speaker.dataset.speaker = frame.node.speaker; // 与 dialogue.js 同一套按角色配色
      box.append(speaker, el('p', 'dialogue-text', frame.node.text), el('div', 'actions'));
      reel.append(box);
    } else {
      const box = el('section', 'heroine-moment heroine-monologue');
      if (frame.node.textPosition) box.dataset.textPosition = frame.node.textPosition;
      box.append(el('p', 'heroine-full-text', frame.node.text));
      reel.append(box);
    }
    reel.append(el('span', 'heroine-rewind-mark', '◀◀'));
    timer = setTimeout(step, reduced ? 300 : index === 1 ? 320 : 180);
  };
  // Consume advancing input during the short automatic rewind; repeated input
  // must not skip straight through the viewpoint reveal.
  const blockAdvance = event => {
    if (finished || event.target.closest('button, a, input, textarea, select, dialog')) return;
    if (event.type === 'keydown' && !['Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isSkipping()) setSkipping(false);
  };
  stage.addEventListener('click', blockAdvance, true);
  window.addEventListener('keydown', blockAdvance);
  stage.tabIndex = -1;
  stage.focus({ preventScroll: true });
  // Defer even an empty/skipped reel so the outer cleanup is installed first.
  timer = setTimeout(step, 0);
  return () => {
    context.voice?.stop();
    disposed = true;
    clearTimeout(timer);
    cleanupCard();
    reel.remove();
    stage.removeEventListener('click', blockAdvance, true);
    window.removeEventListener('keydown', blockAdvance);
  };
}

function mountHeroinePhoneConversation({ stage, node, assets, voice, go, isSkipping = () => false, setSkipping = () => {}, getSkipDelay = () => 140 }) {
  mountScene(stage, node, assets);
  void voice?.play(node);
  const conversation = node.phoneConversation;
  const panel = el('section', 'heroine-sms-scene');
  if (conversation.variant === 'toya') panel.classList.add('heroine-sms-toya');
  const device = el('div', 'heroine-sms-device');
  const screen = el('div', 'heroine-sms-screen');
  const status = el('div', 'heroine-sms-status');
  status.append(
    el('span', 'heroine-sms-clock'),
    el('span', 'heroine-sms-status-icons', '\u25b2  \u25cf')
  );

  const header = el('header', 'heroine-sms-header');
  header.append(el('span', 'heroine-sms-back', '\u2039'));
  const avatar = el('span', 'heroine-sms-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  const contact = el('div', 'heroine-sms-contact');
  contact.append(el('h1'), el('span'));
  header.append(avatar, contact, el('span', 'heroine-sms-info', '\u24d8'));

  const thread = el('div', 'heroine-sms-thread');
  thread.append(el('div', 'heroine-sms-day'));
  conversation.messageKeys.forEach((key, index) => {
    const bubble = el('div', `heroine-sms-bubble${index === conversation.messageKeys.length - 1 ? ' is-link' : ''}`);
    const copy = el('span', 'heroine-sms-copy');
    copy.dataset.smsI18n = key;
    bubble.append(copy);
    thread.append(bubble);
  });
  thread.append(el('time', 'heroine-sms-message-time'));

  const composer = el('div', 'heroine-sms-composer');
  composer.append(el('span', 'heroine-sms-add', '+'), el('span', 'heroine-sms-compose-label'), el('span', 'heroine-sms-send', '\u2191'));
  screen.append(status, header, thread, composer);
  device.append(screen);
  panel.append(device, el('span', 'heroine-advance', '\u25b8'));
  stage.append(panel);
  /* 同一颗「隐藏」：连短信面板一起收起（顶栏与章标题由控制器统一处理）。 */
  const veil = ILY.createHideChrome([panel]);

  const keyed = [
    [status.querySelector('.heroine-sms-clock'), conversation.timeKey],
    [contact.querySelector('h1'), conversation.senderKey],
    [contact.querySelector('span'), 'heroine.sms.channel'],
    [thread.querySelector('.heroine-sms-day'), 'heroine.sms.day'],
    [thread.querySelector('.heroine-sms-message-time'), conversation.timeKey],
    [composer.querySelector('.heroine-sms-compose-label'), 'heroine.sms.compose']
  ];
  keyed.forEach(([element, key]) => {
    if (key) element.dataset.smsI18n = key;
    else element.hidden = true;
  });
  const localize = () => {
    panel.setAttribute('aria-label', ILY.t(conversation.ariaKey || 'heroine.sms.aria'));
    panel.querySelectorAll('[data-sms-i18n]').forEach(element => { element.textContent = ILY.t(element.dataset.smsI18n); });
  };
  localize();

  let disposed = false;
  let skipTimer = 0;
  const advance = () => {
    if (disposed) return;
    if (veil.isHidden) { veil.restore(); stage.focus({ preventScroll: true }); return; }
    if (node.next) go(node.next);
  };
  const scheduleSkip = () => {
    clearTimeout(skipTimer);
    if (!isSkipping() || !node.next) return;
    const configuredDelay = Number(getSkipDelay());
    skipTimer = setTimeout(() => {
      if (disposed || !isSkipping()) return;
      if (document.querySelector('dialog[open]')) { setSkipping(false); return; }
      advance();
    }, Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 140);
  };
  const click = event => {
    if (event.target.closest('button, a, input, textarea, select, dialog')) return;
    event.preventDefault();
    if (isSkipping()) setSkipping(false);
    else advance();
  };
  const key = event => {
    if (document.querySelector('dialog[open]') || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
    if (event.code === 'KeyH') { event.preventDefault(); veil.toggle(); return; }
    if (!['Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    if (isSkipping()) setSkipping(false);
    else advance();
  };
  stage.tabIndex = -1;
  stage.focus({ preventScroll: true });
  stage.addEventListener('click', click, true);
  window.addEventListener('keydown', key);
  window.addEventListener('ily:langchange', localize);
  window.addEventListener('ily:skipchange', scheduleSkip);
  scheduleSkip();
  return () => {
    voice?.stop();
    disposed = true;
    clearTimeout(skipTimer);
    veil.dispose();
    stage.removeEventListener('click', click, true);
    window.removeEventListener('keydown', key);
    window.removeEventListener('ily:langchange', localize);
    window.removeEventListener('ily:skipchange', scheduleSkip);
  };
}

function mountHeroineMoment(context) {
  const {stage, node, assets, go, isSkipping = () => false, setSkipping = () => {}, getSkipDelay = () => 140} = context;
  if (node.rewindScene) return mountHeroineRewind(context);
  if (node.phoneConversation) return mountHeroinePhoneConversation(context);
  mountScene(stage, node, assets);
  void context.voice?.play(node);
  if (Object.hasOwn(node, 'bgm')) assets.setMusic(node.bgm);
  if (node.sceneEffect) stage.querySelector('.scene')?.classList.add('chapter-' + node.sceneEffect);
  /* 整图演出（node.imageOnly = true）：画面本身就是全部内容（台词直接烧在图里，
     如 ch3_035 的妄想整图），所以不挂 .heroine-moment 面板 —— 那层自带
     radial-gradient 暗幕与扫描线 ::before，会把图片压暗、遮住边角。
     这里只铺场景 + 一个点击提示，图片按原始亮度呈现；node.text 不再渲染。 */
  const imageOnly = node.imageOnly === true;
  const card = !imageOnly && node.type === 'heroine-card';
  const phoneNotice = !imageOnly && node.phoneNotice === 'battery-low';
  const panel = imageOnly ? null : el('section', phoneNotice ? 'phone phone-notice' : `heroine-moment ${card ? 'heroine-card' : 'heroine-monologue'}`);
  /* 2026-09-25：按用户要求去掉左下角「点击画面 / SPACE」前进提示（旁白与整图演出都不再显示）。 */
  if (panel) {
    /* 文字排布：默认整屏居中；textPosition:"top" 把文字排进画面顶部的黑带（见 chapters.css）。 */
    if (node.textPosition) panel.dataset.textPosition = node.textPosition;
    if (phoneNotice) {
      const phone = el('div', 'phone-screen');
      const body = el('div', 'phone-body');
      body.append(el('p', 'heroine-full-text'));
      phone.append(body);
      panel.append(phone);
    } else if (card) {
      panel.append(el('span', 'heroine-kicker', node.sectionLabel || '女主视角'), el('h1', '', node.text));
    } else {
      panel.append(el('p', 'heroine-full-text'));
    }
    stage.append(panel);
  }

  /* 旁白的「隐藏」和对白同一套：收起文字面板、
     左上章标题、右上整排按钮，只留背景 / CG，不做半透明。 */
  const veil = ILY.createHideChrome([panel]);
  const text = panel ? panel.querySelector('.heroine-full-text') : null;
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
    /* 隐藏状态下第一次推进只负责复原，不能顺手把这一幕也跳过去。 */
    if (veil.isHidden) { veil.restore(); stage.focus({ preventScroll: true }); return; }
    if (count < chars.length) { complete(); return; }
    if (node.next) go(node.next);
  };

  if (text) {
    if (phoneNotice || matchMedia('(prefers-reduced-motion: reduce)').matches) complete();
    else timer = setInterval(() => {
      text.textContent = chars.slice(0, ++count).join('');
      if (count >= chars.length) clearInterval(timer);
    }, 38);
  }
  const scheduleSkip = () => {
    clearTimeout(skipTimer);
    if (!isSkipping() || !node.next) return;
    complete();
    const configuredDelay = Number(getSkipDelay());
    skipTimer = setTimeout(() => {
      if (disposed || !isSkipping()) return;
      if (document.querySelector('dialog[open]')) { setSkipping(false); return; }
      go(node.next);
    }, Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 140);
  };

  const click = event => {
    if (isSkipping()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setSkipping(false);
      return;
    }
    if (event.target.closest('button, a, dialog')) return;
    event.preventDefault();
    next();
  };
  const key = event => {
    if (document.querySelector('dialog[open]') || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
    if (event.code === 'KeyH') { event.preventDefault(); veil.toggle(); return; }
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      if (isSkipping()) setSkipping(false);
      else next();
    }
  };
  stage.tabIndex = -1;
  stage.focus({preventScroll: true});
  stage.addEventListener('click', click, true);
  window.addEventListener('keydown', key);
  window.addEventListener('ily:skipchange', scheduleSkip);
  scheduleSkip();
  return () => {
    context.voice?.stop();
    disposed = true;
    clearInterval(timer);
    clearTimeout(skipTimer);
    veil.dispose();
    stage.removeEventListener('click', click, true);
    window.removeEventListener('keydown', key);
    window.removeEventListener('ily:skipchange', scheduleSkip);
  };
}

ILY.mountHeroineMoment = mountHeroineMoment;
ILY.heroineRewindFrames = heroineRewindFrames;
})();
