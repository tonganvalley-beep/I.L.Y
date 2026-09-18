// 最终章「搜索演出 / ILY 回信短信」新款手机 UI 冒烟检查：
// 1) fin_s05：手机浏览器。首页搜索框（地址栏 sou.example.com）→ 点「搜索」→
//    结果页给出多个网站（每条都能点开）→ 点开链接看到该站正文、地址栏随之前进 → 返回键/返回按钮回到结果页；
//    现文案（ILY 是 I LOVE YOU 的首字母缩写……）已收进最后一条链接的正文里。
// 2) fin_mail：出现新款手机短信弹窗（ILY 气泡 + 合上手机），点击后剧情推进
// 运行：node tests/final-phone-moment-check.cjs
const { chromium } = require(process.env.ILY_PLAYWRIGHT || 'playwright-core');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.ILY_TEST_PORT || 8097);
const outputDir = process.env.ILY_TEST_OUTPUT || 'outputs';
require('node:fs').mkdirSync(outputDir, { recursive: true });
const SEARCH_URL = `http://127.0.0.1:${PORT}/game/index.html?entry=chapters&player=scene-preview&scene=fin_s05`;
const MAIL_URL = `http://127.0.0.1:${PORT}/game/index.html?entry=chapters&player=scene-preview&scene=fin_mail`;

(async () => {
  const server = spawn(process.execPath, ['tools/serve.mjs', '--port', String(PORT), '--no-open'], { stdio: 'ignore' });
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
  const homeUrl = await pageS.locator('.moment-browser-url').innerText();
  const backAtHome = await pageS.locator('.moment-browser-back').isDisabled();
  const footerHiddenAtHome = await pageS.locator('.moment-phone-footer').isHidden();
  await pageS.screenshot({ path: outputDir + '/final-phone-search-home.png' });
  await pageS.click('.moment-search-bar button');
  await pageS.waitForSelector('.moment-search-results:not([hidden])', { timeout: 5000 });
  const resultUrl = await pageS.locator('.moment-browser-url').innerText();
  const entries = await pageS.locator('.moment-result').count();
  const resultTitles = await pageS.locator('.moment-result-title').allInnerTexts();
  const lastSnippet = await pageS.locator('.moment-result-snippet').last().innerText();
  const footerShown = await pageS.locator('.moment-phone-footer').isVisible();
  const continueBtn = await pageS.locator('.moment-phone-footer button', { hasText: '继续' }).count();
  const resultsOk = hasPhone > 0 && homeUrl === 'sou.example.com' && backAtHome && footerHiddenAtHome
    && resultUrl.includes('/search?q=ily') && entries === 5 && footerShown && continueBtn > 0
    && lastSnippet.includes('ILY 是 I LOVE YOU 的首字母缩写');
  await pageS.screenshot({ path: outputDir + '/final-phone-search-results.png' });
  console.log('搜索·结果页：手机外壳', hasPhone > 0 ? '✓' : '✗',
    '｜地址栏首页/结果页', homeUrl === 'sou.example.com' && resultUrl.includes('q=ily') ? '✓' : '✗',
    '｜网站条数', entries, entries === 5 ? '✓' : '✗',
    '｜条目：' + resultTitles.join(' / '),
    '｜现文案在链接里', lastSnippet.includes('ILY 是 I LOVE YOU 的首字母缩写') ? '✓' : '✗',
    '｜继续按钮', footerShown && continueBtn > 0 ? '✓' : '✗');
  ok = ok && resultsOk;

  // 2) 点开第一条链接 → 网站正文 → 返回 → 点开最后一条（现文案）
  await pageS.click('.moment-result >> nth=0');
  await pageS.waitForSelector('.moment-page.is-site:not([hidden])', { timeout: 5000 });
  const siteTitle = await pageS.locator('.moment-site-title').innerText();
  const siteUrl = await pageS.locator('.moment-browser-url').innerText();
  const siteText = await pageS.locator('.moment-site-article').innerText();
  const backUsable = !(await pageS.locator('.moment-browser-back').isDisabled());
  const resultsHidden = await pageS.locator('.moment-search-results').isHidden();
  await pageS.screenshot({ path: outputDir + '/final-phone-search-site.png' });
  const siteOk = siteTitle.includes('缩写') && siteUrl === 'www.zdic.example/ily'
    && siteText.includes('I LOVE YOU') && backUsable && resultsHidden;
  console.log('搜索·网站页：标题', siteTitle, '｜地址栏随链接前进', siteUrl === 'www.zdic.example/ily' ? '✓' : '✗',
    '｜正文可见', siteText.includes('I LOVE YOU') ? '✓' : '✗', '｜返回键可用', backUsable ? '✓' : '✗');
  ok = ok && siteOk;

  await pageS.click('.moment-site-back');
  await pageS.waitForSelector('.moment-search-results:not([hidden])', { timeout: 5000 });
  const backUrl = await pageS.locator('.moment-browser-url').innerText();
  await pageS.click('.moment-result >> nth=4');
  await pageS.waitForSelector('.moment-page.is-site:not([hidden])', { timeout: 5000 });
  const copyText = await pageS.locator('.moment-site-article').innerText();
  await pageS.screenshot({ path: outputDir + '/final-phone-search-copy.png' });
  const backOk = backUrl.includes('/search?q=ily') && copyText.includes('也用来传达道别时的爱意。') && copyText.includes('我爱你。');
  console.log('搜索·返回结果页', backUrl.includes('/search?q=ily') ? '✓' : '✗',
    '｜现文案整段可读', copyText.includes('也用来传达道别时的爱意。') ? '✓' : '✗');
  ok = ok && backOk;

  // 4) 兜底：不点搜索，6 秒后自动展开结果
  const pageAuto = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  pageAuto.on('pageerror', e => errors.push('auto:' + e.message));
  await pageAuto.goto(SEARCH_URL);
  await pageAuto.waitForSelector('.moment-search-results:not([hidden])', { timeout: 12000 });
  const autoEntries = await pageAuto.locator('.moment-result').count();
  const autoOk = autoEntries === 5;
  console.log('搜索·6 秒自动展开', autoOk ? '✓' : '✗');
  ok = ok && autoOk;
  await pageAuto.close();

  // 点「继续」应推进到下一节点（弹窗消失）
  await pageS.click('.moment-phone-footer button');
  await pageS.waitForTimeout(1200);
  const searchGone = await pageS.locator('.moment-phone-scene').count() === 0;
  console.log('搜索·点继续后推进', searchGone ? '✓' : '✗');
  ok = ok && searchGone;

  // 3) 短信弹窗
  const pageM = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  pageM.on('pageerror', e => errors.push('mail:' + e.message));
  await pageM.goto(MAIL_URL);
  await pageM.waitForSelector('.moment-phone-scene .heroine-sms-bubble', { timeout: 20000 });
  const bubbleText = await pageM.locator('.moment-phone-scene .heroine-sms-bubble').innerText();
  const closeBtn = await pageM.locator('.moment-phone-footer button', { hasText: '合上手机' }).count();
  const mailLooksOk = bubbleText.includes('想念着基生') && bubbleText.includes('Re：') && closeBtn > 0;
  await pageM.screenshot({ path: outputDir + '/final-phone-mail.png' });
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
