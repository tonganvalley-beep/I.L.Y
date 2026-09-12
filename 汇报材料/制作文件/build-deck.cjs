const pptxgen=require('pptxgenjs'),fs=require('fs'),path=require('path');
const pptx=new pptxgen();pptx.layout='LAYOUT_WIDE';pptx.author='I.L.Y 项目组';pptx.subject='第三周项目总结汇报 · 8分钟';pptx.title='I.L.Y｜让喜欢成为一次选择';pptx.company='I.L.Y';pptx.lang='zh-CN';
pptx.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei',lang:'zh-CN'};
const W=13.333333,H=7.5,C={bg:'0B1522',panel:'142537',line:'294050',text:'F6F1E8',muted:'ADC0CC',cyan:'89D7E5',peach:'F1B797',green:'ACD6B0',gold:'D9C18D'};
const out=path.resolve('汇报材料'),imgs=path.join(out,'游戏截图');const pages=[];let s,objects;
function esc(t){return String(t).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function rect(x,y,w,h,color=C.panel,line=null,trans=0){s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color,transparency:trans},line:{color:line||color,transparency:line?0:100,width:.8}});objects.push({type:'rect',x,y,w,h,color,line,trans});}
function text(t,x,y,w,h,size=18,color=C.text,bold=false,extra={}){s.addText(t,{x,y,w,h,fontFace:extra.font||'Microsoft YaHei',fontSize:size,color,bold,margin:0,breakLine:false,vertAnchor:'top',valign:'top',paraSpaceAfterPt:0,lineSpacingMultiple:1.12,...extra});objects.push({type:'text',t,x,y,w,h,size,color,bold,...extra});}
function line(x,y,w,color=C.line){rect(x,y,w,.009,color);}
function image(file,x,y,w,h,fit='contain'){const p=path.isAbsolute(file)?file:path.join(imgs,file+'.png');s.addImage({path:p,x,y,w,h,sizing:{type:fit,w,h}});objects.push({type:'image',p,x,y,w,h,fit});}
function tag(t,x,y,w,color=C.cyan){rect(x,y,w,.34,C.panel);text(t,x+.11,y+.065,w-.22,.22,10,color,true);}
function pill(t,x,y,w,color=C.cyan){rect(x,y,w,.56,C.panel,color);text(t,x+.14,y+.135,w-.28,.3,15,color,true);}
function arrow(x,y,w=.28){text('→',x,y,w,.36,21,C.cyan,true);}
function caption(t,x,y,w,color=C.muted){text(t,x,y,w,.35,12,color);}
function title(k,t,sub=''){text(k,.55,.30,11,.22,10,C.cyan,true,{charSpacing:1.2});text(t,.55,.77,12.25,.61,29,C.text,true);if(sub)text(sub,.58,1.48,12.1,.39,14,C.muted);}
function slide(k,t,sub,time,notes,sources=[]){s=pptx.addSlide();s.background={color:C.bg};objects=[];pages.push({title:t,time,notes,sources,objects});title(k,t,sub);return s;}
function footer(n,appendix=false){line(.55,7.08,12.23);text(appendix?'I.L.Y / 备查资料 · 不计入正文讲述':'I.L.Y / 第三周项目总结汇报',.55,7.19,8,.18,9,C.muted);text(appendix?'A'+(n-14):String(n).padStart(2,'0')+' / 14',11.73,7.17,1.05,.22,10,C.cyan,true,{align:'right'});}
function note(){const p=pages[pages.length-1];s.addNotes(`【建议用时】${p.time?p.time+'秒':'备查，不主动讲述'}\n【讲述与指示】\n${p.notes}\n【证据来源】\n${p.sources.join('\n')}\n【演示说明】画面来自实际游戏运行或明确标注的仓库既有预览。正文无需启动游戏。`);footer(pages.length,pages.length>14);}
function source(t){caption(t,.58,6.68,12.15);}
function cardhead(n,t,x,y,w,color=C.cyan){text(n,x,y,.48,.38,17,color,true);text(t,x+.57,y,w-.57,.4,18,C.text,true);}

