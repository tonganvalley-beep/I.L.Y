// 验证 A/D 移动 + 空格调查（背身 + 大弹窗）+ 松开停止
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-first-run', '--no-default-browser-check', '--window-size=1280,720']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.evaluateOnNewDocument(() => {
    const record = {
      format: 'ily-save', version: 2, slot: '1-1', savedAt: new Date().toISOString(),
      meta: { chapter: '序章', sceneName: '隧道', summary: '', preview: 'bg-tunnel', importedFrom: null },
      state: { version: 1, chapter: 'prologue', node: 's07_walk', clues: [], flags: { achievements: [] }, maps: {} }
    };
    localStorage.setItem('ily-save-v2:ctrltest:1-1', JSON.stringify(record));
  });
  await page.goto('http://localhost:8931/game/index.html?player=ctrltest&slot=1-1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 800));
  if ((await page.evaluate(() => document.querySelector('#stage').dataset.mode)) !== 'walk') {
    console.log('未进入 walk'); await browser.close(); return;
  }

  // 1. 确认左右按钮已移除
  const ctrlBtns = await page.evaluate(() => [...document.querySelectorAll('.walk-ctrl button')].map(b => b.textContent));
  console.log('1. 控制按钮:', JSON.stringify(ctrlBtns));

  // 2. 按 D 移动，读取 HUD 百分比变化；松开应停止
  const pct = async () => page.evaluate(() => document.querySelector('.walk-hud').textContent);
  console.log('2. 初始:', await pct());
  await page.keyboard.down('d');
  await new Promise(r => setTimeout(r, 1000));
  const duringD = await pct();
  await page.keyboard.up('d');
  await new Promise(r => setTimeout(r, 600));
  const afterD = await pct();
  console.log('   按住D:', duringD, '→ 松开后:', afterD);

  // 3. A 键回移
  await page.keyboard.down('a');
  await new Promise(r => setTimeout(r, 800));
  await page.keyboard.up('a');
  console.log('3. 按A后:', await pct());

  // 4. 走到第一个调查点（vending x=380），按空格
  await page.keyboard.down('d');
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.up('d');
  await page.keyboard.press(' ');
  await new Promise(r => setTimeout(r, 400));
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('.walk-dialog');
    return { hidden: d.hidden, title: d.querySelector('.walk-dialog-title')?.textContent,
             text: d.querySelector('.walk-dialog-text')?.textContent?.slice(0, 30),
             btn: d.querySelector('button')?.textContent };
  });
  console.log('4. 交互弹窗:', JSON.stringify(dlg));
  await page.screenshot({ path: 'D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/outputs/walk_dialog.png' });

  // 5. 弹窗打开时人物应停止移动（按 D 无效）
  await page.keyboard.down('d');
  await new Promise(r => setTimeout(r, 700));
  await page.keyboard.up('d');
  console.log('5. 弹窗期间按D后:', await pct());

  // 6. 空格关闭弹窗
  await page.keyboard.press(' ');
  await new Promise(r => setTimeout(r, 200));
  console.log('6. 空格关闭弹窗 hidden =', await page.evaluate(() => document.querySelector('.walk-dialog').hidden));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
