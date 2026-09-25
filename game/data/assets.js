// 《I.L.Y.》序章 · 资源清单（占位）
// 路径沿用项目既有约定：images/backgrounds|characters|ui，audio/bgm|sfx|voices。
// 当前已有正式图片直接使用；尚未提供的素材指向对应类型的占位 SVG，后续只需替换路径。
//
//  ⚠ 注意：sfx / voices 目前只登记路径，代码中尚未接线播放。
//     仅在需要时在场景节点上加 bgm 字段即可切 BGM（Assets.setMusic 已支持）。
ILY.data.assets = {
  "images": {
    // —— 场景背景（images/backgrounds） ——
    "bg-apartment-dusk":   "assets/images/backgrounds/2.白天家.webp",    // 场景01/02 出租屋 黄昏
    "bg-apartment-night":  "assets/images/backgrounds/1.夜晚家.webp",    // 场景05 蓝光变化后 / 场景06 出租屋夜晚
    "bg-university":       "assets/images/backgrounds/3 回忆蒙太奇.webp",// 场景03 大学走廊与学生群像
    "bg-empty-apartment":  "assets/images/backgrounds/4 空壳公寓.webp",  // 场景04 空壳公寓（含招租牌）
    "bg-hallway-dark":     "assets/images/backgrounds/5_走廊_关灯.webp",// 场景07 公寓走廊声控灯（关灯）
    "bg-hallway":          "assets/images/backgrounds/5.走廊·开灯.webp",// 场景07 公寓走廊声控灯
    "bg-tunnel":           "assets/images/backgrounds/6_隧道_无海报.webp",// 场景07 隧道横版背景
    "bg-coast-night":      "assets/images/backgrounds/7_海岸.webp",      // 场景08/09 月夜海岸
    "bg-coast-blue":       "assets/images/backgrounds/9_海岸_纯蓝.webp", // 场景10/11 蓝光海岸
    "bg-room-white":       "assets/images/backgrounds/10 白底.webp",     // 场景06/11 白底演出页
    "bg-black":            "assets/images/backgrounds/black.webp",       // 纯黑幕（黑场演出 / 内心独白）

    // —— 人物立绘 / 精灵（images/characters） ——
    "portrait-kio":        "assets/images/characters/portrait-kio.webp",         // 28岁基生 室内/外出（半身）
    "portrait-kio-young":  "assets/placeholders/character.svg", // 高中基生（回忆）
    "portrait-airi":       "assets/images/characters/aili/微笑 (1).webp", // 爱理 校服立绘（默认微笑）
    "portrait-airi-flash": "assets/images/characters/aili/崩坏.webp",     // 爱理闪回 / 电线眼
    "airi-smile":          "assets/images/characters/aili/微笑 (1).webp",
    "airi-playful":        "assets/images/characters/aili/歪头翘皮.webp",
    "airi-confused":       "assets/images/characters/aili/困惑 (2).webp",
    "airi-blush":          "assets/images/characters/aili/羞红.webp",
    "airi-gloomy":         "assets/images/characters/aili/阴沉.webp",
    "airi-crying":         "assets/images/characters/aili/哭腔.webp",
    "airi-scared":         "assets/images/characters/aili/惊恐.webp",
    "airi-broken":         "assets/images/characters/aili/崩坏.webp",
    "kio-walk":            "assets/placeholders/character.svg", // 隧道横版步行精灵

    // —— 女主视角篇：新立绘尚未提供，保留稳定 ID 便于后续替换 ——
    "heroine-chou":       "assets/placeholders/character.svg",
    "heroine-yuuna":      "assets/placeholders/character.svg",
    "heroine-haru":       "assets/placeholders/character.svg",
    "heroine-yae":        "assets/placeholders/character.svg",
    "heroine-wakana":     "assets/placeholders/character.svg",
    "heroine-takuma":     "assets/placeholders/character.svg",

    // 女主篇缺失的场景美术先用分类占位；剧情只引用 ID。
    "heroine-cafe":        "assets/images/女主线/02-01-背景.webp",
    "heroine-phone-screen":"assets/images/backgrounds/10 白底.webp",
    "heroine-photo-screen":"assets/images/backgrounds/10 白底.webp",

    // —— 道具 / 照片 / UI（images/ui） ——
    "photo-seaside":       "assets/images/ui/photo-seaside.webp", // 2009 海边低像素合影（手机相册 / 序章单图）
    "bankbook":            "assets/images/ui/bankbook.webp",      // 手机相册中的银行汇款记录
    "parcel-label":        "assets/images/ui/parcel-label.webp",  // 快递单（203室 马场先生）
    "rent-sign":           "assets/placeholders/prop.svg", // 空壳公寓招租牌 0A-93MC-10N4
    "trash-bag":           "assets/placeholders/prop.svg", // 垃圾袋（BR01 A）
    "vending":             "assets/images/ui/ui-vending.webp",      // 隧道故障自动贩卖机（真实像素图）
    "coast-poster":        "assets/images/ui/ui-coast-poster.webp",  // 隧道褪色海岸海报（真实像素图）
    "wall-crack":          "assets/images/ui/ui-wall-crack.webp",    // 隧道墙缝（挂墙）
    "tunnel-wall-tile":    "assets/images/ui/tunnel-wall-tile.webp", // 隧道像素墙裙（平铺）
    "title-ily":           "assets/placeholders/prop.svg"  // 终幕 I.L.Y. 标题
  },
  "bgm": {
    "bgm-prologue-ambient": "assets/audio/bgm/bgm-prologue-ambient.mp3",
    "bgm-ch1-neo": "assets/audio/bgm/bgm-ch1-neo.mp3",
    "bgm-ch2-confession": "assets/audio/bgm/bgm-ch2-confession.mp3",
    "bgm-true-airi-melancholic": "assets/audio/bgm/bgm-true-airi-melancholic.mp3",
    "bgm-blue-music-box": "assets/audio/bgm/bgm-blue-music-box.mp3",
    "bgm-heroine-memory": "assets/audio/bgm/bgm-heroine-memory.mp3",
    "bgm-final-farewell": "assets/audio/bgm/bgm-final-farewell.mp3",
    "bgm-ending-voyager": "assets/audio/bgm/bgm-ending-voyager.mp3",
    "bgm-ending-reality": "assets/audio/bgm/bgm-ending-reality.mp3", // An Ending —— 第三章 B 线「现实结局」专用
    "bgm-ending-just2":   "assets/audio/bgm/bgm-ending-just2.mp3",   // Just The Two Of Us —— 第二章「中间结局 · Just two of us」专用
    "bgm-dusk":      "assets/audio/bgm/bgm-dusk.mp3",      // 出租屋 黄昏/深夜
    "bgm-university":"assets/audio/bgm/bgm-university.mp3",// 场景03 回忆蒙太奇
    "bgm-coast":     "assets/audio/bgm/bgm-coast.mp3",     // 场景08 月夜海岸（自然空间感）
    "bgm-blue":      "assets/audio/bgm/bgm-blue.mp3",      // 场景10/11 蓝光事件（系统声轻微失真）
    "bgm-silent":    "assets/audio/bgm/bgm-silent.mp3"     // 场景10 完全静默段
  },
  "sfx": {
    "sfx-fan":      "assets/audio/sfx/sfx-fan.mp3",      // 风扇循环 + 每圈咔声
    "sfx-keypad":   "assets/audio/sfx/sfx-keypad.mp3",   // 手机按键音
    "sfx-ringtone": "assets/audio/sfx/sfx-ringtone.mp3", // 旧式和弦铃声（主管来电）
    "sfx-busy":     "assets/audio/sfx/sfx-busy.mp3",     // 挂机半声忙音
    "sfx-knock":    "assets/audio/sfx/sfx-knock.mp3",    // 三次敲门
    "sfx-doorlock": "assets/audio/sfx/sfx-doorlock.mp3", // 门锁咔哒
    "sfx-waves":    "assets/audio/sfx/sfx-waves.mp3",    // 海浪铃声（须与场景05同音色）
    "sfx-blue":     "assets/audio/sfx/sfx-blue.mp3",     // 蓝光溢出
    "sfx-reveal":   "assets/audio/sfx/sfx-reveal.mp3"    // 隐藏链接出现
  },
  "voices": {
    "vo-kio":    "assets/audio/voices/kio/",    // 基生：全场内心独白 + 对白
    "vo-airi":   "assets/audio/voices/airi/",   // 爱理：邮件文字 / 回信 / 终幕台词
    "vo-boss":   "assets/audio/voices/boss/",   // 主管：电话声（中年男，疲惫不耐烦）
    "vo-courier":"assets/audio/voices/courier/",// 快递员：门外声（年轻男，礼貌急促）
    "vo-father": "assets/audio/voices/father/", // 父亲：克制疏离
    "vo-system": "assets/audio/voices/system/"  // 系统：无性别电子音，临近蓝色事件轻微失真
  },
  "video": {
    // ⚠ 开场动画【不复用】现有文件 —— 用户会新做一版。
    // 播放位置：sign&log/login.js 的 playIntroThenGo()（登录成功 → 播片 → 白屏 0.6s → index.html）。
    // 新片做好后覆盖 sign&log/intro.mp4 即可；此处路径仅作登记，游戏本体不播放它。
    "intro": "../sign&log/intro.mp4"
  }
};

// 找好素材后只改 images 中对应 ID 的路径；路径失效时按类型退回占位图。
ILY.data.assets.fallbacks = {
  background: 'assets/placeholders/background.svg',
  character: 'assets/placeholders/character.svg',
  prop: 'assets/placeholders/prop.svg'
};

// 第一章：资源路径相对 game/index.html。RPG 空路径使用可玩的几何占位。
Object.assign(ILY.data.assets.images, {
  'ch1-coast-night':'assets/images/backgrounds/11 海景.webp',
  'ch1-store':'assets/images/backgrounds/12 便利店.webp',
  'ch1-street':'assets/images/backgrounds/18 合上的门.webp',   // 便利店出来到回家路上（S04）
  'ch1-aquarium-outside':'assets/images/backgrounds/13 水族馆.webp',
  'ch1-aquarium':'assets/images/backgrounds/14 鱼缸.webp',
  'ch1-panorama':'assets/images/backgrounds/21 全景水槽.webp',
  'ch1-empty-tank':'assets/images/backgrounds/19 空水槽.webp',
  'ch1-cg-blue':'assets/placeholders/background.svg',
  'ch1-cg-mirror':'assets/images/backgrounds/16 镜子.webp',
  'ch1-cg-bathroom':'assets/images/backgrounds/20 浴室.webp',
  'ch1-cg-collapse':'assets/placeholders/background.svg',
  'ch1-cg-reflection':'assets/images/uploads/bg055.webp',   // S06 水族馆倒影 CG（ch1_282/283/284 共用）
  'ch1-airi-casual':'assets/images/characters/aili/微笑 (1).webp',
  'ch1-toya':'assets/images/ui/十屋-开心.webp',
  'ch1-toya-apology':'assets/images/ui/十屋-道歉.webp',
  'ch1-rui':'assets/images/ui/小泪-冷漠.webp',
  'ch1-room-map':'assets/images/maps/ch1-room.webp',
  'ch1-trash-pile':'assets/images/objects/trash-pile.webp',
  'ch1-tile-floor':'', 'ch1-tile-wall':'',
  'ch1-sprite-kio':'assets/images/ui/cursor/cursor-hero-front.webp', 'ch1-sprite-airi':'',
  'ch1-kio-back':'assets/images/ui/cursor/cursor-hero-back.webp',
  'ch1-kio-left-1':'assets/images/ui/cursor/cursor-walk-left-1.webp',
  'ch1-kio-left-2':'assets/images/ui/cursor/cursor-walk-left-2.webp',
  'ch1-kio-right-1':'assets/images/ui/cursor/cursor-walk-right-1.webp',
  'ch1-kio-right-2':'assets/images/ui/cursor/cursor-walk-right-2.webp',
  'ch1-object-desk':'', 'ch1-object-shelf':'',
  'ch1-object-bed':'', 'ch1-object-tank':''
});

// 替换图：序章蓝光海岸（改1/改2）、第一章演出 CG（改3/改4）、爱理背影立绘（立绘改1，已去底）。
// 由 script-edits.js 中对应节点引用；含竖构图，需 backgroundFit:"contain" 才不会被裁掉。
Object.assign(ILY.data.assets.images, {
  's11-bg-1':'assets/images/backgrounds/s11-bg-1.webp',      // 改1 蓝光海岸：爱理背影 + 基生剪影（s11a / s11a2）
  's11-bg-2':'assets/images/backgrounds/s11-bg-2.webp',      // 改2 爱理回头微笑特写（s11_turn / s11b）
  'ch1-cg-3':'assets/images/cg/ch1-cg-3.png',               // 改3 蓝色瞳孔特写（ch1_024 / ch1_037）
  'ch1-cg-4':'assets/images/cg/ch1-cg-4.webp',               // 改4 「暑假期间 免费开放」海报（ch1_160）
  'airi-back-1':'assets/images/characters/airi-back-1.webp', // 立绘改1 爱理背影立绘（ch1_341–ch1_344）
  'ch3-delusion':'assets/images/cg/ch3-delusion.webp',       // 改5 「全部都是我妄想出来的？」妄想整图（ch3_035，1922×1080 横构图 cover，imageOnly 纯图无蒙层）
  'bg-sunset':'assets/images/backgrounds/ch2-sunset.webp',   // 夕阳海边（回忆用）
  'ch3-phone-glitch':'assets/images/backgrounds/ch3-phone-glitch.png', // ch3_363/364 手机屏幕故障演出（竖构图，需 contain）
  'bg-heroine-glitch':'assets/images/backgrounds/her-blue-glitch.png',  // 女主视角序章 her_0001–0008 青色空间演出图（竖构图，需 contain）
    // 2026-09-22 补充：her_0001–0005 → wide、her_0006 → girl、her_0007 → face、her_0008 → 黑幕 bg-black，
    // 故本 ID 目前【已无任何节点引用】（资源与注册项全部保留，可随时回滚，勿据此判断有必要改名/清理）。
  'bg-her-crowd':'assets/images/backgrounds/her-ily-crowd.webp',         // 女主视角序章 her_0009–0021 病毒人群剪影（横构图，cover 即可）
  'bg-her-ily-computer':'assets/images/backgrounds/her-ily-computer.webp', // 女主视角序章 her_0009–0011 复古电脑邮件画面
  'cg-her-montage':'assets/images/cg/her-montage.webp',                  // 女主视角序章 her_0025 爱理蒙太奇 CG（横构图，cover；进画廊）
  's10-bg-glitch':'assets/images/backgrounds/s10-bg-glitch.webp',        // 改6 序章 s10a / s10b 蓝屏故障：白线稿少年 + 蓝色噪点（1922×1080，cover）
  's11d-bg-hand':'assets/images/backgrounds/s11d-bg-hand.webp',          // 改7 序章 s11d（含新增段）爱理伸出双手（1922×1080，cover，无立绘）
  'ch1-girl-closeup':'assets/images/backgrounds/ch1-girl-closeup.webp',  // 改8 第一章 ch1_018 / ch1_024 / ch1_037 爱理蓝色眼眸特写（1922×1080，cover，无立绘）
  'ch1-wall-sign':'assets/images/backgrounds/wall_sign_1922x1080.webp',  // 改9 第一章 ch1_262 水族馆门口墙上「暑假期间 免费开放」海报（1922×1080，cover，保留立绘）
  'ch1-starry-couple':'assets/images/backgrounds/ch1-starry-couple.webp', // 改10 第一章 ch1_285 / ch1_286 / ch1_287 夜空下牵手的两人（1922×1080，cover，无立绘）
  'ch1-market-mirror':'assets/images/backgrounds/supermarket_mirror_1922x1080.webp', // 改11 第一章 ch1_160 便利店内镜面前并肩的两人（1922×1080，cover，无立绘）
  'her-boy-face':'assets/images/backgrounds/her-boy-face.webp' // her_0379_insert_a 插入纯图：基生脸特写（her_0379「基生？」与 her_0380「全部都是我妄想出来的？」之间，1922×1080，cover，imageOnly 无蒙层无立绘）
});

// 新增立绘：爱理「星星眼惊叹」表情（与 pt027 同构图，仅换表情；白底已抠透，780×1843）。
Object.assign(ILY.data.assets.images, {
  'pt027-star-eyes':'assets/images/uploads/pt027-star-eyes.webp' // 立绘改2 第一章 ch1_266 水族馆「哇——！哇——！哇——！」（透明底，留立绘）
});

// 改12 第三章 记忆错乱段：独自站在空白黑暗中的基生（1922×1080，横构图 → cover，无立绘）。
// 引用节点：ch3_023 / ch3_024 / ch3_026 / ch3_027 / ch3_031 / her_0358 / her_0359（在 script-edits.js 里设 background，
// 会同时清掉 base 的 cg:ch2-adult → 这几节点不再进回忆画廊；ch2-adult 仍有 100+ 节点引用，画廊不受影响）。
Object.assign(ILY.data.assets.images, {
  'ch3-blank-boy':'assets/images/backgrounds/ch3-blank-boy.webp'
});

// 改13 第三章 记忆错乱段：夕阳下托腮回望的爱理特写（1922×1080，横构图 → cover，无立绘）。
// 引用节点：ch3_028 / ch3_029 / ch3_030（在 script-edits.js 里设 background，
// 会同时清掉 base 的 cg:ch2-adult → 这三节点不再进回忆画廊；ch2-adult 仍有 200+ 节点引用，画廊不受影响）。
Object.assign(ILY.data.assets.images, {
  'ch3-airi-closeup':'assets/images/backgrounds/ch3-airi-closeup.webp'
});

// 改14 第三章 记忆错乱段：夕阳海岸边并肩的爱理与优那（1922×1080，横构图 → cover，无立绘）。
// 引用节点：ch3_032 / ch3_033（在 script-edits.js 里设 background，会清掉 base 的 cg:ch2-adult）。
// 注意：这两个节点原用共用图 bg038（另有 ch2_253/254/255、ch3_135–139、ch3_153、her_0331 共 10 处引用），
// 故新建独立 ID，不覆盖 bg038。
Object.assign(ILY.data.assets.images, {
  'ch3-airi-yuna-sunset':'assets/images/backgrounds/ch3-airi-yuna-sunset.webp'
});

// 改15 第三章 S01→S02 过渡：夜晚独自坐在床边的基生（1922×1080，横构图 → cover，无立绘）。
// 引用节点：script-edits.js 里新增插入节点 ch3_150_insert_b（走 added 记录，不在 base 剧本里）。
// 原文件名为 result3_1922x1080.png，实际是 JPEG（头 ffd8ffeb），故落地为 .webp；
// 与它成对的插入节点 ch3_150_insert_a 直接复用已登记的 bg021（rose 色房间，另有 ch3_148 引用，未覆盖）。
Object.assign(ILY.data.assets.images, {
  'ch3-boy-bed-night':'assets/images/backgrounds/ch3-boy-bed-night.webp'
});

// 改16 第三章 S05 展示海报处：两位女孩（爱理 + 日日谷小姐）并肩微笑特写（1922×1080，横构图 → cover 默认，无立绘）。
// 引用节点：ch3_256 / ch3_257（在 script-edits.js 里设 background 并清空 portrait，会同时清掉 base 的 cg）。
// 注意：这两个节点原共用 bg044（另有约 60 处引用），故新建独立 ID，不覆盖 bg044。
// 原文件名为 result4_1922x1080.png，实际是 JPEG（头 ffd8ffeb），故落地为 .webp。
Object.assign(ILY.data.assets.images, {
  'ch3-girls-smile':'assets/images/backgrounds/ch3-girls-smile.webp'
});

