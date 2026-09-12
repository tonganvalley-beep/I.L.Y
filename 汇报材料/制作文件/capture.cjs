const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const out=path.resolve('汇报材料/游戏截图');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8097/game/index.html';
 async function scene(id){await page.goto(base+'?player=scene-preview&scene='+id);await page.waitForFunction(()=>document.querySelector('#stage').children.length>0);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);}
 async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});console.log(name);}
 for(const [name,id] of (process.argv.includes('--rest')?[]:[['01-dialogue','ch1_reunion'],['02-choice','ch1_choice'],['03-room','ch1_g1'],['04-store','ch1_g4'],['05-aquarium','ch1_g5'],['06-hand','ch2_hand'],['07-island','ch2_g1'],['08-flowers','ch2_g2'],['09-decision','ch2_choice3'],['10-adult','ch3_002'],['11-phones','ch3_choice4'],['12-night','ch3_g4'],['13-boss-intro','fin_s03'],['14-letter','fin_mail'],['15-ending','ending_true']])){await scene(id);await shot(name);}
 if(!process.argv.includes('--rest')){ await scene('fin_s05');await page.getByRole('button',{name:'搜索',exact:true}).click();await shot('16-search');
 await scene('s01_phone');console.log('PHONE',await page.locator('#stage').innerText());await shot('17-phone');
 await scene('ch1_battle');console.log('BATTLE',await page.locator('#stage').innerText());await page.getByRole('button',{name:'开始关卡',exact:true}).click();await page.waitForTimeout(6000);await shot('18-tutorial'); }
 await scene('ch1_g1');await page.evaluate(()=>{const story=ILY.prepareChapter1(),state=ILY.createState('ch1_g1');state.flags.route='B';ILY.enterChapterNode(state,story.nodes.ch1_g1);state.maps['ch1-room']={x:11,y:10};new ILY.SaveManager({storage:localStorage,username:'ppt-capture',story,maps:ILY.data.maps,validateSave:ILY.validateSave}).save('1',1,state);});
 await page.goto(base+'?player=ppt-capture&slot=1-1');await page.waitForSelector('.rpg-canvas');await page.waitForTimeout(800);await shot('19-investigate-before');await page.keyboard.press('e');await page.waitForTimeout(180);await shot('20-investigate-after');
 await page.keyboard.press('Escape');console.log('MENU',await page.locator('#game-menu').innerText());await shot('21-menu');
 await page.locator('#quick-save').click();await page.locator('#menu-close').click();await page.locator('#menu-toggle').click();
 console.log('SAVE BUTTONS',await page.locator('#game-menu button').allTextContents());
 await page.getByRole('button',{name:'读取存档',exact:true}).click();await shot('22-saves');
 fs.writeFileSync(path.resolve('汇报材料/制作文件/browser-errors.json'),JSON.stringify(errors,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

