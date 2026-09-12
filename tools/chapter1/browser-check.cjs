const {chromium}=require(process.env.ILY_PLAYWRIGHT);
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8090/game/index.html';
 await page.goto(base+'?chapter=1');await page.waitForSelector('.dialogue');
 async function load(node,position){
  await page.evaluate(({node,position})=>{
   const story=ILY.prepareChapter1(),state=ILY.createState(node);state.flags.route='B';ILY.enterChapterNode(state,story.nodes[node]);
   if(position)state.maps[story.nodes[node].map]=position;
   new ILY.SaveManager({storage:localStorage,username:'qa',story,maps:ILY.data.maps,validateSave:ILY.validateSave}).save('1',1,state);
  },{node,position});
  await page.goto(base+'?player=qa&slot=1-1');await page.waitForFunction(()=>document.querySelector('#stage').children.length>0);
 }
 async function snapshot(){
  await page.locator('.rpg-canvas').focus();await page.keyboard.press('Escape');await page.locator('#quick-save').click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('ily-save-v2:qa:quick-1')).state);
  await page.locator('#menu-close').click();await page.locator('.rpg-canvas').focus();return state;
 }
 await load('finale');await page.getByRole('button',{name:'进入第一章',exact:true}).click();assert.match(await page.locator('#chapter').textContent(),/第一章/);
 await load('ch1_choice');await page.getByRole('button',{name:'只是一个噩梦。',exact:true}).click();assert.match(await page.locator('#stage').textContent(),/第三章/);
 await load('ch1_g1');await page.waitForSelector('.rpg-canvas');
 const rect=await page.locator('.rpg-canvas').boundingBox();assert.equal(rect.width,1280);assert.equal(rect.height,720);assert.equal(rect.x,0);assert.equal(rect.y,0);
 assert.equal(await page.locator('.game-header').isVisible(),false);assert.equal(await page.locator('.rpg-controls').count(),0);
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(310);await page.keyboard.up('ArrowLeft');
 const moved=(await snapshot()).maps['ch1-room'];assert.ok(moved.x<12.2&&moved.x>11.4);assert.ok(!Number.isInteger(moved.x));
 await page.goto(base+'?player=qa&slot=quick-1');await page.waitForSelector('.rpg-canvas');assert.equal((await snapshot()).maps['ch1-room'].x,moved.x);
 // Menu must pause movement; closing it must not leave a stuck key.
 await page.keyboard.down('ArrowRight');await page.keyboard.press('Escape');await page.keyboard.up('ArrowRight');await page.waitForTimeout(180);await page.locator('#menu-close').click();
 const paused=(await snapshot()).maps['ch1-room'];await page.waitForTimeout(180);assert.deepEqual((await snapshot()).maps['ch1-room'],paused);
 await load('ch1_g1',{x:11,y:10});await page.keyboard.press('e');assert.equal((await snapshot()).flags.CLEAN_NUM,1);
 // Pointer movement is continuous, and releasing the pointer stops the player.
 await page.mouse.move(930,590);await page.mouse.down();await page.waitForTimeout(240);await page.mouse.up();const mouse=(await snapshot()).maps['ch1-room'];assert.ok(mouse.x>6);await page.waitForTimeout(130);assert.deepEqual((await snapshot()).maps['ch1-room'],mouse);
 await page.waitForTimeout(4100);await page.screenshot({path:path.join(__dirname,'rpg-desktop.png')});
 for(const task of ['g1','g2','g3','g4','g5']){
  await load('ch1_'+task);await page.keyboard.press('Escape');await page.getByRole('button',{name:'自动完成当前探索',exact:true}).click();await page.keyboard.press('Enter');await page.waitForSelector('.dialogue');
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('rpg-active')),false);
  assert.equal(await page.locator('.rpg-menu-info').count(),0);
 }
 await load('ch1_g2',{x:19,y:5.3});await page.waitForSelector('.dialogue',{timeout:6000});
 await load('ch1_g5',{x:15.7,y:6});await page.waitForTimeout(100);assert.equal((await snapshot()).flags.rpg.G5.map,'ch1-gallery');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);const mobile=await page.locator('.rpg-canvas').boundingBox();assert.equal(mobile.width,390);assert.equal(mobile.height,844);
 await page.screenshot({path:path.join(__dirname,'rpg-mobile.png')});
 await load('ch1_battle');await page.locator('.mode-panel > button').first().click();await page.getByRole('button',{name:'自动演出 · 结束练习',exact:true}).click();await page.waitForSelector('.dialogue');
 await page.goto('file:///'+path.resolve('game/index.html').replaceAll('\\','/')+'?chapter=1');await page.waitForSelector('.dialogue');
 assert.deepEqual(errors,[]);console.log('Browser checks passed: fullscreen, fractional movement/save, pointer stop, menu pause, investigation, G1–G5 handoff, door/transfer triggers, mobile, chapter/branch/battle, file preview.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