// 改17 第三章 S05 展示海报处：爱理脸红微笑特写（回忆中的笑容，1922×1080，横构图 → cover 默认，无立绘）。
// 引用节点：ch3_258 / ch3_261 / ch3_263（在 script-edits.js 里设 background 并清空 portrait，会同时清掉 base 的 cg）。
// 注意：这三个节点原背景分别是 ch3-mall / ch2-sunset（两处均为大量节点共用的 ID），
// 故新建独立 ID，不覆盖原图；ch3_261 / ch3_263 还带 portrait:airi-blush，本次一并清空。
// 原文件名为 result5_1922x1080.png，实际是 JPEG（头 ffd8ffeb），故落地为 .webp（原样复制，无二次压缩）。
Object.assign(ILY.data.assets.images, {
  'ch3-airi-blush-closeup':'assets/images/backgrounds/ch3-airi-blush-closeup.webp'
});

// 改18 第三章 S05 展示海报处：闭眼脸红大笑的女孩「线稿」版特写（1922×1080，横构图 → cover 默认，无立绘）。
// 引用节点：ch3_302（在 script-edits.js 里设 background；base 无 cg / portrait，故无画廊副作用）。
// 与上一节点 ch3_301 的 bg030（同一表情的上色版，另有引用）刻意区分：本节点用线稿版做「回忆闪现」演出。
// 原文件名为 result6_1922x1080.png，实际是 JPEG（头 ffd8ffeb），故落地为 .webp。
// 编码比过：ffmpeg -q:v 2 → PSNR 53.7 dB / 271 KB，webp q95 → 52.2 dB / 154 KB，两者肉眼无差，按项目惯例取 JPEG q2。
Object.assign(ILY.data.assets.images, {
  'ch3-blush-lineart':'assets/images/backgrounds/ch3-blush-lineart.webp'
});

// 改19 第三章 S06 公寓夜景：整机身竖向握持的手机，屏幕里是蓝色故障画面（雨中撑伞的身影）。
// 引用节点：ch3_363 / ch3_364（成田基生听见「……生」「基生……」两句话时的演出图）。
// 这两个节点原先指向 ch3-phone-glitch（768×1088 竖构图，需 contain），本次换成 1922×1080 横构图 → cover。
// ch3-phone-glitch 仅被这两个节点引用，但按惯例新建独立 ID，不覆盖原图（原图保留作回滚备份）。
// 原文件名为 result7_1922x1080.png，实际是 JPEG（头 ffd8ffeb），故落地为 .webp（原样复制，无二次压缩）。
Object.assign(ILY.data.assets.images, {
  'ch3-phone-glitch-full':'assets/images/backgrounds/ch3-phone-glitch-full.webp'
});

// 改20 第三章 S07A 海岸夜：双手死死攥紧布料的特写，指节上钻出许多蠕虫般的紫色电线（1922×1080，横构图 → cover 默认）。
// 引用节点：ch3_447 / ch3_448（在 script-edits.js 里设 background；两节点 base 均无 cg / portrait，
// 故无画廊与立绘副作用）。ch3_448 原记录也是 bg043，与本节点同批一并改用本图。
// 旧背景 bg043（基生抱着爱理的蓝色拥抱图，注册在 uploaded-assets.js）未被覆盖，保留作回滚。
// 原文件名为 result8_1922x1080.png，实际是 JPEG（头 ffd8ffeb），故落地为 .webp（原样复制，无二次压缩）。
Object.assign(ILY.data.assets.images, {
  'ch3-worms-hands':'assets/images/backgrounds/ch3-worms-hands.webp'
});

// 改21 第三章 S07A 海岸夜：深蓝虚空里两只张开五指、彼此伸向对方的手（1922×1080，横构图 → cover 默认）。
// 引用节点：ch3_425（在 script-edits.js 里把 background 由 bg003 改成本图，保留原有的 portrait:"" 去立绘设定）。
// base 该节点无 cg，故无回忆画廊副作用；旧背景 bg003（S07-A 2.webp，另有 17 处引用）未被覆盖，保留作回滚。
// 原文件名为 result9_1922x1080.png，是真 PNG（PIL format=PNG / mode=RGB）；按项目惯例统一落地为 JPEG：
// ffmpeg scale=1922:1080:flags=lanczos -q:v 2 → PSNR 51.9 dB / 195 KB（webp q95 为 53.4 dB / 149 KB，
// 本项目横构图插画统一取 JPEG q2，以保证与既往批次格式一致）。
Object.assign(ILY.data.assets.images, {
  'ch3-hands-reach':'assets/images/backgrounds/ch3-hands-reach.webp'
});

// 改22 第三章 S07A 海岸夜：从背后环抱过来的两条手臂特写，双手死死攥紧衣物，前臂上钻出蠕虫般的紫色电线
// （1922×1080，横构图 → cover 默认，无立绘）。
// 引用节点：ch3_430（原记录是 bg-black 黑幕，本次在黑幕段里插回这张图；保留原有的 portrait:"" 去立绘设定）。
// base 该节点无 cg，故无回忆画廊副作用；bg-black 是通用黑场资源，不受影响。
// 原文件名为 result10_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 按项目惯例统一落地为 JPEG：ffmpeg scale=1922:1080:flags=lanczos -q:v 2 → PSNR 51.07 dB / 176 KB
// （webp q95 为 51.50 dB / 180 KB，两者几乎持平，按项目惯例取 JPEG q2 以与既往批次格式一致）。
Object.assign(ILY.data.assets.images, {
  'ch3-embrace-worms':'assets/images/backgrounds/ch3-embrace-worms.webp'
});

// 改23 女主视角序章 her_0001–her_0005：无边界的青色空间演出图【16:9 横向全幅版】
// （1922×1080，横构图 → cover 默认，保留各节点原有的 portrait:"" 去立绘设定）。
// 写入当时竖构图版 her-blue-glitch.png（768×1088，ID bg-heroine-glitch）仍被 her_0006 / her_0007 / her_0008 引用
//（注意：这三个节点后续已分别切到 girl / face / 黑幕，本 ID 现已无引用，见上方 line 155 处说明），
// 故新建独立 ID，不覆盖旧资源；本批只切 her_0001–0005 这 5 个节点。
// 原文件名为 result11_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：
// PSNR 53.06 dB / 96 KB（webp q95 为 53.40 dB / 86 KB，两者肉眼无差，按项目惯例取 JPEG q2 保持一致）。
// base 这几个节点本就无 cg（是 monologue + visualEffects glitch/blue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-heroine-glitch-wide':'assets/images/backgrounds/her-blue-glitch-wide.webp'
});

// 改24 女主视角序章 her_0006：青色空间中浮现少女全身【16:9 横向全幅版】
// （1922×1080，横构图 → cover，保留原记录的 portrait:"" 去立绘设定）。
// 写入当时 ID bg-heroine-glitch（竖构图 her-blue-glitch.png，768×1088）仍被 her_0008 引用，
//（her_0007 稍后由改25 切到 face 版），故新建独立 ID，不覆盖旧资源；本批只切 her_0006 这 1 个节点。
// 原文件名为 result12_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 50.66 dB / 204 KB。
// base 该节点无 cg（monologue + visualEffects glitch/blue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-heroine-glitch-girl':'assets/images/backgrounds/her-blue-glitch-girl.webp'
});

// 改25 女主视角序章 her_0007：「爱理」的脸部特写【16:9 横向全幅版】
// （1922×1080，横构图 → cover，保留原记录的 portrait:"" 去立绘设定）。
// 写入当时 ID bg-heroine-glitch（竖构图 her-blue-glitch.png，768×1088）仍被 her_0008 引用，，
// 故新建独立 ID，不覆盖旧资源；本批只切 her_0007 这 1 个节点。
// 原文件名为 result13_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 48.94 dB / 321 KB
// （故障噪声密集，编码损耗略高于同系列横幅版，肉眼无差）。
// base 该节点无 cg（monologue + visualEffects glitch/blue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-heroine-glitch-face':'assets/images/backgrounds/her-blue-glitch-face.webp'
});

// 改26 女主视角序章 her_0013：暗蓝故障噪点场（整幅水平撕裂条纹 + 亮点，无明确主体）
// —— 对应该节点台词「「ILY」和若干的病毒相互干涉、交相混杂，在反病毒程序看不到的水面之下独自进化着」
//（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0013（在 script-edits.js 里把 background 由 bg-her-crowd 改成本图）。
// 旧 ID bg-her-crowd（her-ily-crowd.png）仍被 her_0014–her_0021 / her_scene_pro_03 共 9 个节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留作回滚备份）。
// 原文件名为 result15_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg scale=1922:1080:flags=lanczos -q:v 2 落地为 JPEG：
// PSNR 49.48 dB / 310 KB（webp q95 为 50.32 dB / 256 KB —— 本图噪点极密，webp 反而略胜，
// 但按项目惯例横构图插画统一取 JPEG q2 保持一致；49.5 dB 已远高于肉眼可辨阈值）。
// base 该节点无 cg（monologue + visualEffects blue/dissolve），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-virus-noise':'assets/images/backgrounds/her-virus-noise.webp'
});

// 改27 女主视角序章 her_0017 / her_0018 共用同一张图：两位少女日常一幕
// （左：撑脸浅发少女；右：进食短发少女，近白底像素风）—— 对应 pro-03「为了生存」两句台词
// 「就像人类为了生存要吃饭、睡觉一样」「我们为了生存下去、要将人类的身体和心全部吃掉。」
//（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0017 + her_0018（在 script-edits.js 里把 background 由 bg-her-crowd 改成本图）；
// 写入当时 bg-her-crowd（her-ily-crowd.png）仍被 her_0014/0015/0016 / her_scene_pro_03 等节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留作回滚备份）。
// 原文件名为 result16_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 50.37 dB / 273 KB。
// base 该节点无 cg（monologue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-survival-life':'assets/images/backgrounds/her-survival-life.webp'
});

// 改28 女主视角序章 her_0022/her_0023：深蓝噪点场（大面深蓝 + 四散青色小光点，无明确主体）
// —— 对应 her_0022「那团蓝光裂成四散的光点，各自飘向不同的方向，消失在网络的海洋里」、
// her_0023「曾经是一体的我们四散而去、并在网络的海洋中漂泊」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0022 / her_0023（在 script-edits.js 里把 background 由 bg-coast-blue 改成本图）。
// 旧 ID bg-coast-blue（9_海岸_纯蓝.webp）仍被 final.js 大量节点及邻居引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result17_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg scale=1922:1080:flags=lanczos -q:v 2 落地为 JPEG：
// PSNR 49.72 dB / 214 KB（按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 两节点均无 cg（monologue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-light-drift':'assets/images/backgrounds/her-light-drift.webp'
});

// 改29 女主视角序章 her_0024：屏幕上的基生（故障噪点扭曲的男性侧脸）＋ 手持翻盖手机
// —— 对应 her_0024「然后…很快我便找到了。」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0024（在 script-edits.js 里新增 background 记录，base 是 bg-coast-blue）。
// 旧 ID bg-coast-blue（9_海岸_纯蓝.webp）仍被 final.js 大量节点及邻居引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result18_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg scale=1922:1080:flags=lanczos -q:v 2 落地为 JPEG：
// PSNR 48.03 dB / 445 KB（webp q95 为 49.71 dB / 446 KB，本图噪点重 webp 略优，
// 但按项目惯例横构图插画统一取 JPEG q2 保持一致；48 dB 已远高于肉眼可辨阈值）。
// base 该节点无 cg（monologue + visualEffects dissolve），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-found-phone':'assets/images/backgrounds/her-found-phone.webp'
});

// 改30 女主视角序章 her_0028 / her_0029：蓝底回眸少女（短发深蓝发、蓝眼、水手服，侧身回望）
// —— 对应 her_0028「我的姿态自动地」、her_0029「变成了「爱理」的模样。」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0028（script-edits.js 新增 background 记录，base 是 bg-coast-blue）＋
// her_0029（script-edits.js 把 background 由 bg032 改成本图）。
// 旧 ID：bg-coast-blue（9_海岸_纯蓝.webp）仍被 final.js/heroine.js/prologue.js 大量节点引用；
// bg032（uploads/bg032.webp）仍被 ch2 等其它节点引用 —— 均不动，保留原样。
// 原文件名为 030_1922x1080.webp，是真 JPEG（PIL format=JPEG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080 JPEG，直接复制落地（零二次压缩，871 KB）。
// base 两节点均无 cg（monologue + visualEffects dissolve），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-turned-airi':'assets/images/backgrounds/her-turned-airi.webp'
});


// 改31 女主视角序章 her_0058：手握门把手开门特写（深蓝门板 + 门缝白光）
// —— 对应 her_0058「门合上之后，基生转身缓缓走回房间。」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0058（script-edits.js 新增 background 记录，base 是 bg-hallway-dark）。
// 旧 ID bg-hallway-dark 仍被 her_scene_01_05 / her_0059 / her_0060 等邻居引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result21_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 51.95 dB / 150 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 该节点无 cg（monologue），故无回忆画廊副作用；立绘（portrait-airi + portrait-kio）按「只改背景」约定保留。
Object.assign(ILY.data.assets.images, {
  'bg-her-door-handle':'assets/images/backgrounds/her-door-handle.webp'
});


// 改32 女主视角序章 her_0059：门缝两侧两人（门内基生／门外爱理对望）
// —— 对应 her_0059「在我们重逢之前」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0059（script-edits.js 新增 background 记录，base 是 bg-hallway-dark）。
// 旧 ID bg-hallway-dark（5_走廊_关灯.webp）仍被 her_scene_01_05 / her_0060 / prologue 走廊玩法等大量节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result20_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 49.00 dB / 304 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 该节点无 cg（dialogue），故无回忆画廊副作用；立绘（portrait-airi + portrait-kio）按「只改背景」约定保留。
Object.assign(ILY.data.assets.images, {
  'bg-her-door-two':'assets/images/backgrounds/her-door-two.webp'
});


// 改33 女主视角序章 her_0062：半开的阳台门（左侧基生背影被画框裁切／右侧门后是栏杆、绿树与浅蓝天空）
// —— 对应 her_0062「...对不起呢，爱理...」＋ 演出「画面四：右半边的 ILY 突然消失——不是淡出，是像信号被掐断一样」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0062（script-edits.js 新增 background 记录，base 是 bg-hallway-dark）。
// 旧 ID bg-hallway-dark（5_走廊_关灯.webp）仍被 her_scene_01_05 / her_0059 / her_0060 / her_0061 / prologue 走廊玩法等大量节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result24_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 50.25 dB / 227 KB
// （webp q95 为 50.39 dB / 225 KB，几乎持平；按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 该节点无 cg（dialogue），故无回忆画廊副作用；立绘（portrait-airi + portrait-kio）按「只改背景」约定保留。
Object.assign(ILY.data.assets.images, {
  'bg-her-door-balcony':'assets/images/backgrounds/her-door-balcony.webp'
});


// 改34 女主视角序章 her_0061：房间里的基生（背影，左半）＋ 栏杆后的爱理（水手服侧立，右半）分屏构图
// —— 对应 her_0061「这种事...」＋ 演出「画面三：基生的嘴唇动了动，终究没有发出声音」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0061（script-edits.js 新增 background 记录，base 是 bg-hallway-dark）。
// 旧 ID bg-hallway-dark（5_走廊_关灯.webp）仍被 her_scene_01_05 / her_0060 / prologue 走廊玩法等大量节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result23_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 49.52 dB / 280 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 该节点无 cg（dialogue），故无回忆画廊副作用；立绘（portrait-airi + portrait-kio）按「只改背景」约定保留。
Object.assign(ILY.data.assets.images, {
  'bg-her-door-scene3':'assets/images/backgrounds/her-door-scene3.webp'
});


// 改35 女主视角序章 her_0060：走廊门内基生背影（左，回望）＋ 门外少女爱理对望（右，分镜演出・画面二）
// —— 对应 her_0060「她是怎么过来的呢」（1922×1080，横构图 → 沿用默认 cover，无需 backgroundFit）。
// 引用节点：her_0060（script-edits.js 新增 background 记录，base 是 bg-hallway-dark）。
// 旧 ID bg-hallway-dark（5_走廊_关灯.webp）仍被 her_scene_01_05 / her_0059 / her_0061 / prologue 走廊玩法等大量节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result22_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 48.85 dB / 310 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 该节点无 cg（dialogue），故无回忆画廊副作用；立绘（portrait-airi + portrait-kio）按「只改背景」约定保留
// （先例：result16 批 her_0017/0018 图里已画人物也只改 background）。
Object.assign(ILY.data.assets.images, {
  'bg-her-door-airi':'assets/images/backgrounds/her-door-airi.webp'
});


// 改36 女主视角第二章 her_scene_02_01：京都市街头（车站前人流，白天，横构图）
// —— 对应章节卡 her_scene_02_01「京都市的某个街头」（1922×1080 → 默认 cover，无需 backgroundFit）。
// 引用节点：her_scene_02_01（script-edits.js 原有记录改 background 值：bg068 → bg-her-street-crowd）。
// 旧 ID bg068（assets/images/女主线/02-01-背景.webp）仍被 her_scene_02_03 / ch3 段多个节点引用，
// 故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result25_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 47.78 dB / 491 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 该节点无 cg（heroine-card），故无回忆画廊副作用；修订记录里 characters:[] 等其余字段不动。
Object.assign(ILY.data.assets.images, {
  'bg-her-street-crowd':'assets/images/backgrounds/her-street-crowd.webp'
});


// 改37 女主视角第二章 her_0064~her_0067：咖啡店女子会・两位少女的近景特写
//（左侧黑发少女闭眼笑、右侧银灰短发少女紫瞳微笑，背景是站前路面上往来行人的腿，横构图）
// —— 对应 her_0064「哟——很久不见了——最近还好吗？」～ her_0067「是啊——！」（三人重逢的第一拍，四句连续对话）。
// 引用节点：her_0064 / her_0065 / her_0066 / her_0067（script-edits.js 原有记录改 background 值：bg068 → bg-her-cafe-duo，
// 同时把 characters 由单个立绘（依次为 pt020 春 / pt010 八重-开心 / pt010 / pt017 若菜）改成 []，按用户要求去掉立绘）。
// 旧 ID bg068（assets/images/女主线/02-01-背景.webp）仍被 her_scene_02_03 / her_0068~her_0070 等 02-01 段其余节点
// 与 ch3 段多个节点引用，故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result27_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 50.25 dB / 259 KB
// （webp q95 为 50.51 dB / 239 KB，几乎持平；按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 这四个节点均无 cg（dialogue），故无回忆画廊副作用。
// ⚠️ 2026-09-23 10:22 用户要求换成「带黑边原比例版」（result27_cropped_padded_1922x1080_1350x800.png，
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px）→ 已覆盖本文件：
// 新版 PSNR 46.65 dB / 181 KB（黑边纯黑、内容区与源一致）；此前的满幅 16:9 版备份为
// her-cafe-duo_old.webp 作回滚。修订层记录无需改动（4 节点仍指向本 ID）。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-duo':'assets/images/backgrounds/her-cafe-duo.webp'
});


