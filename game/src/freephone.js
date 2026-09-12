// 《I.L.Y.》序章 · 随时掏出的手机
// 契约：ILY.initFreePhone({ getState, assets, notify, inPrologue })
//   - 画面右下角常驻「手机 (P)」按钮，序章任意场景都能点开；按 P 键同样开关。
//   - 打开的是自由手机：只解锁剧情里已经出现过的邮件 / 联系人，只读（不能删人、不能写信），
//     随时按 P / M / Esc / 关闭按钮合上，当前剧情节点不受影响。
//   - 收件箱翻到最底部会浮出隐藏邮件 F02（父亲的回信），属于玩家自己探索的彩蛋。
(() => {
'use strict';

// 一开机就躺在收件箱里的旧邮件（序章场景01 的“已保存的邮件”）
const SAVED_MAILS = ['A01', 'A02', 'A03', 'A04'];
// 彩蛋：父亲的回信（不在任何剧情节点里列出）
const HIDDEN_MAIL = 'F02';

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true">'
  + '<rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>'
  + '<path d="M10.5 5.2h3" stroke="currentColor" stroke-width="2"/>'
  + '<rect x="8.5" y="8" width="7" height="9" rx="1" fill="currentColor" opacity=".35"/>'
  + '<circle cx="12" cy="19" r="1.1" fill="currentColor"/></svg>';

let ctx = null;
let dialog = null, holder = null, cleanupPhone = null, btn = null, label = null;

function phoneFlags(state) {
  state.flags = state.flags || {};
  state.flags.phone = state.flags.phone || {};
  const p = state.flags.phone;
  p.seenMails = p.seenMails || [];
  p.seenContacts = p.seenContacts || [];
  p.freeRead = p.freeRead || [];
  p.found = p.found || [];
  return p;
}

// 自由手机的配置：按剧情进度解锁内容
function buildConfig(state) {
  const p = phoneFlags(state);
  const mails = SAVED_MAILS.slice();
  for (const id of p.seenMails) {
    if (id !== HIDDEN_MAIL && !mails.includes(id) && ILY.data.phone.mails[id]) mails.push(id);
  }
  const contacts = p.seenContacts.filter(id => ILY.data.phone.contacts[id]);
  return {
    freeMode: true,
    tab: 'mail',
    mails,
    contacts,
    hiddenMail: HIDDEN_MAIL,
    onClose: close
  };
}

function refreshLabel() {
  if (label) label.textContent = ILY.t('phone.free.title');
  if (btn) btn.title = ILY.t('phone.free.title');
  const closeBtn = dialog ? dialog.querySelector('.free-phone-close') : null;
  if (closeBtn) closeBtn.textContent = ILY.t('phone.free.close');
}

function build() {
  dialog = ILY.el('dialog', 'free-phone-dialog');
  dialog.tabIndex = -1;               // 焦点留在弹窗本身，键盘交给手机模式处理
  holder = ILY.el('div', 'free-phone-holder');
  // 点按钮时不让它抢焦点，否则空格会同时触发按钮和手机键盘
  dialog.addEventListener('mousedown', event => {
    if (event.target && event.target.closest && event.target.closest('button')) event.preventDefault();
  });
  const bar = ILY.el('div', 'free-phone-bar');
  const closeBtn = ILY.button(ILY.t('phone.free.close'), () => close());
  closeBtn.className = 'free-phone-close';
  bar.append(closeBtn);
  dialog.append(bar, holder);
  // Esc 由手机模式自己处理（先回主页，再合上），这里拦掉浏览器默认的关闭行为
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.addEventListener('close', () => {
    if (cleanupPhone) { cleanupPhone(); cleanupPhone = null; }
    holder.replaceChildren();
    const stage = document.querySelector('#stage');
    if (stage) stage.focus({ preventScroll: true });
    refresh();
  });
  document.body.append(dialog);

  btn = ILY.el('button', 'phone-quick');
  btn.type = 'button';
  btn.id = 'phone-quick';
  btn.innerHTML = ICON;
  label = ILY.el('span', 'phone-quick-label', ILY.t('phone.free.title'));
  btn.append(label);
  btn.addEventListener('click', () => open());
  document.body.append(btn);
}

function canOpen() {
  return !!ctx && !!btn && !btn.hidden;
}

function open() {
  if (!canOpen() || !dialog || dialog.open) return;
  const state = ctx.getState();
  if (!state) return;
  holder.replaceChildren();
  dialog.showModal();
  dialog.focus({ preventScroll: true });   // 把焦点从「合上手机」按钮挪回弹窗
  window.dispatchEvent(new Event('blur')); // 让步行 / 弹幕等玩法暂停
  cleanupPhone = ILY.mountPhone({
    stage: holder,
    node: { phone: buildConfig(state) },
    state,
    assets: ctx.assets,
    go: () => close(),
    notify: ctx.notify
  });
}

function close() {
  if (dialog && dialog.open) dialog.close();
}

// 序章之外、或者已经在用手机 / 看结局时，不显示入口
function refresh() {
  if (!btn || !ctx) return;
  const state = ctx.getState();
  const stage = document.querySelector('#stage');
  const mode = stage ? stage.dataset.mode : '';
  const inStory = !!state && ctx.inPrologue();
  btn.hidden = !inStory || ['phone', 'finale', 'branch', 'end'].includes(mode);
}

function onKey(event) {
  if (event.key !== 'p' && event.key !== 'P') return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target && event.target.closest && event.target.closest('input, textarea, select')) return;
  if (document.querySelector('dialog[open]')) return;   // 已经开着别的弹窗（或自由手机自己）时不抢键
  if (!canOpen()) return;
  event.preventDefault();
  open();
}

Object.assign(ILY, {
  initFreePhone(options) {
    ctx = options;
    build();
    window.addEventListener('keydown', onKey);
    window.addEventListener('ily:langchange', refreshLabel);
    refresh();
  },
  refreshFreePhone: refresh,
  openFreePhone: open,
  closeFreePhone: close,
  freePhoneConfig: buildConfig
});
})();
