/* 自适应验证：登录页 / 开始界面 / 主界面在多窗口尺寸下的表现 */
const puppeteer = require('puppeteer-core');

const EXE = 'C:\\Users\\qj\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = 'http://127.0.0.1:8937/sign%26log';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // 登录态，绕过 game.html 鉴权守卫
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('mygame-token', 'tester');
    localStorage.setItem('mygame-lang', 'chinese');
  });

  const viewports = [
    { w: 1920, h: 1080, name: 'desktop' },
    { w: 1366, h: 768, name: 'laptop' },
    { w: 800, h: 600, name: 'small-win' },
    { w: 420, h: 800, name: 'narrow' },
    { w: 1280, h: 460, name: 'short' },
  ];

  for (const v of viewports) {
    await page.setViewport({ width: v.w, height: v.h });

    // ---- 登录页 ----
    await page.goto(BASE + '/login.html', { waitUntil: 'networkidle0' });
    const login = await page.evaluate(() => {
      const p = document.querySelector('.panel').getBoundingClientRect();
      return {
        panelRight: Math.round(p.right), panelBottom: Math.round(p.bottom),
        panelLeft: Math.round(p.left), panelTop: Math.round(p.top),
        hScroll: document.documentElement.scrollWidth > window.innerWidth,
        vw: window.innerWidth, vh: window.innerHeight
      };
    });
    const loginOK = login.panelRight <= login.vw + 1 && !login.hScroll;
    console.log(`login  ${v.name} ${v.w}x${v.h}: panel=[${login.panelLeft},${login.panelTop} ~ ${login.panelRight},${login.panelBottom}] hScroll=${login.hScroll} ${loginOK ? 'OK' : 'FAIL'}`);

    // ---- 开始界面 ----
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    const start = await page.evaluate(() => {
      const hint = document.querySelector('.continue-hint').getBoundingClientRect();
      return { hintBottom: Math.round(hint.bottom), vh: window.innerHeight };
    });
    console.log(`start  ${v.name} ${v.w}x${v.h}: hint bottom=${start.hintBottom}/${start.vh} ${start.hintBottom <= start.vh ? 'OK' : 'FAIL'}`);

    // ---- 主界面 ----
    await page.goto(BASE + '/game.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const main = await page.evaluate(() => {
      const m = document.getElementById('phoneMenu').getBoundingClientRect();
      const t = document.getElementById('phoneTime').getBoundingClientRect();
      return {
        mLeft: Math.round(m.left), mRight: Math.round(m.right),
        mTop: Math.round(m.top), mBottom: Math.round(m.bottom),
        tLeft: Math.round(t.left), tRight: Math.round(t.right),
        vw: window.innerWidth, vh: window.innerHeight
      };
    });
    const menuVisible = main.mLeft >= 0 && main.mRight <= main.vw && main.mTop >= 0 && main.mBottom <= main.vh;
    console.log(`main   ${v.name} ${v.w}x${v.h}: menu=[${main.mLeft}~${main.mRight}]x[${main.mTop}~${main.mBottom}] time=[${main.tLeft}~${main.tRight}] ${menuVisible ? 'OK' : 'FAIL(menu off-screen)'}`);
  }

  console.log('JS errors:', errors.length ? errors : 'none');
  await browser.close();
})();
