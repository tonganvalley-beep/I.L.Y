// Normalize the generated chroma-key sheet into aligned, transparent 64px cells.
// Usage: node tools/prepare-airi-sprites.cjs source.png
const sharp=require(process.env.ILY_SHARP || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('node:path');
(async()=>{
  const {data,info}=await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let p=0;p<data.length;p+=4){
    if(data[p]>150&&data[p+2]>150&&data[p+1]<110)data[p+3]=0;
  }
  const cells=[];
  for(let i=0;i<8;i++){
    // The generated left pair repeats a pose; use the opposite right pose mirrored.
    const source=i===5?7:i;
    const left=Math.round(source%4*info.width/4),top=Math.round(Math.floor(source/4)*info.height/2);
    const width=Math.round((source%4+1)*info.width/4)-left,height=Math.round((Math.floor(source/4)+1)*info.height/2)-top;
    const extracted=await sharp(data,{raw:info}).extract({left,top,width,height}).png().toBuffer();
    let cell=sharp(extracted).trim({background:'#00000000',threshold:10});
    if(i===5)cell=cell.flop();
    const resized=await cell.resize({height:56,kernel:'nearest'}).png().toBuffer();
    const size=await sharp(resized).metadata();
    cells.push({input:resized,left:i%4*64+Math.round((64-size.width)/2),top:Math.floor(i/4)*64+4});
  }
  const output=path.resolve(__dirname,'../game/assets/images/maps/airi-rpg-sheet.png');
  await sharp({create:{width:256,height:128,channels:4,background:'#00000000'}}).composite(cells).png().toFile(output);
  console.log(output);
})().catch(error=>{console.error(error);process.exitCode=1;});
