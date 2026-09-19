# I.L.Y. 游戏框架

章节 TXT 手改与编译请遵循 [剧本文本编译规则](剧本文本编译规则.md)。第一章至最终章及女主篇统一为：台词进入对话框，旁白进入画面文字层，内心／表情说明不显示。完整编译命令为 `npm run build:story`；原文备份位置也列在规则中。

第一章已接入，可从序章主线终幕进入。包括 Galgame 分支与 JSON 地图 G1–G5，详细说明见 [CHAPTER1.md](CHAPTER1.md)。第一章地图在 HTTP 下读取真实 JSON；本地文件模式使用同步生成的数据副本。

第三章 A 线章末现会进入完整的女主视角篇，再接回最终章；B 线仍为“十年之后”结局。女主篇真源与专用构建方式见根目录 [GAME_CONTROL_BOOK.md](../GAME_CONTROL_BOOK.md)。

当前 game 是原生 HTML / CSS / JavaScript 的 Galgame，背景铺满窗口，人物与底部对白分层，功能位于右上角菜单。序章、第一至三章、女主视角篇与最终章共用同一套场景引擎；尚未提供的角色、道具和照片使用对应类型的占位图。

整个 game 固定沿用原有 `Zpix` 像素字体，包括手机邮件界面；后续样式不得覆盖根字体。

**完整结构、参考源码取舍、演出字段、已完成和待办请先读根目录 [GAME_CONTROL_BOOK.md](../GAME_CONTROL_BOOK.md)。**

## 试玩与开发

剧本编辑器当前已发布的全部修改保存在 `data/story/script-edits.js`，包括改写、说话人、归类、背景、人物立绘、新增和删除；游戏与编辑器都会加载，空浏览器也能生效。这个文件独立于生成的章节数据，运行 `npm run build:story` 不会覆盖它。

在仓库根目录运行 `npm start`，从终端打印的本机网址进入游戏。“保存修改”会直接写入 `data/story/script-edits.js`，成功后回传游戏；以后重新打开游戏自动使用确认保存的最新文本和图片，无需导出或手动替换。旧版浏览器修改在第一次项目保存前作为草稿保留；确认保存后项目文件成为运行依据，旧浏览器缓存不会覆盖它。

章节快速调试请改用 `npm run chapters`，它会打开同一服务器上的 `game/chapters.html`，从章节链接进入游戏后即可打开“剧本编辑”。`npm start` 进入登录界面是正常的正式流程；若从文件管理器双击章节 HTML，会切到 `file://`，编辑器只能查看，不能连接保存接口。

每次保存先校验记录，再备份上一版到 `data/story/script-edits.js.bak`，最后替换正式文件。保存失败保留草稿并明确提示；多个编辑窗口保存同一版本时，后保存的旧窗口会收到冲突提示，可先导出草稿再恢复项目版本。“恢复项目已保存版本”放弃当前草稿并读取项目，不改写文件。导出 JSON / 项目 JS 仍可用于备份；JSON 也可用 `node tools/import-script-review.mjs "导出文件的完整路径"` 导入，`--check` 只校验。双击 HTML 或使用其他静态服务器时不能直接写项目，需改用 `npm start`；升级前已启动的服务器需重启。

游戏唯一入口是仓库根目录 `index.html`，完整流程为根入口 → 登录 / 开场 → 开始菜单 → game。没有 Node.js 时可双击这个根入口试玩；页面会显式传递入口和账号参数，并在 `file:` 下读取内嵌地图数据。直接打开 `game/index.html` 会自动返回根入口。浏览器会隔离 `file:` 与 HTTP 存档，且本地文件模式不能调用编辑器、图片上传或 VOICEVOX API；完整开发功能请在根目录运行 `npm start`，浏览器打开终端打印的地址。`npm test` 运行回归检查。

点击画面或按空格 / Enter：先补全文本，再进入下一句。选项必须明确选择。右上角「回滚」、PageUp 或在对白画面向上滚轮可退回上一段；RPG 画面右下角也提供「回滚」，同样支持 PageUp 和向上滚轮，可撤销调查、选择、换地图与自动完成。回滚会同时恢复操作前的分支标记、线索、地图位置与玩法进度；连续移动不会逐帧记录。读档和重新开始会清空本轮回滚记录。隐藏对白按钮或 H 隐藏文本，再点「显示对白」恢复。右上角菜单提供存读档、音乐开关、原生全屏、调查线索与返回入口。

## 换图只需两步

1. 图片放入 `game/assets/images/backgrounds/`、`characters/`、`cg/` 或 `ui/`。
2. 修改 `game/data/assets.js` 中对应 ID 的路径，例如 `"portrait-kio": "assets/images/characters/kio-normal.png"`。

路径相对 game/index.html，使用 `/`。保持 ID 不变，原来引用它的节点自动使用新图。程序不扫描文件夹。当前未提供的素材指向 `assets/placeholders/`，补图时直接把对应 ID 改为正式图片路径即可。

背景默认 cover 填满；人物建议透明 PNG/WebP；CG 使用节点 cg 字段，道具用 overlay，多人物用 characters。完整例子见总控书。

## 文件职责

- `data/story/prologue.js`：当前 93 节点完整序章；`data/story/phone.js`：手机内容。
- `src/main.js`：模式调度、菜单和存档界面；`src/core/saves.js`：多槽、自动档、快速档及旧档迁移；`src/core/scene.js`：背景、人物、CG、道具和场景缺图处理。
- `src/modes/`：对白、手机、步行、格子探索、弹幕；探索和弹幕目前未接入序章节点。
- `styles/stage.css`：最终舞台布局，最后加载；game.css / prologue.css 提供基础玩法样式。
- `assets/placeholders/`：正式素材待补位置使用的分类占位图；`data/assets.js`：全部资源映射与缺图兜底。

普通 script 按 bootstrap → 数据 → core → modes → main 加载，不使用 fetch 或 ES module，以保留双击运行。文本通过 textContent 渲染。

## 当前限制

每账号有 12 个手动槽（两页各 6 个）、3 个循环自动档和 1 个快速档；槽位显示当前场景背景预览、章节、说话人/场景、对白摘要和保存时间。旧 `ily-save-v1:<账号>` 单槽会安全复制到手动槽 1-1，原旧档不删除。无云同步；对白从句首恢复，步行从段首恢复。file: 存储受浏览器限制，与 HTTP 存档隔离。

BGM 播放机制已有，但还需要正式文件和节点配置；sfx / voices 仅登记，未接播放。自动播放、快进、对白历史、存档导入导出和正式 CG 演出均待开发。登录仍是本地演示账号。
