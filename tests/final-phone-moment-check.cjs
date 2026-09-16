// 最终章「搜索演出 / ILY 回信短信」新款手机 UI 冒烟检查：
// 1) fin_s05：出现新款手机搜索引擎界面，点「搜索」后结果在手机屏幕内展开
// 2) fin_mail：出现新款手机短信弹窗（ILY 气泡 + 合上手机），点击后剧情推进
// 运行：node tests/final-phone-moment-check.cjs
const { chromium } = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const { spawn } = require('node:child_process');

const PORT = 8097;
const SEARCH_URL = `http://127.0.0.1:${PORT}/game/index.html?entry=chapters&player=scene-preview&scene=fin_s05`;
const MAIL_URL = `http://127.0.0.1:${PORT}/game/index.html?entry=chapters&player=scene-preview&scene=fin_mail`;

(async () => {
  const server = spawn(process.execPath, ['tools/serve.mjs', '--port', String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const errors = [];
  let ok = true;

  // 1) 搜索弹窗
  const pageS = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  pageS.on('pageerror', e => errors.push('search:' + e.message));
  await pageS.goto(SEARCH_URL);
  await pageS.waitForSelector('.moment-phone-scene .moment-search-bar', { timeout: 20000 });
  const hasPhone = await pageS.locator('.moment-phone-scene .heroine-sms-device').count();
  await pageS.screenshot({ path: 'outputs/final-phone-search-idle.png' });
  await pageS.click('.moment-search-bar button');
  await pageS.waitForSelector('.moment-search-results:not([hidden])', { timeout: 5000 });
  const resultText = await pageS.locator('.moment-search-results').innerText();
  const searchOk = hasPhone > 0 && resultText.includes('I LOVE YOU') && await pageS.locator('.moment-search-results button', { hasText: '继续' }).count() > 0;
  await pageS.screenshot({ path: 'outputs/final-phone-search-results.png' });
  console.log('搜索弹窗：手机外壳', hasPhone > 0 ? '✓' : '✗', '｜结果展开', resultText.includes('I LOVE YOU') ? '✓' : '✗', '｜继续按钮', searchOk ? '✓' : '✗');
  ok = ok && searchOk;

  // 2) 短信弹窗
  const pageM = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  pageM.on('pageerror', e => errors.push('mail:' + e.message));
  await pageM.goto(MAIL_URL);
  await pageM.waitForSelector('.moment-phone-scene .heroine-sms-bubble', { timeout: 20000 });
  const bubbleText = await pageM.locator('.moment-phone-scene .heroine-sms-bubble').innerText();
  const closeBtn = await pageM.locator('.moment-phone-footer button', { hasText: '合上手机' }).count();
  const mailLooksOk = bubbleText.includes('想念着基生') && bubbleText.includes('Re：') && closeBtn > 0;
  await pageM.screenshot({ path: 'outputs/final-phone-mail.png' });
  // 点击「合上手机」后应推进到下一节点（弹窗消失）
  await pageM.click('.moment-phone-footer button');
  await pageM.waitForTimeout(1200);
  const gone = await pageM.locator('.moment-phone-scene').count() === 0;
  console.log('短信弹窗：气泡内容', bubbleText.includes('想念着基生') ? '✓' : '✗', '｜合上手机按钮', closeBtn > 0 ? '✓' : '✗', '｜点击后推进', gone ? '✓' : '✗');
  ok = ok && mailLooksOk && gone;

  console.log('页面报错:', errors.length ? errors.join('; ') : '无');
  await browser.close();
  server.kill();
  process.exit(ok && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
