// 相册灯箱冒烟测试：相册 → 打开照片 → 点击放大 → 滚轮/拖动/键盘 → 关闭
// 运行：node tests/phone-lightbox-check.cjs（需 8096 端口开发服务器）
const { chromium } = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8096/tests/phone-lightbox.html');
  await page.waitForSelector('.phone-home .home-app');
  assert.equal(errors.length, 0, '页面加载报错: ' + errors.join('; '));

  // 0. 主页点击「相册」图标进入相册
  await page.locator('.home-app').nth(2).click();   // mail / contacts / album
  await page.waitForSelector('.phone-grid .phone-cell');

  // 1. 相册网格点击第一张照片 → 进入详情
  await page.locator('.phone-cell').first().click();
  await page.waitForSelector('.photo-full');
  assert.ok(await page.locator('.photo-full').isVisible(), '照片详情可见');

  // 2. 点击照片 → 灯箱打开
  await page.locator('.photo-full').click();
  await page.waitForSelector('.photo-lightbox .lb-img');
  const box = await page.locator('.lb-img').boundingBox();
  assert.ok(box && box.width > 300, '灯箱图片应当大幅显示，实际宽度 ' + (box && box.width));

  // 3. 单击图片 → 放大 2x（transform scale(2)）
  await page.locator('.lb-img').click();
  await page.waitForTimeout(250);
  let transform = await page.locator('.lb-img').evaluate(el => el.style.transform);
  assert.match(transform, /scale\(2\)/, '单击后应放大到 2x，实际 ' + transform);
  assert.equal(await page.locator('.photo-lightbox').evaluate(el => el.classList.contains('zoomed')), true, '应处于 zoomed 态');

  // 4. 放大后拖动平移（pointer 事件）
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy + 40, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(50);
  transform = await page.locator('.lb-img').evaluate(el => el.style.transform);
  assert.match(transform, /translate\(-?\d+(\.\d+)?px, -?\d+(\.\d+)?px\)/, '拖动后应有平移，实际 ' + transform);
  // 拖动结束的 click 不应把缩放还原回 1x
  assert.match(transform, /scale\(2\)/, '拖动后仍应保持 2x，实际 ' + transform);

  // 5. 滚轮缩放：先放大再连续缩小回 1x
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -300);   // 放大
  await page.waitForTimeout(100);
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(30); }
  await page.waitForTimeout(100);
  transform = await page.locator('.lb-img').evaluate(el => el.style.transform);
  assert.match(transform, /scale\(1\)/, '滚轮缩小后应回到 1x，实际 ' + transform);

  // 6. Esc 关闭灯箱，回到详情页
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.photo-lightbox').count(), 0, 'Esc 应关闭灯箱');
  assert.ok(await page.locator('.photo-full').isVisible(), '关闭后回到照片详情');

  // 7. 再点开灯箱，点空白处关闭
  await page.locator('.photo-full').click();
  await page.waitForSelector('.photo-lightbox');
  await page.mouse.click(30, 400);   // 灯箱空白区域
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.photo-lightbox').count(), 0, '点空白处应关闭灯箱');

  // 8. Z 键快捷打开灯箱 + M 键关闭
  await page.locator('#stage').focus();
  await page.keyboard.press('z');
  await page.waitForSelector('.photo-lightbox');
  await page.keyboard.press('m');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.photo-lightbox').count(), 0, 'M 应关闭灯箱');

  // 9. 返回按钮回到相册网格
  await page.getByRole('button', { name: /返回|Back/ }).click();
  await page.waitForSelector('.phone-grid');
  assert.ok(true, '返回相册正常');

  await page.screenshot({ path: 'tests/phone-lightbox-ok.png' });
  await browser.close();
  console.log('PASS: 相册灯箱全部 9 项检查通过');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