// 改38 女主视角第二章 her_0068~her_0071：拓馬前辈登场（像素画，粉色星空背景）
//（上方拓馬前辈头像 + 左下若菜与右下春双眼发亮捧脸期待 + 中下粉色生物，横构图）
// —— 对应 her_0068「啊——说起来春！那个帅哥前辈又联系你了！？」～ her_0071「那、那个、但是有点奇怪…」。
// 引用节点：her_0068 / her_0069 / her_0070 / her_0071（script-edits.js 原有记录改 background 值：bg068 → bg-her-cafe-takuma，
// 同时把 characters 由单个立绘（依次为 pt010 八重 / pt012 春 / pt017 若菜 / pt012 春）改成 []，按用户要求去掉立绘）。
// 旧 ID bg068（assets/images/女主线/02-01-背景.webp）写入当时仍被 her_0072 / her_0073 / her_scene_02_03
// 与 ch3 段多个节点引用，故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// （her_0072 / her_0073 已于 09-23 01:1x 的「改39」改为 bg-her-cafe-phone，此处保留写入当时的描述。）
// 原文件名为 result28_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 50.72 dB / 214 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// ⚠️ 2026-09-23 10:1x 用户明确要求换成「带黑边的原比例版」（result28_cropped_padded_1922x1080.png，
// 内容区 1350×950 ＋ 左右黑边填充到 1922×1080）→ 已覆盖本文件（该版备份为 her-cafe-takuma_old2.webp）。
// ⚠️ 2026-09-23 10:16 又被用户要求换成更扁的 result28_cropped_padded_1922x1080_1350x800.png
// （内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px）→ 再次覆盖本文件：
// 新版 PSNR 47.08 dB / 151 KB（黑边纯黑、内容区与源一致）；此前的满幅 16:9 版备份为
// her-cafe-takuma_old.webp 作回滚。修订层记录无需改动（4 节点仍指向本 ID）。
// base 这四个节点均无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-takuma':'assets/images/backgrounds/her-cafe-takuma.webp'
});


// 改39 女主视角第二章 her_0072~her_0074：春举着手机看屏幕、双颊泛红的近景特写（纯白底，横构图）
//（粉紫色短发少女・紫瞳・脸红・浅浅一笑，双手扶着手机看向屏幕，灰蓝长袖上衣，背景为纯白）
// —— 对应 her_0072「什么奇怪？让我看看」（若菜）～ her_0074「我找找…」（春在包里翻找手机给若菜看）。
// 引用节点：her_0072 / her_0073 / her_0074（script-edits.js 原有记录改 background 值：bg068 → bg-her-cafe-phone，
// 同时把 characters 由单个立绘（依次为 her_0072 pt017 若菜 / her_0073 pt020 春 / her_0074 pt020 春）改成 []，
// 按用户要求去掉立绘）。
// 旧 ID bg068（assets/images/女主线/02-01-背景.webp）写入当时仍被 her_0075~her_0082 / her_0090 之后的 02-01 段
// 多节点与 ch3 段多个节点引用，故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result30_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 52.68 dB / 176 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 这三个节点均无 cg（dialogue），故无回忆画廊副作用；立绘已按用户要求去掉（characters: []）。
// ⚠️ 2026-09-23 10:27 用户要求换成「带黑边原比例版」（result30_cropped_padded_1922x1080_1350x800.png，
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px）→ 已覆盖本文件：
// 新版 PSNR 48.87 dB / 129 KB（黑边纯黑、内容区与源一致）；此前的满幅 16:9 版备份为
// her-cafe-phone_old.webp 作回滚。修订层记录无需改动（3 节点仍指向本 ID）。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-phone':'assets/images/backgrounds/her-cafe-phone.webp'
});


// 改40 女主视角第二章 her_0075~her_0077：春举着手机给两人看・八重与若菜同时凑过去的近景（横构图）
//（左侧深色短发少女＋斜挎包带、右侧银灰长发紫瞳少女，中间一部竖起的手机（背面朝画面、露出摄像头），
//  两人都凑向屏幕、一脸僵硬冒汗；浅灰白底）
// —— 对应 her_0075「这个…」（春把手机举起来，屏幕对着两个人）～ her_0077「呜哇…」（若菜）。
// 引用节点：her_0075 / her_0076 / her_0077（script-edits.js 原有记录改 background 值：bg068 → bg-her-cafe-phone-pair，
// 同时把 characters 由单个立绘（依次为 her_0075 pt020 春 / her_0076 pt013 八重 / her_0077 pt017 若菜）改成 []，
// 按用户要求去掉立绘）。
// 旧 ID bg068（assets/images/女主线/02-01-背景.webp）仍被 her_0078~her_0082 / her_0090 之后的 02-01 段
// 多节点与 ch3 段多个节点引用，故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result31_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 51.47 dB / 221 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 这三个节点均无 cg（dialogue），故无回忆画廊副作用；立绘已按用户要求去掉（characters: []）。
// ⚠️ 2026-09-23 10:43 用户要求换成「带黑边原比例版」（result31_cropped_padded_1922x1080_1350x800.png，
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px）→ 已覆盖本文件：
// 新版 PSNR 47.79 dB / 161 KB（黑边纯黑、内容区与源一致）；此前的满幅 16:9 版备份为
// her-cafe-phone-pair_old.webp 作回滚。修订层记录无需改动（3 节点仍指向本 ID）。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-phone-pair':'assets/images/backgrounds/her-cafe-phone-pair.webp'
});


// 改41 女主视角第二章 her_0078~her_0081：粉红生物涨红脸冒汗 + 若菜与八重一起惊讶吐槽（像素画，横构图）
//（左侧只露出一个巨大的粉红头顶（涨红冒汗线）、右侧深棕短发少女（若菜）与银灰短发紫瞳少女（八重）
//  并排张嘴惊讶吐槽，纯白底）
// —— 对应 her_0078「那个…太奇怪了吧…」～ her_0081「就、就是说啊！！」。
// 引用节点：her_0078 / her_0079 / her_0080 / her_0081（script-edits.js 原有记录改 background 值：bg068 → bg-her-cafe-reaction，
// 同时把 characters 由单个立绘（依次为 her_0078 pt017 若菜 / her_0079 pt023 / her_0080 pt012 春 / her_0081 pt012 春）
// 改成 []，按用户要求去掉立绘）。
// 旧 ID bg068（assets/images/女主线/02-01-背景.webp）写入当时仍被 her_0082 及之后的 02-01 段
// 多节点与 ch3 段多个节点引用，故新建独立 ID，不覆盖旧资源（旧图保留原样作回滚）。
// 原文件名为 result32_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 源图已是 1922×1080，无需缩放，直接 ffmpeg -q:v 2 落地为 JPEG：PSNR 54.60 dB / 124 KB
// （按项目惯例横构图插画统一取 JPEG q2 保持一致）。
// base 这四个节点均无 cg（dialogue），故无回忆画廊副作用；立绘已按用户要求去掉（characters: []）。
// ⚠️ 2026-09-23 11:05 两项更新：
// ① 用户要求换成「带黑边原比例版」（result32_cropped_padded_1922x1080_1350x800.png，内容区 1350×800 靠顶
//    ＋ 左右黑边 286px ＋ 底部黑边 280px）→ 已覆盖本文件：新版 PSNR 50.75 dB / 94 KB；旧满幅版备份 her-cafe-reaction_old.webp。
// ② 引用节点扩为 her_0078~her_0082 共 5 个：her_0082 原记录（bg068 + 立绘 pt012）已改为
//    bg-her-cafe-reaction + characters:[]（用户要求去立绘）。修订层仅动了 her_0082 一条记录。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-reaction':'assets/images/backgrounds/her-cafe-reaction.webp'
});

// 改43 女主视角第二章 her_0090~her_0091：三人围看手机（像素画，街头背景）
//（中春举手机低头看、左黑发少女若菜与右银灰短发少女八重从两侧探头直视镜头方向，横构图）
// —— 对应 her_0090「我说，去哪里吃饭，决定好了吗？」（八重）～ her_0091（02-03 咖啡店（继续）段）。
// 引用节点：her_0090 / her_0091（script-edits.js 原有记录由 bg068 + 单立绘（her_0090 pt013 / her_0091 pt017）
// 改为 bg-her-cafe-trio + characters:[]，2026-09-23 11:13 用户要求换图并去立绘）。
// 原文件名为 result26_cropped_padded_1922x1080_1350x950.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×950 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 130px，按带黑边风格落 JPEG q2：PSNR 45.50 dB / 230 KB。
// ⚠️ 2026-09-23 11:21 统一为 1350×800 版（result26_cropped_padded_1922x1080_1350x800.png）→ 已覆盖本文件
// （PSNR 45.88 dB / 217 KB）；此前的 950 版备份 her-cafe-trio_old.webp。
// base 这两个节点均无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-trio':'assets/images/backgrounds/her-cafe-trio.webp'
});

// 改44 女主视角第二章 her_0092：春的脸部特写（像素画，描补版，紫瞳脸红）
// —— 对应 her_0092「虽然是这样，但是...但是他都这么说了...」（02-03 咖啡店（继续）段，
// 演出方向「镜头切到春的侧脸」）。
// 引用节点：her_0092（script-edits.js 新增记录：base 为 heroine-cafe + 三立绘 yae/wakana/haru，
// 2026-09-23 11:18 用户要求换图并去立绘 → background: bg-her-cafe-haru-closeup + characters:[]）。
// 原文件名为 result_inpainted_padded_1922x1080_1350x950.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×950 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 130px，按带黑边风格落 JPEG q2：PSNR 45.34 dB / 160 KB。
// ⚠️ 2026-09-23 11:21 统一为 1350×800 版（result_inpainted_cropped_padded_1922x1080_1350x800.png）→ 已覆盖本文件
// （PSNR 46.01 dB / 144 KB）；此前的 950 版备份 her-cafe-haru-closeup_old.webp。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-haru-closeup':'assets/images/backgrounds/her-cafe-haru-closeup.webp'
});

// 改45 女主视角第二章 her_0093~her_0094：手机屏幕特写（像素画，描补版，拇指悬在链接上方）
// —— 对应 her_0093「这个链接是什么呢...照片?」（02-03 咖啡店（继续）段）～ her_0094。
// 引用节点：her_0093 / her_0094（script-edits.js 新增记录：base 为 heroine-cafe + 三立绘 yae/wakana/haru，
// 2026-09-23 11:25 用户要求换图并去立绘 → background: bg-her-cafe-phone-link + characters:[]）。
// 原文件名为 result_inpainted5_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px，按带黑边风格落 JPEG q2：PSNR 48.04 dB / 163 KB。
// base 这两个节点均无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-cafe-phone-link':'assets/images/backgrounds/her-cafe-phone-link.webp'
});

// 改46 女主视角第二章 her_0095：蓝紫故障中的少女低头看手机（像素画，满幅 16:9 无黑边）
// —— 对应 her_0095「春的手忽然脱力，手机从指缝间滑下去…」（02-04 感染段 monologue，
// base 自带 visualEffects: glitch/blue/flash，与这张故障风图契合）。
// 引用节点：her_0095（script-edits.js 原有记录仅改 background 值：bg068 → bg-her-glitch-haru，
// 立绘 pt020 春按用户本次要求保留——2026-09-23 13:27）。
// 原文件名为 result36_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 满幅无黑边，ffmpeg q2 落地：PSNR 43.19 dB / 490 KB。
// base 该节点无 cg（monologue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-glitch-haru':'assets/images/backgrounds/her-glitch-haru.webp'
});

// 改47 女主视角第二章 her_0096：春脸色发白侧脸特写（像素画，描补版，紫瞳睁大）
// —— 对应 her_0096「诶？什么？刚才好像...」（02-04 感染段 dialogue，演出方向「春猛地抬头，脸色发白」）。
// 引用节点：her_0096（script-edits.js 新增记录：base 为 heroine-cafe + 立绘 heroine-haru，
// 2026-09-23 13:32 用户要求换图并去立绘 → background: bg-her-haru-pale + characters:[]）。
// 原文件名为 result_inpainted8_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×789 靠顶（行 10~798）＋ 左右黑边 286px ＋ 底部约 281px 黑边，按带黑边风格落 JPEG q2：PSNR 47.89 dB / 104 KB。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-haru-pale':'assets/images/backgrounds/her-haru-pale.webp'
});

// 改48 女主视角第二章 her_0098：春惊愕特写（像素画，描补版，紫瞳圆睁、颊边汗珠）
// —— 对应 her_0098「诶？」（春，02-04 感染段 dialogue）。
// 引用节点：her_0098（script-edits.js 原有记录由 bg068 + 立绘 pt020 改为
// bg-her-haru-startle + characters:[]，2026-09-23 13:39 用户要求换图并去立绘）。
// 原文件名为 result_inpainted9d_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px，按带黑边风格落 JPEG q2：PSNR 50.77 dB / 89 KB。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-haru-startle':'assets/images/backgrounds/her-haru-startle.webp'
});

// 改49 女主视角第二章 her_0099~her_0100：拓馬前辈微笑面部特写（像素画，满幅 16:9，蓝瞳）
// —— 对应 her_0099「她的面前站着"拓马"前辈。发型、身高、说话的语气，和记忆里一模一样。」
// ～ her_0100「只有眼睛不一样——那是一双蓝色的眼睛。」（02-04 感染段 monologue）。
// 引用节点：her_0099 / her_0100（script-edits.js 原有记录由 bg068 + 立绘 pt024 改为
// bg-her-takuma-face + characters:[]，2026-09-23 13:42 用户要求换图并去立绘）。
// 原文件名为 result37_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 满幅无黑边，ffmpeg q2 落地：PSNR 46.91 dB / 150 KB。
// base 这两个节点均无 cg（monologue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-takuma-face':'assets/images/backgrounds/her-takuma-face.webp'
});

// 改50 女主视角第二章 her_0101~her_0103：春仰视拓馬对视特写（像素画，描补版，紫灰压抑色调）
// —— 对应 her_0101「拓马前辈...为什么...」（春）～ her_0103（02-04 感染段）。
// 引用节点：her_0101 / her_0102 / her_0103（script-edits.js 原有记录由 bg068 + 单立绘
//（0101 pt012 春 / 0102、0103 pt024 拓馬）改为 bg-her-takuma-stare + characters:[]，
// 2026-09-23 13:46 用户要求换图并去立绘）。
// 原文件名为 result_inpainted10b_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px，按带黑边风格落 JPEG q2：PSNR 49.40 dB / 116 KB。
// base 这三个节点均无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-takuma-stare':'assets/images/backgrounds/her-takuma-stare.webp'
});

// 改51 女主视角第二章 her_0104：拓馬抚春的脸、春流泪告白（像素画，描补版，紫灰压抑色调）
// —— 对应 her_0104「拓马前辈...我也是...我也，最喜欢你了...」（春，02-04 感染段 dialogue）。
// 引用节点：her_0104（script-edits.js 原有记录由 bg068 + 立绘 pt024 改为
// bg-her-haru-tears + characters:[]，2026-09-23 13:52 用户要求换图并去立绘）。
// 原文件名为 result_inpainted11_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×798 靠顶（行 2~799）＋ 左右黑边 286px ＋ 底部约 281px 黑边，按带黑边风格落 JPEG q2：PSNR 47.38 dB / 166 KB。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-haru-tears':'assets/images/backgrounds/her-haru-tears.webp'
});

// 改52 插入节点 her_0104_insert_a（her_0104 与 her_0105 之间，added 记录，纯图无文字）
// —— 蓝色像素噪点爆发（满幅 16:9），衔接「流泪告白 → her_0105」的冲击转场。
// 2026-09-23 13:54 用户要求插入：无对话/旁白（type:monologue + text:"" + imageOnly:true，
// 走纯图演出、无 heroine-moment 暗幕，点一下即过），next 写死 her_0105（锚点 her_0104 after）。
// 原文件名为 result38_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 满幅无黑边，ffmpeg q2 落地：PSNR 46.39 dB / 268 KB。
Object.assign(ILY.data.assets.images, {
  'bg-her-noise-burst':'assets/images/backgrounds/her-noise-burst.webp'
});

// 改53 女主视角第二章 her_0105~her_0106：街头拓馬背影＋八重若菜自下方探头（像素画，描补版，蓝紫色调）
// —— 对应 her_0105「啊，这边，或许不错...」（八重，02-05 咖啡店（之后）段）～ her_0106。
// 引用节点：her_0105 / her_0106（script-edits.js 原有记录 her_0105=bg065+无立绘、her_0106=bg068+pt017 若菜，
// 2026-09-23 14:04 用户要求换图并去立绘 → 均改为 bg-her-street-stare + characters:[]）。
// 原文件名为 result_inpainted12_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×798 靠顶（行 2~799）＋ 左右黑边 286px ＋ 底部约 281px 黑边，按带黑边风格落 JPEG q2：PSNR 45.21 dB / 274 KB。
// ⚠️ 2026-09-23 14:19 用户要求换成精修版（result_inpainted17c_cropped_padded_1922x1080_1350x800.png，内容区 1350×800 靠顶）
// → 已覆盖本文件：PSNR 44.51 dB / 334 KB；14:04 那版备份 her-street-stare_old.webp。修订层记录未动。
// base 这两个节点均无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-street-stare':'assets/images/backgrounds/her-street-stare.webp'
});

// 改54 女主视角第二章 her_0107：若菜紫瞳侧脸特写（像素画，描补版）
// —— 对应 her_0107（02-05 咖啡店（之后）段）。
// 引用节点：her_0107（script-edits.js 原有记录由 bg068 + 立绘 pt017 改为
// bg-her-wakana-profile + characters:[]，2026-09-23 14:06 用户要求换图并去立绘）。
// 原文件名为 result_inpainted14_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px，按带黑边风格落 JPEG q2：PSNR 47.51 dB / 135 KB。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-wakana-profile':'assets/images/backgrounds/her-wakana-profile.webp'
});

// 改55 女主视角第二章 her_0108：桌上的手机（像素画，蓝屏发光，紫灰桌面）
// —— 对应 her_0108（02-05 咖啡店（之后）段）。
// 引用节点：her_0108（script-edits.js 原有记录由 bg068 + 立绘 pt017 改为
// bg-her-phone-table + characters:[]，2026-09-23 14:10 用户要求换图并去立绘）。
// 原文件名为 result_inpainted13_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×797 靠顶 ＋ 左右黑边 286px ＋ 底部约 283px 黑边，按带黑边风格落 JPEG q2：PSNR 46.80 dB / 159 KB。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-phone-table':'assets/images/backgrounds/her-phone-table.webp'
});

// 改56 女主视角第二章 her_0109~her_0110：拓馬背影走向人潮街道（像素画，描补版，蓝色调）
// —— 对应 her_0109 ～ her_0110「也是呢...诶——难不成是迷路了？」（若菜，02-05 段）。
// 引用节点：her_0109 / her_0110（script-edits.js 原有记录由 bg068 + 单立绘（0109 pt023 / 0110 pt017）改为
// bg-her-takuma-back + characters:[]，2026-09-23 14:12 用户要求换图并去立绘）。
// 原文件名为 result_inpainted15_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px，按带黑边风格落 JPEG q2：PSNR 43.54 dB / 422 KB。
// base 这两个节点均无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-takuma-back':'assets/images/backgrounds/her-takuma-back.webp'
});

// 改57 女主视角第二章 her_0111：街景上蓝色噪点侵蚀（像素画，描补版）
// —— 对应 her_0111（02-05 段，拓馬身影开始噪点化的冲击拍）。
// 引用节点：her_0111（script-edits.js 原有记录由 bg068 + 立绘 pt013 改为
// bg-her-noise-street + characters:[]，2026-09-23 14:15 用户要求换图并去立绘）。
// 原文件名为 result_inpainted16_cropped_padded_1922x1080_1350x800.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 内容区 1350×800 靠顶 ＋ 左右黑边 286px ＋ 底部黑边 280px，按带黑边风格落 JPEG q2：PSNR 44.65 dB / 349 KB。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-noise-street':'assets/images/backgrounds/her-noise-burst-street.webp'
});

