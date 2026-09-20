/* Seconds-based counterparts of boss_battle.html wire attacks and soul settings. */
(function(root){
  'use strict';
  const Wire=typeof module!=='undefined'&&module.exports?require('./pattern_demo/sans-wire-demo/mechanics.js'):root.WireMechanics;
  const M=typeof module!=='undefined'&&module.exports?require('./chart-model.js'):root.ChartModel;
  const box={x:0,y:0,w:300,h:300};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const horizontal=side=>side==='left'||side==='right';
  const sign=side=>side==='left'||side==='top'?1:-1;
  const along=(e,age)=>(sign(e.side)>0?0:300)+sign(e.side)*age*e.speed;
  function gapPosition(e,age){
    const period=2*(300-e.gapSize),travel=((e.gapDir*e.gapSpeed*Math.max(0,age)+(e.gapPhase||0))%period+period)%period;
    return Wire.gapCenter({box,side:M.wireRoot(e),gap:e.gapSize,center:e.gapCenter/300,moving:e.gapMove,gapDir:1,gapSpeed:1},travel);
  }
  function segment(e,a,c0,c1,depth){
    const edge=M.wireRoot(e),first=Wire.point(edge,a+e.tilt*c0/depth,c0,box),last=Wire.point(edge,a+e.tilt*c1/depth,c1,box);
    return {type:'wireLine',...first,x2:last.x,y2:last.y,r:(e.wireWidth??10)/2};
  }
  function clipShape(s){
    if(s.type==='wireLine'){
      const line=Wire.clipLine({a:{x:s.x,y:s.y},b:{x:s.x2,y:s.y2},width:s.r*2},box);
      return line?{...s,x:line.a.x,y:line.a.y,x2:line.b.x,y2:line.b.y}:null;
    }
    const x=Math.max(0,s.x),y=Math.max(0,s.y),right=Math.min(300,s.x+s.w),bottom=Math.min(300,s.y+s.h);
    return right>x&&bottom>y?{...s,x,y,w:right-x,h:bottom-y}:null;
  }
  function rect(e,depth){
    if(e.side==='left')return {x:0,y:0,w:depth,h:300};
    if(e.side==='right')return {x:300-depth,y:0,w:depth,h:300};
    if(e.side==='top')return {x:0,y:0,w:300,h:depth};
    return {x:0,y:300-depth,w:300,h:depth};
  }
  function frame(e,age){
    if(age<0)return [];
    if(e.kind==='wireEmerge'&&e.emergeExit==='forward'){
      const state=Wire.sample({kind:'emerge',box,side:e.side,t:0,pre:e.pre,rise:M.wireRise(e),hold:e.hold,after:'forward',height:e.height,speed:e.moveSpeed,rowCenter:e.rowCenter,rowGap:e.rowGap},age);
      const warning=state.phase==='warning';
      return (warning?state.warnings:state.rects).map(r=>({type:'wireArea',...r,warning,side:e.side,wireWidth:e.wireWidth??10,age,splitRow:true}));
    }
    if(age<e.pre){const r=e.kind==='wireEmerge'?rect(e,e.height):{x:0,y:0,w:300,h:300};return [{type:'wireArea',...r,warning:true,age}];}
    const t=age-e.pre;
    if(e.kind==='wireSingle')return [segment(e,along(e,t),0,e.height,e.height)];
    if(e.kind==='wireGap'){const c=gapPosition(e,t),h=e.gapSize/2,a=along(e,t),out=[];if(c-h>1e-8)out.push(segment(e,a,0,c-h,300));if(c+h<300-1e-8)out.push(segment(e,a,c+h,300,300));return out;}
    let r;
    if(e.kind==='wireEmerge'){
      const grow=M.wireRise(e),elapsed=t-grow-e.hold;
      if(e.moveAfter&&elapsed>=0)return frame({...e,kind:'wireMove',pre:0,speed:e.moveSpeed,length:e.moveLength,height:e.moveHeight},elapsed);
      const depth=t<grow?t/grow*e.height:e.emergeExit==='stay'||elapsed<0?e.height:Math.max(0,e.height*(1-elapsed/grow));
      r=rect(e,depth);
    }else{
      const a=along(e,t),low=Math.min(a,a+sign(e.side)*e.length);
      r=horizontal(e.side)?{x:low,y:0,w:e.length,h:e.height}:{x:0,y:low,w:e.height,h:e.length};
    }
    return r.w>0&&r.h>0?[{type:'wireArea',...r,warning:false,side:e.side,wireWidth:e.wireWidth??10,age}]:[];
  }
  function drawLine(c,x,y,x2,y2,width=10){
    const dx=x2-x,dy=y2-y,l=Math.hypot(dx,dy)||1;
    for(let k=-2;k<=2;k++){const ox=-dy/l*k*width*.21,oy=dx/l*k*width*.21;c.strokeStyle=k===0?'#c1f4ff':'#4caeff';c.lineWidth=width*(k===0?.21:.11);c.beginPath();c.moveTo(x+ox,y+oy);c.lineTo(x2+ox,y2+oy);c.stroke();}
  }
  function draw(c,s){
    c.save();c.beginPath();c.rect(0,0,300,300);c.clip();
    if(s.splitRow){c.beginPath();c.rect(s.x,s.y,s.w,s.h);c.clip();if(s.warning){c.fillStyle='rgba(255,66,103,.12)';c.fillRect(s.x,s.y,s.w,s.h);}}
    if(s.type==='wireLine')drawLine(c,s.x,s.y,s.x2,s.y2,s.r*2);
    else if(s.warning){c.strokeStyle='#ff4267';c.lineWidth=2;c.globalAlpha=.45+.45*Math.abs(Math.sin(s.age*15));c.strokeRect(s.x,s.y,s.w,s.h);c.font='bold 28px monospace';c.fillStyle='#ff5570';c.fillText('!',s.x+s.w/2-7,s.y+s.h/2+9);}
    else{
      c.fillStyle='rgba(76,174,255,.16)';c.fillRect(s.x,s.y,s.w,s.h);
      const h=horizontal(s.side),n=Math.max(1,Math.floor((h?s.h:s.w)/14));
      for(let i=0;i<=n;i++)h?drawLine(c,s.x,s.y+i*s.h/n,s.x+s.w,s.y+i*s.h/n,s.wireWidth):drawLine(c,s.x+i*s.w/n,s.y,s.x+i*s.w/n,s.y+s.h,s.wireWidth);
    }c.restore();
  }
  function settingsAt(events,time){
    const ordered=events.filter(e=>e&&['heartMode','vision'].includes(e.kind)&&e.t<=time).sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0));
    let mode='red',modeAt=-Infinity,vision={radius:1400,target:1400,enabled:false,t:0,duration:.35};
    let gravityDirection='down',turn={from:0,to:0,t:0,duration:0};
    const angleAt=t=>{const u=turn.duration?clamp((t-turn.t)/turn.duration,0,1):1;return turn.from+(turn.to-turn.from)*u*u*(3-2*u);};
    const radiusAt=t=>{
      const age=Math.max(0,t-vision.t);
      if(!vision.enabled)return Math.min(1400,vision.radius+1200*age/vision.duration);
      const radius=vision.target+(vision.radius-vision.target)*Math.exp(-5*age/vision.duration);
      return Math.abs(radius-vision.target)<.5?vision.target:radius;
    };
    for(const e of ordered){
      if(e.kind==='heartMode'){
        const next=e.mode==='blue'?'blue':'red',direction=next==='blue'?(e.gravityDirection||'down'):'down';
        if(next!==mode||direction!==gravityDirection){
          const from=angleAt(e.t),target=gravityAngles[direction],delta=((target-from+540)%360+360)%360-180;
          turn={from,to:from+delta,t:e.t,duration:e.gravityTurnDuration??.3};mode=next;gravityDirection=direction;modeAt=e.t;
        }
      }
      else{const from=radiusAt(e.t);vision={radius:from===1400&&e.enabled!==false?960:from,target:Math.max(30,e.radius??155),enabled:e.enabled!==false,t:e.t,duration:Math.max(.01,e.duration??1.2)};}
    }
    const radius=radiusAt(time);
    return {mode,gravityDirection,heartAngle:angleAt(time),heartTargetAngle:gravityAngles[gravityDirection],modeAt,modePulse:Math.max(0,1-(time-modeAt)/.34),vision:{radius,active:vision.enabled||radius<1400}};
  }
  const soulDefaults=Object.freeze({redSpeed:265,redSlowSpeed:130,blueSpeed:240,blueSlowSpeed:130,blueJumpHeight:63,blueJumpSpeed:Math.sqrt(2*690*63),blueJumpAcceleration:690,hitInvincibility:1});
  const soulLimit=key=>key==='hitInvincibility'?10:key==='blueJumpHeight'?284:key==='blueJumpAcceleration'?10000:2000;
  function soulSettings(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('全局心参数必须是对象。');
    const result={...soulDefaults,...value};
    if(value.blueJumpSpeed===undefined)result.blueJumpSpeed=Math.sqrt(2*result.blueJumpAcceleration*result.blueJumpHeight);
    for(const key of Object.keys(soulDefaults)){const min=key==='hitInvincibility'?0:1;if(typeof result[key]!=='number'||!Number.isFinite(result[key])||result[key]<min||result[key]>soulLimit(key))throw Error(`全局心参数 ${key} 必须在 ${min} 至 ${soulLimit(key)} 之间。`);}
    return result;
  }
  const gravityAngles={down:0,left:90,up:180,right:-90};
  function gravityPoint(p,direction){
    if(direction==='up')return {x:p.x,y:300-p.y};
    if(direction==='left')return {x:p.y,y:300-p.x};
    if(direction==='right')return {x:p.y,y:p.x};
    return {x:p.x,y:p.y};
  }
  function worldPoint(p,direction){
    if(direction==='left')return {x:300-p.y,y:p.x};
    return gravityPoint(p,direction);
  }
  function stepSoul(state,input,setting,dt,options=soulDefaults){
    const mode=typeof setting==='string'?setting:setting.mode,direction=mode==='blue'?(typeof setting==='string'?'down':setting.gravityDirection||'down'):'down';
    const local={...state,...(mode==='blue'?gravityPoint(state,direction):{})};
    if(state.mode!==mode||(state.gravityDirection||'down')!==direction){local.vy=0;local.grounded=false;local.jumpOrigin=null;local.jumpReleased=true;}
    const next=stepSoulLocal(local,input,mode,dt,options);
    return {...next,...(mode==='blue'?worldPoint(next,direction):{}),gravityDirection:direction};
  }
  function stepSoulLocal(state,input,mode,dt,options=soulDefaults){
    const config=soulSettings(options);
    const s={...state};if(s.mode!==mode){s.mode=mode;s.vy=0;s.grounded=false;s.jumpHold=0;s.jumpLatch=false;s.jumpOrigin=null;s.jumpReleased=true;}
    const dx=Number(!!input.right)-Number(!!input.left),up=!!input.up;
    if(mode==='blue'){
      s.x+=dx*(input.slow?config.blueSlowSpeed:config.blueSpeed)*dt;
      const launch=()=>{s.vy=-config.blueJumpSpeed;s.grounded=false;s.jumpHold=0;s.jumpOrigin=s.y;s.jumpReleased=false;};
      if(up&&s.grounded)launch();
      s.jumpLatch=up;
      // Cut upward momentum once on release; every hold duration has a distinct apex.
      if(!up&&!s.jumpReleased){if(s.vy<0)s.vy*=.25;s.jumpReleased=true;}
      // Resolve boundary contacts within the frame so landing can immediately start the next jump.
      let remaining=dt;
      while(remaining>1e-9){
        if(s.grounded)break;
        const held=up&&s.vy<0&&!s.jumpReleased,gravity=config.blueJumpAcceleration*(held?1:1120/690);
        const acceleration=s.vy>=520?0:gravity,ascending=s.vy<0;
        const apex=ascending?-s.vy/gravity:Infinity;
        let step=Math.min(remaining,apex,s.vy<520?(520-s.vy)/gravity:Infinity),contact=Infinity;
        const top=Math.max(8,s.jumpOrigin!=null&&s.y>=s.jumpOrigin-config.blueJumpHeight-1e-8?s.jumpOrigin-config.blueJumpHeight:8);
        if(ascending){
          const distance=Math.max(0,s.y-top),discriminant=s.vy*s.vy-2*gravity*distance;
          if(discriminant>=0)contact=2*distance/(-s.vy+Math.sqrt(discriminant));
        }else{
          const distance=Math.max(0,292-s.y);
          contact=distance===0?0:2*distance/(s.vy+Math.sqrt(s.vy*s.vy+2*acceleration*distance));
        }
        step=Math.min(step,contact);
        s.y+=s.vy*step+.5*acceleration*step*step;s.vy=Math.min(520,s.vy+acceleration*step);
        if(held)s.jumpHold+=step;remaining-=step;
        if(step===apex)s.vy=0;
        if(contact<=step+1e-9){
          s.y=ascending?top:292;s.vy=0;s.jumpReleased=true;
          if(!ascending){s.grounded=true;s.jumpOrigin=null;if(up)launch();}
        }
      }
    }else{const dy=Number(!!input.down)-Number(up),length=Math.hypot(dx,dy)||1,speed=input.slow?config.redSlowSpeed:config.redSpeed;s.x+=dx/length*speed*dt;s.y+=dy/length*speed*dt;}
    s.x=clamp(s.x,8,292);s.y=clamp(s.y,8,292);return s;
  }
  function drawVision(c,vision,x,y,w=960,h=540){
    if(!vision.active)return;
    const r=Math.max(0,vision.radius),gradient=c.createRadialGradient(x,y,r,x,y,r+32);
    gradient.addColorStop(0,'rgba(32,88,160,0)');gradient.addColorStop(1,'rgba(32,88,160,1)');
    c.save();c.fillStyle=gradient;c.fillRect(0,0,w,h);c.restore();
  }
  const api={gapPosition,frame,clipShape,draw,settingsAt,stepSoul,drawVision,soulDefaults,soulSettings,soulLimit,gravityPoint,gravityAngles};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartSans=api;
})(typeof globalThis!=='undefined'?globalThis:this);
