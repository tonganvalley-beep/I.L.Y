# I.L.Y 游戏框架

这是原生 HTML + CSS + JavaScript 的可运行原型，不需要安装游戏引擎或第三方依赖。示例文本、地图和弹幕都是占位内容，方便替换成你们的正式设计。

## 启动

解压完整项目后，双击根目录的 `index.html`，进入登录注册页面。登录后经过原有开场视频，进入开始菜单，再点“进入游戏”。也可以双击 `game/index.html` 以游客身份直接试玩。无需安装 Node.js、无需运行命令，也无需联网。请保留完整文件夹结构，不要只复制 HTML 文件。

开发者可选：安装 Node.js 后，`npm test` 验证剧情引用、地图可达性、线索条件、存档及本地脚本加载依赖；`npm start` 仍可用于 HTTP 预览。这两项不是运行游戏的前提。

## 目录分工

```text
game/
  index.html                 游戏入口
  assets/
    images/
      backgrounds/           场景背景
      characters/            人物立绘（透明 PNG / WebP）
      tilesets/              地图图块
      ui/                    对话框、按钮等图片
    audio/
      bgm/                   背景音乐
      sfx/                   音效
      voices/                角色配音
  data/
    assets.js              素材 ID → 文件路径
    story/prologue.js      剧情、说话人、分支、玩法切换
    maps/classroom.js      地图、出生点、调查点、推理规则
    battles/first-trial.js  弹幕参数
  src/
    main.js                  读取数据、切换场景、保存/读取
    core/                    共用状态、素材与界面工具
    modes/dialogue.js        对话框与逐字显示
    modes/exploration.js     地图移动、碰撞、调查、推理
    modes/battle.js          弹幕更新、命中、暂停、胜负
  styles/game.css            游戏界面样式
```

素材文件夹中的 `.gitkeep` 只是让 Git 保留空文件夹。现有登录素材保持原位置，游戏框架引用已有像素字体。

## 数据加载方式

`game/index.html` 通过普通 `<script src="…">` 标签依次加载命名空间、数据文件、工具、玩法和入口，不使用 ES Modules 或 fetch。每个功能脚本用函数作用域隔离，共用 `window.ILY` 命名空间。数据依旧按章节和关卡分文件存放，只是从 JSON 改为 JavaScript 对象赋值，例如 `ILY.data.stories.prologue = { ... };`。编辑数据对象内部内容即可，不需要构建。新增地图或关卡文件后，需要在 HTML 中增加对应 script 标签，放在 main.js 之前。

## Galgame 对话框怎么做？

背景和人物立绘在场景层，下方叠加 HTML 对话框。CSS 控制透明度、边框、名字栏和位置；JavaScript 读取剧情节点并逐字显示文本。点击“继续”时，未显示完则立即补全，显示完则进入 `next` 节点；按钮也支持键盘 Enter/空格。选项节点显示选择按钮。切换场景时销毁计时器和键盘事件，防止旧场景继续运行。

文本放在 `data/story/` 下的 `.js` 数据文件，按章节拆分，不写进 HTML，也不放在图片里。每个节点用唯一 ID 连接：

```json
"arrival": {
  "type": "dialogue",
  "speaker": "遥",
  "text": "欢迎回来。\n我们还有一个谜题没有解开。",
  "background": "classroom-evening",
  "portrait": "haruka-normal",
  "bgm": "quiet-room",
  "next": "invitation"
}
```

在 `data/assets.js` 配置对应素材，例如：

```js
ILY.data.assets = {
  "images": {
    "classroom-evening": "assets/images/backgrounds/classroom-evening.webp",
    "haruka-normal": "assets/images/characters/haruka-normal.png"
  },
  "bgm": {"quiet-room": "assets/audio/bgm/quiet-room.ogg"},
  "sfx": {}
};
```

路径相对 `game/index.html`。不要在没有放入文件时添加这些示例路径。当前没有随附图片和音乐，所以使用色块与渐变作为占位；点“开启音乐”后才能播放所配置的 BGM。背景、立绘按每个对话节点配置；BGM 未写时沿用当前音乐，写 `null` 停止。音效、配音目录已预留，播放接线尚未实现。

节点类型：`dialogue` 对话，`choice` 选项，`exploration` 地图探索，`battle` 弹幕，`end` 结束。添加章节时需要扩展 `main.js` 的章节加载和存档版本，当前入口固定加载序章。后续可增加条件分支、好感度、历史记录、自动播放；目前不包含这些功能。

## 不用 RPG Maker 可以自定义地图吗？

可以。现在的地图用 JavaScript 数据对象中的字符网格定义，`#` 是不可通过的墙壁，`.` 是地面；左上角坐标是 `(0,0)`。Canvas 绘制地图，玩家移动前先查目标格能否通过。调查点定义物件坐标、名字、描述和线索 ID；靠近后按 E 或点调查按钮，把线索加入共用状态。收集全部指定线索后选择推理答案，答对才回到主剧情。

修改 `tiles` 就能改变房间形状，每一行必须等宽；`spawn` 必须放在可行走地面上。修改 `hotspots` 就能添加调查物件；新增线索若是解谜必需证据，还要加入 `deduction.requiredClues`。

当前是格子移动和色块地图。之后可以把绘制函数换成图块素材，也可以采用“整张背景图 + 独立碰撞网格 + 交互点”。地图编辑器不是运行游戏的必要条件。大地图滚动、NPC 寻路、多地图传送和可视化编辑器需要继续开发。

## 三种玩法如何连接？

示例流程：到达教室 → 选择调查或询问 → 找信和记录 → 推理钟楼位置 → 躲避弹幕 20 秒 → 后续剧情。

`main.js` 是场景调度入口，每次根据节点的 `type` 挂载一种玩法，并清理上一种玩法。`state` 保存当前节点、线索、剧情标记和地图位置。地图通过推理设置 `destination-known` 标记；弹幕成功跳转 `next`，失败仅重试当前关。

弹幕用 `requestAnimationFrame` 更新，速度按实际秒数计算，支持生命、命中无敌时间、慢速移动、暂停，以及切到其他窗口时自动暂停。深色中心点是玩家实际判定范围。当前是一种参数化弹幕，后续可增加不同发射器、Boss 阶段和技能。

## 存档范围

点击“保存进度”手动存档。登录后的账号名称通过页面地址参数传递，兼容本地文件之间不共享存储的情况；没有参数时尝试读取现有 `mygame-token`，否则使用 `guest`。名称仅用于本地演示存档归属，不是鉴权凭证；每个账号一个本地存档槽。保存剧情节点、线索、标记和地图位置；对话从本句开头重播，弹幕从本关开头重试。没有自动保存或云同步。清理浏览器数据会删除存档，换浏览器不会共享存档。

双击运行时，浏览器对本地文件存储的支持可能不同；请使用同一浏览器并保留项目路径，移动项目后旧存档可能无法读取。原 HTTP 预览地址的存档不会自动迁移到本地文件入口。

现有登录是浏览器本地演示账号；本框架沿用其账号名称区分存档，没有增加服务端鉴权。
