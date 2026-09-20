// 交互点标记冒烟测试：直接进入 rpg 场景，截图 + 检查无脚本报错。
// 运行：node tests/rpg-marker-check.cjs（需 8097 端口开发服务器）
const { chromium } = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const assert = require('node:assert/strict');

const SCENES = [
  { id: 'ch1_g1', file: 'outputs/rpg-marker-ch1.png' },
  { id: 'ch3_g2', file: 'outputs/rpg-marker-ch3.png' }
];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // ch1-room：靠近 "地板"（x=11,y=10），验证锚定气泡出现
  await page.goto(`http://127.0.0.1:8097/game/index.html?entry=chapters&player=scene-preview&scene=${SCENES[0].id}`);
  await page.waitForSelector('.rpg-canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SCENES[0].file });
  console.log('shot', SCENES[0].file);

  await page.focus('.rpg-canvas');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1300);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'outputs/rpg-marker-near.png' });
  console.log('shot outputs/rpg-marker-near.png');

  // ch3-work：带 NPC 的场景
  await page.goto(`http://127.0.0.1:8097/game/index.html?entry=chapters&player=scene-preview&scene=${SCENES[1].id}`);
  await page.waitForSelector('.rpg-canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SCENES[1].file });
  console.log('shot', SCENES[1].file);

  // 靠近后应出现锚定气泡
  const prompt = await page.evaluate(() => {
    const b = document.querySelector('.rpg-interact');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { hidden: b.hidden, text: b.textContent, left: r.left, top: r.top, width: r.width, color: getComputedStyle(b).borderTopColor };
  });
  console.log('prompt:', JSON.stringify(prompt));
  assert.equal(errors.length, 0, '页面报错: ' + errors.join('; '));
  await browser.close();
})();