// 改58 女主视角 03-07「照片」节点 her_0138：把背景换成用户给的少女照片（011_1922x1080.webp，
// PIL 确认 JPEG / 1922x1080 / RGB），并设为 imageOnly 纯图演出（只显示图片、去掉独白与 glitch 效果）。
// 引用节点：her_0138（script-edits.js 新增记录 bg-her-photo-worm + imageOnly:true + characters:[] + visualEffects:[]）。
// base 该节点无 cg（monologue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-photo-worm':'assets/images/backgrounds/her-photo-worm.webp'
});

// 改59 女主视角 03-08「惊恐」节点 her_0144：把背景换成用户给的主观视点图
// （edited_image_1922x1080.png：前景十屋侧脸，后面是脸被替换成照片少女的小泪），并去掉立绘。
// 引用节点：her_0144（script-edits.js 原有记录 characters:[pt018] → 改为 background + characters:[]，
// 2026-09-23 16:1x 用户要求换图并去立绘）。
// 原文件名为 edited_image_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）；
// 同图 JPEG q2 = 48.26 dB / 377 KB，webp q95 = 49.49 dB / 401 KB（差距肉眼不可辨），按本项目横构图
// 插画惯例落 JPEG q2。
// base 该节点无 cg（dialogue），故无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  'bg-her-rui-replaced-face':'assets/images/backgrounds/her-rui-replaced-face.webp'
});

// 改60 女主视角 04-02「程序错乱（演出）」节点 her_0159：把背景换成用户给的蓝色故障文字图
// （022_1922x1080.png：纯蓝底 + 竖排白色像素故障字「最喜欢你了」是什么），并设为 imageOnly 纯图演出
// （只显示图片、去掉独白与 base 的 blue 滤镜）。
// 引用节点：her_0159（script-edits.js 新增记录 bg-her-glitch-what-is-love + imageOnly:true + text:"" +
// characters:[] + visualEffects:[]，2026-09-23 16:3x 用户要求换图 + 纯图 + 不要不透明度）。
// 原文件名为 022_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB，11066 色）。
// **这张不是插画而是合成图形（纯色底 + 锐利像素字）**，故不按插画惯例走 JPEG：
// JPEG q2 = 60.57 dB / 62 KB（字边缘 31 个像素 Δ>8）、webp q95 = 60.85 dB / 23 KB（790 个像素 Δ>8）、
// **无损 webp = 67 KB / Δmax 0（逐像素相同）** → 取无损 webp，保证像素字不糊（比原 PNG 97 KB 还小）。
// base 该节点无 cg（monologue），故无回忆画廊副作用；base 背景 bg-coast-blue 是 50+ 节点共用的，未动。
Object.assign(ILY.data.assets.images, {
  'bg-her-glitch-what-is-love':'assets/images/backgrounds/her-glitch-what-is-love.webp'
});

// 改61 女主视角 04-02「程序错乱（演出）」节点 her_0160 / her_0161：把两张长独白的背景换成用户给的
// 少女双眼特写（girl_eyes_1922x1080.png，像素风、蓝色调）。
// 引用节点：her_0160 与 her_0161（script-edits.js 各新增一条 `{"background":"bg-her-eye-closeup"}`，
// 2026-09-23 16:4x 用户只要求「背景换成这个」→ **按"只改背景"约定，立绘/台词/visualEffects 一律不动**；
// 这两条 base 本来就没有 characters/portrait，且 base 的 blue 滤镜保留 —— 邻居 her_0162/0163 也带 blue，
// 只清这两个节点会让同场景推进时色调跳变）。
// 原文件名为 girl_eyes_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB，76142 色）。
// 编码是逐张实测后选定的：JPEG q2 = 50.51 dB / 239 KB（字/边缘 42 像素 Δ>8）、
// **webp q95 = 51.05 dB / 209 KB（仅 13 像素 Δ>8）**、无损 webp = 1.03 MB（像素画纹理密，不划算）
// → 取 webp q95（比 JPEG 又小又准）。
// base 这两个节点无 cg（monologue），故无回忆画廊副作用；base 背景 bg-coast-blue 是 50+ 节点共用的，未动。
Object.assign(ILY.data.assets.images, {
  'bg-her-eye-closeup':'assets/images/backgrounds/her-eye-closeup.webp'
});

// 改62 女主视角 04-02「程序错乱（演出）」节点 her_0163：把背景换成用户给的「加粗版」蓝色故障文字图
// （025_1922x1080.png：纯蓝底 + 竖排白色像素故障字「最喜欢你了」是什么，比 022 那版更粗更亮、带横向拉丝），
// 并设为 imageOnly 纯图演出（只显示图片、去掉独白与 base 的 blue 滤镜）。
// 引用节点：her_0163（script-edits.js 新增记录 bg-her-glitch-what-is-love-bold + imageOnly:true + text:"" +
// characters:[] + visualEffects:[]，2026-09-23 16:4x 用户要求换图 + 纯图 + 不要不透明度）。
// 原文件名为 025_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB，26155 色）。
// 与 022 同属**合成图形（纯色底 + 锐利像素字）** → 仍取无损 webp：
// JPEG q2 = 57.80 dB / 92 KB（93 像素 Δ>8）、webp q95 = 58.79 dB / 41 KB（1026 像素 Δ>8，字边反而更糊）、
// **无损 webp = 131 KB / Δmax 0** → 取无损（比原 PNG 178 KB 小，且字口完全没有压缩伪影）。
// base 该节点无 cg（monologue），故无回忆画廊副作用；base 背景 bg-coast-blue 是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'bg-her-glitch-what-is-love-bold':'assets/images/backgrounds/her-glitch-what-is-love-bold.webp'
});

// 改63 女主视角 04-02「程序错乱（演出）」节点 her_0166：把背景换成用户给的「基生惊恐的脸」特写
// （boy_surprised_1922x1080.png：深色背景 + 紫色辉光中的基生吃惊脸，带漫画式描边）。
// 引用节点：her_0166（script-edits.js 新增记录 `{"background":"bg-her-kio-surprised"}`，**只改背景** ——
// 台词「诶...我这是...怎么回事...？基生...」、base 的 blue 滤镜与 exitTransition:fade-black 都不动）。
// 原文件名为 boy_surprised_1922x1080.png，是真 PNG（PIL format=PNG / size=1922x1080 / mode=RGB）。
// 编码逐张实测：JPEG q2 = 51.26 dB / 187 KB（36 像素 Δ>8）、**webp q95 = 52.20 dB / 166 KB（Δ>8 为 0）**
// → 取 webp q95（暗部是大面积平滑渐变，JPEG 反而更容易出块状伪影）。
// base 该节点无 cg（dialogue），故无回忆画廊副作用；base 背景 bg-coast-blue 是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'bg-her-kio-surprised':'assets/images/backgrounds/her-kio-surprised.webp'
});

// 改64 女主视角 04-02「程序错乱（演出）」节点 her_0165：背景改为**已登记的上传资源** `bg020`
// （assets/images/uploads/bg020.webp，1280×719，少女倒卧在蓝色地砖上）。
// 引用节点：her_0165（script-edits.js 新增记录 `{"background":"bg020"}`，**只改背景**，台词/blue 滤镜不动）。
// 零新增文件：bg020 本来就在 uploaded-assets.js:18 注册着、且已被别的节点引用，此处只是复用 ID（不复制、不覆盖）。
// base 该节点无 cg（dialogue），故无回忆画廊副作用；base 背景 ch1-empty-tank 未动。

// 改65 女主视角 04-03「梦」：her_0168~0173 六连拍换成同一张梦境图（ComfyUI_00007_1922x1080.png：
// 紫色空间里白衣少女俯身捧着男孩的脸）；her_0174 换成另一张（ComfyUI_00010_1922x1080.png：黑底上独自站立的男孩）。
// 另外 her_0167（04-03 第一句独白）背景换成用户给的 030_1922x1080.webp —— **该图库内已有**：
// 与 `assets.js:148` 的 `s11-bg-2`（assets/images/backgrounds/s11-bg-2.webp，MD5 完全一致）是同一张，
// 故**直接复用已登记 ID，不复制文件、不新建 ID**。
// 引用节点：her_0167 = {background:"s11-bg-2" + characters:[]}；her_0168~0173 = {background:"bg-her-dream-lean-over" +
// characters:[]}；her_0174 = {background:"bg-her-dream-boy-alone" + characters:[]}（都按用户要求去立绘）。
// 编码逐张实测：
//   · her-dream-lean-over.webp（源 ComfyUI_00007 PNG 1.31 MB）：JPEG q2 = 51.83 dB / 175 KB（仅 22 像素 Δ>8）、
//     webp q95 = 52.31 dB / 143 KB（**2480 像素 Δ>8**）→ 取 **JPEG q2**（细黑描边被有损 webp 打毛，PSNR 看不出来）
//   · her-dream-boy-alone.webp（源 ComfyUI_00010 PNG 0.57 MB）：JPEG q2 = 57.29 dB / 48 KB（10 像素 Δ>8）、
//     **webp q95 = 57.79 dB / 28 KB（Δ>8 为 0）** → 取 **webp q95**
// 这 9 个节点的 base 背景都是共用资源 bg-coast-blue，未动；都没有 cg（无回忆画廊副作用）。
// her_scene_04_03（章节卡「梦」）改为黑幕：见 script-edits.js 的 {background:"bg-black", backgroundFit:"cover"}。
Object.assign(ILY.data.assets.images, {
  'bg-her-dream-lean-over':'assets/images/backgrounds/her-dream-lean-over.webp',
  'bg-her-dream-boy-alone':'assets/images/backgrounds/her-dream-boy-alone.webp'
});

// 改66 女主视角 04-04「基生的房间（苏醒）」：
//   · her_scene_04_04（章节卡）→ 换成 girl_surprised_1922x1080_v3.png，**纯图演出**：
//     记录 {kind:"旁白", speaker:"", text:"", background:"bg-her-girl-surprised", backgroundFit:"cover",
//     imageOnly:true, characters:[]}（原文案「基生的房间」被清空 + imageOnly 不挂面板 → 卡片标题/角标全不显示）
//   · her_0175 → 去立绘 + 背景换成 office_scene_1922x1080.png：
//     记录 {background:"bg-her-office-scene", characters:[]}（台词「这里是...他的...」照常）
// 两张源图都是真 PNG（PIL format=PNG / 1922x1080 / RGB，分别 1.49 MB / 1.54 MB），编码逐张实测：
//   · girl_surprised_v3：JPEG q2 = 331 KB（199 像素 Δ>8）、**webp q95 = 293 KB（Δ>8 为 0）** → 取 webp q95
//   · office_scene     ：JPEG q2 = 235 KB（15 像素 Δ>8）、**webp q95 = 245 KB（Δ>8 为 0）** → 取 webp q95
//     （体积只多 4%，但像素级零伪影，像素画的块状边缘更干净）
// base 这两个节点的背景分别是 bg-apartment-night（共用资源，未动）；二者都没有 cg。
Object.assign(ILY.data.assets.images, {
  'bg-her-girl-surprised':'assets/images/backgrounds/her-girl-surprised.webp',
  'bg-her-office-scene':'assets/images/backgrounds/her-office-scene.webp'
});

// 改67 女主视角 04-06「拥抱」后段（her_0204~her_0210）：换 3 张新图 + 2 处黑幕 + 去立绘。
//   · her_0204/0205/0206 → chibi_pink_1922x1080.png：记录 {characters:[], background:"bg-her-chibi-pink"}
//     （这三条原本是 {characters:[], background:"bg062"}，本次只翻 background 值 → 立绘状态沿用"已去"）
//   · her_0208           → girl_side_1922x1080.png：记录 {characters:[], background:"bg-her-girl-side"}
//     （原本 {characters:[], background:"bg062"}，只翻 background）
//   · her_0207 / her_0209 → 黑幕：记录 {characters:[], background:"bg-black", backgroundFit:"cover"}
//     （这两条原本是**双立绘** characters:[portrait-airi@center, pt011@left]，用户要求「换成黑幕，去掉立绘」
//      → 同时补 characters:[]；bg-black 是 1920×1080，cover 与原默认一致）
//   · her_0210           → glitch_bg_1922x1080.png：记录 {characters:[], background:"bg-her-glitch-bg"}
//     （原本同为双立绘，用户要求去立绘）
// 三张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB，分别 1.10 / 1.83 / 2.25 MB），全库 MD5 比对无同文件
// → 均为新 ID、新文件（不覆盖任何既有资源）。编码三档逐张实测（JPEG q2 / webp q95 / 无损 webp）：
//   · chibi_pink（像素风 chibi 双人 + 纯粉底）：JPEG q2 = 51.40 dB / 188 KB / 35 像素 Δ>8；
//     **webp q95 = 51.76 dB / 165 KB / Δ>8 为 0**；无损 webp = 789 KB（不划算）→ 取 **webp q95**
//   · girl_side（少女侧脸特写 + 抖动噪点）：JPEG q2 = 49.33 dB / 296 KB / **120 像素 Δ>8**；
//     **webp q95 = 49.95 dB / 303 KB / Δ>8 为 0**；无损 webp = 1.35 MB → 取 **webp q95**（体积 +2% 换零伪影）
//   · glitch_bg（纯蓝 + 故障块，合成图形）：JPEG q2 = 48.85 dB / 385 KB；**webp q95 = 49.46 dB / 320 KB**
//     （两档 Δ>8 都为 0）→ 取 **webp q95**（更小 + PSNR 更高）
// base 这 7 个节点的背景都是 bg-apartment-night（共用资源，未动），都没有 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-chibi-pink':'assets/images/backgrounds/her-chibi-pink.webp',
  'bg-her-girl-side':'assets/images/backgrounds/her-girl-side.webp',
  'bg-her-glitch-bg':'assets/images/backgrounds/her-glitch-bg.webp'
});

// 改68 女主视角 04-07 章节卡 her_scene_04_07：改成**纯图演出**（用户给 two_characters_1922x1080.png）。
//   base 是 type:heroine-card（text「告白（未遂）」+ checkpoint，next her_0211），修订层原本把它改成
//   {kind:"旁白", speaker:"", text:"未遂的告白", background:"bg-apartment-dusk"} —— 本次在**保留 kind/speaker** 的前提下
//   清空 text + 加 imageOnly，并把背景换成新图：
//     {kind:"旁白", speaker:"", text:"", background:"bg-her-two-characters",
//      backgroundFit:"cover", imageOnly:true, characters:[]}
//   ⚠️ 绝不能写 `kind:"演出"` —— apply() 会把 node.type 改成 cue，整拍被 resolveScriptCues 跳过（直接消失）。
//   imageOnly 下不挂 .heroine-moment 面板 → 卡片标题/角标全不渲染，画面只剩「点击画面 / SPACE」。
//   源图是真 PNG（PIL format=PNG / 1922×1080 / RGB，1.62 MB），全库 MD5 比对无同文件 → 新 ID + 新文件。
//   编码三档实测：JPEG q2 = 50.19 dB / 216 KB / 37 像素 Δ>8；**webp q95 = 50.24 dB / 256 KB / Δ>8 为 0**；
//   无损 webp = 1.09 MB（不划算）。像素画 → 按体力取 webp q95（与「改67」三张一致），体积 +18% 换零伪影。
//   base 背景是 bg-apartment-night（修订层那条记录里曾把它改成 bg-apartment-dusk）；两者都是共用资源，未动。
//   base 无 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-two-characters':'assets/images/backgrounds/her-two-characters.webp'
});

// 改69 女主视角 04-07「未遂的告白」正文段（her_0211~her_0222，3 组形态、11 个节点）：
//   · bed_scene 组（her_0211/0212/0213/0215/0218/0220）→ 记录 {characters:[], background:"bg-her-bed-scene"}
//     原本都是 `{characters:[portrait-airi@center, pt011@left], background:"bg-apartment-dusk"}`
//     → 换背景 + 按用户要求去立绘。
//   · 黑幕组（her_0214/0216/0219）→ 记录 {characters:[], background:"bg-black", backgroundFit:"cover"}
//     原本只有 `{characters:[portrait-airi@center, pt011@left]}`（没有 background → 一直退回 base 的 bg-apartment-night）
//     → 补 background + 去立绘。
//   · bed_girl_poke 组（her_0221/0222）→ 记录 {characters:[], background:"bg-her-bed-girl-poke"}
//     原本是 `{characters:[airi-blush@center, pt011@left], background:"bg-apartment-dusk"}`（注意立绘是 airi-blush）
//     → 换背景 + 去立绘。
//   ⚠️ 用户**没有**提到 her_0217（monologue「基生红着脸，准备完成告白。」）—— 它是**无入边的孤儿**：
//      base 里 her_0216.next 直接跳到 her_0218，没有任何节点的 next 指向 0217 → 永远不演出，
//      所以不在本次范围内也符合预期（改了也是白改）。
// 两张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB，分别 1.95 / 2.30 MB），全库 MD5 比对无同文件
// → 均为新 ID、新文件。编码三档实测（JPEG q2 / webp q95 / 无损 webp）**两张都取 webp q95**：
//   · bed_scene  ：JPEG q2 = 49.06 dB / 332 KB / **247 像素 Δ>8**；webp q95 = 50.34 dB / 351 KB / Δ>8 = 1；无损 1.30 MB
//   · bed_girl_poke：JPEG q2 = 48.26 dB / 381 KB / **193 像素 Δ>8**；webp q95 = 49.62 dB / 428 KB / Δ>8 = 0；无损 1.57 MB
// base 这 11 个节点背景都是 bg-apartment-night（共用资源，未动），都没有 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-bed-scene':'assets/images/backgrounds/her-bed-scene.webp',
  'bg-her-bed-girl-poke':'assets/images/backgrounds/her-bed-girl-poke.webp'
});

// 改70 女主视角 05「江之岛」段（her_0254 / her_0255）：换成用户给的 phone_girl_1922x1080.png + 去立绘。
//   两条原本都是 `{characters:[portrait-airi@right, pt011@left]}`（没有 background → 一直用 base 的 `ch2-flowers`）
//   → 本次改成 `{characters:[], background:"bg-her-phone-girl"}`（换背景 + 按用户要求去立绘）。
//   源图是真 PNG（PIL format=PNG / 1922×1080 / RGB，2.20 MB），全库 MD5 比对无同文件 → 新 ID + 新文件。
//   编码三档实测：JPEG q2 = 48.14 dB / 424 KB / **382 像素 Δ>8**；**webp q95 = 50.00 dB / 414 KB / Δ>8 = 38**；
//   无损 webp = 1.54 MB → 取 webp q95（更小且明显更准）。
//   base 这两个节点背景都是 `ch2-flowers`（共用资源，未动），都没有 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-phone-girl':'assets/images/backgrounds/her-phone-girl.webp'
});

