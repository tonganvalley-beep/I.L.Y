// 《I.L.Y.》序章 · 翻盖手机模式
// 契约：mountPhone({stage, node, state, assets, go, notify})
//   node.phone 配置见各场景节点。返回 cleanup() 供 main.js 在切换场景时拆除监听器。
// 资源占位：手机外观/邮件/通讯录/相册 UI 用 CSS 绘制；照片用 assets.image(photo.img)。
(() => {
'use strict';
const { el, button } = ILY;
const PHONE = () => ILY.data.phone;

function getFlags(state) {
  state.flags = state.flags || {};
  state.flags.phone = state.flags.phone || { read: [], deleted: [] };
  state.flags.MAIL_READ_COUNT = state.flags.MAIL_READ_COUNT || 0;
  state.flags.CONTACT_DELETED = state.flags.CONTACT_DELETED || 0;
  state.flags.achievements = state.flags.achievements || [];
  const p = state.flags.phone;
  p.read = p.read || [];
  p.deleted = p.deleted || [];
  // 兜底：爱理在任何情况下都不允许被删除。老存档里若已经把她记进删除列表，这里直接剔除。
  if (p.deleted.includes('airi')) p.deleted = p.deleted.filter(id => id !== 'airi');
  // 自由翻看手机时的已读记录。与剧情场景的 read 分开，避免提前翻看导致剧情节点被跳过。
  p.freeRead = p.freeRead || [];
  // 剧情场景里出现过的邮件 / 联系人。自由手机只解锁已经出现过的条目。
  p.seenMails = p.seenMails || [];
  p.seenContacts = p.seenContacts || [];
  // 玩家自己翻出来的隐藏邮件（彩蛋）
  p.found = p.found || [];
  return state.flags;
}

function unlock(state, id, label, notify) {
  const f = getFlags(state);
  if (!f.achievements.includes(id)) { f.achievements.push(id); notify(ILY.t('achieve.unlocked', { label })); }
}

function mountPhone({ stage, node, state, assets, go, notify }) {
  const cfg = node.phone || {};
  const pending = new Set();
  const later = (callback, delay) => { const timer = setTimeout(() => { pending.delete(timer); callback(); }, delay); pending.add(timer); };
  const F = PHONE();
  const flags = getFlags(state);
  const lockClose = !!cfg.lockClose;
  const freeMode = !!cfg.freeMode;      // 序章随时掏出的自由手机：只读、可随时合上

  // 当前可见邮件列表（场景01 含 reveal 逻辑）
  let mailIds = (cfg.mails || []).slice();
  if (cfg.reveal && !mailIds.includes(cfg.reveal.id) && cfg.reveal.after.every(id => flags.phone.read.includes(id))) {
    mailIds.push(cfg.reveal.id);
  }
  // 记录剧情里出现过的邮件 / 联系人，供自由手机解锁（隐藏彩蛋邮件不计入）
  for (const id of mailIds) if (!flags.phone.seenMails.includes(id)) flags.phone.seenMails.push(id);
  for (const id of (cfg.contacts || [])) if (!flags.phone.seenContacts.includes(id)) flags.phone.seenContacts.push(id);

  // 已读：自由手机与剧情进度各记一份
  const readList = () => (freeMode ? flags.phone.freeRead : flags.phone.read);
  const isRead = id => readList().includes(id);
  const markRead = id => { const list = readList(); if (!list.includes(id)) list.push(id); };

  let tab = cfg.tab || 'mail';
  let view = 'home';            // home | list | mail | contacts | contact | album | photo | confirm | editor | send
  // startView:"mail" —— 进入手机时跳过图标主页，直接打开邮件列表（用于手机首次登场的场景）
  if (cfg.startView === 'mail') { view = 'list'; }
  let sel = 0;                  // 列表选中项
  let homeSel = 0;              // 主界面图标选中项
  let mailId = null;            // 正在查看的邮件
  let mailChars = [];           // 打字机字符
  let mailShown = 0;
  let mailTimer = null;
  let contactId = null;
  let confirmSel = 0;           // 删除确认：0=删除 1=取消
  let photoId = null;
  let demoBusy = false;         // 示例演示进行中（屏蔽除空格/Enter 以外的键盘输入）
  let demoStarted = false;      // 示例已启动（避免重绘时重复启动）
  let demoStep = -1;            // 示例步骤：-1 未开始 / 0 选中联系人 / 1 按下删除 / 2 确认删除
  let demoId = null;            // 示例演示的目标联系人
  let promptBusy = false;       // 首次删除提示独白播放中（屏蔽键盘输入）
  let editorTimer = null;       // 写信界面的逐字打字机
  let editorSkip = null;        // 写信界面：空格 = 先显示完整内容，再按一次才发送
  let editorDone = false;       // 信的内容是否已经全部显示

  const root = el('div', 'phone');
  const screen = el('div', 'phone-screen');
  const tabs = el('div', 'phone-tabs');
  const body = el('div', 'phone-body');
  const hint = el('div', 'phone-hint', ILY.t(freeMode ? 'phone.hint.free' : 'phone.hint'));
  const thought = el('section', 'dialogue phone-thought-dialogue');
  const thoughtSpeaker = el('div', 'speaker', ILY.t('phone.thoughtSelf'));
  const thoughtText = el('p', 'dialogue-text');
  thought.append(thoughtSpeaker, thoughtText);
  thought.hidden = true;
  root.append(screen, hint);
  screen.append(tabs, body);
  stage.append(root, thought);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 主界面（图标页） ----------
  const APP_ICONS = {
    mail: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="#123326" stroke-width="2"/><path d="M2.5 7.5 L12 14 L21.5 7.5" fill="none" stroke="#123326" stroke-width="2"/></svg>',
    contacts: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="#123326" stroke-width="2"/><circle cx="12" cy="9.5" r="2.8" fill="#123326"/><path d="M7 17c.6-2.8 2.7-4 5-4s4.4 1.2 5 4" fill="none" stroke="#123326" stroke-width="2"/></svg>',
    album: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="#123326" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="#123326"/><path d="M4 17l4.5-4 3.5 3 3.5-3.5L20 17" fill="none" stroke="#123326" stroke-width="2"/></svg>'
  };
  const APPS = [
    { key: 'mail', labelKey: 'phone.mail', badge: () => mailIds.filter(id => !isRead(id)).length },
    { key: 'contacts', labelKey: 'phone.contacts', badge: null },
    { key: 'album', labelKey: 'phone.album', badge: null }
  ];
  const tabLabel = () => { const app = APPS.find(a => a.key === tab); return app ? ILY.t(app.labelKey) : ''; };

  function clearThought() { thought.hidden = true; thoughtText.textContent = ''; }
  // speaker 省略时按内心独白处理；传了就用指定说话人（如基生本人开口打断）
  function showThought(text, speaker) {
    thoughtSpeaker.textContent = speaker || ILY.t('phone.thoughtSelf');
    thoughtText.textContent = text || '';
    thought.hidden = !text;
  }
  function goHome() { view = 'home'; render(); }
  function enterApp(key) { tab = key; view = 'list'; sel = 0; render(); }

  // 还有几个「必须删掉」的联系人没删
  function forcedRemaining() {
    return (cfg.forcedDelete || []).filter(id => !flags.phone.deleted.includes(id));
  }
  // 能不能给爱理写信：必须删掉的人都删完了，且这封信还没发出去
  function canWriteMail() {
    return !!cfg.allowSend && forcedRemaining().length === 0 && !flags.phone.sent;
  }
  // 收件箱条目：未发送的草稿在最上面（写信属于「邮件」）；发送失败的系统邮件也会回到收件箱
  function mailEntries() {
    const out = [];
    if (flags.phone.sent && F.mails.SYS01) out.push({ id: 'SYS01', kind: 'mail' });
    else if (canWriteMail() && F.mails.K01) out.push({ id: 'K01', kind: 'draft' });
    for (const id of mailIds) out.push({ id, kind: 'mail' });
    return out;
  }
  function setHint(text) { hint.textContent = text || defaultHintText(); }
  function defaultHintText() { return ILY.t(freeMode ? 'phone.hint.free' : 'phone.hint'); }

  function renderHome() {
    const wrap = el('div', 'phone-home');
    APPS.forEach((app, i) => {
      const row = el('div', 'home-app' + (i === homeSel ? ' sel' : ''));
      const icon = el('div', 'home-icon');
      icon.innerHTML = APP_ICONS[app.key];
      const unread = app.badge ? app.badge() : 0;
      if (unread > 0) icon.append(el('span', 'home-badge', String(unread)));
      row.append(icon, el('div', 'home-label', ILY.t(app.labelKey)));
      row.addEventListener('click', () => { homeSel = i; enterApp(app.key); });
      wrap.append(row);
    });
    body.append(wrap);
  }

  function render() {
    clearThought();
    setHint();                  // 每次重绘把底部提示恢复成默认（写信/发送中的提示由各自界面设置）
    body.replaceChildren();
    const atHome = view === 'home';
    screen.classList.toggle('is-home', atHome);
    if (atHome) { tabs.replaceChildren(); renderHome(); return; }
    renderTabs();
    if (tab === 'mail') renderMailList();
    else if (tab === 'contacts') renderContacts();
    else renderAlbum();
  }

  // 子界面顶栏：「◂ 主页 + 栏目名」。写信/发送失败都属于邮件，所以顶栏要跟着切到「邮件」
  function renderTabs() {
    tabs.replaceChildren();
    const homeBtn = button(ILY.t('phone.home'), () => goHome());
    homeBtn.classList.add('tab-home');
    tabs.append(homeBtn, el('span', 'tab-title', tabLabel()));
  }

  // ---------- 邮件列表 ----------
  function renderMailList() {
    view = 'list';
    mailAction = null;
    const entries = mailEntries();
    const list = el('div', 'phone-list');
    entries.forEach((entry, i) => {
      const id = entry.id;
      const m = F.mails[id];
      const draft = entry.kind === 'draft';
      const row = el('div', 'phone-row' + (i === sel ? ' sel' : '')
        + (id === cfg.hiddenMail ? ' is-hidden-mail' : '') + (draft ? ' is-draft' : ''));
      const toName = (m.to && F.contacts[m.to]) ? F.contacts[m.to].name : '';
      const from = el('div', 'r-from', draft ? ILY.t('phone.draftTo', { name: toName }) : m.from);
      if (!draft && !isRead(id)) from.prepend(el('span', 'r-unread'));
      if (draft) from.append(el('span', 'r-tag', ILY.t('phone.draft')));
      row.append(from,
        el('div', 'r-time', draft ? '' : m.time),
        el('div', 'r-sub', draft ? (m.subject || '') : (m.subject || ILY.t('phone.noSubject'))));
      row.addEventListener('click', () => { sel = i; if (draft) openEditor(); else openMail(id); });
      list.append(row);
    });
    if (!entries.length) list.append(el('div', 'phone-empty', ILY.t('phone.empty')));
    body.append(list);
    if (entries.length) list.children[sel]?.scrollIntoView({ block: 'nearest' });
    maybeRevealHidden();
  }

  // 隐藏邮件（彩蛋）：把收件箱翻到最底部才浮出来，只出现一次并写入存档
  function maybeRevealHidden() {
    const id = cfg.hiddenMail;
    if (!id || !F.mails[id] || mailIds.includes(id)) return;
    if (flags.phone.found.includes(id)) return;
    if (!mailIds.length || sel < mailIds.length - 1) return;
    later(() => {
      if (mailIds.includes(id) || flags.phone.found.includes(id)) return;
      flags.phone.found.push(id);
      mailIds.push(id);
      unlock(state, 'father-reply', ILY.t('achieve.fatherReply'), notify);
      notify(ILY.t('phone.hiddenFound'));
      render();
    }, 500);
  }

  function openMail(id) {
    mailId = id; view = 'mail'; mailAction = null;
    if (!isRead(id)) {
      markRead(id);
      if (!freeMode) flags.MAIL_READ_COUNT++;
      // 场景01：读完 A01-A03 后解锁 A04
      if (cfg.reveal && !mailIds.includes(cfg.reveal.id) && cfg.reveal.after.every(rid => flags.phone.read.includes(rid))) mailIds.push(cfg.reveal.id);
    }
    const m = F.mails[id];
    // exitOnMail：点开指定的那一封（如场景01 的 A04）时不再逐字显示，正文整段给出、短暂停顿后直接进入剧情
    if (cfg.exitOnMail === id && cfg.exitNext) {
      const jump = el('div', 'phone-detail is-exit-mail');
      jump.append(el('div', 'd-head', `${m.from} · ${m.time}` + (m.subject ? ` · ${m.subject}` : '')));
      jump.append(el('div', 'd-body', m.body));
      body.replaceChildren(jump);
      later(() => go(cfg.exitNext), 600);
      return;
    }
    const wrap = el('div', 'phone-detail');
    wrap.append(el('div', 'd-head', `${m.from} · ${m.time}` + (m.subject ? ` · ${m.subject}` : '')));
    const text = el('div', 'd-body');
    wrap.append(text);
    if (m.link && cfg.showLink) {
      wrap.classList.add('is-link-mail');
      const linkLine = button(m.link, () => finishMailLink());
      linkLine.className = 'd-link';
      wrap.append(linkLine);
      mailAction = { onLink: cfg.onLink, completed:false };
      state.flags.FLAG_HIDDEN_LINK = 'found';
    }
    const back = button(ILY.t('phone.back'), () => render());
    wrap.append(back);
    body.replaceChildren(wrap);

    mailChars = Array.from(m.body);
    mailShown = 0;
    const type = () => {
      text.textContent = mailChars.slice(0, mailShown).join('');
      if (mailShown >= mailChars.length) { clearInterval(mailTimer); mailTimer = null; }
    };
    if (reduced) { mailShown = mailChars.length; type(); }
    else { mailTimer = setInterval(() => { mailShown = Math.min(mailChars.length, mailShown + 2); type(); }, 16); }
  }
  let mailAction = null;

  function finishMailLink() {
    if (!mailAction || mailAction.completed || !mailAction.onLink) return;
    mailAction.completed = true;
    go(mailAction.onLink);
  }

  // ---------- 通讯录 ----------
  // 已删除的联系人不再显示：列表/键盘导航统一使用可见列表
  function visibleContacts() {
    return (cfg.contacts || []).filter(id => !flags.phone.deleted.includes(id));
  }
  function renderContacts() {
    view = 'contacts';
    const ids = visibleContacts();
    if (sel >= ids.length) sel = Math.max(0, ids.length - 1);
    const list = el('div', 'phone-list');
    ids.forEach((id, i) => {
      const c = F.contacts[id];
      const row = el('div', 'phone-row' + (i === sel ? ' sel' : ''));
      row.append(el('div', 'r-from', c.name), el('div', 'r-sub', ''));
      row.addEventListener('click', () => { sel = i; openContact(id); });
      list.append(row);
    });
    body.append(list);
    addEdgeHint(list, ids.length);
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }

  // ===== 示例演示（原「教学删除」）：基生自己动手删掉一个联系人，玩家按空格逐步观看 =====
  // 步骤：0 选中联系人 → 1 按下「删除」→ 2 确认删除 → 结束。当前该点的对象会高亮并显示 ▸ 箭头。
  function rowNodes() {
    const all = typeof body.querySelectorAll === 'function' ? body.querySelectorAll('.phone-row') : [];
    return Array.from(all || []);
  }
  function demoTipText() {
    if (demoStep === 0) return ILY.t('phone.demo.step.open');
    if (demoStep === 1) return ILY.t('phone.demo.step.delete');
    if (demoStep === 2) return ILY.t('phone.demo.step.confirm');
    return ILY.t('phone.demo.done');
  }
  function updateDemoTip() {
    const tip = root.querySelector('.phone-demo-tip');
    if (tip) {
      const text = tip.querySelector('.demo-text');
      if (text) text.textContent = demoTipText();
    }
    if (demoBusy) hint.textContent = ILY.t('phone.hint.demo');
  }
  function demoTip(show) {
    const tip = root.querySelector('.phone-demo-tip');
    if (show && !tip) {
      const t = el('div', 'phone-demo-tip');
      t.append(el('span', 'demo-tag', ILY.t('phone.demo.tag')), el('span', 'demo-text', demoTipText()));
      root.append(t);
    } else if (!show && tip) tip.remove();
  }
  // 高亮「下一步要点的东西」：箭头用 CSS ::after 画在右侧
  function markDemoTarget() {
    const all = typeof body.querySelectorAll === 'function' ? body.querySelectorAll('.demo-target') : [];
    Array.from(all || []).forEach(node => node.classList.remove('demo-target'));
    if (demoStep < 0) { root.classList.remove('demo-active'); return; }
    root.classList.add('demo-active');
    let target = null;
    if (demoStep === 0) {
      const rows = rowNodes();
      const index = visibleContacts().indexOf(demoId);
      target = index >= 0 ? rows[index] : null;
      if (target && !target.className.includes('sel')) target.className += ' sel';
    } else if (demoStep === 1) {
      target = body.querySelector('.phone-detail button');
    } else if (demoStep === 2) {
      target = body.querySelector('.confirm .sel-y');
    }
    if (!target) return;
    target.classList.add('demo-target');
    // 直接点高亮的那一处，等价于按一次空格
    target.addEventListener('click', demoAdvanceByClick);
  }
  function demoAdvanceByClick() { if (demoBusy) demoAdvance(); }
  function startDeleteDemo() {
    if (!cfg.autoDeleteDemo || demoStarted || demoStep >= 0 || view !== 'contacts') return;
    const target = (cfg.contacts || []).find(id => F.contacts[id] && F.contacts[id].tutorial && !flags.phone.deleted.includes(id));
    if (!target) return;
    demoStarted = true; demoBusy = true; demoId = target; demoStep = 0;
    demoTip(true);
    const index = visibleContacts().indexOf(target);
    if (index >= 0) sel = index;
    render();               // 重绘一次，让选中行与箭头同时出现
  }
  // 空格 / Enter / 点击高亮处：推进一步
  function demoAdvance() {
    if (!demoBusy) return;
    if (demoStep === 0) { demoStep = 1; openContact(demoId); }
    else if (demoStep === 1) { demoStep = 2; askDelete(demoId); }
    else if (demoStep === 2) { finishDeleteDemo(); return; }
    markDemoTarget(); updateDemoTip();
  }
  function finishDeleteDemo() {
    demoStep = -1;
    demoBusy = false;
    markDemoTarget();
    updateDemoTip();
    later(() => demoTip(false), 2600);   // 让「示例结束」这句话停留一会儿
    doDelete(demoId);                    // 示例由基生自己按下删除键
  }

  function openContact(id) {
    contactId = id; view = 'contact';
    const c = F.contacts[id];
    const wrap = el('div', 'phone-detail');
    wrap.append(el('div', 'd-head', c.name));
    showThought(c.note);
    const isDeleted = flags.phone.deleted.includes(id);
    const forcedLeft = forcedRemaining();
    if (id === 'airi' && canWriteMail()) {
      // 写信入口只在「邮件」界面（收件箱里的草稿 K01）；通讯录里爱理的详情不再提供「写邮件」
      wrap.append(button(ILY.t('phone.back'), () => render()));
    } else if (freeMode) {
      // 随时掏出的手机只给玩家翻看：不提供删除 / 写信，避免打乱剧情场景里的删除进度
      wrap.append(el('div', 'd-body', ILY.t('phone.free.readonly')), button(ILY.t('phone.back'), () => render()));
    } else if (!isDeleted) {
      const del = button(ILY.t('phone.delete'), () => requestDelete(id));
      const back = button(ILY.t('phone.back'), () => render());
      wrap.append(del, back);
    } else wrap.append(button(ILY.t('phone.back'), () => render()));
    body.replaceChildren(wrap);
  }

  // 爱理不可删除：玩家一按下「删除」，基生就当场打断——不弹确认框、不删除，
  // 只在文本框里以「成田基生」的口吻说一句「先看看别人吧」。
  function refuseDeleteAiri() {
    promptBusy = false;
    showThought(ILY.t('phone.lookOthers'), ILY.t('phone.self'));
  }

  // 第一次亲手删除联系人（非教学演示、非爱理）：
  // 先依次播放几句独白提示，再进入删除确认；期间屏蔽键盘，返回则中止本次提示。
  function requestDelete(id) {
    if (promptBusy) return;
    if (id === 'airi') { refuseDeleteAiri(); return; }
    if (flags.phone.firstDeletePrompted || F.contacts[id].tutorial) { askDelete(id); return; }
    promptBusy = true;
    const lines = [1, 2, 3].map(n => ILY.t('phone.firstDelete.' + n));
    const step = 1600;
    lines.forEach((line, i) => later(() => { if (view === 'contact' && contactId === id) showThought(line); }, i * step));
    later(() => {
      promptBusy = false;
      if (view === 'contact' && contactId === id) { flags.phone.firstDeletePrompted = true; askDelete(id); }
    }, lines.length * step);
  }

  function askDelete(id, demo) {
    view = 'confirm'; confirmSel = 0;
    const c = F.contacts[id];
    const wrap = el('div', 'phone-detail confirm');
    wrap.append(el('div', 'd-head', ILY.t('phone.deleteQ', { name: c.name })));
    const up = button(ILY.t('phone.del'), () => doDelete(id));
    const down = button(ILY.t('phone.cancel'), () => { afterConfirm(id, false); });
    if ((cfg.lockDeleteCancel || []).includes(id)) down.disabled = true;
    if (demo) { up.disabled = true; down.disabled = true; }   // 演示期间禁止手动干预
    wrap.append(up, down);
    body.replaceChildren(wrap);
    up.classList.add('sel-y'); down.classList.add('sel-n');
  }

  function doDelete(id) {
    // 爱理始终不可删除；按下删除只会换来基生的一句打断（doDelete 兜底，正常流程走不到这里）。
    if (id === 'airi') { refuseDeleteAiri(); return; }
    if (!flags.phone.deleted.includes(id)) {
      flags.phone.deleted.push(id);
      // 场景03 的「打工」联系人为教学删除，不计入 CONTACT_DELETED
      if (!F.contacts[id].tutorial) {
        flags.CONTACT_DELETED++;
        if (flags.CONTACT_DELETED >= (cfg.requireDeleteCount || 3)) {
          const remain = (cfg.contacts || []).filter(c => c === 'airi' || !flags.phone.deleted.includes(c));
          if (remain.length <= 1) unlock(state, 'delete-key', ILY.t('achieve.deleteKey'), notify);
        }
      }
    }
    afterConfirm(id, true);
  }

  function afterConfirm(id, didDelete) {
    const c = F.contacts[id];
    // 妈妈/爸爸：取消后由剧情强制删除
    if (!didDelete && (id === 'mother' || id === 'father')) {
      notify(ILY.t('phone.keepPointless'));
      doDelete(id);
      return;
    }
    // 爱理（兜底）：任何情况下都不删除，只把打断的那句话留在文本框里。
    if (id === 'airi') {
      render();
      showThought(ILY.t('phone.lookOthers'), ILY.t('phone.self'));
      return;
    }
    // 全部强制联系人删除完毕后：先停在爱理这里，不直接发信
    const forced = forcedRemaining();
    if (!forced.length) {
      if (cfg.allowSend) { stayOnAiri(); return; }
      if (cfg.manualExit) { render(); return; }   // 等玩家按「继续」
      if (cfg.exitNext) { go(cfg.exitNext); return; }
    }
    render();
  }

  // 三个人都删完之后：基生先停在爱理的名字上（独白），过几秒手机自己开始写那封信。
  // 写信界面属于「邮件」，所以是从通讯录跳转到邮件应用去的。
  function stayOnAiri() {
    const airiIndex = visibleContacts().indexOf('airi');
    if (airiIndex >= 0) sel = airiIndex;
    if (flags.phone.airiStayed || flags.phone.sent) { render(); return; }
    flags.phone.airiStayed = true;
    openContact('airi');
    setHint(ILY.t('phone.hint.airi'));
    later(() => { if (view === 'contact' && contactId === 'airi') showThought(ILY.t('phone.airi.stay')); }, 1500);
    later(() => {
      // 男主留在爱理这里之后，转入「邮件」界面，从收件箱里的草稿开始写信
      // （写信属于邮件，不在通讯录：顶栏会显示「邮件」，草稿 K01 在收件箱最上面）
      if (view !== 'contact' || contactId !== 'airi') return;
      enterApp('mail');          // 先回到「邮件」列表
      openEditor();              // 再打开草稿编辑器
    }, 3000);
  }

  // ---------- 写信 / 发送（属于「邮件」应用） ----------
  function stopEditorTyping() { if (editorTimer) { clearInterval(editorTimer); editorTimer = null; } editorSkip = null; }

  function openEditor() {
    stopEditorTyping();
    clearThought();
    view = 'editor';
    tab = 'mail';                       // 写信界面挂在「邮件」下，顶栏显示的是邮件
    editorDone = false;
    const m = F.mails.K01;
    const lines = (m.lines && m.lines.length) ? m.lines.slice() : [m.body];
    const wrap = el('div', 'phone-detail is-editor');
    wrap.append(el('div', 'd-head', ILY.t('phone.editorHead')));
    const text = el('div', 'd-body d-write');
    wrap.append(text);
    const send = button(ILY.t('phone.send'), () => doSend());
    send.className = 'btn-send';
    send.disabled = true;
    const back = button(ILY.t('phone.back'), () => { stopEditorTyping(); render(); });
    wrap.append(send, back);
    body.replaceChildren(wrap);

    const paint = (li, ci) => {
      const shown = lines.slice(0, li).slice();
      if (li < lines.length) shown.push(Array.from(lines[li]).slice(0, ci).join(''));
      text.textContent = shown.join('\n');
    };
    const finish = () => {
      stopEditorTyping();
      editorDone = true;
      text.textContent = lines.join('\n');
      text.classList.add('is-done');
      send.disabled = false;
      setHint(ILY.t('phone.hint.send'));
      editorSkip = doSend;              // 内容显示完之后，空格 = 发送
    };
    editorSkip = finish;                // 显示过程中，空格 = 直接看完整封信
    setHint(ILY.t('phone.hint.writing'));
    if (reduced) { finish(); return; }
    let li = 0, ci = 0, wait = 0;
    editorTimer = setInterval(() => {
      if (li >= lines.length) { finish(); return; }
      if (wait > 0) { wait--; return; }
      const chars = Array.from(lines[li]);
      if (ci < chars.length) { ci++; paint(li, ci); return; }
      li++; ci = 0; wait = 14;          // 换行的停顿
      paint(li, ci);
    }, 26);
  }

  function doSend() {
    if (view === 'send' || view === 'bounce' || flags.phone.sent) return;
    stopEditorTyping();
    view = 'send';
    tab = 'mail';
    flags.MAIL_READ_COUNT++;
    if (flags.MAIL_READ_COUNT >= 3) unlock(state, 'daily', ILY.t('achieve.daily'), notify);
    const wrap = el('div', 'phone-detail is-sending');
    wrap.append(el('div', 'd-head', ILY.t('phone.sending')));
    wrap.append(el('div', 'd-body', ILY.t('phone.sendingTo', { addr: 'airi_lily_6@docono.ne.jp' })));
    const dots = el('div', 'sending-dots');
    dots.append(el('span'), el('span'), el('span'));
    wrap.append(dots);
    body.replaceChildren(wrap);
    setHint(ILY.t('phone.hint.sending'));
    later(showBounce, reduced ? 500 : 1500);      // 停一下「发送中」的画面
  }

  // 发送失败：系统退信邮件回到收件箱（同样属于「邮件」界面）
  function showBounce() {
    flags.phone.sent = true;
    view = 'bounce';
    tab = 'mail';
    const sys = F.mails.SYS01;
    if (!isRead('SYS01')) { markRead('SYS01'); }
    notify(ILY.t('phone.bounced'));
    later(() => notify(''), 1600);
    const wrap = el('div', 'phone-detail is-bounce');
    wrap.append(el('div', 'd-head', `${sys.from} · ${sys.subject}`));
    wrap.append(el('div', 'd-body', sys.body));
    wrap.append(button(ILY.t('phone.back'), () => continueAfterBounce()));
    body.replaceChildren(wrap);
    setHint(ILY.t('phone.hint.bounce'));
  }

  function continueAfterBounce() {
    if (cfg.exitNext) go(cfg.exitNext);
    else render();
  }

  // ---------- 相册 ----------
  function renderAlbum() {
    view = 'album';
    const ids = Object.keys(F.photos);
    const grid = el('div', 'phone-grid');
    ids.forEach((id, i) => {
      const p = F.photos[id];
      const cell = el('div', 'phone-cell' + (i === sel ? ' sel' : ''));
      const img = assets.image(p.img);
      if (img) { const im = el('img'); im.src = img; im.alt = p.title; cell.append(im); }
      else cell.append(el('div', 'cell-ph', '【图片待补】'));
      cell.append(el('div', 'cell-cap', p.title));
      cell.addEventListener('click', () => { sel = i; openPhoto(id); });
      grid.append(cell);
    });
    body.replaceChildren(grid);
    grid.children[sel]?.scrollIntoView({ block: 'nearest' });
  }

  function openPhoto(id) {
    photoId = id; view = 'photo';
    closeLightbox();
    const p = F.photos[id];
    const wrap = el('div', 'phone-detail');
    const img = assets.image(p.img);
    if (img) {
      const im = el('img', 'photo-full photo-zoomable');
      im.src = img; im.alt = p.title; im.title = ILY.t('phone.zoomHint');
      im.addEventListener('click', () => openLightbox(id));
      wrap.append(im);
    }
    wrap.append(el('div', 'd-head', p.title));
    wrap.append(el('div', 'd-body', p.caption));
    wrap.append(button(ILY.t('phone.back'), () => render()));
    body.replaceChildren(wrap);
  }

  // ---------- 照片放大（灯箱） ----------
  // 详情页点击照片 → 覆盖整个画面的放大查看：
  // 单击 放大/还原（1x⇄2x）、滚轮 缩放（1x-4x）、放大后可拖动平移、Esc/M 或点空白处/关闭按钮 关闭。
  let lightbox = null;
  function closeLightbox() { if (lightbox) { lightbox.remove(); lightbox = null; } }
  function openLightbox(id) {
    const p = F.photos[id];
    const src = assets.image(p.img);
    if (!src) return;                 // 占位照片（美术资源未补）不提供放大
    closeLightbox();
    const lb = el('div', 'photo-lightbox');
    const img = el('img', 'lb-img');
    img.src = src; img.alt = p.title; img.draggable = false;
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, moved = false, sx = 0, sy = 0, bx = 0, by = 0;
    const apply = () => {
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      lb.classList.toggle('zoomed', scale > 1);
    };
    const clamp = () => {             // 平移范围限制在图片边缘之外约 60px
      const mx = Math.max(0, img.clientWidth * (scale - 1) / 2 + 60);
      const my = Math.max(0, img.clientHeight * (scale - 1) / 2 + 60);
      tx = Math.max(-mx, Math.min(mx, tx));
      ty = Math.max(-my, Math.min(my, ty));
    };
    img.addEventListener('click', () => {
      if (moved) return;              // 拖动结束后的一次 click 不当作缩放
      scale = scale > 1 ? 1 : 2; tx = 0; ty = 0; apply();
    });
    img.addEventListener('wheel', e => {
      e.preventDefault();
      scale = Math.max(1, Math.min(4, scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
      if (scale === 1) { tx = 0; ty = 0; }
      clamp(); apply();
    }, { passive: false });
    img.addEventListener('pointerdown', e => {     // 放大后可拖动平移
      if (scale <= 1) return;
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY; bx = tx; by = ty;
      img.style.transition = 'none';               // 拖动时去掉过渡，跟手
      try { img.setPointerCapture(e.pointerId); } catch (_) { /* 忽略不支持的浏览器 */ }
    });
    img.addEventListener('pointermove', e => {
      if (!dragging) return;
      tx = bx + e.clientX - sx; ty = by + e.clientY - sy;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true;
      clamp(); apply();
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      img.style.transition = '';
      setTimeout(() => { moved = false; }, 0);     // 旗标在随后的 click 之后再复位
    };
    img.addEventListener('pointerup', endDrag);
    img.addEventListener('pointercancel', endDrag);
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    const close = button(ILY.t('phone.zoomClose'), closeLightbox);
    close.classList.add('lb-close');
    lb.append(close, img, el('div', 'lb-cap', p.title), el('div', 'lb-hint', ILY.t('phone.zoomHint')));
    root.append(lb);
    lightbox = lb;
  }

  function addEdgeHint(list, n) {
    if (sel > 0) list.prepend(el('div', 'edge', '▲'));
    if (sel < n - 1) list.append(el('div', 'edge', '▼'));
  }

  // ---------- 键盘 ----------
  function onKey(e) {
    // 灯箱打开时接管键盘：Esc/M 关闭，其余按键不再传给手机界面/按钮
    // 注意：自由手机自身就装在 <dialog> 里，这里只屏蔽「别人」的模态框，不能一律 return。
    const openModal = document.querySelector('dialog[open]');
    if (lightbox) {
      if (!openModal || openModal.contains(root)) {
        if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') closeLightbox();
        e.preventDefault();
      }
      return;
    }
    if (openModal && !openModal.contains(root)) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    const k = e.key;
    // 自由手机：P 随时合上
    if (cfg.onClose && (k === 'p' || k === 'P')) { e.preventDefault(); cfg.onClose(); return; }
    if (demoBusy) {
      // 示例演示：空格 / Enter 推进一步，其余按键屏蔽
      if (k === ' ' || k === 'Enter') demoAdvance();
      e.preventDefault(); return;
    }
    if (promptBusy) { e.preventDefault(); return; }   // 首次删除独白播放中不响应按键
    if (k === 'm' || k === 'M' || k === 'Escape') {
      if (view === 'home') {
        if (cfg.manualExit && sceneComplete()) go(cfg.exitNext);
        else if (cfg.onClose) cfg.onClose();
      } else if (view === 'list' || view === 'contacts' || view === 'album') {
        goHome();
      } else if (cfg.onClose) {
        goHome();                       // 自由手机：详情页按 Esc/M 先回主页，回主页后再按才合上
      }
      e.preventDefault(); return;
    }
    if (view === 'home') {
      const n = APPS.length;
      if (k === 'ArrowDown' || k === 'ArrowRight') { homeSel = Math.min(n - 1, homeSel + 1); render(); e.preventDefault(); return; }
      if (k === 'ArrowUp' || k === 'ArrowLeft') { homeSel = Math.max(0, homeSel - 1); render(); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') {
        if (cfg.manualExit && sceneComplete()) go(cfg.exitNext);
        else enterApp(APPS[homeSel].key);
        e.preventDefault(); return;
      }
      return;
    }
    if (view === 'mail') {
      if (k === 'ArrowDown') { body.scrollTop += 28; e.preventDefault(); return; }
      if (k === 'ArrowUp') { body.scrollTop = Math.max(0, body.scrollTop - 28); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') {
        if (mailAction) finishMailLink();
        else render();
        e.preventDefault(); return;
      }
      return;
    }
    if (view === 'contact') {
      if (k === 'd' || k === 'D') { requestDelete(contactId); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') { render(); e.preventDefault(); return; }
      return;
    }
    if (view === 'confirm') {
      if (k === 'ArrowUp') { confirmSel = 0; markConfirm(); e.preventDefault(); return; }
      if (k === 'ArrowDown') {
        if (!(cfg.lockDeleteCancel || []).includes(contactId)) confirmSel = 1;
        markConfirm(); e.preventDefault(); return;
      }
      if (k === ' ' || k === 'Enter') {
        const c = F.contacts[contactId];
        if (confirmSel === 0) doDelete(contactId); else afterConfirm(contactId, false);
        e.preventDefault(); return;
      }
      return;
    }
    if (view === 'photo') {
      if (k === 'z' || k === 'Z') { openLightbox(photoId); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') { /* 由按钮处理 */ e.preventDefault(); return; }
      return;
    }
    if (view === 'editor') {
      // 写信界面：空格先让信的内容全部显示出来，再按一次空格才发送
      if (k === 'ArrowDown') { body.scrollTop += 28; e.preventDefault(); return; }
      if (k === 'ArrowUp') { body.scrollTop = Math.max(0, body.scrollTop - 28); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') { if (editorSkip) editorSkip(); e.preventDefault(); return; }
      return;
    }
    if (view === 'send') { e.preventDefault(); return; }        // 「发送中……」期间不响应按键
    if (view === 'bounce') {
      if (k === 'ArrowDown') { body.scrollTop += 28; e.preventDefault(); return; }
      if (k === 'ArrowUp') { body.scrollTop = Math.max(0, body.scrollTop - 28); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') { continueAfterBounce(); e.preventDefault(); return; }
      return;
    }
    // 列表态
    const list = tab === 'album' ? Object.keys(F.photos) : (tab === 'contacts' ? visibleContacts() : mailEntries());
    if (k === 'ArrowDown') { sel = Math.min(list.length - 1, sel + 1); render(); e.preventDefault(); return; }
    if (k === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); return; }
    if (tab === 'album' && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      const step = k === 'ArrowRight' ? 1 : -1; sel = Math.max(0, Math.min(list.length - 1, sel + step)); render(); e.preventDefault(); return;
    }
    if (k === ' ' || k === 'Enter') {
      // 教学删除只有一个必做操作，完成后空格/Enter 与“继续”按钮等价。
      if (cfg.manualExit && sceneComplete()) go(cfg.exitNext);
      else if (tab === 'mail') { const entry = list[sel]; if (!entry) return; if (entry.kind === 'draft') openEditor(); else openMail(entry.id); }
      else if (tab === 'contacts') { const id = visibleContacts()[sel]; if (id) openContact(id); }
      else openPhoto(Object.keys(F.photos)[sel]);
      e.preventDefault(); return;
    }
  }
  function markConfirm() {
    const wrap = body.querySelector('.confirm');
    if (!wrap) return;
    wrap.children[1].classList.toggle('sel-y', confirmSel === 0);
    wrap.children[2].classList.toggle('sel-n', confirmSel === 1);
  }

  // 场景03（教学删除）完成条件
  function sceneComplete() {
    if (cfg.tutorialDelete && cfg.contacts) return cfg.contacts.some(id => F.contacts[id].tutorial && flags.phone.deleted.includes(id));
    return false;
  }
  function maybeShowExit() {
    if (cfg.manualExit && sceneComplete() && (view === 'home' || view === 'list' || view === 'contacts')) {
      hint.textContent = ILY.t('phone.hint.done');
      const b = button(ILY.t('phone.continue'), () => go(cfg.exitNext));
      b.classList.add('phone-exit');
      body.append(b);
    }
  }
  // 场景01：读完全部邮件后自动退出（场景09 用滚动揭示，不走这里）
  function maybeAutoExit() {
    if (cfg.exitNext && cfg.lockClose && !cfg.showLink && !cfg.onLink) {
      const need = (cfg.mails || []).concat(cfg.reveal ? [cfg.reveal.id] : []);
      if (need.length && !cfg.manualExit && !cfg.allowSend && need.every(id => isRead(id))) later(() => go(cfg.exitNext), 400);
    }
  }
  const _origRender = render;
  render = function () {
    _origRender();
    startDeleteDemo();                       // 首次进入通讯录时启动示例演示
    if (demoStep >= 0) markDemoTarget();     // 每一步都把箭头挂到下一个要点的对象上
    updateDemoTip();
    maybeShowExit();
    maybeAutoExit();
  };

  render();
  window.addEventListener('keydown', onKey);
  /* 游戏菜单里切换语言后：重绘列表级视图（详情视图返回时会自动用新语言重建） */
  const onLang = () => {
    hint.textContent = ILY.t(freeMode ? 'phone.hint.free' : 'phone.hint');
    closeLightbox();                 // 灯箱文案随语言重建，直接关掉最简单
    const tip = root.querySelector('.phone-demo-tip');
    if (tip) {
      const tag = tip.querySelector('.demo-tag');
      const text = tip.querySelector('.demo-text');
      if (tag) tag.textContent = ILY.t('phone.demo.tag');
      if (text) text.textContent = demoTipText();
    }
    if (view === 'home' || view === 'list' || view === 'contacts' || view === 'album') render();
  };
  window.addEventListener('ily:langchange', onLang);
  return () => {
    for (const timer of pending) clearTimeout(timer);
    closeLightbox();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('ily:langchange', onLang);
    if (mailTimer) clearInterval(mailTimer);
    if (editorTimer) clearInterval(editorTimer);
  };
}

Object.assign(ILY, { mountPhone });
})();
