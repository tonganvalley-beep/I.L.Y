/* Deterministic chart playback, independent of DOM and render FPS. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./chart-model.js'):root.ChartModel;
  const Patterns=typeof module!=='undefined'&&module.exports?require('./pattern_demo/patterns.js'):root.ILYPatterns;
  const Timing=typeof module!=='undefined'&&module.exports?require('./chart-timing.js'):root.ChartTiming;
  const Sans=typeof module!=='undefined'&&module.exports?require('./chart-sans.js'):root.ChartSans;
  const Bullets=typeof module!=='undefined'&&module.exports?require('./chart-bullets.js'):root.ChartBullets;
  const palette=['#55caff','#c69aff','#6af0ce','#ff87bd','#8caaff','#f6ce87'];
  function reflectShape(e,s){
    const mx=['x','both'].includes(e.mirrorAxis),my=['y','both'].includes(e.mirrorAxis);if(!mx&&!my)return s;
    const rect=['area','wireArea'].includes(s.type),out={...s,x:mx?300-s.x-(rect?s.w:0):s.x,y:my?300-s.y-(rect?s.h:0):s.y};
    if(s.x2!==undefined){out.x2=mx?300-s.x2:s.x2;out.y2=my?300-s.y2:s.y2;}
    if(s.angle!==undefined)out.angle=Math.atan2((my?-1:1)*Math.sin(M.rad(s.angle)),(mx?-1:1)*Math.cos(M.rad(s.angle)))*180/Math.PI;
    if(s.rotation!==undefined)out.rotation=mx!==my?-s.rotation:s.rotation;
    if(s.type==='area'&&s.pattern.kind==='tentacle'){out.reflectX=!!s.reflectX!==mx;out.reflectY=!!s.reflectY!==my;}
    if(s.trail)out.trail=s.trail.map(p=>({x:mx?-p.x:p.x,y:my?-p.y:p.y}));
    if(s.side)out.side=mx?({left:'right',right:'left'}[out.side]||out.side):out.side;
    if(s.side&&my)out.side=({top:'bottom',bottom:'top'}[out.side]||out.side);
    return out;
  }
  function areaEvent(e){
    if(e.kind==='caption')return {...e,rect:{...e.rect}};
    const h=e.axis==='horizontal',breadth=e.thickness;
    return {...e,rect:h?{x:0,y:(300-breadth)*e.position,w:300,h:breadth}:{x:(300-breadth)*e.position,y:0,w:breadth,h:300}};
  }
  function patternAnchor(e,path=[],heart=null,time=e.t){
    if(M.rootedWire(e)){const along=e.side==='left'||e.side==='top'?0:300,edge=e.rootEdge==='near'?0:300;return M.wireHorizontal(e)?{x:along,y:edge}:{x:edge,y:along};}
    if(M.wire(e))return e.side==='left'?{x:0,y:150}:e.side==='right'?{x:300,y:150}:e.side==='top'?{x:150,y:0}:{x:150,y:300};
    if(M.setting(e))return {x:150,y:210};
    if(e.kind==='flowerChain'){const origin=e.centerHeart?M.mirrorPoint(e,heart||targetAt(path,e.t)):{x:(e.x??.5)*300,y:(e.y??.5)*300};return M.flowerCenterAt(e,origin,time-e.t);}
    if(['caption','tentacle'].includes(e.kind)){const r=areaEvent(e).rect;return {x:r.x+r.w/2,y:r.y+r.h/2};}
    return {x:e.x*300,y:e.y*300};
  }
  function drawPatternShape(ctx,s){
    if(s.type==='wireArea'||s.type==='wireLine'){Sans.draw(ctx,s);
    }else if(s.type==='area'){
      if(s.warning){drawWarning(ctx,s.x+s.w/2,s.y+s.h/2,s.w,s.h,s.rotation||0,s.flash!==false);return;}
      ctx.save();ctx.translate(s.x+s.w/2,s.y+s.h/2);ctx.rotate(M.rad(s.rotation||0));ctx.scale(s.reflectX?-1:1,s.reflectY?-1:1);ctx.translate(-s.x-s.w/2,-s.y-s.h/2);
      const system=new Patterns.PatternSystem({box:{x:-3000,y:-3000,w:6000,h:6000}});
      system.events=[{...s.pattern,rect:{x:s.x,y:s.y,w:s.w,h:s.h}}];system.draw(ctx,s.time);ctx.restore();
    }else if(s.flower){
      ctx.save();ctx.strokeStyle=s.color;ctx.lineWidth=s.r*1.2;ctx.globalAlpha=.35;ctx.beginPath();s.trail.forEach((p,i)=>i?ctx.lineTo(s.x+p.x,s.y+p.y):ctx.moveTo(s.x+p.x,s.y+p.y));ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eaf8ff';ctx.fillRect(s.x-1,s.y-1,2,2);ctx.restore();
    }
  }
  function drawWarning(c,x,y,w,h,angle=0,flash=true,glyph={x,y}){
    c.save();c.translate(x,y);c.rotate(M.rad(angle));c.strokeStyle=flash?'#ff3756':'#702536';c.fillStyle='rgba(255,30,55,.12)';c.lineWidth=flash?2:1;c.setLineDash([]);c.fillRect(-w/2,-h/2,w,h);c.strokeRect(-w/2,-h/2,w,h);c.restore();
    if(flash){c.save();c.fillStyle='#ff3756';c.font='bold 26px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('!',glyph.x,glyph.y);c.restore();}
  }
  function drawBeam(c,s,chosen=false,assets=null){
    c.save();
    if(s.shieldClip){const p=s.shieldClip;c.beginPath();c.rect(-10000,-10000,20000,20000);c.moveTo(p.x+p.r,p.y);c.arc(p.x,p.y,p.r,0,Math.PI*2);c.clip('evenodd');}
    if(s.warning&&!s.safe){
      const a=M.rad(s.angle),dx=Math.cos(a),dy=Math.sin(a),bounds=s.viewport||M.laserBounds(s.event||{});let entry=0;
      for(const [p,d,min,max]of [[s.x,dx,bounds.x,bounds.x+bounds.w],[s.y,dy,bounds.y,bounds.y+bounds.h]])if(Math.abs(d)>1e-9)entry=Math.max(entry,Math.min((min-p)/d,(max-p)/d));
      const middle=(Math.min(entry,s.length)+s.length)/2;
      if(s.length>0)drawWarning(c,s.x+dx*s.length/2,s.y+dy*s.length/2,s.length,Math.max(4,s.width),s.angle,true,{x:s.x+dx*middle,y:s.y+dy*middle});
    }
    c.save();c.translate(s.x,s.y);c.rotate(M.rad(s.angle));c.globalAlpha=(s.alpha??1)*.65;
    if(!s.warning||s.safe){c.lineWidth=s.safe?2:(s.visualWidth??s.width);c.strokeStyle=s.safe?'#79f2b0':'#ff90b5';c.setLineDash(s.safe?[9,6]:[]);c.beginPath();c.moveTo(0,0);c.lineTo(s.length,0);c.stroke();}
    c.globalAlpha=s.alpha??1;c.setLineDash([]);const size=s.emitterSize??14,offset=s.emitterOffset??0;
    if(!assets?.draw(c,'laserEmitter',offset,0,size,size)){c.fillStyle=chosen?'#6ee7ff':'#f0dbff';c.fillRect(offset-size/2,-size/2,size,size);c.fillStyle=s.warning?'#ff3756':'#ff90b5';c.fillRect(offset-size*.2,-size*.2,size*.4,size*.4);}
    if(chosen&&!s.exiting){c.strokeStyle='#6ee7ff';c.lineWidth=1.5;c.strokeRect(0,-s.width/2-4,s.length,s.width+8);}c.restore();c.restore();
    if(s.shieldImpact){const p=s.shieldImpact,age=p.age||0,pulse=.65+.35*Math.sin(age*80);c.save();c.globalAlpha=(s.alpha??1)*pulse;c.strokeStyle='#c8f8ff';c.lineWidth=2;
      c.beginPath();c.arc(p.x,p.y,3+2*pulse,0,Math.PI*2);c.stroke();
      for(let i=0;i<5;i++){const a=p.angle+(i-2)*.32,d=4+((age*70+i*4)%14);c.beginPath();c.moveTo(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d);c.lineTo(p.x+Math.cos(a)*(d+4),p.y+Math.sin(a)*(d+4));c.stroke();}c.restore();}
  }
  function drawKey(c,s,chosen=false){
    if(s.counter){
      const r=s.r,hits=s.hitsLeft??s.event.keyHitsRequired,flash=s.hitAge>=0&&s.hitAge<.16;
      c.save();c.translate(s.x,s.y);c.strokeStyle=chosen?'#6ee7ff':'#f2d599';c.lineWidth=2;c.fillStyle=flash?'#fff8dc':'#172238';
      c.beginPath();c.moveTo(0,-r);c.lineTo(r,0);c.lineTo(0,r);c.lineTo(-r,0);c.closePath();c.fill();c.stroke();
      c.fillStyle='#a6e8ff';c.fillRect(-3,-r*.4,6,r*.8);c.fillRect(-r*.4,-3,r*.8,6);
      c.fillStyle='#f2d599';c.font='11px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(hits),0,r+12);
      const n=Math.min(12,s.event.keyHitsRequired),w=Math.min(7,r*1.8/n),start=-n*w/2;
      for(let i=0;i<n;i++){c.fillStyle=i/n<hits/s.event.keyHitsRequired?'#f2d599':'#30394c';c.fillRect(start+i*w,r+21,w-1,3);}c.restore();return;
    }
    c.save();c.fillStyle='#ffd379';c.fillRect(s.x-s.w/2,s.y-s.h/2,s.w,s.h);
    c.fillStyle='#463914';c.font=`${Math.max(5,Math.min(18,s.h*.75,s.w*.65))}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('Z',s.x,s.y);
    if(chosen){c.strokeStyle='#6ee7ff';c.lineWidth=2;c.strokeRect(s.x-s.w/2-4,s.y-s.h/2-4,s.w+8,s.h+8);}c.restore();
  }
  const phases=[
    {id:'act1',name:'第一幕 · 炸裂开场',start:0,end:80,sections:[[0,12,'Sans 式突袭'],[12,40,'鼓点环 / 扇 / 追踪'],[40,70,'短排激光'],[70,80,'收束扫线']]},
    {id:'act2',name:'第二幕 · 呼吸回血',start:80,end:107,sections:[]},
    {id:'act3',name:'第三幕 · Bass 与紫色鼓点',start:107,end:136,sections:[[107,116,'Bass 逐排激光'],[116,136,'鼓点与延迟追踪']]},
    {id:'act4',name:'第四幕 · 呼吸螺旋回血',start:136,end:158,sections:[]},
    {id:'act5',name:'第五幕 · 主战长段',start:158,end:294,sections:[[158,171,'行进弹墙与钢琴'],[171,190,'双框隔离映射'],[190,203,'Bass 回归与大回旋'],[203,230,'舒缓环 / 短弧'],[230,253,'行进鼓与钢琴复合'],[253,270,'中央粗激光'],[270,294,'女生显现']]},
    {id:'act6',name:'第六幕 · 断条与白化',start:294,end:330,sections:[[294,309,'停火 / 第四面墙'],[309,309.4,'剧情斩击'],[309.4,330,'回血与白化']]},
    {id:'act7',name:'第七幕 · 最终波次',start:330,end:353,sections:[[330,332,'双人登场'],[332,353,'护盾回血与最终波次']]},
    {id:'outro',name:'尾声 · 海浪退场',start:353,end:445.668889,sections:[]}
  ];
  const phaseAt=t=>phases.find(p=>t>=p.start&&t<p.end)||phases[t<0?0:phases.length-1];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function displacement(angle,speed,omega,time){
    const a=M.rad(angle),w=M.rad(omega||0);
    return Math.abs(w)<1e-9?{x:Math.cos(a)*speed*time,y:Math.sin(a)*speed*time}:
      {x:speed/w*(Math.sin(a+w*time)-Math.sin(a)),y:speed/w*(Math.cos(a)-Math.cos(a+w*time))};
  }
  function activeRange(e){
    e=M.playbackEvent(e);
    if(e.kind==='battleKey')return e.keyStyle==='counter'?[e.t,e.t+e.keyDuration]:[e.t-(e.keyTiming==='speed'?230/e.keySpeed:e.lead||0),e.t+1.2];
    return [e.t-(e.kind==='laserRow'?e.warn:0),e.t+M.span(e)];
  }
  function targetAt(path,time){
    if(!path?.length)return {x:150,y:210};
    let lo=0,hi=path.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(path[mid].t<=time)lo=mid+1;else hi=mid;}
    if(!lo)return {x:path[0].x,y:path[0].y};
    const a=path[lo-1],b=path[lo];if(!b)return {x:a.x,y:a.y};
    const u=clamp((time-a.t)/(b.t-a.t||1),0,1);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
  }
  function bulletPositions(e,time,playerAt=()=>({x:150,y:210}),cache=new Map()){
    const result=[],n=e.count,angle=e.direction?.angle??90,sx=e.x*300,sy=e.y*300,omega=e.angularSpeed||0;
    for(let i=0;i<n;i++){
      const age=time-i*e.interval;if(age<0||age>e.waveDuration)continue;
      let x=sx,y=sy,a=angle,r=e.bulletRadius??4,warning=false;
      const radial=['ring','healArc','healSpiral'].includes(e.bulletType);
      if(radial){
        a=i*360/n+(e.rotation||0)+omega*age;
        if(e.bulletType==='ring'&&Math.abs(((i*360/n-e.gapAngle+540)%360)-180)<e.gapDegrees/2)continue;
        const radius=e.radius+(e.radialMotion==='inward'?-1:1)*e.speed*age;if(radius<0)continue;
        x+=Math.cos(M.rad(a))*radius;y+=Math.sin(M.rad(a))*radius;
      }else if(['chase','ambush','gravity'].includes(e.bulletType)){
        // Cache 120 Hz simulation samples. Seek and loop reuse exactly the same history.
        let states=cache.get(i);
        if(!states){states=[{x:sx+(i-(n-1)/2)*(e.bulletType==='gravity'?14:12),y:sy,heading:Math.PI/2,vy:Math.sin(M.rad(angle))*e.speed,bounces:0,dead:false,locked:false}];cache.set(i,states);}
        const end=Math.ceil(age*120);
        while(states.length<=end){
          const prev=states[states.length-1],s={...prev},at=(states.length-1)/120,dt=1/120;
          if(e.bulletType==='gravity'){
            const move=displacement(angle,e.speed,omega,at+dt),before=displacement(angle,e.speed,omega,at);
            s.x+=move.x-before.x;s.vy+=e.gravity*dt;s.y+=s.vy*dt;
            // Angular speed rotates the launch velocity; gravity remains downward.
            s.vy+=(Math.sin(M.rad(angle+omega*(at+dt)))-Math.sin(M.rad(angle+omega*at)))*e.speed;
            if(s.y>296&&s.vy>0){if(s.bounces>=e.bounces)s.dead=true;else{s.y=296;s.vy=-s.vy*.65;s.bounces++;}}
          }else{
            const lock=e.bulletType==='ambush'?e.telegraph:e.trackingDelay;
            if(at>=lock){
              const p=playerAt(e.bulletType==='ambush'?i*e.interval+lock:i*e.interval+at);
              const want=Math.atan2(p.y-s.y,p.x-s.x);
              if(e.bulletType==='ambush'){if(!s.locked){s.heading=want;s.locked=true;}}
              else{const d=Math.atan2(Math.sin(want-s.heading),Math.cos(want-s.heading));s.heading+=clamp(d,-M.rad(e.turnRate)*dt,M.rad(e.turnRate)*dt);}
            }
            const speed=e.bulletType==='ambush'?(at<lock?0:Math.min(e.maxSpeed,e.speed+e.acceleration*(at-lock))):Math.min(e.maxSpeed,e.speed);
            s.x+=Math.cos(s.heading)*speed*dt;s.y+=Math.sin(s.heading)*speed*dt;
          }
          states.push(s);
        }
        const lo=Math.floor(age*120),s=states[lo],next=states[Math.min(end,lo+1)],u=age*120-lo;
        if(s.dead)continue;x=s.x+(next.x-s.x)*u;y=s.y+(next.y-s.y)*u;a=s.heading*180/Math.PI;warning=e.bulletType==='ambush'&&age<e.telegraph;
      }else{
        if(['curtain','boneStab'].includes(e.bulletType)){
          const d=(i+.5)/n*300;if(Math.abs(d-e.holePosition*300)<e.holeWidth/2)continue;
          x-=Math.sin(M.rad(angle))*(d-150);y+=Math.cos(M.rad(angle))*(d-150);
        }else if(e.bulletType==='fan')a+=e.spread*(n===1?0:i/(n-1)-.5);
        else x+=(i-(n-1)/2)*14;
        const move=displacement(a,e.speed,omega,age);x+=move.x;y+=move.y;a+=omega*age;
        if(e.bulletType==='bubble'){x+=(i%2?1:-1)*e.diffusion*age*age/2;r+=e.inflate*age;}
      }
      result.push({x,y,r,angle:a,warning,heal:e.bulletType.startsWith('heal'),index:i});
    }return result;
  }
  class Player{
    constructor(){this.cache=new WeakMap();this.path=[];this.events=[];this.sourceRows=[];this.resetSoul();}
    resetSoul(){this.souls=[{x:150,y:210,mode:'red',vy:0,grounded:false,jumpLatch:false,jumpHold:0}];}
    setPath(path){this.path=path;this.pathLength=path.length;this.pathTail=path.at(-1);this.cache=new WeakMap();this.resetSoul();}
    extendPath(path){
      if(path!==this.path||path.length<this.pathLength||this.pathLength&&path[this.pathLength-1]!==this.pathTail){this.setPath(path);return;}
      if(path.length===this.pathLength)return;
      // Appending recorded samples preserves past trajectories; discard only predicted soul states.
      const boundary=this.pathTail?.t??0;this.souls.length=Math.min(this.souls.length,Math.max(1,Math.floor(boundary*120)+1));
      this.pathLength=path.length;this.pathTail=path.at(-1);
    }
    setSoulSettings(settings){this.soulSettings=Sans.soulSettings(settings);this.cache=new WeakMap();this.resetSoul();}
    sync(rows){
      if(rows.length===this.sourceRows.length&&rows.every((r,i)=>r.event===this.sourceRows[i].event&&r.id===this.sourceRows[i].id))return;
      this.sourceRows=rows.map(r=>({id:r.id,event:r.event}));this.events=rows.filter(r=>r.event).map(r=>r.event);
      this.rowById=new Map(this.sourceRows.map(r=>[r.id,r]));
      this.timing=Timing.resolve(this.sourceRows);this.modes=this.events.filter(e=>e.kind==='heartMode').sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0));this.cache=new WeakMap();this.resetSoul();
    }
    soulAt(time){
      if(!this.modes?.length){const p=targetAt(this.path,time);return {...this.souls[0],...p};}
      if(this.path.length&&time<=this.path.at(-1).t){const p=targetAt(this.path,time),before=targetAt(this.path,time-1/120),setting=Sans.settingsAt(this.modes,time),local=Sans.gravityPoint(p,setting.gravityDirection),previous=Sans.gravityPoint(before,setting.gravityDirection);return {...this.souls[0],...p,mode:setting.mode,gravityDirection:setting.gravityDirection,vy:(local.y-previous.y)*120,grounded:local.y>=292};}
      const end=Math.ceil(Math.max(0,time)*120),empty={left:false,right:false,up:false,down:false};
      while(this.souls.length<=end){
        const t=this.souls.length/120,prev=this.souls.at(-1),setting=Sans.settingsAt(this.modes,t);
        const s=Sans.stepSoul(prev,empty,setting,1/120,this.soulSettings);
        if(this.path.length&&t<=this.path.at(-1).t){const p=targetAt(this.path,t),local=Sans.gravityPoint(p,setting.gravityDirection),before=Sans.gravityPoint(prev,setting.gravityDirection);s.vy=(local.y-before.y)*120;s.x=p.x;s.y=p.y;s.grounded=local.y>=292;}
        this.souls.push(s);
      }
      const at=Math.max(0,time)*120,lo=Math.floor(at),a=this.souls[lo],b=this.souls[Math.min(end,lo+1)],u=at-lo;
      return {...a,x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
    }
    entry(event){
      if(!this.cache.has(event)){
        try{const built=M.build(M.read(event),event.t,event),e=M.playbackEvent(built);this.cache.set(event,{e,range:activeRange(e),particles:new Map()});}
        catch(error){this.cache.set(event,{error:error.message});}
      }return this.cache.get(event);
    }
    frame(events,time,laserViewport=null,aimPreview=null){
      this.sync(events);
      const shapes=[],issues=[...(this.timing?.issues||[])],settings=Sans.settingsAt(this.events,time),heart=aimPreview?.heart||this.soulAt(time);
      for(const row of events){
        const original=row.event;if(!original)continue;
        if(!Object.hasOwn(M.fields[0].choices,original.kind)){issues.push(`#${row.id} ${original.kind}：非弹幕事件`);continue;}
        if(original.kind==='marker'||M.setting(original))continue;
        const index=this.rowById.get(row.id),end=this.timing.ends.get(index);
        if(Number.isNaN(end)||time>=end+M.exitSpan(original))continue;
        const item=this.entry(original);if(item.error){issues.push(`#${row.id} ${item.error}`);continue;}
        const raw=item.e,range=item.range,particles=item.particles;
        if(Number.isNaN(end)||time<range[0]||time>=end+M.exitSpan(raw))continue;
        const e=Timing.materialize(raw,end);
        const anchored=original.timingAnchor==='attack'&&M.hasWarning(e)&&e.kind!=='laserRow';
        const age=anchored?time-original.t+M.warningDuration(e):time-e.t,playerAt=t=>M.mirrorPoint(e,this.soulAt(t+e.t));
        const base={rowId:row.id,event:e,boxId:e.boxId||'center'};
        const {x:tx,y:ty}=M.translation(e);
        const put=shape=>{
          let placed={...base,...shape,x:shape.x+tx,y:shape.y+ty,...(shape.x2===undefined?{}:{x2:shape.x2+tx,y2:shape.y2+ty})};
          placed=reflectShape(e,placed);
          if(shape.type==='beam'){
            const bounds=laserViewport?(typeof laserViewport==='function'?laserViewport(placed.boxId):laserViewport):M.laserBounds(e);
            placed.length=M.rayLength(placed.x,placed.y,placed.angle,bounds);
            placed.viewport=bounds;
          }
          if(M.wire(e))placed=Sans.clipShape(placed);
          if(placed)shapes.push(placed);
        };
        if(M.wire(e))for(const s of Sans.frame(e,age))put(s);
        if(['tentacle','caption'].includes(e.kind)){
          // Relative time avoids cancellation at exact musical attack boundaries.
          const pattern=areaEvent(e),patternTime=anchored?time-original.t:time;
          if(anchored)pattern.t=-M.warningDuration(e);
          const state=Patterns.areaState(pattern,patternTime);
          if(!['pending','done'].includes(state.phase))put({type:'area',...pattern.rect,rotation:e.rotation||0,pattern,time:patternTime,phase:state.phase,warning:state.phase==='warning',flash:state.flash});
        }
        if(e.kind==='flowerChain'){
          const captured=e.centerHeart?(aimPreview?.ids.has(row.id)&&aimPreview.flowerHeart||this.soulAt(e.t)):null;
          const center=patternAnchor({...e,flowerOrbit:'off'},this.path,captured),pattern={...e,...center};
          const point=(group,ray,age)=>{const p=Patterns.flowerPoint({...pattern,collapseDelay:M.flowerTiming(e,group).delay},group,ray,age),a=M.rad(e.rotation||0),dx=p.x-center.x,dy=p.y-center.y,orbit=M.flowerCenterAt(e,center,group*e.gap+age);return {...p,x:orbit.x+dx*Math.cos(a)-dy*Math.sin(a),y:orbit.y+dx*Math.sin(a)+dy*Math.cos(a)};};
          for(let group=0;group<e.groups;group++){
            const {born,life}=M.flowerTiming(e,group),age=time-born;if(age<0||time>=born+life)continue;
            for(let ray=0;ray<e.count;ray++){
              const p=point(group,ray,age);
              const trail=Array.from({length:6},(_,k)=>{const q=point(group,ray,Math.max(0,age-.12+k*.024));return {x:q.x-p.x,y:q.y-p.y};});
              put({...p,type:'bullet',flower:true,group,index:ray,r:e.bulletRadius,color:palette[group%palette.length],trail});
            }
          }
        }
        if(e.kind==='laserRow')for(const beam of M.laserFrame(e,age,playerAt,end-e.t,aimPreview?.ids.has(row.id)?M.mirrorPoint(e,heart):null))put({...beam,type:'beam',index:beam.start});
        if(e.kind==='bullet'){
          const targetAt=t=>{const p=playerAt(t);return {x:p.x-tx,y:p.y-ty};};
          for(const p of M.refined(e)?Bullets.frame(e,age,targetAt,particles):bulletPositions(e,age,playerAt,particles))put({...p,type:'bullet'});
        }
        if(e.kind==='battleKey'){
          if(e.keyStyle==='counter')put({type:'key',counter:true,x:e.x*300,y:e.y*300,w:e.keyRadius*2,h:e.keyRadius*2,r:e.keyRadius});
          else{const lead=e.lead||.01,y=e.keyTiming==='speed'?210+age*e.keySpeed:age<0?(-20+(age+lead)/lead*230):210+age*180;
            put({type:'key',x:(e.lane+.5)*50+(e.x-.5)*300,y:y+e.y*300,w:e.keyWidth,h:e.keyHeight,r:Math.max(e.keyWidth,e.keyHeight)/2});}
        }
        if(e.kind==='finalWave'){
          const u=clamp(age/e.waveDuration,0,1),radius=180*(1-u)+30*u;
          for(let i=0;i<24;i++){const angle=i*Math.PI/12;put({type:'bullet',x:e.x*300+Math.cos(angle)*radius,y:e.y*300+Math.sin(angle)*radius+Math.sin(u*12+i)*10,r:5,heal:true,index:i});}
        }
      }return {shapes,issues,settings,heart};
    }
  }
  function moveEvents(rows,ids,dx,dy){
    return rows.filter(r=>r.event&&ids.has(r.id)).map(row=>({row,event:{...row.event,translateX:M.canTranslate(row.event,'x')?Number(((row.event.translateX||0)+(['x','both'].includes(row.event.mirrorAxis)?-dx:dx)).toFixed(6)):0,translateY:M.canTranslate(row.event,'y')?Number(((row.event.translateY||0)+(['y','both'].includes(row.event.mirrorAxis)?-dy:dy)).toFixed(6)):0}}));
  }
  const api={phases,phaseAt,displacement,activeRange,targetAt,bulletPositions,Player,moveEvents,areaEvent,patternAnchor,drawPatternShape,drawBeam,drawKey};
  api.reflectShape=reflectShape;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartPlayback=api;
})(typeof globalThis!=='undefined'?globalThis:this);
