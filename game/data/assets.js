// 《I.L.Y.》序章 · 资源清单（占位）
// 路径沿用项目既有约定：images/backgrounds|characters|ui，audio/bgm|sfx|voices。
// 文件尚未提供时游戏仍可运行（缺图=无背景/无立绘），把美术按下列 id 放进对应目录即可自动生效。
//
//  ⚠ 注意：sfx / voices 目前只登记路径，代码中尚未接线播放。
//     仅在需要时在场景节点上加 bgm 字段即可切 BGM（Assets.setMusic 已支持）。
ILY.data.assets = {
  "images": {
    // —— 场景背景（images/backgrounds） ——
    "bg-apartment-dusk":   "assets/images/backgrounds/bg-apartment-dusk.png",   // 场景01/02 出租屋 黄昏
    "bg-apartment-night":  "assets/images/backgrounds/bg-apartment-night.png",  // 场景04/05/06 出租屋 深夜
    "bg-university":       "assets/images/backgrounds/bg-university.png",       // 场景03 大学走廊与学生群像
    "bg-empty-apartment":  "assets/images/backgrounds/bg-empty-apartment.png",  // 场景04 空壳公寓（含招租牌）
    "bg-hallway":          "assets/images/backgrounds/bg-hallway.png",          // 场景07 公寓走廊声控灯
    "bg-tunnel":           "assets/images/backgrounds/bg-tunnel.png",           // 场景07 隧道横版背景
    "bg-coast-night":      "assets/images/backgrounds/bg-coast-night.png",      // 场景08/09 月夜海岸
    "bg-coast-blue":       "assets/images/backgrounds/bg-coast-blue.png",       // 场景10/11 蓝光海岸
    "bg-room-white":       "assets/images/backgrounds/bg-room-white.png",       // 场景06/11 白底演出页

    // —— 人物立绘 / 精灵（images/characters） ——
    "portrait-kio":        "assets/images/characters/portrait-kio.png",         // 28岁基生 室内/外出（半身）
    "portrait-kio-young":  "assets/images/characters/portrait-kio-young.png",   // 高中基生（回忆）
    "portrait-airi":       "assets/images/characters/portrait-airi.png",        // 爱理 校服立绘（酒红双眸）
    "portrait-airi-flash": "assets/images/characters/portrait-airi-flash.png",  // 爱理闪回
    "kio-walk":            "assets/images/characters/kio-walk.png",             // 隧道横版步行精灵

    // —— 道具 / 照片 / UI（images/ui） ——
    "photo-seaside":       "assets/images/ui/photo-seaside.png",               // 2009 海边低像素合影
    "bankbook":            "assets/images/ui/bankbook.png",                    // 银行存折
    "parcel-label":        "assets/images/ui/parcel-label.png",                // 快递单（203室 马场先生）
    "rent-sign":           "assets/images/ui/rent-sign.png",                   // 空壳公寓招租牌 0A-93MC-10N4
    "trash-bag":           "assets/images/ui/trash-bag.png",                   // 垃圾袋（BR01 A）
    "vending":             "assets/images/ui/vending.png",                     // 隧道故障自动贩卖机
    "coast-poster":        "assets/images/ui/coast-poster.png",                // 隧道褪色海岸海报
    "title-ily":           "assets/images/ui/title-ily.png"                    // 终幕 I.L.Y. 标题
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
