// Run after: node tools/serve.mjs --port 8098 --no-open
const {chromium}=require(process.env.ILY_PLAYWRIGHT || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.ILY_TEST_URL || 'http://127.0.0.1:8098';

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.ILY_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // Expose the real mounted context only in this test; main.js and its handlers still run normally.
    await page.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:`const originalRpgMount=ILY.mountRpg;
        ILY.mountRpg=context=>{window.rpgTest=context;return originalRpgMount(context);};
        ${await response.text()}`});
    });
    const open=async scene=>{
      await page.goto(`${base}/game/index.html?entry=chapters&player=scene-preview&scene=${scene}`);
      await page.waitForSelector('.rpg-canvas');
      assert.equal(await page.locator('.rpg-rollback').isVisible(),true);
      assert.equal(await page.locator('.rpg-rollback').isDisabled(),true);
    };
    const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify(rpgTest.state)));
    const saves=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('ily-save-v2:')).sort().map(key=>[key,localStorage.getItem(key)])));
    const at=async id=>{
      const expected=await page.evaluate(id=>{
        const {state,node}=rpgTest,p=state.flags.rpg[node.task];
        const e=ILY.activeRpgEvents(ILY.data.maps[p.map],node.task).find(e=>e.id===id);
        Object.assign(state.maps[p.map],{x:e.x,y:e.y});
        return {map:p.map,position:{...state.maps[p.map]}};
      },id);
      await page.locator('.rpg-canvas').focus();
      return expected;
    };
    const interact=async id=>{const expected=await at(id);await page.keyboard.press('e');return expected;};

    await open('ch1_g1');
    const beforeFloor=await interact('floor');
    assert.deepEqual((await snapshot()).flags.rpg.G1.collected,['floor']);
    const beforeDesk=await interact('desk');
    assert.deepEqual((await snapshot()).flags.rpg.G1.collected,['floor','desk']);
    await page.locator('.rpg-rollback').click();
    let state=await snapshot();
    assert.deepEqual(state.flags.rpg.G1.collected,['floor']);
    assert.equal(state.flags.CLEAN_NUM,1);
    assert.deepEqual(state.maps[beforeDesk.map],beforeDesk.position);
    assert.equal(await page.evaluate(()=>document.activeElement.className),'rpg-canvas');
    await page.keyboard.press('PageUp');
    state=await snapshot();
    assert.deepEqual(state.flags.rpg.G1.collected,[]);
    assert.deepEqual(state.maps[beforeFloor.map],beforeFloor.position);
    assert.equal(await page.locator('.rpg-rollback').isDisabled(),true);

    await interact('shelf');
    await page.locator('.rpg-canvas').hover();
    await page.mouse.wheel(0,-120);
    await page.waitForFunction(()=>rpgTest.state.flags.rpg.G1.collected.length===0);
    await interact('floor');
    await page.keyboard.press('Escape');
    await page.keyboard.press('PageUp');
    assert.deepEqual((await snapshot()).flags.rpg.G1.collected,['floor'],'modal blocks rollback');
    await page.getByRole('button',{name:'自动完成当前探索',exact:true}).click();
    assert.equal((await snapshot()).flags.rpg.G1.done,true);
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.mode!=='rpg');
    const savedBefore=await saves();
    await page.locator('#rollback').click();
    state=await snapshot();
    assert.equal(state.node,'ch1_g1');
    assert.equal(state.flags.rpg.G1.done,false);
    assert.deepEqual(state.flags.rpg.G1.collected,['floor']);
    assert.equal(state.flags.G1_DONE,undefined);
    assert.deepEqual(await saves(),savedBefore,'rollback does not autosave');
    await page.waitForTimeout(2800);
    assert.equal(await page.locator('#stage').getAttribute('data-mode'),'rpg','old completion loop disposed');
    assert.equal(await page.locator('.rpg-menu-info').count(),1);
    await page.keyboard.press('PageUp');
    assert.deepEqual((await snapshot()).flags.rpg.G1.collected,[],'no duplicate checkpoint after returning from dialogue');

    // Touch completion must stay undone while standing in the restored trigger area.
    await open('ch1_g2');
    await at('bath');
    await page.waitForFunction(()=>rpgTest.state.flags.rpg.G2.done);
    await page.locator('.rpg-rollback').click();
    await page.waitForTimeout(300);
    assert.equal((await snapshot()).flags.rpg.G2.done,false);
    assert.equal((await snapshot()).flags.G2_TRIGGER,undefined);
    await page.keyboard.press('e');
    assert.equal((await snapshot()).flags.rpg.G2.done,true,'explicit investigation can retry');

    await open('ch1_g5');
    const beforeTransfer=await at('east');
    await page.waitForFunction(()=>rpgTest.state.flags.rpg.G5.map==='ch1-gallery');
    await page.locator('.rpg-rollback').click();
    await page.waitForTimeout(300);
    state=await snapshot();
    assert.equal(state.flags.rpg.G5.map,'ch1-entry');
    assert.deepEqual(state.flags.rpg.G5.visited,['ch1-entry']);
    assert.equal(state.flags.G5_STAGE,'ch1-entry');
    assert.deepEqual(state.maps[beforeTransfer.map],beforeTransfer.position);
    assert.equal(state.maps['ch1-gallery'],undefined);
    await page.keyboard.press('e');
    assert.equal((await snapshot()).flags.rpg.G5.map,'ch1-gallery');
    await interact('photo');
    await page.keyboard.press('PageUp');
    state=await snapshot();
    assert.deepEqual(state.flags.rpg.G5.collected,[]);
    assert.equal(state.flags.G5_CLUE,undefined);

    await open('ch2_g4');
    await interact('ice');
    await page.keyboard.press('PageUp');
    assert.equal(await page.locator('.rpg-inspect').isVisible(),true);
    await page.getByRole('button',{name:'香草',exact:true}).click();
    assert.equal((await snapshot()).flags.CH2_ICE,'香草');
    await page.locator('.rpg-rollback').click();
    state=await snapshot();
    assert.equal(state.flags.CH2_ICE,undefined);
    assert.equal(state.flags.rpg.CH2_G4.done,false);
    assert.deepEqual(state.flags.rpg.CH2_G4.collected,[]);
    await interact('ice');
    await page.getByRole('button',{name:'草莓',exact:true}).click();
    assert.equal((await snapshot()).flags.CH2_ICE,'草莓');
    await page.locator('.rpg-rollback').click();

    // Real touch input and layout at narrow mobile width.
    await page.setViewportSize({width:390,height:844});
    await interact('ice');
    await page.getByRole('button',{name:'香草',exact:true}).click();
    const box=await page.locator('.rpg-rollback').boundingBox();
    assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=390 && box.y+box.height<=844);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('.rpg-rollback').tap();
    assert.equal((await snapshot()).flags.CH2_ICE,undefined);
    await page.screenshot({path:path.resolve('outputs/rpg-rollback-mobile.png')});
    assert.deepEqual(errors,[]);
    console.log('Passed: RPG button, PageUp, wheel, collection, coordinates, map transfers, touch re-entry, choices, modal blocking, completion rollback, cleanup, no autosave, mobile layout; no browser exceptions.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