// 01
s=pptx.addSlide();s.background={color:C.bg};objects=[];pages.push({title:'让“喜欢”，成为一次选择。',time:15,notes:'直接进入项目：I.L.Y 是一款把对白、地图探索和弹幕结合起来的叙事游戏。我们的核心问题是，怎样让玩家通过自己的操作参与故事。接下来用实际画面说明内容怎样组织、玩法怎样实现，最后展示七幕最终战。不要介绍队名或分工。',sources:['game/data/story/chapter3.js · ch3_002','game/src/main.js'],objects});
image('10-adult',0,0,W,H,'cover');rect(0,0,5.63,H,C.bg,null,4);rect(5.63,0,.035,H,C.peach);
text('I.L.Y',.62,.55,4.4,1.05,61,C.text,true);text('INTERACTIVE NARRATIVE',.67,1.64,4.6,.26,11,C.peach,true,{charSpacing:1.5});
text('让“喜欢”，\n成为一次选择。',.65,2.43,4.65,1.56,30,C.text,true);text('从阅读故事，到进入故事现场',.67,4.35,4.35,.4,17,C.muted);
pill('对白',.67,5.15,1.22);pill('探索',2.03,5.15,1.22);pill('弹幕',3.39,5.15,1.22,C.peach);text('第三周项目总结汇报 · 8 分钟',.67,6.47,4.6,.3,13,C.muted);note();

// 02
slide('01 / 内容架构','一条叙事主线，五段情绪递进','以主线体验串联章节；不同选择会跳转、分流，最终汇入不同结局。',35,'先沿五张图从左向右讲。序章以旧手机和邮件提出悬念；第一章用共同生活与调查建立关系；第二章用约定和夕阳制造分歧；第三章把过去与现实放到两部手机的选择里；最终章通过七幕战斗和告别收束。这里呈现的是当前已经接入的章节结构，不把素材数量等同于游戏完成度。下一页具体看玩家如何参与。',['game/src/core/chapter1.js · prepareChapter1','game/data/story/{prologue,chapter1,chapter2,chapter3,final}.js']);
const chapters=[['序章','蓝色来电','17-phone','读邮件 · 提出悬念'],['第一章','失而复得的日常','25-character','调查 · 建立关系'],['第二章','约定与夕阳','06-hand','陪伴 · 产生分歧'],['第三章','过去与现在','10-adult','两部手机 · 作出选择'],['最终章','One Last Kiss','15-ending','七幕战斗 · 告别']];
chapters.forEach((a,i)=>{let x=.57+i*2.46;image(a[2],x,2.25,2.30,1.63,'cover');text('0'+i,x,4.11,.48,.35,15,C.peach,true);text(a[0],x+.52,4.08,1.75,.42,20,C.text,true);text(a[1],x,4.66,2.30,.45,14,C.cyan);text(a[3],x,5.33,2.30,.65,13,C.muted);});
source('当前数据：5 个章节 · 1,359 个剧情节点（含对白、玩法与结局节点）· 15 张 RPG 地图');note();

// 03
slide('02 / 交互设计','让玩家动手，剧情才继续','“操作—反馈—叙事”形成闭环，而不是把小游戏附在对白后面。',35,'指左图：手机不是装饰，玩家进入邮件、阅读信息，再推进剧情。指右图：地图上的调查点会打开照片和回忆，把探索动作转化成新的信息。再指底部闭环：角色遇到问题，玩家行动，界面给出反馈，故事继续。我们的可玩性重点是让操作有叙事意义，而不是堆积无关的挑战。',['game/src/modes/phone.js','game/src/modes/rpg.js · act','game/data/maps/chapters.json · ch2-flowers']);
image('24-phone-mail',.57,2.15,5.91,3.325);image('26-flower-memory',6.83,2.15,5.91,3.325);caption('序章｜进入邮件，在手机中获取故事信息',.59,5.62,5.8);caption('第二章｜调查花丛，打开六月的照片',6.85,5.62,5.8);
['遇到疑问','主动操作','获得反馈','继续剧情'].forEach((t,i)=>{pill(t,.73+i*3.13,6.20,2.49,i===3?C.peach:C.cyan);if(i<3)arrow(3.37+i*3.13,6.31);});note();

