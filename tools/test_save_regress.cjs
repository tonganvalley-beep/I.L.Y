// 回归：存档模式下的自动页提示 / 快速页一键快速存档 / 手动页保存仍正常
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-first-run', '--no-default-browser-check']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://localhost:8931/game/index.html?player=regress', { waitUntil: 'load' });

  await page.evaluate(() => document.querySelector('#save').click());
  await new Promise(r => setTimeout(r, 300));

  // 手动页保存
  await page.evaluate(() => document.querySelector('#save-slots .save-slot button').click());
  await new Promise(r => setTimeout(r, 200));
  console.log('1. 手动页保存:', await page.$eval('#save-status', n => n.textContent));

  // 自动页
  await page.evaluate(() => document.querySelector('#save-pages [data-page="auto"]').click());
  await new Promise(r => setTimeout(r, 200));
  const auto = await page.evaluate(() => {
    const card = document.querySelector('#save-slots .save-slot');
    return { hint: card?.querySelector('.save-readonly-hint')?.textContent?.slice(0, 30), hasButton: !!card?.querySelector('button') };
  });
  console.log('2. 自动页（存档模式）:', JSON.stringify(auto));

  // 快速页
  await page.evaluate(() => document.querySelector('#save-pages [data-page="quick"]').click());
  await new Promise(r => setTimeout(r, 200));
  const quickBefore = await page.evaluate(() => document.querySelector('#save-slots .save-slot')?.className);
  await page.evaluate(() => {
    const btn = document.querySelector('#save-slots .save-slot button');
    if (btn && !btn.disabled) btn.click();
  });
  await new Promise(r => setTimeout(r, 200));
  const quick = await page.evaluate(() => ({
    status: document.querySelector('#save-status')?.textContent,
    slotClass: document.querySelector('#save-slots .save-slot')?.className
  }));
  console.log('3. 快速页点击前:', quickBefore, '点击后:', JSON.stringify(quick));

  // 英文语言切换后快速页文案
  await page.evaluate(() => document.querySelector('#lang').click());
  await new Promise(r => setTimeout(r, 200));
  const en = await page.evaluate(() => ({
    quickBtn: document.querySelector('#save-slots .save-slot button')?.textContent,
    title: document.querySelector('#save-menu-title')?.textContent
  }));
  console.log('4. 英文模式:', JSON.stringify(en));

  const keys = await page.evaluate(() => { const a = []; for (let i = 0; i < localStorage.length; i++) a.push(localStorage.key(i)); return a; });
  console.log('5. localStorage:', keys);

  await page.screenshot({ path: 'D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/outputs/save_ux_after.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
