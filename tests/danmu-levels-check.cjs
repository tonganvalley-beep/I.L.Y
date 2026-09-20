// Run against npm start with NODE_PATH pointing to the installed Playwright package.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

const base = process.env.ILY_TEST_URL || 'http://127.0.0.1:8097';
const hasVisiblePixels = canvas => {
  const context = canvas.getContext('2d');
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] && (pixels[i - 3] || pixels[i - 2] || pixels[i - 1])) return true;
  return false;
};

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(`${base}/game/minigames/winxp/games/heart/index.html`);
    await page.locator('.danmu-panel[data-lesson=red]').waitFor();
    await page.getByRole('button', { name: '进入蓝心练习' }).click();
    await page.locator('.danmu-panel[data-lesson=blue]').waitFor();
    assert.match(await page.locator('.danmu-lesson').textContent(), /重力与跳跃/);
    await page.getByRole('button', { name: '开始蓝心练习' }).click();
    await page.locator('.danmu-overlay').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('canvas').evaluate(hasVisiblePixels), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'ily-blue-tutorial.png') });

    await page.goto(`${base}/game/index.html?entry=chapters&player=scene-preview&scene=fin_s03`);
    try {
      await page.locator('.boss-frame').waitFor({ timeout: 15000 });
    } catch (error) {
      console.error('Main-game URL:', page.url());
      console.error('Main-game stage:', await page.locator('#stage').textContent().catch(() => '<missing>'));
      console.error('Browser errors:', errors);
      throw error;
    }
    const boss = page.frameLocator('.boss-frame');
    try {
      await boss.locator('#start:not([disabled])').waitFor({ timeout: 90000 });
    } catch (error) {
      console.error('Boss load state:', await boss.locator('body').getAttribute('data-state'));
      console.error('Boss load status:', await boss.locator('#loadStatus').textContent());
      console.error('Browser errors:', errors);
      throw error;
    }
    const bossFrame = page.frames().find(frame => frame.url().includes('minigames/boss/final-release/index.html'));
    assert.ok(bossFrame, 'main story should mount the final-release Boss');
    const ready = await bossFrame.evaluate(() => ILYGame.inspect());
    assert.equal(ready.ready, true);
    assert.equal(ready.events, 640);
    await boss.locator('#start').click();
    await boss.locator('body[data-state=playing]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    assert.equal(await boss.locator('#cv').evaluate(hasVisiblePixels), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'ily-final-boss.png') });
    await boss.locator('.toolbar [data-story-skip]').click();
    await page.waitForFunction(() => !document.querySelector('.boss-frame'));
    assert.deepEqual(errors, []);
    console.log('Blue-heart tutorial and final-release Boss browser checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
