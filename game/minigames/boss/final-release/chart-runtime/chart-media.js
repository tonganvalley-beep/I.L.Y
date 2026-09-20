/* Shared image slots and Canvas fallback art for authoring and game playback. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./chart-model.js'):root.ChartModel;
  const P=typeof module!=='undefined'&&module.exports?require('./chart-playback.js'):root.ChartPlayback;
  const B=typeof module!=='undefined'&&module.exports?require('./chart-bullets.js'):root.ChartBullets;
  const slots={redHeart:'红心',blueHeart:'蓝心',laserEmitter:'激光发射器',...M.characterImages,...M.backgroundImages,...M.bulletTypes,flowerChain:'连锁花簇',finalWave:'最终治愈波',battleKey:'攻击键'};
  const hudDefaults={bossVisible:true,bossName:'BOSS',bossMaxHp:1000,bossX:.5,bossY:.14,bossWidth:360,bossHeight:16,bossShakeAmount:2,playerDamage:30};
  const hudLimits={bossMaxHp:[1,1000000000],bossX:[0,1],bossY:[0,1],bossWidth:[100,900],bossHeight:[8,40],bossShakeAmount:[0,60],playerDamage:[0,1000000000]};
  function hudSettings(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('血条全局参数必须是对象。');
    const config={...hudDefaults,...value};
    if(typeof config.bossVisible!=='boolean'||typeof config.bossName!=='string'||!config.bossName.trim()||config.bossName.length>32)throw Error('Boss 名称需为 1–32 字，血条显示需为开关值。');
    for(const [key,[low,high]]of Object.entries(hudLimits))if(!Number.isFinite(config[key])||config[key]<low||config[key]>high)throw Error(`${key} 需在 ${low}–${high} 范围内。`);
    return config;
  }
  function healthAt(motion,time){const u=Math.max(0,Math.min(1,(time-motion.t)/.22));return motion.to+(motion.from-motion.to)*Math.pow(1-u,3);}
  function healthChange(previous,hp,time){
    if(!previous)return {from:hp,to:hp,t:time,hitAt:-Infinity};
    if(hp===previous.to)return previous;
    return hp<previous.to?{from:healthAt(previous,time),to:hp,t:time,hitAt:time}:{from:hp,to:hp,t:time,hitAt:previous.hitAt};
  }
  function healthShake(c,motion,time,reducedMotion,amount=2){
    const age=time-motion.hitAt;
    if(!reducedMotion&&age>=0&&age<.24){const a=amount*(1-age/.24);c.translate(Math.cos(age*125)*a,Math.sin(age*149)*a*.6);}
  }
  function bossHudAt(events,time,config){
    const s={...hudSettings(config),bossBarMode:'auto'};
    for(const e of events.filter(e=>e.kind==='bossHud'&&e.t<=time).sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0))){s.bossBarMode=e.bossBarMode??'auto';s.bossShakeAmount=e.bossShakeMode==='custom'?e.bossShakeAmount:hudSettings(config).bossShakeAmount;}
    return s;
  }
  function bossPreview(events,time,config){
    const settings=hudSettings(config);let hp=settings.bossMaxHp,motion=healthChange(null,hp,0);
    for(const e of events.filter(e=>e.kind==='bossDamage'&&e.t<=time).sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0))){hp=Math.max(0,hp-(e.bossDamageAmount??100));const next=healthChange(motion,hp,e.t);if(next!==motion)next.shakeAmount=e.bossShakeMode==='custom'?e.bossShakeAmount:undefined;motion=next;}
    return {hp,maxhp:settings.bossMaxHp,motion};
  }
  function bossBar(c,stats,config,motion,time,reducedMotion=false,events=[]){
    const s=bossHudAt(events,time,config),alpha=s.bossBarMode==='show'?1:s.bossBarMode==='hide'?0:bossBarAlpha(motion,time);if(!s.bossVisible||alpha<=0)return null;
    const {x,y,w,h}=bossBarRect(s);
    c.save();c.globalAlpha*=alpha;if(motion)healthShake(c,motion,time,reducedMotion,motion.shakeAmount??s.bossShakeAmount);
    c.fillStyle='#ffffff';c.font='14px Zpix, ILYBulletPixel, monospace';c.textBaseline='bottom';c.textAlign='left';c.fillText(s.bossName,x,y-4,w*.4);
    c.textAlign='right';c.fillText(`${Math.ceil(stats.hp)} / ${Number(stats.maxhp.toFixed(2))}`,x+w,y-4,w*.55);
    c.fillStyle='#6ee89d';
    const displayed=motion?healthAt(motion,time):stats.hp;c.fillRect(x+2,y+2,(w-4)*Math.max(0,Math.min(1,displayed/stats.maxhp)),h-4);
    c.strokeStyle='#ffffff';c.lineWidth=2;c.strokeRect(x,y,w,h);c.restore();return {x,y,w,h};
  }
  function bossBarRect(config){const s=hudSettings(config),w=s.bossWidth,h=s.bossHeight;return {x:Math.max(8,Math.min(952-w,s.bossX*960-w/2)),y:Math.max(32,Math.min(506-h,s.bossY*540-h/2)),w,h};}
  function bossBarAlpha(motion,time){if(time>=330&&time<353)return 1;const age=time-(motion?.hitAt??-Infinity);return age<0||age>=3?0:age<2.7?1:1-(age-2.7)/.3;}
  function drawShield(c,shield,heart,time,impacts=[]){
    if(!shield.active)return;
    const {x,y}=heart,r=shield.radius;c.save();c.fillStyle='rgba(79,210,255,.07)';c.strokeStyle='#7be7ff';c.lineWidth=2;
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='rgba(210,250,255,.4)';c.lineWidth=1;c.beginPath();c.arc(x,y,r+3,0,Math.PI*2);c.stroke();
    for(const hit of impacts){const age=time-hit.t;if(age<0||age>.24)continue;const angle=Math.atan2(hit.y-y,hit.x-x);c.globalAlpha=1-age/.24;c.strokeStyle='#ffffff';c.lineWidth=3;c.beginPath();c.arc(x,y,r,angle-.13-age*.7,angle+.13+age*.7);c.stroke();}
    c.restore();
  }
  function drawEffects(c,events,time){
    for(const raw of events){if(raw.kind!=='slash'||time<raw.t)continue;const e=M.read(raw),u=(time-e.t)*e.slashSpeed/.45;if(u>=1)continue;
      const tip=-.5+Math.min(1,u/.42),tail=Math.max(-.5,tip-.78),width=Math.sin(Math.min(1,u/.5)*Math.PI/2)*.07;
      c.save();c.translate(e.slashX*960,e.slashY*540);c.rotate(M.rad(e.slashAngle));c.scale(e.slashSize,e.slashSize);c.globalAlpha*=Math.min(1,(1-u)/.45);
      c.fillStyle='#ff354b';c.beginPath();c.moveTo(tail,0);c.quadraticCurveTo((tail+tip)/2,-width*1.8,tip,0);c.quadraticCurveTo((tail+tip)/2,width,tail,0);c.fill();
      c.strokeStyle='#ffffff';c.lineWidth=.012;c.beginPath();c.moveTo(tail+.025,0);c.lineTo(tip,0);c.stroke();c.restore();
    }
  }
  const opacityAt=(s,time)=>s.from+(s.to-s.from)*(s.duration?Math.max(0,Math.min(1,(time-s.t)/s.duration)):1);
  function cinematicAt(events,time){
    const zero=()=>({from:0,to:0,t:0,duration:0});let white=zero(),blur=zero(),wash=zero(),images=[],battleVisible=true;const subtitles=[],animations=[];
    for(const raw of events.filter(e=>M.cinematic(e)&&e.t<=time).sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0))){
      const e=M.read(raw),fade=(state,to)=>({from:opacityAt(state,e.t),to,t:e.t,duration:e.screenFade});
      if(e.kind==='whiteScreen')white=fade(white,e.screenAction==='show'?1:0);
      if(e.kind==='screenBlur'){blur=fade(blur,e.screenAction==='show'?e.blurRadius:0);wash=fade(wash,e.screenAction==='show'?e.blurWhite:0);}
      if(e.kind==='battleVisibility')battleVisible=e.battleDisplay==='show';
      if(e.kind==='sceneImage'){
        images=images.map(s=>({...s,from:opacityAt(s,e.t),to:0,t:e.t,duration:e.screenFade})).filter(s=>s.from>0);
        if(e.sceneImageAction==='show')images.push({image:e.sceneImageSlot,fit:e.sceneImageFit,from:0,to:1,t:e.t,duration:e.screenFade});
      }
      if(e.kind==='subtitle'&&time<e.t+e.subtitleDuration){const age=time-e.t,remaining=e.subtitleDuration-age;subtitles.push({event:raw,e,alpha:Math.min(1,e.subtitleFadeIn?age/e.subtitleFadeIn:1,e.subtitleFadeOut?remaining/e.subtitleFadeOut:1)});}
      if(e.kind==='animation'&&time<e.t+e.animationDuration){const age=time-e.t,remaining=e.animationDuration-age;animations.push({event:raw,e,time:e.animationOffset+age*e.animationSpeed,alpha:Math.min(1,e.animationFadeIn?age/e.animationFadeIn:1,e.animationFadeOut?remaining/e.animationFadeOut:1)});}
    }
    return {blackBase:time>=P.phases.find(p=>p.id==='outro').start,white:opacityAt(white,time),blur:opacityAt(blur,time),wash:opacityAt(wash,time),battleVisible,images:images.map(s=>({...s,alpha:opacityAt(s,time)})).filter(s=>s.alpha>0),subtitles,animations};
  }
  function drawSceneImages(c,state,assets){
    if(state.blackBase){c.save();c.fillStyle='#000000';c.fillRect(0,0,960,540);c.restore();}
    for(let i=0;i<state.images.length;i++){const s=state.images[i],img=assets?.images.get(s.image);if(!img)continue;const w=img.naturalWidth,h=img.naturalHeight,scale=(s.fit==='contain'?Math.min:Math.max)(960/w,540/h),dw=s.fit==='stretch'?960:w*scale,dh=s.fit==='stretch'?540:h*scale;
      const remaining=1-state.images.slice(i+1).reduce((sum,next)=>sum+next.alpha,0),alpha=remaining>1e-8?Math.min(1,s.alpha/remaining):0;
      c.save();c.beginPath();c.rect(0,0,960,540);c.clip();c.globalAlpha*=alpha;c.drawImage(img,(960-dw)/2,(540-dh)/2,dw,dh);c.restore();}
  }
  const screenBuffers=new WeakMap();
  function drawScreenEffects(c,state){
    if(state.blur>.001&&c.canvas&&typeof document!=='undefined'){
      let buffers=screenBuffers.get(c.canvas);if(!buffers){buffers=[document.createElement('canvas'),document.createElement('canvas')];for(const b of buffers){b.width=960;b.height=540;}screenBuffers.set(c.canvas,buffers);}
      const [source,output]=buffers,a=source.getContext('2d'),b=output.getContext('2d'),m=c.getTransform();
      a.clearRect(0,0,960,540);a.drawImage(c.canvas,m.e,m.f,960*m.a,540*m.d,0,0,960,540);
      b.clearRect(0,0,960,540);b.save();b.filter=`blur(${state.blur}px)`;
      // Extend the scene past the edges before filtering, avoiding dark blur borders.
      const pad=state.blur*3;b.drawImage(source,0,0,960,540,-pad,-pad,960+pad*2,540+pad*2);b.restore();
      c.save();c.drawImage(output,0,0,960,540);c.restore();
    }
    for(const alpha of [state.wash,state.white])if(alpha>0){c.save();c.globalAlpha*=alpha;c.fillStyle='#ffffff';c.fillRect(0,0,960,540);c.restore();}
  }
  function subtitleLayout(c,s){
    const e=s.e||M.read(s.event),width=Math.min(944,e.subtitleWidth);let size=e.subtitleSize,lines=[];
    c.font=`${size}px Zpix, ILYBulletPixel, sans-serif`;const widest=Math.max(1,...Array.from(e.subtitleText).map(char=>c.measureText(char).width));if(widest>width)size*=width/widest;
    const wrap=()=>{c.font=`${size}px Zpix, ILYBulletPixel, sans-serif`;lines=[];for(const paragraph of e.subtitleText.split(/\r?\n/)){let line='';for(const char of Array.from(paragraph)){if(line&&c.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}lines.push(line);}return lines.length*size*1.35;};
    let h=wrap();while(h>508&&size>1){size=Math.max(1,size*508/h*.99);h=wrap();}
    const w=Math.min(width,Math.max(16,...lines.map(line=>c.measureText(line).width))),x=Math.max(8,Math.min(952-w,e.subtitleX*960-w/2)),y=Math.max(8,Math.min(532-h,e.subtitleY*540-h/2));
    return {x,y,w,h,size,lines,alpha:s.alpha,event:s.event,e};
  }
  function drawSubtitles(c,state){
    c.save();const layouts=state.subtitles.map(s=>subtitleLayout(c,s));
    for(const s of layouts){c.save();c.globalAlpha*=s.alpha;c.font=`${s.size}px Zpix, ILYBulletPixel, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=s.e.subtitleColor;c.strokeStyle='rgba(0,0,0,.65)';c.lineWidth=Math.max(1,s.size*.065);c.lineJoin='round';
      s.lines.forEach((line,i)=>{const y=s.y+(i+.5)*s.size*1.35;c.strokeText(line,s.x+s.w/2,y);c.fillText(line,s.x+s.w/2,y);});c.restore();}
    c.restore();return layouts;
  }
  // Replay only presentation cues so seeking and interrupted fades share one deterministic state.
  function presentationAt(events,time){
    let background={from:0,to:0,t:0,duration:0};const characters=new Map();
    for(const raw of events.filter(e=>M.presentation(e)&&e.t<=time).sort((a,b)=>a.t-b.t||(a.order||0)-(b.order||0))){
      const e=M.read(raw),duration=e.fadeDuration;
      if(e.kind==='background'){background={from:opacityAt(background,e.t),to:e.backgroundMode==='black'?1:0,t:e.t,duration};continue;}
      const previous=characters.get(e.characterId)||{from:0,to:0,t:0,duration:0};
      const next={...previous,event:raw};
      if(e.characterAction!=='hide')Object.assign(next,{image:e.characterImage,x:e.characterX*960,y:e.characterY*540,w:e.characterWidth,h:e.characterHeight});
      if(e.characterAction!=='set')Object.assign(next,{from:opacityAt(previous,e.t),to:e.characterAction==='show'?1:0,t:e.t,duration});
      characters.set(e.characterId,next);
    }
    return {black:opacityAt(background,time),characters:[...characters].sort(([a],[b])=>Number(a)-Number(b)).map(([id,s])=>({...s,id,alpha:opacityAt(s,time)}))};
  }
  function drawPresentation(c,state,assets){
    c.save();c.globalAlpha*=state.black;c.fillStyle='#000000';c.fillRect(0,0,960,540);c.restore();
    for(const s of state.characters)if(s.alpha>0&&s.image)assets?.draw(c,s.image,s.x,s.y,s.w,s.h,0,s.alpha);
  }
  function laserShake(shapes,time,reducedMotion=false){
    if(reducedMotion)return {x:0,y:0};let amplitude=0,age=0;
    for(const s of shapes){if(s.type!=='beam'||s.warning||s.safe)continue;const elapsed=time-s.event.t-s.start;
      if(elapsed>=0&&elapsed<.16){const a=2.4*(1-elapsed/.16);if(a>amplitude){amplitude=a;age=elapsed;}}
    }
    return {x:Math.cos(age*137)*amplitude,y:Math.sin(age*173+.5)*amplitude*.7};
  }
  function validate(assets={}){
    if(!assets||typeof assets!=='object'||Array.isArray(assets))throw Error('图片资源必须是对象。');
    for(const [key,value]of Object.entries(assets)){
      if(Object.hasOwn(M.animationSlots,key)){
        if(typeof value!=='string'||!value||value.length>90*1024*1024||!(/^(data:video\/(mp4|webm);base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s]+)$/i.test(value)||/^(?![a-z]+:|[\/\\])[^\s]+\.(mp4|webm)$/i.test(value)))throw Error(`动画 ${key} 需要 MP4 / WebM 路径或内嵌视频。`);
        continue;
      }
      if(!Object.hasOwn(slots,key))throw Error(`未知图片槽：${key}`);
      if(typeof value!=='string'||!value||value.length>6*1024*1024||!(/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s]+)$/i.test(value)||/^(?![a-z]+:|[\/\\])[^\s]+\.(png|jpe?g|webp)$/i.test(value)))throw Error(`图片 ${key} 需要 PNG / JPEG / WebP 图片路径或内嵌图片。`);
    }
    return assets;
  }
  class Assets{
    constructor(){this.images=new Map();this.values={};this.videoCanvases=new Map();}
    async load(values={},base){
      validate(values);this.stopVideos(true);this.base=base;this.values={...values};const images=new Map();this.images=images;
      await Promise.all(Object.entries(values).filter(([key])=>!Object.hasOwn(M.animationSlots,key)).map(([key,src])=>new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>{images.set(key,img);resolve();};img.onerror=()=>reject(Error(`图片加载失败：${key}`));img.src=base?new URL(src,base).href:src;
      })));
      return this;
    }
    stopVideos(clear=false){for(const entries of this.videoCanvases.values())for(const entry of entries.values()){entry.video.pause();if(clear){entry.video.removeAttribute('src');entry.video.load();}}if(clear)this.videoCanvases.clear();}
    drawAnimations(c,state,{playing=false,onFrame=()=>{}}={}){
      let entries=this.videoCanvases.get(c.canvas);if(!entries){entries=new Map();this.videoCanvases.set(c.canvas,entries);}const active=new Set();
      for(const [index,s]of (state.animations||[]).entries()){
        const e=s.e,key=`${e.chartId||e.t}:${e.order||0}:${index}:${e.animationSlot}`,src=e.animationSlot==='ending'?'assets/video/end.mp4':this.values[e.animationSlot];active.add(key);
        let entry=entries.get(key);
        if(src&&!entry){const video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;entry={video,playing:false,error:null,onFrame};entries.set(key,entry);
          video.addEventListener('loadeddata',()=>entry.onFrame());video.addEventListener('seeked',()=>{if(!entry.playing)entry.onFrame();});video.addEventListener('error',()=>{entry.error=`动画无法播放：${e.animationSlot}`;entry.onFrame();});video.src=new URL(src,e.animationSlot==='ending'?document.baseURI:this.base||document.baseURI).href;
        }
        c.save();c.globalAlpha*=s.alpha;c.fillStyle='#000000';c.fillRect(0,0,960,540);
        if(entry){entry.onFrame=onFrame;const v=entry.video;entry.playing=playing;
          if(v.readyState>=1){const end=Math.max(0,v.duration-1/60),target=Math.min(s.time,end);v.playbackRate=e.animationSpeed;
            if(!v.seeking&&Math.abs(v.currentTime-target)>(playing?.12:1/60))v.currentTime=target;
            if(playing&&s.time<end){if(v.paused&&!entry.starting){entry.starting=true;v.play().catch(()=>{}).finally(()=>{entry.starting=false;});}}else if(!v.paused)v.pause();
          }
          // Keep the last decoded frame visible while a musical-time seek buffers.
          if(v.readyState>=2&&!v.seeking){
            if(!entry.frame){entry.frame=document.createElement('canvas');entry.frame.width=v.videoWidth;entry.frame.height=v.videoHeight;}
            if(entry.frameTime!==v.currentTime){entry.frame.getContext('2d').drawImage(v,0,0);entry.frameTime=v.currentTime;}
          }
          if(entry.frame){const w=entry.frame.width,h=entry.frame.height,k=(e.animationFit==='cover'?Math.max:Math.min)(960/w,540/h),dw=e.animationFit==='stretch'?960:w*k,dh=e.animationFit==='stretch'?540:h*k;c.beginPath();c.rect(0,0,960,540);c.clip();c.drawImage(entry.frame,(960-dw)/2,(540-dh)/2,dw,dh);}
        }c.restore();
      }
      for(const [key,entry]of entries)if(!active.has(key)){entry.playing=false;entry.video.pause();}
    }
    draw(c,key,x,y,w,h,angle=0,alpha=1){
      const img=this.images.get(key);if(!img)return false;
      const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),width=img.naturalWidth*scale,height=img.naturalHeight*scale;
      c.save();c.translate(x,y);c.rotate(M.rad(angle));c.globalAlpha*=alpha;c.drawImage(img,-width/2,-height/2,width,height);c.restore();return true;
    }
  }
  function heart(c,x,y,mode='red',assets,angle=0){
    if(assets?.draw(c,mode==='blue'?'blueHeart':'redHeart',x,y,18,18,angle))return;
    c.save();c.translate(x,y);c.rotate(M.rad(angle));x=0;y=0;
    c.save();c.fillStyle=mode==='blue'?'#4caeff':'#ff3b3b';c.beginPath();
    c.arc(x-4,y-2,5,0,Math.PI*2);c.arc(x+4,y-2,5,0,Math.PI*2);
    c.moveTo(x-9,y+1);c.lineTo(x,y+9);c.lineTo(x+9,y+1);c.closePath();c.fill();
    c.fillStyle='#ffffff';c.beginPath();c.arc(x,y+1,2.2,0,Math.PI*2);c.fill();c.restore();c.restore();
  }
  function sprite(c,s,assets,chosen=false){
    if(!assets||s.warning||!['bullet','key'].includes(s.type))return false;
    const key=s.event.kind==='bullet'?s.event.bulletType:s.event.kind;
    if(!assets.draw(c,key,s.x,s.y,s.word||s.type==='key'?s.w:s.r*2,s.word||s.type==='key'?s.h:s.r*2,s.word||s.type==='key'?0:s.angle||0,s.alpha??1))return false;
    if(chosen){c.save();c.strokeStyle='#6ee7ff';c.lineWidth=1.5;c.strokeRect(s.x-(s.w||s.r*2)/2-3,s.y-(s.h||s.r*2)/2-3,(s.w||s.r*2)+6,(s.h||s.r*2)+6);c.restore();}return true;
  }
  function hurtHeart(c,x,y,mode,assets,age,reducedMotion=false,angle=0,invincibility=.32){
    if(!(age>=0&&(age<.32||age<invincibility))){heart(c,x,y,mode,assets,angle);return;}
    const fade=Math.max(0,1-age/.32),immune=age<invincibility;c.save();
    if(!reducedMotion){c.translate(Math.sin(age*100)*3*fade,Math.cos(age*80)*2*fade);if(immune)c.globalAlpha*=Math.floor(age/.055)%2?.3:1;}
    heart(c,x,y,mode,assets,angle);c.restore();
    if(fade===0&&!reducedMotion)return;
    c.save();c.globalAlpha*=reducedMotion&&immune?Math.max(fade,.5):fade;c.strokeStyle=mode==='blue'?'#b5eaff':'#ff7777';c.lineWidth=2;
    const r=reducedMotion?13:11+age*45;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();
    if(!reducedMotion)for(let i=0;i<6;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(x+Math.cos(a)*(r+3),y+Math.sin(a)*(r+3));c.lineTo(x+Math.cos(a)*(r+7),y+Math.sin(a)*(r+7));c.stroke();}
    c.restore();
  }
  const nativeHealth=new WeakMap();
  function healthBar(c,stats,box,feedback={}){
    const time=feedback.time??(typeof performance==='undefined'?0:performance.now()/1000);
    const motion=feedback.motion||healthChange(nativeHealth.get(stats),stats.hp,time);if(!feedback.motion)nativeHealth.set(stats,motion);
    const name='成田 基生',value=`${Math.ceil(stats.hp)} / ${Number(stats.maxhp.toFixed(2))}`,font=18;
    c.save();healthShake(c,motion,time,feedback.reducedMotion);c.font=`${font}px Zpix, ILYBulletPixel, monospace`;c.textBaseline='middle';c.textAlign='left';
    const nameWidth=c.measureText(name).width,valueWidth=c.measureText(value).width,barWidth=Math.min(150,box.w*.34),gap=12;
    const total=nameWidth+valueWidth+barWidth+gap*2,x=Math.max(12,Math.min(948-total,box.x+box.w/2-total/2)),y=Math.min(514,box.y+box.h+20),height=16,barX=x+nameWidth+gap;
    c.fillStyle='#ffffff';c.fillText(name,x,y+height/2);c.fillText(value,barX+barWidth+gap,y+height/2);
    c.fillStyle='#ffff00';c.fillRect(barX+2,y+2,(barWidth-4)*Math.max(0,Math.min(1,healthAt(motion,time)/(stats.maxhp||1))),height-4);
    c.strokeStyle='#ffffff';c.lineWidth=2;c.strokeRect(barX,y,barWidth,height);c.restore();
    return {x:barX,y,w:barWidth,h:height,name,value,nameX:x,valueX:barX+barWidth+gap};
  }
  function draw(c,s,assets,chosen=false){
    if(sprite(c,s,assets,chosen))return;
    if(s.refined){B.draw(c,s,chosen);return;}
    if(s.flower||['area','wireArea','wireLine'].includes(s.type)){P.drawPatternShape(c,s);return;}
    if(s.type==='beam'){P.drawBeam(c,s,chosen,assets);return;}
    if(s.type==='key'){P.drawKey(c,s,chosen);return;}
    c.save();const color=s.heal?(s.event.healEffect==='bossDamage'?'#ffb96b':s.event.healEffect==='damage'?'#ffd166':s.event.healEffect==='maxHp'?'#b6ff6b':'#79f2b0'):s.warning?'#c19cff':'#f3b9da',type=s.event.bulletType;
    c.fillStyle=color;c.strokeStyle=color;
    if(['boneStab','straight','gravity'].includes(type)){c.translate(s.x,s.y);c.rotate(M.rad(s.angle||0));c.fillRect(-8,-2,16,4);}
    else{c.beginPath();c.arc(s.x,s.y,s.r,0,Math.PI*2);s.warning||type==='bubble'?c.stroke():c.fill();}
    c.restore();if(type==='word'){c.save();c.fillStyle=color;c.font='14px system-ui';c.fillText(s.event.text,s.x+6,s.y);c.restore();}
    if(chosen){c.save();c.strokeStyle='#6ee7ff';c.lineWidth=2;c.beginPath();c.arc(s.x,s.y,s.r+5,0,Math.PI*2);c.stroke();c.restore();}
  }
  const api={slots,validate,Assets,heart,hurtHeart,healthBar,sprite,draw,presentationAt,drawPresentation,laserShake,hudDefaults,hudLimits,hudSettings,bossHudAt,healthAt,healthChange,bossBar,bossBarRect,bossBarAlpha,bossPreview,drawEffects,drawShield,cinematicAt,drawSceneImages,drawScreenEffects,subtitleLayout,drawSubtitles};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartMedia=api;
})(typeof globalThis!=='undefined'?globalThis:this);
