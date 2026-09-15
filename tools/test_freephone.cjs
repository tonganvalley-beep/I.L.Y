// 验证：序章随时掏出手机 + 父亲的回信彩蛋 + s03 示例演示（空格逐步 + 箭头）
// 运行：node tools/test_freephone.cjs（需 8931 端口开发服务器）
const puppeteer = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = 'http://127.0.0.1:8931/game/index.html?player=freetest';
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
  page.on('console', m => {   // 忽略 favicon 之类的无关 404
    const url = (m.location() && m.location().url) || '';
    if (m.type() === 'error' && !/favicon/.test(url)) errors.push('console: ' + m.text() + ' @ ' + url);
  });
  await page.goto(URL_BASE, { waitUntil: 'load' });
  await wait(900);
  const key = async k => { await page.keyboard.press(k); await wait(200); };

  const state = () => page.evaluate(() => ({
    mode: document.querySelector('#stage')?.dataset.mode,
    quickHidden: document.querySelector('#phone-quick')?.hidden,
    dialogOpen: !!document.querySelector('.free-phone-dialog[open]'),
    text: document.querySelector('.dialogue-text')?.textContent || ''
  }));

  // ---------- A. 序章对白场景里常驻「手机」入口 ----------
  let s = await state();
  assert.equal(s.mode, 'dialogue');
  assert.equal(s.quickHidden, false, '序章对白场景应显示手机入口按钮');
  const beforeText = s.text;
  await shot(page, 'freephone-1-button.png');

  // ---------- B. 按 P 掏出手机 ----------
  await key('KeyP');
  await wait(400);
  s = await state();
  assert.equal(s.dialogOpen, true, '按 P 应打开自由手机');
  const apps = await page.$$eval('.free-phone-dialog .home-label', ns => ns.map(n => n.textContent));
  assert.deepEqual(apps, ['邮件', '通讯录', '相册']);
  await shot(page, 'freephone-2-open.png');

  // ---------- C. 自由手机里的旧邮件 ----------
  await key('Enter');
  let rows = await page.$$eval('.free-phone-dialog .phone-row .r-from', ns => ns.map(n => n.textContent));
  assert.equal(rows.length, 4, '开局收件箱应是四封旧邮件');

  // ---------- D. 翻到最底部 → 父亲的回信浮现 ----------
  for (let i = 0; i < 3; i++) await key('ArrowDown');
  await wait(900);
  rows = await page.$$eval('.free-phone-dialog .phone-row', ns => ns.map(n => ({
    cls: n.className, from: n.querySelector('.r-from')?.textContent || ''
  })));
  assert.ok(rows.some(r => r.cls.includes('is-hidden-mail') && r.from.includes('父亲')), '翻到底部应浮出父亲的回信');
  const status = await page.$eval('#status', n => n.textContent);
  assert.match(status, /没有日期的邮件/);
  await shot(page, 'freephone-3-egg-row.png');

  // ---------- E. 打开彩蛋邮件 ----------
  await key('ArrowDown');
  await key('Enter');
  await wait(2500);                       // 等正文打字机走完
  const body = await page.$eval('.free-phone-dialog .d-body', n => n.textContent);
  assert.match(body, /门锁也没有换/);
  await shot(page, 'freephone-4-egg-mail.png');

  // ---------- F. 合上手机，剧情节点不受影响 ----------
  await key('KeyP');
  await wait(400);
  s = await state();
  assert.equal(s.dialogOpen, false, 'P 应合上手机');
  assert.equal(s.mode, 'dialogue');
  assert.equal(s.text.slice(0, 12), beforeText.slice(0, 12), '合上手机后应停在原来的对白节点');

  // ---------- G. 推进到 s03 的示例演示 ----------
  for (let i = 0; i < 40; i++) { const cur = await state(); if (cur.mode === 'phone') break; await key('Space'); }
  assert.equal((await state()).mode, 'phone', '应进入场景01 的手机');
  for (let i = 0; i < 3; i++) await key('ArrowDown');
  await key('Enter');                     // 点开第四封 → 进剧情
  await wait(900);
  for (let i = 0; i < 60; i++) {
    const cur = await state();
    if (cur.mode === 'phone') break;
    await key('Space');
  }
  assert.equal((await state()).mode, 'phone', '应进入场景03 的手机（示例部分）');

  // ---------- H. 示例演示：空格逐步 + 箭头 ----------
  await key('ArrowDown');                 // 主页 → 通讯录
  await key('Enter');
  await wait(500);
  let demo = await page.evaluate(() => ({
    tip: document.querySelector('.phone-demo-tip .demo-text')?.textContent || '',
    tag: document.querySelector('.phone-demo-tip .demo-tag')?.textContent || '',
    target: document.querySelector('.demo-target .r-from')?.textContent || '',
    active: !!document.querySelector('.phone.demo-active'),
    hint: document.querySelector('.phone-hint')?.textContent || ''
  }));
  assert.equal(demo.tag, '示例');
  assert.match(demo.tip, /打开这个联系人/);
  assert.match(demo.target, /便利店同事/, '第 1 步箭头应指向便利店同事');
  assert.equal(demo.active, true);
  assert.match(demo.hint, /空格 继续示例/);
  await shot(page, 'freephone-5-demo-step1.png');

  await key('Space');                     // 第 2 步：按下「删除」
  await wait(400);
  demo = await page.evaluate(() => ({
    head: document.querySelector('.phone-detail .d-head')?.textContent || '',
    target: document.querySelector('.demo-target')?.textContent || '',
    tip: document.querySelector('.phone-demo-tip .demo-text')?.textContent || ''
  }));
  assert.match(demo.head, /便利店同事/);
  assert.match(demo.target, /删除/, '第 2 步箭头应指向「删除」按钮');
  assert.match(demo.tip, /按下「删除」/);
  await shot(page, 'freephone-6-demo-step2.png');

  await key('Space');                     // 第 3 步：确认删除
  await wait(400);
  demo = await page.evaluate(() => ({
    head: document.querySelector('.phone-detail .d-head')?.textContent || '',
    target: document.querySelector('.demo-target')?.textContent || '',
    tip: document.querySelector('.phone-demo-tip .demo-text')?.textContent || ''
  }));
  assert.match(demo.head, /删除/);
  assert.match(demo.target, /删除/, '第 3 步箭头应指向确认的「删除」');
  assert.match(demo.tip, /确认删除/);
  await shot(page, 'freephone-7-demo-step3.png');

  await key('Space');                     // 示例结束 → 等玩家继续
  await wait(600);
  const after = await page.evaluate(() => ({
    target: !!document.querySelector('.demo-target'),
    exit: !!document.querySelector('.phone-exit'),
    tip: document.querySelector('.phone-demo-tip .demo-text')?.textContent || '',
    hint: document.querySelector('.phone-hint')?.textContent || ''
  }));
  assert.equal(after.target, false, '示例结束后不应再有箭头');
  assert.equal(after.exit, true, '示例结束后应出现「继续」');
  assert.match(after.tip, /示例结束/);
  assert.match(after.hint, /空格 \/ Enter 继续/);
  await shot(page, 'freephone-8-demo-done.png');

  await key('Space');                     // 继续 → 进入下一段剧情
  await wait(600);
  assert.equal((await state()).mode, 'dialogue', '继续后应回到对白');

  // ---------- I. 序章之外 / 手机场景里不显示入口 ----------
  const hiddenInPhone = await page.evaluate(() => document.querySelector('#phone-quick')?.hidden);
  assert.equal(hiddenInPhone, false, '对白场景仍应显示入口');

  assert.deepEqual(errors, [], '页面不应报错：' + errors.join(' | '));
  console.log('自由手机 / 父亲回信彩蛋 / 示例演示 全部通过');
  await browser.close();
})().catch(async error => { console.error(error); process.exit(1); });