// 改71 女主视角 05-06「重逢与"她"」：her_0320~0327 换 7 张新图 + 去立绘，并在 her_0327 与 her_0328 之间**插入一个纯图节点**。
//   节点映射（her_0320/0321 共用同一张）：
//     her_0320, her_0321 → bg-her-beach-sunset   (beach_sunset_1922x1080.png)
//     her_0322           → bg-her-sunset-1       (sunset1_1922x1080.png)
//     her_0323           → bg-her-sunset-2       (sunset2_1922x1080.png)
//     her_0324           → bg-her-icecream-1     (icecream1_1922x1080.png)
//     her_0325           → bg-her-icecream-2     (icecream2_1922x1080.png)
//     her_0326           → bg-her-icecream-bar   (icecream_bar_1922x1080_v2.png，注意是 **_v2** 那版)
//     her_0327           → bg-her-sunset-3       (sunset3_1922x1080.png)
//     插入节点 her_0327_insert_a（anchor=her_0327 / position=after）→ bg-her-sunset-couple (sunset_couple_1922x1080.png)
//   7 个节点的旧记录都是 `{characters:[portrait-airi@left, pt011@right]}`（**没有 background 键** → 用 base 的 ch2-sunset）
//   → 改成 `{characters:[], background:"<上面那个 ID>"}`（换背景 + 按用户要求去立绘）。
//   插入节点用 `added` 记录：`{type:"monologue", text:"", imageOnly:true, ...}`（纯图展示，不挂面板、点一下即过），
//   `node.next` **写死 "her_0328"**（apply() 用序列尾节点的 next 作新链末端，漏写会断链）。
//   8 张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB，0.75~2.26 MB），全库 MD5 比对都无同文件 → 全为新 ID、新文件。
//   编码三档实测：**8 张全部取 webp q95**（PSNR 都更高、Δ>8 为 0 或个位数，体积与 JPEG q2 相当或更小）：
//     beach_sunset   q95 = 49.39 dB / 401 KB vs JPEG q2 = 48.41 dB / 360 KB / 70 像素 Δ>8
//     sunset1        q95 = 50.20 dB / 304 KB vs JPEG q2 = 49.31 dB / 306 KB / 57 像素 Δ>8
//     sunset2        q95 = 50.32 dB / 292 KB vs JPEG q2 = 49.36 dB / 300 KB / 55 像素 Δ>8
//     sunset3        q95 = 50.49 dB / 275 KB vs JPEG q2 = 49.73 dB / 281 KB / 42 像素 Δ>8
//     sunset_couple  q95 = 50.56 dB / 282 KB vs JPEG q2 = 49.53 dB / 284 KB / 74 像素 Δ>8
//     icecream1      q95 = 53.02 dB / 140 KB vs JPEG q2 = 52.55 dB / 165 KB / 80 像素 Δ>8
//     icecream2      q95 = 53.99 dB / 112 KB vs JPEG q2 = 53.66 dB / 138 KB / 36 像素 Δ>8
//     icecream_bar_v2 q95 = 49.46 dB / 392 KB vs JPEG q2 = 48.52 dB / 328 KB / 85 像素 Δ>8
//   base 这些节点背景都是 `ch2-sunset`（共用资源，未动），都没有 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-beach-sunset':'assets/images/backgrounds/her-beach-sunset.webp',
  'bg-her-sunset-1':'assets/images/backgrounds/her-sunset-1.webp',
  'bg-her-sunset-2':'assets/images/backgrounds/her-sunset-2.webp',
  'bg-her-sunset-3':'assets/images/backgrounds/her-sunset-3.webp',
  'bg-her-sunset-couple':'assets/images/backgrounds/her-sunset-couple.webp',
  'bg-her-icecream-1':'assets/images/backgrounds/her-icecream-1.webp',
  'bg-her-icecream-2':'assets/images/backgrounds/her-icecream-2.webp',
  'bg-her-icecream-bar':'assets/images/backgrounds/her-icecream-bar.webp'
});

// 改72 女主视角 05-06/05-07：her_0328/0329/0331/0332 换 sunset_girl，并在 her_0332 之后**再插一个纯图节点**（sunset_three）。
//   · her_0328、her_0329：旧 `{background:"bg034", characters:[]}` → 新 `{characters:[], background:"bg-her-sunset-girl"}`
//   · her_0331、her_0332：旧 `{portrait:"", background:"bg038"/"bg057"}` → 新 `{portrait:"", background:"bg-her-sunset-girl"}`
//     （用户只说"背景换成"，**保留原记录里的 `portrait:""` 形态**，不顺手改成 `characters:[]`）
//   · 插入节点 her_0332_insert_a（anchor=her_0332 / position=after）→ bg-her-sunset-three（纯图，imageOnly）
//     锚点的原后继是 `her_scene_05_07`（章节卡，修订层里 `deleted:true` → 变 cue 被跳过，卡片不显示）
//     → `node.next` 写死 `her_scene_05_07`；玩家实际看到的顺序是 0332 → 纯图一拍 → her_0333。
//   两张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB，2.14 / 1.87 MB），全库 MD5 比对无同文件 → 新 ID + 新文件。
//   **编码格式逐张实测（这一批两张结论相反，别照抄）**：
//     · sunset_girl（长发少女＋波光海面，抖动噪点重）：
//       JPEG q2 = 47.88 dB / 430 KB / **370 像素 Δ>8**（Δmax 14）
//       webp q95 = **49.79 dB / 391 KB / 5312 像素 Δ>8**（Δmax 22）← PSNR 更高但伪影像素是 JPEG 的 14 倍
//       → **取 JPEG q2**（技能坑清单里的「PSNR 会骗人」典型案例：大面积平坦海面把平均 PSNR 拉高）
//     · sunset_three（三人合影，构图平稳）：JPEG q2 = 49.04 dB / 312 KB / 146 像素 Δ>8；
//       **webp q95 = 50.24 dB / 308 KB / 仅 27 像素 Δ>8** → 取 **webp q95**
//   base 这 4 个节点背景分别是 bg034/bg038/bg057（都是共用资源，未动），都没有 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-sunset-girl':'assets/images/backgrounds/her-sunset-girl.webp',
  'bg-her-sunset-three':'assets/images/backgrounds/her-sunset-three.webp'
});

// 改73 女主视角 05-07：her_0333/0334 换 sunset_three_nobubble_v2（三人合照·无气泡版），
//   her_0335 换 edited_1922x1080（长发女子侧脸特写）并去立绘，her_0347 换黑幕。
//   · her_0333 / her_0334：旧 `{background:"bg026", characters:[]}` → 新 `{characters:[], background:"bg-her-sunset-three-nobubble"}`
//     （用户只说"背景换成" → 立绘状态沿用原记录）
//   · her_0335：旧 `{characters:[ch2-adult@right, portrait-airi@center, pt011@left]}`（**三立绘**）
//     → 新 `{characters:[], background:"bg-her-sunset-profile"}`（换背景 + 按用户要求去立绘）
//   · her_0347：旧 `{background:"bg052", characters:[]}` → 新 `{characters:[], background:"bg-black", backgroundFit:"cover"}`
//     （两侧的 her_0346/her_0348 仍是 bg052 + `airi-scared` 立绘，用户没要求动 → 保留）
//   🚨 **源文件名骗人**：`sunset_three_nobubble_v2.png` 实际是 **JPEG**（PIL format=JPEG），
//      而且是 **2731×1535**（不是文件名里的 1922×1080；宽高比 1.779 ≈ 16:9）。
//      → 先 Lanczos 缩到项目主流的 1922×1080 再编码（2731 是 AI 放大版，降到 1922 在显示器上看不出差别、体积更小）。
//   编码实测（都在最终 1922×1080 上比）：
//     · bg-her-sunset-three-nobubble：**webp q95 = 49.57 dB / 325 KB / 仅 2 像素 Δ>8**；
//       JPEG q2 = 48.85 dB / 332 KB / 40 像素 Δ>8 → 取 **webp q95**
//     · bg-her-sunset-profile（源 edited_1922x1080.png，真 PNG 1922×1080）：**webp q95 = 49.99 dB / 295 KB / 37 像素 Δ>8**；
//       JPEG q2 = 49.19 dB / 299 KB / 66 像素 Δ>8 → 取 **webp q95**（更小 + 更准）
//   base 这 4 个节点的背景分别是 bg026/bg026/ch2-adult/bg052（都是共用资源，未动），都没有 cg。
Object.assign(ILY.data.assets.images, {
  'bg-her-sunset-three-nobubble':'assets/images/backgrounds/her-sunset-three-nobubble.webp',
  'bg-her-sunset-profile':'assets/images/backgrounds/her-sunset-profile.webp'
});

// 改74 女主视角 05-07：her_0336/0337 换 girl_1922x1080（公园绿荫·少女挥手），her_0338/0339/0340 换
//   sunset_girl_1922x1080（夕阳海岸·少女侧脸），her_0341/0342 换 blue_girl_1922x1080（纯蓝底·少女直视+两侧剪影）。
//   · her_0336/0337/0340/0341/0342：旧 `{characters:[ch2-adult@right, portrait-airi@center, pt011@left]}`（**三立绘**，无 background 键）
//     → 新 `{characters:[], background:"bg-her-*"}`（换背景 + 按用户要求去立绘）
//   · her_0338/0339：旧 `{background:"bg017", characters:[]}` → 新 `{background:"bg-her-sunset-shore", characters:[]}`
//     （原记录本就无立绘，只换背景；用户只要求去掉 her_0340 的立绘）
//   三张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB），全库 MD5 比对无同文件
//   （与改72 的 sunset_girl、改73 的 edited_1922x1080 均不同图，像素级比对 dmax=255 确认）→ 新 ID + 新文件。
//   编码格式逐张实测（JPEG q2 / webp q95 / 无损 webp，比 Δmax 与 Δ>8 像素数）：
//     · her-green-girl（绿荫＋人物，JPEG q2 = 604 KB / Δmax 17 / 3850 像素 Δ>8）：
//       webp q95 = 627 KB / Δmax 23 / 5742 像素 Δ>8 全面更差 → 取 **JPEG q2**
//     · her-sunset-shore（夕阳海面大面积平坦，JPEG q2 = 360 KB / Δmax 16 / 2316 像素 Δ>8）：
//       webp q95 = 330 KB / Δmax 32 / 9759 像素 Δ>8（伪影多 4 倍）→ 取 **JPEG q2**
//     · her-blue-stare（纯蓝底＋锐利剪影，合成/像素类，JPEG q2 = 197 KB / Δmax 21 / 2218 像素 Δ>8）：
//       webp q95 = 160 KB / **Δmax 40 / 28209 像素 Δ>8**（抖动纹理被打毛，本批最惨）→ 取 **JPEG q2**
//   base 这 7 个节点背景都是 `ch2-adult`（共用资源，未动），都没有 cg（无回忆画廊副作用）。
Object.assign(ILY.data.assets.images, {
  'bg-her-green-girl':'assets/images/backgrounds/her-green-girl.webp',
  'bg-her-sunset-shore':'assets/images/backgrounds/her-sunset-shore.webp',
  'bg-her-blue-stare':'assets/images/backgrounds/her-blue-stare.webp'
});

// 改75 女主视角 05-07：her_0343 换 hand_1922x1080（伸手抓基生）并去立绘；her_0343 与 her_0344 之间
//   插纯图节点（cg_sunset_1922x1080，基生背包背影 + ILY 半透明 glitch）；her_0344/0345/0346 用
//   couple_1922x1080（少女背影 + 男生侧脸·对望）作 **cg**（走 `cg` 字段：整屏铺图 + 无立绘 + 自动收进画廊）；
//   her_0347 已是黑幕（改73，不动）；her_0355 黑幕 + 去立绘；her_0348~0354 换 blue_pixel_girl_1922x1080
//   （蓝色像素线框巨人 + 少女）并去立绘。
//   · her_0343：旧 `{background:"bg052", characters:[pt016@center]}` → 新 `{characters:[], background:"bg-her-hand"}`
//   · her_0344/0345：旧 `{background:"bg017"/"bg045", characters:[]}` → 新 `{cg:"bg-her-couple-look", characters:[]}`
//   · her_0346：旧 `{background:"bg052", characters:[airi-scared@center]}` → 新 `{cg:"bg-her-couple-look", characters:[]}`
//   · her_0343_insert_a：added 插节点（anchor=her_0343 / position=after）→ bg-her-cg-sunset（纯图 imageOnly），
//     `node.next` 写死 `her_0344`（锚点后继正常，非章节卡）。
//   · her_0348：旧 `{background:"bg052", characters:[airi-scared@center]}` → 新 `{background:"bg-her-blue-pixel", characters:[]}`
//   · her_0349~0354：旧 `{characters:[ch2-adult@right, portrait-airi@center, pt011@left]}`（三立绘，无 background 键）
//     → 新 `{characters:[], background:"bg-her-blue-pixel"}`
//   · her_0355：旧 `{characters:[三立绘]}` → 新 `{characters:[], background:"bg-black", backgroundFit:"cover"}`
//     （her_0347 已是 `{characters:[], background:"bg-black", backgroundFit:"cover"}`，用户本次要求本就满足，不动）
//   四张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB），全库 MD5 比对无同文件；
//   cg_sunset/couple 与改71 的 her-sunset-couple 像素级比对 dmax=255，确认不同图 → 新 ID + 新文件。
//   编码格式逐张实测（JPEG q2 / webp q95 / 无损 webp，比 Δmax 与 Δ>8 像素数），四张全是 **JPEG q2**：
//     · her-hand（305 KB / Δmax 19 / 2830 像素 Δ>8）vs webp q95（333 KB / Δmax 23 / 5348）→ 全面更差
//     · her-cg-sunset（411 KB / Δmax 16 / 3284）vs webp q95（433 KB / Δmax 34 / 14018）→ 全面更差
//     · her-couple-look（328 KB / Δmax 18 / 2734）vs webp q95（337 KB / Δmax 28 / 10952）→ 全面更差
//     · her-blue-pixel（183 KB / Δmax 18 / 2230）vs webp q95（133 KB / **Δmax 53 / 45602**）→ 抖动纹理被打毛，本批最惨
//   base 0343~0355 全是 `ch2-adult` 背景 + 三立绘的 dialogue，都没有 cg；her_0356/0357 仍用 bg045（未连带）。
Object.assign(ILY.data.assets.images, {
  'bg-her-hand':'assets/images/backgrounds/her-hand.webp',
  'bg-her-cg-sunset':'assets/images/backgrounds/her-cg-sunset.webp',
  'bg-her-couple-look':'assets/images/backgrounds/her-couple-look.webp',
  'bg-her-blue-pixel':'assets/images/backgrounds/her-blue-pixel.webp'
});

// 改76 女主视角 05-08「崩坏」：her_0369 换 disappearing_girl_1922x1080.png（ILY 低头看着自己
//   正在消失的手，像素画 + 抖动渐变故障风）并去立绘。
// 引用节点：her_0369（script-edits.js 新增记录 {background:"bg-her-disappearing-girl", characters:[]}，
//   2026-09-23 21:0x 用户要求换背景 + 去立绘；base 本就无立绘键，characters:[] 为显式声明；
//   base 的 visualEffects glitch/dissolve 保留 —— dissolve 只作用于立绘（本节点无立绘，无效），
//   glitch 场景抖动与崩坏演出意图及本图故障风契合）。
// 源图为真 PNG（PIL format=PNG / 1922×1080 / RGB），全库 MD5 比对无同文件 → 新 ID + 新文件。
// 编码三档实测：JPEG q2 = 47.82 dB / 424 KB / Δmax 12 / 149 像素 Δ>8；
//   webp q95 = 49.13 dB / 432 KB / Δmax 17 / 289 像素 Δ>8；无损 webp = 1.87 MB（不划算）。
//   JPEG q2 体积更小 + Δ>8 更少（webp 仅 PSNR 略高）→ 按插画惯例取 JPEG q2。
Object.assign(ILY.data.assets.images, {
  'bg-her-disappearing-girl':'assets/images/backgrounds/her-disappearing-girl.webp'
});

// 改77 女主视角 05-08「崩坏」：her_0360~0368 换 night_scene（黄昏碎粒地平线·三人剪影）+ 去立绘。
//   · her_0360/0361/0362/0364/0366：旧 `{characters:[airi-scared@center]}`（无 background 键 → base 的 ch2-sunset）
//     → 新 `{characters:[], background:"bg-her-night-scene"}`
//   · her_0363/0365/0367/0368：原本无记录 → 新增同款记录
//   源图来自剪贴板（`clipboard-2026-09-23T13-05-19-881Z-df9d6809.webp`，**JPEG 1920×1078 有损副本**，
//   用户未给原始 PNG → 以它为源 Lanczos 放大到 1922×1080）。全库 MD5 比对无同文件 → 新 ID + 新文件。
//   编码三档实测（对 1922×1080 源比 Δ>8 / Δmax）：
//     JPEG q2 = 447 KB / 141 像素 Δ>8 / Δmax 13；
//     **webp q95 = 413 KB / 84 像素 Δ>8 / Δmax 11** → 全维度胜出，取 webp q95；
//     无损 webp = 1.51 MB（不划算）。
//   base 0360~0368 全是 `ch2-sunset` 背景 + 无 cg 的 dialogue（无回忆画廊副作用），ch2-sunset 共用资源未动。
Object.assign(ILY.data.assets.images, {
  'bg-her-night-scene':'assets/images/backgrounds/her-night-scene.webp'
});

// 改78 女主视角 05-07/05-08：her_0356/0357 换 face_closeup_1922x1080（少女脸部特写·流汗假笑），
//   her_0370/0371/0372 换 side_girl_1922x1080（暗底·少女侧脸）并去立绘。
//   · her_0356/0357：旧 `{background:"bg045", characters:[]}` → 新 `{background:"bg-her-face-closeup", characters:[]}`
//     （原记录本就无立绘，只换背景；用户没说去立绘）
//   · her_0370/0371：旧 `{characters:[airi-scared@center]}`（无 background 键 → base 的 ch2-sunset）
//     → 新 `{characters:[], background:"bg-her-side-girl"}`
//   · her_0372：**原本无记录**，新增 `{characters:[], background:"bg-her-side-girl"}`
//     （base 无立绘 → 记录里 characters:[] 是显式去立绘口径，与 0370/0371 一致）
//   base 0370~0372 带 `visualEffects:[glitch,dissolve]`，用户没要求动 → 保留
//   （glitch 动画只作用于 .scene 父容器、dissolve 只压 .portrait，都不影响背景 img 本身）。
//   两张源图都是真 PNG（PIL format=PNG / 1922×1080 / RGB），全库 MD5 比对无同文件
//   （pic/ 里的 crying_side_girl_1922x1080.png 是另一张，别混）→ 新 ID + 新文件。
//   编码格式逐张实测（JPEG q2 / webp q95 / 无损 webp），两张都取 **JPEG q2**：
//     · her-face-closeup（239 KB / Δmax 18 / 1170 像素 Δ>8）vs webp q95（242 KB / Δmax 20 / 3500）→ 全面更差
//     · her-side-girl（127 KB / Δmax 19 / 880）vs webp q95（109 KB / Δmax 32 / 1137）
//       → webp 虽小 18KB 但两项质量指标都更差（Δmax 32 vs 19），质量优先取 JPEG q2
//   base her_0356/0357 背景是 ch2-adult、her_0370~0372 背景是 ch2-sunset（都是共用资源，未动），都没有 cg。
Object.assign(ILY.data.assets.images, {
  'bg-her-face-closeup':'assets/images/backgrounds/her-face-closeup.webp',
  'bg-her-side-girl':'assets/images/backgrounds/her-side-girl.webp'
});

// 改79 女主视角 05-08「崩坏」：her_0377/0378 换 shouting_girl_ponytail_fixed_1922x1080（暗底·马尾少女
//   侧脸流泪喊叫）并去立绘。
//   · 两条旧值都是 `{characters:[airi-scared@center]}`（无 background 键 → base 的 ch2-sunset）
//     → 新 `{characters:[], background:"bg-her-shouting-girl"}`。
//   base her_0377/0378 都是 `ch2-sunset` + `visualEffects:[glitch,dissolve]` 的 dialogue，**无 cg**
//   （换背景不会造成掉出回忆画廊的问题）；用户没要求动 visualEffects → 沿用。
//   `ch2-sunset` 是共用资源（多个节点持有），未动。
//   源图为真 PNG（PIL format=PNG / 1922×1080 / RGB / 1.76 MB），
//   路径 `网页设计/pic/shouting_girl_ponytail_fixed_1922x1080.png`；全库 MD5 比对无同文件 → 新 ID + 新文件。
//   注：pic/ 下另有 shouting_girl / _full / _ponytail 三个同族变体（MD5 均不同），别混。
//   编码三档实测（对 1922×1080 源比 Δ>8 / Δmax / 体积）：
//     · JPEG q2 = 212 KB / Δmax 16 / 1360 像素 Δ>8
//     · webp q95 = 214 KB / Δmax 25 / 1706 像素 Δ>8（仅 PSNR 略高 45.30 vs 44.15，两项细节指标都更差）
//     · 无损 webp = 1.25 MB（不划算）
//     → 插画类按惯例取 **JPEG q2**（体积更小且质量指标全面占优）。
Object.assign(ILY.data.assets.images, {
  'bg-her-shouting-girl':'assets/images/backgrounds/her-shouting-girl.webp'
});

