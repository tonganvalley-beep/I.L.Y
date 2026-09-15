// 预注入 s07_walk 存档 → URL ?slot=1-1 直接进入隧道场景 → 三处截图
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

  // 注入 v2 存档记录（node = s07_walk），再带 slot 参数进入
  await page.evaluateOnNewDocument(() => {
    const record = {
      format: 'ily-save', version: 2, slot: '1-1', savedAt: new Date().toISOString(),
      meta: { chapter: '序章 · 蓝色来电', sceneName: '隧道', summary: '', preview: 'bg-tunnel', importedFrom: null },
      state: { version: 1, chapter: 'prologue', node: 's07_walk', clues: [], flags: { achievements: [] }, maps: {} }
    };
    localStorage.setItem('ily-save-v2:tunneltest:1-1', JSON.stringify(record));
  });

  await page.goto('http://localhost:8931/game/index.html?player=tunneltest&slot=1-1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 800));
  const mode = await page.evaluate(() => document.querySelector('#stage').dataset.mode || '');
  console.log('进入模式:', mode);
  if (mode !== 'walk') { console.log('未进入 walk，中止'); await browser.close(); return; }

  await page.screenshot({ path: 'D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/outputs/tunnel_1_entry.png' });

  await page.keyboard.down('ArrowRight');
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.up('ArrowRight');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/outputs/tunnel_2_mid.png' });

  await page.keyboard.down('ArrowRight');
  await new Promise(r => setTimeout(r, 4000));
  await page.keyboard.up('ArrowRight');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'D:/personal/大二/小学期/I.L.Y/I.L.Y-main/I.L.Y-main/outputs/tunnel_3_exit.png' });
  console.log('截图完成');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
