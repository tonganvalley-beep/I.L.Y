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

  // 当前可见邮件列表（场景01 含 reveal 逻辑）
  let mailIds = (cfg.mails || []).slice();
  if (cfg.reveal && !mailIds.includes(cfg.reveal.id) && cfg.reveal.after.every(id => flags.phone.read.includes(id))) {
    mailIds.push(cfg.reveal.id);
  }

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
  let scrollStep = 0;           // 场景09 下滚揭示进度
  let contactId = null;
  let confirmSel = 0;           // 删除确认：0=删除 1=取消
  let photoId = null;
  let demoBusy = false;         // 删除教学演示进行中（屏蔽键盘输入）

  const root = el('div', 'phone');
  const screen = el('div', 'phone-screen');
  const tabs = el('div', 'phone-tabs');
  const body = el('div', 'phone-body');
  const hint = el('div', 'phone-hint', ILY.t('phone.hint'));
  root.append(screen, hint);
  screen.append(tabs, body);
  stage.append(root);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 主界面（图标页） ----------
  const APP_ICONS = {
    mail: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="#123326" stroke-width="2"/><path d="M2.5 7.5 L12 14 L21.5 7.5" fill="none" stroke="#123326" stroke-width="2"/></svg>',
    contacts: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="#123326" stroke-width="2"/><circle cx="12" cy="9.5" r="2.8" fill="#123326"/><path d="M7 17c.6-2.8 2.7-4 5-4s4.4 1.2 5 4" fill="none" stroke="#123326" stroke-width="2"/></svg>',
    album: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="#123326" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="#123326"/><path d="M4 17l4.5-4 3.5 3 3.5-3.5L20 17" fill="none" stroke="#123326" stroke-width="2"/></svg>'
  };
  const APPS = [
    { key: 'mail', labelKey: 'phone.mail', badge: () => mailIds.filter(id => !flags.phone.read.includes(id)).length },
    { key: 'contacts', labelKey: 'phone.contacts', badge: null },
    { key: 'album', labelKey: 'phone.album', badge: null }
  ];
  const tabLabel = () => { const app = APPS.find(a => a.key === tab); return app ? ILY.t(app.labelKey) : ''; };

  function goHome() { view = 'home'; render(); }
  function enterApp(key) { tab = key; view = 'list'; sel = 0; render(); }

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
    body.replaceChildren();
    const atHome = view === 'home';
    screen.classList.toggle('is-home', atHome);
    if (atHome) { tabs.replaceChildren(); renderHome(); return; }
    // 子界面：顶栏改为「◂ 主页 + 栏目名」
    tabs.replaceChildren();
    const homeBtn = button(ILY.t('phone.home'), () => goHome());
    homeBtn.classList.add('tab-home');
    tabs.append(homeBtn, el('span', 'tab-title', tabLabel()));
    if (tab === 'mail') renderMailList();
    else if (tab === 'contacts') renderContacts();
    else renderAlbum();
  }

  // ---------- 邮件列表 ----------
  function renderMailList() {
    view = 'list';
    mailScroll = null;
    const list = el('div', 'phone-list');
    mailIds.forEach((id, i) => {
      const m = F.mails[id];
      const row = el('div', 'phone-row' + (i === sel ? ' sel' : ''));
      const from = el('div', 'r-from', m.from);
      if (!flags.phone.read.includes(id)) from.prepend(el('span', 'r-unread'));
      row.append(from, el('div', 'r-time', m.time), el('div', 'r-sub', m.subject || ILY.t('phone.noSubject')));
      row.addEventListener('click', () => { sel = i; openMail(id); });
      list.append(row);
    });
    body.append(list);
    if (mailIds.length) list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }

  function openMail(id) {
    mailId = id; view = 'mail'; mailScroll = null;
    if (!flags.phone.read.includes(id)) {
      flags.phone.read.push(id); flags.MAIL_READ_COUNT++;
      // 场景01：读完 A01-A03 后解锁 A04
      if (cfg.reveal && !mailIds.includes(cfg.reveal.id) && cfg.reveal.after.every(rid => flags.phone.read.includes(rid))) mailIds.push(cfg.reveal.id);
    }
    const m = F.mails[id];
    const wrap = el('div', 'phone-detail');
    wrap.append(el('div', 'd-head', `${m.from} · ${m.time}` + (m.subject ? ` · ${m.subject}` : '')));
    const text = el('div', 'd-body');
    wrap.append(text);
    const useScroll = m.scrollReveal && cfg.scrollReveal;
    if (useScroll) {
      const trail = el('div', 'd-reveal-trail');
      const linkLine = button(m.scrollReveal.link, () => finishReveal());
      linkLine.className = 'd-link';
      linkLine.style.display = 'none';
      const cap = el('div', 'd-cap', m.scrollReveal.linkLabel);
      cap.style.display = 'none';
      wrap.append(trail, linkLine, cap);
      mailScroll = { trail, linkLine, cap, reveal: m.scrollReveal, onReveal: cfg.onReveal, revealed:false, completed:false };
    }
    const back = button(ILY.t('phone.back'), () => { scrollStep = 0; render(); });
    wrap.append(back);
    body.replaceChildren(wrap);

    mailChars = Array.from(m.body);
    mailShown = 0; scrollStep = 0;
    const type = () => {
      text.textContent = mailChars.slice(0, mailShown).join('');
      if (mailShown >= mailChars.length) { clearInterval(mailTimer); mailTimer = null; }
    };
    if (reduced) { mailShown = mailChars.length; type(); }
    else { mailTimer = setInterval(() => { mailShown = Math.min(mailChars.length, mailShown + 2); type(); }, 16); }
  }
  let mailScroll = null;

  function revealScrollStep() {
    if (!mailScroll || mailScroll.completed) return;
    if (!mailScroll.revealed) {
      scrollStep++;
      const steps = mailScroll.reveal.ellipsis || [];
      const value = steps[scrollStep - 1] || '';
      const line = el('div', 'd-reveal-step', value || '\u00a0');
      mailScroll.trail.append(line);
      line.scrollIntoView({ block:'end', behavior:'auto' });
      if (scrollStep >= mailScroll.reveal.afterDowns) {
        mailScroll.revealed = true;
        mailScroll.linkLine.style.display = '';
        mailScroll.cap.style.display = '';
        state.flags.FLAG_HIDDEN_LINK = 'found';
        mailScroll.linkLine.scrollIntoView({ block:'nearest', behavior:'auto' });
      }
    } else {
      body.scrollTop += 28;
    }
  }

  function finishReveal() {
    if (!mailScroll?.revealed || mailScroll.completed || !mailScroll.onReveal) return;
    mailScroll.completed = true;
    go(mailScroll.onReveal);
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
    // autoDeleteDemo：进入通讯录后自动演示删除流程（教学场景用）
    if (cfg.autoDeleteDemo && !demoBusy) {
      const target = (cfg.contacts || []).find(id => F.contacts[id].tutorial && !flags.phone.deleted.includes(id));
      if (target) later(() => runDeleteDemo(target), 1000);
    }
  }

  // 自动删除演示：打开联系人 → 弹出确认（高亮“删除”）→ 自动确认，玩家只需观看
  // 教学提示弹窗：演示期间悬浮在手机上方
  function showDemoTip(show) {
    const tip = root.querySelector('.phone-demo-tip');
    if (show && !tip) {
      const t = el('div', 'phone-demo-tip');
      t.append(el('span', 'demo-tag', ILY.t('phone.demo.tag')), el('span', 'demo-text', ILY.t('phone.demo.desc')));
      root.append(t);
    } else if (!show && tip) tip.remove();
  }
  function runDeleteDemo(id) {
    if (demoBusy || flags.phone.deleted.includes(id)) return;
    demoBusy = true;
    showDemoTip(true);
    sel = visibleContacts().indexOf(id);
    later(() => { if (view === 'contacts') openContact(id); }, 1100);
    later(() => { if (view === 'contact' && contactId === id) askDelete(id, true); }, 3300);
    later(() => {
      demoBusy = false;
      showDemoTip(false);
      if (view === 'confirm' && contactId === id) doDelete(id);
    }, 5500);
  }

  function openContact(id) {
    contactId = id; view = 'contact';
    const c = F.contacts[id];
    const wrap = el('div', 'phone-detail');
    wrap.append(el('div', 'd-head', c.name));
    wrap.append(el('div', 'd-body', c.note));
    const isDeleted = flags.phone.deleted.includes(id);
    const forcedLeft = (cfg.forcedDelete || []).filter(item => !flags.phone.deleted.includes(item));
    if (id === 'airi' && cfg.allowSend && !forcedLeft.length) {
      wrap.append(button(ILY.t('phone.writeMail'), () => openEditor()), button(ILY.t('phone.back'), () => render()));
    } else if (!isDeleted) {
      const del = button(ILY.t('phone.delete'), () => askDelete(id));
      const back = button(ILY.t('phone.back'), () => render());
      wrap.append(del, back);
    } else wrap.append(button(ILY.t('phone.back'), () => render()));
    body.replaceChildren(wrap);
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
    // 爱理始终不可删除；只有确认“删除”后才给出短提示。
    if (id === 'airi') {
      afterConfirm(id, true);
      return;
    }
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
    // 爱理：取消时直接返回；确认删除时拒绝操作并短暂提示。
    if (id === 'airi') {
      render();
      if (didDelete) {
        notify(ILY.t('phone.lookOthers'));
        later(() => notify(''), 1000);
      }
      return;
    }
    // 全部强制联系人删除完毕后停在爱理，必须由玩家主动打开联系人并写信。
    const forced = (cfg.forcedDelete || []).filter(x => !flags.phone.deleted.includes(x));
    if (!forced.length) {
      if (cfg.allowSend) {
        const airiIndex = visibleContacts().indexOf('airi');
        if (airiIndex >= 0) sel = airiIndex;
        render();
        return;
      }
      if (cfg.manualExit) { render(); return; }   // 等玩家按「继续」
      if (cfg.exitNext) { go(cfg.exitNext); return; }
    }
    render();
  }

  function openEditor() {
    view = 'editor';
    const wrap = el('div', 'phone-detail');
    wrap.append(el('div', 'd-head', ILY.t('phone.editorHead')));
    wrap.append(el('div', 'd-body', F.mails.K01.body));
    const send = button(ILY.t('phone.send'), () => {
      view = 'send';
      flags.MAIL_READ_COUNT++; if (flags.MAIL_READ_COUNT >= 3) unlock(state, 'daily', ILY.t('achieve.daily'), notify);
      wrap.replaceChildren(el('div', 'd-head', ILY.t('phone.sending')));
      later(() => {
        const sys = el('div', 'phone-detail');
        sys.append(el('div', 'd-head', F.mails.SYS01.from + ' · ' + F.mails.SYS01.subject));
        sys.append(el('div', 'd-body', F.mails.SYS01.body));
        sys.append(button(ILY.t('phone.back'), () => { if (cfg.exitNext) go(cfg.exitNext); }));
        body.replaceChildren(sys);
      }, 700);
    });
    const back = button(ILY.t('phone.back'), () => render());
    wrap.append(send, back);
    body.replaceChildren(wrap);
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
    const p = F.photos[id];
    const wrap = el('div', 'phone-detail');
    const img = assets.image(p.img);
    if (img) { const im = el('img', 'photo-full'); im.src = img; im.alt = p.title; wrap.append(im); }
    wrap.append(el('div', 'd-head', p.title));
    wrap.append(el('div', 'd-body', p.caption));
    wrap.append(button(ILY.t('phone.back'), () => render()));
    body.replaceChildren(wrap);
  }

  function addEdgeHint(list, n) {
    if (sel > 0) list.prepend(el('div', 'edge', '▲'));
    if (sel < n - 1) list.append(el('div', 'edge', '▼'));
  }

  // ---------- 键盘 ----------
  function onKey(e) {
    if (document.querySelector('dialog[open]') || e.target.closest('button, a, input, textarea, select')) return;
    if (demoBusy) { e.preventDefault(); return; }   // 演示播放中不响应按键
    const k = e.key;
    if (k === 'm' || k === 'M' || k === 'Escape') {
      if (view === 'home') {
        if (cfg.manualExit && sceneComplete()) go(cfg.exitNext);
      } else if (view === 'list' || view === 'contacts' || view === 'album') {
        goHome();
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
      if (k === 'ArrowDown') {
        revealScrollStep();
        e.preventDefault(); return;
      }
      if (k === 'ArrowUp') { body.scrollTop = Math.max(0, body.scrollTop - 28); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') {
        if (mailScroll?.revealed) finishReveal();
        else { scrollStep = 0; render(); }
        e.preventDefault(); return;
      }
      return;
    }
    if (view === 'contact') {
      if (k === 'd' || k === 'D') { askDelete(contactId); e.preventDefault(); return; }
      if (k === ' ' || k === 'Enter') {
        const forcedLeft = (cfg.forcedDelete || []).filter(item => !flags.phone.deleted.includes(item));
        if (contactId === 'airi' && cfg.allowSend && !forcedLeft.length) openEditor();
        else render();
        e.preventDefault(); return;
      }
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
    if (view === 'editor' || view === 'send' || view === 'photo') {
      if (k === ' ' || k === 'Enter') { /* 由按钮处理 */ e.preventDefault(); return; }
      return;
    }
    // 列表态
    const list = tab === 'album' ? Object.keys(F.photos) : (tab === 'contacts' ? visibleContacts() : mailIds);
    if (k === 'ArrowDown') { sel = Math.min(list.length - 1, sel + 1); render(); e.preventDefault(); return; }
    if (k === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); return; }
    if (tab === 'album' && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      const step = k === 'ArrowRight' ? 1 : -1; sel = Math.max(0, Math.min(list.length - 1, sel + step)); render(); e.preventDefault(); return;
    }
    if (k === ' ' || k === 'Enter') {
      // 教学删除只有一个必做操作，完成后空格/Enter 与“继续”按钮等价。
      if (cfg.manualExit && sceneComplete()) go(cfg.exitNext);
      else if (tab === 'mail') openMail(mailIds[sel]);
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
    if (cfg.exitNext && cfg.lockClose && !cfg.scrollReveal && !cfg.onReveal) {
      const need = (cfg.mails || []).concat(cfg.reveal ? [cfg.reveal.id] : []);
      if (need.length && !cfg.manualExit && !cfg.allowSend && need.every(id => flags.phone.read.includes(id))) later(() => go(cfg.exitNext), 400);
    }
  }
  const _origRender = render;
  render = function () { _origRender(); maybeShowExit(); maybeAutoExit(); };

  render();
  const onWheel = event => {
    if (view === 'mail' && mailScroll && event.deltaY > 0) {
      event.preventDefault();
      revealScrollStep();
    }
  };
  let touchStartY = null;
  const onTouchStart = event => { touchStartY = event.touches?.[0]?.clientY ?? null; };
  const onTouchEnd = event => {
    const endY = event.changedTouches?.[0]?.clientY;
    if (view === 'mail' && mailScroll && touchStartY !== null && typeof endY === 'number' && touchStartY - endY > 24) revealScrollStep();
    touchStartY = null;
  };
  body.addEventListener('wheel', onWheel, { passive:false });
  body.addEventListener('touchstart', onTouchStart, { passive:true });
  body.addEventListener('touchend', onTouchEnd, { passive:true });
  window.addEventListener('keydown', onKey);
  /* 游戏菜单里切换语言后：重绘列表级视图（详情视图返回时会自动用新语言重建） */
  const onLang = () => {
    hint.textContent = ILY.t('phone.hint');
    const tip = root.querySelector('.phone-demo-tip');
    if (tip) tip.querySelector('.demo-text').textContent = ILY.t('phone.demo.desc');
    if (view === 'home' || view === 'list' || view === 'contacts' || view === 'album') render();
  };
  window.addEventListener('ily:langchange', onLang);
  return () => {
    for (const timer of pending) clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('ily:langchange', onLang);
    body.removeEventListener('wheel', onWheel);
    body.removeEventListener('touchstart', onTouchStart);
    body.removeEventListener('touchend', onTouchEnd);
    if (mailTimer) clearInterval(mailTimer);
  };
}

Object.assign(ILY, { mountPhone });
})();