// 改80 女主视角 05-08「崩坏」：her_0373/0374/0375/0376 换 shouting_girl_ponytail_1922x1080
//   （暗底·马尾少女侧脸呐喊特写）并去立绘。
//   · her_0373/0374/0375：旧 `{characters:[airi-scared@center]}`（无 background 键 → base 的 ch2-sunset）
//     → 新 `{characters:[], background:"bg-her-shout-ponytail"}`
//   · her_0376：**原本无记录**，新增 `{characters:[], background:"bg-her-shout-ponytail"}`
//   base 0373~0376 带 `visualEffects:[glitch,dissolve]`，用户没要求动 → 保留
//   源图 `网页设计/pic/shouting_girl_ponytail_1922x1080.png`（真 PNG 1922×1080；剪贴板附件为其 JPEG 有损副本，
//   经像素比对确认对应非 fixed 变体，Δ>8 仅 17628 像素=JPEG 噪声；_fixed 变体与本图差异 61 万像素，勿混）。
//   全库 MD5 比对无同文件 → 新 ID + 新文件。编码三档实测：
//     JPEG q2 = 185 KB / PSNR 44.48 / Δmax 17 / 1365 像素 Δ>8；
//     webp q95 = 186 KB / PSNR 45.72 / Δmax 28 / 1721 像素 Δ>8（PSNR 被平坦暗区拉高，Δmax 明显更差）；
//     无损 webp = 1.10 MB（不划算）。
//   → 无单档全维度占优，按插画类惯例取 **JPEG q2**（与同段 her-side-girl / her-face-closeup 口径一致）。
//   base 无 cg（无回忆画廊副作用）；ch2-sunset 为共用资源未动。
Object.assign(ILY.data.assets.images, {
  'bg-her-shout-ponytail':'assets/images/backgrounds/her-shout-ponytail.webp'
});

// 改83 女主视角 05-08「崩坏」：her_0381 换 glitch_girl_1922x1080.png（橙红渐变背景中黑发少女 glitch 崩坏特写）并去立绘。
//   旧值 `{characters:[airi-scared@center]}`（无 background 键 → base 的 ch2-sunset）
//   → 新 `{characters:[], background:"glitch_girl_1922x1080.png"}`（换背景 + 去立绘）。
//   源图为真 PNG（PIL format=PNG / 1922×1080 / RGB），路径 `网页设计/pic/glitch_girl_1922x1080.png`；
//   全库 MD5 比对无同文件 → 新 ID + 新文件。
//   编码三档实测：JPEG q2 = 578 KB / Δmax 21 / 11244 像素 Δ>8；
//   webp q95 = 582 KB / Δmax 45 / 56785 像素 Δ>8；无损 webp = 2.09 MB（不划算）。
//   JPEG q2 体积相当、Δmax 与 Δ>8 都明显更小 → 按插画惯例取 JPEG q2。
//   注意：用户要求 ID 为 `glitch_girl_1922x1080.png`，故 ID 保留 .png 后缀，但落地文件真实格式为 .webp，
//   assets 路径后缀与落地文件一致。
//   base 无 cg（无回忆画廊副作用）；ch2-sunset 为共用资源未动。
Object.assign(ILY.data.assets.images, {
  'glitch_girl_1922x1080.png':'assets/images/backgrounds/glitch_girl_1922x1080.webp'
});

// 改84 女主视角 05-08「崩坏」：her_0382 换 glitch_girl2_1922x1080.png（橙红渐变背景中黑发少女 glitch 崩坏特写·重故障版）
//   并去立绘。
//   旧值 `{characters:[airi-scared@center]}`（无 background 键 → base 的 ch2-sunset）
//   → 新 `{characters:[], background:"glitch_girl2_1922x1080.png"}`（换背景 + 去立绘）。
//   源图为真 PNG（PIL format=PNG / 1922×1080 / RGB，3.26 MB），路径 `网页设计/pic/glitch_girl2_1922x1080.png`；
//   全库 MD5 比对无同文件（与改83 的 glitch_girl_1922x1080.png 不同图）→ 新 ID + 新文件。
//   编码三档实测：JPEG q2 = 699 KB / PSNR 40.75 / Δmax 19 / 11021 像素 Δ>8；
//   webp q95 = 690 KB / PSNR 39.63 / Δmax 42 / 98078 像素 Δ>8；无损 webp = 2.49 MB（不划算）。
//   JPEG q2 体积相当而两项细节指标全面占优（Δ>8 少 9 倍）→ 按插画惯例取 JPEG q2。
//   注：用户指定 ID 为 `glitch_girl2_1922x1080.png`，ID 保留 .png；落地文件真实格式为 .webp，故路径后缀写 .webp。
//   base 无 cg（无回忆画廊副作用）；ch2-sunset 为共用资源未动。
Object.assign(ILY.data.assets.images, {
  'glitch_girl2_1922x1080.png':'assets/images/backgrounds/glitch_girl2_1922x1080.webp'
});

// 改85 女主视角 05-08「崩坏」：her_0383 换 sunset_couple_1922x1080.png（夕阳海岸·基生背包与爱理相对而立，
//   两人之间的水面浮着一小团紫色故障光）—— 用户只要求「背景换成这个」，**按"只改背景"约定不动立绘/台词/visualEffects**。
//   写入：script-edits.js **新增**记录 `{"background":"sunset_couple_1922x1080.png"}`（base 无 characters/portrait，
//   记录里也不出现这两个键；base 的 visualEffects[blue,dissolve] 保留 —— 该节点是 monologue，换图后仍会挂
//   .heroine-moment 暗幕，属模式自带，不为此加 imageOnly）。
//   ⚠️ **文件名撞车**：`网页设计/pic/sunset_couple_1922x1080.png` 在 2026-09-23 21:38 被换过内容 ——
//   改71（19:32）落地的 `bg-her-sunset-couple`（backgrounds/her-sunset-couple.webp）用的是 **19:30 那版**，
//   与本次这版**不是同一张图**（像素比对 PSNR 9.84 dB / Δ>8 达 206 万）。全库像素比对确认库里无此新图
//   （最高 PSNR 仅 11.35 dB）→ 新 ID + 新文件，**不复用 `bg-her-sunset-couple`**。
//   源图为真 PNG（PIL format=PNG / 1922×1080 / RGB，2.89 MB），MD5 1cf0dac2e13413acc613ce7b94d03c32。
//   编码三档实测：**JPEG q2 = 581 KB / PSNR 41.38 / Δmax 17 / 5750 像素 Δ>8**；
//   webp q95 = 637 KB / PSNR 42.70 / Δmax 26 / 12828 像素 Δ>8；无损 webp = 2.13 MB（不划算）。
//   JPEG q2 体积小 56 KB 且两项细节指标都更好（仅平均 PSNR 略低）→ 按插画惯例取 JPEG q2。
//   注：用户给的 ID 写作 `sunset_couple_1922x1080.png`（.png 只是 ID 名），落地真实格式为 .webp，故路径后缀写 .webp。
//   base 该节点无 cg（monologue + visualEffects blue/dissolve），故无回忆画廊副作用；base 背景 ch2-sunset 是
//   30+ 节点共用的共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'sunset_couple_1922x1080.png':'assets/images/backgrounds/sunset_couple_1922x1080.webp'
});

// 改81 女主视角 05-08「崩坏」：her_0379 换 result2_1922x1080（夕阳海岸·黑发少女与棕发少女并肩，
//   两人神色不安）。
//   · 旧值 `{background:"bg057"}` → 新 `{background:"bg-her-sunset-duo"}`（只改背景，base 无立绘无 cg，
//     画廊无副作用；bg057 仍被 script-edits.js 里另一节点引用，未动）。
//   源图 `网页设计/pic/result2_1922x1080.png` 实为 **JPEG**（PIL format=JPEG / 1922×1080 / 头 ffd8），
//   全库 MD5 比对无同文件 → 新 ID + 新文件。源图本身就是 1922×1080 JPEG → **按原字节直接落地**，
//   不重编码（同分辨率重编码只有损失没有收益），MD5 与源完全一致（864d8b0490e1b8b770016e5f997ec509）。
Object.assign(ILY.data.assets.images, {
  'bg-her-sunset-duo':'assets/images/backgrounds/her-sunset-duo.webp'
});

// 改86 女主视角 06-02「基生的房间（又一个夜里）」：her_0403 换 boy_door_fixed_1922x1080.png
//   （基生从门缝探身·疲惫神情，右侧暗蓝噪点；对应 base 该拍的演出「门被推开。基生神情疲惫地走进屋内」）
//   **并去掉立绘**。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"boy_door_fixed_1922x1080.png", characters:[]}`（换背景 + 去立绘，本项目去立绘惯例写法）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB，1.42 MB / MD5 2b19897ac48f78b344a35268542c89f8），
//   路径 `网页设计/pic/boy_door_fixed_1922x1080.png`（同目录另有未加 `_fixed` 的旧版，MD5 ac2a5ea5…，**不是**这张）。
//   全库 MD5 无同文件；像素级比对（307 张图统一缩放到 1922×1080 算 PSNR）最高只有 **12.01 dB** / Δ>8 达 206 万
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1424020 B）：JPEG q2 = **197414 B** / PSNR 44.97 / Δmax 15 / 630 像素 Δ>8；
//   **webp q95 = 191642 B / PSNR 46.19 / Δmax 12 / 139 像素 Δ>8（VP8 有损）**；无损 webp = 947928 B。
//   webp q95 在 PSNR、Δ>8、体积三项上**全面占优** → 取 webp q95（与历史上"合成/噪点纹理类取 webp"的结论一致：
//   该图右侧是大片暗蓝抖动噪点，JPEG 在噪点上更吃亏）。
//   注：用户指定的 ID 为 `boy_door_fixed_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'boy_door_fixed_1922x1080.png':'assets/images/backgrounds/boy_door_fixed_1922x1080.webp'
});

// 改87 女主视角 06-02「基生的房间（又一个夜里）」：her_0404/0405 换 room_girl_1922x1080.png
//   （暗蓝夜里房间·蓝发少女站在窗边回头，神情紧张带泪——对应 base 该拍的演出
//    「她站起身，露出一个笑容——一个练习了很久的、欢迎回家的笑容」）**并去掉立绘**。
//   · 旧值：两个节点原本**都没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"room_girl_1922x1080.png", characters:[]}`（换背景 + 去立绘，本项目去立绘惯例写法）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB，1.46 MB / MD5 263063eadf400e1e808e5131bcb89c0b），
//   路径 `网页设计/pic/room_girl_1922x1080.png`。
//   全库 MD5 无同文件；像素级比对（同尺寸 1922×1080 候选 158 张逐一算 PSNR）最高只有 **12.00 dB** / Δ>8 达 196 万
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1463084 B）：JPEG q2 = 242762 B / PSNR 45.70 / Δmax 13 / **106 像素 Δ>8**；
//   **webp q95 = 203910 B / PSNR 47.28 / Δmax 13 / 仅 2 像素 Δ>8（VP8 有损）**；无损 webp = 1022492 B。
//   webp q95 在 PSNR、Δ>8、体积三项上**全面占优** → 取 webp q95（与同批 sibling `boy_door_fixed` 结论一致：
//   该图是大片暗蓝抖动噪点 + 像素风色块，JPEG 在噪点上更吃亏）。
//   注：用户指定的 ID 为 `room_girl_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 两节点均无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'room_girl_1922x1080.png':'assets/images/backgrounds/room_girl_1922x1080.webp'
});

// 改88 女主视角 06-02「基生的房间（又一个夜里）」：her_0406 换 wall_couple_1922x1080.png
//   （浅蓝墙面·少年背对背影在左、蓝发少女侧脸在右——两人并肩却互不看向对方；
//    对应 base 该拍的演出「基生径直走到床前，解开衬衫的扣子。他的视线从头到尾没有在右侧停留过一帧」）
//   **并去掉立绘**。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"wall_couple_1922x1080.png", characters:[]}`（换背景 + 去立绘，本项目去立绘惯例写法，
//     与同拍 sibling her_0403/0404/0405 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB，1.59 MB / MD5 ed4829b47c657a3a1ca2571dff229cd4），
//   路径 `网页设计/pic/wall_couple_1922x1080.png`。
//   全库比对：MD5 无同文件；像素级比对（309 张图统一缩放到 1922×1080 算 PSNR）最高只有 **11.75 dB** / Δ>8 达 207 万
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1593253 B，原生已是 1922×1080 无需缩放）：
//   **JPEG q2 = 249324 B / PSNR 44.57 / Δmax 17 / 627 像素 Δ>8**；
//   webp q95 = 263850 B / PSNR 45.69 / Δmax 29 / 1551 像素 Δ>8（VP8 有损）；无损 webp = 1089006 B。
//   webp q95 只在**平均 PSNR** 上略胜（+1.1 dB），而 JPEG q2 在 Δ>8（627 vs 1551）、Δmax（17 vs 29）、
//   体积（249 KB vs 264 KB）三项占优 —— 按本项目判据「PSNR 会骗人，看 Δ>8 / Δmax」取 **JPEG q2**；
//   另：差异像素分布分析显示 JPEG 的 627 个里 56% 落在高对比边缘、webp 的 1551 个只有 36% 落在边缘，
//   但 webp 的**误差像素总数是 JPEG 的 2.5 倍**，故仍取 JPEG（插画类亦符合项目惯例）。
//   注：用户指定的 ID 为 `wall_couple_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'wall_couple_1922x1080.png':'assets/images/backgrounds/wall_couple_1922x1080.webp'
});

// 改89 女主视角 06-02「基生的房间（又一个夜里）」：her_0407/0408/0409 三条独白
//   （ILY 的追问「那个...今天也去打工了吗？」/「打工怎么样啊？」/「很忙吗？」）连续**共用**一张图
//   watermark_removed_1922x1080.png（暗蓝夜里·少年背对身影在右、蓝发少女后脑在画面左下角——
//   两人同框却互不看向对方；对应 base 该拍的演出「ILY的笑容渐渐僵硬。她没有回头，只是继续自言自语道」）
//   **并去掉立绘**。
//   · 旧值：三个节点原本**都没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed_1922x1080.png", characters:[]}`（换背景 + 去立绘，本项目去立绘惯例写法，
//     与同拍 sibling her_0403/0404/0405/0406 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB，1566267 B / MD5 31a96f5840b5c05a75a3f9c1fb0f6a1d），
//   路径 `网页设计/pic/watermark_removed_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   全库比对：MD5 无同文件；像素级比对（310 张图统一缩放到 1922×1080 算 PSNR）最高只有 **14.90 dB**
//   （`7_海岸.webp`）/ Δ>8 达 175 万 → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1566267 B）：
//   **JPEG q2 = 210440 B / PSNR 46.08 / Δmax 11 / 仅 7 像素 Δ>8**；
//   webp q95 = 243664 B / PSNR 47.49 / Δmax 6 / 0 像素 Δ>8（VP8 有损）；无损 webp = 1084758 B。
//   webp q95 只在 PSNR 与 Δ>8 上略胜（0 vs 7 像素 —— 两者肉眼都无法分辨），体积却大 **16%**（+33 KB）
//   → 没有任何一档在三个维度上同时占优，按本项目判据（插画类）取 **JPEG q2**。
//   注：用户指定的 ID 为 `watermark_removed_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 三节点均无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed_1922x1080.png':'assets/images/backgrounds/watermark_removed_1922x1080.webp'
});

// 改90 女主视角 06-02「基生的房间（又一个夜里）」：her_0410/0411 两条台词
//   （「基生你在打工的地方做什么呢？我也想跟着过去看看呢...」/「我说...」）**共用**一张图
//   watermark_removed2_1922x1080.png（与 0407/0408/0409 的同族下一拍）**并去掉立绘**。
//   · 旧值：两个节点原本**都没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed2_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~0409 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB，1722481 B / MD5 2e2477da780abadd7455afc2d674f11b），
//   路径 `网页设计/pic/watermark_removed2_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   全库比对：MD5 无同文件；像素级比对（311 张图统一缩放到 1922×1080 算 PSNR）最高只有 **20.57 dB**
//   （同族的 `watermark_removed_1922x1080.webp`，是**另一张画**）/ Δ>8 达 89 万 → 确认库里没有这张图，
//   新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1722481 B）：
//   **JPEG q2 = 232343 B / PSNR 49.91 / Δmax 10 / 仅 10 像素 Δ>8**；
//   webp q95 = 270652 B / PSNR 50.63 / Δmax 7 / 0 像素 Δ>8（VP8 有损）；无损 webp = 1202228 B。
//   webp q95 只在 PSNR 与 Δ>8 上略胜（0 vs 10 像素 —— 两者肉眼都无法分辨），体积却大 **16%**（+38 KB）
//   → 没有任何一档在三个维度上同时占优，按本项目判据（插画类）取 **JPEG q2**（与同族 watermark_removed 同结论）。
//   注：用户指定的 ID 为 `watermark_removed2_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 两节点均无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed2_1922x1080.png':'assets/images/backgrounds/watermark_removed2_1922x1080.webp'
});

// 改91 女主视角 06-02「基生的房间（又一个夜里）」：her_0412（ILY 回眸的台词「基生...」，
//   base 演出「ILY回过头，看着基生。眼泪忍不住往下流」）换 watermark_removed3_1922x1080.png
//   （蓝发少女回眸落泪的特写 —— 大颗泪珠下坠、脸颊泛红、嘴角仍挂着一点笑；**并去掉立绘**）。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed3_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~0411 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB，986362 B / MD5 e3397124159606ae0f9911ca09a399af），
//   路径 `网页设计/pic/watermark_removed3_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   全库比对：MD5 无同文件；像素级比对（312 张图统一缩放到 1922×1080 算 PSNR）最高只有 **11.49 dB**
//   （uploads/bg030.webp）/ Δ>8 达 70.7 万 → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 986362 B）：
//   JPEG q2 = 203734 B / PSNR 48.21 / Δmax 12 / 156 像素 Δ>8；
//   **webp q95 = 160994 B / PSNR 49.54 / Δmax 9 / 仅 2 像素 Δ>8（VP8 有损）**；无损 webp = 683944 B。
//   webp q95 在 PSNR（+1.3 dB）、Δ>8（2 vs 156）、体积（161 KB vs 204 KB）**三项同时占优**
//   → 取 **webp q95**（与同族 watermark_removed / watermark_removed2 的 JPEG 结论不同：那两张是
//     "没有任何一档在三个维度上同时占优"才按插画惯例取 JPEG，本张是 webp 全维度胜出）。
//   注：用户指定的 ID 为 `watermark_removed3_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed3_1922x1080.png':'assets/images/backgrounds/watermark_removed3_1922x1080.webp'
});

