// With the local server running: node tools/check-heroine-rewind.cjs [base URL]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:8096';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    const open = async id => {
      await page.goto(base + '/game/index.html?entry=chapters&player=scene-preview&scene=' + id);
      await page.locator('#stage .scene').waitFor();
    };
    const shot = name => page.screenshot({ path: path.resolve(__dirname, '../outputs/heroine-store-' + name + '.png') });
    await open('her_0036');
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.clock.runFor(1000);
    const first = await page.locator('.portrait[data-position=left]').boundingBox();
    assert.equal(await page.locator('.portrait').count(), 2);
    assert.equal(await page.locator('#stage').evaluate(el => getComputedStyle(el).filter), 'none');
    await shot('first');
    await page.keyboard.press('Space');
    await page.clock.runFor(1);
    assert.equal(await page.locator('.heroine-rewind').getAttribute('data-frame'), 'her_0036');
    assert.equal(await page.locator('#stage').evaluate(el => getComputedStyle(el).filter), 'grayscale(1)');
    await shot('rewind');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.heroine-rewind').getAttribute('data-frame'), 'her_0036');
    for (const [delay, id] of [[320, 'her_0035'], [180, 'her_0034'], [180, 'her_0033'], [180, 'her_0032'], [180, 'her_0031'], [180, 'her_0030']]) {
      await page.clock.runFor(delay);
      assert.equal(await page.locator('.heroine-rewind').getAttribute('data-frame'), id);
    }
    await page.clock.runFor(180);
    assert.equal(await page.locator('.heroine-rewind').count(), 0);
    await page.keyboard.press('Space');
    await page.clock.runFor(1000);
    assert.equal(await page.locator('.dialogue-text').textContent(), '爱理 想吃哪个？');
    assert.equal(await page.locator('.portrait').count(), 1);
    assert.deepEqual(await page.locator('.portrait[data-position=left]').boundingBox(), first);
    assert.equal(await page.locator('#stage').evaluate(el => getComputedStyle(el).filter), 'grayscale(1)');
    await shot('passerby');
    await page.setViewportSize({ width: 390, height: 844 });
    await shot('mobile');
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true);
    await open('her_0045');
    await page.clock.runFor(1500);
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#stage').evaluate(el => getComputedStyle(el).filter), 'none');
    assert.deepEqual(errors, []);
    console.log('Verified reverse frame order, input guard, grayscale continuity, matching camera, mobile layout, and restored color.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
