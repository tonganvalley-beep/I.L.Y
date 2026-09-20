/* Editor schema. Seconds, degrees, px/s; normalized positions within a 300×300 reference box. */
(function (root) {
  'use strict';
  const bulletTypes = {
    straight: '直线针弹', ring: '环形缺口', fan: '扇形散射', curtain: '留缝弹墙',
    chase: '追踪火弹 / 延迟追踪针', gravity: '重力雨 / 弹跳钢琴', ambush: '边缘伏击',
    bubble: '扩散泡泡', boneStab: '边缘骨刺', healArc: '治愈弧', healRain: '治愈雨',
    healSpiral: '呼吸螺旋治愈', word: '词条弹'
  };
  const laserModes = {
    fixed: '单束 · 固定方向', aimOnce: '单束 · 锁定一次后发射', trackAngle: '单束 · 限时跟随角度',
    trackPosition: '单束 · 限时跟随坐标', row: '横 / 纵排激光（留孔）',
    group: '多束联合攻击', sweep: '固定中心 · 多圈扫射', orbit: '大回旋 / 外圈向心激光'
  };
  const b = v => v.kind === 'bullet', l = v => v.kind === 'laserRow';
  const healing=v=>v.kind==='finalWave'||b(v)&&(v.bulletType?.startsWith('heal')||v.bulletType==='word'&&v.wordMode==='heal');
  const healOrigins={center:[.5,.5],topLeft:[0,0],top:[.5,0],topRight:[1,0],left:[0,.5],right:[1,.5],bottomLeft:[0,1],bottom:[.5,1],bottomRight:[1,1]};
  const refined=v=>b(v)&&v.bulletDesign==='refined';
  const bulletWarned=v=>refined(v)&&['ring','fan','curtain'].includes(v.bulletType);
  const flower=v=>v.kind==='flowerChain',area=v=>['tentacle','caption'].includes(v.kind);
  const flowerOrbit=v=>flower(v)&&v.flowerOrbit==='on';
  const orbitPath=(...paths)=>v=>flowerOrbit(v)&&paths.includes(v.flowerOrbitPath);
  const characterImages=Object.fromEntries(Array.from({length:8},(_,i)=>[`character${i+1}`,`人物图片 ${i+1}`]));
  const backgroundImages=Object.fromEntries(Array.from({length:8},(_,i)=>[`background${i+1}`,`背景图片 ${i+1}`]));
  const animationSlots=Object.fromEntries(Array.from({length:4},(_,i)=>[`animation${i+1}`,`自定义动画 ${i+1}`]));
  const cinematic=v=>['whiteScreen','screenBlur','battleVisibility','sceneImage','subtitle','animation'].includes(v.kind);
  const presentation=v=>['background','character'].includes(v.kind);
  const characterTransform=v=>v.kind==='character'&&v.characterAction!=='hide';
  const wire=v=>['wireSingle','wireGap','wireEmerge','wireMove'].includes(v.kind),setting=v=>cinematic(v)||['heartMode','vision','background','character','slash','bossDamage','bossHud','shield'].includes(v.kind);
  const counterKey=v=>v.kind==='battleKey'&&v.keyStyle==='counter',fallingKey=v=>v.kind==='battleKey'&&!counterKey(v);
  const bossSource=v=>v.kind==='bossDamage'||counterKey(v)||healing(v)&&v.healEffect==='bossDamage';
  const rootedWire=v=>['wireSingle','wireGap'].includes(v.kind);
  const wireHorizontal=v=>v.side==='left'||v.side==='right';
  const edgeEmerge=v=>v.kind==='wireEmerge'&&v.emergeExit==='forward';
  const canTranslate=(v,axis)=>rootedWire(v)?(axis==='x')===wireHorizontal(v):edgeEmerge(v)?(axis==='x')!==wireHorizontal(v):true;
  const translation=e=>({x:canTranslate(e,'x')?(e.translateX||0)*300:0,y:canTranslate(e,'y')?(e.translateY||0)*300:0});
  const wireRoot=v=>wireHorizontal(v)?v.rootEdge==='near'?'top':'bottom':v.rootEdge==='near'?'left':'right';
  const canEnd=v=>v.kind!=='marker'&&!setting(v);
  const hasWarning=v=>l(v)||area(v)||wire(v)||(b(v)&&v.bulletType==='ambush')||bulletWarned(v);
  const warningDuration=e=>l(e)?e.warn:area(e)?e.pulse*2:wire(e)?e.pre:b(e)&&e.bulletType==='ambush'?e.telegraph:bulletWarned(e)?e.bulletWarn:0;
  const attackAt=e=>e.t+(hasWarning(e)&&e.timingAnchor!=='attack'&&!l(e)?warningDuration(e):0);
  const warningAt=e=>attackAt(e)-warningDuration(e);
  function playbackEvent(e){
    if(e.timingAnchor!=='attack'||!hasWarning(e)||l(e))return e;
    const out={...e,t:e.t-warningDuration(e)};delete out.timingAnchor;
    if(b(e))out.waveDuration+=warningDuration(e);
    return out;
  }
  const newPattern=v=>flower(v)||area(v);
  const sweeping=v=>l(v)&&['sweep','orbit'].includes(v.laserMode);
  const barrage=v=>l(v)&&v.laserMode==='orbit'&&v.orbitStyle==='barrage';
  const hasHold=v=>area(v)||(v.kind==='wireEmerge'&&v.emergeExit!=='stay')||(flower(v)&&v.motion==='collapse')||(l(v)&&!(sweeping(v)&&v.sweepStyle==='continuous'));
  const wireRise=e=>e.emergeTiming==='duration'?e.rise:e.height/e.speed;
  const holdStart=e=>flower(e)?e.t:attackAt(e)+(e.kind==='wireEmerge'?wireRise(e):0);
  const bt = (...types) => v => b(v) && types.includes(v.bulletType);
  const lm = (...modes) => v => l(v) && modes.includes(v.laserMode);
  const directed = v => b(v) && !['chase', 'ambush', 'ring', 'healArc', 'healSpiral'].includes(v.bulletType)&&!(refined(v)&&((v.bulletType==='fan'&&v.fanAim==='heart')||(v.bulletType==='word'&&v.wordRoute!=='direction')||(v.bulletType==='bubble'&&v.bulletLayout==='source')));
  const fields = [];
  const add = (id, label, value, options = {}) => fields.push({id,label,value,...options});
  const number = (id,label,value,min,max,show,step='any') => add(id,label,value,{type:'number',min,max,show,step});
  const select = (id,label,value,choices,show) => add(id,label,value,{type:'select',choices,show});
  select('kind','事件类型','battleKey',{battleKey:'攻击键',bullet:'弹幕',laserRow:'激光',flowerChain:'连锁花簇（扩散 / 折返 / 收束）',tentacle:'触手穿刺（两次预警）',caption:'字幕突袭（两次预警）',wireSingle:'蓝色骨线 · 单线横扫',wireGap:'蓝色骨线 · 移动缺口',wireEmerge:'蓝色骨线 · 边缘伸出',wireMove:'蓝色骨线 · 整排移动',heartMode:'设定 · 红心 / 蓝心',vision:'设定 · 视野遮挡',finalWave:'最终波次',marker:'音乐节点 / 标记'});
  number('order','同秒执行顺序',0,0,9999,null,1);
  Object.assign(fields[0].choices,{background:'舞台 · 背景黑幕',character:'舞台 · 人物图层',slash:'演出 · 劈砍动画',bossDamage:'剧情 · Boss 强制扣血',shield:'设定 · 圆形护盾'});
  Object.assign(fields[0].choices,{bossHud:'演出 · Boss 血条显示 / 隐藏'});
  Object.assign(fields[0].choices,{whiteScreen:'演出 · 全屏白幕',screenBlur:'演出 · 全屏模糊',battleVisibility:'演出 · 隐藏 / 恢复战斗',sceneImage:'演出 · 背景图片',subtitle:'演出 · 字幕'});
  Object.assign(fields[0].choices,{animation:'演出 · 插入动画'});
  select('animationSlot','动画素材','ending',{ending:'结尾动画 · end.mp4',...animationSlots},v=>v.kind==='animation');
  number('animationDuration','动画显示时长 (s)',8,.01,445.669,v=>v.kind==='animation');
  number('animationOffset','素材起播位置 (s)',0,0,3600,v=>v.kind==='animation');
  number('animationSpeed','动画播放速度 (倍)',1,.1,4,v=>v.kind==='animation');
  select('animationFit','动画适配','contain',{contain:'完整显示（黑色留边）',cover:'铺满（等比裁切）',stretch:'拉伸至全屏'},v=>v.kind==='animation');
  number('animationFadeIn','动画淡入 (s)',0,0,60,v=>v.kind==='animation');
  number('animationFadeOut','动画淡出 (s)',0,0,60,v=>v.kind==='animation');
  select('screenAction','效果状态','show',{show:'淡入效果',hide:'淡出 / 恢复'},v=>['whiteScreen','screenBlur'].includes(v.kind));
  number('screenFade','过渡时间 (s)',1,0,120,v=>['whiteScreen','screenBlur','sceneImage'].includes(v.kind));
  number('blurRadius','模糊半径 (px)',8,0,40,v=>v.kind==='screenBlur'&&v.screenAction==='show');
  number('blurWhite','柔白程度 (0–0.6)',.16,0,.6,v=>v.kind==='screenBlur'&&v.screenAction==='show');
  select('battleDisplay','战斗内容','hide',{hide:'隐藏全部战斗内容',show:'恢复战斗内容'},v=>v.kind==='battleVisibility');
  select('sceneImageAction','背景图片动作','show',{show:'插入 / 切换背景',hide:'移除 / 恢复原背景'},v=>v.kind==='sceneImage');
  select('sceneImageSlot','背景图片','background1',backgroundImages,v=>v.kind==='sceneImage'&&v.sceneImageAction==='show');
  select('sceneImageFit','图片适配','cover',{cover:'铺满（等比裁切）',contain:'完整显示（等比留边）',stretch:'拉伸至全屏'},v=>v.kind==='sceneImage'&&v.sceneImageAction==='show');
  add('subtitleText','字幕内容','我一直都在。',{type:'textarea',show:v=>v.kind==='subtitle'});
  number('subtitleX','字幕中心 X (舞台 0–1)',.5,0,1,v=>v.kind==='subtitle');
  number('subtitleY','字幕中心 Y (舞台 0–1)',.82,0,1,v=>v.kind==='subtitle');
  number('subtitleSize','字幕字号 (px)',30,8,160,v=>v.kind==='subtitle');
  number('subtitleWidth','字幕最大宽度 (px)',840,40,944,v=>v.kind==='subtitle');
  add('subtitleColor','字幕颜色','#ffffff',{type:'color',show:v=>v.kind==='subtitle'});
  number('subtitleDuration','字幕显示总时长 (s)',5,.01,445.669,v=>v.kind==='subtitle');
  number('subtitleFadeIn','字幕淡入 (s)',.3,0,60,v=>v.kind==='subtitle');
  number('subtitleFadeOut','字幕淡出 (s)',.3,0,60,v=>v.kind==='subtitle');
  select('bossBarMode','Boss 血条状态','show',{show:'持续显示',hide:'持续隐藏',auto:'恢复自动显示（扣血 / 第七幕）'},v=>v.kind==='bossHud');
  select('bossShakeMode','Boss 受伤抖动幅度','inherit',{inherit:'使用全局默认',custom:'此节点指定幅度'},v=>v.kind==='bossHud'||bossSource(v));
  number('bossShakeAmount','Boss 血条抖动幅度 (px)',2,0,60,v=>(v.kind==='bossHud'||bossSource(v))&&v.bossShakeMode==='custom');
  select('shieldMode','护盾状态','on',{on:'开启',off:'关闭'},v=>v.kind==='shield');
  number('shieldRadius','护盾半径 (px)',60,12,600,v=>v.kind==='shield'&&v.shieldMode==='on');
  number('slashX','劈砍中心 X (舞台 0–1)',.5,-1,2,v=>v.kind==='slash');
  number('slashY','劈砍中心 Y (舞台 0–1)',.5,-1,2,v=>v.kind==='slash');
  number('slashSpeed','劈砍播放速度 (倍)',1,.1,10,v=>v.kind==='slash');
  number('slashSize','劈砍长度 (px)',180,10,1200,v=>v.kind==='slash');
  number('slashAngle','劈砍角度 (°)',-55,-360,360,v=>v.kind==='slash');
  number('bossDamageAmount','Boss 强制扣血量',100,0,1000000000,v=>v.kind==='bossDamage');
  select('backgroundMode','背景状态','black',{black:'黑幕',restore:'恢复原背景'},v=>v.kind==='background');
  select('characterId','人物图层','1',{'1':'人物 1','2':'人物 2','3':'人物 3','4':'人物 4'},v=>v.kind==='character');
  select('characterAction','人物动作','show',{show:'淡入 / 显示',hide:'淡出 / 隐藏',set:'切换图片 / 调整形象'},v=>v.kind==='character');
  select('characterImage','人物图片','character1',characterImages,characterTransform);
  number('characterX','人物中心 X (舞台 0–1)',.25,-1,2,characterTransform);
  number('characterY','人物中心 Y (舞台 0–1)',.5,-1,2,characterTransform);
  number('characterWidth','人物宽度上限 (px)',260,1,1920,characterTransform);
  number('characterHeight','人物高度上限 (px)',380,1,1080,characterTransform);
  number('fadeDuration','淡入 / 淡出时间 (s)',.6,0,60,v=>presentation(v)&&(v.kind!=='character'||v.characterAction!=='set'));
  select('holdMode','停留结束方式','duration',{duration:'按持续秒数',music:'停留到音乐节点'},hasHold);
  number('holdUntil','停留结束的音乐时间 (s)',80,0,445.669,v=>hasHold(v)&&v.holdMode==='music');
  select('endMode','消失规则','natural',{natural:'原有存活时间',music:'指定音乐时间 / 起音节点',phase:'指定幕间转换',event:'关联某个已保存事件'},canEnd);
  number('endTime','消失的音乐时间 (s)',80,0,445.669,v=>canEnd(v)&&v.endMode==='music');
  add('endPhase','幕间转换','act2',{type:'select',choices:{act2:'第二幕 · 80s',act3:'第三幕 · 107s',act4:'第四幕 · 136s',act5:'第五幕 · 158s',act6:'第六幕 · 294s',act7:'第七幕 · 330s',outro:'尾声 · 353s',songEnd:'歌曲结束 · 445.668889s'},show:v=>canEnd(v)&&v.endMode==='phase'});
  add('endEvent','关联事件','',{type:'select',choices:{'':'请选择事件'},dynamic:true,show:v=>canEnd(v)&&v.endMode==='event'});
  select('endEdge','关联时刻','start',{start:'该事件开始 (t)',end:'该弹幕消失'},v=>canEnd(v)&&v.endMode==='event');
  select('mode','心模式','blue',{red:'红心 · 自由移动',blue:'蓝心 · 重力与跳跃'},v=>v.kind==='heartMode');
  select('gravityDirection','蓝心重力方向','down',{down:'向下',up:'向上',left:'向左',right:'向右'},v=>v.kind==='heartMode'&&v.mode==='blue');
  number('gravityTurnDuration','心转向过渡 (s)',.3,0,5,v=>v.kind==='heartMode');
  select('visionEnabled','视野状态','on',{on:'遮挡 · 以心为中心',off:'恢复全屏'},v=>v.kind==='vision');
  number('duration','视野变化时长 (s)',1.2,.01,30,v=>v.kind==='vision');
  select('bulletType','弹幕种类','ring',bulletTypes,b);
  select('bulletDesign','弹幕版本','classic',{refined:'优化版 · danmu-boss',classic:'旧谱面兼容'},b);
  number('bulletWarn','出弹前预警 (s)',.7,0,20,bulletWarned);
  number('volleyCount','连续齐射轮数',1,1,8,v=>refined(v)&&['ring','fan','curtain'].includes(v.bulletType),1);
  number('volleyInterval','齐射轮间隔 (s)',.366667,.01,10,v=>refined(v)&&['ring','fan','curtain'].includes(v.bulletType));
  number('volleyAngle','每轮角度错开 (°)',3.724,-180,180,v=>refined(v)&&['ring','fan'].includes(v.bulletType));
  select('fanAim','扇射瞄准','direction',{direction:'指定方向',heart:'预警开始锁定心'},v=>refined(v)&&v.bulletType==='fan');
  select('bulletLayout','生成分布','source',{source:'优化分布',point:'自定发射点'},v=>refined(v)&&['chase','gravity','ambush','bubble','healRain'].includes(v.bulletType));
  number('patternSeed','弹幕随机种子',23,0,2147483647,refined,1);
  number('arming','生成后无伤害预告 (s)',.4,0,10,v=>refined(v)&&['chase','word'].includes(v.bulletType));
  number('homingAccel','追踪加速度 (px/s²)',1468.8,0,6000,v=>refined(v)&&v.bulletType==='chase');
  number('prediction','玩家运动预判 (s)',.133333,0,2,v=>refined(v)&&v.bulletType==='chase');
  number('spawnSpread','出生横向范围 (px)',260,0,600,v=>refined(v)&&['chase','gravity'].includes(v.bulletType));
  number('velocityJitter','重力弹横向初速浮动 (px/s)',52.5,0,1000,v=>refined(v)&&v.bulletType==='gravity');
  number('ambushStep','每颗伏击延后 (s)',.083333,0,5,v=>refined(v)&&v.bulletType==='ambush');
  number('bubbleSpeedCap','泡泡漂移速度上限 (px/s)',105,1,3000,v=>refined(v)&&v.bulletType==='bubble');
  number('inflateAfter','膨胀前脉冲预告 (s)',1,0,30,v=>refined(v)&&['bubble','ring'].includes(v.bulletType));
  number('inflateScale','膨胀后尺寸倍率',2,1,5,v=>refined(v)&&['bubble','ring'].includes(v.bulletType));
  number('inflateEvery','每隔几颗膨胀 (0=关闭)',0,0,128,v=>refined(v)&&['bubble','ring'].includes(v.bulletType),1);
  number('rainWidth','治愈雨摆动范围 (px)',47,0,250,v=>refined(v)&&v.bulletType==='healRain');
  number('ellipseRatio','治愈环纵横比',1,0.1,3,v=>refined(v)&&['healArc','healSpiral'].includes(v.bulletType));
  select('wordMode','词条效果','attack',{attack:'攻击词条',heal:'治疗词条'},v=>refined(v)&&v.bulletType==='word');
  select('wordRoute','词条行进方式','mixed',{mixed:'边缘向心 / 中心向外交替',inward:'四边向中心',outward:'中心向四边',direction:'指定方向'},v=>refined(v)&&v.bulletType==='word');
  number('wordSize','词条初始字号 (px)',18,8,72,v=>refined(v)&&v.bulletType==='word');
  number('wordScale','词条放大倍率',2,1,4,v=>refined(v)&&v.bulletType==='word');
  number('wordGrow','词条放大耗时 (s)',2,.01,30,v=>refined(v)&&v.bulletType==='word');
  select('wordBounce','词条触框反弹','on',{on:'反弹',off:'离框消失'},v=>refined(v)&&v.bulletType==='word');
  select('laserMode','激光攻击方式','aimOnce',laserModes,l);
  select('laserBreakKeys','激光对攻击靶','off',{off:'穿过攻击靶',on:'击碎攻击靶（无击破奖励）'},l);
  select('boxId','目标战斗框','center',{center:'主战斗框（随阶段移动）',left:'固定左框',right:'固定右框'},v=>v.kind!=='marker'&&!setting(v));
  number('x','发生位置 / 中心 X',0.5,-1,2,v=>!['marker','tentacle'].includes(v.kind)&&!wire(v)&&!setting(v)&&!(flower(v)&&v.flowerCenter==='heart'));
  number('y','发生位置 / 中心 Y',0,-1,2,v=>!['marker','tentacle'].includes(v.kind)&&!wire(v)&&!setting(v)&&!(flower(v)&&v.flowerCenter==='heart'));
  number('translateX','整体拖动偏移 X',0,-5,5,v=>canEnd(v)&&canTranslate(v,'x'));
  number('translateY','整体拖动偏移 Y',0,-5,5,v=>canEnd(v)&&canTranslate(v,'y'));
  select('mirrorAxis','图样镜像','none',{none:'原始方向',x:'左右镜像',y:'上下镜像',both:'双向镜像'},v=>canEnd(v)&&v.kind!=='marker');
  select('keyStyle','攻击键类型','counter',{counter:'回响攻击靶 · 向上射击',falling:'旧版 · 下落判定'},v=>v.kind==='battleKey');
  number('keyHitsRequired','击破所需命中次数',3,1,999,counterKey,1);
  number('keyDuration','攻击靶显示时间 (s)',5,.01,120,counterKey);
  number('keyRadius','攻击靶半径 (px)',20,6,100,counterKey);
  number('keyShieldRadius','击破护盾半径 (px；0=无护盾)',100,0,600,counterKey);
  number('keyShieldDuration','击破护盾持续时间 (s)',2.5,0,120,counterKey);
  number('lane','攻击键 lane (0–5)',2,0,5,fallingKey,1);
  select('keyTiming','攻击键下落设置','lead',{lead:'按提前出现时间',speed:'按掉落速度'},fallingKey);
  number('lead','攻击键提前出现 (s)',0.85,0,30,v=>fallingKey(v)&&v.keyTiming!=='speed');
  number('keySpeed','攻击键掉落速度 (px/s)',300,10,3000,v=>fallingKey(v)&&v.keyTiming==='speed');
  number('keyWidth','攻击键宽度 (px)',28,8,150,fallingKey);
  number('keyHeight','攻击键高度 (px)',14,6,100,fallingKey);
  number('speed','初始 / 径向速度 (px/s)',180,0,3000,v=>b(v)||flower(v)||(wire(v)&&!(v.kind==='wireEmerge'&&v.emergeTiming==='duration')));
  number('count','单波 / 每组弹数',12,1,128,v=>b(v)||flower(v),1);
  number('interval','逐颗间隔 (s；0=同时)',0,0,10,b);
  number('waveDuration','波次 / 弹幕存活 (s)',3,0.01,120,v=>b(v)||v.kind==='finalWave');
  select('bulletDirection','行进方向','down',{down:'向下 ↓',up:'向上 ↑',left:'向左 ←',right:'向右 →',angle:'自定义角度'},directed);
  number('bulletAngle','方向角 (°；右0 / 下90)',90,-360,360,v=>directed(v)&&v.bulletDirection==='angle');
  number('spread','扇面角度 (°)',70,0,360,bt('fan'));
  select('radialMotion','径向运动','outward',{outward:'向外扩张',inward:'向中心收拢'},bt('ring','healArc','healSpiral'));
  number('radius','环半径 / 可见半径 (px)',100,0,600,v=>bt('ring','healArc','healSpiral')(v)||flower(v)||(v.kind==='vision'&&v.visionEnabled==='on'));
  number('gapAngle','安全扇区中心 (°)',90,-360,360,v=>bt('ring')(v)||sweeping(v));
  number('gapDegrees','安全扇区宽 (°；0=关闭)',75,0,359,v=>bt('ring')(v)||sweeping(v));
  number('holePosition','墙孔中心 (0–1)',0.5,0,1,bt('curtain','boneStab'));
  number('holeWidth','安全孔宽 (px)',85,0,300,bt('curtain','boneStab'));
  number('trackingDelay','生成后延迟追踪 (s)',0.75,0,30,bt('chase'));
  number('turnRate','追踪最大转向 (°/s)',110,1,720,v=>bt('chase')(v)&&!refined(v));
  number('maxSpeed','追踪 / 伏击速度上限 (px/s)',260,1,3000,bt('chase','ambush'));
  number('gravity','向下重力 (px/s²)',360,0,5000,bt('gravity'));
  number('bounces','触底弹跳次数',2,0,10,bt('gravity'),1);
  number('telegraph','伏击锁定前预警 (s)',0.6,0.01,20,bt('ambush'));
  number('acceleration','锁定后加速度 (px/s²)',180,0,5000,bt('ambush'));
  number('diffusion','横向扩散加速度 (px/s²)',15,0,1000,bt('bubble'));
  number('inflate','膨胀速率 (px/s)',4,0,100,v=>bt('bubble')(v)&&!refined(v));
  number('angularSpeed','运动角速度 (°/s；正值顺时针)',0,-720,720,v=>b(v)&&!['chase','ambush'].includes(v.bulletType));
  select('healEffect','治愈效果','hp',{hp:'只回复当前血量',maxHp:'增加血量上限并回复等量血量',damage:'增加玩家伤害',bossDamage:'命中 Boss 血条造成伤害'},healing);
  number('heal','单颗效果增加量',3,0,100,v=>healing(v)&&v.healEffect!=='bossDamage');
  number('bossHitDamage','单颗命中 Boss 扣血量',3,0,1000000000,v=>healing(v)&&v.healEffect==='bossDamage');
  select('healOrigin','治愈发射中心','custom',{custom:'自定坐标',center:'战斗框中央',topLeft:'左上角',top:'上边中点',topRight:'右上角',left:'左边中点',right:'右边中点',bottomLeft:'左下角',bottom:'下边中点',bottomRight:'右下角'},healing);
  add('text','词条 / 字幕内容','回忆',{type:'text',show:v=>bt('word')(v)||v.kind==='caption'});
  select('motion','花簇运动','expand',{expand:'持续向外扩散',return:'先展开再折返',collapse:'停顿后向中心收束'},flower);
  select('flowerCenter','花簇中心','fixed',{fixed:'固定中心坐标',heart:'生成瞬间捕获红心'},flower);
  select('flowerOrbit','整簇公转','off',{off:'关闭',on:'开启'},flower);
  number('flowerOrbitSpeed','公转角速度 (°/s；正值顺时针)',90,-1440,1440,flowerOrbit);
  number('flowerOrbitRadius','公转半径 (px)',80,0,1200,flowerOrbit);
  number('flowerOrbitAngle','公转初始角度 (°)',0,-360,360,flowerOrbit);
  number('flowerOrbitX','公转中心 X (0–1)',.5,-5,5,v=>flowerOrbit(v)&&v.flowerCenter!=='heart');
  number('flowerOrbitY','公转中心 Y (0–1)',.5,-5,5,v=>flowerOrbit(v)&&v.flowerCenter!=='heart');
  select('flowerOrbitPath','公转中心运动轨迹','fixed',{fixed:'固定',line:'直线',pingpong:'直线往返',circle:'圆形',ellipse:'椭圆',eight:'8 字'},flowerOrbit);
  number('flowerPathSpeed','中心移动速度 (px/s)',60,0,3000,orbitPath('line','pingpong'));
  number('flowerPathAngle','中心移动方向 (°；右0 / 下90)',0,-360,360,orbitPath('line','pingpong'));
  number('flowerPathLength','往返单程距离 (px)',120,1,2400,orbitPath('pingpong'));
  number('flowerPathRadiusX','中心轨迹横向半径 (px)',60,0,1200,orbitPath('circle','ellipse','eight'));
  number('flowerPathRadiusY','中心轨迹纵向半径 (px)',40,0,1200,orbitPath('ellipse','eight'));
  number('flowerPathAngularSpeed','中心轨迹角速度 (°/s)',45,-1440,1440,orbitPath('circle','ellipse','eight'));
  number('flowerPathPhase','中心轨迹初相位 (°)',0,-360,360,orbitPath('circle','ellipse','eight'));
  select('flowerDirection','花簇旋转方向','alternating',{cw:'顺时针',ccw:'逆时针',alternating:'各组交替反向'},flower);
  number('groups','连锁组数',6,1,12,flower,1);
  number('gap','组间出生间隔 (s)',.23,.05,10,flower);
  number('omega','花簇角速度 (rad/s)',.9,0,25,flower);
  number('offset','相邻组初相位差 (rad)',.16,-6.283185307179586,6.283185307179586,flower);
  number('bulletRadius','弹头半径 (px)',3.3,1,30,v=>flower(v)||(b(v)&&!(refined(v)&&v.bulletType==='word')));
  number('rotation','整体角度 (°)',0,-360,360,v=>newPattern(v)||bt('ring','healArc','healSpiral')(v));
  select('collapseLifeMode','收束组的存活规则','life',{life:'指定每组存活时间',arrival:'到达中心后延时消失'},v=>flower(v)&&v.motion==='collapse');
  select('arrivalHoldMode','到中心后的停留','duration',{duration:'按每组持续秒数',music:'统一停留到音乐节点'},v=>flower(v)&&v.motion==='collapse'&&v.collapseLifeMode==='arrival');
  number('arrivalUntil','中心停留结束的音乐时间 (s)',80,0,445.669,v=>flower(v)&&v.motion==='collapse'&&v.collapseLifeMode==='arrival'&&v.arrivalHoldMode==='music');
  number('afterArrival','到中心后保留 (s；0=立即消失)',0,0,120,v=>flower(v)&&v.motion==='collapse'&&v.collapseLifeMode==='arrival'&&v.arrivalHoldMode!=='music');
  select('returnLifeMode','折返组的存活规则','life',{life:'指定每组存活时间',arrival:'折返收缩完成后立即消失'},v=>flower(v)&&v.motion==='return');
  number('life','每组存活 (s；至少覆盖运动)',5.5,.05,565.669,v=>flower(v)&&!(v.motion==='collapse'&&v.collapseLifeMode==='arrival')&&!(v.motion==='return'&&v.returnLifeMode==='arrival'));
  number('returnDuration','折返完成时间 (s)',3.2,.05,120,v=>flower(v)&&v.motion==='return');
  number('endRadius','折返终点半径 (px)',10,0,600,v=>flower(v)&&v.motion==='return');
  number('collapseDelay','收束前停顿 (s)',.35,0,445.669,v=>flower(v)&&v.motion==='collapse'&&v.holdMode!=='music');
  number('pulse','一次预警周期 (s；共两次)',.48,.05,10,area);
  number('hold','攻击停留 (s)',1.15,0,445.669,v=>(area(v)||(v.kind==='wireEmerge'&&v.emergeExit!=='stay'))&&v.holdMode!=='music');
  number('fade','淡出时间 (s)',.24,.01,10,area);
  number('position','横向：上下位置 / 纵向：左右位置',.5,0,1,v=>v.kind==='tentacle');
  number('thickness','触手区域厚度 (px)',76,20,195,v=>v.kind==='tentacle');
  select('from','触手伸出边','start',{start:'左边 / 上边',end:'右边 / 下边'},v=>v.kind==='tentacle');
  number('extend','触手伸展时间 (s)',.25,.01,30,v=>v.kind==='tentacle');
  number('seed','触手形态种子',0,0,99999,v=>v.kind==='tentacle',1);
  number('captionWidth','字幕矩形宽度 (px)',220,40,300,v=>v.kind==='caption');
  number('captionHeight','字幕矩形高度 (px)',80,30,300,v=>v.kind==='caption');
  select('side','骨线起始边','left',{left:'左侧',right:'右侧',top:'顶部',bottom:'底部'},wire);
  select('rootEdge','根部连接边框','far',{far:'下边 / 右边',near:'上边 / 左边'},rootedWire);
  number('pre','骨线红色预警 (s)',.55,0,20,wire);
  number('height','骨线高度 / 伸出深度 (px)',115,12,300,v=>wire(v)&&v.kind!=='wireGap');
  select('emergeTiming','伸出控制方式','speed',{speed:'按伸出速度',duration:'按伸出耗时'},v=>v.kind==='wireEmerge');
  number('rise','伸出耗时 (s)',.25,.01,120,v=>v.kind==='wireEmerge'&&v.emergeTiming==='duration');
  number('length','移动排长度 (px)',170,12,600,v=>v.kind==='wireMove');
  number('tilt','线段两端沿行进方向错位 (px)',0,-300,300,v=>['wireSingle','wireGap'].includes(v.kind));
  number('wireWidth','骨线粗细 (px)',10,1,40,wire);
  number('gapSize','骨线缺口宽度 (px)',120,24,284,v=>v.kind==='wireGap');
  number('gapCenter','缺口初始中心 (px)',150,0,300,v=>v.kind==='wireGap');
  select('gapMoving','缺口移动','off',{off:'固定缺口',on:'沿横截面往返'},v=>v.kind==='wireGap');
  number('gapSpeed','缺口移动速度 (px/s)',80,1,1000,v=>v.kind==='wireGap'&&v.gapMoving==='on');
  number('gapPhase','缺口往返相位 (px)',0,0,600,v=>v.kind==='wireGap'&&v.gapMoving==='on');
  select('gapDirection','缺口初始方向','1',{'1':'正向','-1':'反向'},v=>v.kind==='wireGap'&&v.gapMoving==='on');
  select('emergeExit','伸出后的动作','retract',{retract:'停留后收回',stay:'保持伸出直到消失节点',move:'满高度后转为移动排',forward:'带缺口 · 沿伸出方向移动'},v=>v.kind==='wireEmerge');
  number('rowCenter','整排缺口中心 (0–1)',.5,0,1,v=>v.kind==='wireEmerge'&&v.emergeExit==='forward');
  number('rowGap','整排缺口宽度 (px)',110,12,300,v=>v.kind==='wireEmerge'&&v.emergeExit==='forward');
  number('moveSpeed','转化后排移动速度 (px/s)',175,1,3000,v=>v.kind==='wireEmerge'&&['move','forward'].includes(v.emergeExit));
  number('moveLength','转化后排长度 (px)',170,12,600,v=>v.kind==='wireEmerge'&&v.emergeExit==='move');
  number('moveHeight','转化后排高度 (px)',95,12,300,v=>v.kind==='wireEmerge'&&v.emergeExit==='move');
  number('damage','伤害',1,0,1000,v=>canEnd(v)&&!counterKey(v)&&!bt('healArc','healRain','healSpiral')(v)&&!(refined(v)&&v.bulletType==='word'&&v.wordMode==='heal'));
  number('warn','发射前预警 (s)',0.3,0.01,20,l);
  number('fire','每束发射持续 (s)',0.4,0.01,445.669,v=>l(v)&&!(sweeping(v)&&v.sweepStyle==='continuous')&&v.holdMode!=='music');
  select('laserExit','激光退场','recoil',{recoil:'反冲飞出后淡出',none:'立即消失'},l);
  number('recoilDuration','反冲飞出时长 (s)',.22,.03,2,v=>l(v)&&v.laserExit==='recoil');
  number('recoilDistance','反冲距离 (px)',1400,600,4000,v=>l(v)&&v.laserExit==='recoil');
  number('laserFade','反冲后光束淡出 (s)',.18,.01,3,v=>l(v)&&v.laserExit==='recoil');
  select('widthPreset','激光粗细预设','thin',{thin:'细 · 10px',medium:'中 · 20px',thick:'粗 · 102px (框高34%)',custom:'自定义'},l);
  number('laserWidth','光束完整宽度 (px)',10,1,300,l);
  number('endWidth','结束宽度 (px；可逐渐收窄)',10,0,300,l);
  number('laserLength','激光长度 (px)',600,1,1500,()=>false);
  number('laserAngle','光束方向 / 起始角 (°)',0,-360,360,v=>l(v)&&!['aimOnce','trackAngle','row'].includes(v.laserMode));
  number('laserRotation','激光组整体旋转 (°)',0,-360,360,v=>l(v)&&v.laserMode!=='aimOnce');
  number('trackDuration','从预警开始跟随 (s)',0.3,0.01,120,lm('trackAngle','trackPosition'));
  number('trackRate','跟随最大转向 (°/s)',110,1,720,lm('trackAngle'));
  select('followAxis','跟随坐标轴','y',{x:'只跟随 X',y:'只跟随 Y',both:'同时跟随 X / Y'},lm('trackPosition'));
  number('offsetX','相对玩家偏移 X (归一化)',0,-2,2,v=>lm('trackPosition')(v)&&v.followAxis!=='y');
  number('offsetY','相对玩家偏移 Y (归一化)',0,-2,2,v=>lm('trackPosition')(v)&&v.followAxis!=='x');
  select('axis','横向 / 纵向','horizontal',{horizontal:'横向（左 → 右）',vertical:'纵向（上 → 下）'},v=>lm('row')(v)||v.kind==='tentacle');
  number('laneCount','排激光总槽数',6,2,24,lm('row'),1);
  add('gaps','安全槽编号（逗号分隔，0 起）','1,4',{type:'text',show:lm('row')});
  number('beamCount','每组光束 / 每圈发生数',3,1,64,lm('group','sweep','orbit'),1);
  number('orbitRadius','外圈发射半径 (px)',220,30,1200,lm('orbit'));
  select('orbitStyle','回旋模板','classic',{classic:'原有环绕',barrage:'视频大回旋 · 逐束向心'},lm('orbit'));
  number('emitterSize','发射器大小 (px)',14,6,200,l);
  select('emitterEntrance','发射器飞入','on',{on:'开启',off:'关闭'},l);
  number('emitterFlyDuration','发射器飞入耗时 (s)',.3,0,10,v=>l(v)&&v.emitterEntrance!=='off');
  number('emitterApproach','发射器飞入距离 (px)',100,0,2000,v=>l(v)&&v.emitterEntrance!=='off');
  select('timing','多束出场顺序','simultaneous',{simultaneous:'同时出现',sequential:'依次出现'},lm('group'));
  number('beamInterval','相邻光束发射间隔 (s)',0.18,0.01,10,v=>lm('group')(v)&&v.timing==='sequential');
  select('layout','多束排列','parallel',{parallel:'并排平行',radial:'共用中心，角度错开'},lm('group'));
  number('spacing','并排间距 (px)',60,0,600,v=>lm('group')(v)&&v.layout==='parallel');
  number('angleStep','相邻光束夹角 (°)',45,-360,360,v=>lm('group')(v)&&v.layout==='radial');
  select('sweepStyle','扫射机制','continuous',{continuous:'光束持续旋转',stepped:'依次定角发射（绕中心逐束出现）'},v=>sweeping(v)&&!barrage(v));
  select('sweepDirection','旋转方向','clockwise',{clockwise:'顺时针',counterclockwise:'逆时针'},sweeping);
  select('sweepTiming','旋转速度设定','duration',{duration:'按圈数 + 总时长',speed:'按圈数 + 角速度'},sweeping);
  number('sweepSpeed','扫射角速度 (°/s)',180,3,1440,v=>sweeping(v)&&v.sweepTiming==='speed');
  number('turns','旋转圈数',3,1,12,sweeping,1);
  number('sweepDuration','完整扫射时长 (s)',6,0.1,120,v=>sweeping(v)&&v.sweepTiming!=='speed');
  add('note','备注','',{type:'textarea'});
  const initial = () => Object.fromEntries(fields.map(f=>[f.id,f.value]));
  const visible = (f,v) => !(flowerOrbit(v)&&['x','y'].includes(f.id))&&(!f.show || f.show(v));
  const parseGaps = raw => String(raw).trim()==='' ? [] : String(raw).split(',').map(s=>s.trim()).map(s=>s===''?NaN:Number(s));
  function validate(v) {
    const errors=[];
    for (const f of fields.filter(f=>visible(f,v))) {
      const n=v[f.id];
      if(f.type==='number' && (typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))) errors.push(`${f.label}：需在 ${f.min}–${f.max} 范围内${f.step===1?'取整数':''}`);
      if(f.type==='select' && !f.dynamic && !Object.hasOwn(f.choices,n)) errors.push(`${f.label}：无效选项`);
      if(f.type==='color'&&(typeof n!=='string'||!/^#[0-9a-f]{6}$/i.test(n)))errors.push(`${f.label}：请选择有效颜色`);
    }
    if(v.kind==='subtitle'&&(typeof v.subtitleText!=='string'||!v.subtitleText.trim()||v.subtitleText.length>2000))errors.push('字幕需为 1–2000 字。');
    if(v.kind==='subtitle'&&v.subtitleFadeIn+v.subtitleFadeOut>v.subtitleDuration)errors.push('字幕淡入和淡出的总时长不能超过显示时长。');
    if(v.kind==='animation'&&v.animationFadeIn+v.animationFadeOut>v.animationDuration)errors.push('动画淡入淡出总时长不能超过显示时长。');
    if(lm('row')(v)) {const gaps=parseGaps(v.gaps);if(gaps.some(n=>!Number.isInteger(n)||n<0||n>=v.laneCount)||new Set(gaps).size!==gaps.length||gaps.length>=v.laneCount)errors.push('安全槽需不重复且在总槽数以内，至少保留一束激光。');}
    if(lm('trackAngle','trackPosition')(v)&&v.holdMode!=='music'&&v.trackDuration>v.warn+v.fire)errors.push('跟随时长不能超过预警与发射持续时间之和。');
    if(bt('chase')(v)&&v.trackingDelay>=v.waveDuration)errors.push('追踪延迟必须小于弹幕存活时间。');
    if(bt('chase','ambush')(v)&&v.maxSpeed<v.speed)errors.push('速度上限不能低于初始速度。');
    if(bt('ambush')(v)&&v.timingAnchor!=='attack'&&v.telegraph>=v.waveDuration)errors.push('伏击预警必须小于弹幕存活时间。');
    if(bt('word')(v)&&!v.text.trim())errors.push('请填写词条内容。');
    if(v.kind==='caption'&&!v.text.trim())errors.push('请填写字幕内容。');
    if(flower(v)&&(v.count<4||v.count>32||v.speed<1))errors.push('花簇每组弹数为 4–32，径向速度至少 1 px/s。');
    if(flower(v)&&v.motion==='collapse'&&v.holdMode!=='music'&&v.collapseDelay+v.radius/v.speed>120)errors.push('收束运动超过 120 秒，请提高速度或减小半径。');
    if(canEnd(v)&&v.endMode==='event'&&!v.endEvent)errors.push('请选择关联的消失事件。');
    if(wire(v)&&!(v.kind==='wireEmerge'&&v.emergeTiming==='duration')&&v.speed<1)errors.push('骨线速度至少 1 px/s。');
    if(v.kind==='vision'&&v.visionEnabled==='on'&&v.radius<30)errors.push('可见半径至少 30px。');
    if(area(v)&&v.holdMode!=='music'&&v.hold<=0)errors.push('区域攻击停留必须大于 0。');
    if(v.kind==='wireEmerge'&&v.emergeExit==='stay'&&v.endMode==='natural')errors.push('保持伸出需要指定消失节点。');
    if(v.timingAnchor!==undefined&&v.timingAnchor!=='attack')errors.push('出弹时间基准无效。');
    if(sweeping(v)&&v.sweepTiming==='speed'&&360*v.turns/v.sweepSpeed>120)errors.push('按角速度计算的扫射时长不能超过 120 秒。');
    return errors;
  }
  function build(v,t,previous={}) {
    if(barrage(v))v={...v,sweepStyle:'stepped'};
    if(hasHold(v)&&v.holdMode==='music'){
      const start=holdStart({...v,t}),seconds=v.holdUntil-start;
      if(!Number.isFinite(seconds)||seconds<0){
        const error=Error(v.kind==='wireEmerge'?`停留节点 ${v.holdUntil}s 早于骨线完全伸出 ${start.toFixed(6)}s（出弹 ${attackAt({...v,t}).toFixed(6)}s + 伸出 ${wireRise(v).toFixed(6)}s）。请选择更晚的停留节点，或调整出弹时间、伸出耗时 / 速度 / 深度。`:`停留节点不能早于停留开始 ${start.toFixed(3)}s。`);
        error.field='holdUntil';throw error;
      }
      v={...v,[flower(v)?'collapseDelay':l(v)?'fire':'hold']:seconds};
    }
    if(flower(v)&&v.motion==='collapse'&&v.collapseLifeMode==='arrival'&&v.arrivalHoldMode==='music'){
      const born=t+(v.groups-1)*v.gap,lastArrival=(v.holdMode==='music'?Math.max(born,v.holdUntil):born+v.collapseDelay)+v.radius/v.speed;
      if(v.arrivalUntil<lastArrival)throw Error(`中心停留节点不能早于最后一组到达中心 ${lastArrival.toFixed(3)}s。`);
    }
    const errors=validate(v);if(errors.length)throw new Error(errors.join('\n'));
    if(!Number.isFinite(t)||t<0)throw new Error('事件时间无效');
    const result={...previous};
    delete result.keyBossDamage;
    // Strip only editor-owned fields, preserving metadata supplied by other chart tools.
    for(const f of fields)delete result[f.id];
    for(const k of ['direction','safeHole','laserCount','laserGap','laserTurns','laserTrackDuration','laserExtent','center','centerHeart','coordinateSpace','rect','endCondition','enabled','gapMove','gapDir','moveAfter','expiresAt','timingAnchor'])delete result[k];
    for(const f of fields)if(visible(f,v)&&f.id!=='widthPreset')result[f.id]=v[f.id];
    result.t=t;
    if(fallingKey(v)&&v.keyTiming==='speed')result.lead=230/v.keySpeed;
    if(l(v))result.laserExtent='screen';
    if(hasWarning(v)&&v.timingAnchor==='attack')result.timingAnchor='attack';
    if(directed(v))result.direction={angle: v.bulletDirection==='angle'?v.bulletAngle:({right:0,down:90,left:180,up:-90}[v.bulletDirection])};
    delete result.bulletDirection;delete result.bulletAngle;
    delete result.flowerDirection;delete result.flowerCenter;delete result.captionWidth;delete result.captionHeight;
    for(const k of ['endMode','endTime','endPhase','endEvent','endEdge','visionEnabled','gapMoving','gapDirection'])delete result[k];
    if(canEnd(v)&&v.endMode!=='natural')result.endCondition=v.endMode==='music'?{type:'music',time:v.endTime}:v.endMode==='phase'?{type:'phase',phaseId:v.endPhase}:{type:'event',eventId:v.endEvent,edge:v.endEdge};
    if(v.kind==='vision')result.enabled=v.visionEnabled==='on';
    if(v.kind==='wireGap'){result.gapMove=v.gapMoving==='on';result.gapDir=Number(v.gapDirection);}
    if(v.kind==='wireEmerge')result.moveAfter=v.emergeExit==='move';
    if(v.kind==='wireEmerge'&&v.emergeTiming==='duration')result.speed=v.height/v.rise;
    if(v.kind==='wireEmerge'&&v.emergeExit==='forward')result.rowCenter=Math.max(v.rowGap/600,Math.min(1-v.rowGap/600,v.rowCenter));
    if(hasHold(v)&&v.holdMode==='music')result[flower(v)?'collapseDelay':l(v)?'fire':'hold']=v[flower(v)?'collapseDelay':l(v)?'fire':'hold'];
    if(newPattern(v))result.coordinateSpace='normalized-box';
    if(flower(v)){
      result.direction=v.flowerDirection;result.centerHeart=v.flowerCenter==='heart';
      result.life=Math.max(v.life,v.motion==='return'?v.returnDuration:v.motion==='collapse'?v.collapseDelay+v.radius/v.speed:0);
      if(v.motion==='return'&&v.returnLifeMode==='arrival')result.life=v.returnDuration;
      if(v.motion==='collapse'&&v.collapseLifeMode==='arrival')result.life=v.collapseDelay+v.radius/v.speed+v.afterArrival;
      if(v.motion==='collapse'&&v.collapseLifeMode==='arrival'&&v.arrivalHoldMode==='music')result.life=v.arrivalUntil-t;
    }
    if(v.kind==='caption')result.rect={x:Math.max(0,Math.min(300-v.captionWidth,v.x*300)),y:Math.max(0,Math.min(300-v.captionHeight,v.y*300)),w:v.captionWidth,h:v.captionHeight};
    if(lm('row')(v))result.gaps=parseGaps(v.gaps);
    if(sweeping(v)){
      if(barrage(v))result.sweepStyle='stepped';
      result.sweepDuration=v.sweepTiming==='speed'?360*v.turns/v.sweepSpeed:v.sweepDuration;
      if(v.sweepStyle==='continuous')result.fire=result.sweepDuration;
    }
    return result;
  }
  function read(e) {
    const v={...initial(),...e};
    if(e.kind==='battleKey'&&!e.keyStyle)v.keyStyle='falling';
    const preset=healOrigins[v.healOrigin];
    if(preset&&(e.x!==preset[0]||e.y!==preset[1]||e.translateX||e.translateY||e.mirrorAxis&&e.mirrorAxis!=='none'))v.healOrigin='custom';
    if(e.kind==='battleKey'&&!e.keyTiming&&(e.keySpeed!==undefined||e.spd!==undefined)){v.keyTiming='speed';v.keySpeed=e.keySpeed??e.spd;}
    if(e.endCondition){v.endMode=e.endCondition.type;v.endTime=e.endCondition.time??80;v.endPhase=e.endCondition.phaseId??'act2';v.endEvent=e.endCondition.eventId??'';v.endEdge=e.endCondition.edge??'start';}
    if(e.kind==='vision'){v.visionEnabled=e.enabled===false?'off':'on';v.radius=e.radius??155;v.duration=e.duration??1.2;}
    if(wire(e)){
      if(e.kind==='wireEmerge'&&!e.emergeTiming&&e.rise!==undefined)v.emergeTiming='duration';
      v.boxId=e.boxId||(e.box==='right'?'right':e.box==='left'?'left':'center');v.height=Math.min(300,e.height??300);v.pre=e.pre??0;
      v.gapMoving=e.gapMove?'on':'off';v.gapDirection=String(e.gapDir??1);v.emergeExit=e.emergeExit||(e.moveAfter?'move':'retract');
    }
    if(newPattern(e)){
      const nativeBox=typeof e.box==='object'?e.box:e.dual?{x:e.box==='right'?490:170,y:120,w:300,h:300}:{x:180,y:120,w:600,h:300};
      v.boxId=e.boxId||(e.dual?(e.box==='right'?'right':'left'):'center');
      if(flower(e)){
        v.flowerDirection=e.direction||'alternating';v.flowerCenter=e.centerHeart?'heart':'fixed';
        v.count=e.count??16;v.speed=e.speed??55;v.radius=e.radius??10;
        if(e.coordinateSpace!=='normalized-box'){
          const p=e.center||e;v.x=p.x===undefined?.5:(p.x-nativeBox.x)/nativeBox.w;v.y=p.y===undefined?.5:(p.y-nativeBox.y)/nativeBox.h;
        }
      }
      if(e.kind==='caption'){
        const r=e.rect||{x:nativeBox.x+40,y:nativeBox.y+100,w:220,h:80};
        v.captionWidth=r.w;v.captionHeight=r.h;
        if(e.coordinateSpace!=='normalized-box'){v.x=(r.x-nativeBox.x)/300;v.y=(r.y-nativeBox.y)/300;}
        else{v.x=e.x??r.x/300;v.y=e.y??r.y/300;}
      }
    }
    if(e.bulletType==='healSpiral'&&e.angularSpeed===undefined)v.angularSpeed=60;
    if(e.direction&&typeof e.direction==='object'){v.bulletDirection='angle';v.bulletAngle=e.direction.angle;}
    if(Array.isArray(e.gaps))v.gaps=e.gaps.join(',');
    if(e.kind==='laserRow'&&!e.laserMode)v.laserMode='row';
    if(e.kind==='laserRow'&&v.laserMode==='row'&&e.x===undefined)v.x=0;
    if(e.kind==='laserRow'&&e.endWidth===undefined)v.endWidth=v.laserWidth;
    if(e.safeHole!==undefined && !e.gaps) v.gaps=e.safeHole==='none'?'':String(e.safeHole);
    if(e.safeHole!==undefined && e.kind==='bullet' && !e.bulletType){v.bulletType='curtain';v.holePosition=e.safeHole==='none'?0.5:(Number(e.safeHole)+0.5)/6;v.holeWidth=e.safeHole==='none'?0:85;}
    v.widthPreset=({10:'thin',20:'medium',102:'thick'})[v.laserWidth]||'custom';
    return v;
  }
  const rad = a=>a*Math.PI/180;
  // Each start is a FIRE time relative to event.t; warnings start `warn` seconds earlier.
  function beams(e) {
    const out=[],put=(x,y,angle,start=0,spin=0)=>out.push({x:x*300,y:y*300,angle,start,spin});
    const x=e.x??.5,y=e.y??0,a=e.laserAngle??0;
    if(e.laserMode==='row') {
      for(let i=0;i<e.laneCount;i++)if(!e.gaps.includes(i))e.axis==='horizontal'?put(x,(i+.5)/e.laneCount,0):put((i+.5)/e.laneCount,y,90);
    }else if(e.laserMode==='group') {
      for(let i=0;i<e.beamCount;i++) {const d=(i-(e.beamCount-1)/2)*e.spacing/300;
        put(e.layout==='parallel'?x-Math.sin(rad(a))*d:x,e.layout==='parallel'?y+Math.cos(rad(a))*d:y,e.layout==='radial'?a+i*e.angleStep:a,e.timing==='sequential'?i*e.beamInterval:0);}
    }else if(['sweep','orbit'].includes(e.laserMode)) {
      const sign=e.sweepDirection==='clockwise'?1:-1;
      if(e.sweepStyle==='continuous')for(let i=0;i<e.beamCount;i++)put(x,y,a+i*360/e.beamCount,0,sign*e.turns*360/e.sweepDuration);
      else for(let i=0;i<e.beamCount*e.turns;i++)put(x,y,a+sign*i*360/e.beamCount,i*e.sweepDuration/(e.beamCount*e.turns));
    }else put(x,y,a);
    return out;
  }
  const angleDiff = (a,b)=>((a-b+540)%360+360)%360-180;
  const exitSpan=e=>l(e)&&e.laserExit!=='none'?(e.recoilDuration??.22)+(e.laserFade??.18):0;
  function laserBounds(e){const x=e.boxId==='left'?150:e.boxId==='right'?510:330;return {x:-x,y:-120,w:960,h:540};}
  function rayLength(x,y,angle,bounds){
    let enter=0,exit=Infinity;
    for(const [p,d,min,max] of [[x,Math.cos(rad(angle)),bounds.x,bounds.x+bounds.w],[y,Math.sin(rad(angle)),bounds.y,bounds.y+bounds.h]]){
      if(Math.abs(d)<1e-10){if(p<min||p>max)return 0;continue;}
      const a=(min-p)/d,b=(max-p)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    }
    return exit>=enter?Math.max(0,exit):0;
  }
  function laserFrame(e,time,playerAt,stopTime=Infinity,previewTarget=null) {
    return beams(e).flatMap((beam,beamIndex)=>{
      const end=Math.min(beam.start+e.fire,stopTime,e.holdMode==='music'?e.holdUntil-e.t:Infinity),exiting=time>=end;
      if(time<beam.start-e.warn||beam.start>=end||time>=end+exitSpan(e))return [];
      const sampleTime=Math.min(time,end),age=sampleTime-beam.start;
      let {x,y,angle}=beam;
      const aim=p=>Math.atan2(p.y-y,p.x-x)*180/Math.PI;
      const warningStart=beam.start-e.warn;
      if(e.laserMode==='aimOnce'){
        const p=!exiting&&previewTarget?previewTarget:playerAt(warningStart);
        angle=aim({x:p.x-(e.translateX||0)*300,y:p.y-(e.translateY||0)*300});
      }
      if(e.laserMode==='trackAngle') {
        angle=aim(playerAt(warningStart));
        const end=Math.min(sampleTime,warningStart+e.trackDuration);
        for(let t=warningStart;t<end;t+=1/60){const dt=Math.min(1/60,end-t),want=aim(playerAt(t+dt));angle+=Math.max(-e.trackRate*dt,Math.min(e.trackRate*dt,angleDiff(want,angle)));}
      }
      if(e.laserMode==='trackPosition') {
        const p=playerAt(Math.min(sampleTime,warningStart+e.trackDuration));
        if(e.followAxis!=='y')x=p.x+(e.offsetX||0)*300;
        if(e.followAxis!=='x')y=p.y+(e.offsetY||0)*300;
      }
      if(beam.spin)angle+=beam.spin*Math.max(0,age);
      const safe=sweeping(e)&&e.gapDegrees>0&&Math.abs(angleDiff(angle,e.gapAngle))<e.gapDegrees/2;
      if(e.laserMode==='orbit'){
        x=e.x*300+Math.cos(rad(angle))*e.orbitRadius;y=e.y*300+Math.sin(rad(angle))*e.orbitRadius;angle+=180;
      }
      if(e.laserRotation&&e.laserMode!=='aimOnce'){const a=rad(e.laserRotation),dx=x-e.x*300,dy=y-e.y*300;x=e.x*300+dx*Math.cos(a)-dy*Math.sin(a);y=e.y*300+dx*Math.sin(a)+dy*Math.cos(a);angle+=e.laserRotation;}
      let alpha=1,recoil=0;
      if(exiting){const elapsed=time-end,u=Math.min(1,elapsed/e.recoilDuration);recoil=e.recoilDistance*u*u;if(!barrage(e)){x-=Math.cos(rad(angle))*recoil;y-=Math.sin(rad(angle))*recoil;}alpha=Math.max(0,1-Math.max(0,elapsed-e.recoilDuration)/e.laserFade);}
      const length=rayLength(x+(e.translateX||0)*300,y+(e.translateY||0)*300,angle,laserBounds(e));
      const width=e.laserWidth+(e.endWidth-e.laserWidth)*Math.max(0,Math.min(1,age/(e.fire||1)));
      const recoilWidth=exiting?Math.max(.03,Math.pow(Math.max(0,1-(time-end)/(e.recoilDuration||.24)),3))*alpha:1;
      const flyTime=Math.min(e.warn,e.emitterFlyDuration??.3),fly=age<0&&flyTime>0&&e.emitterEntrance!=='off'?(e.emitterApproach??100)*Math.pow(Math.max(0,1-(age+e.warn)/flyTime),3):0;
      return [{x,y,angle,length,beamIndex,start:beam.start,warning:age<0,safe,exiting,alpha,recoil,emitterOffset:-fly-(barrage(e)&&exiting?recoil:0),emitterSize:e.emitterSize??14,dangerous:!exiting&&age>=0&&!safe,width,...(barrage(e)?{barrage:true,charge:Math.max(0,Math.min(1,(age+e.warn)/e.warn)),visualWidth:width*(exiting?recoilWidth:age<0?0:Math.min(1,.15+age/Math.min(.055,e.fire)))}:{})}];
    });
  }
  function wireSpan(e){
    const direction=e.side==='left'||e.side==='top'?1:-1,shift=translation(e),offset=wireHorizontal(e)?shift.x:shift.y;
    const travel=speed=>Math.max(0,300-direction*offset)/speed;
    if(e.kind==='wireEmerge'){const grow=wireRise(e);if(e.emergeExit==='stay')return Infinity;return e.pre+grow+e.hold+(e.moveAfter||e.emergeExit==='forward'?travel(e.moveSpeed):grow);}
    if(rootedWire(e))return e.pre+Math.max(0,300+Math.max(0,-direction*e.tilt)-direction*offset)/e.speed;
    return e.pre+travel(e.speed);
  }
  function flowerTiming(e,group){
    const born=e.t+group*e.gap,delay=e.motion==='collapse'&&e.holdMode==='music'?Math.max(0,e.holdUntil-born):e.collapseDelay;
    let life=e.life;if(e.motion==='collapse'&&e.collapseLifeMode==='arrival')life=e.arrivalHoldMode==='music'?e.arrivalUntil-born:delay+e.radius/e.speed+e.afterArrival;
    if(e.motion==='return'&&e.returnLifeMode==='arrival')life=e.returnDuration;
    return {born,delay,life};
  }
  function span(e){if(counterKey(e))return e.keyDuration;if(e.kind==='slash')return .45/(e.slashSpeed||1);if(wire(e))return wireSpan(e);if(setting(e))return Infinity;if(flower(e)){const last=flowerTiming(e,e.groups-1);return last.born-e.t+last.life;}if(area(e))return e.pulse*2+e.hold+e.fade;return e.kind==='laserRow'?(e.holdMode==='music'?e.holdUntil-e.t:Math.max(...beams(e).map(b=>b.start))+e.fire):(e.waveDuration||2)+(Math.max(0,(e.count||1)-1)*(e.interval||0))+(refined(e)?Math.max(0,(e.volleyCount||1)-1)*(e.volleyInterval||0)+(e.bulletType==='ambush'?(e.count-1)*e.ambushStep:0):0);}
  function mirrorWire(event){
    if(!wire(event))throw Error('请选择骨线事件。');
    const e={...event,side:({left:'right',right:'left',top:'bottom',bottom:'top'})[event.side]};
    if(rootedWire(e))e.tilt=-(e.tilt||0);
    const key=wireHorizontal(e)?'translateX':'translateY';e[key]=-(e[key]||0);delete e.chartId;delete e.expiresAt;return e;
  }
  function mirrorEvent(event,axis='auto'){
    if(!canMirror(event))throw Error('该事件没有可镜像的弹幕图形。');
    if(axis==='auto'&&wire(event))return mirrorWire(event);
    const masks={none:0,x:1,y:2,both:3},names=['none','x','y','both'];
    if(axis==='auto')axis='x';
    if(!Object.hasOwn(masks,axis)||axis==='none')throw Error('镜像方向无效。');
    const e=structuredClone(event);e.mirrorAxis=names[(masks[e.mirrorAxis]||0)^masks[axis]];delete e.chartId;delete e.expiresAt;return e;
  }
  const mirrorPoint=(e,p)=>({x:['x','both'].includes(e.mirrorAxis)?300-p.x:p.x,y:['y','both'].includes(e.mirrorAxis)?300-p.y:p.y});
  const api={fields,initial,visible,validate,build,read,bulletTypes,laserModes,beams,laserFrame,laserBounds,rayLength,span,exitSpan,rad,newPattern,wire,wireRise,rootedWire,wireHorizontal,wireRoot,canTranslate,translation,setting,canEnd,hasWarning,warningDuration,attackAt,warningAt,playbackEvent,sweeping,hasHold,holdStart,mirrorWire,flowerTiming,presentation,characterImages};
  function canMirror(e){return Object.hasOwn(fields[0].choices,e.kind)&&canEnd(e);}
  const bulletPresets=type=>({bulletDesign:'refined',bulletRadius:4,interval:0,angularSpeed:0,volleyCount:1,inflateEvery:0,x:.5,y:0,...({
    straight:{count:6,speed:234,waveDuration:3},ring:{count:16,speed:234,radius:0,x:.5,y:.5,gapDegrees:34,bulletWarn:.7,radialMotion:'outward'},
    fan:{count:7,speed:257,spread:51.566,volleyCount:2,volleyInterval:.366667,volleyAngle:3.724,bulletWarn:.9,fanAim:'heart'},
    curtain:{count:23,speed:199,holeWidth:65,volleyCount:2,volleyInterval:.466667,bulletWarn:.9},
    chase:{count:3,speed:105,maxSpeed:285,trackingDelay:0,interval:.333333,waveDuration:4,bulletRadius:5,spawnSpread:220},
    gravity:{count:14,speed:75,bulletDirection:'up',gravity:468,bounces:0,interval:.166667,waveDuration:5,bulletRadius:5},
    ambush:{count:8,speed:234,maxSpeed:525,telegraph:1,acceleration:180,ambushStep:.083333,x:.5,y:.5,waveDuration:5,bulletRadius:5},
    bubble:{count:12,speed:75,diffusion:63,inflateAfter:1,inflateEvery:3,interval:.133333,x:.5,y:.5,waveDuration:4,bulletRadius:6},
    boneStab:{count:16,speed:234,holeWidth:65},healArc:{count:10,speed:71.25,radius:110,ellipseRatio:1.06,x:.5,y:.5,radialMotion:'inward',heal:1,bulletRadius:6,waveDuration:4.5},
    healRain:{count:8,speed:116.25,interval:.2,heal:1,bulletRadius:6,waveDuration:4.5},healSpiral:{count:16,speed:60,radius:125,x:.5,y:.5,radialMotion:'inward',angularSpeed:60,heal:1,bulletRadius:6},
    word:{count:4,speed:58.5,interval:.233333,x:.5,y:.5,waveDuration:3,wordRoute:'mixed',wordSize:18,wordGrow:2,wordScale:2,arming:.4}
  }[type]||{})});
  const barragePreset={orbitStyle:'barrage',sweepStyle:'stepped',x:.5,y:.5,beamCount:48,turns:4,sweepTiming:'duration',sweepDuration:8,orbitRadius:230,sweepDirection:'counterclockwise',laserAngle:0,laserRotation:0,warn:.85,fire:.11,holdMode:'duration',laserWidth:30,endWidth:30,widthPreset:'custom',gapDegrees:0,laserExit:'recoil',recoilDuration:.24,recoilDistance:1000,laserFade:.14,emitterSize:14,emitterEntrance:'on',emitterFlyDuration:.3,emitterApproach:100};
  function flowerOrbitPivot(e,origin,elapsed){
    const t=Math.max(0,elapsed),base=e.centerHeart?origin:{x:e.flowerOrbitX*300,y:e.flowerOrbitY*300};
    let dx=0,dy=0;
    if(['line','pingpong'].includes(e.flowerOrbitPath)){
      let d=e.flowerPathSpeed*t;if(e.flowerOrbitPath==='pingpong'){const span=e.flowerPathLength;d=span-Math.abs(d%(2*span)-span);}
      dx=Math.cos(rad(e.flowerPathAngle))*d;dy=Math.sin(rad(e.flowerPathAngle))*d;
    }else if(['circle','ellipse','eight'].includes(e.flowerOrbitPath)){
      const phase=rad(e.flowerPathPhase),a=phase+rad(e.flowerPathAngularSpeed)*t,rx=e.flowerPathRadiusX,ry=e.flowerOrbitPath==='circle'?rx:e.flowerPathRadiusY;
      // Start at the authored center without a first-frame position jump.
      dx=rx*(Math.cos(a)-Math.cos(phase));dy=ry*(Math.sin(e.flowerOrbitPath==='eight'?2*a:a)-Math.sin(e.flowerOrbitPath==='eight'?2*phase:phase));
    }
    return {x:base.x+dx,y:base.y+dy};
  }
  function flowerCenterAt(e,origin,elapsed){
    if(!flowerOrbit(e))return origin;
    const pivot=flowerOrbitPivot(e,origin,elapsed),a=rad(e.flowerOrbitAngle+e.flowerOrbitSpeed*Math.max(0,elapsed));
    return {x:pivot.x+e.flowerOrbitRadius*Math.cos(a),y:pivot.y+e.flowerOrbitRadius*Math.sin(a)};
  }
  Object.assign(api,{mirrorEvent,mirrorPoint,canMirror,refined,bulletWarned,bulletPresets,healing,healOrigins,barrage,barragePreset,flowerOrbit,flowerOrbitPivot,flowerCenterAt,cinematic,backgroundImages,animationSlots});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
