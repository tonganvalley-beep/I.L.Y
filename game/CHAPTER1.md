# 第一章实现与素材接入

运行 `npm run chapter1` 可免登录直接试玩第一章。正式流程从序章主线终幕点击「进入第一章」衔接；序章「门内的回信」分支保留原结局，不强行接入海边重逢主线。原开始菜单和账号分区仍有效。

## 已实现

- S01–S06 的 Galgame 台词、内心独白、A/B 差分与 C 线收束。沿用背景、立绘、道具、CG、打字机、选择和 Zpix 字体。
- A/B/C 互斥旗标；B 线 P1–P4 收集并在菜单线索中显示。A 线拥抱；C 线停在第三章待续；主线停在第二章待续。
- JSON 构建的八张地图：出租屋、便利店、水族馆六区；出租屋使用手工 16 像素图块拼成的经典 RPG 场景，保留原隐藏碰撞层、任务事件与房间布局。人物使用连续浮点坐标、逐帧移动和身体碰撞。操控角色为成田基生，复用原鼠标光标的正面、背面和左右两帧像素素材。
- G1 三处清扫，地板、电脑桌和书架旁会显示同画风垃圾，分别清扫后即时消失；G2 浴室门接触；G3 两只手柄与电脑开局；G4 食品选择及结账短对白；G5 目击线索、拍照点与具足虫调查、手机无信号、十屋惨叫、空水槽重逢。
- 45 秒红心弹幕教学：直接复用 `danmutest/game.js` 的六种随机交叠波次、红心小判定、回血弹、预警激光、影分身和原伤害数值（20 HP）。失败可重试或继续剧情；方向键/WASD、Shift 慢速、P 暂停、R 重试，也支持拖动。旧清屏反击与连击教学已替换。时长在 `data/battles/first-trial.js` 配置。
- 场景开头、选择前与 RPG 段落自动存档；地图坐标、调查进度、选购食品和计时与原存档同存，不升级存档格式。原序章存档可继续读取。

移动：方向键 / WASD，支持斜向等速移动；也可按住鼠标或触屏引导角色，松开停止。调查：靠近后按 E / 空格 / Enter，或点击临时出现的调查提示。菜单：Esc，或移到右上角显示菜单按钮（触屏显示低透明度入口）。任务、帮助与自动完成收进菜单。地图铺满视口，不拉伸比例，窄屏由镜头跟随基生；离开 RPG 后恢复原 Galgame 界面及角色光标。

G1/G3 连续无操作 60 秒、G2 为 10 秒、G4 为 90 秒、G5 为 240 秒时自动完成，主动探索时不强行跳过。打开菜单或切到后台暂停计时和移动。完成后保留 2.5 秒结果文字，再衔接原对白，也可按确认键继续。弹幕教学等待玩家开始，也可用「结束练习」直接衔接剧情。

## 数据与改图

### 出租屋经典 RPG 图块场景

`ch1-room.art.renderer = "classic-room"` 启用 `src/core/room-art.js` 的手工图块渲染。原生图块 16×16，整张场景为 416×240；地板、墙面与家具使用有限色板、整数像素和阶梯轮廓。`decor` 列表定义床、厨房、浴室、桌椅、书架、盆栽等陈设的位置和尺寸，渲染结果缓存一次后复用。清扫垃圾也以原生像素绘制，保持原事件的 `visual` 矩形，拾取后消失。故事氛围保留 S03 对白中的旧游戏、漫画和重逢后温暖的出租屋。地图尺寸、`tiles` 碰撞、`objects`、出生点和全部事件坐标未修改。

镜头按约 14 列×9 行可见区域选择整数像素倍率，1280×720 下每格显示 96 像素，比原来全屋展示约放大两倍。镜头在房间内部跟随人物，到地图四边停止滚动，手机同样裁切显示。人物保留原素材及原行走动画，不使用重绘人物、不降采样；人物与场景一起随镜头放大。鼠标/触屏坐标使用相同镜头变换反算。

`tests/room-art.test.mjs` 检查近景缩放、双轴跟随、四边限制、输入坐标逆变换和事件坐标不变。`tools/chapter1/pixel-room-check.cjs` 检查实际滚动、桌面/手机画面、三个清扫点、床底手柄与浴室触发，使用与现有浏览器检查相同的 Playwright 环境变量和 8090 本地服务。

### 旧版背景留存