// 04
slide('03 / 分支设计','同一个问题，走向不同的人生','选择写入旗标；后续内容读取旗标，改变信息量与章节路径。',35,'左图是第一章真实的三选一。A 接受真实，B 接受但保留怀疑，C 将它当成噩梦。右侧看具体差异：A 和 B 进入重逢主线，但 B 能获得 P1 到 P4 的专属疑点；C 会跳过第二章，转入第三章对应场景。后续“买水还是留下”和“两部手机”继续影响结局。不是所有选项都对应一个独立结局，完整条件在备查页。',['game/data/story/chapter1.js · ch1_choice','game/src/core/chapter1.js · enterChapterNode','tests/chapters.test.mjs · All branch combinations']);
image('02-choice',.57,2.15,6.37,3.585);caption('第一章原型｜“海边那一夜，究竟是梦，还是现实？”',.58,5.89,6.4);
[['A','真实的','进入重逢主线',C.cyan],['B','真实的，但……','进入主线 + P1—P4 疑点',C.peach],['C','只是噩梦','跳过第二章 → 第三章',C.green]].forEach((a,i)=>{let y=2.17+i*1.29;rect(7.38,y,5.35,1.07,C.panel);text(a[0],7.60,y+.2,.5,.5,26,a[3],true);text(a[1],8.29,y+.13,4.1,.34,17,C.text,true);text(a[2],8.29,y+.59,4.1,.31,14,C.muted);});
source('实现抓手：choices[].flag → state.flags.route → 节点 route / when 判断 → next 跳转');note();

// 05
slide('04 / 项目文件结构','剧情与玩法，共用一个调度入口','内容数据、运行状态与界面表现分离，后续章节复用现有模式。',35,'左侧只讲五个职责：story 保存剧情节点；maps 保存地图和事件；core 管状态、存档与场景；modes 管不同玩法；素材和样式负责表现。右侧是一帧之外更重要的流程：main 的 go 找到节点，销毁旧模式，更新状态，再按类型挂载新模式。这样从对白进入 RPG、再进入战斗，旧监听器和动画不会继续干扰下一场景。',['game/index.html','game/src/main.js · go','game/src/core/chapter1.js']);
rect(.57,2.1,5.72,4.39,C.panel);text('game/',.83,2.36,4.9,.39,21,C.cyan,true,{font:'Consolas'});
text('├─ data/story/    剧情与分支\n├─ data/maps/     地图与事件\n├─ src/core/      状态、存档、场景\n├─ src/modes/     对白、RPG、战斗\n├─ assets/        图片、音频位置\n└─ styles/        分层舞台与控件',.85,3.00,5.16,2.89,14,C.text,false,{font:'Microsoft YaHei',lineSpacingMultiple:1.35});
text('src/main.js → go(nodeId)',6.84,2.23,5.8,.4,20,C.peach,true,{font:'Consolas'});
[['读取节点','next / choice / condition'],['清理旧模式','cleanup()：事件、计时器、动画'],['更新状态','chapter / flags / clues / maps'],['挂载新模式','dialogue / phone / rpg / boss']].forEach((a,i)=>{let y=2.94+i*.84;text('0'+(i+1),6.85,y,.53,.36,16,C.cyan,true);text(a[0],7.55,y,4.5,.33,17,C.text,true);text(a[1],7.55,y+.38,4.88,.27,12,C.muted);});source('共享战斗：danmutest/game.js 提供教学引擎；danmu-boss/danmu-boss/ 提供最终战。');note();

// 06
slide('05 / 关键数据结构','三个数据对象，连接故事与操作','同一份状态贯穿对白、探索、分支和存档。下方字段均来自当前实现。',35,'从左到右看三个对象。剧情节点记录类型、地图、任务和下一节点；地图对象记录尺寸、出生点、碰撞格和事件；运行状态记录当前章节、当前节点、旗标、线索和位置。比如第一章清扫节点引用 ch1-room 地图和 G1 任务，任务完成后再走 next。这种组织方式让美术替换和剧情补充可以尽量不改核心逻辑。',['game/data/story/chapter1.js · ch1_g1','game/data/maps/chapter1.json · ch1-room','game/src/core/state.js · createState']);
const dataCards=[['01','剧情节点','type: "rpg"\nmap: "ch1-room"\ntask: "G1"\ntext: "整理三处杂物"\nnext: …','决定“现在做什么”',C.cyan],['02','地图 JSON','width: 24, height: 16\ntileSize: 48\nspawn: { x: 13, y: 13 }\ntiles: [ … ]\nevents: [ … ]','决定“在哪里、能否通过”',C.peach],['03','运行状态','chapter / node\nflags: { route, rpg, … }\nclues: [ … ]\nmaps: { 地图ID: {x,y} }\nversion: 1','决定“做过什么、从哪继续”',C.green]];
dataCards.forEach((a,i)=>{let x=.57+i*4.16;rect(x,2.19,3.89,4.21,C.panel);cardhead(a[0],a[1],x+.23,2.47,3.46,a[5]);line(x+.23,3.11,3.43);text(a[2],x+.23,3.4,3.44,2.09,13,C.text,false,{font:'Consolas',lineSpacingMultiple:1.3});text(a[3],x+.23,5.77,3.44,.36,14,a[5],true);});source('代码节选与结构摘要；省略号表示省略字段，不作为可直接执行的完整对象。');note();

