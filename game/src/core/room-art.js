(() => {
'use strict';
// Hand-drawn 16 px tiles and sprites. No image filtering or generated background.
const P={ink:'#242333',dark:'#38364a',wood:'#85543d',woodShade:'#623e35',woodLight:'#ba8050',gold:'#e2b56f',floor:'#bc8959',floorLight:'#c99b68',seam:'#a16e48',cream:'#f2dfaa',paper:'#fff0c5',shade:'#c6b88d',green:'#738953',greenDark:'#455d43',greenLight:'#a1b36a',blue:'#5d7b85',blueDark:'#3d5265',metal:'#94a5a1',tile:'#b9b8a1',tileLight:'#d4cfb3',red:'#b85f48',skin:'#e9b68c',hair:'#674a40'};
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function painter(c){const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;return (x,y,w,h,color)=>{ctx.fillStyle=P[color]||color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};}
function panel(r,x,y,w,h,color='wood'){
  r(x,y,w,h,'ink');r(x+1,y+1,w-2,h-3,color);r(x+1,y+1,w-2,1,color==='wood'?'woodLight':'paper');r(x+1,y+h-3,w-2,2,color==='wood'?'woodShade':'shade');
}
function plant(r,x,y){
  r(x+3,y+9,8,6,'ink');r(x+4,y+10,6,4,'woodLight');r(x+5,y+14,4,1,'woodShade');
  r(x+6,y+2,2,10,'greenDark');r(x+2,y+4,10,5,'greenDark');r(x,y+3,5,3,'green');r(x+8,y+1,5,4,'green');r(x+4,y,4,5,'green');r(x+1,y+7,5,3,'green');r(x+8,y+6,6,3,'green');r(x+5,y+1,2,2,'greenLight');r(x+10,y+2,2,1,'greenLight');
}
function books(r,x,y,w){
  const colors=['red','cream','blue','green','gold'];
  for(let i=0;i<Math.floor(w/4);i++){const h=7+i%3;r(x+i*4,y+10-h,3,h,colors[i%5]);r(x+i*4,y+11-h,2,1,'paper');r(x+i*4,y+8,2,1,'woodShade');}
}
function fixture(r,o,t){
  const x=Math.round(o.x*t),y=Math.round(o.y*t),w=Math.round(o.w*t),h=Math.round(o.h*t);
  switch(o.kind){
    case 'rug':
      r(x,y,w,h,'woodShade');r(x+1,y+1,w-2,h-2,'shade');r(x+3,y+3,w-6,h-6,'cream');
      for(let n=4;n<w-4;n+=4){r(x+n,y+2,1,1,'wood');r(x+n,y+h-3,1,1,'wood');}break;
    case 'bed':
      panel(r,x,y,w,h);r(x+3,y+5,w-6,h-12,'shade');r(x+4,y+7,w-8,h-16,'cream');
      panel(r,x+6,y+8,w-12,19,'paper');r(x+8,y+10,w-16,2,'cream');
      r(x+3,y+34,w-6,h-44,'greenDark');r(x+5,y+34,w-10,h-47,'green');r(x+5,y+34,w-10,5,'greenLight');
      for(let n=14;n<w-5;n+=12)r(x+n,y+40,1,h-53,'greenDark');
      for(let n=47;n<h-12;n+=14)r(x+5,y+n,w-10,1,'greenDark');
      r(x+1,y+h-6,4,6,'woodShade');r(x+w-5,y+h-6,4,6,'woodShade');break;
    case 'desk':
      panel(r,x,y,w,h);r(x+4,y+h-13,w-8,11,'woodShade');r(x+19,y+h-13,w-38,11,'ink');
      for(let n=0;n<2;n++){r(x+w-18,y+h-13+n*6,14,1,'woodLight');r(x+w-12,y+h-11+n*6,3,1,'gold');}
      r(x+26,y+4,31,19,'ink');r(x+28,y+6,27,14,'blueDark');r(x+29,y+7,25,1,'blue');r(x+29,y+8,1,10,'blue');r(x+39,y+23,5,3,'ink');r(x+33,y+26,17,2,'dark');
      panel(r,x+24,y+30,34,9,'metal');for(let a=0;a<3;a++)for(let b=0;b<10;b++)r(x+26+b*3,y+32+a*2,2,1,'dark');
      panel(r,x+63,y+31,5,7,'dark');panel(r,x+6,y+21,11,16,'blueDark');r(x+8,y+23,7,1,'gold');books(r,x+w-14,y+8,11);break;
    case 'table':
      r(x+4,y+h-5,4,5,'woodShade');r(x+w-8,y+h-5,4,5,'woodShade');panel(r,x,y,w,h-4);r(x+3,y+4,w-6,1,'gold');
      r(x+4,y+Math.floor(h/2),w-8,1,'woodShade');plant(r,x+8,y+7);panel(r,x+w-13,y+15,7,9,'cream');r(x+w-6,y+17,2,4,'cream');r(x+w-12,y+16,5,2,'woodShade');break;
    case 'chair':
      r(x+2,y+4,3,h-4,'woodShade');r(x+w-5,y+4,3,h-4,'woodShade');panel(r,x+1,y+1,w-2,6);panel(r,x+3,y+8,w-6,Math.max(6,h-11),'shade');r(x+4,y+9,w-8,2,'cream');break;
    case 'shelf':
      panel(r,x,y,w,h);for(let n=3;n<h-10;n+=15){r(x+2,y+n,w-4,12,'woodShade');books(r,x+3,y+n,w-6);r(x+1,y+n+12,w-2,2,'woodLight');}break;
    case 'fridge':
      panel(r,x,y,w,h,'metal');r(x+2,y+4,w-4,Math.floor(h*.48),'tileLight');r(x+1,y+Math.floor(h*.55),w-2,2,'dark');r(x+4,y+8,2,10,'dark');r(x+4,y+h-14,2,8,'dark');r(x+15,y+17,8,9,'paper');r(x+17,y+16,2,2,'red');r(x+17,y+20,4,1,'shade');break;
    case 'washer':
      panel(r,x,y,w,h,'metal');r(x+2,y+3,w-4,5,'tileLight');r(x+w-7,y+4,3,2,'red');
      r(x+5,y+11,w-10,h-16,'dark');r(x+3,y+14,w-6,h-22,'dark');r(x+6,y+13,w-12,h-20,'blue');r(x+8,y+15,w-16,h-24,'blueDark');r(x+8,y+15,5,2,'metal');break;
    case 'kitchen':
      panel(r,x,y,w,h);r(x+2,y+3,w-4,Math.floor(h*.57),'shade');r(x+3,y+4,w-6,2,'paper');
      panel(r,x+5,y+10,25,21,'metal');r(x+8,y+13,19,13,'blueDark');r(x+10,y+15,15,9,'blue');r(x+19,y+6,3,10,'metal');r(x+16,y+6,6,2,'paper');
      panel(r,x+35,y+9,w-40,24,'dark');for(const k of [0,1]){const a=x+39+k*10;r(a,y+13,7,11,'metal');r(a-2,y+16,11,5,'metal');r(a+1,y+15,5,7,'ink');}
      for(let n=4;n<w-4;n+=19){panel(r,x+n,y+Math.floor(h*.65),16,Math.floor(h*.29));r(x+n+5,y+Math.floor(h*.65)+3,6,1,'gold');}
      r(x+12,y+h-17,10,14,'cream');r(x+14,y+h-16,1,11,'shade');r(x+19,y+h-16,1,11,'shade');break;
    case 'cabinet':panel(r,x,y,w,h);for(let n=3;n<w-3;n+=16){r(x+n,y+3,12,h-7,'woodShade');r(x+n+2,y+4,8,h-9,'woodLight');r(x+n+8,y+h-6,2,1,'gold');}break;
    case 'bath':
      r(x,y,w,h,'dark');r(x+2,y+1,w-4,h-2,'tile');
      for(let a=3;a<w-3;a+=8)for(let b=2;b<h-3;b+=8){r(x+a,y+b,7,7,'tileLight');r(x+a+6,y+b+6,1,1,'shade');}
      r(x+5,y+5,w-10,2,'metal');r(x+5,y+6,2,17,'metal');r(x+3,y+20,7,2,'dark');r(x+4,y+21,5,3,'metal');
      panel(r,x+10,y+31,22,15,'cream');r(x+25,y+34,3,2,'metal');
      r(x+11,y+46,20,18,'dark');r(x+13,y+46,16,19,'paper');r(x+16,y+49,10,11,'shade');r(x+18,y+50,6,8,'blue');r(x+16,y+65,10,6,'cream');
      panel(r,x+w-20,y+36,15,17,'cream');r(x+w-17,y+40,9,7,'blue');r(x+w-13,y+33,2,8,'metal');r(x+w-15,y+54,6,9,'cream');break;
    case 'door':
      panel(r,x,y,w,h);r(x+4,y+4,w-8,h-8,'woodShade');r(x+5,y+5,w-10,h-10,'wood');r(x+w-8,y+h-9,4,2,'gold');break;
    case 'tv':
      panel(r,x,y,w,h);r(x+3,y+3,w-6,h-11,'ink');r(x+4,y+5,w-8,h-15,'blueDark');r(x+5,y+5,w-10,1,'blue');r(x+Math.floor(w/2)-1,y+h-8,3,4,'dark');break;
    case 'plant':plant(r,x+Math.floor((w-14)/2),y+Math.floor((h-16)/2));break;
    case 'cushion':panel(r,x,y,w,h,'greenDark');r(x+3,y+3,w-6,h-7,'green');r(x+5,y+4,w-10,1,'greenLight');break;
    case 'picture':panel(r,x,y,w,h);r(x+2,y+2,w-4,h-5,'cream');r(x+3,y+3,w-6,h-7,'blue');r(x+3,y+h-8,w-6,3,'green');r(x+5,y+h-11,5,3,'green');r(x+w-8,y+4,2,2,'gold');break;
    case 'lamp':r(x+6,y+5,3,h-5,'woodShade');r(x+3,y+h-2,9,2,'ink');r(x+3,y+2,10,6,'gold');r(x+5,y,6,2,'cream');r(x+2,y+8,12,2,'cream');break;
    case 'shoes':for(const a of [2,9]){r(x+a,y+3,5,10,'ink');r(x+a+1,y+4,3,4,'woodShade');r(x+a+1,y+11,3,1,'metal');}break;
  }
}
function createRoom(map){
  const t=map.art.nativeTileSize||16,c=surface(map.width*t,map.height*t),r=painter(c);
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
    const px=x*t,py=y*t;
    if(map.tiles[y][x]==='#'){
      r(px,py,t,t,'woodShade');r(px,py,t,2,'gold');r(px,py+2,t,7,'woodLight');r(px,py+9,t,1,'ink');r(px,py+10,t,4,'wood');r(px+t-1,py+10,1,4,'woodShade');r(px,py+14,t,2,'ink');
    }else{
      r(px,py,t,t,'floor');for(let j=0;j<2;j++){
        r(px,py+j*8,t,1,'seam');r(px,py+j*8+1,t,1,'floorLight');r(px+((x+y+j)%2?5:13),py+j*8,1,8,'seam');
        if((x+y+j)%3===0)r(px+3,py+j*8+5,5,1,'floorLight');
      }
    }
  }
  for(const o of map.decor||[])fixture(r,o,t);
  return c;
}
function createTrash(){
  const c=surface(48,32),r=painter(c);c.getContext('2d').translate(8,5);
  r(3,8,11,9,'ink');r(2,10,14,5,'gold');r(4,9,9,7,'woodLight');r(5,10,8,4,'gold');r(7,11,4,2,'cream');
  r(7,2,9,6,'ink');r(5,3,12,4,'ink');r(7,2,7,5,'paper');r(6,4,9,3,'cream');r(10,5,5,2,'shade');
  r(17,5,9,11,'ink');r(15,7,13,7,'ink');r(17,6,7,8,'red');r(19,7,2,6,'cream');r(24,9,3,5,'metal');r(25,10,1,3,'dark');
  r(21,16,8,5,'ink');r(19,17,12,3,'ink');r(21,16,7,4,'cream');r(24,18,5,2,'shade');r(13,18,4,2,'paper');r(7,19,2,1,'woodShade');return c;
}
// Integer screen pixels keep tile seams and sprite edges stable during scrolling.
function cameraView(width,height,map,position){
  const t=map.tileSize||48,n=map.art.nativeTileSize||16,view=map.art.view||{columns:14,rows:9};
  const pixels=Math.max(2,Math.ceil(Math.max(width/(view.columns*n),height/(view.rows*n))));
  const scale=pixels*n/t,vw=width/scale,vh=height/scale;
  const x=Math.max(0,Math.min(map.width*t-vw,(position.x+.5)*t-vw/2));
  const y=Math.max(0,Math.min(map.height*t-vh,(position.y+.5)*t-vh/2));
  return {scale,x:Math.round(x*scale)/scale,y:Math.round(y*scale)/scale};
}
ILY.classicRoom={createRoom,createTrash,cameraView};
})();
