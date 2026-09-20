(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory();
  else root.WireMechanics=factory();
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const BOX={x:180,y:120,w:600,h:300}, WIDTH=4;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  function axes(side,box=BOX){
    return {span:side==='top'||side==='bottom'?box.w:box.h,
      depth:side==='top'||side==='bottom'?box.h:box.w};
  }
  // u runs along the attached edge; d runs along its inward normal.
  function point(side,u,d,box=BOX){
    if(side==='bottom')return{x:box.x+u,y:box.y+box.h-d};
    if(side==='top')return{x:box.x+u,y:box.y+d};
    if(side==='left')return{x:box.x+d,y:box.y+u};
    return{x:box.x+box.w-d,y:box.y+u};
  }
  function normalize(options={}){
    const box=options.box||BOX;
    const side=['top','bottom','left','right'].includes(options.side)?options.side:'bottom';
    const {span,depth}=axes(side,box);
    const kind=['single','gap','emerge','move'].includes(options.kind)?options.kind:'single';
    const number=(name,value)=>Number.isFinite(Number(options[name]))?Number(options[name]):value;
    return {kind,side,box,t:number('t',0),speed:clamp(number('speed',180),20,600),
      direction:options.direction===-1?-1:1,height:clamp(number('height',kind==='gap'?depth:80),1,depth),
      tilt:clamp(number('tilt',0),-65,65),length:clamp(number('length',170),12,span),
      gap:clamp(number('gap',100),12,depth),center:clamp(number('center',.5),0,1),
      moving:!!options.moving,gapSpeed:clamp(number('gapSpeed',80),1,400),gapDir:options.gapDir===-1?-1:1,
      pre:clamp(number('pre',.65),.1,3),rise:clamp(number('rise',.25),.1,2),
      hold:options.stay?clamp(number('hold',.6),0,5):0,
      after:['move','forward'].includes(options.after)?options.after:'retract',
      rowGap:clamp(number('rowGap',110),12,span),rowCenter:clamp(number('rowCenter',.5),0,1)};
  }
  function gapCenter(a,age){
    const {depth}=axes(a.side,a.box),low=a.gap/2,high=depth-low;
    const start=clamp(a.center*depth,low,high),range=high-low;
    if(!a.moving || range<=0)return start;
    const distance=start-low+a.gapDir*a.gapSpeed*Math.max(0,age),period=range*2;
    const wrapped=((distance%period)+period)%period;
    return low+(wrapped<=range?wrapped:period-wrapped);
  }
  // Liang-Barsky clipping is used by both rendering and collision. Preserve
  // partial segments, even when BOTH original endpoints are outside the box.
  function clipLine(line,box=BOX){
    const dx=line.b.x-line.a.x,dy=line.b.y-line.a.y;
    const p=[-dx,dx,-dy,dy],q=[line.a.x-box.x,box.x+box.w-line.a.x,line.a.y-box.y,box.y+box.h-line.a.y];
    let enter=0,leave=1;
    for(let i=0;i<4;i++){
      if(Math.abs(p[i])<1e-10){if(q[i]<0)return null;continue;}
      const ratio=q[i]/p[i];
      if(p[i]<0)enter=Math.max(enter,ratio);else leave=Math.min(leave,ratio);
      if(enter>leave)return null;
    }
    return {a:{x:line.a.x+enter*dx,y:line.a.y+enter*dy},
      b:{x:line.a.x+leave*dx,y:line.a.y+leave*dy},width:line.width||WIDTH};
  }
  function bandRect(a,start,length,height,offset=0){
    const p=point(a.side,start,offset,a.box),q=point(a.side,start+length,offset+height,a.box);
    return{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),w:Math.abs(p.x-q.x),h:Math.abs(p.y-q.y)};
  }
  function emergeBands(a){
    const {span}=axes(a.side,a.box);
    if(a.after==='move')return[{start:a.direction===1?0:span-a.length,length:a.length}];
    if(a.after==='forward'){
      const center=clamp(a.rowCenter*span,a.rowGap/2,span-a.rowGap/2);
      return[{start:0,length:center-a.rowGap/2},
        {start:center+a.rowGap/2,length:span-center-a.rowGap/2}].filter(b=>b.length>1e-8);
    }
    return[{start:0,length:span}];
  }
  function sample(a,time){
    const age=time-a.t,{span,depth}=axes(a.side,a.box);
    const result={phase:'active',done:false,raw:[],lines:[],rect:null,warning:null,rects:[],warnings:[]};
    if(age<0){result.phase='pending';return result;}
    const add=(u0,d0,u1,d1)=>{
      if(Math.abs(d1-d0)<1e-8)return;
      result.raw.push({a:point(a.side,u0,d0,a.box),b:point(a.side,u1,d1,a.box),width:WIDTH});
    };
    // Lifetime follows the trailing extent, not the first endpoint to cross.
    const sweep=(lo,hi)=>{
      const start=a.direction===1?-hi-WIDTH:span-lo+WIDTH;
      const u=start+a.direction*a.speed*age;
      result.done=a.direction===1?u+lo>span+WIDTH:u+hi<-WIDTH;
      return u;
    };
    const row=(start,length,height,offset=0)=>{
      if(height<=1e-8||length<=1e-8)return;
      result.rects.push(bandRect(a,start,length,height,offset));
      const n=Math.max(1,Math.ceil(length/12));
      for(let i=0;i<=n;i++)add(start+length*i/n,offset,start+length*i/n,offset+height);
    };
    if(a.kind==='single'){
      const shift=a.height*Math.tan(a.tilt*Math.PI/180);
      const u=sweep(Math.min(0,shift),Math.max(0,shift));
      add(u,0,u+shift,a.height);
    }else if(a.kind==='gap'){
      // Two collinear segments rooted at opposite edges, never a curtain.
      const slope=Math.tan(a.tilt*Math.PI/180),shift=depth*slope;
      const u=sweep(Math.min(0,shift),Math.max(0,shift));
      const center=gapCenter(a,age),near=Math.min(a.height,center-a.gap/2),far=Math.max(depth-a.height,center+a.gap/2);
      if(near>0)add(u,0,u+slope*near,near);
      if(far<depth)add(u+slope*far,far,u+shift,depth);
      result.gapCenter=center;
    }else if(a.kind==='move'){
      const u=sweep(0,a.length);
      row(u,a.length,a.height);
    }else{
      // The same bands drive the warning, emergence and subsequent motion.
      // Never fill or collide with a bounding rectangle across the safe gap.
      const bands=emergeBands(a);
      const rows=(height,along=0,offset=0)=>bands.forEach(b=>row(b.start+along,b.length,height,offset));
      if(age<a.pre){
        result.phase='warning';result.warnings=bands.map(b=>bandRect(a,b.start,b.length,a.height));
        result.warning=result.warnings.length===1?result.warnings[0]:null;return result;
      }
      const active=age-a.pre;
      if(active<a.rise){result.phase='rise';rows(a.height*active/a.rise);}
      else if(active<a.rise+a.hold){result.phase='hold';rows(a.height);}
      else{
        const elapsed=active-a.rise-a.hold;
        if(a.after==='move'){
          result.phase='move';const u=a.direction*a.speed*elapsed;
          rows(a.height,u);
          result.done=bands.every(b=>a.direction===1?b.start+u>span+WIDTH:b.start+b.length+u<-WIDTH);
        }else if(a.after==='forward'){
          result.phase='forward';const offset=a.speed*elapsed;
          rows(a.height,0,offset);result.done=offset>depth+WIDTH;
        }else{
          result.phase='retract';rows(a.height*Math.max(0,1-elapsed/a.rise));result.done=elapsed>=a.rise;
        }
      }
    }
    result.rect=result.rects.length===1?result.rects[0]:null;
    result.lines=result.raw.map(l=>clipLine(l,a.box)).filter(Boolean);
    return result;
  }
  function distance(p,line){
    const dx=line.b.x-line.a.x,dy=line.b.y-line.a.y,len=dx*dx+dy*dy;
    const t=len?clamp(((p.x-line.a.x)*dx+(p.y-line.a.y)*dy)/len,0,1):0;
    return Math.hypot(p.x-line.a.x-t*dx,p.y-line.a.y-t*dy);
  }
  function collision(heart,state,box=BOX){
    if(state.phase==='warning'||state.done)return false;
    if(state.rects.length){
      return state.rects.some(r=>{
        const x=Math.max(box.x,r.x),y=Math.max(box.y,r.y),right=Math.min(box.x+box.w,r.x+r.w),bottom=Math.min(box.y+box.h,r.y+r.h);
        if(right<=x||bottom<=y)return false;
        return Math.hypot(heart.x-clamp(heart.x,x,right),heart.y-clamp(heart.y,y,bottom))<=heart.r;
      });
    }
    return state.lines.some(line=>distance(heart,line)<=heart.r+line.width/2);
  }
  function newSoul(box=BOX){return{x:box.x+box.w/2,y:box.y+box.h-8,r:5,mode:'red',vy:0,grounded:true,latch:false,held:0,jumpStart:0,pulse:0};}
  function switchSoul(s,mode){if(s.mode===mode)return;s.mode=mode;s.vy=0;s.grounded=false;s.latch=false;s.held=0;s.pulse=.34;}
  function stepSoul(s,input,dt,box=BOX){
    const floor=box.y+box.h-8,up=!!input.up,dir=Number(!!input.right)-Number(!!input.left),speed=input.slow?110:245;
    s.pulse=Math.max(0,s.pulse-dt);
    if(s.mode==='red'){
      const dy=Number(!!input.down)-Number(up),len=Math.hypot(dir,dy)||1;
      s.x+=dir/len*speed*dt;s.y+=dy/len*speed*dt;
    }else{
      s.x+=dir*speed*dt;
      if(up&&!s.latch&&s.grounded){s.vy=-400;s.grounded=false;s.held=0;s.jumpStart=s.y;}
      if(!up&&s.vy<-95)s.vy=-95;
      s.latch=up;
      const gravity=up&&s.vy<0&&s.held<.24?650:1400;
      s.held+=dt;s.vy=Math.min(620,s.vy+gravity*dt);s.y+=s.vy*dt;
      if(s.vy<0&&s.jumpStart-s.y>=115){s.y=s.jumpStart-115;s.vy=0;}
      if(s.y>=floor){s.y=floor;s.vy=0;s.grounded=true;}
      if(s.y<box.y+8){s.y=box.y+8;s.vy=Math.max(0,s.vy);}
    }
    s.x=clamp(s.x,box.x+8,box.x+box.w-8);s.y=clamp(s.y,box.y+8,floor);
  }
  function visionRadius(v,t){const u=clamp((t-v.t)/v.duration,0,1);return lerp(v.from,v.to,u*u*(3-2*u));}
  return{BOX,WIDTH,axes,point,normalize,gapCenter,clipLine,sample,collision,newSoul,switchSoul,stepSoul,visionRadius};
});
