// 截图：游戏菜单里的「回忆」按钮 / 回忆弹窗 / 剧情弹窗
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 760 });
  await page.goto('http://localhost:8931/game/index.html?player=shot', { waitUntil: 'load' });
  await wait(500);
  await page.evaluate(() => { localStorage.setItem('mygame-lang', 'chinese'); location.reload(); });
  await wait(900);
  await page.evaluate(() => document.querySelector('#menu-toggle').click());
  await wait(300);
  await page.screenshot({ path: 'outputs/memories-menu.png' });
  await page.evaluate(() => document.querySelector('#memories').click());
  await wait(300);
  await page.screenshot({ path: 'outputs/memories-dialog.png' });
  await page.evaluate(() => document.querySelector('#memDialog .mem-tabs button[data-tab="story"]').click());
  await wait(600);
  await page.screenshot({ path: 'outputs/memories-story.png' });
  await browser.close();
})();
