const sharp=require('sharp'),fs=require('fs');
(async()=>{
 const files=fs.readdirSync('汇报材料/游戏截图').filter(x=>x.endsWith('.png')).map(x=>'汇报材料/游戏截图/'+x);
 files.push(...['act1','healing','act5','finale','victory'].map(x=>'danmu-boss/danmu-boss/previews/'+x+'.png'));
 let imgs=[];
 for(let i=0;i<files.length;i++){
 imgs.push({input:await sharp(files[i]).resize(320,180,{fit:'contain'}).toBuffer(),left:i%4*320,top:Math.floor(i/4)*208});
 imgs.push({input:Buffer.from(`<svg width="320" height="28"><rect width="320" height="28" fill="white"/><text x="8" y="20" font-size="15">${files[i].split('/').pop()}</text></svg>`),left:i%4*320,top:Math.floor(i/4)*208+180});
 }
 await sharp({create:{width:1280,height:Math.ceil(files.length/4)*208,channels:3,background:'white'}}).composite(imgs).png().toFile('汇报材料/制作文件/contact.png');
})();
