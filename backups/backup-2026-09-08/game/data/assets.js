// 《I.L.Y.》序章 · 资源清单（占位）
// 路径沿用项目既有约定：images/backgrounds|characters|ui，audio/bgm|sfx|voices。
// 当前已有正式图片直接使用；尚未提供的素材指向对应类型的占位 SVG，后续只需替换路径。
//
//  ⚠ 注意：sfx / voices 目前只登记路径，代码中尚未接线播放。
//     仅在需要时在场景节点上加 bgm 字段即可切 BGM（Assets.setMusic 已支持）。
ILY.data.assets = {
  "images": {
    // —— 场景背景（images/backgrounds） ——
    "bg-apartment-dusk":   "assets/images/backgrounds/2.白天家.png",    // 场景01/02 出租屋 黄昏
    "bg-apartment-night":  "assets/images/backgrounds/1.夜晚家.png",    // 场景04/05/06 出租屋 深夜
    "bg-university":       "assets/images/backgrounds/3 回忆蒙太奇.png",// 场景03 大学走廊与学生群像
    "bg-empty-apartment":  "assets/images/backgrounds/4 空壳公寓.png",  // 场景04 空壳公寓（含招租牌）
    "bg-hallway":          "assets/images/backgrounds/5.走廊·开灯.png",// 场景07 公寓走廊声控灯
    "bg-tunnel":           "assets/images/backgrounds/6_隧道_无海报.png",// 场景07 隧道横版背景
    "bg-coast-night":      "assets/images/backgrounds/7_海岸.png",      // 场景08/09 月夜海岸
    "bg-coast-blue":       "assets/images/backgrounds/9_海岸_纯蓝.png", // 场景10/11 蓝光海岸
    "bg-room-white":       "assets/images/backgrounds/10 白底.png",     // 场景06/11 白底演出页

    // —— 人物立绘 / 精灵（images/characters） ——
    "portrait-kio":        "assets/images/characters/portrait-kio.png",         // 28岁基生 室内/外出（半身）
    "portrait-kio-young":  "assets/placeholders/character.svg", // 高中基生（回忆）
    "portrait-airi":       "assets/placeholders/character.svg", // 爱理 校服立绘（酒红双眸）
    "portrait-airi-flash": "assets/placeholders/character.svg", // 爱理闪回
    "kio-walk":            "assets/placeholders/character.svg", // 隧道横版步行精灵

    // —— 道具 / 照片 / UI（images/ui） ——
    "photo-seaside":       "assets/placeholders/prop.svg", // 2009 海边低像素合影
    "bankbook":            "assets/placeholders/prop.svg", // 银行存折
    "parcel-label":        "assets/placeholders/prop.svg", // 快递单（203室 马场先生）
    "rent-sign":           "assets/placeholders/prop.svg", // 空壳公寓招租牌 0A-93MC-10N4
    "trash-bag":           "assets/placeholders/prop.svg", // 垃圾袋（BR01 A）
    "vending":             "assets/placeholders/prop.svg", // 隧道故障自动贩卖机
    "coast-poster":        "assets/placeholders/prop.svg", // 隧道褪色海岸海报
    "title-ily":           "assets/placeholders/prop.svg"  // 终幕 I.L.Y. 标题
  },
  "bgm": {
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
