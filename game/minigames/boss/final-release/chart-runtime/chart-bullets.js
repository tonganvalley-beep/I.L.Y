/* Adapted from the supplied danmu-boss/game.js: seconds, 300px local box, seeded replay. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./chart-model.js'):root.ChartModel;
  const rad=M.rad,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function random(seed,index,salt=0){let n=(seed^Math.imul(index+1,0x9e3779b1)^Math.imul(salt+1,0x85ebca6b))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;}
  function move(angle,speed,omega,t){const a=rad(angle),w=rad(omega||0);return Math.abs(w)<1e-9?{x:Math.cos(a)*speed*t,y:Math.sin(a)*speed*t}:{x:speed/w*(Math.sin(a+w*t)-Math.sin(a)),y:speed/w*(Math.cos(a)-Math.cos(a+w*t))};}
  function launch(e,i,volley,playerAt,fire){
    const type=e.bulletType,n=e.count,seed=e.patternSeed,source=e.bulletLayout==='source',a=e.direction?.angle??90;
    let x=e.x*300,y=e.y*300,angle=a,vx,vy;
    const randomAt=s=>random(seed,i+volley*n,s),u={x:Math.cos(rad(a+90)),y:Math.sin(rad(a+90))};
    if(type==='fan'){
      const target=playerAt(0);
      angle=e.fanAim==='heart'?Math.atan2(target.y-y,target.x-x)*180/Math.PI:a;
      angle+=(n===1?0:i/(n-1)-.5)*e.spread+volley*e.volleyAngle;
    }else if(['curtain','boneStab'].includes(type)){
      const across=(i+.5)/n*300-150;x+=u.x*across;y+=u.y*across;
    }else if(type==='chase'){
      if(source)x+=(n===1?0:i/(n-1)-.5)*e.spawnSpread;
    }else if(type==='gravity'){
      if(source)x+=(randomAt(0)-.5)*e.spawnSpread;
      vx=Math.cos(rad(a))*e.speed+(randomAt(1)*2-1)*e.velocityJitter;vy=Math.sin(rad(a))*e.speed;
    }else if(type==='ambush'&&source){
      x+=(i%2?-1:1)*164;y+=(Math.floor(i/2)+.5)/Math.ceil(n/2)*260-130;
    }else if(type==='bubble'&&source){
      x+=(i+.5)/n*280-140;y+=i%2?-144:144;vx=(randomAt(0)-.5)*30;vy=i%2?e.speed:-e.speed;
    }else if(type==='healRain'&&source){
      x+=u.x*Math.sin(i*.8)*e.rainWidth/2;y+=u.y*Math.sin(i*.8)*e.rainWidth/2;
      vx=Math.cos(rad(a))*e.speed+u.x*Math.sin(i)*9;vy=Math.sin(rad(a))*e.speed+u.y*Math.sin(i)*9;
    }else if(type==='word'&&e.wordRoute!=='direction'){
      const side=Math.floor(randomAt(0)*4),along=(randomAt(1)-.5)*280;
      const edge=side===0?{x:along,y:-145}:side===1?{x:along,y:145}:side===2?{x:-145,y:along}:{x:145,y:along};
      const inward=e.wordRoute==='inward'||(e.wordRoute==='mixed'&&i%2===0);
      if(inward){x+=edge.x;y+=edge.y;angle=Math.atan2(-edge.y,-edge.x)*180/Math.PI;}
      else angle=Math.atan2(edge.y,edge.x)*180/Math.PI;
    }else if(!['ring','healArc','healSpiral','bubble','word','ambush'].includes(type)){
      x+=u.x*(i-(n-1)/2)*14;y+=u.y*(i-(n-1)/2)*14;
    }
    if(type==='ambush'){const target=playerAt(fire);angle=Math.atan2(target.y-y,target.x-x)*180/Math.PI;}
    return {x,y,angle:vx===undefined?angle:Math.atan2(vy,vx)*180/Math.PI,vx:vx??Math.cos(rad(angle))*e.speed,vy:vy??Math.sin(rad(angle))*e.speed,bounces:0};
  }
  function simulation(e,i,volley,age,start,playerAt,fire,cache){
    const key=`refined:${volley}:${i}`;let states=cache.get(key);if(!states){states=[start];cache.set(key,states);}
    const last=Math.ceil(age*120),dt=1/120;
    while(states.length<=last){
      const tick=states.length-1,at=tick*dt,s={...states[tick]},type=e.bulletType;
      if(type==='chase'&&at>=e.trackingDelay){
        const target=playerAt(fire+at),before=playerAt(fire+at-1/60),tx=target.x+(target.x-before.x)*60*e.prediction,ty=target.y+(target.y-before.y)*60*e.prediction;
        const a=Math.atan2(ty-s.y,tx-s.x),speed=Math.hypot(s.vx,s.vy),acc=e.homingAccel*Math.max(0,1-speed/e.maxSpeed);
        s.vx+=Math.cos(a)*acc*dt;s.vy+=Math.sin(a)*acc*dt;
      }
      if(type==='gravity')s.vy+=e.gravity*dt;
      if(type==='bubble'){
        // The source updates random drift at 30Hz; fixed noise cells make scrubbing deterministic.
        const cell=Math.floor(tick/4),seed=e.patternSeed+volley*131+i*977;
        s.vx+=(random(seed,cell,4)*2-1)*e.diffusion*dt;s.vy+=(random(seed,cell,5)*2-1)*e.diffusion*dt;
      }
      if(e.angularSpeed){const a=rad(e.angularSpeed)*dt,x=s.vx;s.vx=x*Math.cos(a)-s.vy*Math.sin(a);s.vy=x*Math.sin(a)+s.vy*Math.cos(a);}
      const cap=type==='chase'?e.maxSpeed:type==='bubble'?e.bubbleSpeedCap:Infinity,speed=Math.hypot(s.vx,s.vy);
      if(speed>cap){s.vx*=cap/speed;s.vy*=cap/speed;}
      s.x+=s.vx*dt;s.y+=s.vy*dt;
      if(type==='gravity'&&s.y>296&&s.vy>0&&s.bounces<e.bounces){s.y=296;s.vy=-s.vy*.65;s.bounces++;}
      states.push(s);
    }
    const low=Math.floor(age*120),a=states[low],b=states[Math.min(last,low+1)],u=age*120-low;
    return {...a,x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,angle:Math.atan2(a.vy,a.vx)*180/Math.PI};
  }
  function frame(e,time,playerAt,cache=new Map()){
    const out=[],warn=M.warningDuration(e),life=e.waveDuration-warn,n=e.count,type=e.bulletType,volleys=e.volleyCount||1;
    for(let volley=0;volley<volleys;volley++)for(let i=0;i<n;i++){
      const born=volley*(e.volleyInterval||0)+i*e.interval,fire=born+warn+(type==='ambush'?i*e.ambushStep:0),age=time-fire;
      if(time<born||age>=life)continue;
      const initial=launch(e,i,volley,playerAt,fire),heal=type.startsWith('heal')||(type==='word'&&e.wordMode==='heal');
      if(age<0){
        if(type==='ambush')out.push({...initial,r:e.bulletRadius,index:i,volley,warning:true,guide:'ambush',alpha:.5+.3*Math.abs(Math.sin(time*15)),refined:true});
        else if(i===0)out.push({x:e.x*300,y:e.y*300,r:9,index:i,volley,warning:true,refined:true,guide:type,angle:initial.angle+(type==='fan'&&n>1?e.spread/2:0),alpha:.45+.4*Math.abs(Math.sin(time*15))});
        continue;
      }
      if(['curtain','boneStab'].includes(type)&&Math.abs((i+.5)/n*300-e.holePosition*300)<e.holeWidth/2+e.bulletRadius)continue;
      let p=initial,r=e.bulletRadius??4;
      if(['ring','healArc','healSpiral'].includes(type)){
        if(type==='ring'&&Math.abs(((i*360/n-e.gapAngle+540)%360)-180)<e.gapDegrees/2)continue;
        const a=i*360/n+(e.rotation||0)+(e.angularSpeed||0)*age+volley*(e.volleyAngle||0),distance=e.radius+(e.radialMotion==='inward'?-1:1)*e.speed*age;
        if(distance<0&&type!=='healArc')continue;p={x:e.x*300+Math.cos(rad(a))*distance,y:e.y*300+Math.sin(rad(a))*distance*(e.ellipseRatio||1),angle:a+(e.radialMotion==='inward'?180:0)};
      }else if(['chase','gravity','bubble'].includes(type))p=simulation(e,i,volley,age,initial,playerAt,fire,cache);
      else if(type==='ambush'){
        const untilCap=e.acceleration?(e.maxSpeed-e.speed)/e.acceleration:Infinity,t=Math.min(age,untilCap),distance=e.speed*t+e.acceleration*t*t/2+Math.max(0,age-t)*e.maxSpeed;
        p={...initial,x:initial.x+Math.cos(rad(initial.angle))*distance,y:initial.y+Math.sin(rad(initial.angle))*distance};
      }else{
        const d=move(initial.angle,Math.hypot(initial.vx,initial.vy),e.angularSpeed,age);
        p={...initial,x:initial.x+d.x,y:initial.y+d.y,angle:initial.angle+(e.angularSpeed||0)*age};
      }
      if(type==='word'&&e.wordBounce==='on'){
        const reflect=v=>{const q=((v%600)+600)%600;return q>300?600-q:q;};p={...p,x:reflect(p.x),y:reflect(p.y)};
      }
      // Curved healing paths can leave this square and return. Keep their full lifetime.
      if(!heal&&(p.x<-80||p.x>380||p.y<-80||p.y>380))continue;
      const inflate=e.inflateEvery>0&&i%e.inflateEvery===0,inflatePulse=inflate&&age<e.inflateAfter;
      if(inflate&&age>=e.inflateAfter)r*=e.inflateScale;
      const word=type==='word',fontSize=word?e.wordSize*(1+clamp(age/e.wordGrow,0,1)*(e.wordScale-1)):0;
      const w=word?Array.from(e.text).reduce((sum,c)=>sum+(c.charCodeAt(0)>255?1:.6),0)*fontSize:0;
      const arming=!heal&&age<(e.arming||0),alpha=Math.min(1,(life-age)/.3)*(arming?.45+.2*Math.sin(age*60):1);
      const speed=Math.hypot(p.vx??initial.vx,p.vy??initial.vy),tail=Math.min(30,speed/12),a=rad(p.angle);
      out.push({...p,r,index:i,volley,heal,warning:arming,refined:true,word,fontSize,w,h:fontSize,alpha,inflatePulse,age,
        trail:[{x:-Math.cos(a)*tail,y:-Math.sin(a)*tail},{x:0,y:0}]});
    }
    return out;
  }
  function draw(c,s,chosen=false){
    const e=s.event,type=e.bulletType,healColor=e.healEffect==='bossDamage'?'#ffb96b':e.healEffect==='damage'?'#ffd166':e.healEffect==='maxHp'?'#b6ff6b':'#7bd88f';c.save();c.translate(s.x,s.y);c.globalAlpha=s.alpha??1;
    if(s.guide){
      if(s.guide==='curtain'){
        const a=rad((e.direction?.angle??90)+90),u={x:Math.cos(a),y:Math.sin(a)},center=e.holePosition*300-150;
        // Reflect the warning's tangent together with its owning event.
        if(['x','both'].includes(e.mirrorAxis))u.x*=-1;if(['y','both'].includes(e.mirrorAxis))u.y*=-1;
        c.strokeStyle='#74f0b2';c.lineWidth=4;c.beginPath();c.moveTo(u.x*(center-e.holeWidth/2),u.y*(center-e.holeWidth/2));c.lineTo(u.x*(center+e.holeWidth/2),u.y*(center+e.holeWidth/2));c.stroke();
        c.strokeStyle='#ff778c';c.lineWidth=1;c.setLineDash([5,5]);for(const [lo,hi]of [[-150,center-e.holeWidth/2],[center+e.holeWidth/2,150]]){c.beginPath();c.moveTo(u.x*lo,u.y*lo);c.lineTo(u.x*hi,u.y*hi);c.stroke();}
      }else{
        c.strokeStyle=s.guide==='ambush'?'#dec1ff':'#ff778c';c.fillStyle=s.guide==='ambush'?'#b478ff':'#ff506b';c.lineWidth=1.5;c.beginPath();c.arc(0,0,s.r,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,3,0,Math.PI*2);c.fill();
        if(s.guide==='fan'){c.setLineDash([4,4]);for(const sign of [-1,1]){const a=rad(s.angle+sign*e.spread/2);c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*45,Math.sin(a)*45);c.stroke();}}
      }
    }else{
      if(!s.word&&s.trail){c.strokeStyle=s.heal?'#72db9a66':type==='chase'?'#ffa95c77':'#abb1ff66';c.lineWidth=Math.max(1,s.r);c.beginPath();s.trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
      if(s.word){c.font=`bold ${s.fontSize}px ILYBulletPixel, monospace`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=s.heal?healColor:'#ff9a9a';c.shadowColor=s.heal?healColor:'#ff5f5f';c.shadowBlur=10;c.fillText(e.text,0,0);}
      else if(type==='bubble'||type==='healRain'){c.fillStyle=s.heal?healColor+'b3':'#96d2ff80';c.strokeStyle='#dcf0ffd9';c.lineWidth=1;c.beginPath();c.arc(0,0,s.r,0,Math.PI*2);c.fill();c.stroke();}
      else if(['straight','gravity','boneStab'].includes(type)){c.rotate(rad(s.angle));c.fillStyle='#f2f2f7';c.beginPath();c.roundRect(-s.r*2.25,-s.r*.75,s.r*4.5,s.r*1.5,s.r*.65);c.fill();}
      else{c.fillStyle=s.heal?healColor:type==='chase'?'#ffb14d':type==='ambush'?'#b478ff':'#8fd6ff';c.strokeStyle=type==='ambush'?'#e7d2ff':'#e6f7ff';c.lineWidth=1;if(type==='chase'||s.heal){c.shadowColor=c.fillStyle;c.shadowBlur=10;}c.beginPath();c.arc(0,0,s.r,0,Math.PI*2);c.fill();c.stroke();}
      if(s.inflatePulse){c.strokeStyle='#ff6e6e';c.lineWidth=2;c.beginPath();c.arc(0,0,s.r+4+Math.sin(s.age*28)*2,0,Math.PI*2);c.stroke();}
    }
    c.restore();
    if(chosen){c.save();c.strokeStyle='#6ee7ff';c.lineWidth=1.5;if(s.word)c.strokeRect(s.x-s.w/2-3,s.y-s.h/2-3,s.w+6,s.h+6);else{c.beginPath();c.arc(s.x,s.y,s.r+5,0,Math.PI*2);c.stroke();}c.restore();}
  }
  const api={frame,draw,random};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartBullets=api;
})(typeof globalThis!=='undefined'?globalThis:this);
