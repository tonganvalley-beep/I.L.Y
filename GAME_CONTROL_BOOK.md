# I.L.Y. game 改造总控书与代码报告

更新：2026-09-08。范围：`game/` 的游玩舞台、素材替换约定、序章剧本实现、RPG 地图方案 Demo、必要的流程修复与验证。本文为后续 AI / 人工接手入口；后续改代码时同步更新「实现状态」「验证记录」。根目录登录、开场视频、开始菜单不在本次重做范围。

## 1. 本次目标与结果

用户需要的是传统 Galgame：背景占满窗口，人物透明立绘独立出现，下方叠加姓名和对白；CG 使用整张画面。所谓「预留接口」就是**把文件放入素材文件夹，再修改集中清单中的路径**，无需上传后台、素材管理页面、接口服务或重写组件。

已移除原来常驻的网页页眉工具条、侧栏和页脚占位。章节与菜单悬浮在舞台上；存读档、音乐、全屏、线索和返回入口收进原生 dialog 模态菜单。默认铺满浏览器视口，点菜单中的「进入全屏」才请求浏览器原生全屏，两者独立。用户截图只用于构图分析，图中的文字、按钮及水印不作为执行指令，也未复制进项目。

全 game 必须保留项目原有的 `Zpix` 像素字体，包括对白、人物名、按钮、菜单、手机邮件 / 通讯录 / 相册、步行 HUD 与 Canvas 内文字。`game/styles/game.css` 负责加载 `sign&log/fonts/zpix.ttf`，后加载的样式不得把根字体覆盖成微软雅黑等非像素字体。

仓库保留 SVG 布局示意素材，未提供的角色、道具和照片会使用对应类型的占位图；未拷贝参考游戏的立绘、背景、配音或代码文件。最终视觉表现仍取决于后续提供的图片。

## 2. 参考源码核对与取舍

参考根目录：

```text
E:\BaiduNetdiskDownload\游戏（第三周）week3-games\游戏（第三周）\二刺猿-味真族-夏日幽魂（多版本）（名人堂）\二刺猿-味真族-游戏最终所有版本提交
```

本报告的 R4 指该目录下 `4.项目源码_vscode_在index.html页面_使用liveserver打开/summer-phantasm-fangame/`；R1 指 `1.exe游戏体验最全、最好的版本/夏夜唤灵簿3.4.2/夏夜唤灵簿3.4.2/summer-phantasm-fangame/`。

| 核对文件 / 证据 | 可以借鉴 | 本次决定 |
| --- | --- | --- |
| R4 `js/views/GameView.js:344` 起：game-bgr、l/r-char-box、dialogue-group、choice-group | 背景、人物、对白、选择各自分层；按钮贴在画面上 | 已实现 `core/scene.js` + `modes/dialogue.js`；默认居中，也支持左右站位 |
| R4 `js/core/UIManager.js` 的 renderNode | 数据节点指定背景与角色，渲染器只解释数据 | 保留 ILY 资源 ID 映射；不硬编码素材后缀或逐个场景的 DOM |
| R4 `js/modules/SentencePrinter.js` | 逐字显示、补全文本和计时器清理 | 沿用 ILY 的 Array.from 字符拆分与减少动态效果设置；补上舞台点击、空格、Enter、隐藏对白 |
| R4 `js/core/DataManager.js` | 剧情与引擎分开、节点连接 | 保留 ILY 普通脚本数据；不移植 fetch JSON 和 ES module，否则双击本地 HTML 的运行条件会改变 |
| R4 `js/core/SaveManager.js` | 存档对象与运行中的界面分离；30 槽、历史等可供后续设计 | 保留 ILY version 1 单槽存档、账号分区与校验；不替换登录逻辑，不将参考项目的明文密码方案视作正式鉴权 |
| R4 GameView 的历史、自动、设置入口 | 后续完善游玩体验的方向 | 本次没有把未实现的功能做成空按钮；列入待办 |
| R1 外层 `package.json` 的 main 指向内部 HTML，旁有 nw.dll | 桌面封装与游戏网页可分离 | 确认是 NW.js 包装，当前不引入 exe/DLL，不运行参考 exe |
| R1 vs R4 GameView.js、SaveManager.js、data/story.json 的 SHA-256 相同 | 核心画面/存档/剧本可共同参考 | 不能推断整个目录完全相同 |
| R1 vs R4 UIManager.js 有差异 | R1 特殊图不显示时从 DOM 移除，显示时按需创建 | 借鉴场景生命周期管理；ILY 每次切节点清理整个旧场景，不拷贝 30483–30486 这类特定剧情判断 |
| R1 vs R4 GameEngine.js 差异 | 实际仅一处提示文案「自动播放」→「自动」 | 该文件差异不是新的引擎架构 |

