// Visual and interaction regression check for the apartment art replacement.
const {chromium}=require(process.env.ILY_PLAYWRIGHT);
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1672,height:941}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:8090/game/index.html';
  await page.goto(base+'?chapter=1');await page.waitForSelector('.dialogue');
  async function load(node,position){
    await page.evaluate(({node,position})=>{
      const story=ILY.prepareChapter1(),state=ILY.createState(node);
      ILY.enterChapterNode(state,story.nodes[node]);
      if(position)state.maps['ch1-room']=position;
      new ILY.SaveManager({storage:localStorage,username:'pixel-qa',story,maps:ILY.data.maps,validateSave:ILY.validateSave}).save('1',1,state);
    },{node,position});
    await page.goto(base+'?player=pixel-qa&slot=1-1');await page.waitForSelector('.rpg-canvas');
    await page.waitForFunction(()=>ILY.data.maps['ch1-room'].art.renderer==='classic-room'&&!!ILY.classicRoom);
    await page.waitForTimeout(500);
  }
  await load('ch1_g1',{x:11,y:10});
  const overview=await page.evaluate(()=>{
    const room=ILY.classicRoom.createRoom(ILY.data.maps['ch1-room']),c=document.createElement('canvas');c.width=room.width*3;c.height=room.height*3;
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(room,0,0,c.width,c.height);return c.toDataURL().split(',')[1];
  });
  await fs.writeFile('tools/chapter1/classic-room-overview.png',Buffer.from(overview,'base64'));
  await page.screenshot({path:'tools/chapter1/pixel-room-desktop.png'});
  // Moving right in the open aisle should scroll the map while Kio stays centered.
  const transform=()=>page.locator('.rpg-canvas').evaluate(c=>{const t=c.getContext('2d').getTransform();return {a:t.a,e:t.e,f:t.f};});
  const before=await transform();await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  const after=await transform();assert.ok(after.e<before.e);assert.equal(after.a,before.a);
  assert.ok(before.a>1.8,'The close camera must enlarge the scene');
  for(const [x,y] of [[11,10],[14,6],[5,6]]){
    await load('ch1_g1',{x,y});await page.locator('.rpg-canvas').focus();await page.keyboard.press('e');
    await page.keyboard.press('Escape');await page.locator('#quick-save').click();
    const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('ily-save-v2:pixel-qa:quick-1')).state.flags.CLEAN_NUM);
    assert.equal(count,1);
  }
  await load('ch1_g3',{x:8,y:11});await page.keyboard.press('e');
  assert.match(await page.locator('.rpg-message').textContent(),/手柄/);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
  await page.screenshot({path:'tools/chapter1/pixel-room-mobile.png'});
  await page.setViewportSize({width:1672,height:941});
  await load('ch1_g2',{x:19,y:5.3});await page.waitForSelector('.dialogue',{timeout:6000});
  assert.deepEqual(errors,[]);
  await browser.close();console.log('Pixel room: desktop/mobile rendered, all three cleanup points, bed controller and bathroom trigger passed.');
})().catch(e=>{console.error(e);process.exit(1);});
