// ch2-return「海风中的身影」背影 NPC 冒烟检查（对照法）：
// A 正常加载 / B 拦截 npc-airi-adult-back.png —— 数画布上「深蓝发色」像素，A 应显著多于 B。
// 运行：node tests/ch2-figure-check.cjs
const { chromium } = require('C:/Users/qj/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const { spawn } = require('node:child_process');

const PORT = 8097;
const URL_BASE = `http://127.0.0.1:${PORT}/game/index.html?entry=chapters&player=scene-preview&scene=ch2_g5`;

async function countNavy(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.rpg-canvas');
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const d = ctx.getImageData(0, 0, w, h).data;
    let n = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a > 200 && r >= 20 && r <= 90 && g >= 20 && g <= 95 && b >= 40 && b <= 120 && b - r >= 18) {
        n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    return { n, bbox: n ? [minX, minY, maxX, maxY] : null };
  });
}

(async () => {
  const server = spawn(process.execPath, ['tools/serve.mjs', '--port', String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const errors = [];

  // A：正常
  const pageA = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  pageA.on('pageerror', e => errors.push('A:' + e.message));
  await pageA.goto(URL_BASE);
  await pageA.waitForSelector('.rpg-canvas', { timeout: 20000 });
  await pageA.waitForTimeout(2500);
  const a = await countNavy(pageA);
  await pageA.screenshot({ path: 'outputs/ch2-figure-npc.png' });

  // B：拦截背影素材
  const pageB = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  pageB.on('pageerror', e => errors.push('B:' + e.message));
  await pageB.route('**/npc-airi-adult-back.png', r => r.abort());
  await pageB.goto(URL_BASE);
  await pageB.waitForSelector('.rpg-canvas', { timeout: 20000 });
  await pageB.waitForTimeout(2500);
  const b = await countNavy(pageB);
  await pageB.screenshot({ path: 'outputs/ch2-figure-npc-blocked.png' });

  console.log('A(正常)  深蓝像素:', a.n, 'bbox:', a.bbox);
  console.log('B(拦截)  深蓝像素:', b.n);
  console.log('差值 A-B:', a.n - b.n, a.n - b.n > 400 ? '=> 背影 NPC 已绘制 ✓' : '=> 未检测到背影绘制 ✗');
  if (errors.length) console.log('页面报错:', errors.join('; '));
  await browser.close();
  server.kill();
  process.exit(a.n - b.n > 400 && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
