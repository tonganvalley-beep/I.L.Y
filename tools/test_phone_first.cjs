// 验证：手机首次登场直接列出四封邮件；点开前三封可翻阅；点第四封直接进剧情
// 运行：node tools/test_phone_first.cjs（需 8931 端口开发服务器）
const puppeteer = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const assert = require('node:assert/strict');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = 'http://127.0.0.1:8931/game/index.html?player=phonetest2';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_BASE, { waitUntil: 'load' });
  await wait(800);

  // 0. 推进到手机场景
  for (let i = 0; i < 30; i++) {
    const mode = await page.evaluate(() => document.querySelector('#stage')?.dataset.mode);
    if (mode === 'phone') break;
    await page.keyboard.press('Space');
    await wait(250);
  }
  await wait(400);

  // 1. 首次进手机：不再显示图标主页，直接是四封邮件
  const step1 = await page.evaluate(() => ({
    home: !!document.querySelector('.phone-home'),
    rows: [...document.querySelectorAll('.phone-row')].map(r => r.textContent.trim())
  }));
  assert.equal(step1.home, false, '不应停在图标主页');
  assert.equal(step1.rows.length, 4, '应直接显示四封邮件，实际 ' + step1.rows.length);
  console.log('1. 直接列出四封:', JSON.stringify(step1.rows, null, 0));
  await page.screenshot({ path: 'outputs/phone-first-list4.png' });

  // 2. 翻阅前三封：可以打开、返回，不退出
  for (const idx of [0, 1, 2]) {
    await page.evaluate(i => document.querySelectorAll('.phone-row')[i].click(), idx);
    await wait(500);
    const open = await page.evaluate(() => ({
      mode: document.querySelector('#stage').dataset.mode,
      body: document.querySelector('.d-body')?.textContent.slice(0, 12)
    }));
    assert.equal(open.mode, 'phone', `第 ${idx + 1} 封应保持手机场景`);
    assert.ok(open.body && open.body.length > 0, '应显示正文');
    await page.evaluate(() => [...document.querySelectorAll('.phone-detail button')].pop().click());
    await wait(300);
    const back = await page.evaluate(() => document.querySelectorAll('.phone-row').length);
    assert.equal(back, 4, '返回后仍是四封');
  }
  console.log('2. 前三封可自由翻阅并返回 ✓');

  // 3. 点第四封 → 直接进入剧情（s01_photo，带海边合影 overlay）
  await page.evaluate(() => document.querySelectorAll('.phone-row')[3].click());
  await wait(1200);
  const step3 = await page.evaluate(() => ({
    mode: document.querySelector('#stage').dataset.mode,
    text: document.querySelector('.dialogue-text')?.textContent.slice(0, 30),
    overlay: !!document.querySelector('.overlay, [data-overlay]')
  }));
  assert.equal(step3.mode, 'dialogue', '第四封应进入对白剧情，实际 ' + step3.mode);
  assert.match(step3.text || '', /海边/, '应进入海边合影那一段');
  console.log('3. 第四封 → 剧情:', step3.text);
  await page.screenshot({ path: 'outputs/phone-first-exit.png' });

  assert.deepEqual(errors, [], '页面报错: ' + errors.join('; '));
  console.log('全部通过');
  await browser.close();
})();