// 改92 女主视角 06-02「基生的房间（又一个夜里）」：her_0413 / her_0414 / her_0415
//   （ILY 擦脸后硬撑着说话的三连台词，base 演出「她赶紧用手背擦了擦脸，然后接着说道，声音努力地扬起来」「…」）
//   换 watermark_removed4_1922x1080.png（蓝发少女用手背擦眼、泪眼带笑的特写；**并去掉立绘**）。
//   · 旧值：三个节点原本**都没有**修订层记录 → base 均为
//     `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed4_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~0412 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / 1999956 B / MD5 01f8c66b1f62254149e0c90074c7a223），
//   路径 `网页设计/pic/watermark_removed4_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 `watermark_removed5_1922x1080.png`（1999956→2024353 B / MD5 3082c126278bbd9f05b098e07140d39c，
//   **另一张画**，user 本次点名的是 4 不是 5）；`watermark_removed3_1922x1080.png` 也已落地（her_0412 用）。
//   全库比对：本张 MD5 在库内无同文件；像素级比对（backgrounds/ + cg/ 下 **124 张同为 1922×1080** 的图）
//   最高只有 **11.01 dB**（her-light-drift.webp）/ Δ>8 达 207.6 万 → 确认库里没有这张图，
//   新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1999956 B）：
//   JPEG q2 = 316881 B / PSNR 45.16 / Δmax 12 / 90 像素 Δ>8；
//   **webp q95 = 330272 B / PSNR 46.50 / Δmax 8 / 仅 0 像素 Δ>8（VP8 `VP8 ` 有损）**；无损 webp = 1434664 B。
//   webp q95 在 PSNR（+1.34 dB）与 Δ>8（0 vs 90）两项占优、体积只高 4.2%（13 KB）→ 取 **webp q95**
//   （与同族 watermark_removed3 同结论；watermark_removed / 2 那两张才是按插画惯例取 JPEG）。
//   注：用户指定的 ID 为 `watermark_removed4_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 三个节点均为 dialogue、无 cg → 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1_夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed4_1922x1080.png':'assets/images/backgrounds/watermark_removed4_1922x1080.webp'
});

// 改93 女主视角 06-02「基生的房间（又一个夜里）」：her_0416（ILY 关心基生的台词
//   「要是不好好吃饭的话，会容易感冒的！基生...」）换 watermark_removed5_1922x1080.png
//   （蓝发少女侧脸回眸、脸颊泛红、张嘴说话的特写，暗蓝噪点背景；**并去掉立绘**）。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed5_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~her_0415 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / 2024353 B / MD5 3082c126278bbd9f05b098e07140d39c），
//   路径 `网页设计/pic/watermark_removed5_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 这张就是上一批（改92，her_0413~0415）注释里提醒过的那张「同目录另一张画」——
//   与 `watermark_removed4_1922x1080.png`（MD5 01f8c66b1f62254149e0c90074c7a223）**不是同一张**，
//   两文件体积相近（2024353 vs 1999956 B）但内容不同，别按体积/文件名猜。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下 **314 张**图统一缩放到 1922×1080 算 PSNR）
//   最高只有 **12.24 dB**（maps/ch3-coast.webp；次高是同族的 watermark_removed2 = 12.12 dB）/ Δ>8 达 207 万
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 2024353 B）：
//   JPEG q2 = 309369 B / PSNR 45.07 / Δmax 11 / 52 像素 Δ>8；
//   **webp q95 = 322464 B / PSNR 46.50 / Δmax 7 / 仅 0 像素 Δ>8（VP8 `VP8 ` 有损）**；无损 webp = 1502228 B。
//   webp q95 在 PSNR（+1.43 dB）与 Δ>8（0 vs 52）两项占优、体积只高 4.2%（13 KB）→ 取 **webp q95**
//   （与同族 watermark_removed3 / watermark_removed4 同结论；watermark_removed / 2 那两张才是按插画惯例取 JPEG）。
//   注：用户指定的 ID 为 `watermark_removed5_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed5_1922x1080.png':'assets/images/backgrounds/watermark_removed5_1922x1080.webp'
});

// 改94 女主视角 06-02「基生的房间（又一个夜里）」：her_0417（ILY 轻唤基生名字的台词
//   「基生...」）换 watermark_removed6_1922x1080.png（蓝发少女侧脸俯首、睫毛低垂、脸颊泛红、
//   嘴唇微张的特写，背景是暗蓝噪点；**并去掉立绘**）。
//   【改95 追加】her_0418 / her_0419（ILY「想吃冰激淋」「一起去便利店」两拍）也换同一张图 + 去立绘，
//   同样原本无记录、同样写 `{background:"watermark_removed6_1922x1080.png", characters:[]}`
//   → 本 ID 现共被 her_0417/0418/0419 三个节点引用（验证模板 tools/verify-her-0418-0419-image.mjs）。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed6_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~her_0416 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / 1824079 B / MD5 64e08c8a99b46ceaf8b0c47ff7b4b866），
//   路径 `网页设计/pic/watermark_removed6_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed5 五张同族图（均已落地，分别服务 her_0407~0416）；
//   六张体积各不相同（1566267 / 1722481 / 986362 / 1999956 / 2024353 / 1824079 B），别按体积或文件名顺序猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下 **315 张**图统一缩放到 1922×1080 算 PSNR）
//   最高只有 **12.84 dB**（女主线/01-04-背景.webp；同族 watermark_removed2 = 12.29 dB）/ Δ>8 达 200 万
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1824079 B）：
//   JPEG q2 = 266171 B / PSNR 45.70 / Δmax 12 / 35 像素 Δ>8；
//   **webp q95 = 278410 B / PSNR 46.88 / Δmax 7 / 仅 0 像素 Δ>8（VP8 `VP8 ` 有损）**；无损 webp = 1395464 B。
//   webp q95 在 PSNR（+1.18 dB）与 Δ>8（0 vs 35）两项占优、体积只高 4.6%（+12 KB）→ 取 **webp q95**
//   （与同族 watermark_removed3 / 4 / 5 同结论；watermark_removed / 2 那两张才是按插画惯例取 JPEG）。
//   注：用户指定的 ID 为 `watermark_removed6_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed6_1922x1080.png':'assets/images/backgrounds/watermark_removed6_1922x1080.webp'
});

// 改96 女主视角 06-02「基生的房间（又一个夜里）」：her_0420（ILY「基生...」低唤台词）换
//   watermark_removed7_1922x1080.png（暗蓝夜里·蓝发少女俯身贴在床边、少年沉睡在床上的全景，**并去掉立绘**）。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed7_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~her_0419 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / 2253912 B / MD5 900e5daeb268f9bccf6760500f48d3e7），
//   路径 `网页设计/pic/watermark_removed7_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed6 六张同族图（均已落地，分别服务 her_0407~0419）；
//   七张体积各不相同，别按体积或文件名顺序猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下 315 张图统一缩放到 1922×1080 算 PSNR）
//   最高只有 **17.18 dB**（ui/tunnel-wall-tile.webp）/ 次高 17.04 dB（backgrounds/7_海岸.webp）
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 2253912 B）：
//   **JPEG q2 = 325732 B / PSNR 43.32 / Δmax 16 / 1533 像素 Δ>8**；
//   webp q95 = 365046 B / PSNR 44.68 / Δmax 18 / 1714 像素 Δ>8；无损 webp = 1595850 B。
//   webp 只赢 PSNR（+1.36 dB），体积反大 12%、Δ>8 与 Δmax 都略差 → 没有任何一档全面占优，
//   按插画类惯例取 **JPEG q2**（与同族 watermark_removed / 2 同结论；removed3~6 才是 webp q95）。
//   注：用户指定的 ID 为 `watermark_removed7_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed7_1922x1080.png':'assets/images/backgrounds/watermark_removed7_1922x1080.webp'
});

// 改97 女主视角 06-02「基生的房间（又一个夜里）」：her_0422（ILY 哽咽台词「基生...那个...」）换
//   watermark_removed8_1922x1080.png（暗蓝夜里·蓝发少女背对镜头立在床边、少年趴睡在床沿的全景，
//   **并去掉立绘**）。同批 her_0421 改黑幕（复用 bg-black，不新增文件）。
//   · 旧值：该节点原本**没有**修订层记录 → base 为 `{background:"bg-apartment-night", portrait:"portrait-airi"}`。
//   · 新值：`{background:"watermark_removed8_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同拍 sibling her_0403~her_0420 完全一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / 1698983 B / MD5 012e1bab015930f8e723f96df56fbcd3），
//   路径 `网页设计/pic/watermark_removed8_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed7 七张同族图（均已落地，分别服务 her_0407~0420）；
//   八张体积各不相同，别按体积或文件名顺序猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下 315 张图统一缩放到 1922×1080 算 PSNR）
//   最高只有 **12.70 dB**（backgrounds/watermark_removed_1922x1080.webp，同族最接近的也才这个量级）
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG 1698983 B，JPEG 档用 ffmpeg -q:v 2）：
//   **JPEG q2 = 238397 B / PSNR 44.61 / Δmax 18 / 558 像素 Δ>8**；
//   webp q95 = 250444 B / PSNR 45.51 / Δmax 17 / 906 像素 Δ>8；无损 webp = 1277026 B。
//   JPEG q2 在体积（-5%）与 Δ>8（558 vs 906）两项占优、webp 只赢 PSNR（+0.9 dB）→ 取 **JPEG q2**
//   （与同族 watermark_removed / 2 / 7 同结论；removed3~6 才是 webp q95）。
//   注：用户指定的 ID 为 `watermark_removed8_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg（dialogue 节点）→ 无回忆画廊副作用（写 background 会 delete node.cg，本就无 cg）。
//   base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed8_1922x1080.png':'assets/images/backgrounds/watermark_removed8_1922x1080.webp'
});

// 改98 女主视角 06-03「触碰」第一拍：her_0423（独白「基生正躺在床上睡觉，突然感觉有什么虫子爬过
//   他的肩膀。」）改成**纯图片展示**，放 watermark_removed9_1922x1080.png（像素风·伊吕的手轻轻搭在
//   熟睡的基生肩上的特写，蓝白色调）。
//   · 旧值：该节点原本已有修订记录（仅 `characters:[portrait-airi@right, pt011@center]` 双立绘）
//     → 基线 = **还原这条旧记录**，不是删整条（删了会退回 base，把 base 的 blue 滤镜等带进 diff）。
//   · 新值：`{background:"watermark_removed9_1922x1080.png", imageOnly:true, text:"", characters:[],
//     visualEffects:[]}`（纯图演出：无打字机、点一下即过；base 的 blue 滤镜清掉，与同族
//     her_0138/her_0159 纯图先例一致，图片按原亮度展示）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 192cc16ae90a8e1c2435828a6f19e856），
//   路径 `网页设计/pic/watermark_removed9_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed8 八张同族图（均已落地，分别服务 her_0407~0422）；
//   九张体积/内容各不相同（removed9 MD5 192cc16a…），别按体积或文件名顺序猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下同尺寸图逐张算 PSNR）
//   最高只有 **9.93 dB**（wall_couple）→ 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   **JPEG q2 = 319143 B / PSNR 41.04 / Δmax 15 / 1377 像素 Δ>8**；
//   webp q95 = 276 KB / PSNR 41.37 / Δmax 21 / 4567 像素 Δ>8；无损 webp = 1436 KB（不划算）。
//   JPEG q2 在 Δ>8（1377 vs 4567，3.3 倍差）与 Δmax（15 vs 21）两项保真维度占优、webp 只赢
//   PSNR（+0.33 dB）与体积（-35 KB）→ 取 **JPEG q2**（与同族 removed/2/7/8 同结论）。
//   注：用户指定的 ID 为 `watermark_removed9_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed9_1922x1080.png':'assets/images/backgrounds/watermark_removed9_1922x1080.webp'
});

// 改99 女主视角 06-03「触碰」：her_0424~her_0429 六拍（基生惊醒「哇啊！」起至该段末）换
//   watermark_removed10_1922x1080.png（像素风·深夜卧室，基生猛然坐起在床上、伊吕站在床边的全景，蓝白色调）
//   **并去掉立绘**。
//   · 旧值：六条原本都已有修订记录（仅 `characters:[portrait-airi@right, pt011@center]` 双立绘、无 background 键）
//     → 基线 = **各自还原旧记录**，不是删整条。
//   · 新值：`{background:"watermark_removed10_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03 邻居 her_0410~0423 的记录形态完全一致；不动 base 的 blue 滤镜，避免同场景色调跳变）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / MD5 bb97922859b2eaf63f5542e73f3ea508），
//   路径 `网页设计/pic/watermark_removed10_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed16 同族图；removed10 与 removed9（192cc16a…）等九张已落地图
//   内容各不相同，别按体积或文件名顺序猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下同尺寸图逐张算 PSNR / Δ>8）
//   最高只有 **14.91 dB**（S07-A 2.webp，Δ>8 达 498 万）→ 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   **JPEG q2 = 312631 B / PSNR 43.32 / Δmax 18 / 1682 像素 Δ>8**；
//   webp q95 = 325880 B / PSNR 44.58 / Δmax 20 / 2349 像素 Δ>8；无损 webp = 1531 KB（不划算）。
//   JPEG q2 在 Δ>8（1682 vs 2349）、Δmax（18 vs 20）与体积三项占优、webp 只赢 PSNR（+1.26 dB）
//   → 取 **JPEG q2**（与同族 removed/2/7/8/9 同结论）。
//   注：用户指定的 ID 为 `watermark_removed10_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该批节点无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed10_1922x1080.png':'assets/images/backgrounds/watermark_removed10_1922x1080.webp'
});

// 改100-A 女主视角 06-03「触碰」：her_0430~her_0432 三拍（基生「哈……」「什么东西啊……」「真是不舒服……」）
//   换 watermark_removed12_1922x1080.png（像素风·蓝发少女侧脸特写，脸颊挂汗珠、
//   唇角带血痕，背景暗蓝带噪点，蓝白色调）**并去掉立绘**。
//   ⚠️ 需求原文是 her_0430~her_0433 四拍，但 **her_0433 随后被另一会话按最新指派换成
//   watermark_removed13_1922x1080.png**（见下方「改100」块）→ 本批实际落地为前三拍，0433 未动。
//   · 旧值：三条原本都已有修订记录（仅 `characters:[portrait-airi@right, pt011@center]` 双立绘、无 background 键）
//     → 基线 = **各自还原旧记录**，不是删整条（删了会退回 base，把 base 的 blue 滤镜等带进 diff）。
//   · 新值：`{background:"watermark_removed12_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03 邻居 her_0407~0423 / her_0424~0429（改89~改99）的记录形态完全一致；
//     不动 base 的 blue 滤镜，避免同场景色调跳变）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / 1482905 B / MD5 b4cdeb907d35dd2e389e87d1c9b1e10d），
//   路径 `网页设计/pic/watermark_removed12_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed16 同族图；removed10（bb979228…，改99）与 removed12（b4cdeb90…）
//   是**两张不同的画**，别按编号或体积猜内容；removed11 未由本批使用。
//   全库比对：MD5 在库内无同文件；像素级比对（`game/assets/images` 下 191 张同比例横图逐张算 PSNR）
//   最高不足 30 dB → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   **JPEG q2 = 186179 B / PSNR 45.03 / Δmax 16 / 389 像素 Δ>8**；
//   webp q95 = 200996 B / PSNR 45.88 / Δmax 19 / 384 像素 Δ>8；无损 webp = 1045848 B（不划算）。
//   JPEG q2 在体积（-15 KB）与 Δmax（16 vs 19）占优、Δ>8 与 webp 基本打平（389 vs 384）、webp 仅 PSNR +0.85 dB
//   → 按插画类惯例取 **JPEG q2**（与同族 removed/2/7/8/9/10 同结论；removed3~6 才是 webp q95）。
//   注：用户指定的 ID 为 `watermark_removed12_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该批节点无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed12_1922x1080.png':'assets/images/backgrounds/watermark_removed12_1922x1080.webp'
});

// 改100 女主视角 06-03「触碰」：her_0433（ILY 惊叹台词「...！」，接在改99 的 her_0424~0429 之后）换
//   watermark_removed13_1922x1080.png（像素风·蓝眼少女脸部特写，蓝白色调）**并去掉立绘**。
//   · 旧值：该节点原本已有修订记录（仅 `characters:[portrait-airi@right, pt011@center]` 双立绘、无 background 键）
//     → 基线 = **还原旧记录**，不是删整条。
//   · 新值：`{background:"watermark_removed13_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03 邻居的记录形态一致；不动 base 的 blue 滤镜，避免同场景色调跳变）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 beb894cf347c202e15b2b0bea1cc2845），
//   路径 `网页设计/pic/watermark_removed13_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed16 同族图；removed13（beb894cf…）与 removed10（bb979228…）、
//   removed12（b4cdeb90…）等已落地图**内容各不相同**，别按编号或体积猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds/ 下同尺寸图逐张算 PSNR / Δ>8）
//   最高只有 **10.21 dB**（her-light-drift.webp，Δ>8 达 207 万）→ 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   JPEG q2 = 290492 B / PSNR 45.63 / Δmax 12 / 92 像素 Δ>8；
//   **webp q95 = 275644 B / PSNR 46.73 / Δmax 9 / 1 像素 Δ>8**；无损 webp = 1327 KB（不划算）。
//   → webp q95 在 PSNR / Δ>8 / Δmax / 体积**四项全胜** → 取 **webp q95**（与同族 removed3~6 同结论）。
//   注：用户指定的 ID 为 `watermark_removed13_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed13_1922x1080.png':'assets/images/backgrounds/watermark_removed13_1922x1080.webp'
});

// 改101 女主视角 06-03「触碰」：her_0434（ILY 台词「...对不起...基生...」，接在改100 的 her_0433 之后）换
//   watermark_removed14_1922x1080.png（像素风·蓝发少女低头合掌，白底蓝白色调）**并去掉立绘**。
//   · 旧值：该节点原本已有修订记录（仅 `characters:[portrait-airi@right, pt011@center]` 双立绘、无 background 键）
//     → 基线 = **还原旧记录**，不是删整条。
//   · 新值：`{background:"watermark_removed14_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03 邻居的记录形态一致；不动 base 的 blue 滤镜，避免同场景色调跳变）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 eefbae99ee2c1d4c500b9d80cc7567f3），
//   路径 `网页设计/pic/watermark_removed14_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed16 同族图；removed14（eefbae99…）与 removed13（beb894cf…）
//   等已落地图**内容各不相同**（与 removed13 像素比对仅 4.41 dB），别按编号或体积猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds/cg/characters 下同尺寸 129 张逐张算 PSNR / Δ>8）
//   最高只有 **12.68 dB**（cg/ch2-couple.webp，Δ>8 达 120 万）→ 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   JPEG q2 = 73480 B / PSNR 52.83 / Δmax 15 / 317 像素 Δ>8；
//   **webp q95 = 42892 B / PSNR 52.95 / Δmax 17 / 380 像素 Δ>8**；无损 webp = 170258 B / Δmax 0（不划算）。
//   → webp q95 在 PSNR（+0.12）与体积（-42%）占优、Δ>8 与 JPEG 同量级都极小（380 vs 317）
//   → 取 **webp q95**（与同族 removed13 同结论；removed3~6 也是 webp q95）。
//   注：用户指定的 ID 为 `watermark_removed14_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 该节点无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed14_1922x1080.png':'assets/images/backgrounds/watermark_removed14_1922x1080.webp'
});

