// 第三章夜路地图 NPC 小人目检：把 ch3-work 的 rpg 节点挂起来截图。
// 前置：node tools/serve.mjs --port 8931
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
    page.on('response', r => { if (r.status() >= 400) errors.push('HTTP' + r.status() + ':' + r.url()); });
    await page.goto('http://127.0.0.1:8931/game/index.html?chapter=3', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ILY && ILY.data && ILY.data.maps && ILY.data.maps['ch3-work'], { timeout: 20000 });

    const assets = await page.evaluate(async () => {
      const src = await (await fetch('data/chapter-assets.js')).text();
      const inst = new ILY.Assets(ILY.data.assets);
      const probe = id => { const p = inst.image(id); return p || null; };
      const ok = {};
      for (const id of ['npc-coworker', 'npc-hibiya']) {
        ok[id] = await new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => res('MISSING'); i.src = probe(id); });
      }
      return { registrations: ['npc-coworker', 'npc-hibiya'].map(id => id + '=' + probe(id)).join(' , '), ok };
    });
    console.log('assets:', JSON.stringify(assets));

    for (const [tag, pos] of [['both', { x: 15, y: 12 }], ['near-coworker', { x: 10, y: 12 }], ['near-hibiya', { x: 21, y: 12 }]]) {
      await page.evaluate((pos) => {
        window.rpgCleanup && window.rpgCleanup();
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
        const stage = document.querySelector('#stage'); stage.replaceChildren(); stage.dataset.mode = 'rpg';
        const node = Object.values(ILY.data.stories.chapter3.nodes).find(n => n.map === 'ch3-work');
        const state = ILY.createState();
        state.maps['ch3-work'] = { ...pos };
        window.rpgCleanup = ILY.mountRpg({ stage, node, state, assets: new ILY.Assets(ILY.data.assets), go: () => {} });
      }, pos);
      await new Promise(r => setTimeout(r, 700));
      await page.screenshot({ path: path.resolve('outputs', `ch3-npc-${tag}.png`) });
      console.log('shot', tag);
    }
    console.log('errors:', JSON.stringify(errors.slice(0, 8)));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
