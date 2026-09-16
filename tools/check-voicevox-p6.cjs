// Run after: node tools/serve.mjs --port 8099 --no-open
const { chromium } = require(process.env.ILY_PLAYWRIGHT || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const base = process.env.ILY_TEST_URL || 'http://127.0.0.1:8099';
(async () => {
  const { loadVoiceLines } = await import('./voicevox/story-source.mjs');
  const { lines } = await loadVoiceLines();
  const selected = lines.find(line => line.kind === 'dialogue') || lines[0];
  const entries = Object.fromEntries(lines.map(line => [line.lineId, {
    file: 'assets/audio/voices/published/12345678901234567890.wav',
    sourceFingerprint: line.sourceFingerprint, renderHash: 'fixture'
  }]));
  // Ten-second PCM fixture; no production assets or synthesis are used.
  const wav = Buffer.alloc(44 + 24000 * 2 * 10);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  const browser = await chromium.launch({ executablePath: process.env.ILY_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/data/voice/voice-manifest.js', route => route.fulfill({ contentType: 'application/javascript', body: `window.ILY_VOICE_MANIFEST=${JSON.stringify({ schemaVersion: 1, entries })}` }));
    await page.route('**/assets/audio/voices/published/*.wav?*', route => route.fulfill({ contentType: 'audio/wav', body: wav }));
    await page.route('**/src/main.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `
        for (const name of ['mountDialogue','mountHeroineMoment','mountRpg']) {
          const mount=ILY[name]; ILY[name]=context=>{window.voiceTest=context;return mount(context);};
        }
        ${await response.text()}` });
    });
    const open = async () => {
      await page.goto(`${base}/game/index.html?entry=chapters&player=scene-preview&scene=${selected.runtimeNodeId}`);
      await page.waitForFunction(() => window.voiceTest?.voice);
    };
    const playing = () => page.waitForFunction(() => voiceTest.voice.audio && !voiceTest.voice.audio.paused && voiceTest.voice.audio.currentTime > 0);
    const silent = async () => assert.equal(await page.evaluate(() => voiceTest.voice.audio === null), true);
    await open(); await playing();
    assert.equal(await page.evaluate(() => voiceTest.node.text.trim()), selected.displayText);
    // Real controller through next node, rollback, mode change and menu handlers.
    await page.evaluate(() => { window.oldAudio = voiceTest.voice.audio; voiceTest.go(voiceTest.node.next); });
    await playing();
    assert.equal(await page.evaluate(() => oldAudio.paused && !oldAudio.getAttribute('src')), true);
    await page.locator('#rollback').click(); await playing();
    assert.equal(await page.evaluate(() => voiceTest.node.id), selected.runtimeNodeId);
    await page.locator('#menu-toggle').click(); await silent();
    await page.locator('#voice-volume').fill('35');
    await page.locator('#voice-toggle').click();
    await page.locator('#menu-close').click();
    await page.evaluate(() => voiceTest.go(voiceTest.node.id)); await silent();
    await page.reload(); await page.waitForFunction(() => window.voiceTest?.voice); await silent();
    assert.equal(await page.evaluate(() => voiceTest.voice.volume), 0.35);
    await page.locator('#menu-toggle').click(); await page.locator('#voice-toggle').click(); await page.locator('#menu-close').click();
    await page.evaluate(() => voiceTest.go(voiceTest.node.id)); await playing();
    // Save/load uses the actual game UI; only this test browser's local storage is changed.
    await page.locator('#quick-save').evaluate(button => button.click());
    await page.evaluate(() => voiceTest.go(voiceTest.node.next)); await playing();
    await page.locator('#menu-toggle').click(); await page.locator('#load').click();
    await page.locator('#save-pages [data-page="quick"]').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.save-actions button').first().click(); await playing();
    assert.equal(await page.evaluate(() => voiceTest.node.id), selected.runtimeNodeId);
    await page.locator('#skip').click(); await silent();
    await page.locator('#skip-segment').click(); await silent();
    await page.evaluate(() => { voiceTest.setSkipping(false); voiceTest.go('ch1_g1'); });
    await page.waitForSelector('.rpg-canvas'); await silent();
    // Old published fingerprints must reject an edit, even with an unchanged stable ID.
    await page.evaluate(id => { voiceTest.story.nodes[id].text += '已改'; voiceTest.go(id); }, selected.runtimeNodeId);
    await page.waitForTimeout(100); await silent();
    await open(); await playing();
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await silent();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#menu-toggle').click();
    assert.equal(await page.locator('#voice-volume').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'outputs/voicevox-p6-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('P6 browser PASS: native WAV playback, Chinese subtitles, next/rollback/load/skip/modes/menu/pagehide, stale source, persistent settings, mobile layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
