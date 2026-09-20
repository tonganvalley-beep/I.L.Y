/* Executable chart contract; shared with the editor, no native emitter translation. */
(function(root){
  'use strict';
  const get=name=>typeof module!=='undefined'&&module.exports?require('./chart-'+name.toLowerCase()+'.js'):root['Chart'+name];
  const M=get('Model'),P=get('Playback'),S=get('Sans'),T=get('Timing'),Media=get('Media');
  const origins={center:{x:330,y:120},left:{x:150,y:120},right:{x:510,y:120}};
  const contract={id:'danmu-boss-chart',version:1,stage:{width:960,height:540},box:{width:300,height:300},origins,heart:{width:18,height:18,hitRadius:5},coordinates:'normalized-box',timeUnit:'seconds'};
  const transitionDuration=1.8;
  const sceneCues=[[0,'right'],[80,'left'],[107,'right'],[136,'left'],[158,'right'],[171,'left'],[190,'right'],[294,'left'],[330,'center']];
  function sceneAt(time){
    let index=0;while(index+1<sceneCues.length&&sceneCues[index+1][0]<=time)index++;
    const [start,side]=sceneCues[index],previous=origins[sceneCues[Math.max(0,index-1)][1]],target=origins[side];
    const progress=index?Math.max(0,Math.min(1,(time-start)/transitionDuration)):1,eased=progress*progress*(3-2*progress);
    const main={x:previous.x+(target.x-previous.x)*eased,y:120};
    const phaseIndex=Math.min(6,P.phases.indexOf(P.phaseAt(time))),phaseStart=P.phases[phaseIndex].start;
    const phaseProgress=phaseIndex?Math.max(0,Math.min(1,(time-phaseStart)/transitionDuration)):1;
    return {main,origins:{...origins,center:main},side,dual:time>=171&&time<190+transitionDuration,heartBoxIds:time>=171&&time<190?['right']:null,
      moving:progress<1,progress,phaseIndex,fromPhase:phaseProgress<1?phaseIndex-1:phaseIndex,
      phaseTransition:phaseProgress<1,blend:phaseProgress*phaseProgress*(3-2*phaseProgress)};
  }
  const viewportAt=time=>id=>{const o=sceneAt(time).origins[id]||sceneAt(time).main;return {x:-o.x,y:-o.y,w:960,h:540};};
  function difficulty(value='normal'){if(!['normal','story'].includes(value))throw Error('难度必须为 normal 或 story。');return value;}
  function validate(chart){
    if(!chart||!Array.isArray(chart.events))throw Error('谱面需要 events 数组。');
    if(chart.runtime&&JSON.stringify(chart.runtime)!==JSON.stringify(contract)){
      const c=chart.runtime;
      if(c.id!==contract.id||c.version!==1||c.stage?.width!==960||c.stage?.height!==540||c.box?.width!==300||c.box?.height!==300||Object.keys(origins).some(k=>c.origins?.[k]?.x!==origins[k].x||c.origins?.[k]?.y!==origins[k].y)||c.heart?.width!==18||c.heart?.height!==18||c.heart?.hitRadius!==5||c.coordinates!==contract.coordinates||c.timeUnit!=='seconds')throw Error('谱面舞台 / 战斗框契约不匹配。');
    }
    if(chart.duration!==undefined&&(!Number.isFinite(chart.duration)||chart.duration<=0||chart.duration>445.669))throw Error('ILY 谱面总时长无效。');
    S.soulSettings(chart.soulSettings);Media.validate(chart.assets);Media.hudSettings(chart.hudSettings);
    difficulty(chart.difficulty);
    const rows=chart.events.map((e,i)=>{
      if(!e||!Object.hasOwn(M.fields[0].choices,e.kind))throw Error(`事件 ${i+1} 不支持：${e?.kind}`);
      const event=M.build(M.read(e),e.t,e);
      if(event.t>(chart.duration??445.668889))throw Error(`事件 ${i+1} 超出歌曲时长。`);
      return {id:i,event};
    });
    const timing=T.resolve(rows);if(timing.issues.length)throw Error(timing.issues.join('\n'));return rows;
  }
  const shapeId=s=>`${s.rowId}:${s.type}:${s.volley??0}:${s.group??0}:${s.beamIndex??s.index??0}`;
  function lineDistance(p,x,y,x2,y2){const dx=x2-x,dy=y2-y,u=Math.max(0,Math.min(1,((p.x-x)*dx+(p.y-y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-x-dx*u,p.y-y-dy*u);}
  function collides(s,p,r=5){
    if(s.warning||s.safe||s.exiting||s.phase&&s.phase!=='active')return false;
    if(s.shieldClip&&Math.hypot(p.x-s.shieldClip.x,p.y-s.shieldClip.y)<=s.shieldClip.r+r)return false;
    if(s.type==='beam'){const a=M.rad(s.angle);return s.dangerous&&lineDistance(p,s.x,s.y,s.x+Math.cos(a)*s.length,s.y+Math.sin(a)*s.length)<r+(s.visualWidth??s.width)/2;}
    if(s.type==='wireLine')return lineDistance(p,s.x,s.y,s.x2,s.y2)<r+s.r;
    if(['area','wireArea','key'].includes(s.type)||s.word){
      const centered=s.type==='key'||s.word,cx=s.x+(centered?0:s.w/2),cy=s.y+(centered?0:s.h/2),a=M.rad(-(s.rotation||0)),dx=p.x-cx,dy=p.y-cy,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
      return Math.hypot(Math.max(0,Math.abs(x)-s.w/2),Math.max(0,Math.abs(y)-s.h/2))<=r;
    }
    return Math.hypot(s.x-p.x,s.y-p.y)<r+s.r;
  }
  function shieldAt(events,time){
    const ordered=events.filter(e=>e.kind==='shield'&&e.t<=time).sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0)),e=ordered.at(-1);
    return {active:!!e&&e.shieldMode!=='off',radius:e?.shieldRadius??60,t:e?.t??0};
  }
  function truncateBeam(s,heart,radius){
    if(s.warning||s.safe)return s;
    const a=M.rad(s.angle),dx=Math.cos(a),dy=Math.sin(a),hx=heart.x-s.x,hy=heart.y-s.y,along=hx*dx+hy*dy,across=hx*-dy+hy*dx,half=(s.visualWidth??s.width)/2;
    if(lineDistance(heart,s.x,s.y,s.x+dx*s.length,s.y+dy*s.length)>radius+half)return s;
    const length=Math.max(0,Math.min(s.length,along-Math.sqrt(Math.max(0,radius*radius-across*across))));
    const end={x:s.x+dx*length,y:s.y+dy*length},vx=end.x-heart.x,vy=end.y-heart.y,n=Math.hypot(vx,vy)||1;
    return {...s,length,shieldClip:{x:heart.x,y:heart.y,r:radius},shieldImpact:{x:heart.x+vx/n*radius,y:heart.y+vy/n*radius,angle:Math.atan2(vy,vx)}};
  }
  function segmentRect(a,b,rect,rx=0,ry=rx){
    let low=0,high=1;
    for(const [p,d,min,max]of [[a.x,b.x-a.x,rect.x-rx,rect.x+rect.w+rx],[a.y,b.y-a.y,rect.y-ry,rect.y+rect.h+ry]]){
      if(Math.abs(d)<1e-9){if(p<min||p>max)return false;continue;}
      const v=(min-p)/d,w=(max-p)/d;low=Math.max(low,Math.min(v,w));high=Math.min(high,Math.max(v,w));if(low>high)return false;
    }return true;
  }
  function sweptCircleRect(a,b,rect,r){
    if(segmentRect(a,b,{x:rect.x-r,y:rect.y,w:rect.w+2*r,h:rect.h})||segmentRect(a,b,{x:rect.x,y:rect.y-r,w:rect.w,h:rect.h+2*r}))return true;
    return [rect.x,rect.x+rect.w].some(x=>[rect.y,rect.y+rect.h].some(y=>lineDistance({x,y},a.x,a.y,b.x,b.y)<=r));
  }
  class CounterAttack{
    constructor(consumed=new Set(),damage=()=>{},reward=()=>{},attackDamage=()=>Media.hudDefaults.playerDamage){this.consumed=consumed;this.damage=damage;this.reward=reward;this.attackDamage=attackDamage;this.hits=new Map();this.shots=[];this.bursts=[];this.shields=[];this.nextShot=0;}
    breakKey(s,time,player){
      const id=shapeId(s);if(this.consumed.has(id))return;this.consumed.add(id);this.bursts.push({x:s.x,y:s.y,boxId:s.boxId,t:time,player});
      if(player){this.damage(this.attackDamage(),time,s.event);this.reward();if(s.event.keyShieldRadius>0&&s.event.keyShieldDuration>0)this.shields.push({radius:s.event.keyShieldRadius,t:time,end:time+s.event.keyShieldDuration});}
    }
    shield(base,time){this.shields=this.shields.filter(s=>s.end>time);const radius=Math.max(base.active?base.radius:0,...this.shields.map(s=>s.radius));return {...base,active:radius>0,radius};}
    step(shapes,heart,time,dt,fire){
      const targets=shapes.filter(s=>s.counter&&!this.consumed.has(shapeId(s)));this.bursts=this.bursts.filter(s=>time-s.t<.35);
      if(fire&&time>=this.nextShot-1e-8&&targets.length){for(const boxId of new Set(targets.map(s=>s.boxId)))this.shots.push({x:heart.x,y:heart.y-13,boxId});this.nextShot=time+.2;}
      for(const shot of this.shots){const oldY=shot.y;shot.y-=600*dt;
        const target=targets.filter(s=>s.boxId===shot.boxId&&!this.consumed.has(shapeId(s))&&lineDistance(s,shot.x,oldY,shot.x,shot.y)<=s.r+3).sort((a,b)=>b.y-a.y)[0];
        if(target){shot.dead=true;const id=shapeId(target),hits=(this.hits.get(id)?.count??0)+1;this.hits.set(id,{count:hits,t:time});if(hits>=target.event.keyHitsRequired)this.breakKey(target,time,true);}
      }
      this.shots=this.shots.filter(s=>!s.dead&&s.y>=-310);
      return shapes.filter(s=>!this.consumed.has(shapeId(s))).map(s=>{if(!s.counter)return s;const hit=this.hits.get(shapeId(s));return {...s,hitsLeft:s.event.keyHitsRequired-(hit?.count??0),hitAge:time-(hit?.t??-Infinity)};});
    }
    breakByLasers(shapes,time,places){
      const beams=shapes.filter(s=>s.type==='beam'&&s.dangerous&&!s.exiting&&!s.warning&&!s.safe&&s.event.laserBreakKeys==='on');
      for(const target of shapes.filter(s=>s.counter)){const o=places[target.boxId]||places.center;
        if(beams.some(s=>{const b=places[s.boxId]||places.center;return collides(s,{x:target.x+o.x-b.x,y:target.y+o.y-b.y},target.r);} ))this.breakKey(target,time,false);
      }return shapes.filter(s=>!this.consumed.has(shapeId(s)));
    }
    draw(c,time,places){
      c.save();c.fillStyle='#9cecff';for(const s of this.shots){const o=places[s.boxId]||places.center;c.fillRect(o.x+s.x-2,o.y+s.y-8,4,16);}
      for(const s of this.bursts){const o=places[s.boxId]||places.center,age=time-s.t;c.globalAlpha=Math.max(0,1-age/.35);c.strokeStyle=s.player?'#a6e8ff':'#ff90b5';c.lineWidth=2;
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=12+age*100,x=o.x+s.x+Math.cos(a)*r,y=o.y+s.y+Math.sin(a)*r;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*8,y+Math.sin(a)*8);c.stroke();}}
      c.restore();
    }
  }
  class Defense{
    constructor(consumed=new Set(),damage=()=>{}){this.consumed=consumed;this.damage=damage;this.previous=new Map();this.contacts=new Map();this.impacts=[];this.previousHeart=null;this.previousShield=false;}
    process(shapes,heart,shield,time,places,bossRect){
      const result=[],previous=new Map(),contacts=new Map();this.impacts=this.impacts.filter(h=>time-h.t<.24);
      for(const raw of shapes){
        const id=shapeId(raw),o=places[raw.boxId]||places.center,old=this.previous.get(id);previous.set(id,{shape:raw,origin:o});if(this.consumed.has(id))continue;
        let s=raw;
        if(shield.active&&s.type!=='key'){
          if(s.type==='beam'){
            s=truncateBeam(s,heart,shield.radius);
            if(s.shieldImpact){const start=this.contacts.get(id)??time;contacts.set(id,start);s={...s,shieldImpact:{...s.shieldImpact,age:time-start}};}
          }else{
            const a=old&&this.previousHeart?{x:old.shape.x-this.previousHeart.x,y:old.shape.y-this.previousHeart.y}:null,b={x:s.x-heart.x,y:s.y-heart.y};
            const swept=s.type==='bullet'&&!s.warning&&old&&!old.shape.warning&&this.previousShield&&a&&(s.word?sweptCircleRect(a,b,{x:-s.w/2,y:-s.h/2,w:s.w,h:s.h},shield.radius):lineDistance({x:0,y:0},a.x,a.y,b.x,b.y)<=shield.radius+(s.r||0));
            if(collides(s,heart,shield.radius)||swept){this.consumed.add(id);this.impacts.push({x:s.x,y:s.y,t:time,boxId:s.boxId});continue;}
          }
        }
        if(s.heal&&s.event.healEffect==='bossDamage'&&!s.warning&&bossRect){
          const p={x:s.x+o.x,y:s.y+o.y},before=old?{x:old.shape.x+old.origin.x,y:old.shape.y+old.origin.y}:p;
          if(s.word?segmentRect(before,p,bossRect,s.w/2,s.h/2):sweptCircleRect(before,p,bossRect,s.r||0)){this.consumed.add(id);this.damage(s.event.bossHitDamage??3,time,s.event);continue;}
        }
        result.push(s);
      }
      this.previous=previous;this.contacts=contacts;this.previousHeart={...heart};this.previousShield=shield.active;return result;
    }
  }
  // Only simulate intervals that can absorb bullets or hit the boss; ordinary seeking remains direct.
  class InteractionPreview{
    reset(source,rows,config,moving){
      this.rows=rows.map(r=>({id:r.id,event:r.event}));this.path=source.path;this.pathLength=source.path.length;this.soul=source.soulSettings;this.config=JSON.stringify(config);this.moving=moving;this.time=-Infinity;
      this.player=new P.Player();this.player.setSoulSettings(source.soulSettings);this.player.setPath(source.path);this.player.sync(rows);
      this.hud=Media.hudSettings(config);this.hp=this.hud.bossMaxHp;this.motion=Media.healthChange(null,this.hp,0);this.cues=this.player.events.filter(e=>e.kind==='bossDamage').sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0));this.cursor=0;
      const damage=(amount,time,event={})=>{this.hp=Math.max(0,this.hp-amount);const motion=Media.healthChange(this.motion,this.hp,time);if(motion!==this.motion)motion.shakeAmount=event.bossShakeMode==='custom'?event.bossShakeAmount:undefined;this.motion=motion;};this.damage=damage;this.defense=new Defense(new Set(),damage);this.stats={attackDamage:this.hud.playerDamage,damageBonus:0};this.counter=new CounterAttack(this.defense.consumed,damage,()=>{},()=>this.stats.attackDamage);this.lastStep=null;
      this.actions=source.attackTimes;this.actionLength=source.attackTimes?.length??0;this.actionCursor=0;
      const shields=this.player.events.filter(e=>e.kind==='shield').sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0)),windows=shields.flatMap((e,i)=>e.shieldMode==='off'?[]:[[e.t,shields[i+1]?.t??445.669]]),ranges=[];
      for(const row of rows){if(!row.event||!M.canEnd(row.event))continue;const entry=this.player.entry(row.event);if(!entry.e)continue;
        const start=entry.range[0],end=this.player.timing.ends.get(this.player.sourceRows.find(r=>r.id===row.id))+M.exitSpan(entry.e);
        if(M.healing(entry.e)&&['bossDamage','damage'].includes(entry.e.healEffect))ranges.push([Math.max(0,start),Math.min(445.669,end)]);
        if(entry.e.keyStyle==='counter')ranges.push([Math.max(0,start),Math.min(445.669,end+entry.e.keyShieldDuration+1)]);
        for(const [a,b]of windows)if(Math.max(start,a)<Math.min(end,b))ranges.push([Math.max(0,start,a),Math.min(445.669,end,b)]);
      }
      this.intervals=[];for(const range of ranges.sort((a,b)=>a[0]-b[0])){const last=this.intervals.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else this.intervals.push(range);}
    }
    frame(source,rows,time,config,moving=true,frame=null){
      if(this.actions!==source.attackTimes||(source.attackTimes?.length??0)<(this.actionLength??0))this.rows=null;
      if(!this.rows||time<this.time||this.path!==source.path||source.path.length<this.pathLength||this.soul!==source.soulSettings||this.config!==JSON.stringify(config)||moving!==this.moving||rows.length!==this.rows.length||rows.some((r,i)=>r.id!==this.rows[i].id||r.event!==this.rows[i].event))this.reset(source,rows,config,moving);
      this.pathLength=source.path.length;this.actionLength=source.attackTimes?.length??0;
      this.player.extendPath(source.path);
      const places=t=>moving?sceneAt(t).origins:origins,cues=t=>{while(this.cursor<this.cues.length&&this.cues[this.cursor].t<=t){const e=this.cues[this.cursor++];this.damage(e.bossDamageAmount??100,e.t,e);}},process=(f,t)=>{
        if(!Media.cinematicAt(this.player.events,t).battleVisible){cues(t);this.lastStep=t;this.defense.previous.clear();f.shield={active:false,radius:0};return f;}
        cues(t);let fire=false;while(this.actionCursor<(source.attackTimes?.length??0)&&source.attackTimes[this.actionCursor]<=t+1e-8){fire=fire||t-source.attackTimes[this.actionCursor]<=1/120+1e-8;this.actionCursor++;}
        collectDamageBoosts(f.shapes,f.heart,this.counter.shield(shieldAt(this.player.events,t),t),this.stats,this.defense.consumed,t);
        f.shapes=this.counter.step(f.shapes,f.heart,t,this.lastStep===null?0:Math.min(1/120,Math.max(0,t-this.lastStep)),fire);this.lastStep=t;
        f.shield=this.counter.shield(shieldAt(this.player.events,t),t);f.shapes=this.defense.process(f.shapes,f.heart,f.shield,t,places(t),Media.bossBarRect(this.hud));f.shapes=this.counter.breakByLasers(f.shapes,t,places(t));return f;
      };
      for(const [start,end]of this.intervals){if(end<this.time||start>time)continue;let t=Math.max(start,this.time),limit=Math.min(end,time);
        if(t===start&&this.time<start)process(this.player.frame(this.rows,t,viewportAt(t)),t);
        while(t<limit-1e-9){t=limit-(t+1/120)<1e-9?limit:t+1/120;process(this.player.frame(this.rows,t,viewportAt(t)),t);}
      }
      cues(time);this.time=time;const result=process(frame||source.frame(rows,time,viewportAt(time)),time);
      return {...result,boss:{hp:this.hp,maxhp:this.hud.bossMaxHp,motion:this.motion},stats:{...this.stats},impacts:this.defense.impacts};
    }
  }
  function heal(stats,e,time=0){if(e.healEffect==='bossDamage')return;const amount=e.heal??3;if(e.healEffect==='damage'){stats.damageBonus=(stats.damageBonus??0)+amount;stats.attackDamage=(stats.attackDamage??Media.hudDefaults.playerDamage)+amount;if(amount>0){stats.damageBonusGain=(stats.damageBonusAt===time?stats.damageBonusGain:0)+amount;stats.damageBonusAt=time;}return;}if(e.healEffect==='maxHp')stats.maxhp+=amount;stats.hp=Math.min(stats.maxhp,stats.hp+amount);}
  function collectDamageBoosts(shapes,heart,shield,stats,consumed,time){
    for(const s of shapes)if(s.heal&&s.event.healEffect==='damage'&&!consumed.has(shapeId(s))&&collides(s,heart)&&!(shield.active&&collides(s,heart,shield.radius))){heal(stats,s.event,time);consumed.add(shapeId(s));}
  }
  function damageBonusNotice(stats,time){return time>=stats.damageBonusAt&&time-stats.damageBonusAt<3?`伤害加成 +${Number(stats.damageBonusGain.toFixed(2))}`:'';}
  class Session{
    constructor(chart,assets=new Media.Assets()){
      this.rows=validate(chart);this.chart=structuredClone(chart);this.assets=assets;this.duration=chart.duration??445.668889;this.difficulty=difficulty(chart.difficulty);this.reset();
    }
    reset(){
      this.player=new P.Player();this.player.setSoulSettings(this.chart.soulSettings);this.player.sync(this.rows);
      this.soul={x:150,y:210,mode:'red',vy:0,grounded:false,jumpLatch:false,jumpHold:0};
      this.player.path=[{t:0,x:150,y:210}];this.time=0;this.consumed=new Set();this.stats={hp:40,maxhp:40,bossDamage:0,keyHits:0,damageBonus:0};this.invUntil=0;this.confirmDown=false;this.keyPress=null;this.finished=false;this.dead=false;
      this.lastHit=-Infinity;this.current=this.player.frame(this.rows,0,viewportAt(0));
      this.cinematic=Media.cinematicAt(this.player.events,0);
      this.hud=Media.hudSettings(this.chart.hudSettings);this.stats.bossHp=this.stats.bossMaxHp=this.hud.bossMaxHp;
      this.stats.attackDamage=this.hud.playerDamage;this.stats.damageBonusAt=-Infinity;this.stats.damageBonusGain=0;
      this.playerHealth=Media.healthChange(null,this.stats.hp,0);this.bossHealth=Media.healthChange(null,this.stats.bossHp,0);
      this.damageCues=this.rows.map(r=>r.event).filter(e=>e.kind==='bossDamage').sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0));this.damageCursor=0;this.applyDamageCues(0);
      this.counter=new CounterAttack(this.consumed,(amount,time,event)=>this.damageBoss(amount,time,event),()=>this.stats.keyHits++,()=>this.stats.attackDamage);
      this.defense=new Defense(this.consumed,(amount,time,event)=>this.damageBoss(amount,time,event));this.current=this.applyDefense(this.current);
    }
    applyDefense(frame,dt=0,fire=false){if(!this.cinematic.battleVisible)return frame;const places=sceneAt(this.time).origins;collectDamageBoosts(frame.shapes,this.soul,this.counter.shield(shieldAt(this.player.events,this.time),this.time),this.stats,this.consumed,this.time);frame.shapes=this.counter.step(frame.shapes,this.soul,this.time,dt,fire);this.shield=this.counter.shield(shieldAt(this.player.events,this.time),this.time);frame.shapes=this.defense.process(frame.shapes,this.soul,this.shield,this.time,places,Media.bossBarRect(this.hud));frame.shapes=this.counter.breakByLasers(frame.shapes,this.time,places);return frame;}
    damageBoss(amount,time=this.time,event={}){
      this.stats.bossDamage+=amount;this.stats.bossHp=Math.max(0,this.stats.bossHp-amount);
      const motion=Media.healthChange(this.bossHealth,this.stats.bossHp,time);if(motion!==this.bossHealth)motion.shakeAmount=event.bossShakeMode==='custom'?event.bossShakeAmount:undefined;this.bossHealth=motion;
    }
    applyDamageCues(time){while(this.damageCursor<this.damageCues.length&&this.damageCues[this.damageCursor].t<=time){const e=this.damageCues[this.damageCursor++];this.damageBoss(e.bossDamageAmount,e.t,e);}}
    drawHud(c,{reducedMotion=false,time=this.time}={}){
      if(!this.cinematic.battleVisible)return;
      const o=sceneAt(this.time).main;
      Media.healthBar(c,this.stats,{...o,w:300,h:300},{motion:this.playerHealth,time,reducedMotion});
      Media.bossBar(c,{hp:this.stats.bossHp,maxhp:this.stats.bossMaxHp},this.hud,this.bossHealth,time,reducedMotion,this.player.events);
    }
    visible(frame=this.current){return frame.shapes.filter(s=>!this.consumed.has(shapeId(s)));}
    setDifficulty(value){this.difficulty=difficulty(value);}
    advance(time,input={}){
      if(!Number.isFinite(time)||time<this.time-1e-6)throw Error('游戏时钟只能前进；重播请重置谱面。');
      const end=Math.min(time,this.duration),confirm=!!input.confirm;
      if(confirm&&!this.confirmDown)this.keyPress=end;this.confirmDown=confirm;
      while(this.time<end-1e-9&&!this.dead){
        const step=this.time+1/120,next=end-step<1e-9?end:step,dt=next-this.time;
        const mode=S.settingsAt(this.player.events,next);
        this.cinematic=Media.cinematicAt(this.player.events,next);
        if(this.cinematic.battleVisible)this.soul=S.stepSoul(this.soul,input,mode,dt,this.player.soulSettings);this.time=next;
        this.applyDamageCues(next);
        this.player.path.push({t:next,x:this.soul.x,y:this.soul.y});
        this.current=this.applyDefense(this.player.frame(this.rows,next,viewportAt(next)),dt,!!input.fire);
        if(!this.cinematic.battleVisible)continue;
        for(const s of this.visible()){
          if(!collides(s,this.soul))continue;
          if(s.type==='key'){
            if(s.counter)continue;
            if(this.keyPress!==null&&Math.abs(this.keyPress-s.event.t)<=.055&&Math.abs(next-this.keyPress)<=.055){this.stats.keyHits++;this.damageBoss((s.event.damage??1)+this.stats.damageBonus);this.consumed.add(shapeId(s));this.keyPress=null;}
          }else if(s.heal){if(s.event.healEffect==='bossDamage')continue;heal(this.stats,s.event,next);this.consumed.add(shapeId(s));}
          else if(next>=this.invUntil&&!sceneAt(next).moving&&(s.event.damage??1)>0){
            const floor=this.difficulty==='story'?Math.min(5,this.stats.hp):0;
            this.stats.hp=Math.max(floor,this.stats.hp-(s.event.damage??1));this.invUntil=next+this.player.soulSettings.hitInvincibility;this.lastHit=next;
            if(s.type==='bullet')this.consumed.add(shapeId(s));
            if(this.stats.hp<=0){this.dead=true;break;}
          }
        }
        this.playerHealth=Media.healthChange(this.playerHealth,this.stats.hp,this.time);
      }
      this.finished=!this.dead&&this.time>=this.duration-1e-9;return this.current;
    }
    boxes(){const boxes=new Set(this.current.shapes.map(s=>s.boxId));boxes.add('center');if(sceneAt(this.time).dual)boxes.add('right');return [...boxes];}
    draw(c,{reducedMotion=false}={}){
      Media.drawSceneImages(c,this.cinematic,this.assets);
      Media.drawPresentation(c,Media.presentationAt(this.player.events,this.time),this.assets);
      if(!this.cinematic.battleVisible)return;
      const shake=Media.laserShake(this.current.shapes,this.time,reducedMotion);c.save();c.translate(shake.x,shake.y);
      const boxes=this.boxes(),layout=sceneAt(this.time),places=layout.origins;
      const unique=[...new Map(boxes.map(id=>{const o=places[id];return [`${o.x}:${o.y}`,o];})).values()];
      const heartOrigins=[...new Map(boxes.filter(id=>!layout.heartBoxIds||layout.heartBoxIds.includes(id)).map(id=>{const o=places[id];return [`${o.x}:${o.y}`,o];})).values()];
      for(const o of unique){c.fillStyle='#000000';c.fillRect(o.x,o.y,300,300);c.strokeStyle='#8296b8';c.lineWidth=2;c.strokeRect(o.x,o.y,300,300);}
      for(const s of this.visible()){const o=places[s.boxId];c.save();c.translate(o.x,o.y);Media.draw(c,s,this.assets);c.restore();}
      this.counter.draw(c,this.time,places);
      for(const o of heartOrigins){c.save();c.translate(o.x,o.y);Media.hurtHeart(c,this.soul.x,this.soul.y,this.current.settings.mode,this.assets,this.time-this.lastHit,reducedMotion,reducedMotion?this.current.settings.heartTargetAngle:this.current.settings.heartAngle,this.player.soulSettings.hitInvincibility);c.restore();}
      for(const o of unique){c.save();c.translate(o.x,o.y);S.drawVision(c,this.current.settings.vision,this.soul.x,this.soul.y,300,300);c.strokeStyle='#8296b8';c.lineWidth=2;c.strokeRect(0,0,300,300);c.restore();}
      for(const o of unique){c.save();c.translate(o.x,o.y);Media.drawShield(c,this.shield,this.soul,this.time,this.defense.impacts);c.restore();}
      c.restore();
    }
  }
  const api={contract,origins,sceneAt,viewportAt,transitionDuration,difficulty,validate,shapeId,collides,heal,damageBonusNotice,Session,shieldAt,truncateBeam,segmentRect,Defense,CounterAttack,InteractionPreview};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
