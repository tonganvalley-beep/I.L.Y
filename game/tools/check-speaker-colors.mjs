// 验证 .speaker 按角色配色：打开 scene-preview，读取 .speaker 的 computed color 并截图。
// 用法：node tools/check-speaker-colors.mjs ch1_005 ch1_006 ch3_322
// 截图输出到 .workbuddy/tmp/speaker-<id>.png
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('C:/Users/hrao/.workbuddy/binaries/node/workspace/');
const puppeteer = require('puppeteer-core');

const BROWSERS = [
  'D:/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Users/hrao/AppData/Local/Google/Chrome/Application/chrome.exe',
];
const EXE = BROWSERS.find(p => fs.existsSync(p));
if (!EXE) { console.error('chrome not found'); process.exit(1); }

const nodes = process.argv.slice(2);
if (!nodes.length) { console.error('usage: node check-speaker-colors.mjs <nodeId>...'); process.exit(1); }
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.workbuddy', 'tmp');
fs.mkdirSync(outDir, { recursive: true });
const port = process.env.ILY_PORT || 8899;

const browser = await puppeteer.launch({
  executablePath: EXE, headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
page.setDefaultNavigationTimeout(60000);
process.on('unhandledRejection', e => { console.error('unhandled:', e); process.exit(1); });

for (const id of nodes) {
  await page.goto(`http://127.0.0.1:${port}/game/index.html?entry=chapters&player=scene-preview&scene=${id}`,
    { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.error('nav warn:', e.message));
  await new Promise(r => setTimeout(r, 2500));
  const info = await page.evaluate(() => {
    const sp = document.querySelector('#stage .speaker');
    if (!sp) return { none: true };
    const cs = getComputedStyle(sp);
    return { text: sp.textContent, dataset: sp.dataset.speaker || '', color: cs.color, border: cs.borderLeftColor, hidden: sp.hidden };
  });
  console.log(id, JSON.stringify(info));
  await page.screenshot({ path: path.join(outDir, `speaker-${id}.png`) });
}
await browser.close().catch(() => {});
process.exit(0);