参考审查是静态源码与文件对比，未完成参考游戏通关；「最好版本」是用户提供的目录命名，不是本报告重新评选的结论。

## 3. 改造后的结构

```text
game/index.html                      脚本加载顺序、stage、菜单、状态提示
  data/assets.js                     资源 ID → 路径 + 分类占位兜底
  data/story/prologue.js             92 个序章节点、对白、分支、演出字段
  data/story/phone.js                手机邮件 / 联系人 / 照片数据
  data/maps/classroom.js             格子地图、线索、推理条件（保留）
  data/battles/first-trial.js         弹幕关卡（保留）
  src/bootstrap.js                   ILY 命名空间
  src/main.js                        go() 调度、菜单、账号存读档、模式销毁
    core/state.js                    状态 / 存档校验 / 成就数组兼容
    core/saves.js                    多槽命名、元数据、自动档轮换、快速档与旧档迁移
    core/assets.js                   路径查询、BGM 播放开关
    core/dom.js                      创建元素，文本用 textContent
    core/scene.js                    新增：背景、立绘、道具、CG 分层与缺图处理
    modes/dialogue.js                对白打字机、继续、选择、隐藏、事件清理
    modes/phone.js                   手机流程与输入
    modes/walk.js                    隧道步行 / 调查 / 摄像机
    modes/exploration.js             格子探索（保留）
    modes/battle.js                  弹幕（保留）
  styles/game.css                    共用控件和原有玩法基础样式
  styles/prologue.css                手机 / 步行 / 终幕基础样式
  styles/stage.css                   新增：最终全视口舞台布局，最后加载
  assets/placeholders/               正式素材待补位置使用的 SVG 占位图
  assets/images/backgrounds/         正式背景放这里
  assets/images/characters/          正式透明立绘放这里
  assets/images/cg/                  正式整屏 CG 放这里
  assets/images/ui/                  照片、快递单等道具放这里
  assets/audio/{bgm,sfx,voices}/     正式音频目录
```

调用顺序：数据加载 → 创建 Assets / state → `go(nodeId)` → 销毁旧模式 → 清空 stage → 挂载新场景和玩法 → 返回 cleanup。不要让剧情文件直接操作 DOM。不要把节点文本挪进 HTML 或图片。

舞台层次从后到前：背景或 CG → 透明立绘 / 道具 → 底部对白 / 选择 → 章节菜单按钮 → 模态菜单。dialog 菜单让背后的页面不可点；普通对白的全局键盘处理也会主动忽略菜单和交互控件。

`stage.css` 最后加载，覆盖旧卡片布局。修改 Galgame 构图优先改此文件；修改手机内部控件优先改 prologue.css。暂时保留基础 CSS，避免同时重写独立探索 / 弹幕模式。

## 4. 素材替换操作：只放文件 + 改地址

所有路径相对 `game/index.html`，使用 `/`，不填写 `E:\...` 绝对路径。文件名、扩展名必须与磁盘一致。

1. 将正式图放入上述对应目录，例如 `game/assets/images/backgrounds/apartment-evening.webp` 和 `game/assets/images/characters/kio-normal.png`。
2. 在 `game/data/assets.js` 找到对应 ID，**只改值，不改 ID**：

```js
"bg-apartment-dusk": "assets/images/backgrounds/apartment-evening.webp",
"portrait-kio": "assets/images/characters/kio-normal.png",
```

