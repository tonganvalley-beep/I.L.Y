// 验证嵌套副本 I.L.Y-main/game/ 的序章通讯录删除：爱理永不可删 + 基生打断。
// 嵌套副本是较旧结构，用原始「整段序章」导航（非 scene-preview 跳转）。
// 运行：node tools/test_airi_guard_nested.cjs（需 8931 端口开发服务器）
const puppeteer = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = 'http://127.0.0.1:8931/I.L.Y-main/game/index.html?player=airiguard';
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
  await page.goto(URL_BASE, { waitUntil: 'load' });
  await wait(900);
  const key = async (k, ms = 200) => { await page.keyboard.press(k); await wait(ms); };
  const mode = () => page.evaluate(() => document.querySelector('#stage')?.dataset.mode);
  const snap = () => page.evaluate(() => ({
    rows: [...document.querySelectorAll('.phone-list .phone-row .r-from')].map(n => n.textContent),
    head: document.querySelector('.phone-detail .d-head')?.textContent || '',
    buttons: [...document.querySelectorAll('.phone-detail button')].map(n => n.textContent),
    confirm: !!document.querySelector('.confirm'),
    speaker: document.querySelector('.phone-thought-dialogue')?.hidden ? '' :
      (document.querySelector('.phone-thought-dialogue .speaker')?.textContent || ''),
    line: document.querySelector('.phone-thought-dialogue')?.hidden ? '' :
      (document.querySelector('.phone-thought-dialogue .dialogue-text')?.textContent || ''),
    status: document.querySelector('#status')?.textContent || ''
  }));
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

  // ---------- 整段序章走到 s04_phone ----------
  for (let i = 0; i < 40 && (await mode()) !== 'phone'; i++) await key('Space');
  for (let i = 0; i < 3; i++) await key('ArrowDown', 120);
  await key('Enter', 1000);
  for (let i = 0; i < 60 && (await mode()) !== 'phone'; i++) await key('Space');
  await key('ArrowDown', 300); await key('Enter', 400);
  for (let i = 0; i < 4; i++) await key('Space', 500);
  await key('Space', 800);
  for (let i = 0; i < 80 && (await mode()) !== 'phone'; i++) await key('Space');
  await key('ArrowDown', 300); await key('Enter', 400);

  // ---------- 1. 四个联系人都在 ----------
  let s = await snap();
  assert.deepEqual(s.rows, ['安藤', '妈妈', '爸爸', '百合沢 爱理']);
  await shot(page, 'airi-guard-nested-1-list.png');

  // ---------- 2. 对爱理按「删除」：基生当场打断 ----------
  await openByName('爱理');
  s = await snap();
  assert.match(s.head, /百合沢 爱理/);
  assert.ok(s.buttons.some(b => b.includes('删除')), '爱理详情页应保留删除键（触发打断）');
  await clickDetail('删除');
  await wait(500);
  s = await snap();
  assert.equal(s.confirm, false, '爱理不应弹出删除确认框');
  assert.equal(s.speaker, '成田基生', '打断应以「成田基生」名义显示在文本框');
  assert.equal(s.line, '先看看别人吧');
  await shot(page, 'airi-guard-nested-2-interrupt.png');

  // ---------- 3. 打断后爱理仍在 ----------
  await clickDetail('返回');
  await wait(400);
  s = await snap();
  assert.deepEqual(s.rows, ['安藤', '妈妈', '爸爸', '百合沢 爱理'], '打断后爱理必须还在');

  // ---------- 4. 删安藤/妈妈/爸爸，爱理始终保留 ----------
  await openByName('安藤');
  await clickDetail('删除'); await wait(5400);
  s = await snap();
  assert.equal(s.confirm, true);
  await clickDetail('删除'); await wait(500);
  s = await snap();
  assert.deepEqual(s.rows, ['妈妈', '爸爸', '百合沢 爱理'], '安藤已删，爱理仍在');

  await openByName('妈妈');
  await clickDetail('删除'); await wait(300);
  await clickDetail('取消'); await wait(600);
  s = await snap();
  assert.deepEqual(s.rows, ['爸爸', '百合沢 爱理'], '妈妈已删，爱理仍在');

  await openByName('爸爸');
  await clickDetail('删除'); await wait(300);
  await clickDetail('删除'); await wait(900);
  s = await snap();
  // 嵌套副本的 s04_phone 无 allowSend，删完三人后只 render（不自动开写信）；列表里只剩爱理。
  assert.deepEqual(s.rows, ['百合沢 爱理'], '三人删完，通讯录里只剩爱理（安藤/妈妈/爸爸已删，爱理始终保留）');

  // ---------- 5. 仅剩爱理时，她的详情仍可「删除」触发打断（不真删） ----------
  await openByName('爱理');
  s = await snap();
  assert.match(s.head, /百合沢 爱理/);
  // 删完三人后：爱理详情只剩「写邮件 / 返回」，删除键不再出现——彻底无法删掉她。
  assert.deepEqual(s.buttons.map(b => b.trim()), ['写邮件 ▸', '返回 ▸'], '仅剩爱理时详情只给写邮件（删除键已不出现）');
  await shot(page, 'airi-guard-nested-5-only-mail.png');

  // 嵌套副本是较旧备份，缺 sign&log/gallery-data.js 等素材（既存 404，与本次改动无关），过滤掉。
  const realErrors = errors.filter(e => !/gallery-data\.js/.test(e));
  if (realErrors.length) console.log('NESTED ERRORS:', realErrors.join(' | '));
  assert.deepEqual(realErrors, [], '页面不应报错（已排除嵌套副本既存的 gallery-data.js 404）：' + realErrors.join(' | '));
  console.log('嵌套副本：爱理不可删除 / 基生打断提示 全部通过');
  await browser.close();
})().catch(async error => { console.error(error); process.exit(1); });
