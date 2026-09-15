const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const p=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
p.on('dialog',d=>d.accept());const base='http://127.0.0.1:8097/game/index.html';
async function scene(id){await p.goto(base+'?player=scene-preview&scene='+id);await p.waitForFunction(()=>document.querySelector('#stage').children.length>0);await p.waitForTimeout(3500);}
async function shot(n){await p.screenshot({path:'汇报材料/游戏截图/'+n+'.png'});}
await scene('s01_phone');await p.keyboard.press('Enter');await p.waitForTimeout(300);await p.keyboard.press('Enter');await p.waitForTimeout(400);await shot('24-phone-mail');
const story=JSON.parse(fs.readFileSync('汇报材料/制作文件/剧情清单.json'));
let pair=Object.entries(story.nodes).find(([id,n])=>id.startsWith('ch1_')&&n.portrait==='ch1-airi-casual'&&n.text.length>12&&n.text.length<50&&!n.route);
console.log('portrait',pair?.[0]); if(pair){await scene(pair[0]);await shot('25-character');}
await scene('ch2_g2');await p.evaluate(()=>{const story=ILY.prepareChapter1(),state=ILY.createState('ch2_g2');ILY.enterChapterNode(state,story.nodes.ch2_g2);state.flags.route='B';const n=story.nodes.ch2_g2,ev=ILY.data.maps[n.map].events.find(e=>e.preview);state.maps[n.map]={x:ev.x,y:ev.y};new ILY.SaveManager({storage:localStorage,username:'ppt-flowers',story,maps:ILY.data.maps,validateSave:ILY.validateSave}).save('1',1,state);});
await p.goto(base+'?player=ppt-flowers&slot=1-1');await p.waitForSelector('.rpg-canvas');await p.waitForTimeout(400);await p.keyboard.press('e');await p.waitForSelector('.rpg-inspect[open]');await p.waitForFunction(()=>[...document.querySelectorAll('.rpg-inspect img')].every(i=>i.complete&&i.naturalWidth>0));await p.waitForTimeout(500);await shot('26-flower-memory');
await p.goto(base+'?player=ppt-save');await p.waitForSelector('.dialogue');await p.waitForTimeout(500);await p.locator('#menu-toggle').click();await p.getByRole('button',{name:'保存进度',exact:true}).click();console.log('SLOTS',await p.locator('#save-menu').innerText());await p.locator('.save-slot').first().getByRole('button').click();await p.waitForTimeout(300);await shot('27-save-filled');
fs.writeFileSync('汇报材料/制作文件/browser-errors.json',JSON.stringify(errors,null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