3. 刷新 `game/index.html`。已有节点引用同一个 ID，所有相关画面一起生效。相同名字覆盖文件也可行，但浏览器可能需要强制刷新缓存。
4. 新增场景才需要新增 ID 和剧情字段；改图本身不需要改 main.js、dialogue.js 或 HTML。

当前已提供的背景和基生立绘指向真实图片；尚未提供的图片 ID 指向角色或道具占位 SVG。正式素材应放进 images，并分别填写清单路径。程序不扫描文件夹，不会根据新文件名自动匹配剧情。

| 素材 ID | 后续应提供 |
| --- | --- |
| bg-apartment-dusk / bg-apartment-night | 出租屋黄昏 / 深夜 |
| bg-university / bg-empty-apartment / bg-hallway | 大学、空公寓、走廊；均已接入对应剧情节点 |
| bg-tunnel | 隧道横版背景；背景目前固定，玩家摄像机滚动 |
| bg-coast-night / bg-coast-blue | 月夜海岸 / 蓝光海岸；已使用现有两张正式背景 |
| bg-room-white | 白底演出页；节点文字提及黑屏，最终需编剧确认统一 |
| portrait-kio / portrait-kio-young | 成年 / 年少基生 |
| portrait-airi / portrait-airi-flash | 爱理 / 闪回；当前使用人物占位图 |
| kio-walk | 步行角色单图；当前使用人物占位图 |
| photo-seaside / parcel-label / bankbook 等 UI ID | 各道具独立图片；当前使用道具占位图 |

背景建议 1920×1080 或更高、16:9；默认 cover 铺满，异形屏幕会裁边。重要人物与物件留在画面中部。人物使用透明 PNG / WebP，建议统一画布高度与脚底基线；图片内部过多留白会让立绘看起来过小。CG 是包含人物和背景的一张图，无需透明。

缺图处理：`sceneImage()` 遇到空路径或图片加载失败时切换到 `fallbacks` 中对应类型的 SVG 占位图；占位图也失败才隐藏图片。手机相册和步行角色同样使用资源清单中的占位图。

## 5. 剧情演出字段契约

旧的 `portrait` 单人字段继续可用，无需迁移所有对白。每个节点明确给出需要的背景和人物；没有 portrait / characters 就不显示人物，不自动猜测说话人。旁白与电话里的声音可以没有立绘。

```js
// 单人：现有写法继续有效
{ type:'dialogue', speaker:'成田基生', text:'……',
  background:'bg-apartment-dusk', portrait:'portrait-kio', next:'s01_intro3' }

// 双人：characters 存在时优先于 portrait；[] 表示明确清场
{ type:'dialogue', speaker:'百合沢爱理', text:'……', background:'bg-coast-blue',
  characters:[
    {image:'portrait-kio', position:'left', scale:1, speaking:false},
    {image:'portrait-airi', position:'right', scale:1}
  ], next:'s11e' }

// 道具：独立居中展示，使用 contain，不再当作人物拉长
{ type:'dialogue', speaker:'旁白', text:'快递单……',
  background:'bg-apartment-night', overlay:'parcel-label', next:'s05f' }

// 整屏 CG：先在 images 清单中登记自选 ID，以下仅为配置示例
{ type:'dialogue', speaker:'旁白', text:'回忆……', cg:'cg-memory',
  backgroundFit:'contain', backgroundPosition:'center', next:'s11e' }
```

- `cg` 存在时替代 background，并忽略人物与 overlay，避免整图上再叠一份人物。
- `backgroundFit`：`cover` 默认填满，`contain` 完整显示并允许留边；`backgroundPosition` 接受 CSS object-position，例如 `60% center`。
- `characters[].position`：left / center / right；scale 限制在 0.5–1.4；speaking:false 稍微压暗。
- `overlay` 为照片或物品；本次已将 s01_photo 和 s05e 从 portrait 改为 overlay。
- CG、多人物、位置和缩放能力已实现并做单元验证，当前正式序章没有额外编造双人剧情或 CG 节点。
- `bgm` 未写时沿用当前音乐，写 null 停止；必须有真实音频且用户开启播放。sfx / voices 目前仅登记，不会因填路径就自动播放。