// 07
slide('06 / 关键算法 · 移动','移动要连续，也要守住边界','连续坐标 + 方向归一化 + 分步碰撞 + 镜头限位。',35,'左侧是真实出租屋地图。输入首先归一化，避免斜向移动更快，再按时间增量算位移。单次位移细分成不超过零点一格的小步，并分别尝试横轴、纵轴，因此不会轻易穿墙，还能沿墙滑动。镜头随角色移动，但被地图边界约束。这里的价值是操作稳定、不同帧率下速度一致，测试覆盖了这些行为。',['game/src/modes/rpg.js · tick','game/src/core/state.js · moveRpg / canStandRpg','tests/chapter1.test.mjs · continuous movement','tests/room-art.test.mjs']);
image('19-investigate-before',.57,2.14,6.40,3.60);caption('真实运行画面｜角色使用浮点位置，地图仍提供碰撞格',.6,5.92,6.40);
[['归一化','dx / length，dy / length'],['时间增量','distance = 3.8 × dt'],['分步碰撞','每步 ≤ 0.1 格；X / Y 分别检测'],['镜头限位','跟随角色，限制在地图边界']].forEach((a,i)=>{let y=2.17+i*1.04;text('0'+(i+1),7.4,y,.5,.36,17,C.peach,true);text(a[0],8.1,y,4.53,.38,19,C.text,true);text(a[1],8.1,y+.48,4.55,.35,14,C.muted);});source('验证范围：60 / 120 步更新等距、不能穿墙、沿墙滑动、浮点位置存档、镜头边界。');note();

// 08
slide('07 / 关键算法 · 任务','一次调查，怎样真正改变世界？','以 G1 清扫为例：画面变化与任务状态同步发生。',35,'请注意左右两张图中央同一个位置：调查前有杂物，按 E 后杂物消失，底部出现反馈。背后先检查事件是否已收集，再写入 collected，更新 CLEAN_NUM；三处全部完成才允许接回对白。重复调查不重复计数。其他任务复用这套状态机制，例如找齐两只手柄才能启动电脑，买好食品才能结账。',['game/src/core/chapter1.js · interactRpg','game/src/modes/rpg.js · events / refresh','tests/chapter1.test.mjs · Tasks gate progression']);
image('19-investigate-before',.57,2.13,5.92,3.33);image('20-investigate-after',6.83,2.13,5.92,3.33);tag('BEFORE / 尚未调查',.74,2.31,2.2);tag('AFTER / 已收集',7,2.31,2.0,C.peach);
caption('同一位置：杂物存在，靠近后显示 E 调查',.59,5.64,5.85);caption('同一位置：杂物消失，清扫进度变为 1 / 3',6.85,5.64,5.84,C.peach);
['靠近事件','collected 去重','累计 3 处','done → next'].forEach((t,i)=>{pill(t,.72+i*3.12,6.19,2.5,i===3?C.peach:C.cyan);if(i<3)arrow(3.34+i*3.12,6.30);});note();

