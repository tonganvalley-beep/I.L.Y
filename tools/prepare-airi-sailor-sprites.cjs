// Extract the user's sailor-uniform reference poses without changing their design.
// Usage: node tools/prepare-airi-sailor-sprites.cjs idle-reference.jpg walk-reference.jpg
const sharp=require(process.env.ILY_SHARP || 'C:/Users/tonganvalley/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('node:path');

async function extract(filename,column,columns){
  const meta=await sharp(filename).metadata();
  const left=Math.round(column*meta.width/columns),right=Math.round((column+1)*meta.width/columns);
  const {data,info}=await sharp(filename).extract({left,top:0,width:right-left,height:meta.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=info,seen=new Uint8Array(width*height),queue=[];
  // Flood only the exterior white background; preserve the white blouse and socks.
  function visit(x,y){
    if(x<0||x>=width||y<0||y>=height)return;
    const i=y*width+x,p=i*4;
    if(seen[i]||Math.min(data[p],data[p+1],data[p+2])<220)return;
    seen[i]=1;queue.push(i);data[p+3]=0;
  }
  for(let x=0;x<width;x++){visit(x,0);visit(x,height-1);}
  for(let y=0;y<height;y++){visit(0,y);visit(width-1,y);}
  for(let n=0;n<queue.length;n++){
    const x=queue[n]%width,y=Math.floor(queue[n]/width);
    visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);
  }
  // Find the silhouette and the head centre, keeping the latter fixed across gait frames.
  let x0=width,y0=height,x1=0,y1=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  }
  let head0=width,head1=0;
  for(let y=y0;y<y0+(y1-y0)*.27;y++)for(let x=x0;x<=x1;x++)if(data[(y*width+x)*4+3]){head0=Math.min(head0,x);head1=Math.max(head1,x);}
  const sprite=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({height:56,kernel:'nearest'}).png().toBuffer();
  const size=await sharp(sprite).metadata();
  return {sprite,width:size.width,anchor:((head0+head1)/2-x0)/(x1-x0+1)*size.width};
}

(async()=>{
  const idle=process.argv[2],walk=process.argv[3];
  if(!idle||!walk)throw new Error('Pass the idle and walking reference image paths.');
  const front=await extract(idle,0,3),back=await extract(idle,1,3),left=await extract(idle,2,3);
  const walkA=await extract(walk,0,2),walkB=await extract(walk,1,2);
  const poses=[[front,false],[back,false],[left,false],[left,true],[walkA,true],[walkB,true],[walkA,false],[walkB,false]],cells=[];
  for(let i=0;i<poses.length;i++){
    const [pose,mirror]=poses[i];
    const input=mirror?await sharp(pose.sprite).flop().png().toBuffer():pose.sprite;
    const anchor=mirror?pose.width-pose.anchor:pose.anchor;
    cells.push({input,left:i%4*64+Math.round(32-anchor),top:Math.floor(i/4)*64+4});
  }
  const output=path.resolve(__dirname,'../game/assets/images/maps/airi-sailor-rpg-sheet.png');
  await sharp({create:{width:256,height:128,channels:4,background:'#00000000'}}).composite(cells).png().toFile(output);
  console.log(output);
})().catch(error=>{console.error(error);process.exitCode=1;});