// 改102 女主视角 06-04「独白（夜）」：her_0442~her_0444（三句连续独白）背景换成
//   watermark_removed16_1922x1080.png（像素风·蓝发少女立于床边望向熟睡者，暗蓝色调）**并去掉立绘**。
//   · 旧值：三个节点原本都无修订记录 → 基线 = 删整条退回 base（bg-apartment-night + portrait-airi）。
//   · 新值：`{background:"watermark_removed16_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03 邻居的记录形态一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 e6a361109ff4c20a1c90992011992f57），
//   路径 `网页设计/pic/watermark_removed16_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed18 同族图；removed16（e6a36110…）与 removed13（beb894cf…）、
//   removed14（eefbae99…）等已落地图**内容各不相同**，别按编号或体积猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds/cg/characters 全部图逐张算 PSNR / Δ>8）
//   最高只有 **15.75 dB**（watermark_removed_1922x1080.webp，Δ>8 达 472 万）→ 确认库里没有这张图，
//   新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   **JPEG q2 = 278083 B / PSNR 49.27 / Δmax 18 / 999 像素 Δ>8**；
//   webp q95 = 288246 B / PSNR 50.01 / Δmax 25 / 2068 像素 Δ>8；无损 webp = 1386 KB（不划算）。
//   → webp q95 只赢 PSNR 平均值；JPEG q2 在 **Δ>8（999 vs 2068）/ Δmax（18 vs 25）/ 体积** 三项占优
//   → 取 **JPEG q2**（插画类惯例；又一次「PSNR 会骗人」实例）。
//   注：用户指定的 ID 为 `watermark_removed16_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 三节点均无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed16_1922x1080.png':'assets/images/backgrounds/watermark_removed16_1922x1080.webp'
});

// 改102 女主视角 06-04「独白（夜）」：her_0435~her_0441 七拍（章节卡 her_scene_06_04 后的整段 ILY 独白，
//   从「我知道基生他已经看不到我了……」到「和“爱理”一起度过的那些日子仿佛从一开始就不存在。」）换
//   watermark_removed15_1922x1080.png（像素风·蓝发少女含泪脸部特写，蓝白色调）**并去掉立绘**。
//   · 旧值：七拍 base 均为 `bg-apartment-night + portrait:"portrait-airi"`，**原本均无修订记录**
//     → 基线 = `delete records[id]`（整条删掉退回 base）。
//   · 新值：`{background:"watermark_removed15_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03 邻居（改89~改101）的记录形态一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 cb1a8c76d5fb7f8a6f582a84ac60666d），
//   路径 `网页设计/pic/watermark_removed15_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed16 同族图；removed15（cb1a8c76…）与 removed13/14
//   （beb894cf… / eefbae99…）等已落地图**内容各不相同**，别按编号或体积猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds/cg/characters 下同尺寸 173 张逐张算 PSNR / Δ>8）
//   最高只有 **3.52 dB**（her-cafe-reaction.webp，Δ>8 达 207 万）→ 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2）：
//   JPEG q2 = 220496 B / PSNR 45.09 / Δmax 17 / 1054 像素 Δ>8；
//   **webp q95 = 185716 B / PSNR 45.84 / Δmax 25 / 1790 像素 Δ>8**；无损 webp = 1013524 B / Δmax 0（不划算）。
//   → webp q95 在 PSNR（+0.75）与体积（-16%）占优；Δ>8 与 Δmax 虽高于 JPEG（1790 vs 1054 / 25 vs 17）
//   但均远低于可见阈值 → 取 **webp q95**（与同族 removed13/14 同结论；removed3~6 也是 webp q95）。
//   注：用户指定的 ID 为 `watermark_removed15_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **webp**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 各节点无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动；
//   base 各节点无 visualEffects → 不涉及 blue 滤镜取舍。
Object.assign(ILY.data.assets.images, {
  'watermark_removed15_1922x1080.png':'assets/images/backgrounds/watermark_removed15_1922x1080.webp'
});

// 改103 女主视角 06-05「告别」：her_0447~her_0449（ILY 三句告白词「基生...」「我呢，真的」「最最最喜欢，基生了...」）
//   背景换成 watermark_removed17_1922x1080.png（像素风·蓝发少女俯身床边望着熟睡的两人，暗蓝色调）**并去掉立绘**。
//   （改103-A 续：用户随后追加 her_0450「...」/ her_0451「...你听不见我的声音，真是太好了...」两拍同样处理，
//   走同一 ID，不新增资源块。06-05 段 her_0447~her_0451 共五拍用 removed17，her_0452 起用 removed18=改104。）
//   · 旧值：三拍 base 均为 `bg-apartment-night + portrait:"portrait-airi" + visualEffects:["dissolve"]`，**原本均无修订记录**
//     → 基线 = `delete records[id]`（整条删掉退回 base）。
//   · 新值：`{background:"watermark_removed17_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02/06-03/06-04 邻居（改89~改102）的记录形态一致；visualEffects 不写 → 沿用 base 的 dissolve）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 8b2b934f39381f56a8862603171be39b），
//   路径 `网页设计/pic/watermark_removed17_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed18 同族图；removed17（8b2b934f…）与 removed13/14/15/16
//   （beb894cf… / eefbae99… / cb1a8c76… / e6a36110…）等已落地图**内容各不相同**，别按编号或体积猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds/cg/characters 下同尺寸图逐张算 PSNR / Δ>8）
//   最高只有 **14.23 dB**（watermark_removed7_1922x1080.webp，Δ>8 达 475 万）→ 确认库里没有这张图，
//   新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2，PSNR 均按 RGB 逐像素算，非 ffmpeg yuv 值）：
//   **JPEG q2 = 293558 B / PSNR 43.55 / Δmax 20 / 2504 像素 Δ>8**；
//   webp q95 = 298166 B / PSNR 44.25 / Δmax 36 / 11637 像素 Δ>8；无损 webp = 1480572 B（不划算）。
//   → webp q95 只赢 PSNR 平均值；JPEG q2 在 **Δ>8（2504 vs 11637）/ Δmax（20 vs 36）/ 体积** 三项占优
//   → 取 **JPEG q2**（与同族 removed16 同结论）。
//   注：用户指定的 ID 为 `watermark_removed17_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 三节点均无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed17_1922x1080.png':'assets/images/backgrounds/watermark_removed17_1922x1080.webp'
});

// 改104 女主视角 06-05「告别」：her_0452（ILY 台词「...也看不见这幅残破的身体，真是太好了...」）与
//   her_0454（ILY 台词「那么...」，手碎成光点那一拍）背景换成
//   watermark_removed18_1922x1080.png（像素风·蓝白手部特写，故障蓝色调）**并去掉立绘**。
//   · 旧值：两拍 base 均为 `bg-apartment-night + portrait:"portrait-airi" + visualEffects:["dissolve"]`，**原本均无修订记录**
//     → 基线 = `delete records[id]`（整条删掉退回 base）。
//   · 新值：`{background:"watermark_removed18_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02~06-05 邻居（改89~改103）的记录形态一致；visualEffects 不写 → 沿用 base 的 dissolve）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / RGB / MD5 c2444a08910c787e18432bbab8836081），
//   路径 `网页设计/pic/watermark_removed18_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 watermark_removed ~ removed18 同族图；removed18（c2444a08…）与 removed13~17
//   （beb894cf… / eefbae99… / cb1a8c76… / e6a36110… / 8b2b934f…）等已落地图**内容各不相同**，别按编号或体积猜内容。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds/cg/characters 下 200 张逐张算 PSNR / Δ>8，
//   仅同尺寸 1922×1080 参与）最高只有 **8.73 dB**（watermark_removed13_1922x1080.webp，Δ>8 达 207 万）
//   → 确认库里没有这张图，新 ID + 新文件（**未**复用任何已登记资源）。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2，PSNR 按 RGB 逐像素算，非 ffmpeg yuv 值）：
//   **JPEG q2 = 389650 B / PSNR 43.34 / Δmax 18 / 4745 像素 Δ>8**；
//   webp q95 = 362676 B / PSNR 43.21 / Δmax 35 / 28918 像素 Δ>8；无损 webp = 1551846 B（不划算）。
//   → webp q95 只省 7% 体积、PSNR 反而略低；JPEG q2 在 **Δ>8（4745 vs 28918，约 6 倍）/ Δmax（18 vs 35）** 占优
//   → 取 **JPEG q2**（与同族 removed16/17 同结论）。
//   注：用户指定的 ID 为 `watermark_removed18_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 两节点均无 cg → 无回忆画廊副作用；base 背景 `bg-apartment-night`（1.夜晚家.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  'watermark_removed18_1922x1080.png':'assets/images/backgrounds/watermark_removed18_1922x1080.webp'
});

// 改105 女主视角 07-01「海边（黎明前）」：her_0458 / her_0459 / her_0460（ILY 台词「基生...」）三拍背景换成
//   海边月夜_无水印_1922x1080.png（深蓝夜海 + 海面月下倒影 + 沙滩上一个坐着的剪影）**并去掉立绘**。
//   · 旧值：三拍 base 均为 `bg-coast-night + portrait:"airi-broken"`，**原本均无修订记录**
//     → 基线 = `delete records[id]`（整条删掉退回 base）。
//   · 新值：`{background:"海边月夜_无水印_1922x1080.png", characters:[]}`（换背景 + 去立绘，
//     与同段 06-02~06-05 邻居（改89~改104）的记录形态一致）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / MD5 38e02fe38d45efb1d1514138c4d8a480），
//   路径 `网页设计/pic/海边月夜_无水印_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 `海边月夜_无水印.png`（**JPEG 2731×1535**，MD5 7c466f28…）——同族不同张，
//   用户点名的是 1922x1080 这张，别拿错。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds 下 131 张同尺寸 1922×1080 逐张算 PSNR / Δ>8）
//   最高只有 **14.89 dB**（s11-bg-1.webp，Δ>8 达 207 万）→ 确认库里没有这张图，新 ID + 新文件。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2，PSNR 按 RGB 逐像素算）：
//   **JPEG q2 = 379082 B / PSNR 42.70 / Δmax 19 / 2448 像素 Δ>8**；
//   webp q95 = 413312 B / PSNR 43.83 / Δmax 23 / 4965 像素 Δ>8；无损 webp = 1800764 B（不划算）。
//   → JPEG q2 在 **Δ>8（2448 vs 4965）与体积（370 vs 403 KB）** 占优，webp 只赢 PSNR（平均值会骗人）
//   → 取 **JPEG q2**。
//   注：用户指定的 ID 为 `海边月夜_无水印_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 三节点均无 cg → 无回忆画廊副作用；base 背景 `bg-coast-night`（7_海岸.webp）是共用资源，未动。
Object.assign(ILY.data.assets.images, {
  '海边月夜_无水印_1922x1080.png':'assets/images/backgrounds/海边月夜_无水印_1922x1080.webp'
});

// 改106 最终章 S02「崩坏」：fin_060（独白「能说你喜欢我吗」）背景换成
//   动漫少女_无水印_1922x1080.png（蓝色故障风：少女回眸抱住少年背影，十字星闪光 + 毛刺纹理）。
//   · 旧值：base 为 `bg-coast-blue`（9_海岸_纯蓝.webp，共用资源，未动），无 cg 无立绘；
//     该节点**原本已有修订记录**（纯文字 `{"kind":"旁白","speaker":"","text":"\"能说你喜欢我吗\""}`）
//     → 基线 = 还原旧值（不能删整条，删了会把那条文字记录一起丢掉）。
//   · 新值 = 旧记录 + `"background":"动漫少女_无水印_1922x1080.png"`（只加背景，不动文字/立绘）。
//   源图为**真 PNG**（PIL format=PNG / 1922×1080 / MD5 bebd9618da9b254c113021fbccd33f82），
//   路径 `网页设计/pic/动漫少女_无水印_1922x1080.png`（原生已是 1922×1080，无需缩放）。
//   ⚠️ 同目录另有 `动漫少女_无水印.png`（**JPEG 2731×1535**，MD5 702e9826…）——同族不同张，
//   用户点名的是 1922x1080 这张，别拿错。
//   全库比对：MD5 在库内无同文件；像素级比对（backgrounds 等目录下 178 张同尺寸 1922×1080 逐张算 PSNR / Δ>8）
//   最高只有 **13.22 dB**（her-light-drift.webp，Δ>8 达 207 万）→ 确认库里没有这张图，新 ID + 新文件。
//   编码三档实测（源 PNG，JPEG 档用 ffmpeg -q:v 2，PSNR 按 RGB 逐像素算）：
//   **JPEG q2 = 408010 B / PSNR 43.07 / Δmax 19 / 6836 像素 Δ>8**；
//   webp q95 = 376042 B / PSNR 42.05 / Δmax 45 / 46486 像素 Δ>8；无损 webp = 1700476 B（不划算）。
//   → JPEG q2 三项质量全胜（Δ>8 约 1/7、Δmax 19 vs 45），webp 只省 8% 体积 → 取 **JPEG q2**。
//   注：用户指定的 ID 为 `动漫少女_无水印_1922x1080.png`（.png 只是 ID 名），落地真实格式为 **JPEG**，
//   故 assets 路径后缀写 `.webp`；修订层 `background` 里填的是 **ID**（带 .png 的那个）。
//   base 无 cg → 无回忆画廊副作用。
Object.assign(ILY.data.assets.images, {
  '动漫少女_无水印_1922x1080.png':'assets/images/backgrounds/动漫少女_无水印_1922x1080.webp'
});

// 改107 最终章 S02-X「崩坏」：fracture 选项按钮的背景图。
//   源图 `网页设计/pic/选项/蓝色波形_透明背景_1200x400.png`（真 PNG / 1200×400 / RGBA / MD5 67b51cfc…，
//   透明底蓝色像素噪点波形、四角全透明 → 按钮与黑幕背景自然融合）。
//   ⚠ 2026-09-24 三版沿革（均覆盖同一落地文件 fin-choice-bg.webp，ID 不变、引用零改动，旧源图都在 pic/选项/ 可回滚）：
//     初版 `蓝色背景_800x160.png`（5:1，MD5 17ffe914…）→ 二版 `蓝色背景_1200x400.png`（MD5 70ef756d…）
//     → 三版（当前）`蓝色波形_透明背景_1200x400.png`（MD5 67b51cfc…，3:1 不变，JS/CSS 无需改比例）。
//   带有效 alpha 通道（extrema (0,255)）→ JPEG 出局；两档实测（**按黑底 alpha 合成后**逐像素 RGB 比）：
//   webp q95 = 38.13 dB / Δ>8 32374 / Δmax 66（半透明抖动像素被 chroma 子采样打烂）；
//   **无损 webp = 合成后逐像素相同（Δmax 0）且 192980 B，比源 PNG 333097 B 小 42%** → 取无损 webp。
//   ⚠ 比对陷阱：ffmpeg 无损 webp 会把 alpha=0 像素的 RGB 写成 (255,255,255,0)（源是 (0,0,0,0)），
//     直比 RGB 会假报 5 dB——全透明像素的 RGB 是未定义值，必须合成到黑底再比（渲染语义才正确）。
//   用途：`src/modes/chapter-moments.js` fracture 演出的按钮 background-image（非场景背景），
//   按钮尺寸按 3:1 由 JS 内联给定，CSS 引用 `../assets/images/ui/fin-choice-bg.webp`。
Object.assign(ILY.data.assets.images, {
  'fin-choice-bg':'assets/images/ui/fin-choice-bg.webp'
});

// 改108 最终章 S02-X「崩坏」：fracture 收束帧（原为白字 ILY 停 0.5s）改为全屏纯图展示。
//   源图 `网页设计/pic/ILY_无水印_1922x1080.png`（真 PNG / 1922×1080 / RGBA / MD5 b129b46b…，
//   蓝底白色故障风 ILY 字样；⚠️ 同目录另有 `ILY_无水印.png`（JPEG 2731×1535，MD5 1486c33a…），
//   用户点名 1922x1080 这张，别拿错）。
//   alpha extrema (221,255)——蓝底整片半透明，叠黑幕会微微压暗，属设计效果 → **必须保 alpha，JPEG 出局**。
//   两档实测（按黑底 alpha 合成后逐像素 RGB 比）：
//   webp q95 = 93288 B / 46.02 dB / Δ>8 4412 / Δmax 37（全部集中在字母边缘，0.5s 闪帧不可感）；
//   无损 webp = 714728 B（贵 7.7 倍）→ 取 **webp q95**。
//   用途：`src/modes/chapter-moments.js` fracture() 收束帧 `<img>`（全屏 object-fit:cover，非场景背景），
//   ID 按用户点名文件名 `ILY_无水印_1922x1080.png`（.png 只是 ID 名，落地真实格式 webp）。
Object.assign(ILY.data.assets.images, {
  'ILY_无水印_1922x1080.png':'assets/images/backgrounds/ILY_无水印_1922x1080.webp'
});

// 改109 第三章 S06 选项「两部手机同时作响。」（ch3_choice4）背景换成手机来电插画。
//   源图 `网页设计/pic/去水印_手机来电插画.png`（真 PNG / 2730×1536 / RGBA 但 alpha 全 255=不透明白底，
//   比例恰为 16:9 → cover 无裁切；LINE 来电(日日谷陽)+翻盖手机双手持握插画）。
//   编码实测：JPEG q2 = 120KB / 27.71dB / Δ>8 150 万（像素画风硬边全毁，出局）；
//   webp q95 = 261KB / 50.70dB / Δ>8 仅 1 → 取 **webp q95**；无损 webp 982KB 无必要。
Object.assign(ILY.data.assets.images, {
  'bg-ch3-phones-call':'assets/images/backgrounds/ch3-phones-call.webp'
});

// 改110 女主视角 05-02「紫阳花小路」：her_0261 去立绘 + 背景换成绣球花小径插画。
//   源图 `网页设计/pic/去水印_绣球花小径.png`（真 PNG / 1922×1080 / RGBA alpha 221~255 近不透明；
//   两人牵手背影 + 绣球花小径，白底已去水印）。编码实测：webp q95 = 1026KB / Δ>8 仅 19 像素；
//   JPEG q2 = 1053KB 更大 → 取 **webp q95**。新 ID `bg-her-hydrangea-path`（全库无同名文件）。
Object.assign(ILY.data.assets.images, {
  'bg-her-hydrangea-path':'assets/images/backgrounds/her-hydrangea-path.webp'
});

// 改111 女主视角 05-02 后段（her_0301~0319）：去立绘 + 背景换成 7 张新插画（各拍映射见 script-edits.js 改79 注释）。
//   源图均为 `网页设计/pic/去水印_*.png`（真 PNG / 1922×1080）。编码逐张双档实测（webp q95 vs JPEG q2，判据=体积+Δ>8 像素数）：
//     遮脸少女  → her-face-cover.webp   408KB Δ=97   | 紫发少女  → her-purple-girl.webp  341KB Δ=104
//     蓝发少女  → her-blue-girl.webp    316KB Δ=151  | 抱膝少女  → her-hug-knees.webp    539KB Δ=104
//     日落海面  → her-sunset-sea.webp  184KB Δ=1    | 黄昏侧脸  → her-dusk-profile.webp  347KB Δ=82
//     像素侧脸  → her-pixel-profile.webp 93KB Δ=0（像素画风，webp 压倒性优）
Object.assign(ILY.data.assets.images, {
  'bg-her-face-cover':   'assets/images/backgrounds/her-face-cover.webp',
  'bg-her-purple-girl':  'assets/images/backgrounds/her-purple-girl.webp',
  'bg-her-blue-girl':    'assets/images/backgrounds/her-blue-girl.webp',
  'bg-her-hug-knees':    'assets/images/backgrounds/her-hug-knees.webp',
  'bg-her-sunset-sea':   'assets/images/backgrounds/her-sunset-sea.webp',
  'bg-her-dusk-profile': 'assets/images/backgrounds/her-dusk-profile.webp',
  'bg-her-pixel-profile':'assets/images/backgrounds/her-pixel-profile.webp'
});
