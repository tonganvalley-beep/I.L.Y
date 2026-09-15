// 验证：序章通讯录删除场景 s04_phone —— 安藤/妈妈/爸爸可删，爱理永远删不掉；
// 玩家对爱理按「删除」时基生当场打断，文本框显示「成田基生 / 先看看别人吧」，不弹删除确认框。
// 运行：node tools/test_airi_guard.cjs（需 8931 端口开发服务器）
const puppeteer = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = 'http://127.0.0.1:8931/game/index.html?player=scene-preview&scene=s04_phone';
const OUT = path.join(__dirname, '..', 'outputs');
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) });

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    const url = (m.location() && m.location().url) || '';
    if (m.type() === 'error' && !/favicon/.test(url)) errors.push('console: ' + m.text() + ' @ ' + url);
  });
  // game/index.html 有入口守卫：必须先从根 index.html 进入（设置 sessionStorage
  // ily-root-entry=1），否则会重定向到登录页。先暖场访问根入口，再进游戏页。
  await page.goto('http://127.0.0.1:8931/index.html', { waitUntil: 'load' });
  await wait(700);
  await page.goto(URL_BASE, { waitUntil: 'load' });
  await wait(900);
  const key = async (k, ms = 200) => { await page.keyboard.press(k); await wait(ms); };
  const mode = () => page.evaluate(() => document.querySelector('#stage')?.dataset.mode);
  const snap = () => page.evaluate(() => ({
    rows: [...document.querySelectorAll('.phone-list .phone-row .r-from')].map(n => n.textContent),
    head: document.querySelector('.phone-detail .d-head')?.textContent || '',
    buttons: [...document.querySelectorAll('.phone-detail button')].map(n => n.textContent),
    tabTitle: document.querySelector('.phone-tabs .tab-title')?.textContent || '',
    confirm: !!document.querySelector('.confirm'),
    speaker: document.querySelector('.phone-thought-dialogue')?.hidden ? '' :
      (document.querySelector('.phone-thought-dialogue .speaker')?.textContent || ''),
    line: document.querySelector('.phone-thought-dialogue')?.hidden ? '' :
      (document.querySelector('.phone-thought-dialogue .dialogue-text')?.textContent || ''),
    status: document.querySelector('#status')?.textContent || ''
  }));
  // 选中通讯录里名字包含 frag 的联系人并打开
  const openByName = async frag => {
    const ok = await page.evaluate(f => {
      const row = [...document.querySelectorAll('.phone-list .phone-row')]
        .find(n => (n.querySelector('.r-from')?.textContent || '').includes(f));
      if (!row) return false;
      row.click();
      return true;
    }, frag);
    assert.ok(ok, `通讯录里应能找到「${frag}」`);
    await wait(400);
  };
  const clickDetail = async label => {
    const ok = await page.evaluate(l => {
      const b = [...document.querySelectorAll('.phone-detail button')].find(n => n.textContent.includes(l));
      if (!b) return false;
      b.click();
      return true;
    }, label);
    assert.ok(ok, `详情页应有「${label}」按钮`);
  };

  // ---------- 直接跳到 s04_phone（序章通讯录删除场景），避免整段序章导航漂移 ----------
  for (let i = 0; i < 40 && (await mode()) !== 'phone'; i++) await key('Space', 150);
  await key('ArrowDown', 300); await key('Enter', 400);                            // 主页 → 通讯录

  // ---------- 1. 四个联系人都在 ----------
  let s = await snap();
  assert.deepEqual(s.rows, ['安藤', '妈妈', '爸爸', '百合沢 爱理']);
  await shot(page, 'airi-guard-1-list.png');

  // ---------- 2. 对爱理按「删除」：基生当场打断 ----------
  await openByName('爱理');
  s = await snap();
  assert.match(s.head, /百合沢 爱理/);
  assert.ok(s.buttons.some(b => b.includes('删除')), '爱理详情页仍保留删除键（用来触发打断）');
  await clickDetail('删除');
  await wait(500);
  s = await snap();
  assert.equal(s.confirm, false, '爱理不应弹出删除确认框');
  assert.equal(s.speaker, '成田基生', '打断的话应以「成田基生」的名义显示在文本框');
  assert.equal(s.line, '先看看别人吧');
  assert.equal(s.status, '', '不再走状态栏提示');
  await shot(page, 'airi-guard-2-interrupt.png');

  // ---------- 3. 打断后爱理仍在通讯录里 ----------
  await clickDetail('返回');
  await wait(400);
  s = await snap();
  assert.deepEqual(s.rows, ['安藤', '妈妈', '爸爸', '百合沢 爱理'], '打断后爱理必须还在');
  assert.equal(s.confirm, false);

  // ---------- 4. 依次删除安藤 / 妈妈 / 爸爸，爱理始终保留 ----------
  await openByName('安藤');
  await clickDetail('删除'); await wait(5400);     // 第一次亲手删除：先播三句独白（约 4.8s）再进确认
  s = await snap();
  assert.equal(s.confirm, true, '安藤应进入删除确认');
  await clickDetail('删除'); await wait(500);                 // 确认删除（取消被剧情锁住）
  s = await snap();
  assert.deepEqual(s.rows, ['妈妈', '爸爸', '百合沢 爱理'], '安藤已删除，爱理仍在');

  await openByName('妈妈');
  await clickDetail('删除'); await wait(300);
  await clickDetail('取消'); await wait(600);                 // 取消也会被剧情强制删除
  s = await snap();
  assert.deepEqual(s.rows, ['爸爸', '百合沢 爱理'], '妈妈已删除，爱理仍在');

  await openByName('爸爸');
  await clickDetail('删除'); await wait(300);
  await clickDetail('删除'); await wait(900);
  s = await snap();
  assert.equal(s.head, '百合沢 爱理', '三人删完，基生停在爱理名下（爱理未被删除）');
  assert.ok(!s.buttons.some(b => b.includes('写邮件')), '爱理详情不再提供「写邮件」（写信入口在邮件收件箱草稿）');
  assert.deepEqual(s.buttons.map(b => b.trim()), ['返回 ▸'], '爱理详情此时只给「返回」');
  await shot(page, 'airi-guard-3-only-airi.png');

  // ---------- 5. 自动转入「邮件」界面，从草稿开始写信（写信属于邮件，不在通讯录） ----------
  await wait(3200);                            // 等 stayOnAiri 的 3s 计时：留在爱理 → 转入邮件 → 打开草稿
  s = await snap();
  assert.equal(s.head, '新邮件 · 致 百合沢 爱理', '自动转入邮件界面、打开致爱理的草稿（顶栏应为邮件）');
  assert.equal(s.tabTitle, '邮件', '写信界面应挂在「邮件」下，而非通讯录');
  assert.ok(s.buttons.some(b => b.includes('发送')), '草稿编辑器应有「发送」按钮');
  await shot(page, 'airi-guard-4-write-in-mail.png');

  // ---------- 6. 回到通讯录列表：只剩爱理，其余三人已删 ----------
  await clickDetail('返回'); await wait(400);   // 编辑器 → 邮件列表
  await key('Escape', 400);                     // 邮件列表 → 主页
  await page.evaluate(() => { const b = [...document.querySelectorAll('.home-app')].find(n => n.textContent.includes('通讯录')); if (b) b.click(); });
  await wait(400);
  s = await snap();
  assert.deepEqual(s.rows, ['百合沢 爱理'], '回到列表：通讯录里只剩爱理（安藤/妈妈/爸爸已删，爱理始终保留）');

  // 重新打开爱理详情：仍只给「返回」，不再给「写邮件」（写信入口已在邮件收件箱）
  await openByName('爱理');
  s = await snap();
  assert.deepEqual(s.buttons.map(b => b.trim()), ['返回 ▸'], '重新打开爱理详情仍只给「返回」（写邮件在邮件里）');
  await shot(page, 'airi-guard-4-write-mail.png');

  assert.deepEqual(errors, [], '页面不应报错：' + errors.join(' | '));
  console.log('爱理不可删除 / 基生打断提示 全部通过');
  await browser.close();
})().catch(async error => { console.error(error); process.exit(1); });
