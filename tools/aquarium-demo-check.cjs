const {chromium}=require(process.env.ILY_PLAYWRIGHT || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:960},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8096/game/aquarium-demo/');
 await page.locator('#flow').click();await page.waitForFunction(()=>!document.querySelector('#flow').disabled);
 assert.match(await page.locator('#status').textContent(),/漏水/);
 await page.locator('#reset').click();
 await page.locator('.cell').first().click();assert.equal(await page.locator('#moves').textContent(),'1');
 await page.locator('#undo').click();assert.equal(await page.locator('#moves').textContent(),'0');
 for(let i=0;i<4;i++){
   await page.locator('#levels button').nth(i).click();
   const turns=await page.evaluate(i=>{
     const P=AquariumPuzzle,L=P.createLevel(i);
     return L.path.flatMap(id=>{if(L.locked.includes(id))return [];let mask=L.initial[id],count=0;while(mask!==L.solution[id]){mask=P.rotate(mask);count++;}return Array(count).fill(id);});
   },i);
   for(const id of turns)await page.locator('.cell').nth(id).click();
   await page.locator('#flow').click();await page.locator('#result').waitFor({state:'visible'});
   assert.match(await page.locator('#status').textContent(),/通水成功/);
 }
 await page.locator('#next').click();assert.match(await page.locator('#title').textContent(),/初次/);
 await page.screenshot({path:path.join(os.tmpdir(),'ily-aquarium-desktop-check.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.cell').first().focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#moves').textContent(),'1');
 await page.screenshot({path:path.join(os.tmpdir(),'ily-aquarium-mobile-check.png'),fullPage:true});
 await page.goto('file:///E:/Github/I.L.Y/game/aquarium-demo/index.html');
 assert.equal(await page.locator('.cell').count(),16);
 assert.deepEqual(errors,[]);console.log('Passed: failed flow, rotation, undo, all four solved via clicks, next level, mobile width, keyboard, file preview; no page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