## 6. 必须保留的现有行为

保留登录 → 新开场片位置 → 开始菜单 → game 入口，账号通过 player 参数 / mygame-token 区分本地存档。用户自己的剧情、角色名、手机邮件内容和两个分支结局保留。

当前主线是：出租屋旧邮件 → 主管来电 → 回忆 / 通讯录删除 → 十年退信与空壳公寓 → 错送快递 → 爱理回信 → 扔手机或出门（汇合）→ 隧道步行 → 海岸邮件隐藏链接 → 返回分支结局或蓝光主线终幕。**格子探索和弹幕模块在仓库中，但当前 92 节点序章不经过它们**，不能宣称它们已接入当前主线。

存档使用 `ily-save-v2:<编码账号>:<页-槽>`：手动页 1/2 各 6 槽，另有 `auto-1..3` 循环自动档和 `quick-1` 快速档。界面显示场景背景预览、章节、场景/说话人、对白摘要和时间，并在覆盖、读取、删除前确认。旧 `ily-save-v1:<账号>` 会复制到手动 1-1，迁移不删除旧值。对白从当前句开头恢复，手机保存阅读/删除等 flags，不保存当前打开的页面；步行从该段起点恢复，调查记录保留；弹幕从关卡开头重试。没有云同步。file: 的存储行为取决于浏览器，HTTP 与 file: 存档互不迁移。

## 7. 本次顺带修复的运行问题

- main.js 曾用对象参数调用 `(state, notify)` 形式的结局 enter，实际会报错；统一按现有函数签名调用。
- 新状态初始化 achievements，读入旧 v1 存档缺失此数组时补齐，结局可直接恢复并重复进入而不重复发成就。
- 手机旧自动退出检查对空邮件列表也成立，会跳过通讯录/发送流程；现在要求有待阅读邮件且不是手动退出或发信流程。
- 教学删除完成后，通讯录会明确显示“操作完成 · 空格 / Enter 继续”，确认键与继续按钮均可进入下一段。
- 爱理联系人始终不可删除；只有进入删除确认并选择“删除”后才提示“再看看其他人吧。”，约 1 秒后自动消失，取消删除不提示。
- 场景09的回信现在按下键、鼠标滚轮或触摸上滑逐步展开空白与省略号；第六次下滚显示蓝色链接，并等待玩家点击或确认，不再在链接出现后立即跳过。
- 剧情节点从42个扩展为92个，补回主管完整通话、家庭疏离、十年退信循环、空壳公寓、回信后的崩溃段落、隧道转场、蓝光触感与终幕台词。
- 手机定时跳转与步行出口定时器加入 cleanup，避免读档切场景后旧定时器再次跳转。
- 手机 / 步行输入忽略模态菜单与按钮焦点；步行打开菜单时停止移动，弹幕收到失焦暂停。
- 步行立绘只创建一次 Image，加载成功且有 naturalWidth 才绘制，避免每帧创建与坏图 drawImage。
- 旧测试只遍历 next / choices，遗漏手机和步行出口；存档测试引用已不存在的 classroom 剧情节点。现在覆盖全部 92 个节点且保留地图规则验证。

## 8. 实现状态和后续优先级

