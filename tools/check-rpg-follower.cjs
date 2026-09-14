const {chromium}=require(process.env.ILY_PLAYWRIGHT || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8098/game/index.html?chapter=1');
  await page.waitForFunction(()=>ILY.data.maps['ch2-island']);
  for(const mapId of ['ch2-island','ch2-flowers']){
   await page.evaluate(mapId=>{
    window.rpgCleanup?.();document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    const stage=document.querySelector('#stage');stage.replaceChildren();stage.dataset.mode='rpg';
    const node=Object.values(ILY.data.stories.chapter2.nodes).find(n=>n.follower&&n.map===mapId);
    const state=ILY.createState();window.rpgState=state;
    window.rpgCleanup=ILY.mountRpg({stage,node,state,assets:new ILY.Assets(ILY.data.assets),go:()=>{}});
   },mapId);
   await page.waitForFunction(()=>[...performance.getEntriesByType('resource')].some(e=>e.name.endsWith('airi-rpg-sheet.png')));
   await page.keyboard.down('a');await page.waitForTimeout(450);await page.keyboard.up('a');
   await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');
   const stopped=await page.evaluate(()=>JSON.stringify(rpgState.maps));
   await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>JSON.stringify(rpgState.maps)),stopped);
   await page.screenshot({path:path.resolve('tools',`${mapId}-follower-check.png`)});
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  await page.screenshot({path:path.resolve('tools/rpg-follower-mobile-check.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('Both companion maps render and accept movement; idle position stable; mobile fits; no browser exceptions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
