// Run with the local server running: node tools/check-ch3-battery.cjs [base URL]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:8093';
const output = path.resolve(__dirname, '../outputs');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    await page.goto(base + '/game/index.html?entry=chapters&player=scene-preview&scene=ch3_157');
    await page.locator('.dialogue').waitFor({ timeout: 10000 }).catch(async error => {
      console.error(await page.locator('body').innerText(), errors);
      throw error;
    });
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    // One press completes the line, the next advances, just like normal play.
    if (await page.locator('.dialogue-text').textContent() !== '再见了，基生君。') await page.keyboard.press('Space');
    const loads = Promise.all(['full', 'medium', 'low'].map(level =>
      page.waitForResponse(r => r.url().endsWith('ch3-battery-' + level + '.png'))));
    await page.keyboard.press('Space');
    await loads;
    await page.locator('.battery-montage').waitFor();
    const state = () => page.evaluate(() => {
      const image = document.querySelector('.battery-montage-image');
      return {
        mode: document.querySelector('#stage').dataset.mode,
        images: document.querySelectorAll('.battery-montage img').length,
        hidden: image?.hidden, src: image?.getAttribute('src'),
        background: getComputedStyle(document.querySelector('#stage')).backgroundColor,
        dialogue: !!document.querySelector('.dialogue, .heroine-moment')
      };
    });
    const advance = () => page.locator('.battery-montage').click();
    const staysPut = async () => {
      const before = await state();
      await page.clock.runFor(10000);
      assert.deepEqual(await state(), before, 'Every black screen and image waits for input');
    };
    let current = await state();
    assert.equal(current.hidden, true);
    assert.equal(current.background, 'rgb(0, 0, 0)');
    assert.equal(current.dialogue, false);
    await page.mouse.move(0, 899);
    await page.screenshot({ path: path.join(output, 'ch3-battery-black.png') });
    await staysPut();
    await advance();
    current = await state();
    assert.equal(current.images, 1);
    assert.equal(current.hidden, false);
    assert.match(current.src, /battery-full\.png$/);
    await staysPut();
    await page.screenshot({ path: path.join(output, 'ch3-battery-full.png') });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(5000);
    await advance();
    assert.match((await state()).src, /battery-full\.png$/);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Menu keyboard input must not advance the card underneath it.
    await page.locator('#menu-toggle').click();
    await page.locator('dialog[open]').focus();
    await page.keyboard.press('Enter');
    await page.clock.runFor(8000);
    assert.match((await state()).src, /battery-full\.png$/);
    await page.locator('#menu-close').click();
    await page.mouse.move(0, 899);
    await advance();
    assert.equal((await state()).hidden, true);
    await staysPut();
    await advance();
    current = await state();
    assert.equal(current.images, 1);
    assert.equal(current.hidden, false);
    assert.match(current.src, /battery-medium\.png$/);
    await staysPut();
    await page.screenshot({ path: path.join(output, 'ch3-battery-medium.png') });
    await page.keyboard.press('Space');
    assert.equal((await state()).hidden, true);
    await staysPut();
    await page.keyboard.press('Enter');
    current = await state();
    assert.equal(current.images, 1);
    assert.equal(current.hidden, false);
    assert.match(current.src, /battery-low\.png$/);
    await staysPut();
    await page.screenshot({ path: path.join(output, 'ch3-battery-low.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await page.locator('.battery-montage-image').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 390 && bounds.y + bounds.height <= 844);
    await page.screenshot({ path: path.join(output, 'ch3-battery-mobile.png') });
    await advance();
    assert.equal((await state()).hidden, true);
    await staysPut();
    await advance();
    assert.equal((await state()).mode, 'dialogue');
    await page.clock.runFor(500);
    assert.equal(await page.locator('.dialogue-text').textContent(), '你好，我是成田。');
    assert.deepEqual(errors, []);
    console.log('PASS: click through goodbye → black → full → black → medium → black → low → black → next dialogue; no timed advance, menu/hidden input blocked, keyboard support, single image, mobile fit, no browser errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