// 09
slide('08 / 存档与连续体验','玩家离开以后，故事还记得什么？','存档保存数据；重新进入时恢复场景与进度。',25,'看左侧存档卡片：显示场景预览、章节、摘要和时间。每个账号有十二个手动槽、三个循环自动档和一个快速档。存档保留节点、路线旗标、线索、地图位置和任务进度；旧单槽也有迁移逻辑。当前是浏览器本地存档，没有云同步，战斗会从关卡开头重试。',['game/src/core/saves.js','game/src/core/state.js · validateSave','game/src/main.js · renderSaveSlots / maybeAutosave']);
image('27-save-filled',.57,2.12,7.12,4.01);caption('存档界面实拍｜槽位预览 + 章节 + 对白摘要 + 时间',.59,6.30,7.2);
[['12','手动槽'],['3','循环自动档'],['1','快速档']].forEach((a,i)=>{let y=2.15+i*1.05;text(a[0],8.21,y,1.18,.65,36,i===1?C.peach:C.cyan,true);text(a[1],9.66,y+.18,2.65,.4,19,C.text,true);});line(8.22,5.45,4.40);text('保留：节点 / 旗标 / 线索 / 位置\n当前：本地存储，无云同步',8.22,5.76,4.46,.85,14,C.muted);note();

// 10
slide('09 / 可玩性与反馈','先学会躲避，再承接情绪高潮','45 秒教学建立规则；最终战把相同动作转化为叙事表达。',30,'先解释左侧教学：红心白点是判定中心，绿色弹可以回血，虚线激光先预警再生效。玩家可慢速移动、暂停、失败重试，也能继续剧情，避免技术门槛阻断故事。最后的 Boss 战会复用躲避与接取这两种动作，把危险词与治疗词变成情绪表达。完整战斗不在课堂现场跑五分钟，后面用精选画面讲重点。',['game/src/modes/danmu.js','danmutest/game.js','game/src/modes/boss.js']);
image('18-tutorial',.57,2.16,7.03,3.954);caption('第一章｜45 秒生存教学，支持失败后重试或继续',.59,6.31,7.1);
[['看得懂','白点判定 / 激光预警 / 绿弹回血'],['控得住','方向键 / Shift 慢速 / P 暂停'],['继续得下去','失败重试 / 剧情模式 / 简化动态']].forEach((a,i)=>{let y=2.30+i*1.31;text(a[0],8.04,y,4.55,.43,22,i===2?C.peach:C.cyan,true);text(a[1],8.04,y+.62,4.68,.72,14,C.muted);});note();

// 11
slide('10 / 当前进展','主线已接入，完成度仍要分开看','以下结论基于当前工作区代码、实际画面和本次测试；不使用主观完成百分比。',35,'这里明确完成和未完成。当前五个章节、十五张 RPG 地图已在代码里接入，主线有三类结局，教学和最终战能进入，存档和回忆功能存在。验证方面，主项目三十二项和 Boss 十二项测试通过，另外检查了本次截取的关键页面。仍需继续补正式地图美术、占位人物和 CG、实际音频，并做全路线人工通关、难度和设备验收。测试通过不等于发布完成。',['tests/*.test.mjs · 本次32/32通过','danmu-boss/danmu-boss/tests/boss.test.mjs · 本次12/12通过','game/data/assets.js · placeholders 与音频路径','game/assets/audio/ · 当前仅.gitkeep']);
[['5','已接入章节'],['15','RPG 地图'],['3','主线结局类型'],['44','本次通过测试']].forEach((a,i)=>{let x=.6+i*3.12;rect(x,2.16,2.78,1.39,C.panel);text(a[0],x+.2,2.3,2.3,.66,38,i===3?C.peach:C.cyan,true);text(a[1],x+.22,3.06,2.3,.3,13,C.muted);});
text('已实现 / 有证据',.65,3.98,5.65,.4,20,C.green,true);text('剧情分支、地图任务与跨章跳转\n45 秒教学 + 七幕 Boss 主线接入\n多槽存档、线索与回忆入口',.65,4.67,5.76,1.41,17,C.text,false,{lineSpacingMultiple:1.2});
text('待完善 / 待验收',7.02,3.98,5.65,.4,20,C.peach,true);text('部分地图、角色、CG 仍为占位表现\n正式 BGM / 音效 / 配音尚待补齐\n全路线人工通关、难度与设备验收',7.02,4.67,5.69,1.41,17,C.text,false,{lineSpacingMultiple:1.2});source('测试覆盖分支、任务、存档、地图可达性与战斗机制；不等同于全篇人工通关或最终体验验收。');note();

