// 冒烟：游戏内菜单「回忆」→ 成就 / 剧情 / 画廊（翻转卡片），含中英切换
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = 'http://localhost:8931/game/index.html?player=memtest';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-first-run', '--no-default-browser-check']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_BASE, { waitUntil: 'load' });
  await wait(600);

  // 0. 打开游戏菜单
  await page.evaluate(() => document.querySelector('#menu-toggle').click());
  await wait(200);
  console.log('0. 菜单按钮:', await page.$eval('#memories', n => n.textContent.trim()),
              '| 菜单已开:', await page.$eval('#game-menu', n => n.open));

  // 1. 回忆弹窗（成就）
  await page.evaluate(() => document.querySelector('#memories').click());
  await wait(300);
  const mem = await page.evaluate(() => {
    const d = document.querySelector('#memDialog');
    return {
      open: d.open,
      title: d.querySelector('h2').textContent,
      tabs: [...d.querySelectorAll('.mem-tabs button')].map(b => b.textContent),
      achCount: d.querySelectorAll('.ach-list li').length,
      unlocked: d.querySelectorAll('.ach-list li:not(.locked)').length,
      sub: d.querySelector('.hint').textContent.slice(0, 20)
    };
  });
  console.log('1. 回忆弹窗:', JSON.stringify(mem, null, 0));

  // 2. 剧情弹窗
  await page.evaluate(() => document.querySelector('#memDialog .mem-tabs button[data-tab="story"]').click());
  await wait(500);
  const story = await page.evaluate(() => {
    const d = document.querySelector('#storyDialog');
    return {
      open: d.open,
      title: d.querySelector('h2').textContent,
      chapters: [...d.querySelectorAll('.story-chapter')].map(n => n.textContent),
      entries: d.querySelectorAll('.story-entry').length,
      first: d.querySelector('.story-entry .say')?.textContent?.slice(0, 24)
    };
  });
  console.log('2. 剧情弹窗:', JSON.stringify(story, null, 0));
  await page.evaluate(() => document.querySelector('#storyDialog .dialog-actions button').click());
  await wait(200);

  // 3. 画廊弹窗（翻转卡片）
  await page.evaluate(() => document.querySelector('#memDialog .mem-tabs button[data-tab="gallery"]').click());
  await wait(500);
  const gal = await page.evaluate(() => {
    const d = document.querySelector('#galDialog');
    return {
      open: d.open,
      title: d.querySelector('h2').textContent,
      cards: d.querySelectorAll('.flip-card').length,
      tags: [...d.querySelectorAll('.flip-tag')].map(n => n.textContent),
      imgsOk: [...d.querySelectorAll('.flip-front img')].filter(i => i.complete && i.naturalWidth > 0).length
    };
  });
  console.log('3. 画廊弹窗:', JSON.stringify(gal, null, 0));

  // 4. 翻转
  await page.evaluate(() => document.querySelector('#galDialog .flip-card').click());
  await wait(150);
  console.log('4. 翻转:', await page.$eval('#galDialog .flip-card', n => n.classList.contains('flipped')));

  // 5. 切英文
  await page.evaluate(() => document.querySelector('#lang').click());
  await wait(400);
  const en = await page.evaluate(() => ({
    menuBtn: document.querySelector('#memories').textContent.trim(),
    memTitle: document.querySelector('#memDialog h2').textContent,
    tabs: [...document.querySelectorAll('#memDialog .mem-tabs button')].map(b => b.textContent),
    galTitle: document.querySelector('#galDialog h2').textContent,
    storyTitle: document.querySelector('#storyDialog h2').textContent
  }));
  console.log('5. 英文:', JSON.stringify(en, null, 0));

  await page.screenshot({ path: 'outputs/memories-gallery.png' });

  // 6. 成就解锁：造一个带 achievements 的存档，重载后应显示已解锁
  await page.evaluate(() => {
    const story = ILY.prepareChapter1();
    const saves = new ILY.SaveManager({
      storage: localStorage, username: 'memtest', story,
      maps: ILY.data.maps, validateSave: ILY.validateSave
    });
    const state = ILY.createState(story.start);
    state.flags.achievements = ['tunnel-end', 'delete-key'];
    saves.save('1', 1, state);
  });
  await page.reload({ waitUntil: 'load' });
  await wait(700);
  await page.evaluate(() => { ILY.setLang('chinese'); document.querySelector('#menu-toggle').click(); });
  await wait(200);
  await page.evaluate(() => document.querySelector('#memories').click());
  await wait(300);
  const unlocked = await page.evaluate(() => [...document.querySelectorAll('#memDialog .ach-list li')]
    .filter(li => !li.classList.contains('locked'))
    .map(li => li.querySelector('span').textContent));
  console.log('6. 已解锁成就:', JSON.stringify(unlocked));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
