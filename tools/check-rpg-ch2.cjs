const puppeteer = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('node:path');
const EXE = 'C:/Users/qj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-first-run', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('ily-root-entry', '1'); } catch {} });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERR:' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE:' + m.text()); });
    page.on('requestfailed', r => errors.push('REQFAIL:' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
    await page.goto('http://127.0.0.1:8080/game/index.html?chapter=1', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => window.ILY && ILY.data && ILY.data.maps && ILY.data.maps['ch2-island'], { timeout: 20000 });
      console.log('maps ready');
    } catch (e) {
      const diag = await page.evaluate(() => ({
        hasILY: typeof window.ILY,
        hasData: !!(window.ILY && window.ILY.data),
        mapKeys: window.ILY && window.ILY.data && window.ILY.data.maps ? Object.keys(window.ILY.data.maps) : 'n/a'
      }));
      console.log('DIAG', JSON.stringify(diag));
      console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
      throw e;
    }
    for (const [mapId, storyKey] of [['ch2-island', 'chapter2'], ['ch3-coast', 'chapter3']]) {
      await page.evaluate((mapId, storyKey) => {
        window.rpgCleanup && window.rpgCleanup();
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
        const stage = document.querySelector('#stage'); stage.replaceChildren(); stage.dataset.mode = 'rpg';
        const node = Object.values(ILY.data.stories[storyKey].nodes).find(n => n.map === mapId);
        const state = ILY.createState();
        window.rpgState = state;
        window.rpgCleanup = ILY.mountRpg({ stage, node, state, assets: new ILY.Assets(ILY.data.assets), go: () => {} });
      }, mapId, storyKey);
      await new Promise(r => setTimeout(r, 500));
      const info = await page.evaluate(() => {
        const id = Object.keys(rpgState.maps)[0];
        return { map: id, pos: rpgState.maps[id], eventCount: ILY.data.maps[id].events.length };
      });
      await page.screenshot({ path: path.resolve('tools', `${mapId}-verify.png`) });
      console.log(mapId, 'pos=', JSON.stringify(info.pos), 'events=', info.eventCount);
    }
    const fixed = await page.evaluate(async () => {
      const t = await (await fetch('src/modes/rpg.js')).text();
      return t.includes('ctx.save();\n      ctx.setTransform(dpr') && t.includes('ctx.restore();\n    }');
    });
    console.log('served rpg.js has transform-restore fix:', fixed);
    console.log('pageerrors:', JSON.stringify(errors.slice(0, 10)));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