// 12
slide('11 / 原型展示 · 连续看一次','从一个动作，到一次选择','三帧串起“能操作、会反馈、会改变走向”的实际原型。',30,'这页当作离线原型演示，不切换程序。第一帧，玩家在房间调查，杂物立即消失；第二帧，调查花丛，照片和文字回忆被打开；第三帧，两部手机同时响起，玩家必须选择过去或现实。三帧分别证明动作能执行、信息有反馈、选择能影响走向。基础操作前面已解释过，这里不再重复，直接进入最有特点的最终战。',['游戏截图/20-investigate-after.png','游戏截图/26-flower-memory.png','game/data/story/chapter3.js · ch3_choice4']);
[['20-investigate-after','01 / 动作','清扫改变地图'],['26-flower-memory','02 / 信息','调查打开回忆'],['11-phones','03 / 选择','两部手机，两个方向']].forEach((a,i)=>{let x=.58+i*4.16;image(a[0],x,2.4,3.86,2.65,'cover');text(a[1],x,5.35,3.86,.32,13,C.cyan,true);text(a[2],x,5.90,3.86,.47,19,C.text,true);});note();

// 13
slide('12 / 最后展示 · 七幕回响','躲开她的执念，接住她的温柔','攻击与治疗交替推进；最后一幕把两种情绪交织在同一片弹幕中。',50,'这是最后的核心亮点。第一张是本次从主线进入 Boss 后截到的实际画面，台词词条和弹幕同时出现；后两张是仓库保存的治疗幕和终篇预览。七幕按攻击、治疗交替，最后合流：玩家既要避开危险，也要主动接住治疗词。技术上用时间线调度七幕和波次，成功流程约三百秒、一百五十七个真实波次。课堂只讲这三个关键状态，不完整播放五分钟。最后再看战斗怎样回到叙事。',['game/src/modes/boss.js · mountBoss','danmu-boss/danmu-boss/game.js · ACTS / makeTimeline','danmu-boss/danmu-boss/README.md','后两图来源：danmu-boss/danmu-boss/previews/healing.png、finale.png（仓库既有预览）']);
image('23-boss-live',.57,2.11,4.0,2.25);image(path.resolve('danmu-boss/danmu-boss/previews/healing.png'),4.67,2.11,4.0,2.25);image(path.resolve('danmu-boss/danmu-boss/previews/finale.png'),8.77,2.11,4.0,2.25);
text('执念 / 躲避危险词',.61,4.59,3.9,.41,18,C.peach,true);text('温柔 / 接取治疗词',4.71,4.59,3.9,.41,18,C.green,true);text('终篇 / 两种情绪交织',8.81,4.59,3.9,.41,18,C.cyan,true);
['初遇','回应','追问','迟疑','失控','恳求','终篇'].forEach((t,i)=>{let x=.62+i*1.79;rect(x,5.49,1.64,.62,i%2===1?'233D37':C.panel);text(String(i+1)+'  '+t,x+.13,5.65,1.4,.3,14,i%2===1?C.green:C.peach,true);});source('成功流程约 300 秒 · 157 波 · 菜单 / 失焦暂停 · 失败重试 · 剧情模式可继续；后两图为仓库既有预览。');note();

// 14
slide('13 / 收束 · 从玩法回到故事','七幕之后，I.L.Y. 成为一句告白','战斗结束后，搜索与来信把主题重新交还给玩家。',30,'最后用这三张实际画面收束。搜索 ILY，界面把这几个字母解释成 I LOVE YOU；多年后的来信回应了旧手机埋下的线索；结局回到海边。战斗的躲避、治疗和坚持，最终都服务于这场告别。我们的阶段成果，是把一条跨章节的故事做成能够阅读、探索、选择并得到反馈的原型；接下来继续打磨音画和完整体验。讲到这里结束，不主动展开备查页。',['game/src/modes/chapter-moments.js · search / letter','game/data/story/final.js · fin_mail / ending_true']);
image('15-ending',.57,2.15,7.7,4.33);image('16-search',8.54,2.15,4.2,2.1,'cover');image('14-letter',8.54,4.46,4.2,2.1,'cover');tag('01 / 搜索 ILY',8.69,2.29,1.72);tag('02 / 十年后的来信',8.69,4.60,2.22,C.peach);note();