`ch1-room-map` 指向上一版 `assets/images/backgrounds/room-rpg-pixel.png`，仅在不启用图块渲染时作为背景回退。原俯视图也保留。旧背景通过内置 imagegen 的 style-transfer 模式生成，编辑目标为 `15 出租屋俯视图.png`。当时的提示词：

> Create a production RPG exploration BACKGROUND replacement. Preserve EXACT original composition, aspect ratio 1672:941, normalized object positions, footprints, room partitions, doorway opening and all walkable floor corridors. Do not rearrange or add furniture. Left kitchenette and washer; narrow central bathroom and open door; bed center-right; dining table upper-right; bookshelves and TV right wall; computer desk lower-right; entrance bottom-center: every item must stay aligned with the reference. Redraw the ENTIRE image as authentic handcrafted 16-bit Japanese RPG Maker pixel art, visible chunky square pixel clusters equivalent to a 520x293 native canvas enlarged with nearest-neighbor. Strong stepped contours, limited muted amber/ochre/olive and dark navy palette, 3-4 flat shadow shades per material, tile-like floorboards and bathroom tiles, simplified readable furniture sprites. No smooth gradients, no airbrushing, no realistic rendering, no merely overlaying a pixel filter on painted art. Story mood: small aging Japanese 1K apartment of a lonely man, worn wooden furniture, old computer and manga books, now warm and comforting after reunion. Keep all existing plants and objects in their original locations. Keep exact view angle and spatial geometry even though render style becomes pixel art. The image is background only: NO characters, NO UI, NO labels, NO interaction markers, NO loose trash piles; those are rendered by game separately. Opaque image, full original frame including dark exterior border and entry step. Save usable PNG.

旧版另行生成的垃圾素材带有不可用的棋盘格底色，未接入项目。

地图真源为 `data/maps/chapter1.json`，HTTP 启动时通过 fetch 读取。`tiles` 中 `.` 可走、`#` 墙、`F` 家具阻挡；`objects` 决定家具贴图和标记，改变家具轮廓时同时更新 `tiles`。`events` 配置坐标、任务、调查类型和传送目标。`art` 与物件的 `image` 引用 `data/assets.js`。

改 JSON 后运行 `npm run build:maps`，同步生成 `chapter1-bundle.js`，仅供双击 file 页面使用。不要手改 bundle；测试会核对 JSON 与 bundle 一致。

所有贴图集中登记在 `data/assets.js` 的第一章部分。背景/CG 推荐 1920×1080，角色用透明 PNG/WebP；地图地板/墙建议 48×48，无缝平铺；基生已使用 `assets/images/ui/cursor/` 的现有六张图，左右移动播放行走帧，向上背面、向下正面。上下行走素材尚无专用动画帧。物件按 JSON 的宽高格数提供。

`ch1-coast-night/store/aquarium-outside/aquarium` 已接入海边、便利店、水族馆入口和鱼缸展区正式背景；`ch1-street/panorama/empty-tank` 仍是背景占位。`ch1-cg-blue/mirror/bathroom/collapse/reflection` 是 CG 位；爱理已接入微笑、俏皮、困惑、羞红、阴沉、哭腔、惊恐与崩坏 8 套表情，`ch1-toya/rui` 仍是人物占位。`ch1-tile-*`、`ch1-object-*` 当前为空，使用几何占位；填入相对 game/index.html 的真实路径即可换图。基生使用 `ch1-sprite-kio` 和 `ch1-kio-*` 动画 ID。

剧情源文本保存在 `tools/chapter1/source.txt`，来自提供的 DOCX。`tools/chapter1/build.py` 生成 `data/story/chapter1.js`，过滤制作备注、展开压缩对白、接入玩法节点；浴室桥段使用关门与剪影文字。后续改剧情应同步修改源文本或转换规则后重新生成，避免生成覆盖手改。

## 验证与待补

`npm test` 验证剧情图、分支、疑点、地图可达性、任务判定、重复拾取、存档兼容与旧序章回归。浏览器检查脚本为 `tools/chapter1/browser-check.cjs`，需要 Playwright 路径环境变量 `ILY_PLAYWRIGHT` 和 8090 本地服务器。

其余正式美术、BGM/SE/配音和镜头动画尚待接入；当前提供可玩的剧情与部分正式地图版本。第二、三章只保留待续信息，不代表后续章节已经实现。新章中文内容未翻译，原菜单中英文开关仍保留。
