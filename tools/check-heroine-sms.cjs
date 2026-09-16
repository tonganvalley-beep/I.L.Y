// Run with the local server running: node tools/check-heroine-sms.cjs [base URL]
const { chromium } = require(process.env.ILY_PLAYWRIGHT || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const base = process.argv[2] || 'http://127.0.0.1:8094';
const output = path.resolve(__dirname, '../outputs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/game/index.html?entry=chapters&player=scene-preview&scene=her_scene_02_02');
    await page.locator('.heroine-sms-scene').waitFor();

    const inspect = () => page.evaluate(() => {
      const screen = document.querySelector('.heroine-sms-screen');
      const thread = document.querySelector('.heroine-sms-thread');
      const device = document.querySelector('.heroine-sms-device');
      const bounds = element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      };
      const screenBounds = bounds(screen);
      const parts = [...document.querySelectorAll('.heroine-sms-header, .heroine-sms-bubble, .heroine-sms-composer')].map(bounds);
      return {
        sender: document.querySelector('.heroine-sms-contact h1')?.textContent,
        messages: [...document.querySelectorAll('.heroine-sms-copy')].map(element => element.textContent),
        cardVisible: !!document.querySelector('.heroine-card h1'),
        threadOverflow: thread.scrollHeight > thread.clientHeight + 1,
        device: bounds(device),
        screen: screenBounds,
        partsInside: parts.every(box => box.left >= screenBounds.left && box.right <= screenBounds.right && box.top >= screenBounds.top && box.bottom <= screenBounds.bottom)
      };
    });

    let state = await inspect();
    assert.equal(state.sender, '笹野拓马');
    assert.equal(state.messages.length, 6);
    assert.equal(state.messages.at(-1), 'http://ily/kcta/ll/cfme/fytx/co/');
    assert.equal(state.cardVisible, false);
    assert.equal(state.threadOverflow, false);
    assert.equal(state.partsInside, true);
    await page.screenshot({ path: path.join(output, 'heroine-sms-desktop.png') });

    await page.locator('#menu-toggle').click();
    await page.locator('#lang').click();
    await page.locator('#menu-close').click();
    state = await inspect();
    assert.equal(state.sender, 'Takuma Sasano');
    assert.equal(state.messages[0], 'Sorry for contacting you out of the blue, Koharu.');
    assert.equal(state.threadOverflow, false);
    assert.equal(state.partsInside, true);
    await page.screenshot({ path: path.join(output, 'heroine-sms-english.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#menu-toggle').click();
    await page.locator('#lang').click();
    await page.locator('#menu-close').click();
    state = await inspect();
    assert.equal(state.sender, '笹野拓马');
    assert.equal(state.threadOverflow, false);
    assert.equal(state.partsInside, true);
    assert.ok(state.device.left >= 0 && state.device.top >= 0 && state.device.right <= 390 && state.device.bottom <= 844);
    await page.screenshot({ path: path.join(output, 'heroine-sms-mobile.png') });

    await page.locator('.heroine-sms-scene').click();
    await page.locator('.heroine-card h1').waitFor();
    assert.equal(await page.locator('.heroine-card h1').textContent(), '咖啡店（继续）');

    // The second conversation has separate content and a visibly distinct handset.
    await page.goto(base + '/game/index.html?entry=chapters&player=scene-preview&scene=her_scene_03_05');
    await page.locator('.heroine-sms-toya').waitFor();
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const language of ['chinese', 'english']) {
        await page.evaluate(language => ILY.setLang(language), language);
        state = await inspect();
        assert.equal(state.sender, language === 'chinese' ? '成田前辈' : 'Narita-senpai');
        assert.deepEqual(state.messages, language === 'chinese'
          ? ['这么想看的话', '就给你看看吧。', 'http://ily/kcta/ll/cfme/fytx...']
          : ['If you want to see it that badly', "I'll show you.", 'http://ily/kcta/ll/cfme/fytx...']);
        assert.equal(state.cardVisible, false);
        assert.equal(state.threadOverflow, false);
        assert.equal(state.partsInside, true);
        assert.ok(state.device.left >= 0 && state.device.top >= 0 && state.device.right <= viewport.width && state.device.bottom <= viewport.height);
        const appearance = await page.evaluate(() => ({
          radius: getComputedStyle(document.querySelector('.heroine-sms-device')).borderRadius,
          camera: getComputedStyle(document.querySelector('.heroine-sms-device'), '::before').width,
          bubble: getComputedStyle(document.querySelector('.heroine-sms-bubble')).backgroundColor,
          accessibleName: document.querySelector('.heroine-sms-scene').getAttribute('aria-label')
        }));
        assert.equal(appearance.radius, '15px');
        assert.equal(appearance.camera, '9px');
        assert.equal(appearance.bubble, 'rgb(248, 250, 243)');
        assert.match(appearance.accessibleName, language === 'chinese' ? /十屋.*成田前辈/ : /Narita-senpai.*Toya/);
        await page.screenshot({ path: path.join(output, `heroine-sms-toya-${viewport.width > 600 ? 'desktop' : 'mobile'}-${language}.png`) });
      }
    }
    await page.locator('#menu-toggle').click();
    await page.locator('dialog[open]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.heroine-sms-toya').count(), 1);
    await page.locator('#menu-close').click();
    await page.locator('#stage').focus();
    await page.keyboard.press('Space');
    await page.locator('.heroine-card h1').waitFor();
    assert.equal(await page.locator('.heroine-card h1').textContent(), '水族馆·通道（点击之后）');
    await page.locator('#rollback').click();
    await page.locator('.heroine-sms-toya').waitFor();
    for (const id of ['her_0130', 'her_0131', 'her_0132']) {
      await page.goto(base + '/game/index.html?entry=chapters&player=scene-preview&scene=' + id);
      await page.locator('.heroine-sms-toya').waitFor();
      assert.equal((await inspect()).messages.length, 3);
      await page.locator('.heroine-sms-scene').click();
      await page.locator('.heroine-card h1').waitFor();
      assert.equal(await page.locator('.heroine-card h1').textContent(), '水族馆·通道（点击之后）');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: both SMS scenes, Toya handset variant, Chinese/English desktop/mobile fit, menu input, rollback, legacy line entries, correct scene exits; no browser errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