// 15 appendix schedule
slide('APPENDIX A / 演示计划','8 分钟演示计划','正文共 14 页，讲述 7 分 40 秒；预留 20 秒缓冲。备查页不主动播放。',0,'排练时按右侧时间点检查进度。如已超时，优先压缩第6—9页的技术解释，每页只保留结论；第13页七幕战斗和第14页收束必须保留。课堂以本PPT或PDF离线展示，不依赖现场运行游戏。',[]);
const plan=[['00:00—01:00','P1—P3','直接入题、五章结构、交互闭环'],['01:00—02:00','P3—P4','完成交互解释，说明 A/B/C 分支'],['02:00—03:00','P5—P6','文件结构、调度、三个数据对象'],['03:00—04:00','P6—P8','移动碰撞与任务状态'],['04:00—05:00','P8—P10','完成任务示例、存档与教学'],['05:00—06:00','P10—P12','可玩性、真实进展、连续原型'],['06:00—07:00','P12—P13','快速串联原型，重点展示七幕战斗'],['07:00—08:00','P13—P14','完成战斗说明，结局收束与缓冲']];
plan.forEach((a,i)=>{let y=2.1+i*.51;if(i%2===0)rect(.57,y,12.18,.47,C.panel);text(a[0],.78,y+.08,2.46,.3,14,C.cyan,true);text(a[1],3.34,y+.08,1.5,.3,14,C.peach);text(a[2],5.02,y+.08,7.44,.3,14,C.text);});source('第二周已经演示过的基础操作只快进带过。提交 PPT + 演示计划；课前准备本地 / USB 备份。');note();

// 16 appendix branches
slide('APPENDIX B / 分支备查','三个主线结局，怎样判定？','序章另有分支终点；这里仅解释跨章主线的三类结局。',0,'这是给追问准备的精确条件。route 不是 C 并且第二章选择 stay，会到 ENDING_JUST2；其他情况继续，第三章 n4 为 B 到 ENDING_REALITY，否则进入最终章 ENDING_TRUE。C 路线不经过第二章。n2 改变回应和部分线索，不单独决定这三个结局。测试枚举的24组旗标组合也包含C线中不会实际经历的第二章旗标，不能说成24条独立可玩路线。',['tests/chapters.test.mjs · traverse / expected','game/data/story/chapter2.js · ch2_choice3','game/data/story/chapter3.js · ch3_choice4']);
pill('第一章 route',.67,2.3,2.47);arrow(3.34,2.39);pill('A / B → 第二章',3.91,2.05,3.2);pill('C → 直接第三章',3.91,3.06,3.2,C.peach);
arrow(7.31,2.16);pill('n3 = stay',7.78,2.05,2.17);text('→ Just the Two of Us',10.13,2.18,2.6,.73,15,C.green,true);
text('n3 = buy，或 route = C',4.09,4.19,5.17,.4,20,C.text,true);text('↓',6.5,4.77,.5,.4,22,C.cyan,true);
pill('第三章 n4 = B',1.25,5.47,3.48);pill('第三章 n4 = A',8.03,5.47,3.48,C.peach);text('Reality / 现实方向',1.25,6.21,4.7,.37,19,C.green,true);text('最终章 → One Last Kiss',8.03,6.21,4.85,.37,19,C.peach,true);note();

// 17 appendix screenshot map
slide('APPENDIX C / 截图与原型入口','需要补讲时，按场景直接定位','已把静态画面嵌入 PPT；以下入口仅供课前排练或答疑。',0,'入口相对仓库 game/index.html。scene-preview 是项目现有的预览入口，用于直接定位节点；带条件的场景可能需要先建立路线旗标。清扫前后与花丛调查使用独立预览存档，不更改正常玩家的进度。Boss后续预览来自仓库原有文件，不能宣称是本次手动通关录制。',['game/chapters.html','汇报材料/截图索引.md']);
const refs=[['对白与人物','ch1_008','P2'],['第一章分支','ch1_choice','P4'],['清扫前后','ch1_g1 + 调查','P7—P8、P12'],['手机邮件','s01_phone + 打开邮件','P3'],['花丛回忆','ch2_g2 + 调查','P3、P12'],['两部手机','ch3_choice4','P12'],['弹幕教学','ch1_battle + 开始关卡','P10'],['七幕最终战','fin_s03 + 开始挑战','P13'],['搜索 / 来信 / 结局','fin_s05 / fin_mail / ending_true','P14']];
refs.forEach((a,i)=>{let y=2.08+i*.43;if(i%2===0)rect(.58,y,12.15,.41,C.panel);text(a[0],.79,y+.075,2.5,.27,13,C.text,true);text(a[1],3.62,y+.075,6.67,.27,12,C.cyan,false,{font:'Consolas'});text(a[2],10.72,y+.075,1.81,.27,12,C.peach);});text('入口格式：game/index.html?player=scene-preview&scene=节点ID',.77,6.3,11.9,.36,14,C.muted,false,{font:'Consolas'});note();