| 项目 | 状态 | 下一步 |
| --- | --- | --- |
| 全视口背景、透明立绘、底部对白、浮层菜单 | 已完成 | 接真实素材后逐场景调裁切与角色比例 |
| Zpix 像素字体（含手机和 Canvas 文本） | 已恢复并设为保留约束 | 后续新增控件继续继承根字体 |
| 单人 / 左右多人 / 道具 / CG 分层 | 已完成 | 在正式分镜中显式配置；CG 还没有正式素材和剧情节点 |
| 逐字、补全、画面点击、空格 / Enter、隐藏对白 | 已完成 | 自动、快进和对白历史尚未实现 |
| 桌面 / 窄屏竖屏 / 矮屏横屏 | 已有布局并浏览器检查 | 真机浏览器、触控长文本、更多宽高比继续验收 |
| 原生全屏按钮 | 已接线，失败会提示 | 不等同强制横屏；未做所有浏览器原生全屏兼容实测 |
| 图片集中映射与分类占位图 | 已完成 | P0：逐场替换正式立绘、道具和照片；缺图仍保持画面结构 |
| 音频 | BGM 播放机制已有，正式音频未提供、剧本未逐场配置 BGM | P1：配乐节点、音效、配音播放与音量设置 |
| 92 节点完整序章、手机、步行、两个结局 | 已按 v1.2 补齐主剧情文本与分支 | P1：正式素材、音效、配音和高级镜头演出 |
| 存档 | 12 手动槽、3 循环自动档、1 快速档；旧单槽无损迁移；场景预览与元数据 | P2：真实画面截图、导入导出与云同步 |
| 探索 / 弹幕 | 模块和数据保留，未接当前序章 | 按正式流程决定是否插入，新增节点后复测 |
| RPG 地图方案对照 Demo | 已完成背景贴图 + 空气墙、JSON + 图块地图两套独立试玩；位于 `game/rpg-demo/` | 确定正式章节后，把选定地图接入剧情节点和存档状态 |
| 特效与高级演出 | 未完成 | P2：淡入淡出、闪白、镜头、角色表情动画、CG 鉴赏 |
| 新章节 / 正式鉴权 / 桌面封装 | 未完成 | 按独立需求规划，不能仅增加素材路径宣称完成 |

## 9. 验证记录与接手规则

2026-09-07：`npm test` 14/14 通过。覆盖全部92个剧情节点、两个结局、多存档、教学删除、爱理不可删除、缺图占位兜底，以及海岸回信下滚六次显示蓝色链接且不会自动跳过。

2026-09-08：新增 `game/rpg-demo/` 对照 Demo、地图 JSON、示例图块集和中文制作说明；`npm test` 15/15 通过。Edge 无头浏览器实测两种模式切换、1280×720 Canvas、JSON 读取、人物移动、空气墙/图块碰撞调试层和“声控灯”交互。

2026-09-08：修复开发服务器在 8080 被占用时因未处理 `EADDRINUSE` 直接退出的问题；现在自动尝试后续端口、打印实际首页和 Demo 地址，并由 `npm start` / `npm run demo` 自动打开对应页面。目录 URL 会补 `index.html`，`--no-open` 可用于自动化或只启动服务。端口占用实测从 8082 自动切换到 8083，首页、目录入口、JSON 均返回 200。

2026-09-08：根据试玩反馈移除 RPG Demo 的登录前置。根地址现在 302 跳转到 `/game/rpg-demo/index.html`，`npm start` 与 `npm run demo` 均直接打开免登录 Demo；原登录流程保留在 `npm run game`。跳转还修复了过去在根地址内部返回登录 HTML 时，登录页相对 CSS / JS 被错误解析到仓库根而出现无样式页面的问题。

浏览器 HTTP 预览实测：1280×720 的背景与人物对白、Zpix 对白和手机邮件字体、空格推进、隐藏/恢复、菜单打开关闭、保存读取、切入手机、邮件阅读；390×844 竖屏人物与手机；844×390 横屏手机。未进行完整两个分支逐节点手工通关；未将单元测试通过等同于美术定稿或跨浏览器兼容完成。

开发运行：仓库根 `npm start`，打开 `http://127.0.0.1:8080/game/index.html`。普通试玩仍可双击 `game/index.html`；所有新增脚本保持普通 script，无 npm 安装/构建步骤。

接手 AI / 人工每次先读本文件与 game/README.md，再按任务定位：换素材只改 data/assets.js，改对白或构图改 story，改视觉布局改 stage.css，改流程生命周期才改 main.js。不要擅自升级存档版本、替换框架或复制参考项目整个引擎。新增功能必须给出实际接线、清理逻辑与验证，不把目录、字段和按钮存在描述成已完成功能。

每次交付同步记录改动文件、影响的节点、验证结果、新增缺口。素材替换后运行 npm test；如果音视频仅登记但未接线，应继续明确标为待完成。

