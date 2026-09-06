# I.L.Y. 游戏框架

当前 game 是原生 HTML / CSS / JavaScript 的 Galgame 序章，背景铺满窗口，人物与底部对白分层，功能位于右上角菜单。正式美术尚未提供，随附 SVG 仅用于布局示意。

整个 game 固定沿用原有 `Zpix` 像素字体，包括手机邮件界面；后续样式不得覆盖根字体。

**完整结构、参考源码取舍、演出字段、已完成和待办请先读根目录 [GAME_CONTROL_BOOK.md](../GAME_CONTROL_BOOK.md)。**

## 试玩与开发

双击 `game/index.html` 可游客试玩；完整入口是根目录 index.html → 登录 / 开场 → 开始菜单 → game。保持文件夹结构，无需安装依赖。可选开发预览：根目录 `npm start`，浏览器打开 `http://127.0.0.1:8080/game/index.html`；`npm test` 运行回归检查。

点击画面或按空格 / Enter：先补全文本，再进入下一句。选项必须明确选择。隐藏对白按钮或 H 隐藏文本，再点「显示对白」恢复。右上角菜单提供存读档、音乐开关、原生全屏、调查线索与返回入口。

## 换图只需两步

1. 图片放入 `game/assets/images/backgrounds/`、`characters/`、`cg/` 或 `ui/`。
2. 修改 `game/data/assets.js` 中对应 ID 的路径，例如 `"portrait-kio": "assets/images/characters/kio-normal.png"`。

路径相对 game/index.html，使用 `/`。保持 ID 不变，原来引用它的节点自动使用新图。程序不扫描文件夹。当前路径指向实际占位 SVG，不是缺失文件；不要覆盖共用占位图来替换单个角色。

背景默认 cover 填满；人物建议透明 PNG/WebP；CG 使用节点 cg 字段，道具用 overlay，多人物用 characters。完整例子见总控书。

## 文件职责

- `data/story/prologue.js`：当前 42 节点序章；`data/story/phone.js`：手机内容。
- `src/main.js`：模式调度、菜单、存读档；`src/core/scene.js`：背景、人物、CG、道具和场景缺图处理。
- `src/modes/`：对白、手机、步行、格子探索、弹幕；探索和弹幕目前未接入序章节点。
- `styles/stage.css`：最终舞台布局，最后加载；game.css / prologue.css 提供基础玩法样式。
- `assets/placeholders/`：布局示意素材；`data/assets.js`：全部资源映射。

普通 script 按 bootstrap → 数据 → core → modes → main 加载，不使用 fetch 或 ES module，以保留双击运行。文本通过 textContent 渲染。

## 当前限制

每账号一个浏览器本地存档槽，无云同步。对白从句首恢复，步行从段首恢复；常规节点手动保存，结局写入存档。file: 存储受浏览器限制，与 HTTP 存档隔离。

BGM 播放机制已有，但还需要正式文件和节点配置；sfx / voices 仅登记，未接播放。自动播放、快进、对白历史、多槽存档、正式 CG 演出均待开发。登录仍是本地演示账号。