// 18 appendix visual backup
slide('APPENDIX D / 更多真实画面','地图与玩法补充画面','用于说明地图覆盖与美术现状；简化地图表现如实保留。',0,'左上便利店采购，右上水族馆寻人，左下夜海寻找，右下是主线最终战的入口与剧情模式。地图当前有可用碰撞和事件，但部分仍为简化美术。不要把这些画面介绍成正式美术全部完成。',['game/data/maps/chapter1.json','game/data/maps/chapters.json','game/src/modes/boss.js']);
[['04-store','第一章 / 便利店采购'],['05-aquarium','第一章 / 水族馆寻人'],['12-night','第三章 / 夜海寻找'],['13-boss-intro','最终章 / 战斗与剧情模式入口']].forEach((a,i)=>{let x=.64+(i%2)*6.29,y=2.06+Math.floor(i/2)*2.38;image(a[0],x,y,5.99,1.90,'cover');caption(a[1],x,y+1.99,5.99);});note();

// Export editable PPTX + an equivalent HTML layout for visual QA and PDF backup.
function toHtml(o){const pos=`left:${o.x*120}px;top:${o.y*120}px;width:${o.w*120}px;height:${o.h*120}px;`;
if(o.type==='rect')return `<div class="obj" style="${pos}background:#${o.color};opacity:${1-o.trans/100};${o.line?'border:1px solid #'+o.line+';':''}"></div>`;
if(o.type==='image')return `<img class="obj" style="${pos}object-fit:${o.fit};" src="data:image/png;base64,${fs.readFileSync(o.p).toString('base64')}"/>`;
return `<div class="obj text" style="${pos}font-family:'${o.font||'Microsoft YaHei'}';font-size:${o.size*120/72}px;color:#${o.color};font-weight:${o.bold?700:400};text-align:${o.align||'left'};line-height:${o.lineSpacingMultiple||1.16};${o.charSpacing?'letter-spacing:1px;':''}">${esc(o.t)}</div>`;}
let html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>I.L.Y 汇报预览</title><style>*{box-sizing:border-box}body{margin:0;background:#333}.slide{position:relative;width:1600px;height:900px;overflow:hidden;background:#'+C.bg+';page-break-after:always;margin:0}.obj{position:absolute}.text{white-space:pre-wrap;overflow:visible} @page{size:1600px 900px;margin:0} @media print{body{background:none}.slide{break-after:page}}</style><body>'+pages.map((p,i)=>`<section class="slide" id="s${i+1}">${p.objects.map(toHtml).join('')}</section>`).join('')+'</body></html>';
fs.writeFileSync(path.join(out,'制作文件','预览.html'),html);
fs.writeFileSync(path.join(out,'制作文件','deck-data.json'),JSON.stringify(pages.map(({objects,...p})=>p),null,2));
fs.writeFileSync(path.join(out,'逐页讲稿与演示计划.md'),'# I.L.Y 项目总结汇报\n\n正文14页，建议讲述7分40秒，预留20秒。备查4页不主动播放。\n\n'+pages.map((p,i)=>`## ${i+1}. ${p.title}${p.time?'（'+p.time+'秒）':'（备查）'}\n\n${p.notes}\n\n依据：${p.sources.join('；')||'用户提供的课程汇报要求'}\n`).join('\n'));
const backup=path.join(out,'原稿备份.pptx');if(!fs.existsSync(backup))fs.copyFileSync('I.L.Y_项目总结汇报.pptx',backup);
pptx.writeFile({fileName:path.resolve('I.L.Y_项目总结汇报.pptx')}).then(()=>console.log('Built',pages.length,'slides;',pages.reduce((a,p)=>a+(p.time||0),0),'seconds'));


